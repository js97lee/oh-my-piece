import { createServerClient } from "@supabase/ssr";
import { createRequestClient } from "./supabase.js";
import { safeReturnTo, signupProfile, validateCredentials } from "../shared/auth.js";

class ApiError extends Error {
  constructor(status, message, code = "auth_error") { super(message); Object.assign(this, { status, code }); }
}

function reply(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

function redirect(res, path) {
  res.statusCode = 303;
  res.setHeader("Location", path);
  res.end();
}

async function readBody(req) {
  if (!/^application\/json(?:;|$)/i.test(req.headers["content-type"] || "")) throw new ApiError(415, "JSON 요청이 필요합니다.");
  if (Number(req.headers["content-length"]) > 16384) throw new ApiError(413, "입력 내용이 너무 큽니다.");
  let value;
  if (req.body !== undefined) value = req.body;
  else {
    let raw = "";
    for await (const part of req) {
      raw += part;
      if (Buffer.byteLength(raw) > 16384) throw new ApiError(413, "입력 내용이 너무 큽니다.");
    }
    value = raw;
  }
  try {
    if (Buffer.isBuffer(value)) value = value.toString();
    if (typeof value === "string") value = JSON.parse(value);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    if (Buffer.byteLength(JSON.stringify(value)) > 16384) throw new ApiError(413, "입력 내용이 너무 큽니다.");
    return value;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "입력 형식을 확인해 주세요.");
  }
}

function authError(error) {
  if (!error) return;
  const messages = {
    invalid_credentials: "이메일 또는 비밀번호가 올바르지 않습니다.",
    email_not_confirmed: "가입한 이메일의 인증 링크를 먼저 눌러 주세요.",
    user_already_exists: "가입 정보를 확인하거나 로그인해 주세요.",
    weak_password: "더 안전한 비밀번호를 입력해 주세요.",
    signup_disabled: "현재 회원가입을 이용할 수 없습니다.",
    email_address_invalid: "올바른 이메일을 입력해 주세요.",
    email_address_not_authorized: "현재 이 이메일로 인증 메일을 보낼 수 없습니다. 고객센터에 문의해 주세요.",
    over_email_send_rate_limit: "이메일 발송 요청이 많습니다. 잠시 후 다시 시도해 주세요.",
    over_request_rate_limit: "요청이 많습니다. 잠시 후 다시 시도해 주세요.",
  };
  const message = messages[error.code] || (error.status === 429 ? messages.over_request_rate_limit : "인증 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  throw new ApiError(error.status === 429 ? 429 : error.status >= 500 || !error.status ? 503 : 400, message, error.code || "auth_unavailable");
}

export function publicUser(user) {
  if (!user) return null;
  const m = user.user_metadata || {};
  const text = (value) => typeof value === "string" ? value.slice(0, 500) : null;
  return {
    id: user.id, email: user.email, createdAt: user.created_at,
    provider: user.app_metadata?.provider || "email", emailConfirmed: Boolean(user.email_confirmed_at),
    profile: {
      name: text(m.name || m.full_name || m.user_name) || "오마이피스 회원",
      email: user.email, phoneNumber: text(m.phoneNumber || user.phone),
      gender: text(m.gender), ageGroup: text(m.ageGroup), academicLevel: text(m.academicLevel),
      preferredSubjects: Array.isArray(m.preferredSubjects) ? m.preferredSubjects.filter((v) => ["english", "math"].includes(v)) : [],
      level: text(m.level), learningGoal: text(m.learningGoal),
      profileImage: typeof m.avatar_url === "string" && m.avatar_url.startsWith("https://") ? m.avatar_url : null,
    },
  };
}

export function createAuthHandler({ getEnv = () => process.env, clientFactory = createServerClient, fetchImpl = fetch } = {}) {
  let providerCache;
  return async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const url = new URL(req.url, "http://internal");
    const action = url.pathname.replace(/^\/api\/auth\//, "");
    try {
      const methods = { session: "GET", providers: "GET", callback: "GET", signup: "POST", login: "POST", logout: "POST", resend: "POST", kakao: "POST" };
      if (!methods[action]) throw new ApiError(404, "요청을 찾을 수 없습니다.");
      if (req.method !== methods[action]) { res.setHeader("Allow", methods[action]); throw new ApiError(405, "허용되지 않은 요청 방식입니다."); }
      const env = getEnv();
      if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY || !env.APP_BASE_URL) throw new ApiError(503, "인증 서비스 설정을 확인해 주세요.", "auth_not_configured");
      const base = new URL(env.APP_BASE_URL);
      if (base.protocol !== "https:" && !(base.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname))) throw new ApiError(503, "서비스 주소 설정을 확인해 주세요.");
      if (req.method === "POST" && (req.headers.origin !== base.origin || req.headers["sec-fetch-site"] === "cross-site")) throw new ApiError(403, "서비스 페이지에서 다시 시도해 주세요.", "invalid_origin");
      const client = createRequestClient(req, res, env, clientFactory);
      const providers = async () => {
        if (providerCache?.until > Date.now()) return providerCache.value;
        const response = await fetchImpl(`${env.SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY }, signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new ApiError(503, "로그인 서비스에 연결하지 못했습니다.");
        const settings = await response.json();
        const value = { kakao: settings.external?.kakao === true };
        providerCache = { value, until: Date.now() + 60000 };
        return value;
      };
      if (action === "providers") return reply(res, 200, await providers());
      if (action === "session") {
        const { data, error } = await client.auth.getUser();
        if (error && !["session_not_found", "refresh_token_not_found", "refresh_token_already_used", "bad_jwt", "user_not_found"].includes(error.code) && error.name !== "AuthSessionMissingError") authError(error);
        return reply(res, 200, { user: error ? null : publicUser(data.user) });
      }
      if (action === "callback") {
        const code = url.searchParams.get("code");
        if (!code || code.length > 4096 || url.searchParams.has("error")) return redirect(res, "/login?authError=callback");
        const flowId = url.searchParams.get("sb_flow_id");
        const { error } = await client.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
        if (error) return redirect(res, "/login?authError=callback");
        return redirect(res, safeReturnTo(url.searchParams.get("returnTo"), "/account"));
      }
      const input = await readBody(req);
      const returnTo = safeReturnTo(input.returnTo, "/account");
      const callback = `${base.origin}/api/auth/callback?returnTo=${encodeURIComponent(returnTo)}`;
      if (action === "logout") {
        const { error } = await client.auth.signOut({ scope: "local" });
        if (error?.name !== "AuthSessionMissingError") authError(error);
        return reply(res, 200, { user: null });
      }
      if (action === "kakao") {
        if (!(await providers()).kakao) throw new ApiError(409, "카카오 로그인을 준비 중입니다. 이메일로 로그인해 주세요.");
        const { data, error } = await client.auth.signInWithOAuth({ provider: "kakao", options: { redirectTo: callback, skipBrowserRedirect: true } });
        authError(error);
        return reply(res, 200, { url: data.url });
      }
      let credentials;
      try {
        credentials = validateCredentials(action === "resend" ? { ...input, password: "unused" } : input, action === "signup");
      } catch (error) { throw new ApiError(400, error.message, "invalid_input"); }
      if (action === "resend") {
        const { error } = await client.auth.resend({ type: "signup", email: credentials.email, options: { emailRedirectTo: callback } });
        authError(error);
        return reply(res, 200, { message: "인증이 필요한 계정이라면 메일이 발송됩니다. 받은편지함과 스팸함을 확인해 주세요." });
      }
      let result;
      if (action === "signup") {
        let profile;
        try { profile = signupProfile(input); } catch (error) { throw new ApiError(400, error.message, "invalid_input"); }
        result = await client.auth.signUp({ ...credentials, options: { data: profile, emailRedirectTo: callback } });
      } else result = await client.auth.signInWithPassword(credentials);
      authError(result.error);
      return reply(res, 200, { user: result.data.session ? publicUser(result.data.user) : null, needsEmailConfirmation: !result.data.session });
    } catch (error) {
      if (action === "callback") return redirect(res, "/login?authError=callback");
      return reply(res, error instanceof ApiError ? error.status : 503, { error: error instanceof ApiError ? error.message : "인증 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.", code: error instanceof ApiError ? error.code : "auth_unavailable" });
    }
  };
}
