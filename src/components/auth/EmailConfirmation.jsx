import { useState } from "react";
import { Link } from "react-router-dom";
import { sessionRequest } from "../../services/auth";

export default function EmailConfirmation({ email, returnTo }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const resend = async () => {
    setBusy(true);
    setMessage("");
    try { setMessage((await sessionRequest("resend", { email, returnTo })).message); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  return <section className="auth-confirmation" aria-labelledby="confirmation-title">
    <h2 id="confirmation-title">이메일을 확인해 주세요</h2>
    <p><strong>{email}</strong>의 받은편지함과 스팸함에서 가입 인증 메일을 확인해 주세요. 이미 가입한 이메일이라면 로그인할 수 있어요.</p>
    <p>가입을 시작한 브라우저에서 인증 링크를 열어 주세요. 인증 후 로그인 상태로 돌아옵니다.</p>
    <button className="signup-secondary-button" type="button" disabled={busy} onClick={resend}>{busy ? "요청 중..." : "인증 메일 다시 받기"}</button>
    {message && <p role="status">{message}</p>}
    <p><Link to={`/login?returnTo=${encodeURIComponent(returnTo)}`}>로그인으로 이동</Link></p>
  </section>;
}
