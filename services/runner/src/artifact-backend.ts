import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import type {
  AgentEngineTurnResult,
  ArtifactRecord,
  EffectiveRuntimeContext,
  EntangleA2AMessage
} from "@entangle/types";
import { artifactRecordSchema } from "@entangle/types";

type ArtifactMaterializationInput = {
  context: EffectiveRuntimeContext;
  envelope: {
    eventId: string;
    message: EntangleA2AMessage;
  };
  result: AgentEngineTurnResult;
  turnId: string;
};

type ArtifactMaterializationResult = {
  artifacts: ArtifactRecord[];
};

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

function nowIsoString(): string {
  return new Date().toISOString();
}

function sanitizeBranchComponent(value: string): string {
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return sanitized || "work";
}

function buildBranchName(input: {
  intent: string;
  nodeId: string;
  sessionId: string;
}): string {
  const scope = sanitizeBranchComponent(input.intent).slice(0, 48);
  return `${input.nodeId}/${input.sessionId}/${scope}`;
}

function buildReportRelativePath(input: {
  sessionId: string;
  turnId: string;
}): string {
  return path.join("reports", input.sessionId, `${input.turnId}.md`);
}

function buildCommitMessage(input: {
  intent: string;
  nodeId: string;
  turnId: string;
}): string {
  const scope = sanitizeBranchComponent(input.intent).slice(0, 48);
  return `entangle(${input.nodeId}): ${scope} ${input.turnId}`;
}

function buildReportContent(input: {
  context: EffectiveRuntimeContext;
  envelope: ArtifactMaterializationInput["envelope"];
  reportRelativePath: string;
  result: AgentEngineTurnResult;
  turnId: string;
}): string {
  const assistantSummary =
    input.result.assistantMessages.join("\n\n").trim() ||
    "The runner completed the turn without producing assistant output.";
  const inboundArtifacts =
    input.envelope.message.work.artifactRefs.length > 0
      ? input.envelope.message.work.artifactRefs
          .map((artifactRef) => `- ${artifactRef.artifactId} (${artifactRef.backend})`)
          .join("\n")
      : "- none";

  return [
    `# Entangle Turn Report`,
    ``,
    `- node_id: ${input.context.binding.node.nodeId}`,
    `- session_id: ${input.envelope.message.sessionId}`,
    `- conversation_id: ${input.envelope.message.conversationId}`,
    `- turn_id: ${input.turnId}`,
    `- message_id: ${input.envelope.eventId}`,
    `- intent: ${input.envelope.message.intent}`,
    `- stop_reason: ${input.result.stopReason}`,
    `- branch: ${buildBranchName({
      intent: input.envelope.message.intent,
      nodeId: input.context.binding.node.nodeId,
      sessionId: input.envelope.message.sessionId
    })}`,
    `- report_path: ${input.reportRelativePath}`,
    ``,
    `## Inbound Summary`,
    ``,
    input.envelope.message.work.summary,
    ``,
    `## Inbound Artifact Refs`,
    ``,
    inboundArtifacts,
    ``,
    `## Assistant Output`,
    ``,
    assistantSummary,
    ``
  ].join("\n");
}

async function runGitCommand(
  repoPath: string,
  args: string[]
): Promise<string> {
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
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }

      reject(
        new Error(
          `Git command failed (${args.join(" ")}): ${stderr.trim() || stdout.trim()}`
        )
      );
    });
  });
}

async function ensureGitWorkspace(input: {
  branchName: string;
  context: EffectiveRuntimeContext;
  repoPath: string;
}): Promise<void> {
  const gitDirectoryPath = path.join(input.repoPath, ".git");
  const repoExists = await pathExists(gitDirectoryPath);

  if (!repoExists) {
    await runGitCommand(input.repoPath, [
      "init",
      `--initial-branch=${input.branchName}`
    ]);
  } else {
    await runGitCommand(input.repoPath, ["checkout", "-B", input.branchName]);
  }

  await runGitCommand(input.repoPath, [
    "config",
    "user.name",
    input.context.binding.node.displayName
  ]);
  await runGitCommand(input.repoPath, [
    "config",
    "user.email",
    `${input.context.binding.node.nodeId}@entangle.invalid`
  ]);
}

async function createGitReportArtifact(
  input: ArtifactMaterializationInput
): Promise<ArtifactRecord> {
  const repoPath = input.context.workspace.artifactWorkspaceRoot;
  const branchName = buildBranchName({
    intent: input.envelope.message.intent,
    nodeId: input.context.binding.node.nodeId,
    sessionId: input.envelope.message.sessionId
  });
  await ensureGitWorkspace({
    branchName,
    context: input.context,
    repoPath
  });

  const reportRelativePath = buildReportRelativePath({
    sessionId: input.envelope.message.sessionId,
    turnId: input.turnId
  });
  const reportAbsolutePath = path.join(repoPath, reportRelativePath);
  await mkdir(path.dirname(reportAbsolutePath), { recursive: true });
  await writeFile(
    reportAbsolutePath,
    buildReportContent({
      context: input.context,
      envelope: input.envelope,
      reportRelativePath,
      result: input.result,
      turnId: input.turnId
    }),
    "utf8"
  );

  await runGitCommand(repoPath, ["add", "--", reportRelativePath]);
  await runGitCommand(repoPath, [
    "commit",
    "-m",
    buildCommitMessage({
      intent: input.envelope.message.intent,
      nodeId: input.context.binding.node.nodeId,
      turnId: input.turnId
    })
  ]);
  const commit = await runGitCommand(repoPath, ["rev-parse", "HEAD"]);
  const timestamp = nowIsoString();

  return artifactRecordSchema.parse({
    createdAt: timestamp,
    ref: {
      artifactId: `report-${input.turnId}`,
      artifactKind: "report_file",
      backend: "git",
      contentSummary:
        input.result.assistantMessages.join("\n").trim() ||
        `Turn report for ${input.context.binding.node.nodeId}.`,
      conversationId: input.envelope.message.conversationId,
      createdByNodeId: input.context.binding.node.nodeId,
      locator: {
        branch: branchName,
        commit,
        gitServiceRef: input.context.artifactContext.primaryGitServiceRef,
        namespace: input.context.artifactContext.defaultNamespace,
        path: reportRelativePath,
        repoPath
      },
      preferred: true,
      sessionId: input.envelope.message.sessionId,
      status: "materialized"
    },
    turnId: input.turnId,
    updatedAt: timestamp
  });
}

export interface RunnerArtifactBackend {
  materializeTurnArtifacts(
    input: ArtifactMaterializationInput
  ): Promise<ArtifactMaterializationResult>;
}

export class GitCliRunnerArtifactBackend implements RunnerArtifactBackend {
  async materializeTurnArtifacts(
    input: ArtifactMaterializationInput
  ): Promise<ArtifactMaterializationResult> {
    const artifact = await createGitReportArtifact(input);

    return {
      artifacts: [artifact]
    };
  }
}
