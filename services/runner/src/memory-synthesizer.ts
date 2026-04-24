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
  resolveOpenQuestionsSummaryPath,
  resolveStableFactsSummaryPath,
  resolveWorkingContextSummaryPath,
  workingContextSummaryRelativePath,
  writeTextFile
} from "./memory-maintenance.js";
import { buildRunnerStatePaths } from "./state-store.js";
import {
  buildRunnerSessionStateSnapshot,
  type RunnerSessionStateSnapshot,
  renderRunnerSessionStateSnapshotForPrompt
} from "./session-state-snapshot.js";
import { collectMemoryRefs } from "./runtime-context.js";
import type { RunnerInboundEnvelope } from "./transport.js";

const maxWorkingContextListEntries = 6;
const maxSynthesisArtifacts = 6;
const maxSynthesisRecentTurns = 4;
const maxSynthesisToolObservations = 4;

const workingContextSummaryToolId = "write_memory_summary";
const workingContextSummaryBullet =
  "- [Working Context Summary](summaries/working-context.md)";
const stableFactsSummaryBullet = "- [Stable Facts Summary](summaries/stable-facts.md)";
const openQuestionsSummaryBullet =
  "- [Open Questions Summary](summaries/open-questions.md)";

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
      updatedSummaryPagePaths: string[];
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

function renderCurrentTurnOutcomeForPrompt(
  result: AgentEngineTurnResult
): string {
  const toolExecutionLines =
    result.toolExecutions.length > 0
      ? result.toolExecutions
          .slice(0, maxSynthesisToolObservations)
          .map((toolExecution) =>
            [
              `  - #${toolExecution.sequence} ${toolExecution.toolId}`,
              `[${toolExecution.outcome}]`,
              ...(toolExecution.errorCode
                ? [`error=${toolExecution.errorCode}`]
                : [])
            ].join(" ")
          )
      : ["  - none"];

  return [
    "Current turn engine outcome:",
    `- stop reason: \`${result.stopReason}\``,
    ...(result.providerStopReason
      ? [`- provider stop reason: \`${result.providerStopReason}\``]
      : []),
    ...(result.usage
      ? [
          `- token usage: input=${result.usage.inputTokens} output=${result.usage.outputTokens}`
        ]
      : []),
    ...(result.failure
      ? [
          `- failure: \`${result.failure.classification}\` ${result.failure.message}`
        ]
      : []),
    "- tool executions:",
    ...toolExecutionLines
  ].join("\n");
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
        executionInsights: string[];
        focus: string;
        nextActions: string[];
        openQuestions: string[];
        sessionInsights: string[];
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
    "executionInsights",
    "focus",
    "nextActions",
    "openQuestions",
    "sessionInsights",
    "stableFacts",
    "summary"
  ]);
  const inputRecord = input as Record<string, unknown>;
  const extraKeys = Object.keys(inputRecord).filter((key) => !allowedKeys.has(key));
  const artifactInsights = coerceStringArray(inputRecord.artifactInsights);
  const executionInsights = coerceStringArray(inputRecord.executionInsights);
  const focus = coerceNonEmptyString(inputRecord.focus);
  const nextActions = coerceStringArray(inputRecord.nextActions);
  const openQuestions = coerceStringArray(inputRecord.openQuestions);
  const sessionInsights = coerceStringArray(inputRecord.sessionInsights);
  const stableFacts = coerceStringArray(inputRecord.stableFacts);
  const summary = coerceNonEmptyString(inputRecord.summary);
  const issues: string[] = [];

  if (!focus) {
    issues.push("The 'focus' field must be a non-empty string.");
  }

  if (!artifactInsights) {
    issues.push(
      "The 'artifactInsights' field must be an array of non-empty strings."
    );
  }

  if (!executionInsights) {
    issues.push(
      "The 'executionInsights' field must be an array of non-empty strings."
    );
  }

  if (!sessionInsights) {
    issues.push(
      "The 'sessionInsights' field must be an array of non-empty strings."
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
    executionInsights &&
    executionInsights.length > maxWorkingContextListEntries
  ) {
    issues.push(
      `The 'executionInsights' field may contain at most ${maxWorkingContextListEntries} entries.`
    );
  }

  if (
    sessionInsights &&
    sessionInsights.length > maxWorkingContextListEntries
  ) {
    issues.push(
      `The 'sessionInsights' field may contain at most ${maxWorkingContextListEntries} entries.`
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
      executionInsights: executionInsights!,
      focus: focus!,
      nextActions: nextActions!,
      openQuestions: openQuestions!,
      sessionInsights: sessionInsights!,
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
        executionInsights: {
          description:
            "A bounded list of durable execution signals worth carrying forward from the current turn.",
          items: {
            type: "string"
          },
          type: "array"
        },
        sessionInsights: {
          description:
            "A bounded list of durable session or coordination observations worth carrying forward.",
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
        "executionInsights",
        "summary",
        "sessionInsights",
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
  input: RunnerMemorySynthesisInput & {
    sessionSnapshot?: RunnerSessionStateSnapshot;
  }
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
  return {
    sessionId: input.envelope.message.sessionId,
    nodeId: input.context.binding.node.nodeId,
    systemPromptParts: [
      "You are maintaining the node's private working memory after a completed turn.",
      "You do not write files directly. Use the provided tool exactly once to update the canonical working-context summary.",
      "Keep the summary concise, durable, and grounded in the current turn plus the injected memory references.",
      "Preserve only durable session or coordination observations that future turns should retain; do not restate transient workflow state verbatim.",
      "Preserve only durable artifact-backed observations that future turns should retain; do not restate raw file contents.",
      "Preserve only durable execution signals that matter beyond this single turn; do not copy transient logs verbatim.",
      "Do not include secrets, speculative claims, or verbose restatement of logs."
    ],
    interactionPromptParts: [
      `Graph: ${input.context.binding.graphId}`,
      `Node: ${input.context.binding.node.displayName} (${input.context.binding.node.nodeId})`,
      `Inbound intent: ${input.envelope.message.intent}`,
      `Inbound summary: ${input.envelope.message.work.summary}`,
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
      renderCurrentTurnOutcomeForPrompt(input.result),
      `Current assistant outcome:\n${assistantSummary}`,
      ...(input.sessionSnapshot
        ? [
            renderRunnerSessionStateSnapshotForPrompt(input.sessionSnapshot)
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

function renderSessionContextLines(
  sessionSnapshot: RunnerSessionStateSnapshot | undefined
): string[] {
  if (!sessionSnapshot) {
    return ["- No current session snapshot was available during synthesis."];
  }

  return [
    `- Session status: \`${sessionSnapshot.session.status}\``,
    `- Active conversations: ${sessionSnapshot.session.activeConversationIds.length}`,
    `- Waiting approvals: ${sessionSnapshot.session.waitingApprovalIds.length}`,
    `- Recent turns in snapshot: ${sessionSnapshot.recentTurns.length}`
  ];
}

function buildWorkingContextSummaryContent(input: {
  artifactInsights: string[];
  consumedArtifactIds: string[];
  executionInsights: string[];
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
  sessionInsights: string[];
  sessionSnapshot: RunnerSessionStateSnapshot | undefined;
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
    "## Session Context",
    "",
    ...renderSessionContextLines(input.sessionSnapshot),
    "",
    "### Durable Session Insights",
    "",
    ...renderBulletList(
      input.sessionInsights,
      "- No durable session-state observations were synthesized."
    ),
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
    "",
    "## Execution Signals",
    "",
    ...renderBulletList(
      input.executionInsights,
      "- No durable execution signals were synthesized."
    ),
    ""
  ].join("\n");
}

function buildStableFactsSummaryContent(input: {
  recentWorkSummaryPath: string;
  sessionId: string;
  stableFacts: string[];
  taskPagePath: string;
  turnId: string;
  wikiRoot: string;
  workingContextPagePath: string;
}): string {
  const taskPageRelativePath = toPosixRelativePath(input.wikiRoot, input.taskPagePath);
  const recentWorkRelativePath = toPosixRelativePath(
    input.wikiRoot,
    input.recentWorkSummaryPath
  );
  const workingContextRelativePath = toPosixRelativePath(
    input.wikiRoot,
    input.workingContextPagePath
  );

  return [
    "# Stable Facts Summary",
    "",
    `- Updated at: \`${nowIsoString()}\``,
    `- Session: \`${input.sessionId}\``,
    `- Turn: \`${input.turnId}\``,
    `- Task page: [Current Task Memory](${taskPageRelativePath})`,
    `- Working context: [Working Context Summary](${workingContextRelativePath})`,
    `- Recent work: [Recent Work Summary](${recentWorkRelativePath})`,
    "",
    "## Stable Facts",
    "",
    ...renderBulletList(
      input.stableFacts,
      "- No durable stable facts were synthesized."
    ),
    ""
  ].join("\n");
}

function buildOpenQuestionsSummaryContent(input: {
  nextActions: string[];
  openQuestions: string[];
  recentWorkSummaryPath: string;
  sessionId: string;
  taskPagePath: string;
  turnId: string;
  wikiRoot: string;
  workingContextPagePath: string;
}): string {
  const taskPageRelativePath = toPosixRelativePath(input.wikiRoot, input.taskPagePath);
  const recentWorkRelativePath = toPosixRelativePath(
    input.wikiRoot,
    input.recentWorkSummaryPath
  );
  const workingContextRelativePath = toPosixRelativePath(
    input.wikiRoot,
    input.workingContextPagePath
  );

  return [
    "# Open Questions Summary",
    "",
    `- Updated at: \`${nowIsoString()}\``,
    `- Session: \`${input.sessionId}\``,
    `- Turn: \`${input.turnId}\``,
    `- Task page: [Current Task Memory](${taskPageRelativePath})`,
    `- Working context: [Working Context Summary](${workingContextRelativePath})`,
    `- Recent work: [Recent Work Summary](${recentWorkRelativePath})`,
    "",
    "## Open Questions",
    "",
    ...renderBulletList(
      input.openQuestions,
      "- No durable open questions were synthesized."
    ),
    "",
    "## Suggested Next Actions",
    "",
    ...renderBulletList(
      input.nextActions,
      "- No immediate next actions were synthesized."
    ),
    ""
  ].join("\n");
}

function buildMemorySynthesisLogEntry(input: {
  errorMessage?: string;
  updatedSummaryRelativePaths?: string[];
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
    `Updated ${input.updatedSummaryRelativePaths
      ?.map((summaryRelativePath) => `[${path.posix.basename(summaryRelativePath, ".md").replace(/-/g, " ")}](${summaryRelativePath})`)
      .join(", ") ?? `[Working Context Summary](${workingContextSummaryRelativePath})`} from [${input.turnId}](${taskPageRelativePath}) via bounded model-guided synthesis.`,
    ""
  ].join("\n");
}

function createWorkingContextSummaryToolExecutor(input: {
  sessionSnapshot: RunnerSessionStateSnapshot | undefined;
  synthesis: RunnerMemorySynthesisInput;
  writePathCapture: {
    openQuestionsPagePath: string | undefined;
    stableFactsPagePath: string | undefined;
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
      const stableFactsPagePath = resolveStableFactsSummaryPath(wikiRoot);
      const openQuestionsPagePath = resolveOpenQuestionsSummaryPath(wikiRoot);
      const normalizedInput = {
        ...parsedInput.value,
        artifactInsights: normalizeListEntries(parsedInput.value.artifactInsights),
        executionInsights: normalizeListEntries(parsedInput.value.executionInsights),
        nextActions: normalizeListEntries(parsedInput.value.nextActions),
        openQuestions: normalizeListEntries(parsedInput.value.openQuestions),
        sessionInsights: normalizeListEntries(parsedInput.value.sessionInsights),
        stableFacts: normalizeListEntries(parsedInput.value.stableFacts)
      };
      const content = buildWorkingContextSummaryContent({
        artifactInsights: normalizedInput.artifactInsights,
        consumedArtifactIds: input.synthesis.consumedArtifactIds,
        executionInsights: normalizedInput.executionInsights,
        focus: normalizedInput.focus,
        nextActions: normalizedInput.nextActions,
        openQuestions: normalizedInput.openQuestions,
        producedArtifactIds: input.synthesis.producedArtifactIds,
        recentWorkSummaryPath: input.synthesis.recentWorkSummaryPath,
        sessionId: input.synthesis.envelope.message.sessionId,
        sessionInsights: normalizedInput.sessionInsights,
        sessionSnapshot: input.sessionSnapshot,
        stableFacts: normalizedInput.stableFacts,
        summary: normalizedInput.summary,
        taskPagePath: input.synthesis.taskPagePath,
        turnId: input.synthesis.turnId,
        wikiRoot
      });
      const stableFactsContent = buildStableFactsSummaryContent({
        recentWorkSummaryPath: input.synthesis.recentWorkSummaryPath,
        sessionId: input.synthesis.envelope.message.sessionId,
        stableFacts: normalizedInput.stableFacts,
        taskPagePath: input.synthesis.taskPagePath,
        turnId: input.synthesis.turnId,
        wikiRoot,
        workingContextPagePath
      });
      const openQuestionsContent = buildOpenQuestionsSummaryContent({
        nextActions: normalizedInput.nextActions,
        openQuestions: normalizedInput.openQuestions,
        recentWorkSummaryPath: input.synthesis.recentWorkSummaryPath,
        sessionId: input.synthesis.envelope.message.sessionId,
        taskPagePath: input.synthesis.taskPagePath,
        turnId: input.synthesis.turnId,
        wikiRoot,
        workingContextPagePath
      });

      await Promise.all([
        writeTextFile(workingContextPagePath, `${content.trimEnd()}\n`),
        writeTextFile(stableFactsPagePath, `${stableFactsContent.trimEnd()}\n`),
        writeTextFile(openQuestionsPagePath, `${openQuestionsContent.trimEnd()}\n`)
      ]);
      input.writePathCapture.openQuestionsPagePath = openQuestionsPagePath;
      input.writePathCapture.stableFactsPagePath = stableFactsPagePath;
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
  updatedSummaryPagePaths?: string[];
}): Promise<void> {
  const wikiRoot = path.join(input.synthesis.context.workspace.memoryRoot, "wiki");
  const logPath = path.join(wikiRoot, "log.md");
  const currentLog = await readTextFileOrDefault(logPath, "# Wiki Log\n");
  const nextLog =
    `${currentLog.trimEnd()}\n\n${buildMemorySynthesisLogEntry({
      ...(input.errorMessage ? { errorMessage: input.errorMessage } : {}),
      ...(input.updatedSummaryPagePaths
        ? {
            updatedSummaryRelativePaths: input.updatedSummaryPagePaths.map(
              (summaryPagePath) => toPosixRelativePath(wikiRoot, summaryPagePath)
            )
          }
        : {}),
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
  let nextIndex = appendSectionBullet(currentIndex, "Summaries", workingContextSummaryBullet);
  nextIndex = appendSectionBullet(nextIndex, "Summaries", stableFactsSummaryBullet);
  nextIndex = appendSectionBullet(nextIndex, "Summaries", openQuestionsSummaryBullet);

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
      const sessionSnapshot = await buildRunnerSessionStateSnapshot({
        maxArtifacts: maxSynthesisArtifacts,
        maxRecentTurns: maxSynthesisRecentTurns,
        sessionId: synthesis.envelope.message.sessionId,
        statePaths: buildRunnerStatePaths(synthesis.context.workspace.runtimeRoot)
      });
      const writePathCapture: {
        openQuestionsPagePath: string | undefined;
        stableFactsPagePath: string | undefined;
        workingContextPagePath: string | undefined;
      } = {
        openQuestionsPagePath: undefined,
        stableFactsPagePath: undefined,
        workingContextPagePath: undefined
      };
      const toolExecutor = createWorkingContextSummaryToolExecutor({
        sessionSnapshot,
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
        const request = await buildModelGuidedMemorySynthesisTurnRequest(
          sessionSnapshot
            ? {
                ...synthesis,
                sessionSnapshot
              }
            : synthesis
        );
        await engine.executeTurn(request);

        if (!writePathCapture.workingContextPagePath) {
          throw new Error(
            "Model-guided memory synthesis completed without updating the working context summary."
          );
        }
        if (!writePathCapture.stableFactsPagePath) {
          throw new Error(
            "Model-guided memory synthesis completed without updating the stable facts summary."
          );
        }
        if (!writePathCapture.openQuestionsPagePath) {
          throw new Error(
            "Model-guided memory synthesis completed without updating the open questions summary."
          );
        }

        const updatedSummaryPagePaths = [
          writePathCapture.workingContextPagePath,
          writePathCapture.stableFactsPagePath,
          writePathCapture.openQuestionsPagePath
        ];

        await Promise.all([
          ensureWorkingContextIndexed(synthesis.context),
          appendMemorySynthesisLog({
            synthesis,
            updatedSummaryPagePaths
          })
        ]);

        return {
          ok: true,
          updatedSummaryPagePaths,
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
