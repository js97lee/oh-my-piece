import { defineConfig } from "vite";
import { paymentsLocalApiPlugin } from "./vite.payments-api.js";
import { authLocalApiPlugin } from "./vite.auth-api.js";
import { alimtalkLocalApiPlugin } from "./vite.alimtalk-api.js";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  plugins: [authLocalApiPlugin(), paymentsLocalApiPlugin(), alimtalkLocalApiPlugin()],
});
