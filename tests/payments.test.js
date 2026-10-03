import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import { createPaymentsHandler } from "../server/payments.js";
import { PaymentError, createNicepayGateway, verifyPayment, safeReceipt } from "../server/nicepay.js";
import { validateCheckout, subscriptionEndDate, koreaDate } from "../shared/commerce.js";
import { paymentEnv as env, paymentUser as user, paymentNow as now, validCheckout, createMemoryStore, signedAuthentication, signedPayment } from "./fixtures/payments.js";

async function setup(t, options = {}) {
  const store = options.store || createMemoryStore(); const calls = [];
  const gateway = {
    approve: async (tid) => { calls.push(["approve", tid]); const order = [...store.records.values()].find((o) => o.gateway_tid === tid); return signedPayment(order); },
    find: async (id) => { calls.push(["find", id]); return signedPayment(store.records.get(id)); },
    netCancel: async (id) => { calls.push(["netCancel", id]); return signedPayment(store.records.get(id), { status: "cancelled", balanceAmt: 0, cancelledAt: now.toISOString() }); },
    ...options.gateway,
  };
  const handler = createPaymentsHandler({ getEnv: () => ({ ...env, ...options.env }), storeFactory: () => store, gatewayFactory: () => gateway, now: () => now, log: () => {},
    authenticateUser: async (req) => {
      if (req.headers["x-user"] === "missing") throw new PaymentError(401, "로그인 필요", "login_required");
      return req.headers["x-user"] ? { ...user, id: req.headers["x-user"] } : user;
    } });
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const request = async (path, body, options = {}) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path.startsWith("/") ? path : `/api/payments/${path}`}`, {
      method: body === undefined ? "GET" : "POST", redirect: "manual", headers: { Origin: env.APP_BASE_URL, "Content-Type": "application/json", ...options.headers },
      ...(body === undefined ? {} : { body: options.raw || JSON.stringify(body) }), ...options.fetch,
    });
    const text = await response.text();
    return { status: response.status, headers: response.headers, data: text && text !== "OK" ? JSON.parse(text) : text };
  };
  const checkout = async (patch = {}) => {
    const result = await request("checkout", { ...validCheckout, ...patch });
    assert.equal(result.status, 200);
    const callback = new URL(result.data.checkout.returnUrl);
    return { order: store.records.get(result.data.order.id), callback: callback.pathname + callback.search, response: result };
  };
  return { store, gateway, calls, request, checkout };
}

test("주문 금액·상품명·기간은 서버가 계산하며 클라이언트 조작값을 무시한다", async (t) => {
  const s = await setup(t);
  const { order, response } = await s.checkout({ amount: 1, endDate: "2100-01-01", product: { amount: 1, name: "변조" } });
  assert.equal(order.amount, 39000); assert.equal(order.end_date, "2027-10-01"); assert.equal(response.data.checkout.amount, 39000);
  assert.equal(order.delivery.phone, "01000000000"); assert.equal(response.data.order.user_id, undefined);
  assert.equal(JSON.stringify(response.data).includes(env.NICEPAY_SECRET_KEY), false);
  assert.equal(JSON.stringify(response.data).includes(env.SUPABASE_SECRET_KEY), false);
});

test("잘못된 상품·수단·날짜·연락처는 주문 생성 전에 거절한다", async (t) => {
  const s = await setup(t);
  for (const patch of [{ slug: "unknown" }, { paymentMethod: "bank" }, { requestKey: "bad" }, { startDate: "2026-09-01" }, { startDate: "2026-02-30" }, { startDate: "2028-01-01" }, { delivery: { phone: "123", time: "08:00" } }, { delivery: { phone: "01000000000", time: "24:00" } }]) assert.equal((await s.request("checkout", { ...validCheckout, ...patch })).status, 400);
  assert.equal(s.store.records.size, 0);
});

test("동일 요청 키의 재시도는 같은 주문이며 다른 정보로 재사용할 수 없다", async (t) => {
  const s = await setup(t);
  const a = await s.checkout(); const b = await s.checkout();
  assert.equal(a.order.id, b.order.id);
  assert.equal((await s.request("checkout", { ...validCheckout, paymentMethod: "kakaopay" })).status, 409);
  assert.equal(s.store.records.size, 1);
});

test("인증 및 Origin 검사를 통과해야 주문을 만들 수 있다", async (t) => {
  const s = await setup(t);
  assert.equal((await s.request("checkout", validCheckout, { headers: { "x-user": "missing" } })).status, 401);
  assert.equal((await s.request("checkout", validCheckout, { headers: { Origin: "https://evil.example" } })).status, 403);
  assert.equal((await s.request("checkout", validCheckout, { headers: { "Sec-Fetch-Site": "cross-site" } })).status, 403);
  assert.equal(s.store.records.size, 0);
});

test("유효한 외부 콜백은 쿠키 없이 승인하고 구독을 한 번만 만든다", async (t) => {
  const s = await setup(t); const { order, callback } = await s.checkout();
  const body = signedAuthentication(order);
  const results = await Promise.all([s.request(callback, body, { headers: { Origin: "https://pay.nicepay.co.kr", "x-user": "missing" } }), s.request(callback, body)]);
  assert.ok(results.every((r) => r.status === 303));
  assert.equal(s.calls.filter(([name]) => name === "approve").length, 1);
  assert.equal(s.store.subscriptionRecords.size, 1);
  assert.equal(s.store.records.get(order.id).status, "paid");
  assert.match(results[0].headers.get("location"), /^\/payment\/result\?orderId=/);
  assert.equal(results[0].headers.get("referrer-policy"), "no-referrer");
});

test("콜백은 form 인코딩도 처리하지만 중복 필드와 잘못된 서명은 승인하지 않는다", async (t) => {
  const s = await setup(t); const { order, callback } = await s.checkout();
  const body = signedAuthentication(order);
  await s.request(callback, body, { raw: new URLSearchParams({ ...body, signature: "0".repeat(64) }).toString(), headers: { "Content-Type": "application/x-www-form-urlencoded" } });
  await s.request(callback, body, { raw: new URLSearchParams(body).toString() + "&amount=1", headers: { "Content-Type": "application/x-www-form-urlencoded" } });
  assert.equal(s.calls.length, 0);
  await s.request(callback, body, { raw: new URLSearchParams(body).toString(), headers: { "Content-Type": "application/x-www-form-urlencoded" } });
  assert.equal(s.store.records.get(order.id).status, "paid");
});

test("콜백 토큰·가맹점 키·금액·주문번호 변조 시 승인하지 않는다", async (t) => {
  const s = await setup(t); const { order, callback } = await s.checkout();
  await s.request(callback.replace(/token=[^&]+/, `token=${"0".repeat(64)}`), signedAuthentication(order));
  for (const patch of [{ amount: "1" }, { clientId: "another-client" }, { orderId: "another-order" }, { signature: "invalid" }]) await s.request(callback, { ...signedAuthentication(order), ...patch });
  assert.equal(s.calls.length, 0); assert.equal(s.store.subscriptionRecords.size, 0);
});

test("인증 취소 또는 주문 만료는 결제 승인으로 이어지지 않는다", async (t) => {
  const s = await setup(t); const a = await s.checkout();
  await s.request(a.callback, { orderId: a.order.id, authResultCode: "USER_CANCEL" });
  assert.equal(s.store.records.get(a.order.id).status, "failed");
  const b = await s.checkout({ requestKey: "dd17d7c7-d269-4f31-8a66-6c7eb66e2bc1" });
  b.order.expires_at = "2026-10-01T00:00:00Z";
  await s.request(b.callback, signedAuthentication(b.order));
  assert.equal(s.store.records.get(b.order.id).status, "expired"); assert.equal(s.calls.length, 0);
});

test("승인 응답의 금액·주문 불일치는 구독을 발급하지 않고 망취소한다", async (t) => {
  const s = await setup(t); const { order, callback } = await s.checkout();
  s.gateway.approve = async () => signedPayment(order, { amount: 1 });
  await s.request(callback, signedAuthentication(order));
  assert.equal(s.store.subscriptionRecords.size, 0);
  assert.ok(s.calls.some(([name]) => name === "netCancel"));
  assert.equal(s.store.records.get(order.id).status, "cancelled");
});

test("승인 통신 오류 시 망취소하며 취소 통신 오류도 성공으로 표시하지 않는다", async (t) => {
  const s = await setup(t, { gateway: { approve: async () => { throw new Error("timeout"); }, netCancel: async () => { throw new Error("timeout"); } } });
  const { order, callback } = await s.checkout();
  await s.request(callback, signedAuthentication(order));
  assert.equal(s.store.records.get(order.id).status, "cancel_pending"); assert.equal(s.store.subscriptionRecords.size, 0);
  const result = await s.request(`order?orderId=${order.id}`);
  assert.equal(result.data.order.status, "cancel_pending");
});

test("승인 후 DB 오류는 결과 조회로 복구하고 재승인하지 않는다", async (t) => {
  const s = await setup(t); const { order, callback } = await s.checkout(); const apply = s.store.apply;
  let first = true;
  s.store.apply = async (...args) => { if (first) { first = false; throw new Error("database disconnected"); } return apply(...args); };
  await s.request(callback, signedAuthentication(order));
  assert.equal(s.store.records.get(order.id).status, "authorizing");
  assert.equal((await s.request(`order?orderId=${order.id}`)).data.order.status, "paid");
  await s.request(callback, signedAuthentication(order));
  assert.equal(s.calls.filter(([name]) => name === "approve").length, 1); assert.equal(s.store.subscriptionRecords.size, 1);
});

test("다른 회원의 주문 조회·중단과 존재하지 않는 주문은 차단한다", async (t) => {
  const s = await setup(t); const { order } = await s.checkout(); const headers = { "x-user": "another-user" };
  assert.equal((await s.request(`order?orderId=${order.id}`, undefined, { headers })).status, 404);
  assert.equal((await s.request("abandon", { orderId: order.id }, { headers })).status, 404);
  assert.deepEqual((await s.request("orders", undefined, { headers })).data.orders, []);
  assert.equal((await s.request("order?orderId=not-uuid")).status, 404);
});

test("클라이언트 성공 파라미터나 웹훅 상태를 믿지 않고 결제사 최신 상태를 조회한다", async (t) => {
  const s = await setup(t); const { order } = await s.checkout();
  assert.equal((await s.request(`order?orderId=${order.id}&status=paid`)).data.order.status, "created");
  s.gateway.find = async () => signedPayment(order, { status: "cancelled", balanceAmt: 0 });
  const result = await s.request("webhook", signedPayment(order), { headers: { Origin: "https://api.nicepay.co.kr" } });
  assert.equal(result.status, 200); assert.equal(result.data, "OK"); assert.match(result.headers.get("content-type"), /^text\/html/);
  assert.equal(s.store.records.get(order.id).status, "cancelled"); assert.equal(s.store.subscriptionRecords.size, 0);
});

test("위조 웹훅은 결제사 조회 및 DB 반영을 하지 않는다", async (t) => {
  const s = await setup(t); const { order } = await s.checkout();
  const r = await s.request("webhook", { ...signedPayment(order), signature: "0".repeat(64) });
  assert.equal(r.status, 502); assert.equal(s.calls.length, 0); assert.equal(order.status, "created");
});

test("부분 취소는 이용을 보류하고 전체 취소 후 지연된 승인 응답도 구독을 되살리지 않는다", async (t) => {
  const s = await setup(t); const { order, callback } = await s.checkout(); await s.request(callback, signedAuthentication(order));
  s.gateway.find = async () => signedPayment(order, { status: "partialCancelled", balanceAmt: 10000 });
  await s.request("webhook", signedPayment(order, { status: "partialCancelled", balanceAmt: 10000 }));
  assert.equal(s.store.subscriptionRecords.get(order.id).status, "paused");
  s.gateway.find = async () => signedPayment(order, { status: "cancelled", balanceAmt: 0 });
  await s.request("webhook", signedPayment(order, { status: "cancelled", balanceAmt: 0 }));
  await s.store.apply(order.id, verifyPayment(signedPayment(order), order, env));
  assert.equal(s.store.records.get(order.id).status, "cancelled"); assert.equal(s.store.subscriptionRecords.get(order.id).status, "cancelled");
});

test("승인 전 주문 중단만 허용하고 승인 중인 주문은 지우지 않는다", async (t) => {
  const s = await setup(t); const { order } = await s.checkout(); await s.store.claim(order.id, "fixturetid0000000000000001");
  await s.request("abandon", { orderId: order.id }); assert.equal(s.store.records.get(order.id).status, "authorizing");
});

test("샌드박스/운영 주소를 명시적으로 구분하고 비밀키는 Basic 인증에만 사용한다", async () => {
  const calls = []; const fetchImpl = async (url, options) => { calls.push({ url, options }); return new Response('{"resultCode":"0000"}'); };
  await createNicepayGateway(env, fetchImpl).approve("tid-with-safe-path", 39000);
  await createNicepayGateway({ ...env, NICEPAY_ENV: "production" }, fetchImpl).find("order-id");
  assert.ok(calls[0].url.startsWith("https://sandbox-api.nicepay.co.kr/")); assert.ok(calls[1].url.startsWith("https://api.nicepay.co.kr/"));
  assert.equal(calls[0].options.headers.Authorization, `Basic ${Buffer.from(`${env.NICEPAY_CLIENT_KEY}:${env.NICEPAY_SECRET_KEY}`).toString("base64")}`);
  assert.equal(JSON.parse(calls[0].options.body).amount, 39000);
  assert.throws(() => createNicepayGateway({ ...env, NICEPAY_ENV: "invalid" }), /환경 설정/);
});

test("영수증 링크는 나이스페이 HTTPS 주소만 허용한다", () => {
  assert.equal(safeReceipt("javascript:alert(1)"), null); assert.equal(safeReceipt("https://nicepay.co.kr.evil.test/r"), null); assert.equal(safeReceipt("https://npg.nicepay.co.kr/r"), "https://npg.nicepay.co.kr/r");
});

test("한국 날짜와 빈 날짜·윤년의 구독 종료일을 일관되게 계산한다", () => {
  assert.equal(koreaDate(new Date("2026-10-01T16:00:00Z")), "2026-10-02"); assert.equal(subscriptionEndDate(""), "");
  assert.equal(subscriptionEndDate("2026-10-02"), "2027-10-01"); assert.equal(subscriptionEndDate("2028-02-29"), "2029-02-28");
  assert.equal(validateCheckout(validCheckout, now).product.amount, 39000);
});
