import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import MobilePageShell from "../components/layout/MobilePageShell";
import { paymentApi, clearCheckout } from "../services/paymentGateway";
import { removeFromCart } from "../services/cart";
import { useAuth } from "../context/AuthContext";

const pendingStates = ["authorizing", "cancel_pending", "review"];
const money = (value) => `${Number(value).toLocaleString("ko-KR")}원`;
const dateLabel = (value) => value ? new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";

export function PaymentResultPage() {
  const [params] = useSearchParams();
  const orderId = params.get("orderId");
  const callbackError = params.has("error");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true; let timer; let attempts = 0;
    setLoading(true); setError(""); setOrder(null);
    const poll = async () => {
      if (!orderId) { setError("결제 결과를 확인할 주문 정보가 없습니다. 결제 내역에서 다시 확인해 주세요."); setLoading(false); return; }
      try {
        const result = await paymentApi(`order?orderId=${encodeURIComponent(orderId)}`);
        if (!active) return;
        setOrder(result.order); setError("");
        if (result.order.status === "paid") { clearCheckout(user.id, result.order.slug); removeFromCart(result.order.slug); }
        if (pendingStates.includes(result.order.status) && attempts++ < 10) timer = setTimeout(poll, 3000);
      } catch (failure) { if (active) setError(failure.message); }
      finally { if (active) setLoading(false); }
    };
    poll();
    return () => { active = false; clearTimeout(timer); };
  }, [orderId, refresh, user.id]);
  const restart = async () => {
    setBusy(true);
    try { await paymentApi("abandon", { orderId }); clearCheckout(user.id, order.slug); navigate(`/contents/${order.slug}/purchase`, { replace: true }); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  const paid = order?.status === "paid";
  const heading = !order ? "결제 결과 확인" : paid ? (order.environment === "sandbox" ? "테스트 결제가 완료됐어요" : "결제가 완료됐어요") :
    order.status === "cancel_pending" ? "결제 취소를 확인하고 있어요" : pendingStates.includes(order.status) ? "결제 결과를 확인하고 있어요" : order.statusLabel;
  return <MobilePageShell mainClassName="purchase-page payment-result-page">
    <header className="purchase-header"><span>결제 결과</span><h1>{heading}</h1></header>
    {loading && <p className="auth-status" role="status">결제 내역을 확인하고 있어요.</p>}
    {error && <p className="payment-error" role="alert">{error}</p>}
    {order && <>
      {order.environment === "sandbox" && <p className="payment-notice">테스트 거래이며 실제 금액은 청구되지 않았습니다.</p>}
      {paid && <p className="payment-result-description">구독이 등록되었습니다. 내 구독에서 이용 기간과 발송 정보를 확인할 수 있어요.</p>}
      {pendingStates.includes(order.status) && <p className="payment-result-description" role="status">처리 결과를 확인하고 있습니다. 중복 결제를 피할 수 있도록 새 결제는 잠시 기다려 주세요. 확인이 오래 걸리면 주문번호와 함께 고객센터로 문의해 주세요.</p>}
      {callbackError && !paid && <p className="payment-error">결제 응답을 확인하는 중 문제가 발생했습니다. 아래 주문 상태와 결제 내역을 확인해 주세요.</p>}
      {order.errorMessage && !paid && <p className="payment-result-description">{order.errorMessage}</p>}
      <dl className="payment-detail-list">
        <div><dt>콘텐츠</dt><dd>{order.title}</dd></div><div><dt>결제 금액</dt><dd>{money(order.amount)}</dd></div><div><dt>상태</dt><dd>{order.statusLabel}</dd></div>
        <div><dt>구독 기간</dt><dd>{order.startDate} ~ {order.endDate}</dd></div><div><dt>발송 시간</dt><dd>매일 {order.delivery.time} (한국 시간)</dd></div>
        <div><dt>수신번호</dt><dd>{order.delivery.phone}</dd></div><div><dt>주문번호</dt><dd className="payment-order-id">{order.id}</dd></div>
      </dl>
      {order.receiptUrl && <a className="payment-receipt-link" href={order.receiptUrl} target="_blank" rel="noopener noreferrer">결제 영수증 보기 ↗</a>}
      <div className="payment-result-actions">
        {paid && <Link className="signup-button" to="/subscriptions">내 구독 확인하기</Link>}
        {order.status === "created" && <button className="signup-button" onClick={restart} disabled={busy}>주문을 취소하고 다시 선택하기</button>}
        {["failed", "expired", "cancelled"].includes(order.status) && <Link className="signup-button" to={`/contents/${order.slug}/purchase`} onClick={() => clearCheckout(user.id, order.slug)}>다시 구독 신청하기</Link>}
      </div>
    </>}
    <div className="payment-result-actions"><button className="signup-secondary-button" onClick={() => setRefresh((value) => value + 1)} disabled={loading}>상태 다시 확인</button><Link to="/payments">결제 내역 보기</Link></div>
  </MobilePageShell>;
}

export function PaymentHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const { user } = useAuth();
  useEffect(() => {
    let active = true; setLoading(true); setError("");
    paymentApi("orders").then((data) => { if (active) setOrders(data.orders); }).catch((failure) => { if (active) setError(failure.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user.id, refresh]);
  return <MobilePageShell mainClassName="member-page payment-history-page">
    <header className="member-page-header"><h1>결제 내역</h1><p>내 주문과 결제 상태를 확인해요.</p></header>
    {loading ? <p role="status">결제 내역을 불러오고 있어요.</p> : error ? <div role="alert"><p>{error}</p><button onClick={() => setRefresh((value) => value + 1)}>다시 확인</button></div> : orders.length === 0 ?
      <section className="member-empty-state"><strong>아직 결제 내역이 없어요.</strong><p>구독을 신청하면 이곳에서 확인할 수 있어요.</p><Link to="/">콘텐츠 둘러보기</Link></section> :
      <ul className="payment-history-list">{orders.map((order) => <li key={order.id}><div className="payment-history-heading"><strong>{order.title}</strong><span>{order.statusLabel}</span></div>
        {order.environment === "sandbox" && <small className="payment-test-badge">테스트 거래</small>}
        <p>{money(order.amount)} · {order.paymentMethod === "kakaopay" ? "카카오페이" : "신용·체크카드"}</p><small>{dateLabel(order.createdAt)}</small>
        <Link to={`/payment/result?orderId=${order.id}`}>상세 내역 확인 →</Link>
      </li>)}</ul>}
  </MobilePageShell>;
}
