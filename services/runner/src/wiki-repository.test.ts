import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { cleanupRuntimeFixtures, createRuntimeFixture } from "./test-fixtures.js";
import {
  publishWikiRepositoryToGitTarget,
  syncWikiRepository
} from "./wiki-repository.js";
import {
  ensureRunnerStatePaths,
  readArtifactRecord
} from "./state-store.js";

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

  it("publishes a runner-owned wiki snapshot to git targets", async () => {
    const { context, remoteRepositoryPath } = await createRuntimeFixture({
      remotePublication: "bare_repo"
    });
    const wikiRoot = path.join(context.workspace.memoryRoot, "wiki");
    const statePaths = await ensureRunnerStatePaths(context.workspace.runtimeRoot);

    if (!remoteRepositoryPath) {
      throw new Error("Expected a remote repository path.");
    }

    const publicRepositoryPath = path.join(
      path.dirname(remoteRepositoryPath),
      "wiki-public.git"
    );
    const publicInit = spawnSync("git", ["init", "--bare", publicRepositoryPath], {
      encoding: "utf8"
    });
    expect(publicInit.status).toBe(0);

    await mkdir(path.join(wikiRoot, "summaries"), { recursive: true });
    await writeFile(
      path.join(wikiRoot, "summaries", "working-context.md"),
      "# Working Context\n\nPublication-ready memory.\n",
      "utf8"
    );

    const publication = await publishWikiRepositoryToGitTarget({
      context,
      requestedAt: "2026-04-28T10:00:00.000Z",
      requestedBy: "operator-main",
      statePaths
    });

    expect(publication).toMatchObject({
      artifact: {
        publication: {
          state: "published"
        },
        ref: {
          artifactKind: "knowledge_summary",
          backend: "git",
          locator: {
            branch: "worker-it/wiki-repository",
            repositoryName: "graph-alpha"
          },
          status: "published"
        }
      },
      published: true
    });

    if (!publication.published) {
      throw new Error("Expected wiki publication to succeed.");
    }

    const persisted = await readArtifactRecord(
      statePaths,
      publication.artifact.ref.artifactId
    );
    expect(persisted?.publication?.state).toBe("published");

    const remoteHead = spawnSync(
      "git",
      [
        "--git-dir",
        remoteRepositoryPath,
        "rev-parse",
        "refs/heads/worker-it/wiki-repository"
      ],
      { encoding: "utf8" }
    );
    expect(remoteHead.status).toBe(0);
    expect(remoteHead.stdout.trim()).toBe(publication.artifact.ref.locator.commit);

    const publicPublication = await publishWikiRepositoryToGitTarget({
      context,
      requestedAt: "2026-04-28T10:05:00.000Z",
      requestedBy: "operator-main",
      statePaths,
      target: {
        repositoryName: "wiki-public"
      }
    });

    expect(publicPublication).toMatchObject({
      artifact: {
        ref: {
          locator: {
            repositoryName: "wiki-public"
          },
          status: "published"
        }
      },
      published: true
    });

    if (!publicPublication.published) {
      throw new Error("Expected public wiki publication to succeed.");
    }

    expect(publicPublication.artifact.ref.artifactId).not.toBe(
      publication.artifact.ref.artifactId
    );

    const publicRemoteHead = spawnSync(
      "git",
      [
        "--git-dir",
        publicRepositoryPath,
        "rev-parse",
        "refs/heads/worker-it/wiki-repository"
      ],
      { encoding: "utf8" }
    );
    expect(publicRemoteHead.status).toBe(0);
    expect(publicRemoteHead.stdout.trim()).toBe(
      publicPublication.artifact.ref.locator.commit
    );

    const longRepositoryName =
      "graph-alpha-wiki-user-client-extra-long-publication-target";
    const longRepositoryPath = path.join(
      path.dirname(remoteRepositoryPath),
      `${longRepositoryName}.git`
    );
    const longInit = spawnSync("git", ["init", "--bare", longRepositoryPath], {
      encoding: "utf8"
    });
    expect(longInit.status).toBe(0);

    const longTargetPublication = await publishWikiRepositoryToGitTarget({
      context,
      requestedAt: "2026-04-28T10:10:00.000Z",
      requestedBy: "operator-main",
      statePaths,
      target: {
        repositoryName: longRepositoryName
      }
    });

    expect(longTargetPublication).toMatchObject({
      artifact: {
        ref: {
          locator: {
            repositoryName: longRepositoryName
          },
          status: "published"
        }
      },
      published: true
    });

    if (!longTargetPublication.published) {
      throw new Error("Expected long-target wiki publication to succeed.");
    }

    expect(longTargetPublication.artifact.ref.artifactId.length).toBeLessThanOrEqual(
      100
    );
  });
});
