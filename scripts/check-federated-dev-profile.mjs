#!/usr/bin/env node

import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  federatedDevProfileComposeFile,
  requiredFederatedDevProfilePaths
} from "./federated-dev-profile-paths.mjs";

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

for (const requiredPath of requiredFederatedDevProfilePaths) {
  addCheck(
    `path:${requiredPath}`,
    existsSync(path.join(repositoryRoot, requiredPath)) ? "pass" : "fail",
    existsSync(path.join(repositoryRoot, requiredPath))
      ? "found"
      : "missing required federated dev profile file"
  );
}

const nodeMajor = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
addCheck(
  "node:version",
  nodeMajor >= 22 ? "pass" : "fail",
  `detected ${process.versions.node}; required >=22`
);

checkCommand("pnpm:available", "pnpm", ["--version"]);

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
