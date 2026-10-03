import { loadEnv } from "vite";
import { createAlimtalkHandler } from "./server/alimtalk.js";

export function alimtalkLocalApiPlugin() {
  function configure(server) {
    const env = { ...loadEnv(server.config.mode, server.config.root, ""), ...process.env };
    const handler = createAlimtalkHandler({ getEnv: () => env });
    server.middlewares.use((req, res, next) => {
      if (!req.url?.startsWith("/api/alimtalk/")) return next();
      return handler(req, res);
    });
  }
  return { name: "alimtalk-local-api", configureServer: configure, configurePreviewServer: configure };
}
