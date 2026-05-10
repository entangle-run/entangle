#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { federatedDevProfileComposeFile } from "./federated-dev-profile-paths.mjs";
import { runPnpmSync } from "./pnpm-runner.mjs";

const args = process.argv.slice(2);
const skipBuild = args.includes("--skip-build");
const reset = args.includes("--reset");
const defaultGiteaUrl = "http://localhost:3001";
const giteaUrl = normalizeHttpUrl(
  process.env.ENTANGLE_GITEA_URL,
  defaultGiteaUrl
);

function normalizeHttpUrl(value, fallback) {
  const rawUrl = value && value.trim().length > 0 ? value.trim() : fallback;
  return rawUrl.endsWith("/") ? rawUrl.slice(0, -1) : rawUrl;
}

function run(command, commandArgs) {
  const result =
    command === "pnpm"
      ? runPnpmSync(commandArgs, {
          encoding: "utf8",
          stdio: "inherit"
        })
      : spawnSync(command, commandArgs, {
          encoding: "utf8",
          stdio: "inherit"
        });

  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    throw new Error(
      `${command} ${commandArgs.join(" ")} failed with exit code ${result.status ?? "unknown"}.`
    );
  }
}

function sleep(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function waitForHttp(url, label) {
  const deadline = Date.now() + 90_000;
  let lastOutput = "";

  while (Date.now() <= deadline) {
    const result = spawnSync(
      process.execPath,
      [
        "-e",
        `fetch(${JSON.stringify(url)}).then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1));`
      ],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
      }
    );

    if (result.status === 0) {
      console.log(`PASS federated-preview:${label}: ${url}`);
      return;
    }

    lastOutput = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
    sleep(2_000);
  }

  throw new Error(
    `${label} did not become reachable at ${url}. ${lastOutput}`.trim()
  );
}

if (reset) {
  run("docker", [
    "compose",
    "-f",
    federatedDevProfileComposeFile,
    "down",
    "--volumes"
  ]);
  console.log("Federated Preview demo state reset.");
} else {
  run("pnpm", ["ops:check-federated-dev:strict"]);

  if (!skipBuild) {
    run("docker", [
      "compose",
      "-f",
      federatedDevProfileComposeFile,
      "--profile",
      "runner-build",
      "build",
      "runner-image"
    ]);
  }

  run("docker", [
    "compose",
    "-f",
    federatedDevProfileComposeFile,
    "up",
    "--build",
    "-d",
    "studio",
    "host",
    "strfry",
    "gitea"
  ]);
  waitForHttp(giteaUrl, "gitea-ready");
  run("pnpm", ["ops:smoke-federated-dev"]);
  run("node", ["scripts/smoke-federated-dev-runtime.mjs", "--preview-demo"]);
}
