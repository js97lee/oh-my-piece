export function safeReturnTo(value, fallback = "/") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return fallback;
  // Reject encoded separators too: routers and proxies may decode paths differently.
  if (/[\\\x00-\x20]/.test(value) || /%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|20)/i.test(value)) return fallback;
  if (/^\/(?:api|login|signup|mypage)(?:\/|\?|#|$)/.test(value)) return fallback;
  return value;
}

export function validateCredentials(input, signup = false) {
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("올바른 이메일을 입력해 주세요.");
  if (!password || password.length > 128) throw new Error("비밀번호를 128자 이내로 입력해 주세요.");
  if (signup && password.length < 8) throw new Error("비밀번호는 8자 이상 입력해 주세요.");
  if (signup && password !== input.passwordConfirm) throw new Error("비밀번호 확인이 일치하지 않습니다.");
  return { email, password };
}

export function signupProfile(input) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const phoneNumber = typeof input.phone === "string" ? input.phone.replace(/[\s()-]/g, "") : "";
  if (!name || name.length > 80) throw new Error("이름을 80자 이내로 입력해 주세요.");
  if (!/^\+?\d{10,15}$/.test(phoneNumber)) throw new Error("올바른 전화번호를 입력해 주세요.");
  const choices = {
    gender: ["male", "female"], ageGroup: ["under10", "10s", "20s", "30s", "40s", "50plus"],
    academicLevel: ["elementary", "middle", "high", "adult", "other"],
    level: ["basic", "middle", "high"], learningGoal: ["review", "habit", "exam", "basics"],
  };
  const profile = { name, phoneNumber };
  for (const [key, values] of Object.entries(choices)) {
    if (input[key] && !values.includes(input[key])) throw new Error("선택 정보를 다시 확인해 주세요.");
    profile[key] = input[key] || null;
  }
  if (input.preferredSubjects != null && (!Array.isArray(input.preferredSubjects) || input.preferredSubjects.some((v) => !["english", "math"].includes(v)))) {
    throw new Error("선호과목을 다시 확인해 주세요.");
  }
  profile.preferredSubjects = [...new Set(input.preferredSubjects || [])];
  return profile;
}
