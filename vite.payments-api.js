import { loadEnv } from "vite";
import { createPaymentsHandler } from "./server/payments.js";
export function paymentsLocalApiPlugin() {
  function configure(server) {
    const env = { ...loadEnv(server.config.mode, server.config.root, ""), ...process.env };
    const handler = createPaymentsHandler({ getEnv: () => env });
    server.middlewares.use((req, res, next) => req.url?.startsWith("/api/payments/") ? handler(req, res) : next());
  }
  return { name: "payments-local-api", configureServer: configure, configurePreviewServer: configure };
}
