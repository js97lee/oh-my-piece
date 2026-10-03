export const pricingByLevel = {
  basic: { amount: 39000, totalPrice: "39,000원", monthlyPrice: "월 3,250원" },
  middle: { amount: 59000, totalPrice: "59,000원", monthlyPrice: "월 4,917원" },
  high: { amount: 79000, totalPrice: "79,000원", monthlyPrice: "월 6,583원" },
};
const catalog = [
  ["daily-english-word", "영어 下", "basic"], ["english-intermediate", "영어 中", "middle"], ["english-advanced", "영어 上", "high"],
  ["math-basic", "수학 下", "basic"], ["math-intermediate", "수학 中", "middle"], ["math-advanced", "수학 上", "high"],
].map(([slug, title, level]) => ({ slug, title, level, ...pricingByLevel[level] }));
export function getProduct(slug) { return catalog.find((product) => product.slug === slug) || null; }
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function koreaDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function subscriptionEndDate(startDate) {
  if (!validDate(startDate)) return "";
  const date = new Date(`${startDate}T00:00:00Z`);
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
export function validateCheckout(input, now = new Date()) {
  const product = getProduct(input.slug);
  if (!product) throw new Error("판매 중인 콘텐츠를 선택해 주세요.");
  if (!UUID_PATTERN.test(input.requestKey || "")) throw new Error("결제 요청을 새로 시작해 주세요.");
  if (!["card", "kakaopay"].includes(input.paymentMethod)) throw new Error("결제 수단을 확인해 주세요.");
  const today = koreaDate(now);
  const maxDate = new Date(`${today}T00:00:00Z`);
  maxDate.setUTCDate(maxDate.getUTCDate() + 365);
  if (!validDate(input.startDate) || input.startDate < today || input.startDate > maxDate.toISOString().slice(0, 10)) throw new Error("구독 시작일은 오늘부터 1년 이내로 선택해 주세요.");
  const delivery = input.delivery || {};
  const phone = typeof delivery.phone === "string" ? delivery.phone.replace(/[\s()-]/g, "") : "";
  if (!/^01[016789]\d{7,8}$/.test(phone)) throw new Error("콘텐츠를 받을 휴대전화 번호를 확인해 주세요.");
  if (typeof delivery.time !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(delivery.time)) throw new Error("발송 시간을 확인해 주세요.");
  return { product, requestKey: input.requestKey, paymentMethod: input.paymentMethod, startDate: input.startDate,
    endDate: subscriptionEndDate(input.startDate), delivery: { phone, time: delivery.time, timezone: "Asia/Seoul" } };
}
export const PAYMENT_LABELS = {
  created: "결제 대기", authorizing: "승인 확인 중", paid: "결제 완료", failed: "결제 실패", expired: "주문 만료",
  cancelled: "결제 취소", cancel_pending: "취소 확인 중", partial_cancelled: "부분 취소", review: "결제 확인 중",
};
