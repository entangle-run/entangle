#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const node = process.execPath;

function runStep(label, args, options = {}) {
  console.log(`\n[demo-tools] ${label}`);
  const result = spawnSync(node, args, {
    cwd: repoRoot,
    encoding: "utf8"
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? "unknown"}.`);
  }

  const requiredFragments = Array.isArray(options.mustContain)
    ? options.mustContain
    : options.mustContain
      ? [options.mustContain]
      : [];

  for (const fragment of requiredFragments) {
    if (!result.stdout.includes(fragment)) {
      throw new Error(`${label} output did not include '${fragment}'.`);
    }
  }
}

try {
  runStep("syntax check User Node runtime demo", [
    "--check",
    "scripts/federated-user-node-runtime-demo.mjs"
  ]);

  runStep("User Node runtime demo help", [
    "scripts/federated-user-node-runtime-demo.mjs",
    "--help"
  ], {
    mustContain: [
      "Usage: pnpm ops:demo-user-node-runtime",
      "--with-studio",
      "--studio-port <port>"
    ]
  });

  runStep("User Node runtime demo dry-run", [
    "scripts/federated-user-node-runtime-demo.mjs",
    "--dry-run",
    "--skip-build",
    "--skip-relay",
    "--relay-url",
    "ws://localhost:7777",
    "--timeout-ms",
    "1000",
    "--",
    "--keep-temp"
  ], {
    mustContain: [
      "pnpm ops:smoke-federated-process-runner",
      "--keep-running",
      "--relay-url=ws://localhost:7777",
      "--keep-temp"
    ]
  });

  runStep("Studio-enabled User Node runtime demo dry-run", [
    "scripts/federated-user-node-runtime-demo.mjs",
    "--dry-run",
    "--skip-build",
    "--skip-relay",
    "--with-studio",
    "--studio-host",
    "127.0.0.1",
    "--studio-port",
    "3001",
    "--relay-url",
    "ws://localhost:7777",
    "--timeout-ms",
    "1000",
    "--",
    "--keep-temp"
  ], {
    mustContain: [
      "Studio admin surface would start after the smoke prints PASS manual-host and PASS manual-token",
      "pnpm ops:smoke-federated-process-runner"
    ]
  });

  runStep("fake OpenCode User Node runtime demo dry-run", [
    "scripts/federated-user-node-runtime-demo.mjs",
    "--dry-run",
    "--skip-build",
    "--skip-relay",
    "--fake-opencode-server"
  ], {
    mustContain: "--use-fake-opencode-server"
  });

  runStep("fake external_http User Node runtime demo dry-run", [
    "scripts/federated-user-node-runtime-demo.mjs",
    "--dry-run",
    "--skip-build",
    "--skip-relay",
    "--fake-external-http-engine"
  ], {
    mustContain: "--use-fake-external-http-engine"
  });

  console.log("\n[demo-tools] demo tooling smoke passed");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
