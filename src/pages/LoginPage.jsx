import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import KakaoLoginButton from "../components/auth/KakaoLoginButton";
import MobilePageShell from "../components/layout/MobilePageShell";
import { useAuthPreview } from "../hooks/useAuthPreview";
import { loginLocalMember } from "../services/localAuth";

export default function LoginPage() {
  const isAuthenticated = useAuthPreview();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const returnTo = searchParams.get("returnTo");
  const signupPath = returnTo?.startsWith("/")
    ? `/signup?returnTo=${encodeURIComponent(returnTo)}`
    : "/signup";

  if (isAuthenticated) {
    return <Navigate to={returnTo?.startsWith("/") ? returnTo : "/"} replace />;
  }

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      loginLocalMember({
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
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MobilePageShell mainClassName="login-page">
      <header className="login-header">
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

        {error ? <p className="login-error">{error}</p> : null}

        <button className="login-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <div className="login-divider" aria-hidden="true">
        <span>또는</span>
      </div>

      <div className="login-extra">
        <KakaoLoginButton variant="page" />
        <p className="login-footnote">
          아직 계정이 없나요? <Link to={signupPath}>회원가입</Link>
        </p>
      </div>
    </MobilePageShell>
  );
}
