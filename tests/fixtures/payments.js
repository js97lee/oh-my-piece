import { randomUUID } from "node:crypto";
import { hash, PaymentError } from "../../server/nicepay.js";

export const paymentEnv = { APP_BASE_URL: "https://shop.example.test", NICEPAY_ENV: "sandbox", NICEPAY_CLIENT_KEY: "fixture-client", NICEPAY_SECRET_KEY: "fixture-secret",
  SUPABASE_URL: "https://fixture.supabase.co", SUPABASE_PUBLISHABLE_KEY: "fixture-public", SUPABASE_SECRET_KEY: "fixture-service" };
export const paymentUser = { id: "7c6a61d9-8f85-4372-865f-f17aaefff352", email: "member@example.invalid", user_metadata: { name: "결제 검증 회원" } };
export const paymentNow = new Date("2026-10-02T04:00:00Z");
export const validCheckout = { slug: "daily-english-word", requestKey: "345eae69-8ed2-4ae7-8d96-6da88c78926d", paymentMethod: "card", startDate: "2026-10-02", delivery: { phone: "010-0000-0000", time: "08:00" } };
export function signedPayment(order, patch = {}) {
  const result = { resultCode: "0000", resultMsg: "정상", orderId: order.id, tid: order.gateway_tid || "fixturetid0000000000000001", amount: order.amount,
    status: "paid", balanceAmt: order.amount, ediDate: paymentNow.toISOString(), paidAt: paymentNow.toISOString(), cancelledAt: "0", currency: "KRW", payMethod: order.payment_method,
    receiptUrl: "https://npg.nicepay.co.kr/receipt/fixture", ...patch };
  result.signature = hash(`${result.tid}${result.amount}${result.ediDate}${paymentEnv.NICEPAY_SECRET_KEY}`);
  return result;
}
export function signedAuthentication(order, patch = {}) {
  const data = { authResultCode: "0000", orderId: order.id, tid: "fixturetid0000000000000001", clientId: paymentEnv.NICEPAY_CLIENT_KEY, amount: String(order.amount), authToken: "fixture-auth-token", ...patch };
  data.signature = hash(`${data.authToken}${data.clientId}${data.amount}${paymentEnv.NICEPAY_SECRET_KEY}`);
  return data;
}
export function createMemoryStore() {
  const orders = new Map(); const subscriptions = new Map();
  return {
    records: orders, subscriptionRecords: subscriptions,
    async create(userId, checkout, fingerprint) {
      const previous = [...orders.values()].find((o) => o.user_id === userId && o.request_key === checkout.requestKey);
      if (previous) { if (previous.request_fingerprint !== fingerprint) throw new PaymentError(409, "중복 요청 정보 불일치", "idempotency_conflict"); return structuredClone(previous); }
      const order = { id: randomUUID(), user_id: userId, request_key: checkout.requestKey, request_fingerprint: fingerprint, environment: "sandbox",
        product_slug: checkout.product.slug, product_title: checkout.product.title, amount: checkout.product.amount, currency: "KRW", payment_method: checkout.paymentMethod,
        delivery: checkout.delivery, start_date: checkout.startDate, end_date: checkout.endDate, status: "created", created_at: paymentNow.toISOString(), expires_at: new Date(paymentNow.getTime() + 1800000).toISOString(), cancel_requested: false };
      orders.set(order.id, order); return structuredClone(order);
    },
    async get(id, userId) { const o = orders.get(id); return o && (!userId || o.user_id === userId) ? structuredClone(o) : null; },
    async orders(userId) { return [...orders.values()].filter((o) => o.user_id === userId); },
    async subscriptions(userId) { return [...subscriptions.values()].filter((s) => s.user_id === userId && s.status !== "cancelled"); },
    async claim(id, tid) {
      const o = orders.get(id);
      if (o.gateway_tid && o.gateway_tid !== tid) throw new PaymentError(409, "거래 불일치");
      if (o.status !== "created") return { claimed: false, order: structuredClone(o) };
      if (new Date(o.expires_at) <= paymentNow) { o.status = "expired"; return { claimed: false, order: structuredClone(o) }; }
      o.status = "authorizing"; o.gateway_tid = tid; return { claimed: true, order: structuredClone(o) };
    },
    async failCreated(id, message, status = "failed") { const o = orders.get(id); if (o.status !== "created") return null; o.status = status; o.failure_message = message; return structuredClone(o); },
    async markDeclined(id) { const o = orders.get(id); if (o.status === "authorizing") o.status = "failed"; return structuredClone(o); },
    async requestCancel(id) { const o = orders.get(id); if (o.status !== "cancelled") { o.status = "cancel_pending"; o.cancel_requested = true; const s = subscriptions.get(id); if (s) s.status = "paused"; } return structuredClone(o); },
    async apply(id, p) {
      const o = orders.get(id);
      if (o.status === "cancelled" || (o.status === "partial_cancelled" && p.state !== "cancelled") || (o.status === "paid" && ["failed", "expired", "authorizing"].includes(p.state))) return structuredClone(o);
      o.status = o.cancel_requested && ["paid", "authorizing"].includes(p.state) ? "cancel_pending" : p.state;
      Object.assign(o, { gateway_tid: p.tid, balance_amount: p.balance, receipt_url: p.receipt, paid_at: p.paidAt, cancelled_at: p.cancelledAt, last_checked_at: paymentNow.toISOString() });
      if (o.status === "paid" && !subscriptions.has(id)) subscriptions.set(id, { id: randomUUID(), order_id: id, user_id: o.user_id, environment: o.environment, product_slug: o.product_slug, start_date: o.start_date, end_date: o.end_date, delivery: o.delivery, status: "active" });
      if (subscriptions.has(id) && ["cancelled", "partial_cancelled", "cancel_pending"].includes(o.status)) subscriptions.get(id).status = o.status === "cancelled" ? "cancelled" : "paused";
      return structuredClone(o);
    },
  };
}
