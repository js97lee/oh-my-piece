import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import MobilePageShell from "../components/layout/MobilePageShell";
import { getContentBySlug } from "../data/content";
import { useAuth } from "../context/AuthContext";
import { paymentApi, requestPayment } from "../services/paymentGateway";
import { koreaDate, subscriptionEndDate, validDate } from "../../shared/commerce";

function formatDate(date) {
  return validDate(date) ? new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", weekday: "short" }).format(new Date(`${date}T00:00:00Z`)) : "날짜를 선택해 주세요";
}
function PaymentMethodIcon({ method }) {
  return method === "kakaopay" ? <span className="payment-method-icon payment-method-icon--kakao"><b>pay</b></span> :
    <span className="payment-method-icon payment-method-icon--card" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 9h18M7 15h4" /></svg></span>;
}
export default function PurchasePage() {
  const { slug } = useParams();
  const { user, refresh } = useAuth();
  const content = getContentBySlug(slug);
  const [startDate, setStartDate] = useState(koreaDate);
  const [phone, setPhone] = useState(user?.profile.phoneNumber || "");
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [config, setConfig] = useState(null);
  const [configError, setConfigError] = useState("");
  const [reload, setReload] = useState(0);
  const endDate = useMemo(() => subscriptionEndDate(startDate), [startDate]);
  useEffect(() => {
    let active = true;
    setConfigError("");
    paymentApi("config").then((data) => { if (active) setConfig(data); }).catch((error) => { if (active) setConfigError(error.message); });
    return () => { active = false; };
  }, [reload]);
  if (!content) return <Navigate to="/" replace />;

  const submitPurchase = async (event) => {
    event.preventDefault();
    if (isPaying) return;
    const data = new FormData(event.currentTarget);
    setIsPaying(true);
    setPaymentError("");
    const hour = (Number(data.get("delivery-hour")) % 12) + (data.get("delivery-period") === "PM" ? 12 : 0);
    try {
      await requestPayment({ slug, startDate, paymentMethod: data.get("payment-method"), delivery: { phone, time: `${String(hour).padStart(2, "0")}:${data.get("delivery-minute")}` } }, user.id);
    } catch (error) {
      setPaymentError(error.message || "결제 중 오류가 발생했습니다.");
      if (error.code === "login_required") await refresh().catch(() => {});
    } finally { setIsPaying(false); }
  };

  return <MobilePageShell mainClassName="purchase-page">
    <header className="purchase-header"><span>구독 신청</span><h1>{content.title}</h1><p>발송 옵션과 결제 방법을 확인해 주세요.</p></header>
    {config?.environment === "sandbox" && <p className="payment-notice" role="status">테스트 결제 모드입니다. 실제 금액은 청구되지 않습니다.</p>}
    {configError && <div className="payment-error" role="alert"><p>{configError}</p><button type="button" onClick={() => setReload((value) => value + 1)}>다시 연결</button></div>}
    <form className="purchase-form" onSubmit={submitPurchase}>
      <fieldset className="purchase-fields" disabled={isPaying}>
        <section className="purchase-section">
          <h2>발송 시간</h2>
          <div className="delivery-time-selects" aria-label="콘텐츠를 받을 시간">
            <label className="purchase-select">오전·오후<select name="delivery-period" defaultValue="AM"><option value="AM">오전</option><option value="PM">오후</option></select></label>
            <label className="purchase-select">시<select name="delivery-hour" defaultValue="8">{Array.from({ length: 12 }, (_, index) => index + 1).map((hour) => <option value={hour} key={hour}>{hour}시</option>)}</select></label>
            <label className="purchase-select">분<select name="delivery-minute" defaultValue="00">{Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0")).map((minute) => <option value={minute} key={minute}>{minute}분</option>)}</select></label>
          </div>
          <label className="purchase-text-input">콘텐츠를 받을 휴대전화 번호<input name="delivery-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="010-0000-0000" autoComplete="tel" maxLength={20} required /></label>
          <p>발송 시간은 한국 시간을 기준으로 저장됩니다.</p>
        </section>
        <section className="purchase-section">
          <h2>구독 기간</h2>
          <label className="purchase-date-input">시작일<input type="date" name="start-date" value={startDate} min={koreaDate()} onChange={(event) => setStartDate(event.target.value)} required /></label>
          <dl className="purchase-period"><div><dt>시작일</dt><dd>{formatDate(startDate)}</dd></div><div><dt>종료일</dt><dd>{formatDate(endDate)}</dd></div></dl>
        </section>
        <section className="purchase-section">
          <h2>결제 방법</h2><div className="payment-options">
            <label><input type="radio" name="payment-method" value="card" defaultChecked /><span><PaymentMethodIcon method="card" /><strong>신용·체크카드</strong></span></label>
            <label><input type="radio" name="payment-method" value="kakaopay" /><span><PaymentMethodIcon method="kakaopay" /><strong>카카오페이</strong></span></label>
          </div>
        </section>
      </fieldset>
      <section className="purchase-summary"><div><span>상품 금액</span><strong>연 {content.totalPrice}</strong></div><div><span>월 환산 금액</span><strong>{content.monthlyPrice}</strong></div><p>1년 이용권 · 한 번 결제하며 자동으로 갱신되지 않습니다.</p></section>
      {paymentError && <div className="payment-error" role="alert"><p>{paymentError}</p><Link to="/payments">결제 내역 확인하기</Link></div>}
      <button className="purchase-submit" type="submit" disabled={isPaying || !config}>{isPaying ? "결제창 연결 중..." : !config ? "결제 서비스 확인 중..." : `${content.totalPrice} 결제하기`}</button>
      <p className="signup-footnote">결제 전 <Link to="/policies/terms">이용약관</Link>과 <Link to="/policies/privacy">개인정보처리방침</Link>을 확인해 주세요.</p>
    </form>
  </MobilePageShell>;
}
