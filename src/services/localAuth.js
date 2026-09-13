const MEMBER_KEY = "oh_my_piece_local_member";
const ACCOUNTS_KEY = "oh_my_piece_local_accounts";
const PHONE_CODE_KEY = "oh_my_piece_phone_code";
const AUTH_EVENT = "oh-my-piece-auth-change";
const DEV_PHONE_CODE = "000000";

function emitAuthChange() {
  window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: isLocalAuthenticated() }));
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function getAccounts() {
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAccounts(accounts) {
  window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function toSessionMember(account) {
  return {
    type: "local",
    connectedAt: Date.now(),
    profile: {
      name: account.name,
      email: account.email,
      phoneNumber: account.phoneNumber,
      gender: account.gender || null,
      ageGroup: account.ageGroup || null,
      academicLevel: account.academicLevel || null,
      preferredSubjects: account.preferredSubjects || [],
      level: account.level || null,
      learningGoal: account.learningGoal || null,
      profileImage: account.profileImage || null,
    },
  };
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
  if (!payload.password || String(payload.password).length < 6) {
    throw new Error("비밀번호는 6자 이상 입력해 주세요.");
  }
  if (payload.password !== payload.passwordConfirm) {
    throw new Error("비밀번호 확인이 일치하지 않습니다.");
  }
  if (!isPhoneVerified(payload.phone)) {
    throw new Error("전화번호 인증을 완료해 주세요.");
  }

  const email = payload.email.trim().toLowerCase();
  const accounts = getAccounts();
  if (accounts.some((account) => account.email === email)) {
    throw new Error("이미 가입된 이메일입니다. 로그인해 주세요.");
  }

  const account = {
    id: window.crypto.randomUUID(),
    name: payload.name.trim(),
    email,
    password: String(payload.password),
    phoneNumber: payload.phone.trim(),
    gender: payload.gender || null,
    ageGroup: payload.ageGroup || null,
    academicLevel: payload.academicLevel || null,
    preferredSubjects: payload.preferredSubjects || [],
    level: payload.level || null,
    learningGoal: payload.learningGoal || null,
    profileImage: null,
    createdAt: Date.now(),
  };

  saveAccounts([...accounts, account]);

  const member = toSessionMember(account);
  window.localStorage.setItem(MEMBER_KEY, JSON.stringify(member));
  window.sessionStorage.removeItem(PHONE_CODE_KEY);
  emitAuthChange();
  return member;
}

export function loginLocalMember({ email, password }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedPassword = String(password || "");

  if (!normalizedEmail) {
    throw new Error("아이디(이메일)를 입력해 주세요.");
  }
  if (!normalizedPassword) {
    throw new Error("비밀번호를 입력해 주세요.");
  }

  const account = getAccounts().find((item) => item.email === normalizedEmail);
  if (!account || account.password !== normalizedPassword) {
    throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
  }

  const member = toSessionMember(account);
  window.localStorage.setItem(MEMBER_KEY, JSON.stringify(member));
  emitAuthChange();
  return member;
}

export { AUTH_EVENT as LOCAL_AUTH_EVENT, DEV_PHONE_CODE };
