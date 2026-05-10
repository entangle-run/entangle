#!/usr/bin/env node

import { runPnpmSync } from "./pnpm-runner.mjs";

const result = runPnpmSync(
  [
    "--filter",
    "@entangle/host",
    "exec",
    "tsx",
    "scripts/federated-process-runner-smoke.ts",
    ...process.argv.slice(2)
  ],
  {
    encoding: "utf8",
    stdio: "inherit"
  }
);

process.exit(result.status ?? 1);
