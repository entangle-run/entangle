import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import {
  sourceHistoryRecordSchema,
  type EffectiveRuntimeContext,
  type SourceChangeCandidateRecord,
  type SourceHistoryRecord
} from "@entangle/types";
import type { RunnerStatePaths } from "./state-store.js";
import {
  readSourceHistoryRecord,
  writeSourceChangeCandidateRecord,
  writeSourceHistoryRecord
} from "./state-store.js";

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
