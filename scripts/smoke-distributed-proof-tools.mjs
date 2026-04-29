#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const node = process.execPath;

function runStep(label, args, options = {}) {
  console.log(`\n[distributed-proof-tools] ${label}`);
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

  if (options.mustContain && !result.stdout.includes(options.mustContain)) {
    throw new Error(`${label} output did not include '${options.mustContain}'.`);
  }

  return result.stdout;
}

function verifySelfTestJson(stdout) {
  let parsed;

  try {
    parsed = JSON.parse(stdout);
  } catch (error) {
    throw new Error(
      `Verifier self-test did not emit valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (parsed?.ok !== true || !Array.isArray(parsed.checks)) {
    throw new Error("Verifier self-test JSON did not report a passing check set.");
  }

  const failedChecks = parsed.checks.filter((check) => check?.ok !== true);

  if (failedChecks.length > 0) {
    throw new Error(
      `Verifier self-test reported failed checks: ${failedChecks
        .map((check) => check?.name ?? "unknown")
        .join(", ")}`
    );
  }
}

try {
  runStep("syntax check proof kit", [
    "--check",
    "scripts/federated-distributed-proof-kit.mjs"
  ]);
  runStep("syntax check verifier", [
    "--check",
    "scripts/federated-distributed-proof-verify.mjs"
  ]);

  runStep("proof kit help", [
    "scripts/federated-distributed-proof-kit.mjs",
    "--help"
  ], {
    mustContain: "Usage: pnpm ops:distributed-proof-kit"
  });
  runStep("proof verifier help", [
    "scripts/federated-distributed-proof-verify.mjs",
    "--help"
  ], {
    mustContain: "Usage: pnpm ops:distributed-proof-verify"
  });

  runStep("proof kit token dry-run", [
    "scripts/federated-distributed-proof-kit.mjs",
    "--dry-run",
    "--output",
    "/tmp/entangle-distributed-proof-ci",
    "--host-url",
    "http://host.example:7071",
    "--relay-url",
    "ws://relay.example:7777",
    "--host-token",
    "dev-token",
    "--agent-node",
    "builder",
    "--user-node",
    "user",
    "--reviewer-user-node",
    "reviewer"
  ], {
    mustContain: "[dry-run] would write runner env/start scripts"
  });

  runStep("proof kit no-token dry-run", [
    "scripts/federated-distributed-proof-kit.mjs",
    "--dry-run",
    "--no-host-token-env-var",
    "--output",
    "/tmp/entangle-distributed-proof-ci-no-token",
    "--host-url",
    "http://host.example:7071",
    "--relay-url",
    "ws://relay.example:7777"
  ], {
    mustContain: "[dry-run] would write runner env/start scripts"
  });

  const selfTestJson = runStep("proof verifier self-test", [
    "scripts/federated-distributed-proof-verify.mjs",
    "--self-test",
    "--json",
    "--require-conversation",
    "--check-user-client-health"
  ]);
  verifySelfTestJson(selfTestJson);

  console.log("\nDistributed proof tool smoke passed.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
