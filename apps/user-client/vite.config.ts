import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const runtimeProxyTarget =
  process.env.ENTANGLE_USER_CLIENT_RUNTIME_URL?.trim();

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@entangle/types": path.resolve(
        projectRoot,
        "../../packages/types/src/index.ts"
      )
    }
  },
  server: {
    host: "0.0.0.0",
    port: 3001,
    ...(runtimeProxyTarget
      ? {
          proxy: {
            "/api": runtimeProxyTarget,
            "/artifacts": runtimeProxyTarget,
            "/health": runtimeProxyTarget,
            "/source-change-candidates": runtimeProxyTarget
          }
        }
      : {})
  }
});
