#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { localProfileComposeFile } from "./local-profile-paths.mjs";

const args = process.argv.slice(2);
const skipBuild = args.includes("--skip-build");
const reset = args.includes("--reset");
const defaultGiteaUrl = "http://localhost:3001";
const giteaUrl = normalizeHttpUrl(
  process.env.ENTANGLE_GITEA_URL ?? process.env.ENTANGLE_LOCAL_GITEA_URL,
  defaultGiteaUrl
);

function normalizeHttpUrl(value, fallback) {
  const rawUrl = value && value.trim().length > 0 ? value.trim() : fallback;
  return rawUrl.endsWith("/") ? rawUrl.slice(0, -1) : rawUrl;
}

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
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

function removePreviewModelStub() {
  spawnSync("docker", ["rm", "-f", "entangle-local-preview-model"], {
    encoding: "utf8",
    stdio: "ignore"
  });
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
      console.log(`PASS local-preview:${label}: ${url}`);
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
  removePreviewModelStub();
  run("docker", [
    "compose",
    "-f",
    localProfileComposeFile,
    "down",
    "--volumes"
  ]);
  console.log("Local Preview demo state reset.");
} else {
  run("pnpm", ["ops:check-local:strict"]);

  if (!skipBuild) {
    run("docker", [
      "compose",
      "-f",
      localProfileComposeFile,
      "--profile",
      "runner-build",
      "build",
      "runner-image"
    ]);
  }

  run("docker", [
    "compose",
    "-f",
    localProfileComposeFile,
    "up",
    "--build",
    "-d",
    "studio",
    "host",
    "strfry",
    "gitea"
  ]);
  waitForHttp(giteaUrl, "gitea-ready");
  run("pnpm", ["ops:smoke-local"]);
  run("node", ["scripts/smoke-local-runtime.mjs", "--preview-demo"]);
}
