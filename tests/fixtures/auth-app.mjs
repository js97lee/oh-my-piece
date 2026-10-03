// Local browser QA only. No real Supabase requests or email delivery.
import { createServer } from "vite";
import { createAuthHandler } from "../../server/auth.js";

const port = 53961;
const user = { id: "fixture-member", email: "fixture@example.invalid", email_confirmed_at: "2026-01-01", user_metadata: { name: "화면 검증 회원" } };
const handler = createAuthHandler({
  getEnv: () => ({ APP_BASE_URL: `http://localhost:${port}`, SUPABASE_URL: "https://fixture.invalid", SUPABASE_PUBLISHABLE_KEY: "fixture-key" }),
  fetchImpl: async () => new Response(JSON.stringify({ external: { kakao: false } })),
  clientFactory: (_url, _key, options) => ({ auth: {
    getUser: async () => options.cookies.getAll().some((c) => c.name === "qa-auth" && c.value === "yes") ? { data: { user } } : { error: { name: "AuthSessionMissingError" } },
    signUp: async () => ({ data: { user, session: null } }),
    resend: async () => ({ error: null }),
    signInWithPassword: async ({ email, password }) => {
      if (email === "unconfirmed@example.invalid") return { error: { code: "email_not_confirmed", status: 400 } };
      if (password !== "fixture-password") return { error: { code: "invalid_credentials", status: 400 } };
      options.cookies.setAll([{ name: "qa-auth", value: "yes", options: { maxAge: 3600 } }]);
      return { data: { user, session: {} } };
    },
    signOut: async () => {
      options.cookies.setAll([{ name: "qa-auth", value: "", options: { maxAge: 0 } }]);
      return { error: null };
    },
    exchangeCodeForSession: async () => ({ error: { code: "expired" } }),
  } }),
});
const server = await createServer({ configFile: false, root: new URL("../..", import.meta.url).pathname, esbuild: { jsx: "automatic" }, server: { host: "localhost", port, strictPort: true },
  plugins: [{ name: "auth-browser-fixture", configureServer: (s) => { s.middlewares.use((req, res, next) => req.url.startsWith("/api/auth/") ? handler(req, res) : next()); } }],
});
await server.listen();
console.log(`메일을 발송하지 않는 인증 화면 검증 서버: http://localhost:${port}`);
