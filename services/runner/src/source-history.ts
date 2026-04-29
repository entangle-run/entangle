import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import {
  artifactRecordSchema,
  resolveGitRepositoryTargetForArtifactLocator,
  sourceHistoryRecordSchema,
  sourceHistoryReplayRecordSchema,
  type ArtifactRecord,
  type ApprovalRecord,
  type EffectiveRuntimeContext,
  type GitRepositoryTarget,
  type SourceChangeCandidateRecord,
  type SourceHistoryRecord,
  type SourceHistoryPublicationRecord,
  type SourceHistoryPublicationTarget,
  type SourceHistoryReplayRecord
} from "@entangle/types";
import type { RunnerStatePaths } from "./state-store.js";
import {
  readApprovalRecord,
  readSourceHistoryRecord,
  writeArtifactRecord,
  writeSourceChangeCandidateRecord,
  writeSourceHistoryRecord,
  writeSourceHistoryReplayRecord
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

export type SourceHistoryReplayResult =
  | {
      history: SourceHistoryRecord;
      replay: SourceHistoryReplayRecord;
      replayed: true;
    }
  | {
      history: SourceHistoryRecord;
      reason: string;
      replay: SourceHistoryReplayRecord;
      replayed: false;
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

function buildSourceHistoryArtifactId(input: {
  isPrimaryTarget: boolean;
  sourceHistoryId: string;
  target: GitRepositoryTarget;
}): string {
  const raw = input.isPrimaryTarget
    ? `source-${input.sourceHistoryId}`
    : sanitizeIdentifier(
        [
          "source",
          input.sourceHistoryId,
          input.target.gitServiceRef,
          input.target.namespace,
          input.target.repositoryName
        ].join("-")
      );

  if (raw.length <= 100) {
    return raw;
  }

  const digest = createHash("sha256")
    .update(
      [
        input.sourceHistoryId,
        input.target.gitServiceRef,
        input.target.namespace,
        input.target.repositoryName
      ].join("|")
    )
    .digest("hex")
    .slice(0, 12);
  const prefix = raw.slice(0, 87).replace(/[._-]+$/g, "");

  return `${prefix}-${digest}`;
}

function buildSourceHistoryReplayId(input: {
  replayId?: string | undefined;
  sourceHistoryId: string;
}): string {
  if (input.replayId) {
    return input.replayId;
  }

  const raw = sanitizeIdentifier(
    `replay-${input.sourceHistoryId}-${randomUUID().slice(0, 8)}`
  );

  if (raw.length <= 100) {
    return raw;
  }

  const digest = createHash("sha256")
    .update(`${input.sourceHistoryId}-${randomUUID()}`)
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

function describePublicationTarget(target: GitRepositoryTarget): string {
  return `${target.gitServiceRef}/${target.namespace}/${target.repositoryName}`;
}

function publicationTargetFromRecord(input: {
  context: EffectiveRuntimeContext;
  publication: SourceHistoryPublicationRecord;
}): GitRepositoryTarget | undefined {
  const primaryTarget = input.context.artifactContext.primaryGitRepositoryTarget;
  const gitServiceRef =
    input.publication.targetGitServiceRef ?? primaryTarget?.gitServiceRef;
  const namespace =
    input.publication.targetNamespace ?? primaryTarget?.namespace;
  const repositoryName =
    input.publication.targetRepositoryName ?? primaryTarget?.repositoryName;

  if (!gitServiceRef || !namespace || !repositoryName) {
    return undefined;
  }

  return resolveGitRepositoryTargetForArtifactLocator({
    artifactContext: input.context.artifactContext,
    locator: {
      branch: input.publication.branch,
      commit: input.publication.artifactId,
      gitServiceRef,
      namespace,
      path: ".",
      repositoryName
    }
  });
}

function publicationRecordMatchesTarget(input: {
  context: EffectiveRuntimeContext;
  publication: SourceHistoryPublicationRecord;
  target: GitRepositoryTarget;
}): boolean {
  return publicationTargetsEqual(
    publicationTargetFromRecord({
      context: input.context,
      publication: input.publication
    }),
    input.target
  );
}

function sourceHistoryPublicationRecords(
  history: SourceHistoryRecord
): SourceHistoryPublicationRecord[] {
  const records = [
    ...(history.publications ?? []),
    ...(history.publication ? [history.publication] : [])
  ];
  const seen = new Set<string>();

  return records.filter((record) => {
    const key = [
      record.targetGitServiceRef ?? "",
      record.targetNamespace ?? "",
      record.targetRepositoryName ?? "",
      record.artifactId
    ].join("|");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function upsertSourceHistoryPublication(input: {
  context: EffectiveRuntimeContext;
  history: SourceHistoryRecord;
  publication: SourceHistoryPublicationRecord;
  target: GitRepositoryTarget;
}): SourceHistoryPublicationRecord[] {
  const records = sourceHistoryPublicationRecords(input.history);
  const nextRecords = records.filter(
    (record) =>
      !publicationRecordMatchesTarget({
        context: input.context,
        publication: record,
        target: input.target
      })
  );

  nextRecords.push(input.publication);
  return nextRecords;
}

function buildPublicationApprovalResource(input: {
  history: SourceHistoryRecord;
  target: GitRepositoryTarget;
}): { id: string; kind: "source_history_publication"; label: string } {
  const targetLabel = describePublicationTarget(input.target);

  return {
    id: [
      input.history.sourceHistoryId,
      input.target.gitServiceRef,
      input.target.namespace,
      input.target.repositoryName
    ].join("|"),
    kind: "source_history_publication",
    label: `${input.history.sourceHistoryId} -> ${targetLabel}`
  };
}

function policyResourcesMatch(
  left: ApprovalRecord["resource"],
  right: ApprovalRecord["resource"]
): boolean {
  if (!left && !right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return left.id === right.id && left.kind === right.kind;
}

function sourceHistoryApprovalResource(
  history: SourceHistoryRecord
): { id: string; kind: "source_history"; label: string } {
  return {
    id: history.sourceHistoryId,
    kind: "source_history",
    label: history.sourceHistoryId
  };
}

async function validateSourceHistoryPublicationApproval(input: {
  approvalId?: string | undefined;
  context: EffectiveRuntimeContext;
  history: SourceHistoryRecord;
  isPrimaryTarget: boolean;
  statePaths: RunnerStatePaths;
  target: GitRepositoryTarget;
}): Promise<string | undefined> {
  const requiresApproval =
    input.context.policyContext.sourceMutation.publishRequiresApproval ||
    (!input.isPrimaryTarget &&
      input.context.policyContext.sourceMutation
        .nonPrimaryPublishRequiresApproval);

  if (!input.approvalId) {
    if (!requiresApproval) {
      return undefined;
    }

    return (
      `Runtime '${input.context.binding.node.nodeId}' requires an approved approvalId before ` +
      `publishing source history '${input.history.sourceHistoryId}' to target '${describePublicationTarget(input.target)}'.`
    );
  }

  const approval = await readApprovalRecord(input.statePaths, input.approvalId);
  const expectedPublicationResource = buildPublicationApprovalResource({
    history: input.history,
    target: input.target
  });
  const expectedHistoryResource = sourceHistoryApprovalResource(input.history);

  if (!approval) {
    return `Approval '${input.approvalId}' was not found for runtime '${input.context.binding.node.nodeId}'.`;
  }

  if (approval.graphId !== input.context.binding.graphId) {
    return `Approval '${input.approvalId}' belongs to graph '${approval.graphId}', not graph '${input.context.binding.graphId}'.`;
  }

  if (approval.requestedByNodeId !== input.context.binding.node.nodeId) {
    return `Approval '${input.approvalId}' was requested by node '${approval.requestedByNodeId}', not runtime '${input.context.binding.node.nodeId}'.`;
  }

  if (input.history.sessionId && approval.sessionId !== input.history.sessionId) {
    return `Approval '${input.approvalId}' belongs to session '${approval.sessionId}', not session '${input.history.sessionId}'.`;
  }

  if (approval.operation !== "source_publication") {
    return `Approval '${input.approvalId}' is scoped to operation '${approval.operation ?? "unspecified"}', but source history publication requires 'source_publication'.`;
  }

  const resourceMatches =
    policyResourcesMatch(approval.resource, expectedPublicationResource) ||
    (input.isPrimaryTarget &&
      policyResourcesMatch(approval.resource, expectedHistoryResource));

  if (!resourceMatches) {
    return (
      `Approval '${input.approvalId}' is scoped to resource ` +
      `'${approval.resource?.kind ?? "unspecified"}:${approval.resource?.id ?? "unspecified"}', ` +
      `but source history publication requires '${expectedPublicationResource.kind}:${expectedPublicationResource.id}'.`
    );
  }

  if (approval.status !== "approved") {
    return `Approval '${input.approvalId}' is '${approval.status}', but source history publication requires an approved approval.`;
  }

  return undefined;
}

function resolveSourceHistoryPublicationTarget(input: {
  context: EffectiveRuntimeContext;
  target?: SourceHistoryPublicationTarget | undefined;
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
        `Runtime '${input.context.binding.node.nodeId}' could not resolve source-history publication target ` +
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
        `Runtime '${input.context.binding.node.nodeId}' could not resolve git publication target ` +
        `'${gitServiceRef}/${namespace}/${repositoryName}' from its artifact context.`
    };
  }

  return {
    isPrimaryTarget: publicationTargetsEqual(target, primaryTarget),
    target
  };
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
  isPrimaryTarget: boolean;
  repoPath: string;
  target: GitRepositoryTarget;
  timestamp: string;
}): ArtifactRecord {
  const artifactId = buildSourceHistoryArtifactId({
    isPrimaryTarget: input.isPrimaryTarget,
    sourceHistoryId: input.history.sourceHistoryId,
    target: input.target
  });

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

async function countSourceHistoryTreeFiles(input: {
  gitDir: string;
  runtimeRoot: string;
  tree: string;
}): Promise<number> {
  const output = await runGitCommand(
    input.runtimeRoot,
    ["ls-tree", "-r", "-z", "--name-only", input.tree],
    {
      gitDir: input.gitDir
    }
  );

  return output.split("\0").filter((entry) => entry.length > 0).length;
}

function pathIsInsideRoot(input: {
  candidatePath: string;
  rootPath: string;
}): boolean {
  const relativePath = path.relative(input.rootPath, input.candidatePath);

  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
}

async function persistSourceHistoryReplay(input: {
  record: SourceHistoryReplayRecord;
  statePaths: RunnerStatePaths;
}): Promise<SourceHistoryReplayRecord> {
  await writeSourceHistoryReplayRecord(input.statePaths, input.record);
  return input.record;
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

export async function replaySourceHistoryToWorkspace(input: {
  approvalId?: string;
  context: EffectiveRuntimeContext;
  history: SourceHistoryRecord;
  reason?: string;
  replayedAt: string;
  replayedBy?: string;
  replayId?: string;
  statePaths: RunnerStatePaths;
}): Promise<SourceHistoryReplayResult> {
  const replayId = buildSourceHistoryReplayId({
    replayId: input.replayId,
    sourceHistoryId: input.history.sourceHistoryId
  });
  const baseRecord = {
    ...(input.approvalId ? { approvalId: input.approvalId } : {}),
    baseTree: input.history.baseTree,
    candidateId: input.history.candidateId,
    commit: input.history.commit,
    createdAt: input.replayedAt,
    graphId: input.history.graphId,
    graphRevisionId: input.history.graphRevisionId,
    headTree: input.history.headTree,
    nodeId: input.history.nodeId,
    ...(input.reason ? { reason: input.reason } : {}),
    ...(input.replayedBy ? { replayedBy: input.replayedBy } : {}),
    replayId,
    sourceHistoryId: input.history.sourceHistoryId,
    turnId: input.history.turnId,
    updatedAt: input.replayedAt
  };
  const persistUnavailable = async (
    unavailableReason: string
  ): Promise<SourceHistoryReplayResult> => {
    const replay = await persistSourceHistoryReplay({
      record: sourceHistoryReplayRecordSchema.parse({
        ...baseRecord,
        status: "unavailable",
        unavailableReason
      }),
      statePaths: input.statePaths
    });

    return {
      history: input.history,
      reason: unavailableReason,
      replay,
      replayed: false
    };
  };
  const sourceWorkspaceRoot = input.context.workspace.sourceWorkspaceRoot;

  if (!sourceWorkspaceRoot) {
    return persistUnavailable(
      `Runtime '${input.context.binding.node.nodeId}' does not have a configured source workspace root.`
    );
  }

  if (
    !pathIsInsideRoot({
      candidatePath: sourceWorkspaceRoot,
      rootPath: input.context.workspace.root
    })
  ) {
    return persistUnavailable(
      `Runtime '${input.context.binding.node.nodeId}' source workspace is outside the node workspace root.`
    );
  }

  const gitDir = path.join(
    input.context.workspace.runtimeRoot,
    "source-snapshot.git"
  );

  try {
    if (!(await pathIsDirectory(gitDir))) {
      return persistUnavailable(
        `Source history entry '${input.history.sourceHistoryId}' cannot be replayed because its shadow git repository is missing.`
      );
    }

    if (!(await pathIsDirectory(sourceWorkspaceRoot))) {
      return persistUnavailable(
        `Runtime '${input.context.binding.node.nodeId}' source workspace is not a directory.`
      );
    }

    await runGitCommand(sourceWorkspaceRoot, [
      "cat-file",
      "-e",
      `${input.history.commit}^{commit}`
    ], {
      gitDir,
      workTree: sourceWorkspaceRoot
    });
    await runGitCommand(sourceWorkspaceRoot, [
      "cat-file",
      "-e",
      `${input.history.headTree}^{tree}`
    ], {
      gitDir,
      workTree: sourceWorkspaceRoot
    });

    const currentTree = await writeCurrentSourceWorkspaceTree({
      gitDir,
      sourceWorkspaceRoot
    });
    const replayedFileCount = await countSourceHistoryTreeFiles({
      gitDir,
      runtimeRoot: input.context.workspace.runtimeRoot,
      tree: input.history.headTree
    });

    if (
      currentTree !== input.history.headTree &&
      currentTree !== input.history.baseTree
    ) {
      return persistUnavailable(
        `Source history entry '${input.history.sourceHistoryId}' cannot be replayed because the source workspace changed after the recorded base tree.`
      );
    }

    const status =
      currentTree === input.history.headTree ? "already_in_workspace" : "replayed";

    if (status === "replayed") {
      await replaceSourceWorkspaceWithTree({
        gitDir,
        headTree: input.history.headTree,
        sourceWorkspaceRoot
      });
      const replayedTree = await writeCurrentSourceWorkspaceTree({
        gitDir,
        sourceWorkspaceRoot
      });

      if (replayedTree !== input.history.headTree) {
        return persistUnavailable(
          `Source history entry '${input.history.sourceHistoryId}' did not replay cleanly to the source workspace.`
        );
      }
    }

    const replay = await persistSourceHistoryReplay({
      record: sourceHistoryReplayRecordSchema.parse({
        ...baseRecord,
        replayedFileCount,
        replayedPath: sourceWorkspaceRoot,
        status
      }),
      statePaths: input.statePaths
    });

    return {
      history: input.history,
      replay,
      replayed: true
    };
  } catch (error) {
    return persistUnavailable(
      `Source history entry '${input.history.sourceHistoryId}' could not be replayed: ` +
        sanitizeRuntimePathError(input.context, error)
    );
  }
}

export async function publishSourceHistoryToGitTarget(input: {
  approvalId?: string;
  context: EffectiveRuntimeContext;
  history: SourceHistoryRecord;
  reason?: string;
  requestedAt: string;
  requestedBy?: string;
  retryFailedPublication?: boolean;
  statePaths: RunnerStatePaths;
  target?: SourceHistoryPublicationTarget | undefined;
}): Promise<SourceHistoryPublicationResult> {
  const resolvedTarget = resolveSourceHistoryPublicationTarget({
    context: input.context,
    ...(input.target ? { target: input.target } : {})
  });

  if ("reason" in resolvedTarget) {
    return {
      history: input.history,
      published: false,
      reason: resolvedTarget.reason
    };
  }

  const target = resolvedTarget.target;
  const existingTargetPublication = sourceHistoryPublicationRecords(
    input.history
  ).find((publication) =>
    publicationRecordMatchesTarget({
      context: input.context,
      publication,
      target
    })
  );

  if (existingTargetPublication) {
    const publicationState = existingTargetPublication.publication.state;
    if (publicationState === "failed" && input.retryFailedPublication) {
      // Retry below against the same resolved target. The new publication
      // metadata replaces the prior failed attempt if the command completes.
    } else {
      return {
        history: input.history,
        published: false,
        reason:
          publicationState === "failed"
            ? `Source history '${input.history.sourceHistoryId}' already has failed publication metadata for target '${describePublicationTarget(target)}'; retry is required.`
            : `Source history '${input.history.sourceHistoryId}' already has publication metadata for target '${describePublicationTarget(target)}'.`
      };
    }
  }

  const approvalError = await validateSourceHistoryPublicationApproval({
    ...(input.approvalId ? { approvalId: input.approvalId } : {}),
    context: input.context,
    history: input.history,
    isPrimaryTarget: resolvedTarget.isPrimaryTarget,
    statePaths: input.statePaths,
    target
  });

  if (approvalError) {
    return {
      history: input.history,
      published: false,
      reason: approvalError
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
      isPrimaryTarget: resolvedTarget.isPrimaryTarget,
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
    const nextPublication = {
      ...(input.approvalId ? { approvalId: input.approvalId } : {}),
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
    } satisfies SourceHistoryPublicationRecord;
    const nextHistory = sourceHistoryRecordSchema.parse({
      ...input.history,
      publication: nextPublication,
      publications: upsertSourceHistoryPublication({
        context: input.context,
        history: input.history,
        publication: nextPublication,
        target
      }),
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
