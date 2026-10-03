import { Link, Navigate, useSearchParams } from "react-router-dom";
import KakaoLoginButton from "../components/auth/KakaoLoginButton";
import MobilePageShell from "../components/layout/MobilePageShell";
import { useAuth } from "../context/AuthContext";
import { AuthLoading } from "../components/auth/RequireAuth";
import { safeReturnTo } from "../../shared/auth";

export default function MyPage() {
  const { isAuthenticated, loading } = useAuth();
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get("returnTo"), "/subscriptions");
  if (loading) return <AuthLoading />;
  if (isAuthenticated) return <Navigate to={returnTo} replace />;
  const query = `?returnTo=${encodeURIComponent(returnTo)}`;
  return <MobilePageShell mainClassName="mypage" showFooter={false}>
    <section className="mypage-content">
      <h1 className="mypage-title-light">매일 카톡으로 받는</h1><h1>지식 콘텐츠</h1>
      <p className="mypage-brand">오마이피스</p>
      <p className="mypage-description">연간 구독 한 번으로, 하루 10분씩<br />1년이면 약 61시간의 지식이 쌓여요.</p>
    </section>
    <section className="mypage-actions"><div className="mypage-auth-buttons">
      <Link className="signup-button" to={`/login${query}`}>로그인하기</Link>
      <Link className="signup-button signup-button--outline" to={`/signup${query}`}>회원가입하기</Link>
      <KakaoLoginButton returnTo={returnTo} />
    </div></section>
  </MobilePageShell>;
}
