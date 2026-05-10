#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const dockerImage = "alpine:3.20";
const requireDocker = process.argv.includes("--require-docker");

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

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? process.cwd(),
    encoding: "utf8",
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (result.status !== 0 || result.error || result.signal) {
    throw new Error(
      [
        `${command} ${args.join(" ")} failed with exit code ${result.status ?? "unknown"}.`,
        formatOutput(result)
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  return result;
}

function canUseDocker() {
  const result = spawnSync("docker", ["version", "--format", "{{.Server.Version}}"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  return result.status === 0 && !result.error && !result.signal;
}

function runDocker(args) {
  return run("docker", args);
}

function runCli(args) {
  const pnpmCommand =
    process.env.npm_execpath && process.env.npm_execpath.includes("pnpm")
      ? process.env.npm_execpath
      : "pnpm";
  const result = run(pnpmCommand, [
    "--silent",
    "--filter",
    "@entangle/cli",
    "dev",
    ...args
  ]);

  return JSON.parse(result.stdout);
}

function assertVolumeSummary(payload, key, expectedVolumes) {
  const summary = payload?.[key];

  if (!summary || typeof summary !== "object") {
    throw new Error(`Service-volume roundtrip did not return ${key}.`);
  }

  const volumes = Array.isArray(summary.volumes) ? summary.volumes : [];
  const volumeNames = volumes.map((volume) => volume?.volume);

  if (JSON.stringify(volumeNames) !== JSON.stringify(expectedVolumes)) {
    throw new Error(
      `Service-volume roundtrip expected volumes ${expectedVolumes.join(", ")}, got ${volumeNames.join(", ")}.`
    );
  }

  return summary;
}

function seedVolume(volume, fileName, content) {
  runDocker([
    "run",
    "--rm",
    "-v",
    `${volume}:/volume`,
    dockerImage,
    "sh",
    "-c",
    `mkdir -p /volume && printf '%s\\n' ${content} > /volume/${fileName}`
  ]);
}

function readVolumeFile(volume, fileName) {
  return runDocker([
    "run",
    "--rm",
    "-v",
    `${volume}:/volume:ro`,
    dockerImage,
    "sh",
    "-c",
    `cat /volume/${fileName}`
  ]).stdout.trim();
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

if (!canUseDocker()) {
  const message =
    "Deployment service-volume roundtrip smoke skipped because Docker is not available.";

  if (requireDocker) {
    console.error(message);
    process.exitCode = 1;
  } else {
    console.log(message);
  }
} else {
  const runId = `${Date.now()}-${process.pid}`;
  const giteaVolume = `entangle-sv-${runId}-gitea`;
  const relayVolume = `entangle-sv-${runId}-strfry`;
  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), "entangle-service-volume-roundtrip-")
  );
  const exportPath = path.join(tempRoot, "bundle");

  try {
    for (const volume of [giteaVolume, relayVolume]) {
      runDocker(["volume", "create", volume]);
    }

    seedVolume(giteaVolume, "gitea-fixture.txt", "gitea-roundtrip-fixture");
    seedVolume(relayVolume, "strfry-fixture.txt", "strfry-roundtrip-fixture");

    const expectedVolumes = [giteaVolume, relayVolume];
    const statusSummary = assertVolumeSummary(
      runCli([
        "deployment",
        "service-volumes",
        "status",
        "--gitea-volume",
        giteaVolume,
        "--relay-volume",
        relayVolume
      ]),
      "serviceVolumeStatus",
      expectedVolumes
    );

    if (statusSummary.status !== "ready") {
      throw new Error("Disposable service volumes must be ready before export.");
    }

    const exportSummary = assertVolumeSummary(
      runCli([
        "deployment",
        "service-volumes",
        "export",
        "--assume-services-stopped",
        "--docker-image",
        dockerImage,
        "--force",
        "--gitea-volume",
        giteaVolume,
        "--output",
        exportPath,
        "--relay-volume",
        relayVolume
      ]),
      "serviceVolumeExport",
      expectedVolumes
    );

    if (exportSummary.dryRun !== false || exportSummary.exported !== true) {
      throw new Error("Disposable service-volume export did not execute.");
    }

    const manifest = await readJson(path.join(exportPath, "manifest.json"));
    assertVolumeSummary({ serviceVolumeManifest: manifest }, "serviceVolumeManifest", [
      giteaVolume,
      relayVolume
    ]);

    for (const volume of [giteaVolume, relayVolume]) {
      runDocker(["volume", "rm", "-f", volume]);
      runDocker(["volume", "create", volume]);
    }

    const importSummary = assertVolumeSummary(
      runCli([
        "deployment",
        "service-volumes",
        "import",
        exportPath,
        "--assume-services-stopped",
        "--docker-image",
        dockerImage
      ]),
      "serviceVolumeImport",
      expectedVolumes
    );

    if (importSummary.dryRun !== false || importSummary.imported !== true) {
      throw new Error("Disposable service-volume import did not execute.");
    }

    if (readVolumeFile(giteaVolume, "gitea-fixture.txt") !== "gitea-roundtrip-fixture") {
      throw new Error("Gitea disposable service volume content was not restored.");
    }

    if (readVolumeFile(relayVolume, "strfry-fixture.txt") !== "strfry-roundtrip-fixture") {
      throw new Error("strfry disposable service volume content was not restored.");
    }

    console.log(
      `Deployment service-volume roundtrip smoke passed for disposable volumes ${giteaVolume} and ${relayVolume}.`
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    for (const volume of [giteaVolume, relayVolume]) {
      spawnSync("docker", ["volume", "rm", "-f", volume], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
      });
    }

    await rm(tempRoot, {
      force: true,
      recursive: true
    });
  }
}
