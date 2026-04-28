import { spawn } from "node:child_process";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import {
  sourceChangeSummarySchema,
  type EffectiveRuntimeContext,
  type SourceChangeFilePreview,
  type SourceChangeFileSummary,
  type SourceChangeFileStatus,
  type SourceChangeSnapshotRef,
  type SourceChangeSummary
} from "@entangle/types";

type SourceChangeHarvestBaseline =
  | {
      baseTree: string;
      gitDir: string;
      kind: "ready";
      sourceWorkspaceRoot: string;
    }
  | {
      kind: "unavailable";
      summary: SourceChangeSummary;
    };

type GitCommandOptions = {
  env?: NodeJS.ProcessEnv | undefined;
  gitDir?: string | undefined;
  workTree?: string | undefined;
};

export type SourceChangeHarvestResult = {
  snapshot?: SourceChangeSnapshotRef | undefined;
  summary: SourceChangeSummary;
};

const maxSourceChangeFiles = 20;
const maxSourceDiffExcerptCharacters = 12_000;
const maxSourceFilePreviewBytes = 4_000;
const maxSourceFilePreviewFiles = 5;
const maxSourceHarvestFailureCharacters = 1_000;

function nowIsoString(): string {
  return new Date().toISOString();
}

function truncate(value: string, maxCharacters: number): {
  text: string;
  truncated: boolean;
} {
  const trimmed = value.trim();

  if (trimmed.length <= maxCharacters) {
    return {
      text: trimmed,
      truncated: false
    };
  }

  return {
    text: `${trimmed.slice(0, Math.max(0, maxCharacters - 3))}...`,
    truncated: true
  };
}

async function isDirectory(targetPath: string): Promise<boolean> {
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
          `Git source snapshot command failed (${args.join(" ")}): ${
            stderr.trim() || stdout.trim() || `exit ${code ?? "unknown"}`
          }`
        )
      );
    });
  });
}

async function runGitCommandBounded(
  cwd: string,
  args: string[],
  options: GitCommandOptions,
  maxBytes: number
): Promise<{
  stdout: Buffer;
  stdoutBytes: number;
}> {
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
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let stdoutBytes = 0;
    let stdoutKeptBytes = 0;
    let stderrKeptBytes = 0;

    child.stdout.on("data", (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      stdoutBytes += buffer.length;

      if (stdoutKeptBytes < maxBytes + 1) {
        const remaining = maxBytes + 1 - stdoutKeptBytes;
        stdoutChunks.push(buffer.subarray(0, Math.max(0, remaining)));
        stdoutKeptBytes += Math.min(buffer.length, remaining);
      }
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);

      if (stderrKeptBytes < 1_000) {
        const remaining = 1_000 - stderrKeptBytes;
        stderrChunks.push(buffer.subarray(0, Math.max(0, remaining)));
        stderrKeptBytes += Math.min(buffer.length, remaining);
      }
    });
    child.on("error", reject);
    child.on("close", (code) => {
      const stderr = Buffer.concat(stderrChunks).toString("utf8").trim();

      if (code !== 0) {
        reject(
          new Error(
            `Git source preview command failed (${args.join(" ")}): ${
              stderr || `exit ${code ?? "unknown"}`
            }`
          )
        );
        return;
      }

      resolve({
        stdout: Buffer.concat(stdoutChunks),
        stdoutBytes
      });
    });
  });
}

function buildUnavailableSummary(
  status: SourceChangeSummary["status"],
  failureReason?: string
): SourceChangeSummary {
  return sourceChangeSummarySchema.parse({
    checkedAt: nowIsoString(),
    ...(failureReason ? { failureReason } : {}),
    fileCount: 0,
    files: [],
    status
  });
}

function sanitizeFailureReason(
  context: EffectiveRuntimeContext,
  error: unknown,
  extraPaths: string[] = []
): string {
  const raw =
    error instanceof Error && error.message.trim().length > 0
      ? error.message
      : "Source workspace change harvesting failed.";
  let sanitized = raw;

  for (const [targetPath, placeholder] of [
    [context.workspace.root, "<workspace_root>"],
    [context.workspace.sourceWorkspaceRoot, "<source_workspace>"],
    [context.workspace.runtimeRoot, "<runtime_state>"],
    ...extraPaths.map((targetPath, index) => [
      targetPath,
      `<source_harvest_path_${index + 1}>`
    ])
  ] as Array<[string | undefined, string]>) {
    if (targetPath) {
      sanitized = sanitized.replaceAll(targetPath, placeholder);
    }
  }

  return truncate(sanitized, maxSourceHarvestFailureCharacters).text;
}

function mapGitStatus(code: string | undefined): SourceChangeFileStatus {
  switch (code?.at(0)) {
    case "A":
      return "added";
    case "C":
      return "copied";
    case "D":
      return "deleted";
    case "M":
      return "modified";
    case "R":
      return "renamed";
    case "T":
      return "type_changed";
    default:
      return "unknown";
  }
}

function inferSourceFilePreviewContentType(
  filePath: string
): "text/markdown" | "text/plain" {
  const extension = path.extname(filePath).toLowerCase();

  return extension === ".md" || extension === ".markdown"
    ? "text/markdown"
    : "text/plain";
}

function sanitizeSourcePreviewReason(
  error: unknown,
  input: {
    gitDir: string;
    sourceWorkspaceRoot: string;
  }
): string {
  const raw =
    error instanceof Error && error.message.trim().length > 0
      ? error.message
      : "Source file preview failed.";

  return truncate(
    raw
      .replaceAll(input.gitDir, "<source_snapshot>")
      .replaceAll(input.sourceWorkspaceRoot, "<source_workspace>"),
    maxSourceHarvestFailureCharacters
  ).text;
}

async function readSourceFilePreview(input: {
  file: SourceChangeFileSummary;
  gitDir: string;
  headTree: string;
  sourceWorkspaceRoot: string;
}): Promise<SourceChangeFilePreview> {
  try {
    const result = await runGitCommandBounded(
      input.sourceWorkspaceRoot,
      ["show", `${input.headTree}:${input.file.path}`],
      {
        gitDir: input.gitDir,
        workTree: input.sourceWorkspaceRoot
      },
      maxSourceFilePreviewBytes
    );
    const previewBuffer = result.stdout.subarray(
      0,
      Math.min(result.stdout.length, maxSourceFilePreviewBytes)
    );

    if (previewBuffer.includes(0)) {
      return {
        available: false,
        path: input.file.path,
        reason:
          "Source file preview is unavailable because the source file is not text."
      };
    }

    return {
      available: true,
      bytesRead: previewBuffer.length,
      content: previewBuffer.toString("utf8"),
      contentEncoding: "utf8",
      contentType: inferSourceFilePreviewContentType(input.file.path),
      path: input.file.path,
      truncated: result.stdoutBytes > maxSourceFilePreviewBytes
    };
  } catch (error) {
    return {
      available: false,
      path: input.file.path,
      reason: `Source file preview is unavailable: ${sanitizeSourcePreviewReason(
        error,
        input
      )}`
    };
  }
}

async function buildSourceFilePreviews(input: {
  files: SourceChangeFileSummary[];
  gitDir: string;
  headTree: string;
  sourceWorkspaceRoot: string;
}): Promise<SourceChangeFilePreview[]> {
  return Promise.all(
    input.files
      .filter((file) => file.status !== "deleted")
      .slice(0, maxSourceFilePreviewFiles)
      .map((file) =>
        readSourceFilePreview({
          file,
          gitDir: input.gitDir,
          headTree: input.headTree,
          sourceWorkspaceRoot: input.sourceWorkspaceRoot
        })
      )
  );
}

function parseNameStatus(output: string): Array<{
  path: string;
  status: SourceChangeFileStatus;
}> {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .flatMap((line) => {
      const [statusCode, ...pathParts] = line.split("\t");
      const filePath = pathParts.join("\t").trim();

      if (!filePath) {
        return [];
      }

      return [
        {
          path: filePath,
          status: mapGitStatus(statusCode)
        }
      ];
    });
}

function parseNumstat(output: string): Map<
  string,
  {
    additions: number;
    deletions: number;
  }
> {
  const stats = new Map<
    string,
    {
      additions: number;
      deletions: number;
    }
  >();

  for (const line of output.split(/\r?\n/)) {
    if (!line.trim()) {
      continue;
    }

    const [additionsRaw, deletionsRaw, ...pathParts] = line.split("\t");
    const filePath = pathParts.join("\t").trim();

    if (!filePath) {
      continue;
    }

    const additions = Number.parseInt(additionsRaw ?? "0", 10);
    const deletions = Number.parseInt(deletionsRaw ?? "0", 10);

    stats.set(filePath, {
      additions: Number.isFinite(additions) ? additions : 0,
      deletions: Number.isFinite(deletions) ? deletions : 0
    });
  }

  return stats;
}

async function ensureSourceSnapshotGitDir(input: {
  gitDir: string;
  sourceWorkspaceRoot: string;
}): Promise<void> {
  await mkdir(path.dirname(input.gitDir), { recursive: true });

  if (!(await isDirectory(input.gitDir))) {
    await runGitCommand(input.sourceWorkspaceRoot, ["init"], {
      env: {
        GIT_DIR: input.gitDir,
        GIT_WORK_TREE: input.sourceWorkspaceRoot
      }
    });
  }

  await runGitCommand(input.sourceWorkspaceRoot, ["config", "core.autocrlf", "false"], {
    gitDir: input.gitDir,
    workTree: input.sourceWorkspaceRoot
  });
  await runGitCommand(input.sourceWorkspaceRoot, ["config", "core.longpaths", "true"], {
    gitDir: input.gitDir,
    workTree: input.sourceWorkspaceRoot
  });
  await runGitCommand(input.sourceWorkspaceRoot, ["config", "core.quotepath", "false"], {
    gitDir: input.gitDir,
    workTree: input.sourceWorkspaceRoot
  });
}

async function writeSourceSnapshotTree(input: {
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

export async function prepareSourceChangeHarvest(
  context: EffectiveRuntimeContext
): Promise<SourceChangeHarvestBaseline> {
  const sourceWorkspaceRoot = context.workspace.sourceWorkspaceRoot;

  if (!sourceWorkspaceRoot) {
    return {
      kind: "unavailable",
      summary: buildUnavailableSummary("not_configured")
    };
  }

  if (!(await isDirectory(sourceWorkspaceRoot))) {
    return {
      kind: "unavailable",
      summary: buildUnavailableSummary(
        "failed",
        "Source workspace change harvesting failed because the source workspace root is not a directory."
      )
    };
  }

  const gitDir = path.join(context.workspace.runtimeRoot, "source-snapshot.git");

  try {
    await ensureSourceSnapshotGitDir({
      gitDir,
      sourceWorkspaceRoot
    });

    return {
      baseTree: await writeSourceSnapshotTree({
        gitDir,
        sourceWorkspaceRoot
      }),
      gitDir,
      kind: "ready",
      sourceWorkspaceRoot
    };
  } catch (error) {
    return {
      kind: "unavailable",
      summary: buildUnavailableSummary(
        "failed",
        sanitizeFailureReason(context, error, [gitDir])
      )
    };
  }
}

export async function harvestSourceChanges(
  context: EffectiveRuntimeContext,
  baseline: SourceChangeHarvestBaseline
): Promise<SourceChangeHarvestResult> {
  if (baseline.kind === "unavailable") {
    return {
      summary: baseline.summary
    };
  }

  try {
    const nextTree = await writeSourceSnapshotTree({
      gitDir: baseline.gitDir,
      sourceWorkspaceRoot: baseline.sourceWorkspaceRoot
    });

    if (baseline.baseTree === nextTree) {
      return {
        summary: sourceChangeSummarySchema.parse({
          checkedAt: nowIsoString(),
          fileCount: 0,
          files: [],
          status: "unchanged"
        })
      };
    }

    const [nameStatusOutput, numstatOutput, diffOutput] = await Promise.all([
      runGitCommand(
        baseline.sourceWorkspaceRoot,
        ["diff", "--no-ext-diff", "--no-renames", "--name-status", baseline.baseTree, nextTree, "--", "."],
        {
          gitDir: baseline.gitDir,
          workTree: baseline.sourceWorkspaceRoot
        }
      ),
      runGitCommand(
        baseline.sourceWorkspaceRoot,
        ["diff", "--no-ext-diff", "--no-renames", "--numstat", baseline.baseTree, nextTree, "--", "."],
        {
          gitDir: baseline.gitDir,
          workTree: baseline.sourceWorkspaceRoot
        }
      ),
      runGitCommand(
        baseline.sourceWorkspaceRoot,
        ["diff", "--no-ext-diff", "--no-renames", baseline.baseTree, nextTree, "--", "."],
        {
          gitDir: baseline.gitDir,
          workTree: baseline.sourceWorkspaceRoot
        }
      )
    ]);
    const statusRows = parseNameStatus(nameStatusOutput);
    const numstats = parseNumstat(numstatOutput);
    const allFiles = statusRows.map((row) => {
      const stats = numstats.get(row.path) ?? {
        additions: 0,
        deletions: 0
      };

      return {
        additions: stats.additions,
        deletions: stats.deletions,
        path: row.path,
        status: row.status
      };
    });
    const totals = allFiles.reduce(
      (accumulator, file) => ({
        additions: accumulator.additions + file.additions,
        deletions: accumulator.deletions + file.deletions
      }),
      {
        additions: 0,
        deletions: 0
      }
    );
    const diffExcerpt = truncate(diffOutput, maxSourceDiffExcerptCharacters);
    const files = allFiles.slice(0, maxSourceChangeFiles);
    const filePreviews = await buildSourceFilePreviews({
      files,
      gitDir: baseline.gitDir,
      headTree: nextTree,
      sourceWorkspaceRoot: baseline.sourceWorkspaceRoot
    });
    const truncated =
      allFiles.length > files.length ||
      diffExcerpt.truncated ||
      filePreviews.some((preview) => preview.available && preview.truncated);

    return {
      snapshot: {
        baseTree: baseline.baseTree,
        headTree: nextTree,
        kind: "shadow_git_tree"
      },
      summary: sourceChangeSummarySchema.parse({
        additions: totals.additions,
        checkedAt: nowIsoString(),
        deletions: totals.deletions,
        ...(diffExcerpt.text ? { diffExcerpt: diffExcerpt.text } : {}),
        fileCount: allFiles.length,
        filePreviews,
        files,
        status: "changed",
        truncated
      })
    };
  } catch (error) {
    return {
      summary: buildUnavailableSummary(
        "failed",
        sanitizeFailureReason(context, error, [baseline.gitDir])
      )
    };
  }
}
