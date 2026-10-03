import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { paymentApi } from "../services/paymentGateway";
export function useSubscriptions() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setSubscriptions([]);
    paymentApi("subscriptions").then((data) => { if (active) setSubscriptions(data.subscriptions); }).catch((failure) => { if (active) setError(failure.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id, version]);
  return { subscriptions, loading, error, refresh: () => setVersion((value) => value + 1) };
}
