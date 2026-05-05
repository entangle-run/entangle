import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createDeploymentBackup,
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
});
