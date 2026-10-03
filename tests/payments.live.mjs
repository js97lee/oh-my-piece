// Explicit opt-in: real Supabase database + mocked Nicepay. No charge or email is sent.
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { loadEnv } from "vite";
import { createClient } from "@supabase/supabase-js";
import { parseCookieHeader } from "@supabase/ssr";
import { createAuthHandler } from "../server/auth.js";
import { createPaymentsHandler } from "../server/payments.js";
import { createCommerceStore } from "../server/commerce-store.js";
import { hash } from "../server/nicepay.js";
import { koreaDate } from "../shared/commerce.js";

const env = { ...loadEnv("development", process.cwd(), ""), ...process.env };
if (env.NICEPAY_ENV !== "sandbox") throw new Error("샌드박스 환경에서만 실행할 수 있습니다.");
const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const store = createCommerceStore(env);
const jar = new Map(); let userId; let approveCalls = 0;
const email = `payment-db-${randomBytes(12).toString("hex")}@example.invalid`;
const password = `Db8!${randomBytes(24).toString("hex")}`;
const auth = createAuthHandler({ getEnv: () => env });
const gatewayFactory = () => ({
  approve: async (tid, amount) => {
    approveCalls++;
    const { data, error } = await admin.from("commerce_orders").select("*").eq("gateway_tid", tid).single();
    assert.equal(Boolean(error), false);
    const ediDate = new Date().toISOString();
    return { resultCode: "0000", orderId: data.id, tid, amount, status: "paid", balanceAmt: amount, ediDate, paidAt: ediDate, currency: "KRW", payMethod: "card", signature: hash(`${tid}${amount}${ediDate}${env.NICEPAY_SECRET_KEY}`) };
  },
  find: async () => { throw new Error("이 DB 검증에서는 거래 조회가 필요하지 않습니다."); },
  netCancel: async () => { throw new Error("이 DB 검증에서는 망취소가 필요하지 않습니다."); },
});
const payments = createPaymentsHandler({ getEnv: () => env, gatewayFactory, log: () => {} });
const server = createServer((req, res) => req.url.startsWith("/api/auth/") ? auth(req, res) : payments(req, res));
const request = async (path, body, cookie = true) => {
  const response = await fetch(env.APP_BASE_URL + path, { method: body === undefined ? "GET" : "POST", redirect: "manual",
    headers: { Origin: env.APP_BASE_URL, "Content-Type": "application/json", ...(cookie ? { Cookie: [...jar].map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("; ") } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  for (const value of response.headers.getSetCookie()) { const c = parseCookieHeader(value.split(";")[0])[0]; if (value.includes("Max-Age=0")) jar.delete(c.name); else jar.set(c.name, c.value); }
  const text = await response.text(); return { status: response.status, data: text ? JSON.parse(text) : null };
};
try {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  env.APP_BASE_URL = `http://127.0.0.1:${server.address().port}`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: "결제 DB 검증" } });
  if (created.error) throw new Error(`검증 계정 생성 실패: ${created.error.code}`);
  userId = created.data.user.id;
  assert.equal((await request("/api/auth/login", { email, password })).status, 200);
  const input = { slug: "daily-english-word", requestKey: randomUUID(), paymentMethod: "card", startDate: koreaDate(), delivery: { phone: "01000000000", time: "08:00" }, amount: 1 };
  const [a, b] = await Promise.all([request("/api/payments/checkout", input), request("/api/payments/checkout", input)]);
  assert.equal(a.status, 200, "실제 DB 주문 생성 실패"); assert.equal(b.status, 200);
  assert.equal(a.data.order.id, b.data.order.id); assert.equal(a.data.order.amount, 39000);
  const orderId = a.data.order.id;
  assert.equal((await request("/api/payments/checkout", { ...input, requestKey: randomUUID() })).status, 409, "중복 진행 주문 차단 실패");
  const anonymous = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  assert.ok((await anonymous.from("commerce_orders").select("*")).error, "비회원의 직접 주문 접근 허용됨");
  await anonymous.auth.signInWithPassword({ email, password });
  assert.ok((await anonymous.from("commerce_orders").update({ status: "paid" }).eq("id", orderId)).error, "회원의 직접 결제 조작 허용됨");
  assert.ok((await anonymous.rpc("commerce_request_cancel", { p_order_id: orderId })).error, "회원의 관리 RPC 호출 허용됨");
  const cb = new URL(a.data.checkout.returnUrl);
  const tid = `fixture${randomBytes(10).toString("hex")}`;
  const data = { authResultCode: "0000", clientId: env.NICEPAY_CLIENT_KEY, orderId, tid, amount: "39000", authToken: "db-test-auth-token" };
  data.signature = hash(`${data.authToken}${data.clientId}${data.amount}${env.NICEPAY_SECRET_KEY}`);
  const results = await Promise.all([request(cb.pathname + cb.search, data, false), request(cb.pathname + cb.search, data, false)]);
  assert.ok(results.every((r) => r.status === 303)); assert.equal(approveCalls, 1, "실제 DB 동시 승인 차단 실패");
  const order = (await request(`/api/payments/order?orderId=${orderId}`)).data.order;
  assert.equal(order.status, "paid");
  const subscriptions = (await request("/api/payments/subscriptions")).data.subscriptions;
  assert.equal(subscriptions.length, 1); assert.equal(subscriptions[0].orderId, orderId);
  assert.equal((await request("/api/payments/checkout", { ...input, requestKey: randomUUID() })).status, 409, "구독 중복 기간 차단 실패");
  assert.equal((await request(`/api/payments/order?orderId=${orderId}`, undefined, false)).status, 401);
  await store.requestCancel(orderId);
  const payment = { tid, amount: 39000, state: "paid", balance: 39000, receipt: null, paidAt: new Date().toISOString(), cancelledAt: null, code: "0000", message: null };
  await store.apply(orderId, payment);
  assert.equal((await store.get(orderId)).status, "cancel_pending");
  assert.equal((await store.subscriptions(userId))[0].status, "paused");
  await store.apply(orderId, { ...payment, state: "cancelled", balance: 0 });
  await store.apply(orderId, payment);
  assert.equal((await store.get(orderId)).status, "cancelled"); assert.equal((await store.subscriptions(userId)).length, 0);
  console.log("실제 Supabase DB 검증 통과: 주문 생성·금액 확정·동시 승인·구독 1회 생성·RLS 차단·취소 후 재활성화 차단");
} finally {
  await new Promise((resolve) => server.close(resolve));
  if (userId) {
    const cleanup = await admin.from("commerce_orders").delete().eq("user_id", userId);
    if (cleanup.error) throw new Error(`검증 주문 정리 실패: ${userId}`);
    const removed = await admin.auth.admin.deleteUser(userId);
    if (removed.error) throw new Error(`검증 회원 정리 실패: ${userId}`);
    console.log("검증 회원·주문·구독 삭제 완료. 실제 나이스페이 호출·메일 발송 없음.");
  }
}
