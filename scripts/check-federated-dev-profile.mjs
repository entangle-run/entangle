#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  federatedDevProfileComposeFile,
  requiredFederatedDevProfilePaths
} from "./federated-dev-profile-paths.mjs";
import { runPnpmSync } from "./pnpm-runner.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(scriptPath), "..");
const strict = process.argv.includes("--strict");

const checks = [];

function addCheck(name, status, detail) {
  checks.push({ detail, name, status });
}

function run(command, args) {
  return spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function normalizeOutput(result) {
  return `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
}

function checkCommand(name, command, args, options = {}) {
  const result = run(command, args);

  if (result.status === 0) {
    addCheck(name, "pass", normalizeOutput(result).split("\n")[0] ?? "ok");
    return true;
  }

  addCheck(
    name,
    options.optional ? "warn" : "fail",
    normalizeOutput(result) || `${command} ${args.join(" ")} failed`
  );
  return false;
}

function checkPnpmAvailable() {
  const result = runPnpmSync(["--version"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (result.status === 0) {
    addCheck("pnpm:available", "pass", normalizeOutput(result).split("\n")[0] ?? "ok");
    return;
  }

  addCheck(
    "pnpm:available",
    "fail",
    normalizeOutput(result) || "pnpm execution failed"
  );
}

for (const requiredPath of requiredFederatedDevProfilePaths) {
  addCheck(
    `path:${requiredPath}`,
    existsSync(path.join(repositoryRoot, requiredPath)) ? "pass" : "fail",
    existsSync(path.join(repositoryRoot, requiredPath))
      ? "found"
      : "missing required federated dev profile file"
  );
}

function composeVolumeHasExplicitName(composeText, volumeName) {
  const escapedVolumeName = volumeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `\\n  ${escapedVolumeName}:\\n(?:    [^\\n]*\\n)*    name: ${escapedVolumeName}(?:\\n|$)`,
    "u"
  );

  return pattern.test(`\n${composeText}`);
}

if (existsSync(path.join(repositoryRoot, federatedDevProfileComposeFile))) {
  const composeText = readFileSync(
    path.join(repositoryRoot, federatedDevProfileComposeFile),
    "utf8"
  );

  for (const volumeName of [
    "entangle-host-state",
    "entangle-secret-state",
    "gitea-data",
    "strfry-data"
  ]) {
    addCheck(
      `compose-volume:${volumeName}`,
      composeVolumeHasExplicitName(composeText, volumeName) ? "pass" : "fail",
      composeVolumeHasExplicitName(composeText, volumeName)
        ? "explicit name"
        : "missing explicit Compose volume name"
    );
  }
}

const nodeMajor = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
addCheck(
  "node:version",
  nodeMajor >= 22 ? "pass" : "fail",
  `detected ${process.versions.node}; required >=22`
);

checkPnpmAvailable();

const dockerAvailable = checkCommand(
  "docker:available",
  "docker",
  ["--version"],
  { optional: !strict }
);

if (dockerAvailable) {
  const composeAvailable = checkCommand(
    "docker-compose:available",
    "docker",
    ["compose", "version"],
    { optional: !strict }
  );

  checkCommand(
    "docker:daemon",
    "docker",
    ["info", "--format", "{{.ServerVersion}}"],
    { optional: !strict }
  );

  if (composeAvailable) {
    checkCommand(
      "compose:federated-dev-config",
      "docker",
      [
        "compose",
        "-f",
        federatedDevProfileComposeFile,
        "config",
        "--quiet"
      ],
      { optional: !strict }
    );
  }
}

const hasFailure = checks.some((check) => check.status === "fail");
const hasWarning = checks.some((check) => check.status === "warn");

for (const check of checks) {
  const prefix =
    check.status === "pass" ? "PASS" : check.status === "warn" ? "WARN" : "FAIL";
  console.log(`${prefix} ${check.name}: ${check.detail}`);
}

if (hasFailure || (strict && hasWarning)) {
  console.error(
    strict
      ? "Federated dev profile preflight failed in strict mode."
      : "Federated dev profile preflight failed."
  );
  process.exit(1);
}

console.log(
  hasWarning
    ? "Federated dev profile preflight completed with warnings."
    : "Federated dev profile preflight passed."
);
