import { stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupRuntimeFixtures,
  createRuntimeFixture
} from "./test-fixtures.js";
import {
  harvestSourceChanges,
  prepareSourceChangeHarvest
} from "./source-change-harvester.js";

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

afterEach(async () => {
  await cleanupRuntimeFixtures();
});

describe("source change harvester", () => {
  it("uses a runner-owned shadow git dir without creating .git in the source workspace", async () => {
    const fixture = await createRuntimeFixture();
    const sourceRoot = fixture.context.workspace.sourceWorkspaceRoot!;
    const baseline = await prepareSourceChangeHarvest(fixture.context);

    await writeFile(
      path.join(sourceRoot, "generated.ts"),
      "export const generated = true;\n",
      "utf8"
    );

    const summary = await harvestSourceChanges(fixture.context, baseline);

    expect(summary).toMatchObject({
      additions: 1,
      deletions: 0,
      fileCount: 1,
      status: "changed"
    });
    expect(summary.files).toEqual([
      {
        additions: 1,
        deletions: 0,
        path: "generated.ts",
        status: "added"
      }
    ]);
    expect(summary.diffExcerpt).toContain("export const generated = true;");
    await expect(pathExists(path.join(sourceRoot, ".git"))).resolves.toBe(false);
    await expect(
      pathExists(path.join(fixture.context.workspace.runtimeRoot, "source-snapshot.git"))
    ).resolves.toBe(true);
  });

  it("reports unchanged when the source tree is stable across the turn", async () => {
    const fixture = await createRuntimeFixture();
    const baseline = await prepareSourceChangeHarvest(fixture.context);
    const summary = await harvestSourceChanges(fixture.context, baseline);

    expect(summary).toMatchObject({
      fileCount: 0,
      status: "unchanged"
    });
  });
});
