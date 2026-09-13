import { useEffect, useState } from "react";
import { getCartCount, subscribeCartChange } from "../services/cart";

export function useCartCount() {
  const [count, setCount] = useState(() => {
    try {
      return getCartCount();
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    const sync = () => setCount(getCartCount());
    sync();
    return subscribeCartChange(sync);
  }, []);

  return count;
}
