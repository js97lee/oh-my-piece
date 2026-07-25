const MEMBER_KEY = "oh_my_piece_local_member";
const PHONE_CODE_KEY = "oh_my_piece_phone_code";
const AUTH_EVENT = "oh-my-piece-auth-change";
const DEV_PHONE_CODE = "000000";

function emitAuthChange() {
  window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: isLocalAuthenticated() }));
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

export function getLocalMember() {
  try {
    const raw = window.localStorage.getItem(MEMBER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isLocalAuthenticated() {
  return Boolean(getLocalMember()?.profile);
}

export function clearLocalMember() {
  window.localStorage.removeItem(MEMBER_KEY);
  window.sessionStorage.removeItem(PHONE_CODE_KEY);
  emitAuthChange();
}

export function requestPhoneCode(phone) {
  const normalized = normalizePhone(phone);
  if (normalized.length < 10) {
    throw new Error("올바른 전화번호를 입력해 주세요.");
  }

  window.sessionStorage.setItem(
    PHONE_CODE_KEY,
    JSON.stringify({
      phone: normalized,
      sentAt: Date.now(),
      verified: false,
    }),
  );

  return {
    ok: true,
    message: "인증번호를 보냈어요. (테스트 코드: 000000)",
  };
}

export function verifyPhoneCode(phone, code) {
  const normalized = normalizePhone(phone);
  const raw = window.sessionStorage.getItem(PHONE_CODE_KEY);
  if (!raw) {
    throw new Error("먼저 인증번호를 요청해 주세요.");
  }

  const pending = JSON.parse(raw);
  if (pending.phone !== normalized) {
    throw new Error("인증을 요청한 번호와 일치하지 않습니다.");
  }

  if (String(code).trim() !== DEV_PHONE_CODE) {
    throw new Error("인증번호가 올바르지 않습니다.");
  }

  window.sessionStorage.setItem(
    PHONE_CODE_KEY,
    JSON.stringify({
      ...pending,
      verified: true,
      verifiedAt: Date.now(),
    }),
  );

  return { ok: true };
}

export function isPhoneVerified(phone) {
  try {
    const raw = window.sessionStorage.getItem(PHONE_CODE_KEY);
    if (!raw) {
      return false;
    }
    const pending = JSON.parse(raw);
    return pending.verified === true && pending.phone === normalizePhone(phone);
  } catch {
    return false;
  }
}

export function registerLocalMember(payload) {
  if (!payload.name?.trim()) {
    throw new Error("이름을 입력해 주세요.");
  }
  if (!payload.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim())) {
    throw new Error("올바른 이메일을 입력해 주세요.");
  }
  if (!isPhoneVerified(payload.phone)) {
    throw new Error("전화번호 인증을 완료해 주세요.");
  }

  const member = {
    type: "local",
    connectedAt: Date.now(),
    profile: {
      name: payload.name.trim(),
      email: payload.email.trim(),
      phoneNumber: payload.phone.trim(),
      gender: payload.gender || null,
      ageGroup: payload.ageGroup || null,
      academicLevel: payload.academicLevel || null,
      preferredSubjects: payload.preferredSubjects || [],
      level: payload.level || null,
      learningGoal: payload.learningGoal || null,
      profileImage: null,
    },
  };

  window.localStorage.setItem(MEMBER_KEY, JSON.stringify(member));
  window.sessionStorage.removeItem(PHONE_CODE_KEY);
  emitAuthChange();
  return member;
}

export { AUTH_EVENT as LOCAL_AUTH_EVENT, DEV_PHONE_CODE };
