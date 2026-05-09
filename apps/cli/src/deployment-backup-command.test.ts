import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createDeploymentBackup,
  createDeploymentServiceVolumeExport,
  createDeploymentServiceVolumeImport,
  restoreDeploymentBackup
} from "./deployment-backup-command.js";

const temporaryRoots: string[] = [];

async function createTempRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), prefix));
  temporaryRoots.push(root);
  return root;
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeText(filePath: string, value: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, value);
}

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8")) as unknown;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await readFile(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

async function seedRepository(root: string): Promise<void> {
  await writeJson(path.join(root, "package.json"), {
    name: "entangle",
    version: "0.1.0"
  });
  await writeText(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
  await writeText(
    path.join(root, "deploy/federated-dev/compose/docker-compose.federated-dev.yml"),
    "services: {}\n"
  );
  await writeText(
    path.join(root, "deploy/federated-dev/config/strfry.federated-dev.conf"),
    "relay {}\n"
  );
  await writeText(
    path.join(root, "deploy/federated-dev/config/nginx.studio.conf"),
    "events {}\n"
  );
  await writeText(
    path.join(root, "deploy/federated-dev/docker/host.Dockerfile"),
    "FROM node:22\n"
  );
  await writeText(
    path.join(root, "deploy/federated-dev/docker/runner.Dockerfile"),
    "FROM node:22\n"
  );
  await writeText(
    path.join(root, "deploy/federated-dev/docker/studio.Dockerfile"),
    "FROM node:22\n"
  );
  await writeJson(path.join(root, ".entangle/host/state-layout.json"), {
    createdAt: "2026-04-26T00:00:00.000Z",
    layoutVersion: 1,
    product: "entangle",
    schemaVersion: "1",
    updatedAt: "2026-04-26T00:00:00.000Z"
  });
  await writeJson(path.join(root, ".entangle/host/desired/catalog.json"), {
    schemaVersion: "1"
  });
  await writeText(
    path.join(root, ".entangle-secrets/runtime-identities/node-a"),
    "secret-key"
  );
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true }))
  );
});

describe("deployment backup command helpers", () => {
  it("creates a versioned backup bundle without Entangle secrets", async () => {
    const repositoryRoot = await createTempRoot("entangle-backup-repo-");
    const outputPath = path.join(await createTempRoot("entangle-backup-out-"), "bundle");
    await seedRepository(repositoryRoot);

    const summary = await createDeploymentBackup({
      now: () => new Date("2026-04-26T00:00:00.000Z"),
      outputPath,
      repositoryRoot
    });

    expect(summary).toMatchObject({
      configIncludedPathCount: 8,
      configMissingPathCount: 0,
      externalVolumeCount: 3,
      stateLayoutStatus: "current",
      stateLayoutVersion: 1
    });
    expect(
      await readJson(path.join(outputPath, "state/host/desired/catalog.json"))
    ).toMatchObject({
      schemaVersion: "1"
    });
    expect(await pathExists(path.join(outputPath, ".entangle-secrets"))).toBe(
      false
    );
    expect(await readJson(path.join(outputPath, "manifest.json"))).toMatchObject({
      exclusions: {
        externalVolumes: [
          {
            mountPath: "/data",
            service: "gitea",
            volume: "gitea-data"
          },
          {
            mountPath: "/app/strfry-db",
            service: "strfry",
            volume: "strfry-data"
          },
          {
            mountPath: "/entangle-secrets",
            service: "host",
            volume: "entangle-secret-state"
          }
        ],
        paths: [".entangle-secrets"],
        secretsIncluded: false
      },
      product: "entangle-backup",
      schemaVersion: "1",
      state: {
        layout: {
          recordedLayoutVersion: 1,
          status: "current"
        },
        path: "state/host"
      }
    });
  });

  it("restores state into a clean Entangle repository after dry-run validation", async () => {
    const sourceRepositoryRoot = await createTempRoot("entangle-backup-source-");
    const targetRepositoryRoot = await createTempRoot("entangle-backup-target-");
    const outputPath = path.join(await createTempRoot("entangle-backup-bundle-"), "bundle");
    await seedRepository(sourceRepositoryRoot);

    await createDeploymentBackup({
      outputPath,
      repositoryRoot: sourceRepositoryRoot
    });

    const dryRun = await restoreDeploymentBackup({
      dryRun: true,
      inputPath: outputPath,
      now: () => new Date("2026-04-26T00:00:00.000Z"),
      repositoryRoot: targetRepositoryRoot
    });
    expect(dryRun).toMatchObject({
      dryRun: true,
      restored: false,
      stateLayoutStatus: "current"
    });
    expect(dryRun.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("gitea:gitea-data->/data")])
    );
    expect(
      await pathExists(path.join(targetRepositoryRoot, ".entangle/host/state-layout.json"))
    ).toBe(false);

    const restore = await restoreDeploymentBackup({
      inputPath: outputPath,
      repositoryRoot: targetRepositoryRoot
    });
    expect(restore).toMatchObject({
      dryRun: false,
      restored: true,
      stateLayoutVersion: 1
    });
    expect(
      await readJson(path.join(targetRepositoryRoot, ".entangle/host/desired/catalog.json"))
    ).toMatchObject({
      schemaVersion: "1"
    });
    expect(
      await pathExists(path.join(targetRepositoryRoot, ".entangle-secrets/runtime-identities/node-a"))
    ).toBe(false);
  });

  it("rejects restore when the backup state layout is unsupported by this binary", async () => {
    const bundleRoot = path.join(await createTempRoot("entangle-future-bundle-"), "bundle");
    const targetRepositoryRoot = await createTempRoot("entangle-future-target-");

    await writeJson(path.join(bundleRoot, "manifest.json"), {
      config: {
        includedPaths: [],
        missingPaths: [],
        path: "config"
      },
      createdAt: "2026-04-26T00:00:00.000Z",
      exclusions: {
        externalState: [],
        paths: [".entangle-secrets"],
        secretsIncluded: false
      },
      product: "entangle-backup",
      repository: {
        packageName: "entangle",
        packageVersion: "0.1.0"
      },
      restore: {
        stateTargetPath: ".entangle/host"
      },
      schemaVersion: "1",
      state: {
        layout: {
          currentLayoutVersion: 1,
          minimumSupportedLayoutVersion: 1,
          recordedLayoutVersion: 99,
          status: "unsupported_future"
        },
        originalPath: ".entangle/host",
        path: "state/host",
        stats: {
          bytes: 1,
          directories: 1,
          files: 1,
          skipped: [],
          symlinks: 0
        }
      }
    });
    await writeJson(path.join(bundleRoot, "state/host/state-layout.json"), {
      createdAt: "2026-04-26T00:00:00.000Z",
      layoutVersion: 99,
      product: "entangle",
      schemaVersion: "1",
      updatedAt: "2026-04-26T00:00:00.000Z"
    });

    await expect(
      restoreDeploymentBackup({
        inputPath: bundleRoot,
        repositoryRoot: targetRepositoryRoot
      })
    ).rejects.toThrow("unsupported_future");
  });

  it("plans service-volume export without executing Docker in dry-run mode", async () => {
    const outputPath = path.join(
      await createTempRoot("entangle-service-volume-export-"),
      "bundle"
    );
    const commandCalls: Array<{ args: string[]; command: string }> = [];

    const summary = await createDeploymentServiceVolumeExport({
      commandRunner: (command, args) => {
        commandCalls.push({ args, command });
        return {
          signal: null,
          status: 0,
          stderr: "",
          stdout: ""
        };
      },
      dryRun: true,
      now: () => new Date("2026-05-09T00:00:00.000Z"),
      outputPath,
      repositoryRoot: await createTempRoot("entangle-service-volume-repo-")
    });

    expect(commandCalls).toEqual([]);
    expect(summary).toMatchObject({
      createdAt: "2026-05-09T00:00:00.000Z",
      dryRun: true,
      exported: false,
      secretVolumeIncluded: false,
      volumeCount: 2
    });
    expect(summary.volumes.map((volume) => volume.volume)).toEqual([
      "gitea-data",
      "strfry-data"
    ]);
    expect(summary.volumes.every((volume) => volume.status === "planned")).toBe(
      true
    );
  });

  it("exports service volumes with deterministic Docker archive commands and manifest", async () => {
    const outputPath = path.join(
      await createTempRoot("entangle-service-volume-export-real-"),
      "bundle"
    );
    const commandCalls: Array<{ args: string[]; command: string }> = [];

    const summary = await createDeploymentServiceVolumeExport({
      commandRunner: (command, args) => {
        commandCalls.push({ args, command });
        return {
          signal: null,
          status: 0,
          stderr: "",
          stdout: ""
        };
      },
      assumeServicesStopped: true,
      now: () => new Date("2026-05-09T00:00:00.000Z"),
      outputPath,
      repositoryRoot: await createTempRoot("entangle-service-volume-repo-real-")
    });

    expect(summary).toMatchObject({
      dryRun: false,
      exported: true,
      volumeCount: 2
    });
    expect(commandCalls).toHaveLength(4);
    expect(commandCalls[0]).toMatchObject({
      args: ["ps", "--filter", "volume=gitea-data", "--format", "{{.Names}}"],
      command: "docker"
    });
    expect(commandCalls[1]).toMatchObject({
      args: ["ps", "--filter", "volume=strfry-data", "--format", "{{.Names}}"],
      command: "docker"
    });
    expect(commandCalls[2]).toMatchObject({
      command: "docker"
    });
    expect(commandCalls[2]?.args).toEqual(
      expect.arrayContaining([
        "run",
        "--rm",
        "-v",
        "gitea-data:/volume:ro",
        "-v",
        `${outputPath}:/backup`
      ])
    );
    expect(commandCalls[2]?.args.at(-1)).toBe(
      "cd /volume && tar -cf /backup/gitea-data.tar ."
    );

    expect(await readJson(path.join(outputPath, "manifest.json"))).toMatchObject({
      product: "entangle-service-volume-backup",
      schemaVersion: "1",
      secretsIncluded: false,
      volumes: [
        {
          archivePath: "gitea-data.tar",
          service: "gitea",
          volume: "gitea-data"
        },
        {
          archivePath: "strfry-data.tar",
          service: "strfry",
          volume: "strfry-data"
        }
      ]
    });
  });

  it("rejects non-dry-run service-volume export without stopped-service acknowledgement", async () => {
    const outputPath = path.join(
      await createTempRoot("entangle-service-volume-export-ack-"),
      "bundle"
    );

    await expect(
      createDeploymentServiceVolumeExport({
        commandRunner: () => {
          throw new Error("Docker must not run without acknowledgement.");
        },
        outputPath,
        repositoryRoot: await createTempRoot("entangle-service-volume-repo-ack-")
      })
    ).rejects.toThrow("--assume-services-stopped");
  });

  it("rejects service-volume export when a target volume is still mounted by a running container", async () => {
    const outputPath = path.join(
      await createTempRoot("entangle-service-volume-export-running-"),
      "bundle"
    );
    const commandCalls: Array<{ args: string[]; command: string }> = [];

    await expect(
      createDeploymentServiceVolumeExport({
        assumeServicesStopped: true,
        commandRunner: (command, args) => {
          commandCalls.push({ args, command });
          return {
            signal: null,
            status: 0,
            stderr: "",
            stdout: args.includes("volume=gitea-data")
              ? "entangle-gitea-1\n"
              : ""
          };
        },
        outputPath,
        repositoryRoot: await createTempRoot("entangle-service-volume-repo-running-")
      })
    ).rejects.toThrow("gitea-data");

    expect(commandCalls).toHaveLength(1);
    expect(commandCalls[0]).toMatchObject({
      args: ["ps", "--filter", "volume=gitea-data", "--format", "{{.Names}}"],
      command: "docker"
    });
  });

  it("plans service-volume import from a validated manifest without executing Docker", async () => {
    const bundleRoot = path.join(
      await createTempRoot("entangle-service-volume-import-"),
      "bundle"
    );
    await writeJson(path.join(bundleRoot, "manifest.json"), {
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
    await writeText(path.join(bundleRoot, "gitea-data.tar"), "tar-bytes");

    const commandCalls: Array<{ args: string[]; command: string }> = [];
    const summary = await createDeploymentServiceVolumeImport({
      commandRunner: (command, args) => {
        commandCalls.push({ args, command });
        return {
          signal: null,
          status: 0,
          stderr: "",
          stdout: ""
        };
      },
      dryRun: true,
      inputPath: bundleRoot,
      now: () => new Date("2026-05-09T00:00:00.000Z"),
      repositoryRoot: await createTempRoot("entangle-service-volume-import-repo-")
    });

    expect(commandCalls).toEqual([]);
    expect(summary).toMatchObject({
      dryRun: true,
      imported: false,
      secretVolumeIncluded: false,
      volumeCount: 1
    });
    expect(summary.volumes[0]).toMatchObject({
      archivePath: path.join(bundleRoot, "gitea-data.tar"),
      status: "planned",
      volume: "gitea-data"
    });
  });

  it("rejects non-dry-run service-volume import without stopped-service acknowledgement", async () => {
    const bundleRoot = path.join(
      await createTempRoot("entangle-service-volume-import-ack-"),
      "bundle"
    );
    await writeJson(path.join(bundleRoot, "manifest.json"), {
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
    await writeText(path.join(bundleRoot, "gitea-data.tar"), "tar-bytes");

    await expect(
      createDeploymentServiceVolumeImport({
        commandRunner: () => {
          throw new Error("Docker must not run without acknowledgement.");
        },
        inputPath: bundleRoot,
        repositoryRoot: await createTempRoot("entangle-service-volume-import-ack-repo-")
      })
    ).rejects.toThrow("--assume-services-stopped");
  });

  it("rejects service-volume import when a target volume is still mounted by a running container", async () => {
    const bundleRoot = path.join(
      await createTempRoot("entangle-service-volume-import-running-"),
      "bundle"
    );
    await writeJson(path.join(bundleRoot, "manifest.json"), {
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
    await writeText(path.join(bundleRoot, "gitea-data.tar"), "tar-bytes");
    const commandCalls: Array<{ args: string[]; command: string }> = [];

    await expect(
      createDeploymentServiceVolumeImport({
        assumeServicesStopped: true,
        commandRunner: (command, args) => {
          commandCalls.push({ args, command });
          return {
            signal: null,
            status: 0,
            stderr: "",
            stdout: "entangle-gitea-1\n"
          };
        },
        inputPath: bundleRoot,
        repositoryRoot: await createTempRoot("entangle-service-volume-import-running-repo-")
      })
    ).rejects.toThrow("gitea-data");

    expect(commandCalls).toEqual([
      {
        args: ["ps", "--filter", "volume=gitea-data", "--format", "{{.Names}}"],
        command: "docker"
      }
    ]);
  });
});
