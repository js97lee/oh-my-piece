import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import MobilePageShell from "../components/layout/MobilePageShell";
import { useAuth } from "../context/AuthContext";
import { safeReturnTo, validateCredentials, signupProfile } from "../../shared/auth";
import { AuthLoading } from "../components/auth/RequireAuth";
import EmailConfirmation from "../components/auth/EmailConfirmation";

const SUBJECT_OPTIONS = [
  { value: "english", label: "영어" },
  { value: "math", label: "수학" },
];

const GOAL_OPTIONS = [
  { value: "review", label: "단기 복습" },
  { value: "habit", label: "꾸준한 습관" },
  { value: "exam", label: "시험 대비" },
  { value: "basics", label: "기초 다지기" },
];

export default function SignupPage() {
  const { isAuthenticated, loading, signup } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    passwordConfirm: "",
    gender: "",
    ageGroup: "",
    academicLevel: "",
    preferredSubjects: [],
    level: "",
    learningGoal: "",
  });
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const returnTo = safeReturnTo(searchParams.get("returnTo"), "/account");
  const canSubmit = useMemo(() => {
    return Boolean(
      form.name.trim() &&
        form.email.trim() &&
        form.phone.trim() &&
        form.password &&
        form.passwordConfirm,
    );
  }, [form]);

  if (loading) return <AuthLoading />;
  if (isAuthenticated) {
    return <Navigate to={returnTo?.startsWith("/") ? returnTo : "/"} replace />;
  }

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError("");
  };

  const toggleSubject = (value) => {
    setForm((prev) => {
      const exists = prev.preferredSubjects.includes(value);
      return {
        ...prev,
        preferredSubjects: exists
          ? prev.preferredSubjects.filter((item) => item !== value)
          : [...prev.preferredSubjects, value],
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      validateCredentials(form, true);
      signupProfile(form);
      const result = await signup({ ...form, returnTo });
      if (result.needsEmailConfirmation) {
        setConfirmationEmail(form.email.trim());
        setForm((previous) => ({ ...previous, password: "", passwordConfirm: "" }));
      } else navigate(returnTo, { replace: true });
    } catch (submitError) { setError(submitError.message); }
    finally { setIsSubmitting(false); }
  };

  if (confirmationEmail) return <MobilePageShell mainClassName="signup-page"><EmailConfirmation email={confirmationEmail} returnTo={returnTo} /></MobilePageShell>;

  return (
    <MobilePageShell mainClassName="signup-page">
      <header className="signup-header">
        <h1>회원가입</h1>
        <p>이름, 전화번호, 이메일로 오마이피스에 가입해요.</p>
      </header>

      <form className="signup-form" onSubmit={handleSubmit}>
        <section className="signup-section">
          <h2>
            필수 정보 <em>*</em>
          </h2>

          <label className="signup-field">
            <span>이름</span>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="이름을 입력해 주세요"
              autoComplete="name"
              required
            />
          </label>

          <label className="signup-field">
            <span>전화번호</span>
            <input type="tel" name="phone" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder="010-0000-0000" autoComplete="tel" maxLength={20} required />
            <small>연락처로 저장되며, 전화번호 인증은 진행하지 않습니다.</small>
          </label>

          <label className="signup-field">
            <span>이메일</span>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="email@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="signup-field">
            <span>비밀번호</span>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              placeholder="8자 이상 입력해 주세요"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>

          <label className="signup-field">
            <span>비밀번호 확인</span>
            <input
              type="password"
              name="passwordConfirm"
              value={form.passwordConfirm}
              onChange={(event) => updateField("passwordConfirm", event.target.value)}
              placeholder="비밀번호를 한 번 더 입력해 주세요"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
        </section>

        <section className="signup-section">
          <h2>선택 정보</h2>

          <label className="signup-field">
            <span>성별</span>
            <select value={form.gender} onChange={(event) => updateField("gender", event.target.value)}>
              <option value="">선택안함</option>
              <option value="male">남</option>
              <option value="female">여</option>
            </select>
          </label>

          <label className="signup-field">
            <span>나이</span>
            <select value={form.ageGroup} onChange={(event) => updateField("ageGroup", event.target.value)}>
              <option value="">선택안함</option>
              <option value="under10">10세 미만</option>
              <option value="10s">10대</option>
              <option value="20s">20대</option>
              <option value="30s">30대</option>
              <option value="40s">40대</option>
              <option value="50plus">50대 이상</option>
            </select>
          </label>

          <label className="signup-field">
            <span>학업수준</span>
            <select
              value={form.academicLevel}
              onChange={(event) => updateField("academicLevel", event.target.value)}
            >
              <option value="">선택안함</option>
              <option value="elementary">초등</option>
              <option value="middle">중등</option>
              <option value="high">고등</option>
              <option value="adult">대학·성인</option>
              <option value="other">기타</option>
            </select>
          </label>

          <div className="signup-field">
            <span>선호과목</span>
            <div className="signup-chip-group">
              {SUBJECT_OPTIONS.map((option) => (
                <label key={option.value} className="signup-chip">
                  <input
                    type="checkbox"
                    checked={form.preferredSubjects.includes(option.value)}
                    onChange={() => toggleSubject(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="signup-field">
            <span>수준</span>
            <select value={form.level} onChange={(event) => updateField("level", event.target.value)}>
              <option value="">선택안함</option>
              <option value="basic">下</option>
              <option value="middle">中</option>
              <option value="high">上</option>
            </select>
          </label>

          <label className="signup-field">
            <span>학습목표</span>
            <select value={form.learningGoal} onChange={(event) => updateField("learningGoal", event.target.value)}>
              <option value="">선택안함</option>
              {GOAL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </section>

        {error ? <p className="signup-error" role="alert">{error}</p> : null}

        <button className="signup-submit" type="submit" disabled={!canSubmit || isSubmitting}>
          {isSubmitting ? "가입 중..." : "가입하고 이메일 인증하기"}
        </button>

        <p className="signup-footnote">
          가입 시 <Link to="/policies/terms">이용약관</Link> 및 <Link to="/policies/privacy">개인정보처리방침</Link>에
          동의하게 됩니다.
        </p>
      </form>
    </MobilePageShell>
  );
}
