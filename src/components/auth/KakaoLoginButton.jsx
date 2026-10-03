import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { sessionRequest } from "../../services/auth";
import { safeReturnTo } from "../../../shared/auth";

function KakaoIcon() {
  return (
    <span className="kakao-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" role="presentation">
        <path d="M12 4c-5.1 0-9.2 3.2-9.2 7.2 0 2.6 1.8 4.9 4.5 6.2L6.3 21l3.7-2c.7.1 1.3.2 2 .2 5.1 0 9.2-3.2 9.2-7.2S17.1 4 12 4Z" />
      </svg>
    </span>
  );
}

export default function KakaoLoginButton({ variant = "page", returnTo = "/account" }) {
  const { providers } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!providers.kakao) return null;
  const startKakaoLogin = async () => {
    setBusy(true);
    setError("");
    try {
      const data = await sessionRequest("kakao", { returnTo: safeReturnTo(returnTo, "/account") });
      window.location.assign(data.url);
    } catch (failure) { setError(failure.message); setBusy(false); }
  };
  return (
    <>
    <button disabled={busy} className={`kakao-login-button kakao-login-button--${variant}`} type="button" onClick={startKakaoLogin}>
      <KakaoIcon />
      {busy ? "카카오로 이동 중..." : "카카오로 로그인하기"}
    </button>
    {error && <p className="login-error" role="alert">{error}</p>}
    </>
  );
}
