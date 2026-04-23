import { mkdir, readFile, writeFile } from "node:fs/promises";
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
  taskPagePath: string;
};

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

async function readTextFileOrDefault(
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

async function writeTextFile(filePath: string, content: string): Promise<void> {
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

function appendSectionBullet(
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

export async function performPostTurnMemoryUpdate(
  input: PostTurnMemoryUpdateInput
): Promise<PostTurnMemoryUpdateResult> {
  const wikiRoot = path.join(input.context.workspace.memoryRoot, "wiki");
  const indexPath = path.join(wikiRoot, "index.md");
  const logPath = path.join(wikiRoot, "log.md");
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
  const nextIndex = appendSectionBullet(currentIndex, "Task Pages", indexBullet);
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

  return {
    indexPath,
    logPath,
    taskPagePath
  };
}
