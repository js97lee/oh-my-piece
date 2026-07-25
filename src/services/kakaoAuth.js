const STATE_KEY = "kakao_oauth_state";
const REDIRECT_KEY = "kakao_oauth_redirect_uri";
const SESSION_KEY = "oh_my_piece_kakao_session";
const AUTH_EVENT = "oh-my-piece-auth-change";

function getRedirectUri() {
  return import.meta.env.VITE_KAKAO_REDIRECT_URI || `${window.location.origin}/mypage`;
}

export function getKakaoSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isKakaoAuthenticated() {
  return Boolean(getKakaoSession()?.accessToken);
}

function emitAuthChange() {
  window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: isKakaoAuthenticated() }));
}

export function clearKakaoSession() {
  window.localStorage.removeItem(SESSION_KEY);
  emitAuthChange();
}

export function setKakaoSession(session) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  emitAuthChange();
}

export function subscribeAuthChange(callback) {
  const handler = (event) => {
    if (event.type === AUTH_EVENT) {
      callback(event.detail);
      return;
    }
    callback(isKakaoAuthenticated());
  };

  window.addEventListener(AUTH_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(AUTH_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function startKakaoLogin() {
  const restApiKey = import.meta.env.VITE_KAKAO_REST_API_KEY;
  const redirectUri = getRedirectUri();

  if (!restApiKey) {
    window.alert("카카오 REST API 키가 설정되지 않았습니다. .env.local을 확인해 주세요.");
    return;
  }

  const state = window.crypto.randomUUID();
  window.sessionStorage.setItem(STATE_KEY, state);
  window.sessionStorage.setItem(REDIRECT_KEY, redirectUri);

  const params = new URLSearchParams({
    client_id: restApiKey,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
    scope: "profile_nickname,account_email,name,phone_number",
  });

  window.location.assign(`https://kauth.kakao.com/oauth/authorize?${params.toString()}`);
}

async function fetchKakaoProfile(accessToken) {
  const response = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("카카오 사용자 정보를 불러오지 못했습니다.");
  }

  const profile = await response.json();
  const account = profile.kakao_account || {};
  const properties = profile.properties || {};

  return {
    id: profile.id,
    nickname: properties.nickname || account.profile?.nickname || "오마이피스 회원",
    name: account.name || properties.nickname || account.profile?.nickname || "오마이피스 회원",
    email: account.email || null,
    phoneNumber: account.phone_number || null,
  };
}

export async function syncKakaoProfile() {
  const session = getKakaoSession();
  if (!session?.accessToken) {
    throw new Error("로그인이 필요합니다.");
  }

  const profile = await fetchKakaoProfile(session.accessToken);
  setKakaoSession({
    ...session,
    profile,
    connectedAt: session.connectedAt || Date.now(),
    syncedAt: Date.now(),
  });
  return profile;
}

export async function completeKakaoLoginFromCallback(searchParams) {
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    throw new Error(searchParams.get("error_description") || "카카오 로그인이 취소되었습니다.");
  }

  if (!code) {
    return null;
  }

  const savedState = window.sessionStorage.getItem(STATE_KEY);
  const redirectUri = window.sessionStorage.getItem(REDIRECT_KEY) || getRedirectUri();

  if (!savedState || savedState !== state) {
    throw new Error("카카오 로그인 상태가 올바르지 않습니다. 다시 시도해 주세요.");
  }

  const response = await fetch("/api/kakao/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code, redirectUri }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    const description = payload.error_description || payload.error || "";
    if (/bad client credentials|invalid_client|koe010/i.test(description)) {
      throw new Error(
        "카카오 클라이언트 인증에 실패했습니다. 개발자 콘솔에서 Client Secret을 끄거나, 시크릿 값을 서버 환경변수에 넣어 주세요.",
      );
    }
    throw new Error(description || "카카오 토큰 발급에 실패했습니다.");
  }

  const profile = await fetchKakaoProfile(payload.access_token);
  setKakaoSession({
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token || null,
    expiresAt: Date.now() + (payload.expires_in || 0) * 1000,
    connectedAt: Date.now(),
    syncedAt: Date.now(),
    profile,
  });

  window.sessionStorage.removeItem(STATE_KEY);
  window.sessionStorage.removeItem(REDIRECT_KEY);

  return profile;
}

export { AUTH_EVENT, SESSION_KEY };
