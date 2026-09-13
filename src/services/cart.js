const CART_KEY = "oh_my_piece_cart";
const CART_EVENT = "oh-my-piece-cart-change";

function emitCartChange() {
  window.dispatchEvent(new CustomEvent(CART_EVENT));
}

export function getCartItems() {
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getCartCount() {
  return getCartItems().reduce((sum, item) => sum + (item.quantity || 1), 0);
}

export function addToCart(content) {
  if (!content?.slug) return getCartItems();

  const items = getCartItems();
  const existing = items.find((item) => item.slug === content.slug);
  if (existing) {
    existing.quantity = (existing.quantity || 1) + 1;
  } else {
    items.push({
      slug: content.slug,
      title: content.title,
      image: content.image,
      totalPrice: content.totalPrice,
      quantity: 1,
      addedAt: Date.now(),
    });
  }

  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  emitCartChange();
  return items;
}

export function removeFromCart(slug) {
  const items = getCartItems().filter((item) => item.slug !== slug);
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  emitCartChange();
  return items;
}

export function clearCart() {
  window.localStorage.removeItem(CART_KEY);
  emitCartChange();
}

export function subscribeCartChange(listener) {
  const onChange = () => listener();
  window.addEventListener(CART_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CART_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
