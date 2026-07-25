import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import KakaoLoginButton from "../components/auth/KakaoLoginButton";
import MobilePageShell from "../components/layout/MobilePageShell";
import { setAuthPreview, useAuthPreview } from "../hooks/useAuthPreview";
import { completeKakaoLoginFromCallback, getKakaoSession } from "../services/kakaoAuth";

export default function MyPage() {
  const isAuthenticated = useAuthPreview();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loginError, setLoginError] = useState("");
  const [isCompletingLogin, setIsCompletingLogin] = useState(false);
  const handledCodeRef = useRef("");
  const session = getKakaoSession();

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code || handledCodeRef.current === code) {
      return;
    }

    handledCodeRef.current = code;
    setIsCompletingLogin(true);
    setLoginError("");

    completeKakaoLoginFromCallback(searchParams)
      .then((profile) => {
        if (!profile) {
          return;
        }

        const returnTo = searchParams.get("returnTo");
        setSearchParams({}, { replace: true });

        if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
          navigate(returnTo, { replace: true });
          return;
        }

        navigate("/", { replace: true });
      })
      .catch((error) => {
        setLoginError(error.message || "카카오 로그인에 실패했습니다.");
        setSearchParams({}, { replace: true });
      })
      .finally(() => {
        setIsCompletingLogin(false);
      });
  }, [searchParams, setSearchParams, navigate]);

  const togglePreview = () => {
    const nextState = !isAuthenticated;
    const returnTo = searchParams.get("returnTo");

    setAuthPreview(nextState);
    if (nextState && returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
      navigate(returnTo);
    }
  };

  return (
    <MobilePageShell mainClassName="mypage" showFooter={false}>
      <section className="mypage-content">
        <h1 className="mypage-title-light">매일 카톡으로 받는</h1>
        <h1>지식 콘텐츠</h1>
        <p className="mypage-brand">오마이피스</p>
        <p className="mypage-description">
          연간 구독 한 번으로, 하루 10분씩
          <br />
          1년이면 약 61시간의 지식이 쌓여요.
        </p>
        {isAuthenticated && session?.profile ? (
          <p className="mypage-description">{session.profile.nickname}님, 환영해요.</p>
        ) : null}
        {isCompletingLogin ? <p className="mypage-description">카카오 로그인 처리 중...</p> : null}
        {loginError ? <p className="mypage-description">{loginError}</p> : null}
      </section>
      <section className="mypage-actions">
        {!isAuthenticated && !isCompletingLogin ? <KakaoLoginButton /> : null}
        <small>
          로그인 시 <Link to="/policies/terms">이용약관</Link> 및 <Link to="/policies/privacy">개인정보처리방침</Link>에
          <br />
          동의하게 됩니다.
        </small>
        <div className="developer-mode">
          <span>
            <strong>개발자 모드</strong>
            <small>카카오 로그인 연동 전 화면 미리보기</small>
          </span>
          <button className={isAuthenticated ? "is-active" : ""} type="button" onClick={togglePreview}>
            {isAuthenticated ? "로그인됨" : "로그인 보기"}
          </button>
        </div>
      </section>
    </MobilePageShell>
  );
}
