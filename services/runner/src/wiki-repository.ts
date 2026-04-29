import { spawn } from "node:child_process";
import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import type {
  ArtifactRecord,
  EffectiveRuntimeContext,
  GitRepositoryTarget,
  GitRepositoryTargetSelector,
  MemoryRepositorySyncOutcome
} from "@entangle/types";
import {
  artifactRecordSchema,
  resolveGitRepositoryTargetForArtifactLocator
} from "@entangle/types";
import { buildGitCommandEnvForRemoteOperation } from "./artifact-backend.js";
import type { RunnerStatePaths } from "./state-store.js";
import {
  readArtifactRecord,
  writeArtifactRecord
} from "./state-store.js";

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
  options: { allowFailure?: boolean; env?: NodeJS.ProcessEnv | undefined } = {}
): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  await mkdir(repoPath, { recursive: true });

  return new Promise((resolve, reject) => {
    const child = spawn("git", args, {
      cwd: repoPath,
      env: {
        ...process.env,
        ...options.env
      },
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

function sanitizeIdentifier(input: string): string {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized.length > 0 ? normalized : "wiki";
}

function buildWikiPublicationArtifactId(input: {
  commit: string;
  isPrimaryTarget: boolean;
  nodeId: string;
  target: GitRepositoryTarget;
}): string {
  const base = `wiki-${sanitizeIdentifier(input.nodeId)}-${input.commit.slice(0, 12)}`;

  if (input.isPrimaryTarget) {
    return base;
  }

  return [
    base,
    sanitizeIdentifier(input.target.gitServiceRef),
    sanitizeIdentifier(input.target.namespace),
    sanitizeIdentifier(input.target.repositoryName)
  ].join("-");
}

function buildWikiPublicationBranch(nodeId: string): string {
  return `${sanitizeIdentifier(nodeId)}/wiki-repository`;
}

function buildGitRemoteName(gitServiceRef: string): string {
  return `entangle-${sanitizeIdentifier(gitServiceRef)}`;
}

async function ensureGitRemote(input: {
  env?: NodeJS.ProcessEnv | undefined;
  remoteName: string;
  remoteUrl: string;
  repoPath: string;
}): Promise<void> {
  const currentRemote = await runGitCommand(
    input.repoPath,
    ["remote", "get-url", input.remoteName],
    {
      allowFailure: true,
      env: input.env
    }
  );

  if (!currentRemote.ok || !currentRemote.stdout) {
    await runGitCommand(
      input.repoPath,
      ["remote", "add", input.remoteName, input.remoteUrl],
      { env: input.env }
    );
    return;
  }

  if (currentRemote.stdout !== input.remoteUrl) {
    await runGitCommand(
      input.repoPath,
      ["remote", "set-url", input.remoteName, input.remoteUrl],
      { env: input.env }
    );
  }
}

function buildWikiPublicationArtifactRecord(input: {
  branchName: string;
  commit: string;
  context: EffectiveRuntimeContext;
  isPrimaryTarget: boolean;
  repositoryRoot: string;
  target: GitRepositoryTarget;
  timestamp: string;
}): ArtifactRecord {
  const artifactId = buildWikiPublicationArtifactId({
    commit: input.commit,
    isPrimaryTarget: input.isPrimaryTarget,
    nodeId: input.context.binding.node.nodeId,
    target: input.target
  });

  return artifactRecordSchema.parse({
    createdAt: input.timestamp,
    materialization: {
      repoPath: input.repositoryRoot
    },
    publication: {
      state: "not_requested"
    },
    ref: {
      artifactId,
      artifactKind: "knowledge_summary",
      backend: "git",
      contentSummary:
        `Wiki repository snapshot for '${input.context.binding.node.nodeId}'.`,
      createdByNodeId: input.context.binding.node.nodeId,
      locator: {
        branch: input.branchName,
        commit: input.commit,
        gitServiceRef: input.target.gitServiceRef,
        namespace: input.target.namespace,
        path: ".",
        repositoryName: input.target.repositoryName
      },
      preferred: true,
      status: "materialized"
    },
    updatedAt: input.timestamp
  });
}

function publicationTargetsEqual(
  left: GitRepositoryTarget | undefined,
  right: GitRepositoryTarget | undefined
): boolean {
  return (
    !!left &&
    !!right &&
    left.gitServiceRef === right.gitServiceRef &&
    left.namespace === right.namespace &&
    left.repositoryName === right.repositoryName
  );
}

function resolveWikiPublicationTarget(input: {
  context: EffectiveRuntimeContext;
  target?: GitRepositoryTargetSelector | undefined;
}):
  | {
      isPrimaryTarget: boolean;
      target: GitRepositoryTarget;
    }
  | {
      reason: string;
    } {
  const primaryTarget = input.context.artifactContext.primaryGitRepositoryTarget;

  if (!input.target) {
    if (!primaryTarget) {
      return {
        reason:
          `Runtime '${input.context.binding.node.nodeId}' has no primary git repository target.`
      };
    }

    return {
      isPrimaryTarget: true,
      target: primaryTarget
    };
  }

  const gitServiceRef =
    input.target.gitServiceRef ??
    primaryTarget?.gitServiceRef ??
    input.context.artifactContext.primaryGitServiceRef;
  const namespace =
    input.target.namespace ??
    primaryTarget?.namespace ??
    input.context.artifactContext.defaultNamespace;
  const repositoryName =
    input.target.repositoryName ?? primaryTarget?.repositoryName;

  if (!gitServiceRef || !namespace || !repositoryName) {
    return {
      reason:
        `Runtime '${input.context.binding.node.nodeId}' could not resolve wiki publication target ` +
        "because gitServiceRef, namespace, and repositoryName are required after defaults are applied."
    };
  }

  const target = resolveGitRepositoryTargetForArtifactLocator({
    artifactContext: input.context.artifactContext,
    locator: {
      branch: "target-resolution",
      commit: "target-resolution",
      gitServiceRef,
      namespace,
      path: ".",
      repositoryName
    }
  });

  if (!target) {
    return {
      reason:
        `Runtime '${input.context.binding.node.nodeId}' could not resolve wiki git publication target ` +
        `'${gitServiceRef}/${namespace}/${repositoryName}' from its artifact context.`
    };
  }

  return {
    isPrimaryTarget: publicationTargetsEqual(target, primaryTarget),
    target
  };
}

async function publishWikiArtifactRecord(input: {
  artifactRecord: ArtifactRecord;
  branchName: string;
  context: EffectiveRuntimeContext;
  repositoryRoot: string;
  target: GitRepositoryTarget;
}): Promise<ArtifactRecord> {
  const remoteName = buildGitRemoteName(input.target.gitServiceRef);
  const attemptTimestamp = new Date().toISOString();
  const failPublication = (lastError: string): ArtifactRecord =>
    artifactRecordSchema.parse({
      ...input.artifactRecord,
      publication: {
        lastAttemptAt: attemptTimestamp,
        lastError,
        remoteName,
        remoteUrl: input.target.remoteUrl,
        state: "failed"
      },
      updatedAt: attemptTimestamp
    });

  if (input.artifactRecord.ref.backend !== "git") {
    throw new Error(
      `Wiki publication requires a git artifact ref for '${input.artifactRecord.ref.artifactId}'.`
    );
  }

  try {
    const gitEnv = await buildGitCommandEnvForRemoteOperation({
      context: input.context,
      target: input.target
    });
    await ensureGitRemote({
      env: gitEnv,
      remoteName,
      remoteUrl: input.target.remoteUrl,
      repoPath: input.repositoryRoot
    });
    await runGitCommand(
      input.repositoryRoot,
      [
        "push",
        "--set-upstream",
        remoteName,
        `${input.artifactRecord.ref.locator.commit}:refs/heads/${input.branchName}`
      ],
      { env: gitEnv }
    );

    return artifactRecordSchema.parse({
      ...input.artifactRecord,
      publication: {
        publishedAt: attemptTimestamp,
        remoteName,
        remoteUrl: input.target.remoteUrl,
        state: "published"
      },
      ref: {
        ...input.artifactRecord.ref,
        status: "published"
      },
      updatedAt: attemptTimestamp
    });
  } catch (error) {
    return failPublication(
      error instanceof Error && error.message.trim().length > 0
        ? sanitizeSyncFailureReason(input.context, error)
        : "Unknown wiki publication failure."
    );
  }
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

export type WikiRepositoryPublicationResult =
  | {
      artifact: ArtifactRecord;
      published: true;
      sync: MemoryRepositorySyncOutcome;
    }
  | {
      artifact?: ArtifactRecord;
      published: false;
      reason: string;
      sync?: MemoryRepositorySyncOutcome;
    };

export async function publishWikiRepositoryToGitTarget(input: {
  context: EffectiveRuntimeContext;
  reason?: string;
  requestedAt: string;
  requestedBy?: string;
  retryFailedPublication?: boolean;
  statePaths: RunnerStatePaths;
  target?: GitRepositoryTargetSelector | undefined;
}): Promise<WikiRepositoryPublicationResult> {
  const repositoryRoot = input.context.workspace.wikiRepositoryRoot;

  if (!repositoryRoot) {
    return {
      published: false,
      reason: "Runtime context does not define a wiki repository root."
    };
  }

  const sync = await syncWikiRepository(input.context, {
    turnId: "wiki-publication"
  });

  if (sync.status === "failed" || sync.status === "not_configured") {
    return {
      published: false,
      reason: sync.reason,
      sync
    };
  }

  const commit = sync.commit ?? (await readCurrentHeadCommit(repositoryRoot));

  if (!commit) {
    return {
      published: false,
      reason: "Wiki repository has no committed snapshot.",
      sync
    };
  }

  const resolvedTarget = resolveWikiPublicationTarget({
    context: input.context,
    ...(input.target ? { target: input.target } : {})
  });

  if ("reason" in resolvedTarget) {
    return {
      published: false,
      reason: resolvedTarget.reason,
      sync
    };
  }

  const target = resolvedTarget.target;
  const branchName = buildWikiPublicationBranch(input.context.binding.node.nodeId);
  const localArtifact = buildWikiPublicationArtifactRecord({
    branchName,
    commit,
    context: input.context,
    isPrimaryTarget: resolvedTarget.isPrimaryTarget,
    repositoryRoot,
    target,
    timestamp: input.requestedAt
  });
  const existingArtifact = await readArtifactRecord(
    input.statePaths,
    localArtifact.ref.artifactId
  );
  const publicationState = existingArtifact?.publication?.state;

  if (existingArtifact && publicationState && publicationState !== "failed") {
    return {
      artifact: existingArtifact,
      published: false,
      reason:
        `Wiki publication artifact '${existingArtifact.ref.artifactId}' already has publication metadata.`,
      sync
    };
  }

  if (
    existingArtifact &&
    publicationState === "failed" &&
    !input.retryFailedPublication
  ) {
    return {
      artifact: existingArtifact,
      published: false,
      reason:
        `Wiki publication artifact '${existingArtifact.ref.artifactId}' already has failed publication metadata; retry is required.`,
      sync
    };
  }

  const artifact = await publishWikiArtifactRecord({
    artifactRecord: existingArtifact ?? localArtifact,
    branchName,
    context: input.context,
    repositoryRoot,
    target
  });

  await writeArtifactRecord(input.statePaths, artifact);

  if (artifact.publication?.state !== "published") {
    return {
      artifact,
      published: false,
      reason:
        artifact.publication?.lastError ??
        `Wiki publication artifact '${artifact.ref.artifactId}' was not published.`,
      sync
    };
  }

  return {
    artifact,
    published: true,
    sync
  };
}
