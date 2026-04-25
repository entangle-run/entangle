import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { inspectPackageDirectory } from "./package-inspection-command.js";

let temporaryRoots: string[] = [];

async function createTemporaryPackage(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "entangle-package-"));
  temporaryRoots.push(root);

  await mkdir(path.join(root, "prompts"), { recursive: true });
  await mkdir(path.join(root, "runtime"), { recursive: true });
  await mkdir(path.join(root, "memory", "schema"), { recursive: true });
  await mkdir(path.join(root, "memory", "seed", "wiki"), { recursive: true });

  await writeFile(
    path.join(root, "manifest.json"),
    `${JSON.stringify(
      {
        schemaVersion: "1",
        packageId: "local-builder",
        name: "Local Builder",
        version: "0.1.0",
        packageKind: "template",
        defaultNodeKind: "worker",
        capabilities: ["write-reports"],
        entryPrompts: {
          system: "prompts/system.md",
          interaction: "prompts/interaction.md"
        },
        memoryProfile: {
          wikiSeedPath: "memory/seed/wiki",
          schemaPath: "memory/schema/AGENTS.md"
        },
        runtime: {
          configPath: "runtime/config.json",
          capabilitiesPath: "runtime/capabilities.json",
          toolsPath: "runtime/tools.json"
        },
        metadata: {
          tags: ["local"]
        }
      },
      null,
      2
    )}\n`
  );
  await writeFile(path.join(root, "prompts", "system.md"), "System\n");
  await writeFile(path.join(root, "prompts", "interaction.md"), "Interaction\n");
  await writeFile(path.join(root, "runtime", "config.json"), "{}\n");
  await writeFile(path.join(root, "runtime", "capabilities.json"), "{}\n");
  await writeFile(
    path.join(root, "runtime", "tools.json"),
    `${JSON.stringify({ schemaVersion: "1", tools: [] }, null, 2)}\n`
  );
  await writeFile(path.join(root, "memory", "schema", "AGENTS.md"), "Rules\n");

  return root;
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.map((root) => rm(root, { force: true, recursive: true }))
  );
  temporaryRoots = [];
});

describe("inspectPackageDirectory", () => {
  it("projects manifest, package files, tool catalog, and validation state", async () => {
    const packageRoot = await createTemporaryPackage();
    const inspection = await inspectPackageDirectory(packageRoot);

    expect(inspection.manifest).toMatchObject({
      capabilities: ["write-reports"],
      defaultNodeKind: "worker",
      name: "Local Builder",
      packageId: "local-builder",
      tags: ["local"]
    });
    expect(inspection.validation.ok).toBe(true);
    expect(inspection.toolCatalog).toEqual({
      exists: true,
      path: "runtime/tools.json",
      toolCount: 0,
      toolIds: [],
      valid: true
    });
    expect(inspection.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          exists: true,
          pathKind: "file",
          relativePath: "runtime/tools.json",
          role: "runtime_tools"
        }),
        expect.objectContaining({
          exists: true,
          pathKind: "directory",
          relativePath: "memory/seed/wiki",
          role: "memory_seed"
        })
      ])
    );
  });

  it("keeps inspection useful when manifest parsing fails", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "entangle-package-invalid-"));
    temporaryRoots.push(root);
    await writeFile(path.join(root, "manifest.json"), "{not-json");

    const inspection = await inspectPackageDirectory(root);

    expect(inspection.manifest).toBeUndefined();
    expect(inspection.parseErrors).toHaveLength(1);
    expect(inspection.validation.ok).toBe(false);
    expect(inspection.files).toEqual([
      expect.objectContaining({
        exists: true,
        relativePath: "manifest.json"
      })
    ]);
  });
});
