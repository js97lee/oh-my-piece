import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MobilePageShell from "../components/layout/MobilePageShell";
import { getCartItems, removeFromCart } from "../services/cart";

export default function CartPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState(() => getCartItems());

  const totalLabel = useMemo(() => {
    if (items.length === 0) return "0원";
    const total = items.reduce((sum, item) => {
      const price = Number(String(item.totalPrice || "").replace(/[^0-9]/g, "")) || 0;
      return sum + price * (item.quantity || 1);
    }, 0);
    return `${total.toLocaleString("ko-KR")}원`;
  }, [items]);

  const removeItem = (slug) => {
    setItems(removeFromCart(slug));
  };

  return (
    <MobilePageShell mainClassName="member-page cart-page">
      <header className="member-page-header">
        <h1>장바구니</h1>
        <p>담아둔 콘텐츠를 확인하고 구독을 이어가요.</p>
      </header>

      {items.length === 0 ? (
        <section className="member-empty-state">
          <strong>장바구니가 비어 있어요.</strong>
          <p>관심 있는 콘텐츠를 담아두면 여기에서 모아볼 수 있어요.</p>
          <Link className="subscription-empty-link" to="/#content-catalog">
            콘텐츠 둘러보기
          </Link>
        </section>
      ) : (
        <>
          <ul className="cart-list">
            {items.map((item) => (
              <li className="cart-item" key={item.slug}>
                <Link className="cart-item-cover" to={`/contents/${item.slug}`}>
                  <img src={item.image} alt="" />
                </Link>
                <div className="cart-item-body">
                  <h2>{item.title}</h2>
                  <p>연 {item.totalPrice}</p>
                  <div className="cart-item-actions">
                    <button type="button" onClick={() => navigate(`/contents/${item.slug}/purchase`)}>
                      구독하기
                    </button>
                    <button type="button" className="is-ghost" onClick={() => removeItem(item.slug)}>
                      삭제
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="cart-summary">
            <div>
              <span>예상 결제 금액</span>
              <strong>{totalLabel}</strong>
            </div>
            <p>실제 결제는 각 콘텐츠 구독 화면에서 진행돼요.</p>
          </div>
        </>
      )}
    </MobilePageShell>
  );
}
