import { spawn } from "node:child_process";
import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import type {
  EffectiveRuntimeContext,
  MemoryRepositorySyncOutcome
} from "@entangle/types";

const wikiRepositoryBranchName = "entangle-wiki";

function nowIsoString(): string {
  return new Date().toISOString();
}

function sanitizeSyncFailureReason(
  context: EffectiveRuntimeContext,
  error: unknown
): string {
  const raw =
    error instanceof Error
      ? error.message
      : "Wiki repository sync failed unexpectedly.";
  const wikiRoot = path.join(context.workspace.memoryRoot, "wiki");
  const replacements: Array<[string, string]> = [
    [wikiRoot, "<memory_wiki>"],
    [context.workspace.memoryRoot, "<memory>"]
  ];

  if (context.workspace.wikiRepositoryRoot) {
    replacements.push([
      context.workspace.wikiRepositoryRoot,
      "<wiki_repository>"
    ]);
  }

  replacements.push([context.workspace.root, "<workspace>"]);

  return replacements.reduce(
    (message, [target, replacement]) => message.replaceAll(target, replacement),
    raw
  );
}

async function isDirectory(directoryPath: string): Promise<boolean> {
  try {
    return (await stat(directoryPath)).isDirectory();
  } catch {
    return false;
  }
}

async function runGitCommand(
  repoPath: string,
  args: string[],
  options: { allowFailure?: boolean } = {}
): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  await mkdir(repoPath, { recursive: true });

  return new Promise((resolve, reject) => {
    const child = spawn("git", args, {
      cwd: repoPath,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      const ok = code === 0;

      if (ok || options.allowFailure) {
        resolve({
          ok,
          stderr: stderr.trim(),
          stdout: stdout.trim()
        });
        return;
      }

      reject(
        new Error(
          `Git command failed (${args.join(" ")}): ${
            stderr.trim() || stdout.trim() || "unknown error"
          }`
        )
      );
    });
  });
}

function resolveWikiGitAttribution(context: EffectiveRuntimeContext): {
  email: string;
  name: string;
} {
  const primaryBinding =
    context.artifactContext.primaryGitPrincipalRef
      ? context.artifactContext.gitPrincipalBindings.find(
          (binding) =>
            binding.principal.principalId ===
            context.artifactContext.primaryGitPrincipalRef
        )
      : undefined;
  const attribution = primaryBinding?.principal.attribution;

  return {
    email:
      attribution?.email ?? `${context.binding.node.nodeId}@entangle.invalid`,
    name: attribution?.displayName ?? context.binding.node.displayName
  };
}

async function ensureWikiRepository(context: EffectiveRuntimeContext): Promise<void> {
  const repoPath = context.workspace.wikiRepositoryRoot;

  if (!repoPath) {
    return;
  }

  if (!(await isDirectory(path.join(repoPath, ".git")))) {
    await runGitCommand(repoPath, [
      "init",
      `--initial-branch=${wikiRepositoryBranchName}`
    ]);
  } else {
    await runGitCommand(repoPath, ["checkout", "-B", wikiRepositoryBranchName]);
  }

  const attribution = resolveWikiGitAttribution(context);
  await runGitCommand(repoPath, ["config", "user.name", attribution.name]);
  await runGitCommand(repoPath, ["config", "user.email", attribution.email]);
}

async function mirrorWikiFiles(input: {
  repositoryRoot: string;
  wikiRoot: string;
}): Promise<void> {
  await mkdir(input.repositoryRoot, { recursive: true });
  const existingEntries = await readdir(input.repositoryRoot, {
    withFileTypes: true
  });

  await Promise.all(
    existingEntries
      .filter((entry) => entry.name !== ".git")
      .map((entry) =>
        rm(path.join(input.repositoryRoot, entry.name), {
          force: true,
          recursive: true
        })
      )
  );

  const wikiEntries = await readdir(input.wikiRoot, { withFileTypes: true });
  await Promise.all(
    wikiEntries.map((entry) =>
      cp(
        path.join(input.wikiRoot, entry.name),
        path.join(input.repositoryRoot, entry.name),
        {
          force: true,
          recursive: true
        }
      )
    )
  );
}

async function readCurrentHeadCommit(
  repositoryRoot: string
): Promise<string | undefined> {
  const result = await runGitCommand(
    repositoryRoot,
    ["rev-parse", "--verify", "HEAD"],
    { allowFailure: true }
  );

  return result.ok ? result.stdout : undefined;
}

export async function syncWikiRepository(
  context: EffectiveRuntimeContext,
  input: { turnId: string }
): Promise<MemoryRepositorySyncOutcome> {
  const syncedAt = nowIsoString();
  const repositoryRoot = context.workspace.wikiRepositoryRoot;
  const wikiRoot = path.join(context.workspace.memoryRoot, "wiki");

  if (!repositoryRoot) {
    return {
      reason: "Runtime context does not define a wiki repository root.",
      status: "not_configured",
      syncedAt
    };
  }

  try {
    if (!(await isDirectory(wikiRoot))) {
      return {
        reason: "Runtime memory wiki root is missing or is not a directory.",
        status: "not_configured",
        syncedAt
      };
    }

    await ensureWikiRepository(context);
    await mirrorWikiFiles({
      repositoryRoot,
      wikiRoot
    });
    await runGitCommand(repositoryRoot, ["add", "--all"]);
    const status = await runGitCommand(repositoryRoot, ["status", "--porcelain"]);
    const changedFiles = status.stdout
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0);

    if (changedFiles.length === 0) {
      const commit = await readCurrentHeadCommit(repositoryRoot);

      return {
        branch: wikiRepositoryBranchName,
        ...(commit ? { commit } : {}),
        status: "unchanged",
        syncedAt
      };
    }

    await runGitCommand(repositoryRoot, [
      "commit",
      "-m",
      `Update wiki memory for ${input.turnId}`
    ]);
    const commit = await runGitCommand(repositoryRoot, ["rev-parse", "HEAD"]);

    return {
      branch: wikiRepositoryBranchName,
      changedFileCount: changedFiles.length,
      commit: commit.stdout,
      status: "committed",
      syncedAt
    };
  } catch (error: unknown) {
    return {
      reason: sanitizeSyncFailureReason(context, error),
      status: "failed",
      syncedAt
    };
  }
}
