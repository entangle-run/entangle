import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@entangle/host-client": path.resolve(
        projectRoot,
        "../../packages/host-client/src/index.ts"
      ),
      "@entangle/types": path.resolve(
        projectRoot,
        "../../packages/types/src/index.ts"
      )
    }
  },
  server: {
    host: "0.0.0.0",
    port: 3000
  }
});
