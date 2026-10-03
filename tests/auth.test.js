import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { createAuthHandler } from "../server/auth.js";
import { safeReturnTo } from "../shared/auth.js";
import { authRequest } from "../src/services/auth.js";

const env = { APP_BASE_URL: "https://example.test", SUPABASE_URL: "https://project.supabase.co", SUPABASE_PUBLISHABLE_KEY: "public-key" };
const valid = { name: "테스트 회원", phone: "010-0000-0000", email: "USER@example.com", password: "password123!", passwordConfirm: "password123!", preferredSubjects: ["math"], level: "basic" };
const user = { id: "user-1", email: "user@example.com", email_confirmed_at: "2026-01-01", user_metadata: { name: "테스트 회원", password: "must-not-leak" }, app_metadata: { provider: "email", role: "private" } };

test("잘못 배포된 API의 HTML 응답이나 빈 JSON을 로그인 성공으로 처리하지 않는다", async (t) => {
  const mock = t.mock.method(globalThis, "fetch", async () => new Response("<html>SPA fallback</html>"));
  await assert.rejects(authRequest("login", valid), /인증 서버의 응답/);
  mock.mock.mockImplementation(async () => new Response("{}"));
  await assert.rejects(authRequest("session"), /로그인 상태/);
});

test("브라우저 요청 실패는 재시도 안내를 표시하며 인증 오류 코드를 유지한다", async (t) => {
  const mock = t.mock.method(globalThis, "fetch", async () => { throw new TypeError("Failed to fetch"); });
  await assert.rejects(authRequest("session"), /인터넷 연결/);
  mock.mock.mockImplementation(async () => new Response(JSON.stringify({ error: "이메일 인증 필요", code: "email_not_confirmed" }), { status: 400 }));
  await assert.rejects(authRequest("login", valid), { message: "이메일 인증 필요", code: "email_not_confirmed" });
});

async function setup(t, overrides = {}, options = {}) {
  const calls = [];
  let cookieOptions;
  const auth = {
    getUser: async () => ({ data: { user }, error: null }),
    signUp: async () => ({ data: { user, session: null }, error: null }),
    signInWithPassword: async () => {
      cookieOptions.cookies.setAll([{ name: "sb-auth", value: "secret-session", options: { maxAge: 100 } }]);
      return { data: { user, session: { access_token: "never-return" } }, error: null };
    },
    signOut: async () => ({ error: null }),
    resend: async () => ({ error: null }),
    exchangeCodeForSession: async () => ({ error: null }),
    signInWithOAuth: async () => ({ data: { url: "https://project.supabase.co/auth/v1/authorize" }, error: null }),
    ...overrides,
  };
  const handler = createAuthHandler({ getEnv: () => options.env || env,
    clientFactory: (url, key, config) => {
      assert.equal(key, "public-key");
      cookieOptions = config;
      return { auth: Object.fromEntries(Object.entries(auth).map(([name, fn]) => [name, async (...args) => { calls.push({ name, args }); return fn(...args); }])) };
    },
    fetchImpl: async () => new Response(JSON.stringify({ external: { kakao: Boolean(options.kakao) } })),
  });
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const request = async (action, body, extras = {}) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/${action}`, {
      method: body === undefined ? "GET" : "POST", redirect: "manual",
      headers: { Origin: env.APP_BASE_URL, "Content-Type": "application/json", ...extras.headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      ...extras.options,
    });
    const raw = await response.text();
    return { status: response.status, headers: response.headers, data: raw ? JSON.parse(raw) : null };
  };
  return { request, calls };
}

test("회원가입은 이메일 확인 전 세션을 만들지 않고 프로필만 저장한다", async (t) => {
  const { request, calls } = await setup(t);
  const r = await request("signup", { ...valid, role: "admin", returnTo: "/account" });
  assert.equal(r.status, 200);
  assert.deepEqual(r.data, { user: null, needsEmailConfirmation: true });
  const payload = calls[0].args[0];
  assert.equal(payload.email, "user@example.com");
  assert.equal(payload.options.data.phoneNumber, "01000000000");
  assert.equal(payload.options.data.level, "basic");
  assert.equal(payload.options.data.role, undefined);
  assert.equal(payload.options.data.password, undefined);
  assert.match(payload.options.emailRedirectTo, /^https:\/\/example.test\/api\/auth\/callback\?/);
});

test("이메일, 비밀번호, 확인, 전화번호, 프로필 오류는 가입 전에 거절한다", async (t) => {
  const { request, calls } = await setup(t);
  for (const patch of [{ email: "invalid" }, { password: "short" }, { passwordConfirm: "wrong" }, { name: " " }, { phone: "123" }, { preferredSubjects: "math" }, { level: "root" }]) {
    assert.equal((await request("signup", { ...valid, ...patch })).status, 400);
  }
  assert.equal(calls.length, 0);
});

test("로그인은 HttpOnly/Secure 쿠키를 설정하고 토큰을 JSON에 노출하지 않는다", async (t) => {
  const { request } = await setup(t);
  const r = await request("login", valid);
  assert.equal(r.status, 200);
  assert.equal(r.data.user.id, user.id);
  for (const flag of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/"]) assert.ok(r.headers.get("set-cookie").includes(flag));
  assert.match(r.headers.get("cache-control"), /no-store/);
  assert.equal(JSON.stringify(r.data).includes("never-return"), false);
  assert.equal(JSON.stringify(r.data).includes("must-not-leak"), false);
});

test("세션 조회는 서버 getUser로 검증하며 허용한 사용자 정보만 반환한다", async (t) => {
  const { request, calls } = await setup(t);
  const r = await request("session");
  assert.equal(calls[0].name, "getUser");
  assert.equal(r.data.user.id, user.id);
  assert.equal(r.data.user.app_metadata, undefined);
});

test("쿠키가 없거나 세션이 만료된 경우 비회원으로 응답한다", async (t) => {
  for (const error of [{ name: "AuthSessionMissingError" }, { code: "refresh_token_not_found" }, { code: "bad_jwt" }]) {
    const { request } = await setup(t, { getUser: async () => ({ error }) });
    assert.deepEqual((await request("session")).data, { user: null });
  }
});

test("인증 서버 장애를 로그아웃으로 오인하지 않는다", async (t) => {
  const { request } = await setup(t, { getUser: async () => ({ error: { status: 503, message: "secret diagnostic" } }) });
  const r = await request("session");
  assert.equal(r.status, 503);
  assert.equal(JSON.stringify(r.data).includes("secret diagnostic"), false);
});

test("로그인 오류와 인증 미완료를 구분한다", async (t) => {
  for (const code of ["invalid_credentials", "email_not_confirmed", "over_request_rate_limit"]) {
    const { request } = await setup(t, { signInWithPassword: async () => ({ error: { status: code.startsWith("over") ? 429 : 400, code } }) });
    const r = await request("login", valid);
    assert.equal(r.data.code, code);
    assert.equal(r.status, code.startsWith("over") ? 429 : 400);
  }
});

test("다른 출처 및 Origin 없는 변경 요청은 로그인 호출 전에 차단한다", async (t) => {
  const { request, calls } = await setup(t);
  for (const origin of ["https://evil.test", "null", ""]) assert.equal((await request("login", valid, { headers: { Origin: origin } })).status, 403);
  assert.equal((await request("login", valid, { headers: { "Sec-Fetch-Site": "cross-site" } })).status, 403);
  assert.equal(calls.length, 0);
});

test("잘못된 메서드, 미설정 환경, 큰 본문을 거절한다", async (t) => {
  const { request } = await setup(t);
  assert.equal((await request("logout")).status, 405);
  assert.equal((await request("unknown")).status, 404);
  assert.equal((await request("login", valid, { headers: { "Content-Type": "text/plain" } })).status, 415);
  assert.equal((await request("login", { ...valid, extra: "x".repeat(17000) })).status, 413);
  const missing = await setup(t, {}, { env: { ...env, SUPABASE_PUBLISHABLE_KEY: "" } });
  assert.equal((await missing.request("session")).status, 503);
});

test("콜백은 PKCE flow ID를 전달하고 안전한 내부 경로로 복귀한다", async (t) => {
  const { request, calls } = await setup(t);
  const r = await request("callback?code=one-time-code&sb_flow_id=abcdefgh&returnTo=%2Faccount");
  assert.equal(r.status, 303);
  assert.equal(r.headers.get("location"), "/account");
  assert.deepEqual(calls[0].args, ["one-time-code", { flowId: "abcdefgh" }]);
  const unsafe = await request("callback?code=one-time-code&returnTo=%2F%2Fevil.test");
  assert.equal(unsafe.headers.get("location"), "/account");
});

test("만료 또는 취소된 콜백은 토큰 노출 없이 로그인 안내로 돌아간다", async (t) => {
  const { request } = await setup(t, { exchangeCodeForSession: async () => ({ error: { code: "expired" } }) });
  for (const query of ["?code=expired", "?error=denied", ""]) assert.equal((await request(`callback${query}`)).headers.get("location"), "/login?authError=callback");
});

test("외부 URL, 역슬래시, 인코딩 우회 및 API 경로를 복귀 주소로 허용하지 않는다", () => {
  for (const value of ["https://evil.test", "//evil.test", "/\\evil.test", "/%5cevil.test", "/%2fevil.test", "/\nevil.test", "/api/auth/logout", "/login", "/mypage", null]) assert.equal(safeReturnTo(value), "/");
  assert.equal(safeReturnTo("/contents/math/purchase?coupon=1#pay"), "/contents/math/purchase?coupon=1#pay");
});

test("로그아웃은 현재 세션만 해제한다", async (t) => {
  const { request, calls } = await setup(t);
  assert.deepEqual((await request("logout", {})).data, { user: null });
  assert.deepEqual(calls[0].args, [{ scope: "local" }]);
});

test("인증 메일 재발송은 안전한 콜백을 지정한다", async (t) => {
  const { request, calls } = await setup(t);
  assert.equal((await request("resend", { email: valid.email, returnTo: "//evil.test" })).status, 200);
  assert.equal(calls[0].args[0].type, "signup");
  assert.equal(new URL(calls[0].args[0].options.emailRedirectTo).searchParams.get("returnTo"), "/account");
});

test("비활성 카카오 로그인은 외부 인증을 시작하지 않는다", async (t) => {
  const { request, calls } = await setup(t);
  assert.deepEqual((await request("providers")).data, { kakao: false });
  assert.equal((await request("kakao", {})).status, 409);
  assert.equal(calls.length, 0);
});

test("활성 카카오 로그인은 Supabase PKCE 흐름으로 연결한다", async (t) => {
  const { request, calls } = await setup(t, {}, { kakao: true });
  assert.equal((await request("kakao", { returnTo: "/account" })).status, 200);
  assert.equal(calls[0].args[0].provider, "kakao");
  assert.equal(calls[0].args[0].options.skipBrowserRedirect, true);
});

test("실제 SDK로 가입 PKCE 쿠키를 저장하고 콜백에서 세션 쿠키로 교환한다", async (t) => {
  const { createServerClient, parseCookieHeader } = await import("@supabase/ssr");
  const { createHash } = await import("node:crypto");
  let signupRequest;
  let redirectTo;
  const payload = { sub: user.id, aud: "authenticated", role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 };
  const accessToken = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url")}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.test-signature`;
  const sdkFetch = async (url, init) => {
    const target = new URL(url);
    let response;
    if (target.pathname.endsWith("/signup")) {
      signupRequest = JSON.parse(init.body);
      redirectTo = new URL(target.searchParams.get("redirect_to"));
      response = user;
    } else if (target.pathname.endsWith("/token")) {
      const body = JSON.parse(init.body);
      assert.equal(body.auth_code, "fixture-code");
      assert.equal(createHash("sha256").update(body.code_verifier).digest("base64url"), signupRequest.code_challenge);
      response = { access_token: accessToken, refresh_token: "fixture-refresh", token_type: "bearer", expires_in: 3600, user };
    } else if (target.pathname.endsWith("/user")) response = user;
    else throw new Error(`예상하지 못한 인증 경로: ${target.pathname}`);
    return new Response(JSON.stringify(response), { headers: { "Content-Type": "application/json" } });
  };
  const handler = createAuthHandler({ getEnv: () => env, clientFactory: (url, key, options) => createServerClient(url, key, { ...options, global: { fetch: sdkFetch } }) });
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const signup = await fetch(`${origin}/api/auth/signup`, { method: "POST", headers: { Origin: env.APP_BASE_URL, "Content-Type": "application/json" }, body: JSON.stringify(valid) });
  assert.equal(signup.status, 200);
  assert.equal((await signup.json()).needsEmailConfirmation, true);
  assert.ok(signupRequest.code_challenge);
  const cookies = signup.headers.getSetCookie().map((value) => parseCookieHeader(value.split(";")[0])[0]);
  assert.ok(cookies.some(({ name }) => name.includes("code-verifier")));
  for (const value of signup.headers.getSetCookie()) assert.ok(value.includes("HttpOnly"));
  redirectTo.searchParams.set("code", "fixture-code");
  const callback = await fetch(origin + redirectTo.pathname + redirectTo.search, { redirect: "manual", headers: { Cookie: cookies.map(({ name, value }) => `${name}=${encodeURIComponent(value)}`).join("; ") } });
  assert.equal(callback.status, 303);
  assert.equal(callback.headers.get("location"), "/account");
  assert.ok(callback.headers.getSetCookie().some((value) => value.includes("auth-token=") && !value.includes("Max-Age=0")));
});
