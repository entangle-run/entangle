import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildDeploymentRepairReport,
  formatDeploymentRepairText
} from "./deployment-repair-command.js";
import type { DeploymentDoctorDeps } from "./deployment-doctor-command.js";

const temporaryRoots: string[] = [];

async function createTempRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), prefix));
  temporaryRoots.push(root);
  return root;
}

async function writeText(filePath: string, value: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, value, "utf8");
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8")) as unknown;
}

async function writeCurrentHostState(repositoryRoot: string): Promise<void> {
  for (const directory of [
    "desired",
    "observed",
    "traces",
    "imports",
    "workspaces",
    "cache"
  ]) {
    await mkdir(path.join(repositoryRoot, ".entangle/host", directory), {
      recursive: true
    });
  }
  await writeJson(path.join(repositoryRoot, ".entangle/host/state-layout.json"), {
    createdAt: "2026-04-26T00:00:00.000Z",
    layoutVersion: 1,
    product: "entangle",
    schemaVersion: "1",
    updatedAt: "2026-04-26T00:00:00.000Z"
  });
}

function createRepairDeps(): DeploymentDoctorDeps {
  return {
    commandRunner: (command) => ({
      status: 0,
      stdout: `${command} ok\n`,
      stderr: ""
    }),
    fileExists: () => true,
    now: () => new Date("2026-04-26T00:00:00.000Z"),
    readFile: () =>
      JSON.stringify({
        createdAt: "2026-04-26T00:00:00.000Z",
        layoutVersion: 1,
        product: "entangle",
        schemaVersion: "1",
        updatedAt: "2026-04-26T00:00:00.000Z"
      })
  };
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true }))
  );
});

describe("deployment repair command helpers", () => {
  it("previews safe host-state initialization by default", async () => {
    const repositoryRoot = await createTempRoot("entangle-repair-preview-");

    const report = await buildDeploymentRepairReport(
      {
        repositoryRoot,
        skipLive: true
      },
      {
        ...createRepairDeps(),
        fileExists: (filePath) => !filePath.includes(".entangle/host")
      }
    );

    expect(report).toMatchObject({
      applied: false,
      status: "would_repair",
      summary: {
        pending: 1
      }
    });
    expect(report.actions[0]).toMatchObject({
      actionId: "initialize_host_state_skeleton",
      risk: "safe",
      status: "pending"
    });
    expect(formatDeploymentRepairText(report)).toContain("dry-run");
  });

  it("applies safe host-state initialization and records the repair", async () => {
    const repositoryRoot = await createTempRoot("entangle-repair-apply-");

    const report = await buildDeploymentRepairReport(
      {
        applySafe: true,
        repositoryRoot,
        skipLive: true
      },
      {
        ...createRepairDeps(),
        fileExists: (filePath) => !filePath.includes(".entangle/host")
      }
    );

    expect(report).toMatchObject({
      applied: true,
      status: "repaired",
      summary: {
        applied: 1
      }
    });
    expect(
      await readJson(path.join(repositoryRoot, ".entangle/host/state-layout.json"))
    ).toMatchObject({
      layoutVersion: 1,
      product: "entangle"
    });
    expect(report.repairRecordPath).toBeDefined();
    expect(await readJson(report.repairRecordPath!)).toMatchObject({
      schemaVersion: "1",
      status: "repaired"
    });
  });

  it("applies safe repair for missing host-state directories", async () => {
    const repositoryRoot = await createTempRoot("entangle-repair-dirs-");
    await mkdir(path.join(repositoryRoot, ".entangle/host/desired"), {
      recursive: true
    });
    await writeJson(path.join(repositoryRoot, ".entangle/host/state-layout.json"), {
      createdAt: "2026-04-26T00:00:00.000Z",
      layoutVersion: 1,
      product: "entangle",
      schemaVersion: "1",
      updatedAt: "2026-04-26T00:00:00.000Z"
    });

    const preview = await buildDeploymentRepairReport(
      {
        repositoryRoot,
        skipLive: true
      },
      createRepairDeps()
    );

    expect(preview).toMatchObject({
      applied: false,
      status: "would_repair",
      summary: {
        pending: 1
      }
    });
    expect(preview.actions[0]).toMatchObject({
      actionId: "create_missing_host_state_directories",
      risk: "safe",
      status: "pending"
    });
    expect(preview.actions[0]?.detail).toContain("observed");

    const report = await buildDeploymentRepairReport(
      {
        applySafe: true,
        repositoryRoot,
        skipLive: true
      },
      createRepairDeps()
    );

    expect(report).toMatchObject({
      applied: true,
      status: "repaired",
      summary: {
        applied: 1
      }
    });

    for (const directory of [
      "desired",
      "observed",
      "traces",
      "imports",
      "workspaces",
      "cache"
    ]) {
      expect(
        (await stat(path.join(repositoryRoot, ".entangle/host", directory)))
          .isDirectory()
      ).toBe(true);
    }
    expect(report.repairRecordPath).toBeDefined();
  });

  it("blocks repair when the existing state layout is from a future version", async () => {
    const repositoryRoot = await createTempRoot("entangle-repair-future-");
    await writeJson(path.join(repositoryRoot, ".entangle/host/state-layout.json"), {
      createdAt: "2026-04-26T00:00:00.000Z",
      layoutVersion: 99,
      product: "entangle",
      schemaVersion: "1",
      updatedAt: "2026-04-26T00:00:00.000Z"
    });

    const report = await buildDeploymentRepairReport(
      {
        applySafe: true,
        repositoryRoot,
        skipLive: true
      },
      createRepairDeps()
    );

    expect(report).toMatchObject({
      status: "blocked",
      summary: {
        blocked: 1
      }
    });
    expect(report.actions[0]).toMatchObject({
      actionId: "resolve_unsupported_state_layout",
      status: "blocked"
    });
  });

  it("reports manual previous service-volume migration actions from doctor evidence", async () => {
    const repositoryRoot = await createTempRoot("entangle-repair-service-volume-");
    await writeCurrentHostState(repositoryRoot);

    const report = await buildDeploymentRepairReport(
      {
        repositoryRoot,
        skipLive: true
      },
      {
        ...createRepairDeps(),
        commandRunner: (command, args) => {
          if (
            command === "docker" &&
            args[0] === "volume" &&
            args[1] === "inspect"
          ) {
            return {
              status:
                args[2] === "compose_gitea-data" ||
                args[2] === "strfry-data" ||
                args[2] === "entangle-secret-state"
                  ? 0
                  : 1,
              stdout: "",
              stderr: args[2] === "gitea-data" ? "not found\n" : ""
            };
          }

          return {
            status: 0,
            stdout: `${command} ok\n`,
            stderr: ""
          };
        }
      }
    );

    expect(report).toMatchObject({
      status: "manual",
      summary: {
        manual: 1,
        pending: 0
      }
    });
    expect(report.actions).toEqual([
      expect.objectContaining({
        actionId: "migrate_previous_gitea_data_volume",
        risk: "manual",
        status: "manual"
      })
    ]);
    expect(formatDeploymentRepairText(report)).toContain(
      "MANUAL state:Migrate previous Gitea data volume"
    );
  });

  it("does not apply manual previous service-volume actions with apply-safe", async () => {
    const repositoryRoot = await createTempRoot("entangle-repair-service-manual-");
    await writeCurrentHostState(repositoryRoot);

    const report = await buildDeploymentRepairReport(
      {
        applySafe: true,
        repositoryRoot,
        skipLive: true
      },
      {
        ...createRepairDeps(),
        commandRunner: (command, args) => {
          if (
            command === "docker" &&
            args[0] === "volume" &&
            args[1] === "inspect"
          ) {
            return {
              status:
                args[2] === "compose_strfry-data" ||
                args[2] === "gitea-data" ||
                args[2] === "entangle-secret-state"
                  ? 0
                  : 1,
              stdout: "",
              stderr: args[2] === "strfry-data" ? "not found\n" : ""
            };
          }

          return {
            status: 0,
            stdout: `${command} ok\n`,
            stderr: ""
          };
        }
      }
    );

    expect(report).toMatchObject({
      applied: true,
      status: "manual",
      summary: {
        applied: 0,
        manual: 1
      }
    });
    expect(report.actions[0]).toMatchObject({
      actionId: "migrate_previous_strfry_data_volume",
      status: "manual"
    });
    expect(report.repairRecordPath).toBeUndefined();
  });
});
