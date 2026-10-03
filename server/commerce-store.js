import { createClient } from "@supabase/supabase-js";
import { PaymentError } from "./nicepay.js";

function unwrap({ data, error }) {
  if (!error) return data;
  if (error.code === "23505") throw new PaymentError(409, "이미 처리 중인 거래입니다. 결제 내역을 확인해 주세요.", "transaction_conflict");
  const conflicts = {
    subscription_overlap: "선택한 기간에 이미 구독 중인 콘텐츠입니다.", pending_order: "확인 중인 주문이 있습니다. 결제 내역에서 먼저 확인해 주세요.",
    idempotency_conflict: "주문 정보가 변경되었습니다. 결제를 새로 시작해 주세요.", transaction_conflict: "이미 처리 중인 결제입니다. 결제 내역을 확인해 주세요.",
  };
  if (conflicts[error.message]) throw new PaymentError(409, conflicts[error.message], error.message);
  if (error.message === "order_not_found") throw new PaymentError(404, "주문을 찾을 수 없습니다.", "order_not_found");
  throw new PaymentError(503, "주문 정보를 저장하거나 확인하지 못했습니다. 잠시 후 다시 확인해 주세요.", "database_unavailable");
}
export function createCommerceStore(env) {
  const db = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const rpc = async (name, args) => unwrap(await db.rpc(name, args));
  return {
    create: (userId, checkout, fingerprint) => rpc("commerce_create_order", { p_user_id: userId, p_request_key: checkout.requestKey, p_fingerprint: fingerprint,
      p_environment: env.NICEPAY_ENV, p_slug: checkout.product.slug, p_title: checkout.product.title, p_amount: checkout.product.amount,
      p_method: checkout.paymentMethod, p_start_date: checkout.startDate, p_end_date: checkout.endDate, p_delivery: checkout.delivery }),
    get: async (id, userId) => {
      let query = db.from("commerce_orders").select("*").eq("id", id).eq("environment", env.NICEPAY_ENV);
      if (userId) query = query.eq("user_id", userId);
      return unwrap(await query.maybeSingle());
    },
    orders: async (userId) => unwrap(await db.from("commerce_orders").select("*").eq("user_id", userId).eq("environment", env.NICEPAY_ENV).order("created_at", { ascending: false }).limit(100)),
    subscriptions: async (userId) => unwrap(await db.from("commerce_subscriptions").select("*").eq("user_id", userId).eq("environment", env.NICEPAY_ENV).neq("status", "cancelled").order("start_date", { ascending: true })),
    claim: (id, tid) => rpc("commerce_claim_order", { p_order_id: id, p_tid: tid }),
    requestCancel: (id) => rpc("commerce_request_cancel", { p_order_id: id }),
    apply: (id, payment) => rpc("commerce_apply_payment", { p_order_id: id, p_tid: payment.tid, p_amount: payment.amount, p_state: payment.state,
      p_balance: payment.balance, p_receipt: payment.receipt, p_paid_at: payment.paidAt, p_cancelled_at: payment.cancelledAt,
      p_code: payment.code, p_message: payment.message }),
    failCreated: async (id, message, status = "failed") => unwrap(await db.from("commerce_orders").update({ status, failure_message: message, updated_at: new Date().toISOString() }).eq("id", id).eq("status", "created").select().maybeSingle()),
    markDeclined: async (id) => unwrap(await db.from("commerce_orders").update({ status: "failed", failure_message: "결제가 승인되지 않았습니다. 결제 수단을 확인해 주세요.", updated_at: new Date().toISOString() }).eq("id", id).eq("status", "authorizing").select().maybeSingle()),
  };
}
