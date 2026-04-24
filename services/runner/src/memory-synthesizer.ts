import path from "node:path";
import type {
  AgentEngine,
  AgentEngineToolExecutor
} from "@entangle/agent-engine";
import { createAgentEngineForModelContext } from "@entangle/agent-engine";
import {
  engineToolExecutionResultSchema,
  type AgentEngineTurnRequest,
  type AgentEngineTurnResult,
  type ArtifactRecord,
  type ArtifactRef,
  type EngineArtifactInput,
  type EffectiveRuntimeContext,
  type EngineToolDefinition
} from "@entangle/types";
import {
  appendSectionBullet,
  readTextFileOrDefault,
  resolveWorkingContextSummaryPath,
  workingContextSummaryRelativePath,
  writeTextFile
} from "./memory-maintenance.js";
import { buildRunnerStatePaths } from "./state-store.js";
import {
  buildRunnerSessionStateSnapshot,
  renderRunnerSessionStateSnapshotForPrompt
} from "./session-state-snapshot.js";
import { collectMemoryRefs } from "./runtime-context.js";
import type { RunnerInboundEnvelope } from "./transport.js";

const maxWorkingContextListEntries = 6;
const maxSynthesisArtifacts = 6;
const maxSynthesisRecentTurns = 4;

const workingContextSummaryToolId = "write_memory_summary";
const workingContextSummaryBullet =
  "- [Working Context Summary](summaries/working-context.md)";

export type RunnerMemorySynthesisInput = {
  artifactInputs: EngineArtifactInput[];
  artifactRefs: ArtifactRef[];
  consumedArtifactIds: string[];
  context: EffectiveRuntimeContext;
  envelope: RunnerInboundEnvelope;
  producedArtifactIds: string[];
  recentWorkSummaryPath: string;
  result: AgentEngineTurnResult;
  taskPagePath: string;
  turnId: string;
};

export type RunnerMemorySynthesisResult =
  | {
      ok: true;
      workingContextPagePath: string;
    }
  | {
      errorMessage: string;
      ok: false;
    };

export interface RunnerMemorySynthesizer {
  synthesize(
    input: RunnerMemorySynthesisInput
  ): Promise<RunnerMemorySynthesisResult>;
}

function nowIsoString(): string {
  return new Date().toISOString();
}

function toPosixRelativePath(rootPath: string, targetPath: string): string {
  return path.relative(rootPath, targetPath).split(path.sep).join(path.posix.sep);
}

function renderBulletList(entries: string[], fallbackLine: string): string[] {
  if (entries.length === 0) {
    return [fallbackLine];
  }

  return entries.map((entry) => `- ${entry}`);
}

function coerceNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

function normalizeListEntries(entries: string[]): string[] {
  return [...new Set(entries.map((entry) => entry.trim()).filter(Boolean))].slice(
    0,
    maxWorkingContextListEntries
  );
}

function dedupeArtifactRefs(artifactRefs: ArtifactRef[]): ArtifactRef[] {
  const refsById = new Map<string, ArtifactRef>();

  for (const artifactRef of artifactRefs) {
    refsById.set(artifactRef.artifactId, artifactRef);
  }

  return [...refsById.values()];
}

function dedupeArtifactInputs(
  artifactInputs: EngineArtifactInput[]
): EngineArtifactInput[] {
  const inputsById = new Map<string, EngineArtifactInput>();

  for (const artifactInput of artifactInputs) {
    inputsById.set(artifactInput.artifactId, artifactInput);
  }

  return [...inputsById.values()];
}

export function buildArtifactInputsFromMaterializedRecords(
  artifactRecords: ArtifactRecord[]
): EngineArtifactInput[] {
  return artifactRecords.flatMap((artifactRecord) => {
    if (!artifactRecord.materialization?.localPath) {
      return [];
    }

    return [
      {
        artifactId: artifactRecord.ref.artifactId,
        backend: artifactRecord.ref.backend,
        localPath: artifactRecord.materialization.localPath,
        ...(artifactRecord.materialization.repoPath
          ? {
              repoPath: artifactRecord.materialization.repoPath
            }
          : {}),
        sourceRef: artifactRecord.ref
      }
    ];
  });
}

function coerceStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalizedEntries = value
    .map((entry) => coerceNonEmptyString(entry))
    .filter((entry): entry is string => Boolean(entry));

  if (normalizedEntries.length !== value.length) {
    return undefined;
  }

  return normalizedEntries;
}

function parseWorkingContextSummaryInput(input: unknown):
  | {
      ok: true;
      value: {
        artifactInsights: string[];
        focus: string;
        nextActions: string[];
        openQuestions: string[];
        stableFacts: string[];
        summary: string;
      };
    }
  | {
      issues: string[];
      ok: false;
    } {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return {
      issues: [
        "The working-context summary tool expects a JSON object input."
      ],
      ok: false
    };
  }

  const allowedKeys = new Set([
    "artifactInsights",
    "focus",
    "summary",
    "stableFacts",
    "openQuestions",
    "nextActions"
  ]);
  const inputRecord = input as Record<string, unknown>;
  const extraKeys = Object.keys(inputRecord).filter((key) => !allowedKeys.has(key));
  const artifactInsights = coerceStringArray(inputRecord.artifactInsights);
  const focus = coerceNonEmptyString(inputRecord.focus);
  const summary = coerceNonEmptyString(inputRecord.summary);
  const stableFacts = coerceStringArray(inputRecord.stableFacts);
  const openQuestions = coerceStringArray(inputRecord.openQuestions);
  const nextActions = coerceStringArray(inputRecord.nextActions);
  const issues: string[] = [];

  if (!focus) {
    issues.push("The 'focus' field must be a non-empty string.");
  }

  if (!artifactInsights) {
    issues.push(
      "The 'artifactInsights' field must be an array of non-empty strings."
    );
  }

  if (!summary) {
    issues.push("The 'summary' field must be a non-empty string.");
  }

  if (!stableFacts) {
    issues.push("The 'stableFacts' field must be an array of non-empty strings.");
  }

  if (!openQuestions) {
    issues.push("The 'openQuestions' field must be an array of non-empty strings.");
  }

  if (!nextActions) {
    issues.push("The 'nextActions' field must be an array of non-empty strings.");
  }

  if (extraKeys.length > 0) {
    issues.push(
      `Unexpected fields were provided: ${extraKeys.sort().join(", ")}.`
    );
  }

  if (
    artifactInsights &&
    artifactInsights.length > maxWorkingContextListEntries
  ) {
    issues.push(
      `The 'artifactInsights' field may contain at most ${maxWorkingContextListEntries} entries.`
    );
  }

  if (
    stableFacts &&
    stableFacts.length > maxWorkingContextListEntries
  ) {
    issues.push(
      `The 'stableFacts' field may contain at most ${maxWorkingContextListEntries} entries.`
    );
  }

  if (
    openQuestions &&
    openQuestions.length > maxWorkingContextListEntries
  ) {
    issues.push(
      `The 'openQuestions' field may contain at most ${maxWorkingContextListEntries} entries.`
    );
  }

  if (
    nextActions &&
    nextActions.length > maxWorkingContextListEntries
  ) {
    issues.push(
      `The 'nextActions' field may contain at most ${maxWorkingContextListEntries} entries.`
    );
  }

  if (issues.length > 0) {
    return {
      issues,
      ok: false
    };
  }

  return {
    ok: true,
    value: {
      artifactInsights: artifactInsights!,
      focus: focus!,
      nextActions: nextActions!,
      openQuestions: openQuestions!,
      stableFacts: stableFacts!,
      summary: summary!
    }
  };
}

function buildWorkingContextSummaryToolDefinition(): EngineToolDefinition {
  return {
    description:
      "Update the canonical working-context summary for this node's private wiki. " +
      "Use this exactly once after reviewing the completed turn and the injected memory references. " +
      "Capture only durable, high-signal information that future turns should retain. " +
      "Do not invent facts, do not restate the full task page, and do not include secrets or speculative claims.",
    id: workingContextSummaryToolId,
    inputSchema: {
      type: "object",
      properties: {
        focus: {
          description:
            "One concise sentence describing the node's current working focus.",
          type: "string"
        },
        artifactInsights: {
          description:
            "A bounded list of durable artifact-backed observations worth carrying forward.",
          items: {
            type: "string"
          },
          type: "array"
        },
        summary: {
          description:
            "A short paragraph summarizing the most relevant current state.",
          type: "string"
        },
        stableFacts: {
          description:
            "A bounded list of durable facts that future turns should remember.",
          items: {
            type: "string"
          },
          type: "array"
        },
        openQuestions: {
          description:
            "A bounded list of unresolved questions or uncertainties worth carrying forward.",
          items: {
            type: "string"
          },
          type: "array"
        },
        nextActions: {
          description:
            "A bounded list of immediate next actions that likely matter for subsequent turns.",
          items: {
            type: "string"
          },
          type: "array"
        }
      },
      required: [
        "focus",
        "artifactInsights",
        "summary",
        "stableFacts",
        "openQuestions",
        "nextActions"
      ],
      additionalProperties: false
    },
    strict: true
  };
}

export async function buildModelGuidedMemorySynthesisTurnRequest(
  input: RunnerMemorySynthesisInput
): Promise<AgentEngineTurnRequest> {
  const assistantSummary =
    input.result.assistantMessages.join("\n").trim() ||
    "No assistant summary was recorded for this turn.";
  const wikiRoot = path.join(input.context.workspace.memoryRoot, "wiki");
  const taskPageRelativePath = toPosixRelativePath(wikiRoot, input.taskPagePath);
  const recentWorkRelativePath = toPosixRelativePath(
    wikiRoot,
    input.recentWorkSummaryPath
  );
  const sessionSnapshot = await buildRunnerSessionStateSnapshot({
    maxArtifacts: maxSynthesisArtifacts,
    maxRecentTurns: maxSynthesisRecentTurns,
    sessionId: input.envelope.message.sessionId,
    statePaths: buildRunnerStatePaths(input.context.workspace.runtimeRoot)
  });

  return {
    sessionId: input.envelope.message.sessionId,
    nodeId: input.context.binding.node.nodeId,
    systemPromptParts: [
      "You are maintaining the node's private working memory after a completed turn.",
      "You do not write files directly. Use the provided tool exactly once to update the canonical working-context summary.",
      "Keep the summary concise, durable, and grounded in the current turn plus the injected memory references.",
      "Preserve only durable artifact-backed observations that future turns should retain; do not restate raw file contents.",
      "Do not include secrets, speculative claims, or verbose restatement of logs."
    ],
    interactionPromptParts: [
      `Graph: ${input.context.binding.graphId}`,
      `Node: ${input.context.binding.node.displayName} (${input.context.binding.node.nodeId})`,
      `Inbound intent: ${input.envelope.message.intent}`,
      `Inbound summary: ${input.envelope.message.work.summary}`,
      `Stop reason: ${input.result.stopReason}`,
      `Current task page: ${taskPageRelativePath}`,
      `Derived recent-work summary: ${recentWorkRelativePath}`,
      `Consumed artifact ids: ${
        input.consumedArtifactIds.length > 0
          ? input.consumedArtifactIds.join(", ")
          : "none"
      }`,
      `Produced artifact ids: ${
        input.producedArtifactIds.length > 0
          ? input.producedArtifactIds.join(", ")
          : "none"
      }`,
      `Current assistant outcome:\n${assistantSummary}`,
      ...(sessionSnapshot
        ? [
            renderRunnerSessionStateSnapshotForPrompt(sessionSnapshot)
          ]
        : [])
    ],
    toolChoice: {
      type: "tool",
      toolId: workingContextSummaryToolId
    },
    toolDefinitions: [buildWorkingContextSummaryToolDefinition()],
    artifactInputs: dedupeArtifactInputs(input.artifactInputs),
    artifactRefs: dedupeArtifactRefs(input.artifactRefs),
    memoryRefs: await collectMemoryRefs(input.context),
    executionLimits: {
      maxOutputTokens: 1_024,
      maxToolTurns: 1
    }
  };
}

function buildWorkingContextSummaryContent(input: {
  artifactInsights: string[];
  consumedArtifactIds: string[];
  focus: string;
  producedArtifactIds: string[];
  recentWorkSummaryPath: string;
  sessionId: string;
  stableFacts: string[];
  summary: string;
  taskPagePath: string;
  turnId: string;
  wikiRoot: string;
  nextActions: string[];
  openQuestions: string[];
}): string {
  const taskPageRelativePath = toPosixRelativePath(input.wikiRoot, input.taskPagePath);
  const recentWorkRelativePath = toPosixRelativePath(
    input.wikiRoot,
    input.recentWorkSummaryPath
  );

  return [
    "# Working Context Summary",
    "",
    `- Updated at: \`${nowIsoString()}\``,
    `- Session: \`${input.sessionId}\``,
    `- Turn: \`${input.turnId}\``,
    `- Task page: [Current Task Memory](${taskPageRelativePath})`,
    `- Recent work: [Recent Work Summary](${recentWorkRelativePath})`,
    "",
    "## Current Focus",
    "",
    input.focus,
    "",
    "## Summary",
    "",
    input.summary,
    "",
    "## Stable Facts",
    "",
    ...renderBulletList(input.stableFacts, "- No durable facts were synthesized."),
    "",
    "## Open Questions",
    "",
    ...renderBulletList(input.openQuestions, "- No open questions were recorded."),
    "",
    "## Next Actions",
    "",
    ...renderBulletList(input.nextActions, "- No immediate next actions were recorded."),
    "",
    "## Artifact Context",
    "",
    "### Consumed Artifacts",
    "",
    ...renderBulletList(
      input.consumedArtifactIds.map((artifactId) => `Consumed artifact: \`${artifactId}\``),
      "- No inbound artifacts were consumed in this turn."
    ),
    "",
    "### Produced Artifacts",
    "",
    ...renderBulletList(
      input.producedArtifactIds.map((artifactId) => `Produced artifact: \`${artifactId}\``),
      "- No new durable artifacts were produced in this turn."
    ),
    "",
    "### Durable Artifact Insights",
    "",
    ...renderBulletList(
      input.artifactInsights,
      "- No durable artifact-backed observations were synthesized."
    ),
    ""
  ].join("\n");
}

function buildMemorySynthesisLogEntry(input: {
  errorMessage?: string;
  taskPagePath: string;
  turnId: string;
  wikiRoot: string;
}): string {
  const taskPageRelativePath = toPosixRelativePath(input.wikiRoot, input.taskPagePath);

  if (input.errorMessage) {
    return [
      `## [${nowIsoString()}] memory synthesis failed | ${input.turnId}`,
      "",
      `Model-guided memory synthesis did not update the working context summary for [${input.turnId}](${taskPageRelativePath}).`,
      `Reason: ${input.errorMessage}`,
      ""
    ].join("\n");
  }

  return [
    `## [${nowIsoString()}] memory synthesis | ${input.turnId}`,
    "",
    `Updated [Working Context Summary](${workingContextSummaryRelativePath}) from [${input.turnId}](${taskPageRelativePath}) via bounded model-guided synthesis.`,
    ""
  ].join("\n");
}

function createWorkingContextSummaryToolExecutor(input: {
  synthesis: RunnerMemorySynthesisInput;
  writePathCapture: {
    workingContextPagePath: string | undefined;
  };
}): AgentEngineToolExecutor {
  return {
    async executeToolCall(request) {
      if (request.tool.id !== workingContextSummaryToolId) {
        return engineToolExecutionResultSchema.parse({
          content: {
            error: "tool_not_supported",
            toolId: request.tool.id
          },
          isError: true
        });
      }

      const parsedInput = parseWorkingContextSummaryInput(request.input);

      if (!parsedInput.ok) {
        return engineToolExecutionResultSchema.parse({
          content: {
            error: "invalid_input",
            issues: parsedInput.issues,
            toolId: request.tool.id
          },
          isError: true
        });
      }

      const wikiRoot = path.join(input.synthesis.context.workspace.memoryRoot, "wiki");
      const workingContextPagePath = resolveWorkingContextSummaryPath(wikiRoot);
      const normalizedInput = {
        ...parsedInput.value,
        artifactInsights: normalizeListEntries(parsedInput.value.artifactInsights),
        nextActions: normalizeListEntries(parsedInput.value.nextActions),
        openQuestions: normalizeListEntries(parsedInput.value.openQuestions),
        stableFacts: normalizeListEntries(parsedInput.value.stableFacts)
      };
      const content = buildWorkingContextSummaryContent({
        artifactInsights: normalizedInput.artifactInsights,
        consumedArtifactIds: input.synthesis.consumedArtifactIds,
        focus: normalizedInput.focus,
        nextActions: normalizedInput.nextActions,
        openQuestions: normalizedInput.openQuestions,
        producedArtifactIds: input.synthesis.producedArtifactIds,
        recentWorkSummaryPath: input.synthesis.recentWorkSummaryPath,
        sessionId: input.synthesis.envelope.message.sessionId,
        stableFacts: normalizedInput.stableFacts,
        summary: normalizedInput.summary,
        taskPagePath: input.synthesis.taskPagePath,
        turnId: input.synthesis.turnId,
        wikiRoot
      });

      await writeTextFile(workingContextPagePath, `${content.trimEnd()}\n`);
      input.writePathCapture.workingContextPagePath = workingContextPagePath;

      return engineToolExecutionResultSchema.parse({
        content: {
          memoryRef: workingContextPagePath,
          status: "updated"
        }
      });
    }
  };
}

async function appendMemorySynthesisLog(input: {
  errorMessage?: string;
  synthesis: RunnerMemorySynthesisInput;
}): Promise<void> {
  const wikiRoot = path.join(input.synthesis.context.workspace.memoryRoot, "wiki");
  const logPath = path.join(wikiRoot, "log.md");
  const currentLog = await readTextFileOrDefault(logPath, "# Wiki Log\n");
  const nextLog =
    `${currentLog.trimEnd()}\n\n${buildMemorySynthesisLogEntry({
      ...(input.errorMessage ? { errorMessage: input.errorMessage } : {}),
      taskPagePath: input.synthesis.taskPagePath,
      turnId: input.synthesis.turnId,
      wikiRoot
    })}`.trimEnd() + "\n";

  await writeTextFile(logPath, nextLog);
}

async function ensureWorkingContextIndexed(
  context: EffectiveRuntimeContext
): Promise<void> {
  const wikiRoot = path.join(context.workspace.memoryRoot, "wiki");
  const indexPath = path.join(wikiRoot, "index.md");
  const currentIndex = await readTextFileOrDefault(indexPath, "# Wiki Index\n");
  const nextIndex = appendSectionBullet(
    currentIndex,
    "Summaries",
    workingContextSummaryBullet
  );

  await writeTextFile(indexPath, nextIndex);
}

export function createModelGuidedMemorySynthesizer(input: {
  context: EffectiveRuntimeContext;
  engineFactory?: (toolExecutor: AgentEngineToolExecutor) => AgentEngine;
}): RunnerMemorySynthesizer {
  return {
    async synthesize(
      synthesis: RunnerMemorySynthesisInput
    ): Promise<RunnerMemorySynthesisResult> {
      const writePathCapture: {
        workingContextPagePath: string | undefined;
      } = {
        workingContextPagePath: undefined
      };
      const toolExecutor = createWorkingContextSummaryToolExecutor({
        synthesis,
        writePathCapture
      });
      const engine =
        input.engineFactory?.(toolExecutor) ??
        createAgentEngineForModelContext({
          modelContext: input.context.modelContext,
          toolExecutor
        });

      try {
        const request = await buildModelGuidedMemorySynthesisTurnRequest(synthesis);
        await engine.executeTurn(request);

        if (!writePathCapture.workingContextPagePath) {
          throw new Error(
            "Model-guided memory synthesis completed without updating the working context summary."
          );
        }

        await Promise.all([
          ensureWorkingContextIndexed(synthesis.context),
          appendMemorySynthesisLog({
            synthesis
          })
        ]);

        return {
          ok: true,
          workingContextPagePath: writePathCapture.workingContextPagePath
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown memory synthesis failure.";

        try {
          await appendMemorySynthesisLog({
            errorMessage,
            synthesis
          });
        } catch {
          /* Best-effort logging only. The deterministic memory baseline already succeeded. */
        }

        return {
          errorMessage,
          ok: false
        };
      }
    }
  };
}
