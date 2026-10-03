const SDK_URL = "https://pay.nicepay.co.kr/v1/js/";
let sdkPromise;
const pendingKeys = new Map();

export async function paymentApi(action, body, signal) {
  let response;
  try {
    response = await fetch(`/api/payments/${action}`, {
      method: body === undefined ? "GET" : "POST", credentials: "same-origin", cache: "no-store",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: signal || AbortSignal.timeout(45000),
    });
  } catch {
    throw new Error("결제 서버에 연결하지 못했습니다. 결제 내역을 확인한 뒤 다시 시도해 주세요.");
  }
  const data = await response.json().catch(() => null);
  if (!data || typeof data !== "object") throw new Error("결제 서버의 응답을 확인하지 못했습니다.");
  if (!response.ok) {
    const error = new Error(data.error || "결제 요청을 처리하지 못했습니다.");
    error.code = data.code;
    throw error;
  }
  return data;
}

export function loadNicepay() {
  if (window.AUTHNICE?.requestPay) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    const timer = setTimeout(() => fail(), 15000);
    const fail = () => {
      clearTimeout(timer); script.remove(); sdkPromise = null;
      reject(new Error("결제창을 불러오지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요."));
    };
    script.onerror = fail;
    script.onload = () => {
      clearTimeout(timer);
      if (!window.AUTHNICE?.requestPay) { fail(); return; }
      resolve();
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

function requestKeyFor(key, input) {
  const fingerprint = JSON.stringify(input);
  let saved = pendingKeys.get(key);
  try { saved ||= JSON.parse(sessionStorage.getItem(key) || "null"); } catch { /* Optional storage. */ }
  if (!saved || saved.fingerprint !== fingerprint) saved = { fingerprint, requestKey: crypto.randomUUID() };
  pendingKeys.set(key, saved);
  try { sessionStorage.setItem(key, JSON.stringify(saved)); } catch { /* In-memory fallback. */ }
  return saved.requestKey;
}
export function clearCheckout(userId, slug) {
  const key = `omp-checkout:${userId}:${slug}`;
  pendingKeys.delete(key);
  try { sessionStorage.removeItem(key); } catch { /* Optional storage. */ }
}

export async function requestPayment(input, userId) {
  await loadNicepay();
  const key = `omp-checkout:${userId}:${input.slug}`;
  const requestKey = requestKeyFor(key, input);
  let result;
  try { result = await paymentApi("checkout", { ...input, requestKey }); }
  catch (error) {
    if (["order_not_payable", "idempotency_conflict"].includes(error.code)) clearCheckout(userId, input.slug);
    throw error;
  }
  if (!result.order?.id) throw new Error("주문 정보를 확인하지 못했습니다.");
  if (result.alreadyPaid) { window.location.assign(`/payment/result?orderId=${result.order.id}`); return; }
  if (!result.checkout) throw new Error("결제 정보를 확인하지 못했습니다.");
  return new Promise((resolve, reject) => {
    const onError = async () => {
      try { await paymentApi("abandon", { orderId: result.order.id }); } catch { /* Keep the order available for reconciliation. */ }
      clearCheckout(userId, input.slug);
      reject(new Error("결제창이 닫혔거나 결제가 진행되지 않았습니다. 결제 내역을 확인한 뒤 다시 시도해 주세요."));
    };
    try { window.AUTHNICE.requestPay({ ...result.checkout, fnError: onError }); }
    catch { onError(); }
    // A successful SDK authentication navigates to the server callback.
  });
}
