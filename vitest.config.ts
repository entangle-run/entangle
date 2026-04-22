import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const repoRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: process.cwd(),
  resolve: {
    alias: {
      "@entangle/agent-engine": path.join(
        repoRoot,
        "packages/agent-engine/src/index.ts"
      ),
      "@entangle/host-client": path.join(
        repoRoot,
        "packages/host-client/src/index.ts"
      ),
      "@entangle/package-scaffold": path.join(
        repoRoot,
        "packages/package-scaffold/src/index.ts"
      ),
      "@entangle/types": path.join(repoRoot, "packages/types/src/index.ts"),
      "@entangle/validator": path.join(
        repoRoot,
        "packages/validator/src/index.ts"
      )
    }
  },
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"]
    },
    environment: "node",
    include: ["src/**/*.test.ts"]
  }
});
