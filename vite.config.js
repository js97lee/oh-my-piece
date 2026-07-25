import { defineConfig } from "vite";
import { kakaoLocalApiPlugin } from "./vite.kakao-api.js";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  plugins: [kakaoLocalApiPlugin()],
});
