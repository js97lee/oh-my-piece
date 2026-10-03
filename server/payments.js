import { createRequestClient } from "./supabase.js";
import { createCommerceStore } from "./commerce-store.js";
import { PaymentError, callbackToken, createNicepayGateway, hash, sameHex, verifyAuthentication, verifyPayment } from "./nicepay.js";
import { PAYMENT_LABELS, UUID_PATTERN, koreaDate, validateCheckout } from "../shared/commerce.js";

function json(res, status, data) { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify(data)); }
function redirect(res, orderId, error) {
  const query = new URLSearchParams();
  if (orderId && UUID_PATTERN.test(orderId)) query.set("orderId", orderId);
  if (error) query.set("error", error);
  res.statusCode = 303; res.setHeader("Location", `/payment/result?${query}`); res.end();
}
async function readBody(req, formAllowed = false) {
  const type = String(req.headers["content-type"] || "").split(";")[0].toLowerCase();
  if (type !== "application/json" && !(formAllowed && type === "application/x-www-form-urlencoded")) throw new PaymentError(415, "요청 형식을 확인해 주세요.");
  let body = req.body;
  if (Number(req.headers["content-length"]) > 32768) throw new PaymentError(413, "요청이 너무 큽니다.");
  if (body === undefined) {
    const chunks = []; let size = 0;
    for await (const part of req) { size += Buffer.byteLength(part); if (size > 32768) throw new PaymentError(413, "요청이 너무 큽니다."); chunks.push(Buffer.from(part)); }
    body = Buffer.concat(chunks).toString("utf8");
  }
  try {
    if (Buffer.isBuffer(body)) body = body.toString("utf8");
    if (typeof body === "string") {
      if (type === "application/json") body = JSON.parse(body);
      else {
        const fields = new URLSearchParams(body);
        for (const key of fields.keys()) if (fields.getAll(key).length !== 1) throw new Error();
        body = Object.fromEntries(fields);
      }
    }
    if (!body || typeof body !== "object" || Array.isArray(body) || Buffer.byteLength(JSON.stringify(body)) > 32768) throw new Error();
    return body;
  } catch { throw new PaymentError(400, "요청 내용을 확인해 주세요."); }
}
export function publicOrder(order) {
  return { id: order.id, slug: order.product_slug, title: order.product_title, amount: order.amount, currency: order.currency,
    paymentMethod: order.payment_method, status: order.status, statusLabel: PAYMENT_LABELS[order.status], environment: order.environment,
    startDate: order.start_date, endDate: order.end_date, delivery: order.delivery, receiptUrl: order.receipt_url, paidAt: order.paid_at,
    cancelledAt: order.cancelled_at, createdAt: order.created_at, errorMessage: order.failure_message || null };
}
function publicSubscription(row) {
  const today = koreaDate();
  return { id: row.id, orderId: row.order_id, slug: row.product_slug, startDate: row.start_date, endDate: row.end_date, environment: row.environment,
    delivery: row.delivery, status: row.status !== "active" ? row.status : row.start_date > today ? "scheduled" : row.end_date < today ? "expired" : "active" };
}
async function authenticate(req, res, env) {
  const { data, error } = await createRequestClient(req, res, env).auth.getUser();
  if (error && (error.status >= 500 || error.name === "AuthRetryableFetchError")) throw new PaymentError(503, "로그인 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  if (error || !data.user) throw new PaymentError(401, "로그인이 필요합니다.", "login_required");
  return data.user;
}
function byteLimit(value, max) {
  let text = "";
  for (const character of String(value || "")) { if (Buffer.byteLength(text + character) > max) break; text += character; }
  return text;
}

export function createPaymentsHandler({ getEnv = () => process.env, storeFactory = createCommerceStore, gatewayFactory = createNicepayGateway,
  authenticateUser = authenticate, now = () => new Date(), log = (event) => console.warn(JSON.stringify(event)) } = {}) {
  let store;
  return async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const url = new URL(req.url, "http://internal");
    const action = url.pathname.replace(/^\/api\/payments\//, "");
    let callbackOrderId;
    try {
      const methods = { config: "GET", checkout: "POST", callback: "POST", webhook: "POST", order: "GET", orders: "GET", subscriptions: "GET", abandon: "POST" };
      if (!methods[action]) throw new PaymentError(404, "요청을 찾을 수 없습니다.");
      if (req.method !== methods[action]) { res.setHeader("Allow", methods[action]); throw new PaymentError(405, "허용되지 않은 요청 방식입니다."); }
      const env = getEnv();
      for (const key of ["APP_BASE_URL", "NICEPAY_CLIENT_KEY", "NICEPAY_SECRET_KEY", "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY"]) {
        if (!env[key]) throw new PaymentError(503, "결제 서비스 설정을 확인해 주세요.", "payment_not_configured");
      }
      if (!["sandbox", "production"].includes(env.NICEPAY_ENV)) throw new PaymentError(503, "결제 환경 설정을 확인해 주세요.");
      const base = new URL(env.APP_BASE_URL);
      if (base.protocol !== "https:" && !(base.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname))) throw new PaymentError(503, "서비스 주소 설정을 확인해 주세요.");
      const external = ["callback", "webhook"].includes(action);
      if (req.method === "POST" && !external && (req.headers.origin !== base.origin || req.headers["sec-fetch-site"] === "cross-site")) throw new PaymentError(403, "서비스 페이지에서 다시 시도해 주세요.", "invalid_origin");
      const user = external ? null : await authenticateUser(req, res, env);
      store ||= storeFactory(env);
      const gateway = gatewayFactory(env);
      const getOrder = async (id, userId) => {
        if (!UUID_PATTERN.test(id || "")) throw new PaymentError(404, "주문을 찾을 수 없습니다.", "order_not_found");
        const order = await store.get(id, userId);
        if (!order || order.environment !== env.NICEPAY_ENV) throw new PaymentError(404, "주문을 찾을 수 없습니다.", "order_not_found");
        return order;
      };
      const reconcile = async (order) => {
        const data = await gateway.find(order.id);
        const payment = verifyPayment(data, order, env);
        const updated = await store.apply(order.id, payment);
        // Retry an uncertain network cancellation within Nicepay's one-hour window.
        if (updated.cancel_requested && ["paid", "authorizing"].includes(payment.state)
          && now() - new Date(updated.created_at) < 60 * 60 * 1000) return await cancelUncertain(updated) || updated;
        return updated;
      };
      const cancelUncertain = async (order) => {
        try { await store.requestCancel(order.id); }
        catch { log({ event: "payment_cancel_intent_save_failed", orderId: order.id }); }
        try {
          const result = verifyPayment(await gateway.netCancel(order.id), order, env);
          if (result.state !== "cancelled") throw new PaymentError(502, "취소 확인 중입니다.");
          return await store.apply(order.id, result);
        } catch {
          log({ event: "payment_cancel_pending", orderId: order.id });
          return null;
        }
      };
      if (action === "config") return json(res, 200, { environment: env.NICEPAY_ENV, methods: ["card", "kakaopay"] });
      if (action === "checkout") {
        const input = await readBody(req);
        let checkout;
        try { checkout = validateCheckout(input, now()); } catch (error) { throw new PaymentError(400, error.message, "invalid_checkout"); }
        const fingerprint = hash(JSON.stringify({ slug: checkout.product.slug, amount: checkout.product.amount, method: checkout.paymentMethod,
          startDate: checkout.startDate, endDate: checkout.endDate, delivery: checkout.delivery }));
        const order = await store.create(user.id, checkout, fingerprint);
        if (order.status === "paid") return json(res, 200, { order: publicOrder(order), alreadyPaid: true });
        if (order.status !== "created" || new Date(order.expires_at) <= now()) throw new PaymentError(409, "이 주문은 결제를 다시 시작할 수 없습니다. 결제 내역을 확인해 주세요.", "order_not_payable");
        return json(res, 200, { order: publicOrder(order), checkout: {
          clientId: env.NICEPAY_CLIENT_KEY, method: order.payment_method, orderId: order.id, amount: order.amount, goodsName: `${order.product_title} 1년 구독`,
          returnUrl: `${base.origin}/api/payments/callback?orderId=${order.id}&token=${callbackToken(order, env)}`,
          buyerName: byteLimit(user.user_metadata?.name || user.user_metadata?.full_name || "회원", 30), buyerTel: order.delivery.phone,
          ...(user.email && Buffer.byteLength(user.email) <= 60 ? { buyerEmail: user.email } : {}), currency: "KRW", returnCharSet: "utf-8",
        } });
      }
      if (action === "callback") {
        const id = url.searchParams.get("orderId");
        const order = await getOrder(id);
        if (!sameHex(url.searchParams.get("token"), callbackToken(order, env))) throw new PaymentError(400, "주문 인증에 실패했습니다.", "invalid_callback");
        callbackOrderId = order.id;
        const body = await readBody(req, true);
        if (body.orderId !== order.id) throw new PaymentError(400, "주문 정보가 일치하지 않습니다.", "invalid_callback");
        if (body.authResultCode !== "0000") {
          await store.failCreated(order.id, "결제가 완료되지 않았습니다. 결제 내역을 확인한 뒤 다시 시도해 주세요.");
          return redirect(res, order.id);
        }
        verifyAuthentication(body, order, env);
        const { claimed, order: claimedOrder } = await store.claim(order.id, body.tid);
        if (!claimed) return redirect(res, order.id);
        let approved;
        try { approved = await gateway.approve(body.tid, order.amount); }
        catch {
          await cancelUncertain(claimedOrder);
          return redirect(res, order.id);
        }
        if (approved.resultCode !== "0000") {
          try { await reconcile(claimedOrder); }
          catch (error) {
            if (error.code === "payment_not_found") await store.markDeclined(order.id);
            else log({ event: "payment_approval_unresolved", orderId: order.id });
          }
          return redirect(res, order.id);
        }
        let payment;
        try { payment = verifyPayment(approved, claimedOrder, env); }
        catch {
          await cancelUncertain(claimedOrder);
          return redirect(res, order.id);
        }
        // A database failure after approval is retried by the result page/webhook; never approve twice.
        await store.apply(order.id, payment);
        return redirect(res, order.id);
      }
      if (action === "webhook") {
        const body = await readBody(req);
        const order = await getOrder(body.orderId);
        verifyPayment(body, order, env);
        // The hash does not cover status. Always read the current status from the gateway.
        await reconcile(order);
        res.statusCode = 200; res.setHeader("Content-Type", "text/html; charset=utf-8"); res.end("OK"); return;
      }
      if (action === "order") {
        let order = await getOrder(url.searchParams.get("orderId"), user.id);
        if (order.status === "created" && new Date(order.expires_at) <= now()) order = await store.failCreated(order.id, "결제 요청 시간이 만료되었습니다.", "expired") || order;
        if (["authorizing", "cancel_pending", "review"].includes(order.status) && (!order.last_checked_at || now() - new Date(order.last_checked_at) > 5000)) {
          try { order = await reconcile(order); }
          catch { /* Unknown is never reported as paid or failed. The webhook/result retry will reconcile it. */ }
        }
        return json(res, 200, { order: publicOrder(order) });
      }
      if (action === "orders") return json(res, 200, { orders: (await store.orders(user.id)).map(publicOrder) });
      if (action === "subscriptions") return json(res, 200, { subscriptions: (await store.subscriptions(user.id)).map(publicSubscription) });
      if (action === "abandon") {
        const body = await readBody(req);
        const order = await getOrder(body.orderId, user.id);
        await store.failCreated(order.id, "결제창이 닫혀 결제가 완료되지 않았습니다.");
        return json(res, 200, { ok: true });
      }
    } catch (error) {
      log({ event: "payment_request_failed", action, code: error instanceof PaymentError ? error.code : "internal_error", ...(callbackOrderId ? { orderId: callbackOrderId } : {}) });
      if (action === "callback") return redirect(res, callbackOrderId, "verification");
      return json(res, error instanceof PaymentError ? error.status : 503, { error: error instanceof PaymentError ? error.message : "결제 정보를 확인하지 못했습니다. 잠시 후 다시 확인해 주세요.", code: error instanceof PaymentError ? error.code : "payment_unavailable" });
    }
  };
}
