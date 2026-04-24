import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  AgentEngineTurnResult,
  EffectiveRuntimeContext
} from "@entangle/types";
import type { RunnerInboundEnvelope } from "./transport.js";

type PostTurnMemoryUpdateInput = {
  consumedArtifactIds: string[];
  context: EffectiveRuntimeContext;
  envelope: RunnerInboundEnvelope;
  producedArtifactIds: string[];
  result: AgentEngineTurnResult;
  turnId: string;
};

type PostTurnMemoryUpdateResult = {
  indexPath: string;
  logPath: string;
  summaryPagePath: string;
  taskPagePath: string;
};

export const recentWorkSummaryRelativePath = "summaries/recent-work.md";
export const workingContextSummaryRelativePath = "summaries/working-context.md";
export const stableFactsSummaryRelativePath = "summaries/stable-facts.md";
export const openQuestionsSummaryRelativePath = "summaries/open-questions.md";
export const decisionsSummaryRelativePath = "summaries/decisions.md";
export const nextActionsSummaryRelativePath = "summaries/next-actions.md";
export const resolutionsSummaryRelativePath = "summaries/resolutions.md";
const maxRecentSummaryEntries = 5;

function buildTaskPageRelativePath(input: {
  sessionId: string;
  turnId: string;
}): string {
  return path.posix.join("tasks", input.sessionId, `${input.turnId}.md`);
}

function isFileMissingError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

export async function readTextFileOrDefault(
  filePath: string,
  fallback: string
): Promise<string> {
  try {
    return await readFile(filePath, "utf8");
  } catch (error: unknown) {
    if (isFileMissingError(error)) {
      return fallback;
    }

    throw error;
  }
}

export async function writeTextFile(
  filePath: string,
  content: string
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

function renderArtifactIdLines(
  artifactIds: string[],
  fallback: string
): string[] {
  return artifactIds.length > 0
    ? artifactIds.map((artifactId) => `- \`${artifactId}\``)
    : [fallback];
}

function renderToolExecutionLines(
  result: AgentEngineTurnResult
): string[] {
  if (result.toolExecutions.length === 0) {
    return ["- Tool executions: none"];
  }

  return [
    "- Tool executions:",
    ...result.toolExecutions.map((toolExecution) =>
      [
        `  - #${toolExecution.sequence} ${toolExecution.toolId}`,
        `[${toolExecution.outcome}]`,
        ...(toolExecution.errorCode
          ? [`error=${toolExecution.errorCode}`]
          : [])
      ].join(" ")
    )
  ];
}

export function appendSectionBullet(
  currentContent: string,
  heading: string,
  bulletLine: string
): string {
  const normalizedContent = currentContent.trimEnd() || "# Wiki Index";

  if (normalizedContent.includes(bulletLine)) {
    return `${normalizedContent}\n`;
  }

  const lines = normalizedContent.split("\n");
  const headingLine = `## ${heading}`;
  const headingIndex = lines.findIndex((line) => line === headingLine);

  if (headingIndex === -1) {
    return `${normalizedContent}\n\n${headingLine}\n\n${bulletLine}\n`;
  }

  let insertIndex = headingIndex + 1;

  while (insertIndex < lines.length && !lines[insertIndex]?.startsWith("## ")) {
    insertIndex += 1;
  }

  const insertsBeforeHeading =
    insertIndex < lines.length && lines[insertIndex]?.startsWith("## ");
  lines.splice(insertIndex, 0, bulletLine);

  if (
    insertsBeforeHeading &&
    lines[insertIndex + 1]?.startsWith("## ")
  ) {
    lines.splice(insertIndex + 1, 0, "");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function resolveTaskPagePath(input: {
  wikiRoot: string;
  sessionId: string;
  turnId: string;
}): string {
  return path.join(input.wikiRoot, "tasks", input.sessionId, `${input.turnId}.md`);
}

function resolveRecentWorkSummaryPath(wikiRoot: string): string {
  return path.join(wikiRoot, recentWorkSummaryRelativePath);
}

export function resolveWorkingContextSummaryPath(wikiRoot: string): string {
  return path.join(wikiRoot, workingContextSummaryRelativePath);
}

export function resolveStableFactsSummaryPath(wikiRoot: string): string {
  return path.join(wikiRoot, stableFactsSummaryRelativePath);
}

export function resolveOpenQuestionsSummaryPath(wikiRoot: string): string {
  return path.join(wikiRoot, openQuestionsSummaryRelativePath);
}

export function resolveDecisionsSummaryPath(wikiRoot: string): string {
  return path.join(wikiRoot, decisionsSummaryRelativePath);
}

export function resolveNextActionsSummaryPath(wikiRoot: string): string {
  return path.join(wikiRoot, nextActionsSummaryRelativePath);
}

export function resolveResolutionsSummaryPath(wikiRoot: string): string {
  return path.join(wikiRoot, resolutionsSummaryRelativePath);
}

function buildTaskPageTitle(input: {
  sessionId: string;
  turnId: string;
}): string {
  return `${input.sessionId} / ${input.turnId}`;
}

function buildTaskPageContent(input: {
  consumedArtifactIds: string[];
  envelope: RunnerInboundEnvelope;
  producedArtifactIds: string[];
  result: AgentEngineTurnResult;
  taskPageTitle: string;
}): string {
  const assistantSummary =
    input.result.assistantMessages.join("\n").trim() ||
    "No assistant summary was produced for this turn.";

  return [
    `# Task Memory ${input.taskPageTitle}`,
    "",
    "## Inbound Task",
    "",
    `- Intent: \`${input.envelope.message.intent}\``,
    `- Session: \`${input.envelope.message.sessionId}\``,
    `- Conversation: \`${input.envelope.message.conversationId}\``,
    `- Sender: \`${input.envelope.message.fromNodeId}\``,
    "",
    input.envelope.message.work.summary,
    "",
    "## Outcome",
    "",
    `- Stop reason: \`${input.result.stopReason}\``,
    ...(input.result.providerStopReason
      ? [`- Provider stop reason: \`${input.result.providerStopReason}\``]
      : []),
    ...(input.result.usage
      ? [
          `- Token usage: input=${input.result.usage.inputTokens} output=${input.result.usage.outputTokens}`
        ]
      : []),
    ...(input.result.failure
      ? [
          `- Failure: \`${input.result.failure.classification}\` ${input.result.failure.message}`
        ]
      : []),
    ...renderToolExecutionLines(input.result),
    "",
    assistantSummary,
    "",
    "## Consumed Artifacts",
    "",
    ...renderArtifactIdLines(
      input.consumedArtifactIds,
      "- No inbound artifacts were consumed."
    ),
    "",
    "## Produced Artifacts",
    "",
    ...renderArtifactIdLines(
      input.producedArtifactIds,
      "- No durable turn artifacts were produced."
    ),
    ""
  ].join("\n");
}

function buildLogEntry(input: {
  nodeId: string;
  result: AgentEngineTurnResult;
  taskPageRelativePath: string;
  taskPageTitle: string;
}): string {
  return [
    `## [${new Date().toISOString()}] runner turn | ${input.taskPageTitle}`,
    "",
    `Stored [task memory page](${input.taskPageRelativePath}) for node \`${input.nodeId}\`.`,
    `Stop reason: \`${input.result.stopReason}\`.`,
    ""
  ].join("\n");
}

async function collectMarkdownFilesRecursively(
  rootPath: string
): Promise<string[]> {
  try {
    const entries = await readdir(rootPath, { withFileTypes: true });
    const nestedFiles = await Promise.all(
      entries.map(async (entry) => {
        const absolutePath = path.join(rootPath, entry.name);

        if (entry.isDirectory()) {
          return collectMarkdownFilesRecursively(absolutePath);
        }

        return absolutePath.endsWith(".md") ? [absolutePath] : [];
      })
    );

    return nestedFiles.flat();
  } catch (error: unknown) {
    if (isFileMissingError(error)) {
      return [];
    }

    throw error;
  }
}

function extractTaskPageTitle(content: string, fallbackTitle: string): string {
  const firstLine = content.split("\n")[0]?.trim();

  if (firstLine?.startsWith("# Task Memory ")) {
    return firstLine.replace("# Task Memory ", "").trim();
  }

  return fallbackTitle;
}

function extractTaskPageOutcome(content: string): {
  assistantSummary: string;
  failureSummary?: string;
  providerStopReason?: string;
  stopReason: string;
  tokenUsage?: string;
  toolExecutionCount: number;
} {
  const lines = content.split("\n");
  const outcomeHeadingIndex = lines.findIndex((line) => line.trim() === "## Outcome");

  if (outcomeHeadingIndex === -1) {
    return {
      assistantSummary: "No assistant summary was recorded for this task page.",
      stopReason: "unknown",
      toolExecutionCount: 0
    };
  }

  const outcomeLines: string[] = [];

  for (const line of lines.slice(outcomeHeadingIndex + 1)) {
    if (line.trim().startsWith("## ")) {
      break;
    }

    outcomeLines.push(line.trimEnd());
  }

  let stopReason = "unknown";
  let providerStopReason: string | undefined;
  let tokenUsage: string | undefined;
  let failureSummary: string | undefined;
  let toolExecutionCount = 0;
  const assistantSummaryLines: string[] = [];

  for (const line of outcomeLines) {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      if (assistantSummaryLines.length > 0) {
        assistantSummaryLines.push("");
      }
      continue;
    }

    if (trimmedLine.startsWith("- Stop reason: ")) {
      stopReason = trimmedLine
        .replace("- Stop reason: ", "")
        .replaceAll("`", "")
        .trim();
      continue;
    }

    if (trimmedLine.startsWith("- Provider stop reason: ")) {
      providerStopReason = trimmedLine
        .replace("- Provider stop reason: ", "")
        .replaceAll("`", "")
        .trim();
      continue;
    }

    if (trimmedLine.startsWith("- Token usage: ")) {
      tokenUsage = trimmedLine.replace("- Token usage: ", "").trim();
      continue;
    }

    if (trimmedLine.startsWith("- Failure: ")) {
      failureSummary = trimmedLine.replace("- Failure: ", "").trim();
      continue;
    }

    if (trimmedLine === "- Tool executions:") {
      continue;
    }

    if (trimmedLine === "- Tool executions: none") {
      toolExecutionCount = 0;
      continue;
    }

    if (line.startsWith("  - #")) {
      toolExecutionCount += 1;
      continue;
    }

    assistantSummaryLines.push(trimmedLine);
  }

  return {
    assistantSummary:
      assistantSummaryLines.join("\n").trim() ||
      "No assistant summary was recorded for this task page.",
    ...(failureSummary ? { failureSummary } : {}),
    ...(providerStopReason ? { providerStopReason } : {}),
    stopReason,
    ...(tokenUsage ? { tokenUsage } : {}),
    toolExecutionCount
  };
}

async function buildRecentWorkSummaryContent(input: {
  wikiRoot: string;
}): Promise<string> {
  const taskRoot = path.join(input.wikiRoot, "tasks");
  const taskPaths = await collectMarkdownFilesRecursively(taskRoot);
  const taskEntries = await Promise.all(
    taskPaths.map(async (taskPath) => ({
      content: await readFile(taskPath, "utf8"),
      modifiedAt: (await stat(taskPath)).mtimeMs,
      relativePath: path
        .relative(input.wikiRoot, taskPath)
        .split(path.sep)
        .join(path.posix.sep)
    }))
  );

  const recentEntries = taskEntries
    .sort((left, right) => right.modifiedAt - left.modifiedAt)
    .slice(0, maxRecentSummaryEntries);

  const contentLines = ["# Recent Work Summary", "", "## Latest Turns", ""];

  if (recentEntries.length === 0) {
    contentLines.push("No completed task pages have been recorded yet.", "");
    return contentLines.join("\n");
  }

  for (const entry of recentEntries) {
    const title = extractTaskPageTitle(
      entry.content,
      path.basename(entry.relativePath, ".md")
    );
    const outcome = extractTaskPageOutcome(entry.content);

    contentLines.push(
      `### ${title}`,
      "",
      `- Stop reason: \`${outcome.stopReason}\``,
      ...(outcome.providerStopReason
        ? [`- Provider stop reason: \`${outcome.providerStopReason}\``]
        : []),
      ...(outcome.tokenUsage
        ? [`- Token usage: ${outcome.tokenUsage}`]
        : []),
      ...(outcome.failureSummary
        ? [`- Failure: ${outcome.failureSummary}`]
        : []),
      `- Tool executions: ${
        outcome.toolExecutionCount > 0 ? outcome.toolExecutionCount : "none"
      }`,
      `- Task page: [${title}](${entry.relativePath})`,
      "",
      outcome.assistantSummary,
      ""
    );
  }

  return contentLines.join("\n");
}

export async function performPostTurnMemoryUpdate(
  input: PostTurnMemoryUpdateInput
): Promise<PostTurnMemoryUpdateResult> {
  const wikiRoot = path.join(input.context.workspace.memoryRoot, "wiki");
  const indexPath = path.join(wikiRoot, "index.md");
  const logPath = path.join(wikiRoot, "log.md");
  const summaryPagePath = resolveRecentWorkSummaryPath(wikiRoot);
  const taskPageRelativePath = buildTaskPageRelativePath({
    sessionId: input.envelope.message.sessionId,
    turnId: input.turnId
  });
  const taskPagePath = resolveTaskPagePath({
    sessionId: input.envelope.message.sessionId,
    turnId: input.turnId,
    wikiRoot
  });
  const taskPageTitle = buildTaskPageTitle({
    sessionId: input.envelope.message.sessionId,
    turnId: input.turnId
  });
  const taskPageContent = buildTaskPageContent({
    consumedArtifactIds: input.consumedArtifactIds,
    envelope: input.envelope,
    producedArtifactIds: input.producedArtifactIds,
    result: input.result,
    taskPageTitle
  });

  const [currentIndex, currentLog] = await Promise.all([
    readTextFileOrDefault(indexPath, "# Wiki Index\n"),
    readTextFileOrDefault(logPath, "# Wiki Log\n")
  ]);
  const indexBullet = `- [${taskPageTitle}](${taskPageRelativePath})`;
  const summaryBullet = "- [Recent Work Summary](summaries/recent-work.md)";
  const nextIndex = appendSectionBullet(
    appendSectionBullet(currentIndex, "Task Pages", indexBullet),
    "Summaries",
    summaryBullet
  );
  const nextLog = `${currentLog.trimEnd()}\n\n${buildLogEntry({
    nodeId: input.context.binding.node.nodeId,
    result: input.result,
    taskPageRelativePath,
    taskPageTitle
  })}`.trimEnd() + "\n";

  await Promise.all([
    writeTextFile(taskPagePath, `${taskPageContent.trimEnd()}\n`),
    writeTextFile(indexPath, nextIndex),
    writeTextFile(logPath, nextLog)
  ]);
  const recentWorkSummary = await buildRecentWorkSummaryContent({
    wikiRoot
  });

  await writeTextFile(summaryPagePath, `${recentWorkSummary.trimEnd()}\n`);

  return {
    indexPath,
    logPath,
    summaryPagePath,
    taskPagePath
  };
}
