import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildLocalRepairReport,
  formatLocalRepairText
} from "./local-repair-command.js";
import type { LocalDoctorDeps } from "./local-doctor-command.js";

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

function createRepairDeps(): LocalDoctorDeps {
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
        product: "entangle-local",
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

describe("local repair command helpers", () => {
  it("previews safe host-state initialization by default", async () => {
    const repositoryRoot = await createTempRoot("entangle-repair-preview-");

    const report = await buildLocalRepairReport(
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
    expect(formatLocalRepairText(report)).toContain("dry-run");
  });

  it("applies safe host-state initialization and records the repair", async () => {
    const repositoryRoot = await createTempRoot("entangle-repair-apply-");

    const report = await buildLocalRepairReport(
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

  it("blocks repair when the existing state layout is from a future version", async () => {
    const repositoryRoot = await createTempRoot("entangle-repair-future-");
    await writeJson(path.join(repositoryRoot, ".entangle/host/state-layout.json"), {
      createdAt: "2026-04-26T00:00:00.000Z",
      layoutVersion: 99,
      product: "entangle-local",
      schemaVersion: "1",
      updatedAt: "2026-04-26T00:00:00.000Z"
    });

    const report = await buildLocalRepairReport(
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
});
