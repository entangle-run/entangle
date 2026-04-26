#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

function formatOutput(result) {
  return `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
}

function runCli(args) {
  const result = spawnSync(
    "pnpm",
    ["--filter", "@entangle/cli", "dev", ...args],
    {
      encoding: "utf8",
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    }
  );

  if (result.status !== 0) {
    throw new Error(
      [
        `entangle ${args.join(" ")} failed with exit code ${result.status ?? "unknown"}.`,
        formatOutput(result)
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  return JSON.parse(result.stdout);
}

function assertBackupSummary(payload) {
  if (!payload?.backup || typeof payload.backup !== "object") {
    throw new Error("Backup smoke did not return a backup summary.");
  }

  if (payload.backup.stateLayoutStatus !== "current") {
    throw new Error(
      `Backup smoke expected current state layout, got ${payload.backup.stateLayoutStatus}.`
    );
  }

  if (payload.backup.stateStats?.files < 1) {
    throw new Error("Backup smoke did not copy any state files.");
  }
}

function assertRestoreDryRunSummary(payload) {
  if (!payload?.restore || typeof payload.restore !== "object") {
    throw new Error("Restore smoke did not return a restore summary.");
  }

  if (payload.restore.restored !== false || payload.restore.dryRun !== true) {
    throw new Error("Restore smoke was expected to run as a non-mutating dry-run.");
  }

  if (payload.restore.stateLayoutStatus !== "current") {
    throw new Error(
      `Restore smoke expected current state layout, got ${payload.restore.stateLayoutStatus}.`
    );
  }
}

function assertRepairDryRunReport(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Repair smoke did not return a JSON object.");
  }

  if (!["clean", "would_repair", "manual"].includes(payload.status)) {
    throw new Error(`Repair smoke returned non-releasable status ${payload.status}.`);
  }

  if (!payload.summary || typeof payload.summary !== "object") {
    throw new Error("Repair smoke did not include a summary.");
  }
}

const tempRoot = await mkdtemp(path.join(os.tmpdir(), "entangle-reliability-"));
const backupPath = path.join(tempRoot, "backup");

try {
  const backup = runCli(["local", "backup", "--output", backupPath]);
  assertBackupSummary(backup);

  const restore = runCli(["local", "restore", backupPath, "--dry-run"]);
  assertRestoreDryRunSummary(restore);

  const repair = runCli(["local", "repair", "--skip-live", "--json"]);
  assertRepairDryRunReport(repair);

  console.log(
    `Local reliability smoke passed: backup files=${backup.backup.stateStats.files}, repair=${repair.status}.`
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await rm(tempRoot, {
    force: true,
    recursive: true
  });
}
