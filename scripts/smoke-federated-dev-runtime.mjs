#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const processArgs = process.argv.slice(2);
const separatorIndex = processArgs.indexOf("--");
const rawArgs =
  separatorIndex >= 0 ? processArgs.slice(separatorIndex + 1) : processArgs;
const help = rawArgs.includes("--help") || rawArgs.includes("-h");

function usage() {
  console.log(`Usage: pnpm ops:smoke-federated-dev:runtime [options]

Run the current Entangle agentic runtime smoke against the federated dev relay.

This compatibility command now delegates to the process-runner federated smoke
and defaults to the deterministic fake OpenCode attached-server profile. It
proves Host assignment, joined agent and User Node runners, signed User Node
messages, permission approval bridging, source/wiki/artifact projection, and
User Client routes without live model-provider credentials.

Options:
  --relay-url <url>                   Relay URL. Default: ws://localhost:7777
  --timeout-ms <milliseconds>         Smoke timeout. Default: 60000
  --use-fake-opencode-server          Use deterministic attached fake OpenCode.
  --use-fake-external-http-engine     Use deterministic external_http engine.
  --keep-running                      Keep Host/runners alive for inspection.
  --keep-temp                         Keep temporary runtime state.
  --preview-demo                      Accepted for old preview command callers.
  -h, --help                          Show this help.
`);
}

function readFlagValue(args, name) {
  const inlinePrefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(inlinePrefix));

  if (inline) {
    return inline.slice(inlinePrefix.length);
  }

  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function hasFlagValue(args, name) {
  return args.some((arg) => arg === name || arg.startsWith(`${name}=`));
}

function normalizeSmokeArgs(args) {
  const normalized = [];
  const ignoredLegacyFlags = new Set([
    "--host-url",
    "--poll-interval-ms",
    "--preview-demo",
    "--keep-state"
  ]);
  const hasEngineSelection = args.some(
    (arg) =>
      arg === "--use-fake-opencode-server" ||
      arg === "--fake-opencode-server" ||
      arg === "--use-fake-external-http-engine" ||
      arg === "--fake-external-http-engine"
  );

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      continue;
    }

    if (arg === "--fake-opencode-server") {
      normalized.push("--use-fake-opencode-server");
      continue;
    }

    if (arg === "--fake-external-http-engine") {
      normalized.push("--use-fake-external-http-engine");
      continue;
    }

    if (ignoredLegacyFlags.has(arg)) {
      if (arg !== "--preview-demo" && arg !== "--keep-state") {
        index += 1;
      }
      continue;
    }

    const ignoredInline = [...ignoredLegacyFlags].some((flag) =>
      arg.startsWith(`${flag}=`)
    );
    if (ignoredInline) {
      continue;
    }

    normalized.push(arg);
  }

  if (!hasFlagValue(normalized, "--relay-url")) {
    normalized.push(
      `--relay-url=${
        process.env.ENTANGLE_RELAY_URL ??
        process.env.ENTANGLE_STRFRY_URL ??
        "ws://localhost:7777"
      }`
    );
  }

  if (!hasFlagValue(normalized, "--timeout-ms")) {
    normalized.push("--timeout-ms=60000");
  }

  if (!hasEngineSelection) {
    normalized.push("--use-fake-opencode-server");
  }

  const relayUrl = readFlagValue(normalized, "--relay-url");
  if (relayUrl && relayUrl.trim().length === 0) {
    throw new Error("Relay URL must not be empty.");
  }

  return normalized;
}

if (help) {
  usage();
  process.exit(0);
}

const smokeArgs = normalizeSmokeArgs(rawArgs);
const result = spawnSync(
  "pnpm",
  [
    "--filter",
    "@entangle/host",
    "exec",
    "tsx",
    "scripts/federated-process-runner-smoke.ts",
    ...smokeArgs
  ],
  {
    encoding: "utf8",
    stdio: "inherit"
  }
);

process.exit(result.status ?? 1);
