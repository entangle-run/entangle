#!/usr/bin/env node

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runPnpmSync } from "./pnpm-runner.mjs";

function formatOutput(result) {
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();

  if (output.length > 0) {
    return output;
  }

  if (result.error) {
    return result.error.message;
  }

  return "no output";
}

function runCli(args) {
  const result = runPnpmSync(
    ["--silent", "--filter", "@entangle/cli", "dev", ...args],
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

function assertServiceVolumeExport(payload) {
  const summary = payload?.serviceVolumeExport;

  if (!summary || typeof summary !== "object") {
    throw new Error("Service-volume export smoke did not return an export summary.");
  }

  if (summary.dryRun !== true || summary.exported !== false) {
    throw new Error("Service-volume export smoke must be a non-mutating dry-run.");
  }

  if (summary.secretVolumeIncluded !== false) {
    throw new Error("Service-volume export smoke must keep Host secret state excluded.");
  }

  const volumes = Array.isArray(summary.volumes) ? summary.volumes : [];
  if (volumes.length !== 2 || summary.volumeCount !== 2) {
    throw new Error(
      `Service-volume export smoke expected 2 volumes, got ${volumes.length}.`
    );
  }

  for (const expectedVolume of ["gitea-data", "strfry-data"]) {
    const volume = volumes.find((entry) => entry?.volume === expectedVolume);

    if (!volume) {
      throw new Error(`Service-volume export smoke missed ${expectedVolume}.`);
    }

    if (volume.status !== "planned") {
      throw new Error(
        `Service-volume export smoke expected ${expectedVolume} to be planned.`
      );
    }

    if (!Array.isArray(volume.command) || volume.command[0] !== "docker") {
      throw new Error(
        `Service-volume export smoke did not include a Docker command for ${expectedVolume}.`
      );
    }
  }
}

function assertServiceVolumeImport(payload) {
  const summary = payload?.serviceVolumeImport;

  if (!summary || typeof summary !== "object") {
    throw new Error("Service-volume import smoke did not return an import summary.");
  }

  if (summary.dryRun !== true || summary.imported !== false) {
    throw new Error("Service-volume import smoke must be a non-mutating dry-run.");
  }

  if (summary.secretVolumeIncluded !== false) {
    throw new Error("Service-volume import smoke must keep Host secret state excluded.");
  }

  const volumes = Array.isArray(summary.volumes) ? summary.volumes : [];
  if (volumes.length !== 1 || summary.volumeCount !== 1) {
    throw new Error(
      `Service-volume import smoke expected 1 volume, got ${volumes.length}.`
    );
  }

  const [volume] = volumes;
  if (volume?.volume !== "gitea-data" || volume.status !== "planned") {
    throw new Error(
      "Service-volume import smoke did not plan the expected Gitea volume."
    );
  }

  if (!Array.isArray(volume.command) || volume.command[0] !== "docker") {
    throw new Error("Service-volume import smoke did not include a Docker command.");
  }
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const tempRoot = await mkdtemp(
  path.join(os.tmpdir(), "entangle-service-volume-tools-")
);
const exportPath = path.join(tempRoot, "export-bundle");
const importPath = path.join(tempRoot, "import-bundle");

try {
  const exportSummary = runCli([
    "deployment",
    "service-volumes",
    "export",
    "--dry-run",
    "--output",
    exportPath
  ]);
  assertServiceVolumeExport(exportSummary);

  await writeJson(path.join(importPath, "manifest.json"), {
    createdAt: "2026-05-09T00:00:00.000Z",
    dockerImage: "alpine:3.20",
    product: "entangle-service-volume-backup",
    schemaVersion: "1",
    secretsIncluded: false,
    volumes: [
      {
        archivePath: "gitea-data.tar",
        mountPath: "/data",
        service: "gitea",
        volume: "gitea-data"
      }
    ]
  });
  await writeFile(path.join(importPath, "gitea-data.tar"), "fixture\n", "utf8");

  const importSummary = runCli([
    "deployment",
    "service-volumes",
    "import",
    importPath,
    "--dry-run"
  ]);
  assertServiceVolumeImport(importSummary);

  console.log(
    "Deployment service-volume tool smoke passed: export volumes=2, import volumes=1."
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
