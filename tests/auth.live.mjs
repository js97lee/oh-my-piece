// Explicit opt-in integration check. Creates and deletes exactly one disposable account; sends no email.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { loadEnv } from "vite";
import { createClient } from "@supabase/supabase-js";
import { parseCookieHeader } from "@supabase/ssr";
import { createAuthHandler } from "../server/auth.js";

const env = { ...loadEnv("development", process.cwd(), ""), ...process.env };
if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY || !env.SUPABASE_PUBLISHABLE_KEY) throw new Error("Supabase 서버 환경변수가 필요합니다.");
const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const email = `auth-smoke-${randomBytes(12).toString("hex")}@example.invalid`;
const password = `T3st!${randomBytes(24).toString("hex")}`;
const jar = new Map();
let createdId;
const server = createServer(createAuthHandler({ getEnv: () => env }));

async function request(action, body) {
  const response = await fetch(`${env.APP_BASE_URL}/api/auth/${action}`, {
    method: body === undefined ? "GET" : "POST", redirect: "manual",
    headers: { Origin: env.APP_BASE_URL, "Content-Type": "application/json", Cookie: [...jar].map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("; ") },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  for (const cookie of response.headers.getSetCookie()) {
    assert.ok(cookie.includes("HttpOnly") && cookie.includes("SameSite=Lax"));
    const [{ name, value }] = parseCookieHeader(cookie.split(";")[0]);
    if (/Max-Age=0/i.test(cookie)) jar.delete(name); else jar.set(name, value);
  }
  const data = await response.json();
  return { status: response.status, data };
}

try {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  env.APP_BASE_URL = `http://127.0.0.1:${server.address().port}`;
  const result = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: "인증 연동 검증", phoneNumber: "01000000000", preferredSubjects: ["math"] } });
  if (result.error) throw new Error(`임시 계정 생성 실패: ${result.error.code || result.error.status}`);
  createdId = result.data.user.id;
  assert.equal((await request("session")).data.user, null);
  assert.equal((await request("login", { email, password: "wrong-password" })).status, 400);
  const login = await request("login", { email, password });
  assert.equal(login.status, 200, "실제 비밀번호 로그인 실패");
  assert.equal(login.data.user.id, createdId);
  assert.equal(login.data.user.profile.name, "인증 연동 검증");
  assert.equal(JSON.stringify(login.data).includes("access_token"), false);
  assert.ok(jar.size > 0, "세션 쿠키 없음");
  assert.equal((await request("session")).data.user.id, createdId, "쿠키 세션 복원 실패");

  // Exercise refresh using an expired local timestamp; only real Supabase tokens may refresh.
  const names = [...jar.keys()].filter((name) => /-auth-token(?:\.\d+)?$/.test(name)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const stored = names.map((name) => jar.get(name)).join("");
  assert.ok(stored.startsWith("base64-"));
  const session = JSON.parse(Buffer.from(stored.slice(7), "base64url").toString());
  session.expires_at = 1;
  session.user.user_metadata.name = "forged-local-name";
  const changed = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
  const root = names[0].replace(/\.\d+$/, "");
  for (const name of names) jar.delete(name);
  jar.set(root, changed);
  const refreshed = await request("session");
  assert.equal(refreshed.status, 200, "만료 세션 갱신 실패");
  assert.equal(refreshed.data.user.id, createdId);
  assert.equal(refreshed.data.user.profile.name, "인증 연동 검증", "쿠키의 위조 프로필을 신뢰하면 안 됨");
  assert.equal((await request("logout", {})).status, 200);
  assert.equal((await request("session")).data.user, null);
  console.log("실제 Supabase: 로그인 오류, 로그인 성공, 세션 복원, 만료 갱신, 프로필 검증, 로그아웃 통과");
} finally {
  await new Promise((resolve) => server.close(resolve));
  if (createdId) {
    const { error } = await admin.auth.admin.deleteUser(createdId);
    if (error) throw new Error(`임시 계정 정리 실패: ${createdId}`);
    console.log("검증용 계정 삭제 완료 (메일 발송 없음)");
  }
}
