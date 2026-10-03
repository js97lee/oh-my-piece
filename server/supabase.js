import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";

export function createRequestClient(req, res, env, clientFactory = createServerClient) {
  const secure = new URL(env.APP_BASE_URL).protocol === "https:";
  const cookies = new Map(parseCookieHeader(req.headers.cookie || "").map(({ name, value }) => [name, value]));
  const outgoing = new Map();
  return clientFactory(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: { path: "/", httpOnly: true, sameSite: "lax", secure },
    cookies: {
      getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
      setAll: (changes) => {
        for (const { name, value, options } of changes) {
          cookies.set(name, value);
          outgoing.set(name, serializeCookieHeader(name, value, { ...options, path: "/", httpOnly: true, sameSite: "lax", secure }));
        }
        res.setHeader("Set-Cookie", [...outgoing.values()]);
      },
    },
  });
}
