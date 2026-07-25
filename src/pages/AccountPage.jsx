import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import MobilePageShell from "../components/layout/MobilePageShell";
import { logoutAuth, useAuthPreview } from "../hooks/useAuthPreview";
import { getKakaoSession, syncKakaoProfile } from "../services/kakaoAuth";

function formatConnectedDate(timestamp) {
  if (!timestamp) {
    return "연결됨";
  }

  const date = new Date(timestamp);
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}. 연결됨`;
}

function KakaoTalkIcon() {
  return (
    <span className="account-kakao-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M12 4C7.03 4 3 7.13 3 10.96c0 2.43 1.6 4.56 4.02 5.8l-.92 3.38c-.08.3.26.54.5.36l4.03-2.68c.45.05.9.08 1.37.08 4.97 0 9-3.13 9-6.96S16.97 4 12 4Z" />
      </svg>
    </span>
  );
}

export default function AccountPage() {
  const isAuthenticated = useAuthPreview();
  const navigate = useNavigate();
  const [session, setSession] = useState(() => getKakaoSession());
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState("");

  if (!isAuthenticated) {
    return <Navigate to="/mypage?returnTo=/account" replace />;
  }

  const profile = session?.profile || {};

  const handleSync = async () => {
    setIsSyncing(true);
    setMessage("");
    try {
      await syncKakaoProfile();
      setSession(getKakaoSession());
      setMessage("계정 정보를 동기화했어요.");
    } catch (error) {
      setMessage(error.message || "동기화에 실패했습니다.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = () => {
    logoutAuth();
    navigate("/", { replace: true });
  };

  const handleWithdraw = () => {
    const confirmed = window.confirm("정말 탈퇴하시겠어요?\n계정 연결이 해제되고 이 기기의 로그인 정보가 삭제됩니다.");
    if (!confirmed) {
      return;
    }
    logoutAuth();
    navigate("/", { replace: true });
  };

  return (
    <MobilePageShell mainClassName="account-page">
      <header className="account-page-header">
        <h1>계정</h1>
      </header>

      <section className="account-section">
        <div className="account-section-head">
          <div>
            <h2>메신저</h2>
            <p>콘텐츠를 받을 메신저 연결 상태입니다.</p>
          </div>
          <button className="account-sync-button" type="button" onClick={handleSync} disabled={isSyncing}>
            <span aria-hidden="true">↻</span>
            {isSyncing ? "동기화 중" : "동기화"}
          </button>
        </div>
        <article className="account-card account-messenger-card">
          <div className="account-messenger-main">
            <KakaoTalkIcon />
            <div>
              <strong>카카오톡</strong>
              <small>{formatConnectedDate(session?.connectedAt)}</small>
            </div>
          </div>
          <span className="account-connected-badge">✓ 연결됨</span>
        </article>
      </section>

      <section className="account-section">
        <div className="account-section-head">
          <div>
            <h2>연결된 계정 정보</h2>
          </div>
        </div>
        <article className="account-card account-info-card">
          <div className="account-profile-photo-row">
            <span>프로필</span>
            {profile.profileImage ? (
              <img
                className="account-profile-photo"
                src={profile.profileImage}
                alt={`${profile.name || profile.nickname || "회원"} 프로필`}
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="account-profile-photo account-profile-photo--fallback" aria-hidden="true">
                {(profile.name || profile.nickname || "?").slice(0, 1)}
              </span>
            )}
          </div>
          <div>
            <span>이름</span>
            <strong>{profile.name || profile.nickname || "—"}</strong>
          </div>
          <div>
            <span>이메일</span>
            <strong>{profile.email || "미제공"}</strong>
          </div>
          <div>
            <span>전화번호</span>
            <strong>{profile.phoneNumber || "미제공"}</strong>
          </div>
        </article>
        {message ? <p className="account-message">{message}</p> : null}
      </section>

      <section className="account-section account-danger-section">
        <div className="account-section-head">
          <div>
            <h2>위험구역</h2>
            <p>되돌릴 수 없는 작업입니다. 신중하게 진행하세요</p>
          </div>
        </div>
        <article className="account-card account-action-card">
          <div>
            <strong>로그아웃</strong>
            <p>현재 기기에서 로그아웃합니다.</p>
          </div>
          <button className="account-button account-button--ghost" type="button" onClick={handleLogout}>
            로그아웃
          </button>
        </article>
        <article className="account-card account-action-card">
          <div>
            <strong>회원 탈퇴</strong>
            <p>계정을 삭제하고 모든 데이터를 영구적으로 제거합니다.</p>
          </div>
          <button className="account-button account-button--danger" type="button" onClick={handleWithdraw}>
            탈퇴하기
          </button>
        </article>
      </section>
    </MobilePageShell>
  );
}
