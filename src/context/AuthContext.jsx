import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { authRequest, sessionRequest } from "../services/auth";

const AuthContext = createContext(null);
let initialSession;
const loadInitialSession = () => initialSession ||= sessionRequest("session").finally(() => { initialSession = null; });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [providers, setProviders] = useState({ kakao: false });
  const channel = useRef(null);
  const refresh = useCallback(async () => {
    try {
      const result = await sessionRequest("session");
      setUser(result.user);
      setError("");
      return result.user;
    } catch (failure) { setError(failure.message); throw failure; }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    // Remove credentials left by the former demo login; they are never migrated as real accounts.
    try {
      for (const key of ["oh_my_piece_local_accounts", "oh_my_piece_local_member", "oh_my_piece_preview_member", "oh_my_piece_kakao_session"]) localStorage.removeItem(key);
      for (const key of ["oh_my_piece_phone_code", "kakao_oauth_state", "kakao_oauth_redirect_uri"]) sessionStorage.removeItem(key);
    } catch { /* Storage may be unavailable in private browsing. */ }
    loadInitialSession().then((data) => { if (active) { setUser(data.user); setError(""); } })
      .catch((failure) => { if (active) setError(failure.message); })
      .finally(() => { if (active) setLoading(false); });
    authRequest("providers").then((data) => { if (active) setProviders(data); }).catch(() => {});
    const sync = () => { if (document.visibilityState === "visible") refresh().catch(() => {}); };
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    const interval = window.setInterval(sync, 60000);
    if (typeof BroadcastChannel !== "undefined") {
      channel.current = new BroadcastChannel("oh-my-piece-auth");
      channel.current.onmessage = sync;
    }
    return () => {
      active = false;
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
      clearInterval(interval);
      channel.current?.close();
      channel.current = null;
    };
  }, [refresh]);

  const mutate = async (action, body) => {
    const result = await sessionRequest(action, body);
    setUser(result.user);
    setError("");
    setLoading(false);
    channel.current?.postMessage("changed");
    return result;
  };
  return <AuthContext.Provider value={{ user, loading, error, providers, isAuthenticated: Boolean(user), refresh,
    login: (body) => mutate("login", body), signup: (body) => mutate("signup", body), logout: () => mutate("logout", {}),
  }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider가 필요합니다.");
  return context;
}
