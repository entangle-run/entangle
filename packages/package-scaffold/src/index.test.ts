import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  AgentPackageScaffoldConflictError,
  createAgentPackageScaffold
} from "./index.js";

const createdDirectories: string[] = [];

async function readTextFile(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

afterEach(async () => {
  await Promise.all(
    createdDirectories
      .splice(0)
      .map((directoryPath) => rm(directoryPath, { force: true, recursive: true }))
  );
});

describe("createAgentPackageScaffold", () => {
  it("creates a portable agent package skeleton with the expected contract files", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "entangle-package-"));
    createdDirectories.push(tempRoot);
    const targetDirectory = path.join(tempRoot, "marketing-lead");

    const result = await createAgentPackageScaffold(targetDirectory, {
      defaultNodeKind: "supervisor",
      name: "Marketing Lead"
    });

    expect(result.manifest.packageId).toBe("marketing-lead");
    expect(result.manifest.defaultNodeKind).toBe("supervisor");
    expect(result.writtenFiles).toContain("manifest.json");
    expect(result.writtenFiles).toContain("memory/schema/AGENTS.md");
    expect(result.writtenFiles).toContain("runtime/tools.json");

    await expect(readTextFile(path.join(targetDirectory, "manifest.json"))).resolves.toContain(
      '"packageId": "marketing-lead"'
    );
    await expect(readTextFile(path.join(targetDirectory, "runtime/tools.json"))).resolves.toContain(
      '"tools": []'
    );
    await expect(
      readTextFile(path.join(targetDirectory, "prompts/system.md"))
    ).resolves.toContain("You are an Entangle node");
    await expect(
      readTextFile(path.join(targetDirectory, "memory/seed/wiki/index.md"))
    ).resolves.toContain("# Wiki Index");
  });

  it("rejects accidental overwrites unless overwrite is explicit", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "entangle-package-"));
    createdDirectories.push(tempRoot);
    const targetDirectory = path.join(tempRoot, "existing-package");

    await createAgentPackageScaffold(targetDirectory);
    await writeFile(
      path.join(targetDirectory, "prompts/system.md"),
      "custom prompt\n",
      "utf8"
    );

    await expect(createAgentPackageScaffold(targetDirectory)).rejects.toBeInstanceOf(
      AgentPackageScaffoldConflictError
    );
    await expect(
      readTextFile(path.join(targetDirectory, "prompts/system.md"))
    ).resolves.toBe("custom prompt\n");

    await createAgentPackageScaffold(targetDirectory, {
      overwrite: true
    });

    await expect(
      readTextFile(path.join(targetDirectory, "prompts/system.md"))
    ).resolves.toContain("You are an Entangle node");
  });
});
