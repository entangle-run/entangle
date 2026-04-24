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
  type EngineToolDefinition,
  type FocusedRegisterEntryState,
  type FocusedRegisterState
} from "@entangle/types";
import {
  appendSectionBullet,
  resolveDecisionsSummaryPath,
  resolveNextActionsSummaryPath,
  readTextFileOrDefault,
  resolveOpenQuestionsSummaryPath,
  resolveResolutionsSummaryPath,
  resolveStableFactsSummaryPath,
  resolveWorkingContextSummaryPath,
  workingContextSummaryRelativePath,
  writeTextFile
} from "./memory-maintenance.js";
import { buildRunnerStatePaths } from "./state-store.js";
import {
  readFocusedRegisterState,
  writeFocusedRegisterState
} from "./state-store.js";
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
const staleFocusedRegisterCarryThreshold = 3;

const workingContextSummaryToolId = "write_memory_summary";
const workingContextSummaryBullet =
  "- [Working Context Summary](summaries/working-context.md)";
const stableFactsSummaryBullet = "- [Stable Facts Summary](summaries/stable-facts.md)";
const openQuestionsSummaryBullet =
  "- [Open Questions Summary](summaries/open-questions.md)";
const decisionsSummaryBullet = "- [Decisions Summary](summaries/decisions.md)";
const nextActionsSummaryBullet = "- [Next Actions Summary](summaries/next-actions.md)";
const resolutionsSummaryBullet = "- [Resolutions Summary](summaries/resolutions.md)";

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

type FocusedRegisterBaseline = {
  nextActions: string[];
  openQuestions: string[];
  resolutions: string[];
};

type FocusedRegisterKind = keyof FocusedRegisterBaseline;

type FocusedRegisterPromptEntry = {
  carryCount: number;
  entry: string;
  stale: boolean;
};

type FocusedRegisterPromptBaseline = {
  nextActions: FocusedRegisterPromptEntry[];
  openQuestions: FocusedRegisterPromptEntry[];
  resolutions: FocusedRegisterPromptEntry[];
};

type FocusedRegisterContext = {
  baseline: FocusedRegisterBaseline;
  promptBaseline: FocusedRegisterPromptBaseline;
  state: FocusedRegisterState | undefined;
};

type FocusedRegisterClosureRefs = {
  closedOpenQuestions: string[];
  completedNextActions: string[];
};

function normalizeRegisterEntryKey(entry: string): string {
  return entry.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildEmptyFocusedRegisterState(input: {
  updatedAt: string;
  updatedTurnId: string;
}): FocusedRegisterState {
  return {
    registers: {
      nextActions: [],
      openQuestions: [],
      resolutions: []
    },
    schemaVersion: "1",
    updatedAt: input.updatedAt,
    updatedTurnId: input.updatedTurnId
  };
}

function isStaleFocusedRegisterEntry(entry: Pick<FocusedRegisterEntryState, "carryCount">): boolean {
  return entry.carryCount >= staleFocusedRegisterCarryThreshold;
}

function buildFocusedRegisterStateMap(
  entries: FocusedRegisterEntryState[]
): Map<string, FocusedRegisterEntryState> {
  return new Map(
    entries.map((entry) => [entry.normalizedKey, entry] as const)
  );
}

function buildPromptRegisterEntries(input: {
  entries: string[];
  markStaleReviewCandidates: boolean;
  registerState: FocusedRegisterEntryState[];
}): FocusedRegisterPromptEntry[] {
  const stateByKey = buildFocusedRegisterStateMap(input.registerState);

  return input.entries.map((entry) => {
    const priorState = stateByKey.get(normalizeRegisterEntryKey(entry));
    const carryCount = priorState?.carryCount ?? 1;

    return {
      carryCount,
      entry,
      stale:
        input.markStaleReviewCandidates && priorState
          ? isStaleFocusedRegisterEntry(priorState)
          : false
    };
  });
}

async function readFocusedRegisterContext(input: {
  statePaths: ReturnType<typeof buildRunnerStatePaths>;
  wikiRoot: string;
}): Promise<FocusedRegisterContext> {
  const [baseline, state] = await Promise.all([
    readFocusedRegisterBaseline(input.wikiRoot),
    readFocusedRegisterState(input.statePaths)
  ]);

  const resolvedState =
    state ??
    buildEmptyFocusedRegisterState({
      updatedAt: nowIsoString(),
      updatedTurnId: "bootstrap"
    });

  return {
    baseline,
    promptBaseline: {
      nextActions: buildPromptRegisterEntries({
        entries: baseline.nextActions,
        markStaleReviewCandidates: true,
        registerState: resolvedState.registers.nextActions
      }),
      openQuestions: buildPromptRegisterEntries({
        entries: baseline.openQuestions,
        markStaleReviewCandidates: true,
        registerState: resolvedState.registers.openQuestions
      }),
      resolutions: buildPromptRegisterEntries({
        entries: baseline.resolutions,
        markStaleReviewCandidates: false,
        registerState: resolvedState.registers.resolutions
      })
    },
    state
  };
}

function buildNextFocusedRegisterState(input: {
  previousState: FocusedRegisterState | undefined;
  registers: FocusedRegisterBaseline;
  turnId: string;
  updatedAt: string;
}): FocusedRegisterState {
  const previousRegisters = input.previousState?.registers ??
    buildEmptyFocusedRegisterState({
      updatedAt: input.updatedAt,
      updatedTurnId: input.turnId
    }).registers;
  const nextRegisters = {
    nextActions: [] as FocusedRegisterEntryState[],
    openQuestions: [] as FocusedRegisterEntryState[],
    resolutions: [] as FocusedRegisterEntryState[]
  };

  for (const registerName of [
    "nextActions",
    "openQuestions",
    "resolutions"
  ] as const satisfies FocusedRegisterKind[]) {
    const previousRegisterState = buildFocusedRegisterStateMap(
      previousRegisters[registerName]
    );

    nextRegisters[registerName] = input.registers[registerName].map((entry) => {
      const normalizedKey = normalizeRegisterEntryKey(entry);
      const priorEntry = previousRegisterState.get(normalizedKey);

      return {
        carryCount: priorEntry ? priorEntry.carryCount + 1 : 1,
        firstObservedTurnId: priorEntry?.firstObservedTurnId ?? input.turnId,
        lastObservedTurnId: input.turnId,
        normalizedKey,
        text: entry
      };
    });
  }

  return {
    registers: nextRegisters,
    schemaVersion: "1",
    updatedAt: input.updatedAt,
    updatedTurnId: input.turnId
  };
}

function buildNormalizedEntryKeySet(entries: string[]): Set<string> {
  return new Set(entries.map((entry) => normalizeRegisterEntryKey(entry)));
}

function reconcileFocusedRegisterLifecycle(input: FocusedRegisterBaseline & FocusedRegisterClosureRefs): FocusedRegisterBaseline {
  const resolutionKeys = new Set(
    input.resolutions.map((resolution) => normalizeRegisterEntryKey(resolution))
  );
  const closedOpenQuestionKeys = buildNormalizedEntryKeySet(
    input.closedOpenQuestions
  );
  const completedNextActionKeys = buildNormalizedEntryKeySet(
    input.completedNextActions
  );

  return {
    nextActions: input.nextActions.filter(
      (nextAction) =>
        !resolutionKeys.has(normalizeRegisterEntryKey(nextAction)) &&
        !completedNextActionKeys.has(normalizeRegisterEntryKey(nextAction))
    ),
    openQuestions: input.openQuestions.filter(
      (openQuestion) =>
        !resolutionKeys.has(normalizeRegisterEntryKey(openQuestion)) &&
        !closedOpenQuestionKeys.has(normalizeRegisterEntryKey(openQuestion))
    ),
    resolutions: input.resolutions
  };
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

function isRegisterFallbackEntry(entry: string): boolean {
  return new Set([
    "No durable open questions were synthesized.",
    "No durable recent resolutions were synthesized.",
    "No immediate next actions were synthesized."
  ]).has(entry);
}

function parseSummarySectionBulletList(input: {
  markdown: string;
  sectionHeading: string;
}): string[] {
  const lines = input.markdown.split(/\r?\n/);
  const sectionMarker = `## ${input.sectionHeading}`;
  const entries: string[] = [];
  let inSection = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!inSection) {
      if (trimmedLine === sectionMarker) {
        inSection = true;
      }

      continue;
    }

    if (trimmedLine.startsWith("## ")) {
      break;
    }

    if (!trimmedLine.startsWith("- ")) {
      continue;
    }

    const entry = trimmedLine.slice(2).trim();

    if (entry.length === 0 || isRegisterFallbackEntry(entry)) {
      continue;
    }

    entries.push(entry);
  }

  return normalizeListEntries(entries);
}

async function readFocusedRegisterBaseline(
  wikiRoot: string
): Promise<FocusedRegisterBaseline> {
  const [openQuestionsMarkdown, nextActionsMarkdown, resolutionsMarkdown] =
    await Promise.all([
      readTextFileOrDefault(resolveOpenQuestionsSummaryPath(wikiRoot), ""),
      readTextFileOrDefault(resolveNextActionsSummaryPath(wikiRoot), ""),
      readTextFileOrDefault(resolveResolutionsSummaryPath(wikiRoot), "")
    ]);

  return {
    nextActions: parseSummarySectionBulletList({
      markdown: nextActionsMarkdown,
      sectionHeading: "Next Actions"
    }),
    openQuestions: parseSummarySectionBulletList({
      markdown: openQuestionsMarkdown,
      sectionHeading: "Open Questions"
    }),
    resolutions: parseSummarySectionBulletList({
      markdown: resolutionsMarkdown,
      sectionHeading: "Resolutions"
    })
  };
}

function renderFocusedRegisterBaselineForPrompt(
  baseline: FocusedRegisterPromptBaseline
): string {
  const renderRegisterEntries = (entries: FocusedRegisterPromptEntry[]): string[] =>
    entries.length > 0
      ? entries.map((entry) =>
          `  - ${entry.entry}${
            entry.carryCount > 1
              ? ` [carried ${entry.carryCount} synthesis passes${
                  entry.stale ? "; stale review candidate" : ""
                }]`
              : ""
          }`
        )
      : ["  - none"];

  return [
    "Current focused register baseline:",
    "- open questions:",
    ...renderRegisterEntries(baseline.openQuestions),
    "- next actions:",
    ...renderRegisterEntries(baseline.nextActions),
    "- resolutions:",
    ...renderRegisterEntries(baseline.resolutions)
  ].join("\n");
}

function validateExplicitClosureRefs(input: {
  baseline: FocusedRegisterBaseline;
  closedOpenQuestions: string[];
  completedNextActions: string[];
  resolutions: string[];
}):
  | {
      ok: true;
    }
  | {
      issues: string[];
      ok: false;
    } {
  const issues: string[] = [];
  const openQuestionKeys = buildNormalizedEntryKeySet(input.baseline.openQuestions);
  const nextActionKeys = buildNormalizedEntryKeySet(input.baseline.nextActions);

  for (const closedOpenQuestion of input.closedOpenQuestions) {
    if (!openQuestionKeys.has(normalizeRegisterEntryKey(closedOpenQuestion))) {
      issues.push(
        `The 'closedOpenQuestions' entry '${closedOpenQuestion}' does not match any current focused-register open question.`
      );
    }
  }

  for (const completedNextAction of input.completedNextActions) {
    if (!nextActionKeys.has(normalizeRegisterEntryKey(completedNextAction))) {
      issues.push(
        `The 'completedNextActions' entry '${completedNextAction}' does not match any current focused-register next action.`
      );
    }
  }

  if (
    (input.closedOpenQuestions.length > 0 || input.completedNextActions.length > 0) &&
    input.resolutions.length === 0
  ) {
    issues.push(
      "Explicit closure references require at least one bounded resolutions entry describing what closed."
    );
  }

  return issues.length > 0
    ? {
        issues,
        ok: false
      }
    : {
        ok: true
      };
}

function validateStaleBaselineRetention(input: {
  closedOpenQuestions: string[];
  completedNextActions: string[];
  nextActions: string[];
  openQuestions: string[];
  promptBaseline: FocusedRegisterPromptBaseline;
  resolutions: string[];
}):
  | {
      ok: true;
    }
  | {
      issues: string[];
      ok: false;
    } {
  const issues: string[] = [];
  const resolutionKeys = buildNormalizedEntryKeySet(input.resolutions);
  const closedOpenQuestionKeys = buildNormalizedEntryKeySet(
    input.closedOpenQuestions
  );
  const completedNextActionKeys = buildNormalizedEntryKeySet(
    input.completedNextActions
  );
  const nextOpenQuestionKeys = buildNormalizedEntryKeySet(input.openQuestions);
  const nextActionKeys = buildNormalizedEntryKeySet(input.nextActions);

  for (const openQuestion of input.promptBaseline.openQuestions) {
    if (!openQuestion.stale) {
      continue;
    }

    const normalizedKey = normalizeRegisterEntryKey(openQuestion.entry);

    if (
      nextOpenQuestionKeys.has(normalizedKey) ||
      closedOpenQuestionKeys.has(normalizedKey) ||
      resolutionKeys.has(normalizedKey)
    ) {
      continue;
    }

    issues.push(
      `The stale open-question baseline entry '${openQuestion.entry}' cannot disappear silently. Keep it active, reference it in 'closedOpenQuestions', or carry the same exact text into 'resolutions'.`
    );
  }

  for (const nextAction of input.promptBaseline.nextActions) {
    if (!nextAction.stale) {
      continue;
    }

    const normalizedKey = normalizeRegisterEntryKey(nextAction.entry);

    if (
      nextActionKeys.has(normalizedKey) ||
      completedNextActionKeys.has(normalizedKey) ||
      resolutionKeys.has(normalizedKey)
    ) {
      continue;
    }

    issues.push(
      `The stale next-action baseline entry '${nextAction.entry}' cannot disappear silently. Keep it active, reference it in 'completedNextActions', or carry the same exact text into 'resolutions'.`
    );
  }

  return issues.length > 0
    ? {
        issues,
        ok: false
      }
    : {
        ok: true
      };
}

function parseWorkingContextSummaryInput(input: unknown):
  | {
      ok: true;
      value: {
        artifactInsights: string[];
        closedOpenQuestions: string[];
        completedNextActions: string[];
        decisions: string[];
        executionInsights: string[];
        focus: string;
        nextActions: string[];
        openQuestions: string[];
        resolutions: string[];
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
        "The memory-summary synthesis tool expects a JSON object input."
      ],
      ok: false
    };
  }

  const allowedKeys = new Set([
    "artifactInsights",
    "closedOpenQuestions",
    "completedNextActions",
    "decisions",
    "executionInsights",
    "focus",
    "nextActions",
    "openQuestions",
    "resolutions",
    "sessionInsights",
    "stableFacts",
    "summary"
  ]);
  const inputRecord = input as Record<string, unknown>;
  const extraKeys = Object.keys(inputRecord).filter((key) => !allowedKeys.has(key));
  const artifactInsights = coerceStringArray(inputRecord.artifactInsights);
  const closedOpenQuestions = coerceStringArray(inputRecord.closedOpenQuestions);
  const completedNextActions = coerceStringArray(inputRecord.completedNextActions);
  const decisions = coerceStringArray(inputRecord.decisions);
  const executionInsights = coerceStringArray(inputRecord.executionInsights);
  const focus = coerceNonEmptyString(inputRecord.focus);
  const nextActions = coerceStringArray(inputRecord.nextActions);
  const openQuestions = coerceStringArray(inputRecord.openQuestions);
  const resolutions = coerceStringArray(inputRecord.resolutions);
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

  if (!decisions) {
    issues.push("The 'decisions' field must be an array of non-empty strings.");
  }

  if (!closedOpenQuestions) {
    issues.push(
      "The 'closedOpenQuestions' field must be an array of non-empty strings."
    );
  }

  if (!completedNextActions) {
    issues.push(
      "The 'completedNextActions' field must be an array of non-empty strings."
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

  if (!resolutions) {
    issues.push("The 'resolutions' field must be an array of non-empty strings.");
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
    closedOpenQuestions &&
    closedOpenQuestions.length > maxWorkingContextListEntries
  ) {
    issues.push(
      `The 'closedOpenQuestions' field may contain at most ${maxWorkingContextListEntries} entries.`
    );
  }

  if (
    completedNextActions &&
    completedNextActions.length > maxWorkingContextListEntries
  ) {
    issues.push(
      `The 'completedNextActions' field may contain at most ${maxWorkingContextListEntries} entries.`
    );
  }

  if (
    decisions &&
    decisions.length > maxWorkingContextListEntries
  ) {
    issues.push(
      `The 'decisions' field may contain at most ${maxWorkingContextListEntries} entries.`
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

  if (
    resolutions &&
    resolutions.length > maxWorkingContextListEntries
  ) {
    issues.push(
      `The 'resolutions' field may contain at most ${maxWorkingContextListEntries} entries.`
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
      closedOpenQuestions: closedOpenQuestions!,
      completedNextActions: completedNextActions!,
      decisions: decisions!,
      executionInsights: executionInsights!,
      focus: focus!,
      nextActions: nextActions!,
      openQuestions: openQuestions!,
      resolutions: resolutions!,
      sessionInsights: sessionInsights!,
      stableFacts: stableFacts!,
      summary: summary!
    }
  };
}

function buildWorkingContextSummaryToolDefinition(): EngineToolDefinition {
  return {
    description:
      "Update the canonical focused memory-summary registers for this node's private wiki. " +
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
        closedOpenQuestions: {
          description:
            "A bounded list of exact current open-question entries from the focused-register baseline that should now be considered closed, even if the resolutions wording is different.",
          items: {
            type: "string"
          },
          type: "array"
        },
        completedNextActions: {
          description:
            "A bounded list of exact current next-action entries from the focused-register baseline that are now complete or otherwise no longer active, even if the resolutions wording is different.",
          items: {
            type: "string"
          },
          type: "array"
        },
        decisions: {
          description:
            "A bounded list of durable decisions or conclusions that future turns should retain.",
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
        resolutions: {
          description:
            "A bounded list of recently resolved questions, completed actions, or closed uncertainties worth carrying forward so they are not reopened implicitly.",
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
        "closedOpenQuestions",
        "completedNextActions",
        "decisions",
        "executionInsights",
        "summary",
        "sessionInsights",
        "stableFacts",
        "openQuestions",
        "resolutions",
        "nextActions"
      ],
      additionalProperties: false
    },
    strict: true
  };
}

export async function buildModelGuidedMemorySynthesisTurnRequest(
  input: RunnerMemorySynthesisInput & {
    focusedRegisterContext?: FocusedRegisterContext;
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
  const focusedRegisterContext =
    input.focusedRegisterContext ??
    (await readFocusedRegisterContext({
      statePaths: buildRunnerStatePaths(input.context.workspace.runtimeRoot),
      wikiRoot
    }));
  return {
    sessionId: input.envelope.message.sessionId,
    nodeId: input.context.binding.node.nodeId,
    systemPromptParts: [
      "You are maintaining the node's private working memory after a completed turn.",
      "You do not write files directly. Use the provided tool exactly once to update the canonical focused memory-summary registers.",
      "Keep the summary concise, durable, and grounded in the current turn plus the injected memory references.",
      "Preserve only durable session or coordination observations that future turns should retain; do not restate transient workflow state verbatim.",
      "Preserve only durable artifact-backed observations that future turns should retain; do not restate raw file contents.",
      "Preserve only durable execution signals that matter beyond this single turn; do not copy transient logs verbatim.",
      "Review the current focused register baseline before deciding what remains open, what remains pending, and what is now resolved.",
      "Treat repeatedly carried open questions and next actions as explicit review candidates: keep them only when they remain concretely active, otherwise narrow them, replace them, or close them through bounded resolutions.",
      "When you close a current open question or complete a current next action using wording that differs from the original baseline entry, populate the explicit closure-reference fields with the exact original baseline text so the runner can retire it deterministically.",
      "A stale-review candidate from the current baseline may not disappear silently. Keep it active, reference it explicitly as closed/completed, or carry the same exact text into resolutions.",
      "Preserve still-active open questions and next actions when they remain relevant after the completed turn; move closed items into bounded resolutions instead of dropping them silently.",
      "When a question is no longer open or an action is complete, record that closure in bounded resolutions instead of letting it disappear silently.",
      "Do not repeat the same item across open questions, next actions, and resolutions. Resolved items belong only in resolutions.",
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
      renderFocusedRegisterBaselineForPrompt(
        focusedRegisterContext.promptBaseline
      ),
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
  decisions: string[];
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
  resolutions: string[];
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
    "## Decisions",
    "",
    ...renderBulletList(input.decisions, "- No durable decisions were synthesized."),
    "",
    "## Open Questions",
    "",
    ...renderBulletList(input.openQuestions, "- No open questions were recorded."),
    "",
    "## Next Actions",
    "",
    ...renderBulletList(input.nextActions, "- No immediate next actions were recorded."),
    "",
    "## Recent Resolutions",
    "",
    ...renderBulletList(
      input.resolutions,
      "- No durable recently resolved items were synthesized."
    ),
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

function buildDecisionsSummaryContent(input: {
  decisions: string[];
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
    "# Decisions Summary",
    "",
    `- Updated at: \`${nowIsoString()}\``,
    `- Session: \`${input.sessionId}\``,
    `- Turn: \`${input.turnId}\``,
    `- Task page: [Current Task Memory](${taskPageRelativePath})`,
    `- Working context: [Working Context Summary](${workingContextRelativePath})`,
    `- Recent work: [Recent Work Summary](${recentWorkRelativePath})`,
    "",
    "## Decisions",
    "",
    ...renderBulletList(
      input.decisions,
      "- No durable decisions were synthesized."
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
  openQuestions: string[];
  nextActionsPagePath: string;
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
  const nextActionsRelativePath = toPosixRelativePath(
    input.wikiRoot,
    input.nextActionsPagePath
  );

  return [
    "# Open Questions Summary",
    "",
    `- Updated at: \`${nowIsoString()}\``,
    `- Session: \`${input.sessionId}\``,
    `- Turn: \`${input.turnId}\``,
    `- Task page: [Current Task Memory](${taskPageRelativePath})`,
    `- Working context: [Working Context Summary](${workingContextRelativePath})`,
    `- Next actions: [Next Actions Summary](${nextActionsRelativePath})`,
    `- Recent work: [Recent Work Summary](${recentWorkRelativePath})`,
    "",
    "## Open Questions",
    "",
    ...renderBulletList(
      input.openQuestions,
      "- No durable open questions were synthesized."
    ),
    "",
    "## Coordination",
    "",
    "See [Next Actions Summary](summaries/next-actions.md) for the focused pending-work register.",
    ""
  ].join("\n");
}

function buildNextActionsSummaryContent(input: {
  nextActions: string[];
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
    "# Next Actions Summary",
    "",
    `- Updated at: \`${nowIsoString()}\``,
    `- Session: \`${input.sessionId}\``,
    `- Turn: \`${input.turnId}\``,
    `- Task page: [Current Task Memory](${taskPageRelativePath})`,
    `- Working context: [Working Context Summary](${workingContextRelativePath})`,
    `- Recent work: [Recent Work Summary](${recentWorkRelativePath})`,
    "",
    "## Next Actions",
    "",
    ...renderBulletList(
      input.nextActions,
      "- No immediate next actions were synthesized."
    ),
    ""
  ].join("\n");
}

function buildResolutionsSummaryContent(input: {
  recentWorkSummaryPath: string;
  resolutions: string[];
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
    "# Resolutions Summary",
    "",
    `- Updated at: \`${nowIsoString()}\``,
    `- Session: \`${input.sessionId}\``,
    `- Turn: \`${input.turnId}\``,
    `- Task page: [Current Task Memory](${taskPageRelativePath})`,
    `- Working context: [Working Context Summary](${workingContextRelativePath})`,
    `- Recent work: [Recent Work Summary](${recentWorkRelativePath})`,
    "",
    "## Resolutions",
    "",
    ...renderBulletList(
      input.resolutions,
      "- No durable recent resolutions were synthesized."
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
      `Model-guided memory synthesis did not update the focused summary registers for [${input.turnId}](${taskPageRelativePath}).`,
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
  focusedRegisterContext: FocusedRegisterContext;
  sessionSnapshot: RunnerSessionStateSnapshot | undefined;
  synthesis: RunnerMemorySynthesisInput;
  statePaths: ReturnType<typeof buildRunnerStatePaths>;
  writePathCapture: {
    decisionsPagePath: string | undefined;
    nextActionsPagePath: string | undefined;
    openQuestionsPagePath: string | undefined;
    resolutionsPagePath: string | undefined;
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

      const explicitClosureValidation = validateExplicitClosureRefs({
        baseline: input.focusedRegisterContext.baseline,
        closedOpenQuestions: normalizeListEntries(
          parsedInput.value.closedOpenQuestions
        ),
        completedNextActions: normalizeListEntries(
          parsedInput.value.completedNextActions
        ),
        resolutions: normalizeListEntries(parsedInput.value.resolutions)
      });

      if (!explicitClosureValidation.ok) {
        return engineToolExecutionResultSchema.parse({
          content: {
            error: "invalid_input",
            issues: explicitClosureValidation.issues,
            toolId: request.tool.id
          },
          isError: true
        });
      }

      const staleBaselineRetentionValidation = validateStaleBaselineRetention({
        closedOpenQuestions: normalizeListEntries(
          parsedInput.value.closedOpenQuestions
        ),
        completedNextActions: normalizeListEntries(
          parsedInput.value.completedNextActions
        ),
        nextActions: normalizeListEntries(parsedInput.value.nextActions),
        openQuestions: normalizeListEntries(parsedInput.value.openQuestions),
        promptBaseline: input.focusedRegisterContext.promptBaseline,
        resolutions: normalizeListEntries(parsedInput.value.resolutions)
      });

      if (!staleBaselineRetentionValidation.ok) {
        return engineToolExecutionResultSchema.parse({
          content: {
            error: "invalid_input",
            issues: staleBaselineRetentionValidation.issues,
            toolId: request.tool.id
          },
          isError: true
        });
      }

      const wikiRoot = path.join(input.synthesis.context.workspace.memoryRoot, "wiki");
      const workingContextPagePath = resolveWorkingContextSummaryPath(wikiRoot);
      const decisionsPagePath = resolveDecisionsSummaryPath(wikiRoot);
      const stableFactsPagePath = resolveStableFactsSummaryPath(wikiRoot);
      const openQuestionsPagePath = resolveOpenQuestionsSummaryPath(wikiRoot);
      const nextActionsPagePath = resolveNextActionsSummaryPath(wikiRoot);
      const resolutionsPagePath = resolveResolutionsSummaryPath(wikiRoot);
      const normalizedInput = {
        ...parsedInput.value,
        artifactInsights: normalizeListEntries(parsedInput.value.artifactInsights),
        decisions: normalizeListEntries(parsedInput.value.decisions),
        executionInsights: normalizeListEntries(parsedInput.value.executionInsights),
        sessionInsights: normalizeListEntries(parsedInput.value.sessionInsights),
        stableFacts: normalizeListEntries(parsedInput.value.stableFacts)
      };
      const reconciledLifecycleRegisters = reconcileFocusedRegisterLifecycle({
        closedOpenQuestions: normalizeListEntries(
          parsedInput.value.closedOpenQuestions
        ),
        completedNextActions: normalizeListEntries(
          parsedInput.value.completedNextActions
        ),
        nextActions: normalizeListEntries(parsedInput.value.nextActions),
        openQuestions: normalizeListEntries(parsedInput.value.openQuestions),
        resolutions: normalizeListEntries(parsedInput.value.resolutions)
      });
      const updatedAt = nowIsoString();
      const nextFocusedRegisterState = buildNextFocusedRegisterState({
        previousState: input.focusedRegisterContext.state,
        registers: reconciledLifecycleRegisters,
        turnId: input.synthesis.turnId,
        updatedAt
      });
      const content = buildWorkingContextSummaryContent({
        artifactInsights: normalizedInput.artifactInsights,
        consumedArtifactIds: input.synthesis.consumedArtifactIds,
        decisions: normalizedInput.decisions,
        executionInsights: normalizedInput.executionInsights,
        focus: normalizedInput.focus,
        nextActions: reconciledLifecycleRegisters.nextActions,
        openQuestions: reconciledLifecycleRegisters.openQuestions,
        resolutions: reconciledLifecycleRegisters.resolutions,
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
      const decisionsContent = buildDecisionsSummaryContent({
        decisions: normalizedInput.decisions,
        recentWorkSummaryPath: input.synthesis.recentWorkSummaryPath,
        sessionId: input.synthesis.envelope.message.sessionId,
        taskPagePath: input.synthesis.taskPagePath,
        turnId: input.synthesis.turnId,
        wikiRoot,
        workingContextPagePath
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
        openQuestions: reconciledLifecycleRegisters.openQuestions,
        nextActionsPagePath,
        recentWorkSummaryPath: input.synthesis.recentWorkSummaryPath,
        sessionId: input.synthesis.envelope.message.sessionId,
        taskPagePath: input.synthesis.taskPagePath,
        turnId: input.synthesis.turnId,
        wikiRoot,
        workingContextPagePath
      });
      const nextActionsContent = buildNextActionsSummaryContent({
        nextActions: reconciledLifecycleRegisters.nextActions,
        recentWorkSummaryPath: input.synthesis.recentWorkSummaryPath,
        sessionId: input.synthesis.envelope.message.sessionId,
        taskPagePath: input.synthesis.taskPagePath,
        turnId: input.synthesis.turnId,
        wikiRoot,
        workingContextPagePath
      });
      const resolutionsContent = buildResolutionsSummaryContent({
        recentWorkSummaryPath: input.synthesis.recentWorkSummaryPath,
        resolutions: reconciledLifecycleRegisters.resolutions,
        sessionId: input.synthesis.envelope.message.sessionId,
        taskPagePath: input.synthesis.taskPagePath,
        turnId: input.synthesis.turnId,
        wikiRoot,
        workingContextPagePath
      });

      await Promise.all([
        writeTextFile(workingContextPagePath, `${content.trimEnd()}\n`),
        writeTextFile(decisionsPagePath, `${decisionsContent.trimEnd()}\n`),
        writeTextFile(stableFactsPagePath, `${stableFactsContent.trimEnd()}\n`),
        writeTextFile(openQuestionsPagePath, `${openQuestionsContent.trimEnd()}\n`),
        writeTextFile(nextActionsPagePath, `${nextActionsContent.trimEnd()}\n`),
        writeTextFile(resolutionsPagePath, `${resolutionsContent.trimEnd()}\n`),
        writeFocusedRegisterState(input.statePaths, nextFocusedRegisterState)
      ]);
      input.writePathCapture.decisionsPagePath = decisionsPagePath;
      input.writePathCapture.nextActionsPagePath = nextActionsPagePath;
      input.writePathCapture.openQuestionsPagePath = openQuestionsPagePath;
      input.writePathCapture.resolutionsPagePath = resolutionsPagePath;
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
  nextIndex = appendSectionBullet(nextIndex, "Summaries", decisionsSummaryBullet);
  nextIndex = appendSectionBullet(nextIndex, "Summaries", stableFactsSummaryBullet);
  nextIndex = appendSectionBullet(nextIndex, "Summaries", openQuestionsSummaryBullet);
  nextIndex = appendSectionBullet(nextIndex, "Summaries", nextActionsSummaryBullet);
  nextIndex = appendSectionBullet(nextIndex, "Summaries", resolutionsSummaryBullet);

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
      const statePaths = buildRunnerStatePaths(synthesis.context.workspace.runtimeRoot);
      const wikiRoot = path.join(synthesis.context.workspace.memoryRoot, "wiki");
      const [sessionSnapshot, focusedRegisterContext] = await Promise.all([
        buildRunnerSessionStateSnapshot({
          maxArtifacts: maxSynthesisArtifacts,
          maxRecentTurns: maxSynthesisRecentTurns,
          sessionId: synthesis.envelope.message.sessionId,
          statePaths
        }),
        readFocusedRegisterContext({
          statePaths,
          wikiRoot
        })
      ]);
      const writePathCapture: {
        decisionsPagePath: string | undefined;
        nextActionsPagePath: string | undefined;
        openQuestionsPagePath: string | undefined;
        resolutionsPagePath: string | undefined;
        stableFactsPagePath: string | undefined;
        workingContextPagePath: string | undefined;
      } = {
        decisionsPagePath: undefined,
        nextActionsPagePath: undefined,
        openQuestionsPagePath: undefined,
        resolutionsPagePath: undefined,
        stableFactsPagePath: undefined,
        workingContextPagePath: undefined
      };
      const toolExecutor = createWorkingContextSummaryToolExecutor({
        focusedRegisterContext,
        sessionSnapshot,
        synthesis,
        statePaths,
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
                focusedRegisterContext,
                sessionSnapshot
              }
            : {
                ...synthesis,
                focusedRegisterContext
              }
        );
        await engine.executeTurn(request);

        if (!writePathCapture.workingContextPagePath) {
          throw new Error(
            "Model-guided memory synthesis completed without updating the working-context summary."
          );
        }
        if (!writePathCapture.stableFactsPagePath) {
          throw new Error(
            "Model-guided memory synthesis completed without updating the stable facts summary."
          );
        }
        if (!writePathCapture.decisionsPagePath) {
          throw new Error(
            "Model-guided memory synthesis completed without updating the decisions summary."
          );
        }
        if (!writePathCapture.openQuestionsPagePath) {
          throw new Error(
            "Model-guided memory synthesis completed without updating the open questions summary."
          );
        }
        if (!writePathCapture.nextActionsPagePath) {
          throw new Error(
            "Model-guided memory synthesis completed without updating the next actions summary."
          );
        }
        if (!writePathCapture.resolutionsPagePath) {
          throw new Error(
            "Model-guided memory synthesis completed without updating the resolutions summary."
          );
        }

        const updatedSummaryPagePaths = [
          writePathCapture.workingContextPagePath,
          writePathCapture.decisionsPagePath,
          writePathCapture.stableFactsPagePath,
          writePathCapture.openQuestionsPagePath,
          writePathCapture.nextActionsPagePath,
          writePathCapture.resolutionsPagePath
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
