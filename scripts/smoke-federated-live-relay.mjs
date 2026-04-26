#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const result = spawnSync(
  "pnpm",
  [
    "--filter",
    "@entangle/host",
    "exec",
    "tsx",
    "scripts/federated-live-relay-smoke.ts",
    ...process.argv.slice(2)
  ],
  {
    encoding: "utf8",
    stdio: "inherit"
  }
);

process.exit(result.status ?? 1);
