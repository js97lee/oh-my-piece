import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuthPreview } from "../../hooks/useAuthPreview";
import { addToCart } from "../../services/cart";

export default function SubscribeFloatingBar({ content }) {
  const isAuthenticated = useAuthPreview();
  const [cartMessage, setCartMessage] = useState("");
  const purchasePath = `/contents/${content.slug}/purchase`;
  const destination = isAuthenticated ? purchasePath : `/login?returnTo=${encodeURIComponent(purchasePath)}`;

  const handleAddCart = () => {
    addToCart(content);
    setCartMessage("장바구니에 담았어요");
    window.setTimeout(() => setCartMessage(""), 1800);
  };

  return (
    <div className="subscribe-floating">
      {cartMessage ? <p className="subscribe-floating-toast">{cartMessage}</p> : null}
      <div className="subscribe-floating-actions">
        <button className="subscribe-floating-cart" type="button" onClick={handleAddCart}>
          장바구니
        </button>
        <Link to={destination}>구독하기</Link>
      </div>
    </div>
  );
}
