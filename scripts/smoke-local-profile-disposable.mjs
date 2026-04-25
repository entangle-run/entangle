#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { localProfileComposeFile } from "./local-profile-paths.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(scriptPath), "..");
const composeFile = localProfileComposeFile;
const defaultTimeoutMs = 180_000;
const defaultProbeTimeoutMs = 5_000;

const args = process.argv.slice(2);
const keepRunning = args.includes("--keep-running");
const preserveVolumes = args.includes("--preserve-volumes");
const skipBuild = args.includes("--skip-build");
const includeRuntime = args.includes("--include-runtime");

function readFlagValue(name) {
  const inlinePrefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(inlinePrefix));

  if (inline) {
    return inline.slice(inlinePrefix.length);
  }

  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function readPositiveInteger(name, fallback) {
  const rawValue = readFlagValue(name);
  const value = rawValue ? Number.parseInt(rawValue, 10) : fallback;

  return Number.isInteger(value) && value > 0 ? value : fallback;
}

const timeoutMs = readPositiveInteger("--timeout-ms", defaultTimeoutMs);
const probeTimeoutMs = readPositiveInteger(
  "--probe-timeout-ms",
  defaultProbeTimeoutMs
);

function run(command, commandArgs, options = {}) {
  return spawnSync(command, commandArgs, {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: process.env,
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit"
  });
}

function requireSuccess(step, command, commandArgs) {
  const result = run(command, commandArgs);

  if (result.status !== 0) {
    throw new Error(`${step} failed with exit code ${result.status ?? "unknown"}.`);
  }
}

function formatCapturedOutput(result) {
  return `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
}

async function waitForSmoke() {
  const deadline = Date.now() + timeoutMs;
  let lastOutput = "";

  while (Date.now() <= deadline) {
    const result = run(
      process.execPath,
      [
        "scripts/smoke-local-profile.mjs",
        `--timeout-ms=${probeTimeoutMs}`
      ],
      { capture: true }
    );
    const output = formatCapturedOutput(result);

    if (result.status === 0) {
      if (output.length > 0) {
        console.log(output);
      }
      return;
    }

    lastOutput = output;
    await delay(2500);
  }

  throw new Error(
    [
      `Local profile smoke did not pass within ${timeoutMs}ms.`,
      lastOutput ? `Last smoke output:\n${lastOutput}` : undefined
    ]
      .filter(Boolean)
      .join("\n")
  );
}

function downCompose() {
  if (keepRunning) {
    console.log("Keeping local Compose profile running because --keep-running was set.");
    return;
  }

  const downArgs = ["compose", "-f", composeFile, "down"];

  if (!preserveVolumes) {
    downArgs.push("--volumes");
  }

  const result = run("docker", downArgs);

  if (result.status !== 0) {
    console.error(
      `Local Compose profile teardown failed with exit code ${result.status ?? "unknown"}.`
    );
  }
}

let shouldTearDown = false;

try {
  requireSuccess("Local profile strict preflight", "pnpm", [
    "ops:check-local:strict"
  ]);

  if (!skipBuild) {
    requireSuccess("Runner image build", "docker", [
      "compose",
      "-f",
      composeFile,
      "--profile",
      "runner-build",
      "build",
      "runner-image"
    ]);
  }

  shouldTearDown = true;
  requireSuccess("Local profile startup", "docker", [
    "compose",
    "-f",
    composeFile,
    "up",
    "--build",
    "--detach",
    "studio",
    "host",
    "strfry",
    "gitea"
  ]);

  await waitForSmoke();

  if (includeRuntime) {
    requireSuccess("Runtime lifecycle smoke", process.execPath, [
      "scripts/smoke-local-runtime.mjs"
    ]);
  }

  console.log("Disposable local profile smoke passed.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  if (shouldTearDown) {
    downCompose();
  }
}
