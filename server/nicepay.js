import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export class PaymentError extends Error {
  constructor(status, message, code = "payment_error") { super(message); Object.assign(this, { status, code }); }
}
export const hash = (value) => createHash("sha256").update(value).digest("hex");
export function sameHex(left, right) {
  return typeof left === "string" && /^[a-f0-9]{64}$/i.test(left) && typeof right === "string" && /^[a-f0-9]{64}$/i.test(right)
    && timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}
export function callbackToken(order, env) {
  return createHmac("sha256", env.NICEPAY_SECRET_KEY).update(`${order.environment}:${order.id}:${order.user_id}`).digest("hex");
}
export function verifyAuthentication(data, order, env) {
  if (data.clientId !== env.NICEPAY_CLIENT_KEY || data.orderId !== order.id || !/^\d+$/.test(String(data.amount)) || Number(data.amount) !== order.amount
    || typeof data.tid !== "string" || !/^[a-zA-Z0-9_-]{10,64}$/.test(data.tid) || typeof data.authToken !== "string" || data.authToken.length > 256
    || !sameHex(data.signature, hash(`${data.authToken}${data.clientId}${data.amount}${env.NICEPAY_SECRET_KEY}`))) {
    throw new PaymentError(400, "결제 인증 정보를 확인하지 못했습니다.", "invalid_authentication");
  }
}
export function safeReceipt(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "nicepay.co.kr" || url.hostname.endsWith(".nicepay.co.kr")) ? url.href : null;
  } catch { return null; }
}
export function verifyPayment(data, order, env) {
  if (data.resultCode !== "0000" || data.orderId !== order.id || !Number.isSafeInteger(Number(data.amount)) || Number(data.amount) !== order.amount
    || typeof data.tid !== "string" || !/^[a-zA-Z0-9_-]{10,64}$/.test(data.tid) || (order.gateway_tid && data.tid !== order.gateway_tid)
    || typeof data.ediDate !== "string" || !sameHex(data.signature, hash(`${data.tid}${data.amount}${data.ediDate}${env.NICEPAY_SECRET_KEY}`))
    || !["paid", "ready", "failed", "cancelled", "partialCancelled", "expired"].includes(data.status)
    || (data.currency && data.currency !== "KRW") || (data.payMethod && data.payMethod !== order.payment_method)) {
    throw new PaymentError(502, "결제 결과를 확인하고 있습니다. 잠시 후 다시 확인해 주세요.", "invalid_payment");
  }
  const balance = Number(data.balanceAmt);
  if (!Number.isSafeInteger(balance) || balance < 0 || balance > order.amount || (data.status === "paid" && balance !== order.amount)
    || (data.status === "cancelled" && balance !== 0)) throw new PaymentError(502, "결제 금액을 확인하고 있습니다.", "invalid_balance");
  const date = (value) => typeof value === "string" && value !== "0" && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
  return { tid: data.tid, amount: Number(data.amount), state: { ready: "authorizing", partialCancelled: "partial_cancelled" }[data.status] || data.status,
    balance, receipt: safeReceipt(data.receiptUrl), paidAt: date(data.paidAt), cancelledAt: date(data.cancelledAt), code: data.resultCode,
    message: ["failed", "expired"].includes(data.status) ? "결제가 완료되지 않았습니다. 다시 시도해 주세요." : null };
}
export function createNicepayGateway(env, fetchImpl = fetch) {
  if (!["sandbox", "production"].includes(env.NICEPAY_ENV)) throw new PaymentError(503, "결제 환경 설정을 확인해 주세요.", "payment_not_configured");
  const origin = env.NICEPAY_ENV === "production" ? "https://api.nicepay.co.kr" : "https://sandbox-api.nicepay.co.kr";
  const request = async (path, body) => {
    let response;
    try {
      response = await fetchImpl(`${origin}/v1/payments/${path}`, { method: body === undefined ? "GET" : "POST", redirect: "error",
        headers: { Authorization: `Basic ${Buffer.from(`${env.NICEPAY_CLIENT_KEY}:${env.NICEPAY_SECRET_KEY}`).toString("base64")}`, "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000) });
    } catch { throw new PaymentError(503, "결제사의 응답을 확인하고 있습니다.", "gateway_unavailable"); }
    const data = await response.json().catch(() => null);
    if (!response.ok || !data || typeof data !== "object") {
      if (response.status === 404 && data?.resultCode === "U107") throw new PaymentError(404, "결제 내역이 아직 확인되지 않았습니다.", "payment_not_found");
      throw new PaymentError(502, "결제사의 응답을 확인하고 있습니다.", "gateway_unavailable");
    }
    return data;
  };
  return {
    approve: (tid, amount) => {
      const ediDate = new Date().toISOString();
      return request(encodeURIComponent(tid), { amount, ediDate, signData: hash(`${tid}${amount}${ediDate}${env.NICEPAY_SECRET_KEY}`) });
    },
    find: (orderId) => request(`find/${encodeURIComponent(orderId)}`),
    netCancel: (orderId) => {
      const ediDate = new Date().toISOString();
      return request("netcancel", { orderId, ediDate, signData: hash(`${orderId}${ediDate}${env.NICEPAY_SECRET_KEY}`) });
    },
  };
}
