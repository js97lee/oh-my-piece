import { loadEnv } from "vite";
import { createAuthHandler } from "./server/auth.js";

export function authLocalApiPlugin() {
  function configure(server) {
    const env = { ...loadEnv(server.config.mode, server.config.root, ""), ...process.env };
    const handler = createAuthHandler({ getEnv: () => env });
    server.middlewares.use((req, res, next) => req.url?.startsWith("/api/auth/") ? handler(req, res) : next());
  }
  return { name: "auth-local-api", configureServer: configure, configurePreviewServer: configure };
}
