import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import {
  artifactRecordSchema,
  sourceHistoryRecordSchema,
  type ArtifactRecord,
  type EffectiveRuntimeContext,
  type GitRepositoryTarget,
  type SourceChangeCandidateRecord,
  type SourceHistoryRecord
} from "@entangle/types";
import type { RunnerStatePaths } from "./state-store.js";
import {
  readSourceHistoryRecord,
  writeArtifactRecord,
  writeSourceChangeCandidateRecord,
  writeSourceHistoryRecord
} from "./state-store.js";
import { buildGitCommandEnvForRemoteOperation } from "./artifact-backend.js";

type GitCommandOptions = {
  env?: NodeJS.ProcessEnv | undefined;
  gitDir?: string | undefined;
  workTree?: string | undefined;
};

export type SourceChangeApplicationResult =
  | {
      applied: true;
      candidate: SourceChangeCandidateRecord;
      history: SourceHistoryRecord;
    }
  | {
      applied: false;
      candidate: SourceChangeCandidateRecord;
      reason: string;
    };

export type SourceHistoryPublicationResult =
  | {
      artifact: ArtifactRecord;
      history: SourceHistoryRecord;
      published: true;
    }
  | {
      history: SourceHistoryRecord;
      published: false;
      reason: string;
    };

const sourceHistoryBranchName = "entangle-source-history";
const sourceHistoryRef = `refs/heads/${sourceHistoryBranchName}`;
const gitEmptyTreeHash = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

function sanitizeIdentifier(input: string): string {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized.length > 0 ? normalized : `id-${randomUUID()}`;
}

function buildSourceHistoryId(candidateId: string): string {
  const candidateComponent = sanitizeIdentifier(candidateId);
  const raw = `source-history-${candidateComponent}`;

  if (raw.length <= 100) {
    return raw;
  }

  const digest = createHash("sha256").update(candidateId).digest("hex").slice(0, 12);
  const prefix = raw.slice(0, 87).replace(/[._-]+$/g, "");

  return `${prefix}-${digest}`;
}

function sanitizeRuntimePathError(
  context: EffectiveRuntimeContext,
  error: unknown
): string {
  const raw =
    error instanceof Error && error.message.trim().length > 0
      ? error.message
      : "Source history application failed.";

  return ([
    [context.workspace.root, "<workspace_root>"],
    [context.workspace.sourceWorkspaceRoot, "<source_workspace>"],
    [context.workspace.runtimeRoot, "<runtime_state>"]
  ] as Array<[string | undefined, string]>).reduce(
    (message, [targetPath, placeholder]) =>
      targetPath ? message.replaceAll(targetPath, placeholder) : message,
    raw
  );
}

async function pathIsDirectory(targetPath: string): Promise<boolean> {
  try {
    return (await stat(targetPath)).isDirectory();
  } catch {
    return false;
  }
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function runGitCommand(
  cwd: string,
  args: string[],
  options: GitCommandOptions = {}
): Promise<string> {
  const fullArgs = [
    ...(options.gitDir ? ["--git-dir", options.gitDir] : []),
    ...(options.workTree ? ["--work-tree", options.workTree] : []),
    ...args
  ];

  return new Promise((resolve, reject) => {
    const child = spawn("git", fullArgs, {
      cwd,
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
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }

      reject(
        new Error(
          `Git source-history command failed (${args.join(" ")}): ${
            stderr.trim() || stdout.trim() || `exit ${code ?? "unknown"}`
          }`
        )
      );
    });
  });
}

function buildSourceHistoryArtifactId(sourceHistoryId: string): string {
  const raw = `source-${sourceHistoryId}`;

  if (raw.length <= 100) {
    return raw;
  }

  const digest = createHash("sha256")
    .update(sourceHistoryId)
    .digest("hex")
    .slice(0, 12);
  const prefix = raw.slice(0, 87).replace(/[._-]+$/g, "");

  return `${prefix}-${digest}`;
}

function buildSourceHistoryPublicationBranch(history: SourceHistoryRecord): string {
  return [
    sanitizeIdentifier(history.nodeId),
    "source-history",
    sanitizeIdentifier(history.sourceHistoryId)
  ].join("/");
}

function sourceHistoryPublicationRepoRoot(
  context: EffectiveRuntimeContext
): string {
  return path.join(context.workspace.artifactWorkspaceRoot, "source-history");
}

function resolvePrimaryGitAttribution(context: EffectiveRuntimeContext): {
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

async function ensureSourceHistoryPublicationRepo(input: {
  context: EffectiveRuntimeContext;
  repoPath: string;
}): Promise<void> {
  await mkdir(input.repoPath, { recursive: true });

  if (!(await pathExists(path.join(input.repoPath, ".git")))) {
    await runGitCommand(input.repoPath, ["init"]);
  }

  const attribution = resolvePrimaryGitAttribution(input.context);
  await runGitCommand(input.repoPath, ["config", "user.name", attribution.name]);
  await runGitCommand(input.repoPath, [
    "config",
    "user.email",
    attribution.email
  ]);
}

async function cleanSourceHistoryPublicationWorktree(
  repoPath: string
): Promise<void> {
  const entries = await readdir(repoPath);

  await Promise.all(
    entries
      .filter((entry) => entry !== ".git")
      .map((entry) =>
        rm(path.join(repoPath, entry), {
          force: true,
          recursive: true
        })
      )
  );
}

async function materializeSourceHistoryPublicationCommit(input: {
  branchName: string;
  context: EffectiveRuntimeContext;
  history: SourceHistoryRecord;
  repoPath: string;
  sourceGitDir: string;
}): Promise<string> {
  await ensureSourceHistoryPublicationRepo({
    context: input.context,
    repoPath: input.repoPath
  });
  await runGitCommand(input.repoPath, [
    "cat-file",
    "-e",
    `${input.history.commit}^{commit}`
  ], {
    gitDir: input.sourceGitDir
  });
  const sourceTree = await runGitCommand(
    input.repoPath,
    ["rev-parse", `${input.history.commit}^{tree}`],
    {
      gitDir: input.sourceGitDir
    }
  );

  if (sourceTree !== input.history.headTree) {
    throw new Error(
      `Source history commit '${input.history.commit}' does not match recorded head tree '${input.history.headTree}'.`
    );
  }

  await cleanSourceHistoryPublicationWorktree(input.repoPath);

  if (input.history.headTree !== gitEmptyTreeHash) {
    await runGitCommand(
      input.repoPath,
      ["checkout", "--force", input.history.commit, "--", "."],
      {
        gitDir: input.sourceGitDir,
        workTree: input.repoPath
      }
    );
  }

  await runGitCommand(input.repoPath, ["add", "--all", "--", "."]);
  const tree = await runGitCommand(input.repoPath, ["write-tree"]);
  const refName = `refs/heads/${input.branchName}`;
  let parentCommit: string | undefined;
  let parentTree: string | undefined;

  try {
    parentCommit = await runGitCommand(input.repoPath, [
      "rev-parse",
      "--verify",
      `${refName}^{commit}`
    ]);
    parentTree = await runGitCommand(input.repoPath, [
      "rev-parse",
      `${parentCommit}^{tree}`
    ]);
  } catch {
    parentCommit = undefined;
    parentTree = undefined;
  }

  const artifactCommit =
    parentCommit && parentTree === tree
      ? parentCommit
      : await runGitCommand(
          input.repoPath,
          [
            "commit-tree",
            tree,
            "-m",
            [
              `entangle(${input.history.nodeId}): publish ${input.history.sourceHistoryId}`,
              "",
              `source_history: ${input.history.sourceHistoryId}`,
              `candidate: ${input.history.candidateId}`,
              `source_commit: ${input.history.commit}`
            ].join("\n"),
            ...(parentCommit ? ["-p", parentCommit] : [])
          ],
          {
            env: {
              GIT_AUTHOR_EMAIL: `${input.history.nodeId}@entangle.invalid`,
              GIT_AUTHOR_NAME: input.context.binding.node.displayName,
              GIT_COMMITTER_EMAIL: `${input.history.nodeId}@entangle.invalid`,
              GIT_COMMITTER_NAME: input.context.binding.node.displayName
            }
          }
        );

  await runGitCommand(input.repoPath, [
    "update-ref",
    refName,
    artifactCommit,
    ...(parentCommit ? [parentCommit] : [])
  ]);
  await runGitCommand(input.repoPath, ["reset", "--hard", artifactCommit]);

  return artifactCommit;
}

function buildSourceHistoryArtifactRecord(input: {
  artifactCommit: string;
  branchName: string;
  context: EffectiveRuntimeContext;
  history: SourceHistoryRecord;
  repoPath: string;
  target: GitRepositoryTarget;
  timestamp: string;
}): ArtifactRecord {
  const artifactId = buildSourceHistoryArtifactId(input.history.sourceHistoryId);

  return artifactRecordSchema.parse({
    createdAt: input.timestamp,
    materialization: {
      repoPath: input.repoPath
    },
    publication: {
      state: "not_requested"
    },
    ref: {
      artifactId,
      artifactKind: "commit",
      backend: "git",
      contentSummary:
        `Source history '${input.history.sourceHistoryId}' from candidate ` +
        `'${input.history.candidateId}'.`,
      ...(input.history.conversationId
        ? { conversationId: input.history.conversationId }
        : {}),
      createdByNodeId: input.history.nodeId,
      locator: {
        branch: input.branchName,
        commit: input.artifactCommit,
        gitServiceRef: input.target.gitServiceRef,
        namespace: input.target.namespace,
        path: ".",
        repositoryName: input.target.repositoryName
      },
      preferred: true,
      ...(input.history.sessionId ? { sessionId: input.history.sessionId } : {}),
      status: "materialized"
    },
    turnId: input.history.turnId,
    updatedAt: input.timestamp
  });
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
  let currentRemoteUrl: string | undefined;

  try {
    currentRemoteUrl = await runGitCommand(
      input.repoPath,
      ["remote", "get-url", input.remoteName],
      {
        env: input.env
      }
    );
  } catch {
    currentRemoteUrl = undefined;
  }

  if (!currentRemoteUrl) {
    await runGitCommand(
      input.repoPath,
      ["remote", "add", input.remoteName, input.remoteUrl],
      {
        env: input.env
      }
    );
    return;
  }

  if (currentRemoteUrl !== input.remoteUrl) {
    await runGitCommand(
      input.repoPath,
      ["remote", "set-url", input.remoteName, input.remoteUrl],
      {
        env: input.env
      }
    );
  }
}

async function publishSourceHistoryArtifactRecord(input: {
  artifactRecord: ArtifactRecord;
  branchName: string;
  context: EffectiveRuntimeContext;
  repoPath: string;
  target: GitRepositoryTarget;
}): Promise<ArtifactRecord> {
  const remoteName = buildGitRemoteName(input.target.gitServiceRef);
  const attemptTimestamp = new Date().toISOString();
  const artifactRef = input.artifactRecord.ref;
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

  if (artifactRef.backend !== "git") {
    throw new Error(
      `Source history publication requires a git artifact ref for '${artifactRef.artifactId}'.`
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
      repoPath: input.repoPath
    });
    await runGitCommand(
      input.repoPath,
      [
        "push",
        "--set-upstream",
        remoteName,
        `${artifactRef.locator.commit}:refs/heads/${input.branchName}`
      ],
      {
        env: gitEnv
      }
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
    const publicationError =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "Unknown remote git publication failure.";

    return failPublication(publicationError);
  }
}

async function writeCurrentSourceWorkspaceTree(input: {
  gitDir: string;
  sourceWorkspaceRoot: string;
}): Promise<string> {
  await runGitCommand(input.sourceWorkspaceRoot, ["add", "--all", "--", "."], {
    gitDir: input.gitDir,
    workTree: input.sourceWorkspaceRoot
  });

  return runGitCommand(input.sourceWorkspaceRoot, ["write-tree"], {
    gitDir: input.gitDir,
    workTree: input.sourceWorkspaceRoot
  });
}

async function replaceSourceWorkspaceWithTree(input: {
  gitDir: string;
  headTree: string;
  sourceWorkspaceRoot: string;
}): Promise<void> {
  const entries = await readdir(input.sourceWorkspaceRoot);

  await Promise.all(
    entries.map((entry) =>
      rm(path.join(input.sourceWorkspaceRoot, entry), {
        force: true,
        recursive: true
      })
    )
  );

  if (input.headTree === gitEmptyTreeHash) {
    return;
  }

  await runGitCommand(
    input.sourceWorkspaceRoot,
    ["checkout", "--force", input.headTree, "--", "."],
    {
      gitDir: input.gitDir,
      workTree: input.sourceWorkspaceRoot
    }
  );
}

async function createSourceHistoryCommit(input: {
  candidate: SourceChangeCandidateRecord;
  context: EffectiveRuntimeContext;
  gitDir: string;
  reason?: string | undefined;
  sourceWorkspaceRoot: string;
}): Promise<string> {
  let parentCommit: string | undefined;

  try {
    parentCommit = await runGitCommand(
      input.sourceWorkspaceRoot,
      ["rev-parse", "--verify", `${sourceHistoryRef}^{commit}`],
      {
        gitDir: input.gitDir,
        workTree: input.sourceWorkspaceRoot
      }
    );
  } catch {
    parentCommit = undefined;
  }

  const commit = await runGitCommand(
    input.sourceWorkspaceRoot,
    [
      "commit-tree",
      input.candidate.snapshot?.headTree ?? "",
      "-m",
      [
        `entangle(${input.context.binding.node.nodeId}): apply ${input.candidate.candidateId}`,
        "",
        `candidate: ${input.candidate.candidateId}`,
        `turn: ${input.candidate.turnId}`,
        ...(input.reason ? ["", input.reason] : [])
      ].join("\n"),
      ...(parentCommit ? ["-p", parentCommit] : [])
    ],
    {
      env: {
        GIT_AUTHOR_EMAIL: `${input.context.binding.node.nodeId}@entangle.invalid`,
        GIT_AUTHOR_NAME: input.context.binding.node.displayName,
        GIT_COMMITTER_EMAIL: `${input.context.binding.node.nodeId}@entangle.invalid`,
        GIT_COMMITTER_NAME: input.context.binding.node.displayName
      },
      gitDir: input.gitDir,
      workTree: input.sourceWorkspaceRoot
    }
  );

  await runGitCommand(
    input.sourceWorkspaceRoot,
    ["update-ref", sourceHistoryRef, commit, ...(parentCommit ? [parentCommit] : [])],
    {
      gitDir: input.gitDir,
      workTree: input.sourceWorkspaceRoot
    }
  );

  return commit;
}

export async function applyAcceptedSourceChangeCandidate(input: {
  appliedAt: string;
  appliedBy: string;
  candidate: SourceChangeCandidateRecord;
  context: EffectiveRuntimeContext;
  reason?: string | undefined;
  statePaths: RunnerStatePaths;
}): Promise<SourceChangeApplicationResult> {
  if (input.candidate.status !== "accepted") {
    return {
      applied: false,
      candidate: input.candidate,
      reason: `Source change candidate '${input.candidate.candidateId}' is not accepted.`
    };
  }

  if (!input.candidate.snapshot) {
    return {
      applied: false,
      candidate: input.candidate,
      reason: `Source change candidate '${input.candidate.candidateId}' has no shadow git snapshot.`
    };
  }

  if (input.candidate.application) {
    const existingHistory = await readSourceHistoryRecord(
      input.statePaths,
      input.candidate.application.sourceHistoryId
    );

    if (existingHistory) {
      return {
        applied: true,
        candidate: input.candidate,
        history: existingHistory
      };
    }

    return {
      applied: false,
      candidate: input.candidate,
      reason:
        `Source change candidate '${input.candidate.candidateId}' already records ` +
        `application '${input.candidate.application.sourceHistoryId}', but the history record is missing.`
    };
  }

  const sourceWorkspaceRoot = input.context.workspace.sourceWorkspaceRoot;

  if (!sourceWorkspaceRoot) {
    return {
      applied: false,
      candidate: input.candidate,
      reason: `Runtime '${input.context.binding.node.nodeId}' has no source workspace root.`
    };
  }

  const gitDir = path.join(input.context.workspace.runtimeRoot, "source-snapshot.git");

  try {
    if (!(await pathIsDirectory(gitDir))) {
      return {
        applied: false,
        candidate: input.candidate,
        reason:
          `Source change candidate '${input.candidate.candidateId}' cannot be applied because its shadow git repository is missing.`
      };
    }

    if (!(await pathIsDirectory(sourceWorkspaceRoot))) {
      return {
        applied: false,
        candidate: input.candidate,
        reason:
          `Runtime '${input.context.binding.node.nodeId}' source workspace is not a directory.`
      };
    }

    await runGitCommand(sourceWorkspaceRoot, [
      "cat-file",
      "-e",
      `${input.candidate.snapshot.headTree}^{tree}`
    ], {
      gitDir,
      workTree: sourceWorkspaceRoot
    });

    const currentTree = await writeCurrentSourceWorkspaceTree({
      gitDir,
      sourceWorkspaceRoot
    });
    const mode =
      currentTree === input.candidate.snapshot.headTree
        ? "already_in_workspace"
        : "applied_to_workspace";

    if (
      currentTree !== input.candidate.snapshot.headTree &&
      currentTree !== input.candidate.snapshot.baseTree
    ) {
      return {
        applied: false,
        candidate: input.candidate,
        reason:
          `Source change candidate '${input.candidate.candidateId}' cannot be applied because the source workspace changed after the candidate snapshot.`
      };
    }

    if (mode === "applied_to_workspace") {
      await replaceSourceWorkspaceWithTree({
        gitDir,
        headTree: input.candidate.snapshot.headTree,
        sourceWorkspaceRoot
      });
    }

    const commit = await createSourceHistoryCommit({
      candidate: input.candidate,
      context: input.context,
      gitDir,
      reason: input.reason,
      sourceWorkspaceRoot
    });
    const sourceHistoryId = buildSourceHistoryId(input.candidate.candidateId);
    const history = sourceHistoryRecordSchema.parse({
      appliedAt: input.appliedAt,
      appliedBy: input.appliedBy,
      baseTree: input.candidate.snapshot.baseTree,
      branch: sourceHistoryBranchName,
      candidateId: input.candidate.candidateId,
      commit,
      ...(input.candidate.conversationId
        ? { conversationId: input.candidate.conversationId }
        : {}),
      graphId: input.candidate.graphId,
      graphRevisionId: input.context.binding.graphRevisionId,
      headTree: input.candidate.snapshot.headTree,
      mode,
      nodeId: input.candidate.nodeId,
      ...(input.reason ? { reason: input.reason } : {}),
      ...(input.candidate.sessionId
        ? { sessionId: input.candidate.sessionId }
        : {}),
      sourceChangeSummary: input.candidate.sourceChangeSummary,
      sourceHistoryId,
      turnId: input.candidate.turnId,
      updatedAt: input.appliedAt
    });
    const nextCandidate: SourceChangeCandidateRecord = {
      ...input.candidate,
      application: {
        appliedAt: input.appliedAt,
        appliedBy: input.appliedBy,
        commit,
        mode,
        ...(input.reason ? { reason: input.reason } : {}),
        sourceHistoryId
      },
      updatedAt: input.appliedAt
    };

    await writeSourceHistoryRecord(input.statePaths, history);
    await writeSourceChangeCandidateRecord(input.statePaths, nextCandidate);

    return {
      applied: true,
      candidate: nextCandidate,
      history
    };
  } catch (error) {
    return {
      applied: false,
      candidate: input.candidate,
      reason:
        `Source change candidate '${input.candidate.candidateId}' could not be applied: ` +
        sanitizeRuntimePathError(input.context, error)
    };
  }
}

export async function publishSourceHistoryToPrimaryGitTarget(input: {
  context: EffectiveRuntimeContext;
  history: SourceHistoryRecord;
  reason?: string;
  requestedAt: string;
  requestedBy?: string;
  retryFailedPublication?: boolean;
  statePaths: RunnerStatePaths;
}): Promise<SourceHistoryPublicationResult> {
  if (input.history.publication) {
    const publicationState = input.history.publication.publication.state;
    if (publicationState === "failed" && input.retryFailedPublication) {
      // Retry below against the current primary target. The new publication
      // metadata replaces the prior failed attempt if the command completes.
    } else {
      return {
        history: input.history,
        published: false,
        reason:
          publicationState === "failed"
            ? `Source history '${input.history.sourceHistoryId}' already has failed publication metadata; retry is required.`
            : `Source history '${input.history.sourceHistoryId}' already has publication metadata.`
      };
    }
  }

  if (input.context.policyContext.sourceMutation.publishRequiresApproval) {
    return {
      history: input.history,
      published: false,
      reason:
        `Runtime '${input.context.binding.node.nodeId}' requires approval before ` +
        `publishing source history '${input.history.sourceHistoryId}'.`
    };
  }

  const target = input.context.artifactContext.primaryGitRepositoryTarget;

  if (!target) {
    return {
      history: input.history,
      published: false,
      reason:
        `Runtime '${input.context.binding.node.nodeId}' has no primary git repository target.`
    };
  }

  const sourceGitDir = path.join(
    input.context.workspace.runtimeRoot,
    "source-snapshot.git"
  );

  if (!(await pathIsDirectory(sourceGitDir))) {
    return {
      history: input.history,
      published: false,
      reason:
        `Source history '${input.history.sourceHistoryId}' cannot be published because its shadow git repository is missing.`
    };
  }

  try {
    const branchName = buildSourceHistoryPublicationBranch(input.history);
    const repoPath = sourceHistoryPublicationRepoRoot(input.context);
    const artifactCommit = await materializeSourceHistoryPublicationCommit({
      branchName,
      context: input.context,
      history: input.history,
      repoPath,
      sourceGitDir
    });
    const localArtifact = buildSourceHistoryArtifactRecord({
      artifactCommit,
      branchName,
      context: input.context,
      history: input.history,
      repoPath,
      target,
      timestamp: input.requestedAt
    });
    const artifact = await publishSourceHistoryArtifactRecord({
      artifactRecord: localArtifact,
      branchName,
      context: input.context,
      repoPath,
      target
    });
    const nextHistory = sourceHistoryRecordSchema.parse({
      ...input.history,
      publication: {
        artifactId: artifact.ref.artifactId,
        branch: branchName,
        publication: artifact.publication ?? {
          state: "not_requested"
        },
        requestedAt: input.requestedAt,
        ...(input.reason ? { reason: input.reason } : {}),
        ...(input.requestedBy ?? input.history.appliedBy
          ? { requestedBy: input.requestedBy ?? input.history.appliedBy }
          : {}),
        targetGitServiceRef: target.gitServiceRef,
        targetNamespace: target.namespace,
        targetRepositoryName: target.repositoryName
      },
      updatedAt: artifact.updatedAt
    });

    await writeArtifactRecord(input.statePaths, artifact);
    await writeSourceHistoryRecord(input.statePaths, nextHistory);

    return {
      artifact,
      history: nextHistory,
      published: true
    };
  } catch (error) {
    return {
      history: input.history,
      published: false,
      reason:
        `Source history '${input.history.sourceHistoryId}' could not be published: ` +
        sanitizeRuntimePathError(input.context, error)
    };
  }
}
