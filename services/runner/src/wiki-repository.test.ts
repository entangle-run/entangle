import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { cleanupRuntimeFixtures, createRuntimeFixture } from "./test-fixtures.js";
import { syncWikiRepository } from "./wiki-repository.js";

afterEach(async () => {
  await cleanupRuntimeFixtures();
});

describe("wiki repository sync", () => {
  it("commits a runner-owned snapshot of the memory wiki", async () => {
    const { context } = await createRuntimeFixture();
    const wikiRoot = path.join(context.workspace.memoryRoot, "wiki");
    const repositoryRoot = context.workspace.wikiRepositoryRoot;

    if (!repositoryRoot) {
      throw new Error("Expected a wiki repository root in the runtime fixture.");
    }

    await mkdir(path.join(wikiRoot, "summaries"), { recursive: true });
    await writeFile(
      path.join(wikiRoot, "summaries", "working-context.md"),
      "# Working Context\n\nCurrent task state.\n",
      "utf8"
    );
    await writeFile(
      path.join(repositoryRoot, "stale.md"),
      "This file should be removed by the next snapshot.\n",
      "utf8"
    );

    const firstSync = await syncWikiRepository(context, {
      turnId: "turn-alpha"
    });

    expect(firstSync).toMatchObject({
      branch: "entangle-wiki",
      changedFileCount: 2,
      status: "committed"
    });
    if (firstSync.status !== "committed") {
      throw new Error("Expected wiki repository sync to create a commit.");
    }

    const gitDirectoryStats = await stat(path.join(repositoryRoot, ".git"));
    expect(gitDirectoryStats.isDirectory()).toBe(true);
    await expect(
      readFile(path.join(repositoryRoot, "index.md"), "utf8")
    ).resolves.toContain("# Wiki Index");
    await expect(
      readFile(path.join(repositoryRoot, "summaries", "working-context.md"), "utf8")
    ).resolves.toContain("Current task state.");
    await expect(stat(path.join(repositoryRoot, "stale.md"))).rejects.toMatchObject({
      code: "ENOENT"
    });

    const headCommit = spawnSync(
      "git",
      ["-C", repositoryRoot, "rev-parse", "HEAD"],
      { encoding: "utf8" }
    );
    expect(headCommit.status).toBe(0);
    expect(headCommit.stdout.trim()).toBe(firstSync.commit);

    const authorEmail = spawnSync(
      "git",
      ["-C", repositoryRoot, "log", "-1", "--format=%ae"],
      { encoding: "utf8" }
    );
    expect(authorEmail.status).toBe(0);
    expect(authorEmail.stdout.trim()).toBe("worker-it@entangle.example");

    const secondSync = await syncWikiRepository(context, {
      turnId: "turn-beta"
    });

    expect(secondSync).toMatchObject({
      branch: "entangle-wiki",
      commit: firstSync.commit,
      status: "unchanged"
    });
  });
});
