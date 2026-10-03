import { useState } from "react";
import MobilePageShell from "../components/layout/MobilePageShell";
import { useAuth } from "../context/AuthContext";

const SUBJECT_LABELS = {
  english: "영어",
  math: "수학",
};

const LEVEL_LABELS = {
  basic: "下",
  middle: "中",
  high: "上",
};

const GOAL_LABELS = {
  review: "단기 복습",
  habit: "꾸준한 습관",
  exam: "시험 대비",
  basics: "기초 다지기",
};

const GENDER_LABELS = {
  male: "남",
  female: "여",
};

const AGE_LABELS = {
  under10: "10세 미만",
  "10s": "10대",
  "20s": "20대",
  "30s": "30대",
  "40s": "40대",
  "50plus": "50대 이상",
};

const ACADEMIC_LABELS = {
  elementary: "초등",
  middle: "중등",
  high: "고등",
  adult: "대학·성인",
  other: "기타",
};

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

function formatOptionalSummary(profile) {
  const parts = [
    GENDER_LABELS[profile.gender],
    AGE_LABELS[profile.ageGroup],
    ACADEMIC_LABELS[profile.academicLevel],
    (profile.preferredSubjects || []).map((item) => SUBJECT_LABELS[item]).filter(Boolean).join("·"),
    LEVEL_LABELS[profile.level],
    GOAL_LABELS[profile.learningGoal],
  ].filter(Boolean);

  return parts.length ? parts.join(" / ") : "미입력";
}

export default function AccountPage() {
  const { user, logout } = useAuth();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const isKakaoMember = user.provider === "kakao";
  const profile = user.profile;
  const connectedAt = user.createdAt;
  const handleLogout = async () => {
    setBusy(true);
    setMessage("");
    try { await logout(); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };

  return (
    <MobilePageShell mainClassName="account-page">
      <header className="account-page-header">
        <h1>계정</h1>
      </header>

      <section className="account-section">
        <div className="account-section-head">
          <div>
            <h2>{isKakaoMember ? "메신저" : "가입 방식"}</h2>
            <p>
              {isKakaoMember
                ? "카카오 계정으로 가입한 회원입니다."
                : "이메일로 가입한 회원입니다."}
            </p>
          </div>
        </div>
        <article className="account-card account-messenger-card">
          <div className="account-messenger-main">
            {isKakaoMember ? (
              <KakaoTalkIcon />
            ) : (
              <span className="account-local-icon" aria-hidden="true">
                {(profile.name || "?").slice(0, 1)}
              </span>
            )}
            <div>
              <strong>{isKakaoMember ? "카카오톡" : "일반 회원"}</strong>
              <small>{formatConnectedDate(connectedAt)}</small>
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
            <span>연락처 (미인증)</span>
            <strong>{profile.phoneNumber || "미제공"}</strong>
          </div>
          {!isKakaoMember ? (
            <div>
              <span>학습 프로필</span>
              <strong>{formatOptionalSummary(profile)}</strong>
            </div>
          ) : null}
        </article>
        {message ? <p className="account-message" role="status">{message}</p> : null}
      </section>

      <section className="account-section account-danger-section">
        <div className="account-section-head">
          <div>
            <h2>로그인 관리</h2>
          </div>
        </div>
        <article className="account-card account-action-card">
          <div>
            <strong>로그아웃</strong>
            <p>현재 기기에서 로그아웃합니다.</p>
          </div>
          <button className="account-button account-button--ghost" type="button" onClick={handleLogout} disabled={busy}>
            로그아웃
          </button>
        </article>
      </section>
    </MobilePageShell>
  );
}
