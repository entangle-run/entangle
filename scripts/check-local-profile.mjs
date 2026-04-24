#!/usr/bin/env node

import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(scriptPath), "..");
const strict = process.argv.includes("--strict");

const requiredPaths = [
  "deploy/compose/docker-compose.local.yml",
  "deploy/config/nginx.studio.conf",
  "deploy/config/strfry.local.conf",
  "deploy/docker/host.Dockerfile",
  "deploy/docker/runner.Dockerfile",
  "deploy/docker/studio.Dockerfile",
  "package.json",
  "pnpm-lock.yaml"
];

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

for (const requiredPath of requiredPaths) {
  addCheck(
    `path:${requiredPath}`,
    existsSync(path.join(repositoryRoot, requiredPath)) ? "pass" : "fail",
    existsSync(path.join(repositoryRoot, requiredPath))
      ? "found"
      : "missing required local profile file"
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
      "compose:local-config",
      "docker",
      [
        "compose",
        "-f",
        "deploy/compose/docker-compose.local.yml",
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
      ? "Local profile preflight failed in strict mode."
      : "Local profile preflight failed."
  );
  process.exit(1);
}

console.log(
  hasWarning
    ? "Local profile preflight completed with warnings."
    : "Local profile preflight passed."
);
