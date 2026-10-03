import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import KakaoLoginButton from "../components/auth/KakaoLoginButton";
import MobilePageShell from "../components/layout/MobilePageShell";
import { useAuth } from "../context/AuthContext";
import { safeReturnTo } from "../../shared/auth";
import { AuthLoading } from "../components/auth/RequireAuth";
import EmailConfirmation from "../components/auth/EmailConfirmation";

export default function LoginPage() {
  const { isAuthenticated, loading, login, providers } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(searchParams.has("authError") ? "인증 링크가 만료되었거나 다른 브라우저에서 열렸습니다. 가입한 브라우저에서 다시 열거나 로그인해 주세요." : "");
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const returnTo = safeReturnTo(searchParams.get("returnTo"));
  const signupPath = returnTo?.startsWith("/")
    ? `/signup?returnTo=${encodeURIComponent(returnTo)}`
    : "/signup";

  if (loading) return <AuthLoading />;
  if (isAuthenticated) {
    return <Navigate to={returnTo?.startsWith("/") ? returnTo : "/"} replace />;
  }

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setNeedsConfirmation(false);

    try {
      await login({
        email: form.email,
        password: form.password,
      });

      if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
        navigate(returnTo, { replace: true });
        return;
      }
      navigate("/", { replace: true });
    } catch (submitError) {
      setError(submitError.message);
      setNeedsConfirmation(submitError.code === "email_not_confirmed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MobilePageShell mainClassName="login-page" showFooter={false}>
      <div className="login-panel">
        <header className="login-header">
          <p className="login-kicker">OH MY PIECE</p>
          <h1>로그인</h1>
          <p>아이디와 비밀번호로 오마이피스에 로그인해요.</p>
        </header>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-field">
            <span>아이디 (이메일)</span>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="email@example.com"
              autoComplete="username"
              required
            />
          </label>

          <label className="login-field">
            <span>비밀번호</span>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              placeholder="비밀번호를 입력해 주세요"
              autoComplete="current-password"
              required
            />
          </label>

          {error ? <p className="login-error" role="alert">{error}</p> : null}

          <button className="login-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "로그인 중..." : "로그인"}
          </button>
        </form>

        {needsConfirmation && <EmailConfirmation email={form.email} returnTo={returnTo} />}

        {providers.kakao && <div className="login-divider" aria-hidden="true"><span>또는</span></div>}

        <div className="login-extra">
          <KakaoLoginButton variant="page" returnTo={returnTo} />
          <p className="login-footnote">
            아직 계정이 없나요? <Link to={signupPath}>회원가입</Link>
          </p>
        </div>
      </div>
    </MobilePageShell>
  );
}
