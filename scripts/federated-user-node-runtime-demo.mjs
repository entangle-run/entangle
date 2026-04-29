#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { federatedDevProfileComposeFile } from "./federated-dev-profile-paths.mjs";

const rawArgs = process.argv.slice(2);
const separatorIndex = rawArgs.indexOf("--");
const args =
  separatorIndex >= 0 ? rawArgs.slice(0, separatorIndex) : rawArgs.slice();
const passThroughArgs =
  separatorIndex >= 0 ? rawArgs.slice(separatorIndex + 1) : [];

const help = args.includes("--help") || args.includes("-h");
const dryRun = args.includes("--dry-run");
const skipBuild = args.includes("--skip-build");
const skipRelay = args.includes("--skip-relay");
const relayUrl =
  readFlagValue("--relay-url") ??
  process.env.ENTANGLE_RELAY_URL ??
  process.env.ENTANGLE_STRFRY_URL ??
  "ws://localhost:7777";
const timeoutMs = readFlagValue("--timeout-ms");
const userClientStaticDir = readFlagValue("--user-client-static-dir");

function usage() {
  console.log(`Usage: pnpm ops:demo-user-node-runtime [options] [-- smoke args]

Build and run the fastest interactive Entangle graph-node demo.

The command builds the dedicated User Client app, starts the local development
relay unless skipped, and then runs the process-runner federated smoke in
--keep-running mode. The smoke prints the Host URL, operator token, both User
Client URLs, and useful CLI commands. Press Ctrl-C in the demo terminal to stop
Host and all joined runner processes.

Options:
  --relay-url <url>              Relay URL for Host and runners. Default: ws://localhost:7777
  --timeout-ms <milliseconds>    Timeout passed to the process-runner smoke.
  --user-client-static-dir <dir> Serve a specific built User Client directory.
  --skip-build                   Do not build apps/user-client before running.
  --skip-relay                   Do not start the local strfry service first.
  --dry-run                      Print the commands without running them.
  -h, --help                     Show this help.

Examples:
  pnpm ops:demo-user-node-runtime
  pnpm ops:demo-user-node-runtime -- --keep-temp
  pnpm ops:demo-user-node-runtime --skip-relay --relay-url ws://relay.example:7777
`);
}

function readFlagValue(name) {
  const inlinePrefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(inlinePrefix));

  if (inline) {
    return inline.slice(inlinePrefix.length);
  }

  const index = args.indexOf(name);

  return index >= 0 ? args[index + 1] : undefined;
}

function run(label, command, commandArgs) {
  const printable = `${command} ${commandArgs.join(" ")}`;

  if (dryRun) {
    console.log(`[dry-run] ${label}: ${printable}`);
    return;
  }

  console.log(`[demo] ${label}: ${printable}`);
  const result = spawnSync(command, commandArgs, {
    encoding: "utf8",
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    throw new Error(
      `${label} failed with exit code ${result.status ?? "unknown"}.`
    );
  }
}

function buildSmokeArgs() {
  const smokeArgs = [
    "ops:smoke-federated-process-runner",
    "--",
    "--keep-running",
    `--relay-url=${relayUrl}`
  ];

  if (timeoutMs) {
    smokeArgs.push(`--timeout-ms=${timeoutMs}`);
  }

  if (userClientStaticDir) {
    smokeArgs.push(`--user-client-static-dir=${userClientStaticDir}`);
  }

  smokeArgs.push(...passThroughArgs);

  return smokeArgs;
}

if (help) {
  usage();
  process.exit(0);
}

try {
  if (!skipBuild) {
    run("Build User Client app", "pnpm", [
      "--filter",
      "@entangle/user-client",
      "build"
    ]);
  }

  if (!skipRelay) {
    run("Start development relay", "docker", [
      "compose",
      "-f",
      federatedDevProfileComposeFile,
      "up",
      "-d",
      "strfry"
    ]);
  }

  if (!dryRun) {
    console.log(
      "[demo] Starting Host, one agent runner, and two User Node runtimes. Press Ctrl-C to stop."
    );
  }

  run("Run interactive User Node runtime demo", "pnpm", buildSmokeArgs());
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(process.exitCode && process.exitCode > 0 ? process.exitCode : 1);
}
