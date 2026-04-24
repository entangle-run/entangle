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

type FocusedRegisterReplacementRef = {
  from: string;
  to: string[];
};

type FocusedRegisterConsolidationRef = {
  from: string[];
  to: string;
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

function coerceFocusedRegisterReplacementRefArray(
  value: unknown
): FocusedRegisterReplacementRef[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalizedEntries: FocusedRegisterReplacementRef[] = [];

  for (const entry of value) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      return undefined;
    }

    const entryRecord = entry as Record<string, unknown>;
    const extraKeys = Object.keys(entryRecord).filter(
      (key) => key !== "from" && key !== "to"
    );

    if (extraKeys.length > 0) {
      return undefined;
    }

    const from = coerceNonEmptyString(entryRecord.from);
    const to = coerceStringArray(entryRecord.to);

    if (!from || !to || to.length === 0) {
      return undefined;
    }

    normalizedEntries.push({
      from,
      to
    });
  }

  return normalizedEntries;
}

function normalizeReplacementRefs(
  replacementRefs: FocusedRegisterReplacementRef[]
): FocusedRegisterReplacementRef[] {
  return replacementRefs.map((replacementRef) => ({
    from: replacementRef.from.trim(),
    to: normalizeListEntries(replacementRef.to)
  }));
}

function coerceFocusedRegisterConsolidationRefArray(
  value: unknown
): FocusedRegisterConsolidationRef[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalizedEntries: FocusedRegisterConsolidationRef[] = [];

  for (const entry of value) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      return undefined;
    }

    const entryRecord = entry as Record<string, unknown>;
    const extraKeys = Object.keys(entryRecord).filter(
      (key) => key !== "from" && key !== "to"
    );

    if (extraKeys.length > 0) {
      return undefined;
    }

    const from = coerceStringArray(entryRecord.from);
    const to = coerceNonEmptyString(entryRecord.to);

    if (!from || !to || from.length === 0) {
      return undefined;
    }

    normalizedEntries.push({
      from,
      to
    });
  }

  return normalizedEntries;
}

function normalizeConsolidationRefs(
  consolidationRefs: FocusedRegisterConsolidationRef[]
): FocusedRegisterConsolidationRef[] {
  return consolidationRefs.map((consolidationRef) => ({
    from: consolidationRef.from.map((entry) => entry.trim()).filter(Boolean),
    to: consolidationRef.to.trim()
  }));
}

function buildNormalizedReplacementFromKeySet(
  replacementRefs: FocusedRegisterReplacementRef[]
): Set<string> {
  return new Set(
    replacementRefs.map((replacementRef) =>
      normalizeRegisterEntryKey(replacementRef.from)
    )
  );
}

function buildNormalizedConsolidationFromKeySet(
  consolidationRefs: FocusedRegisterConsolidationRef[]
): Set<string> {
  return new Set(
    consolidationRefs.flatMap((consolidationRef) =>
      consolidationRef.from.map((entry) => normalizeRegisterEntryKey(entry))
    )
  );
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

function validateExplicitReplacementRefs(input: {
  closedOpenQuestions: string[];
  completedNextActions: string[];
  nextActions: string[];
  openQuestions: string[];
  promptBaseline: FocusedRegisterPromptBaseline;
  replacedNextActions: FocusedRegisterReplacementRef[];
  replacedOpenQuestions: FocusedRegisterReplacementRef[];
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
  const staleOpenQuestionKeys = buildNormalizedEntryKeySet(
    input.promptBaseline.openQuestions
      .filter((entry) => entry.stale)
      .map((entry) => entry.entry)
  );
  const staleNextActionKeys = buildNormalizedEntryKeySet(
    input.promptBaseline.nextActions
      .filter((entry) => entry.stale)
      .map((entry) => entry.entry)
  );
  const nextOpenQuestionKeys = buildNormalizedEntryKeySet(input.openQuestions);
  const nextActionKeys = buildNormalizedEntryKeySet(input.nextActions);
  const closedOpenQuestionKeys = buildNormalizedEntryKeySet(
    input.closedOpenQuestions
  );
  const completedNextActionKeys = buildNormalizedEntryKeySet(
    input.completedNextActions
  );
  const resolutionKeys = buildNormalizedEntryKeySet(input.resolutions);

  const validateRegisterReplacements = (config: {
    activeKeys: Set<string>;
    closureKeys: Set<string>;
    label: "open question" | "next action";
    replacementRefs: FocusedRegisterReplacementRef[];
    resolutionKeys: Set<string>;
    staleBaselineKeys: Set<string>;
  }): void => {
    const seenFromKeys = new Set<string>();
    const replacementTargets = new Map<string, string>();

    for (const replacementRef of config.replacementRefs) {
      const fromKey = normalizeRegisterEntryKey(replacementRef.from);

      if (!config.staleBaselineKeys.has(fromKey)) {
        issues.push(
          `The replacement source '${replacementRef.from}' does not match any current stale focused-register ${config.label}.`
        );
      }

      if (seenFromKeys.has(fromKey)) {
        issues.push(
          `The stale focused-register ${config.label} '${replacementRef.from}' is referenced more than once in replacement refs.`
        );
      }

      seenFromKeys.add(fromKey);

      if (config.activeKeys.has(fromKey)) {
        issues.push(
          `The replaced ${config.label} '${replacementRef.from}' must not remain in the active ${config.label === "open question" ? "openQuestions" : "nextActions"} list.`
        );
      }

      if (config.closureKeys.has(fromKey) || config.resolutionKeys.has(fromKey)) {
        issues.push(
          `The replaced ${config.label} '${replacementRef.from}' may not also be retired through explicit closure refs or copied verbatim into resolutions.`
        );
      }

      for (const replacementTarget of replacementRef.to) {
        const replacementTargetKey = normalizeRegisterEntryKey(replacementTarget);

        if (replacementTargetKey === fromKey) {
          issues.push(
            `The replacement target '${replacementTarget}' must differ from the replaced ${config.label} '${replacementRef.from}'.`
          );
        }

        if (!config.activeKeys.has(replacementTargetKey)) {
          issues.push(
            `The replacement target '${replacementTarget}' for stale ${config.label} '${replacementRef.from}' must appear in the resulting ${config.label === "open question" ? "openQuestions" : "nextActions"} list.`
          );
        }

        const priorReplacementSource = replacementTargets.get(replacementTargetKey);

        if (
          priorReplacementSource &&
          priorReplacementSource !== replacementRef.from
        ) {
          issues.push(
            `The replacement target '${replacementTarget}' is assigned to more than one stale ${config.label}.`
          );
        }

        replacementTargets.set(replacementTargetKey, replacementRef.from);
      }
    }
  };

  validateRegisterReplacements({
    activeKeys: nextOpenQuestionKeys,
    closureKeys: closedOpenQuestionKeys,
    label: "open question",
    replacementRefs: input.replacedOpenQuestions,
    resolutionKeys,
    staleBaselineKeys: staleOpenQuestionKeys
  });
  validateRegisterReplacements({
    activeKeys: nextActionKeys,
    closureKeys: completedNextActionKeys,
    label: "next action",
    replacementRefs: input.replacedNextActions,
    resolutionKeys,
    staleBaselineKeys: staleNextActionKeys
  });

  return issues.length > 0
    ? {
        issues,
        ok: false
      }
    : {
        ok: true
      };
}

function validateExplicitConsolidationRefs(input: {
  closedOpenQuestions: string[];
  completedNextActions: string[];
  consolidatedNextActions: FocusedRegisterConsolidationRef[];
  consolidatedOpenQuestions: FocusedRegisterConsolidationRef[];
  nextActions: string[];
  openQuestions: string[];
  promptBaseline: FocusedRegisterPromptBaseline;
  replacedNextActions: FocusedRegisterReplacementRef[];
  replacedOpenQuestions: FocusedRegisterReplacementRef[];
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
  const staleOpenQuestionKeys = buildNormalizedEntryKeySet(
    input.promptBaseline.openQuestions
      .filter((entry) => entry.stale)
      .map((entry) => entry.entry)
  );
  const staleNextActionKeys = buildNormalizedEntryKeySet(
    input.promptBaseline.nextActions
      .filter((entry) => entry.stale)
      .map((entry) => entry.entry)
  );
  const nextOpenQuestionKeys = buildNormalizedEntryKeySet(input.openQuestions);
  const nextActionKeys = buildNormalizedEntryKeySet(input.nextActions);
  const closedOpenQuestionKeys = buildNormalizedEntryKeySet(
    input.closedOpenQuestions
  );
  const completedNextActionKeys = buildNormalizedEntryKeySet(
    input.completedNextActions
  );
  const resolutionKeys = buildNormalizedEntryKeySet(input.resolutions);
  const replacedOpenQuestionKeys = buildNormalizedReplacementFromKeySet(
    input.replacedOpenQuestions
  );
  const replacedNextActionKeys = buildNormalizedReplacementFromKeySet(
    input.replacedNextActions
  );
  const replacementOpenQuestionTargetKeys = new Set(
    input.replacedOpenQuestions.flatMap((replacementRef) =>
      replacementRef.to.map((entry) => normalizeRegisterEntryKey(entry))
    )
  );
  const replacementNextActionTargetKeys = new Set(
    input.replacedNextActions.flatMap((replacementRef) =>
      replacementRef.to.map((entry) => normalizeRegisterEntryKey(entry))
    )
  );

  const validateRegisterConsolidations = (config: {
    activeKeys: Set<string>;
    closureKeys: Set<string>;
    consolidationRefs: FocusedRegisterConsolidationRef[];
    label: "open question" | "next action";
    replacedSourceKeys: Set<string>;
    replacementTargetKeys: Set<string>;
    resolutionKeys: Set<string>;
    staleBaselineKeys: Set<string>;
  }): void => {
    const seenSourceKeys = new Set<string>();
    const consolidationTargetKeys = new Set<string>();

    for (const consolidationRef of config.consolidationRefs) {
      if (consolidationRef.from.length < 2) {
        issues.push(
          `The consolidation target '${consolidationRef.to}' must reference at least two stale ${config.label} entries in 'from'.`
        );
      }

      const sourceKeys = consolidationRef.from.map((entry) =>
        normalizeRegisterEntryKey(entry)
      );

      if (new Set(sourceKeys).size !== sourceKeys.length) {
        issues.push(
          `The consolidation target '${consolidationRef.to}' contains duplicate stale ${config.label} sources.`
        );
      }

      const consolidationTargetKey = normalizeRegisterEntryKey(
        consolidationRef.to
      );

      if (!config.activeKeys.has(consolidationTargetKey)) {
        issues.push(
          `The consolidation target '${consolidationRef.to}' must appear in the resulting ${config.label === "open question" ? "openQuestions" : "nextActions"} list.`
        );
      }

      if (config.replacementTargetKeys.has(consolidationTargetKey)) {
        issues.push(
          `The consolidation target '${consolidationRef.to}' may not also be used as an explicit replacement target for stale ${config.label} entries.`
        );
      }

      if (consolidationTargetKeys.has(consolidationTargetKey)) {
        issues.push(
          `The consolidation target '${consolidationRef.to}' is assigned more than once for stale ${config.label} entries.`
        );
      }

      consolidationTargetKeys.add(consolidationTargetKey);

      for (const sourceEntry of consolidationRef.from) {
        const sourceKey = normalizeRegisterEntryKey(sourceEntry);

        if (!config.staleBaselineKeys.has(sourceKey)) {
          issues.push(
            `The consolidation source '${sourceEntry}' does not match any current stale focused-register ${config.label}.`
          );
        }

        if (seenSourceKeys.has(sourceKey)) {
          issues.push(
            `The stale focused-register ${config.label} '${sourceEntry}' is referenced more than once across consolidation refs.`
          );
        }

        seenSourceKeys.add(sourceKey);

        if (config.replacedSourceKeys.has(sourceKey)) {
          issues.push(
            `The stale focused-register ${config.label} '${sourceEntry}' may not be both replaced and consolidated.`
          );
        }

        if (config.activeKeys.has(sourceKey)) {
          issues.push(
            `The consolidated ${config.label} '${sourceEntry}' must not remain in the active ${config.label === "open question" ? "openQuestions" : "nextActions"} list.`
          );
        }

        if (config.closureKeys.has(sourceKey) || config.resolutionKeys.has(sourceKey)) {
          issues.push(
            `The consolidated ${config.label} '${sourceEntry}' may not also be retired through explicit closure refs or copied verbatim into resolutions.`
          );
        }

        if (sourceKey === consolidationTargetKey) {
          issues.push(
            `The consolidation target '${consolidationRef.to}' must differ from each consolidated stale ${config.label} source.`
          );
        }
      }
    }
  };

  validateRegisterConsolidations({
    activeKeys: nextOpenQuestionKeys,
    closureKeys: closedOpenQuestionKeys,
    consolidationRefs: input.consolidatedOpenQuestions,
    label: "open question",
    replacedSourceKeys: replacedOpenQuestionKeys,
    replacementTargetKeys: replacementOpenQuestionTargetKeys,
    resolutionKeys,
    staleBaselineKeys: staleOpenQuestionKeys
  });
  validateRegisterConsolidations({
    activeKeys: nextActionKeys,
    closureKeys: completedNextActionKeys,
    consolidationRefs: input.consolidatedNextActions,
    label: "next action",
    replacedSourceKeys: replacedNextActionKeys,
    replacementTargetKeys: replacementNextActionTargetKeys,
    resolutionKeys,
    staleBaselineKeys: staleNextActionKeys
  });

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
  consolidatedNextActions: FocusedRegisterConsolidationRef[];
  consolidatedOpenQuestions: FocusedRegisterConsolidationRef[];
  nextActions: string[];
  openQuestions: string[];
  promptBaseline: FocusedRegisterPromptBaseline;
  replacedNextActions: FocusedRegisterReplacementRef[];
  replacedOpenQuestions: FocusedRegisterReplacementRef[];
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
  const replacedOpenQuestionKeys = buildNormalizedReplacementFromKeySet(
    input.replacedOpenQuestions
  );
  const replacedNextActionKeys = buildNormalizedReplacementFromKeySet(
    input.replacedNextActions
  );
  const consolidatedOpenQuestionKeys = buildNormalizedConsolidationFromKeySet(
    input.consolidatedOpenQuestions
  );
  const consolidatedNextActionKeys = buildNormalizedConsolidationFromKeySet(
    input.consolidatedNextActions
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
      consolidatedOpenQuestionKeys.has(normalizedKey) ||
      replacedOpenQuestionKeys.has(normalizedKey) ||
      resolutionKeys.has(normalizedKey)
    ) {
      continue;
    }

    issues.push(
      `The stale open-question baseline entry '${openQuestion.entry}' cannot disappear silently. Keep it active, replace or consolidate it explicitly, reference it in 'closedOpenQuestions', or carry the same exact text into 'resolutions'.`
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
      consolidatedNextActionKeys.has(normalizedKey) ||
      replacedNextActionKeys.has(normalizedKey) ||
      resolutionKeys.has(normalizedKey)
    ) {
      continue;
    }

    issues.push(
      `The stale next-action baseline entry '${nextAction.entry}' cannot disappear silently. Keep it active, replace or consolidate it explicitly, reference it in 'completedNextActions', or carry the same exact text into 'resolutions'.`
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
        consolidatedNextActions: FocusedRegisterConsolidationRef[];
        consolidatedOpenQuestions: FocusedRegisterConsolidationRef[];
        decisions: string[];
        executionInsights: string[];
        focus: string;
        nextActions: string[];
        openQuestions: string[];
        replacedNextActions: FocusedRegisterReplacementRef[];
        replacedOpenQuestions: FocusedRegisterReplacementRef[];
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
    "consolidatedNextActions",
    "consolidatedOpenQuestions",
    "decisions",
    "executionInsights",
    "focus",
    "nextActions",
    "openQuestions",
    "replacedNextActions",
    "replacedOpenQuestions",
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
  const consolidatedNextActions = coerceFocusedRegisterConsolidationRefArray(
    inputRecord.consolidatedNextActions
  );
  const consolidatedOpenQuestions = coerceFocusedRegisterConsolidationRefArray(
    inputRecord.consolidatedOpenQuestions
  );
  const decisions = coerceStringArray(inputRecord.decisions);
  const executionInsights = coerceStringArray(inputRecord.executionInsights);
  const focus = coerceNonEmptyString(inputRecord.focus);
  const nextActions = coerceStringArray(inputRecord.nextActions);
  const openQuestions = coerceStringArray(inputRecord.openQuestions);
  const replacedNextActions = coerceFocusedRegisterReplacementRefArray(
    inputRecord.replacedNextActions
  );
  const replacedOpenQuestions = coerceFocusedRegisterReplacementRefArray(
    inputRecord.replacedOpenQuestions
  );
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

  if (!consolidatedOpenQuestions) {
    issues.push(
      "The 'consolidatedOpenQuestions' field must be an array of consolidation objects with non-empty 'from' lists and a non-empty 'to' entry."
    );
  }

  if (!consolidatedNextActions) {
    issues.push(
      "The 'consolidatedNextActions' field must be an array of consolidation objects with non-empty 'from' lists and a non-empty 'to' entry."
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

  if (!replacedOpenQuestions) {
    issues.push(
      "The 'replacedOpenQuestions' field must be an array of replacement objects with non-empty 'from' and 'to' entries."
    );
  }

  if (!replacedNextActions) {
    issues.push(
      "The 'replacedNextActions' field must be an array of replacement objects with non-empty 'from' and 'to' entries."
    );
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
    consolidatedOpenQuestions &&
    consolidatedOpenQuestions.length > maxWorkingContextListEntries
  ) {
    issues.push(
      `The 'consolidatedOpenQuestions' field may contain at most ${maxWorkingContextListEntries} entries.`
    );
  }

  if (
    consolidatedNextActions &&
    consolidatedNextActions.length > maxWorkingContextListEntries
  ) {
    issues.push(
      `The 'consolidatedNextActions' field may contain at most ${maxWorkingContextListEntries} entries.`
    );
  }

  if (
    consolidatedOpenQuestions &&
    consolidatedOpenQuestions.some(
      (consolidationRef) => consolidationRef.from.length > maxWorkingContextListEntries
    )
  ) {
    issues.push(
      `Each 'consolidatedOpenQuestions' entry may reference at most ${maxWorkingContextListEntries} stale open questions.`
    );
  }

  if (
    consolidatedNextActions &&
    consolidatedNextActions.some(
      (consolidationRef) => consolidationRef.from.length > maxWorkingContextListEntries
    )
  ) {
    issues.push(
      `Each 'consolidatedNextActions' entry may reference at most ${maxWorkingContextListEntries} stale next actions.`
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
    replacedOpenQuestions &&
    replacedOpenQuestions.length > maxWorkingContextListEntries
  ) {
    issues.push(
      `The 'replacedOpenQuestions' field may contain at most ${maxWorkingContextListEntries} entries.`
    );
  }

  if (
    replacedNextActions &&
    replacedNextActions.length > maxWorkingContextListEntries
  ) {
    issues.push(
      `The 'replacedNextActions' field may contain at most ${maxWorkingContextListEntries} entries.`
    );
  }

  if (
    replacedOpenQuestions &&
    replacedOpenQuestions.some(
      (replacementRef) => replacementRef.to.length > maxWorkingContextListEntries
    )
  ) {
    issues.push(
      `Each 'replacedOpenQuestions' entry may target at most ${maxWorkingContextListEntries} resulting open questions.`
    );
  }

  if (
    replacedNextActions &&
    replacedNextActions.some(
      (replacementRef) => replacementRef.to.length > maxWorkingContextListEntries
    )
  ) {
    issues.push(
      `Each 'replacedNextActions' entry may target at most ${maxWorkingContextListEntries} resulting next actions.`
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
      consolidatedNextActions: consolidatedNextActions!,
      consolidatedOpenQuestions: consolidatedOpenQuestions!,
      decisions: decisions!,
      executionInsights: executionInsights!,
      focus: focus!,
      nextActions: nextActions!,
      openQuestions: openQuestions!,
      replacedNextActions: replacedNextActions!,
      replacedOpenQuestions: replacedOpenQuestions!,
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
        consolidatedOpenQuestions: {
          description:
            "A bounded list of stale current open-question baseline groups that should collapse into one narrower active open question. Each object must use exact stale baseline texts in 'from' and the exact resulting active open question text in 'to'.",
          items: {
            type: "object",
            properties: {
              from: {
                items: {
                  type: "string"
                },
                type: "array"
              },
              to: {
                type: "string"
              }
            },
            required: ["from", "to"],
            additionalProperties: false
          },
          type: "array"
        },
        consolidatedNextActions: {
          description:
            "A bounded list of stale current next-action baseline groups that should collapse into one narrower active next action. Each object must use exact stale baseline texts in 'from' and the exact resulting active next-action text in 'to'.",
          items: {
            type: "object",
            properties: {
              from: {
                items: {
                  type: "string"
                },
                type: "array"
              },
              to: {
                type: "string"
              }
            },
            required: ["from", "to"],
            additionalProperties: false
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
        replacedOpenQuestions: {
          description:
            "A bounded list of stale current open-question baseline entries that should be retired by explicit replacement rather than closure. Each object must use the exact stale baseline text in 'from' and list the exact resulting 'openQuestions' texts in 'to'.",
          items: {
            type: "object",
            properties: {
              from: {
                type: "string"
              },
              to: {
                items: {
                  type: "string"
                },
                type: "array"
              }
            },
            required: ["from", "to"],
            additionalProperties: false
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
        },
        replacedNextActions: {
          description:
            "A bounded list of stale current next-action baseline entries that should be retired by explicit replacement rather than completion. Each object must use the exact stale baseline text in 'from' and list the exact resulting 'nextActions' texts in 'to'.",
          items: {
            type: "object",
            properties: {
              from: {
                type: "string"
              },
              to: {
                items: {
                  type: "string"
                },
                type: "array"
              }
            },
            required: ["from", "to"],
            additionalProperties: false
          },
          type: "array"
        }
      },
      required: [
        "focus",
        "artifactInsights",
        "closedOpenQuestions",
        "completedNextActions",
        "consolidatedOpenQuestions",
        "consolidatedNextActions",
        "decisions",
        "executionInsights",
        "summary",
        "sessionInsights",
        "stableFacts",
        "openQuestions",
        "replacedOpenQuestions",
        "resolutions",
        "nextActions",
        "replacedNextActions"
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
      "When several stale baseline items should collapse into one narrower active item, populate the explicit consolidation-reference fields with the exact stale baseline texts in 'from' and the exact successor active text in 'to'.",
      "When you replace a stale current open question or stale current next action with narrower active items, populate the explicit replacement-reference fields with the exact original stale baseline text in 'from' and the exact resulting active item texts in 'to'.",
      "When you close a current open question or complete a current next action using wording that differs from the original baseline entry, populate the explicit closure-reference fields with the exact original baseline text so the runner can retire it deterministically.",
      "A stale-review candidate from the current baseline may not disappear silently. Keep it active, replace or consolidate it explicitly, reference it explicitly as closed/completed, or carry the same exact text into resolutions.",
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

      const normalizedClosedOpenQuestions = normalizeListEntries(
        parsedInput.value.closedOpenQuestions
      );
      const normalizedCompletedNextActions = normalizeListEntries(
        parsedInput.value.completedNextActions
      );
      const normalizedNextActions = normalizeListEntries(
        parsedInput.value.nextActions
      );
      const normalizedOpenQuestions = normalizeListEntries(
        parsedInput.value.openQuestions
      );
      const normalizedResolutions = normalizeListEntries(
        parsedInput.value.resolutions
      );
      const normalizedReplacedNextActions = normalizeReplacementRefs(
        parsedInput.value.replacedNextActions
      );
      const normalizedReplacedOpenQuestions = normalizeReplacementRefs(
        parsedInput.value.replacedOpenQuestions
      );
      const normalizedConsolidatedNextActions = normalizeConsolidationRefs(
        parsedInput.value.consolidatedNextActions
      );
      const normalizedConsolidatedOpenQuestions = normalizeConsolidationRefs(
        parsedInput.value.consolidatedOpenQuestions
      );

      const explicitClosureValidation = validateExplicitClosureRefs({
        baseline: input.focusedRegisterContext.baseline,
        closedOpenQuestions: normalizedClosedOpenQuestions,
        completedNextActions: normalizedCompletedNextActions,
        resolutions: normalizedResolutions
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

      const explicitReplacementValidation = validateExplicitReplacementRefs({
        closedOpenQuestions: normalizedClosedOpenQuestions,
        completedNextActions: normalizedCompletedNextActions,
        nextActions: normalizedNextActions,
        openQuestions: normalizedOpenQuestions,
        promptBaseline: input.focusedRegisterContext.promptBaseline,
        replacedNextActions: normalizedReplacedNextActions,
        replacedOpenQuestions: normalizedReplacedOpenQuestions,
        resolutions: normalizedResolutions
      });

      if (!explicitReplacementValidation.ok) {
        return engineToolExecutionResultSchema.parse({
          content: {
            error: "invalid_input",
            issues: explicitReplacementValidation.issues,
            toolId: request.tool.id
          },
          isError: true
        });
      }

      const explicitConsolidationValidation = validateExplicitConsolidationRefs({
        closedOpenQuestions: normalizedClosedOpenQuestions,
        completedNextActions: normalizedCompletedNextActions,
        consolidatedNextActions: normalizedConsolidatedNextActions,
        consolidatedOpenQuestions: normalizedConsolidatedOpenQuestions,
        nextActions: normalizedNextActions,
        openQuestions: normalizedOpenQuestions,
        promptBaseline: input.focusedRegisterContext.promptBaseline,
        replacedNextActions: normalizedReplacedNextActions,
        replacedOpenQuestions: normalizedReplacedOpenQuestions,
        resolutions: normalizedResolutions
      });

      if (!explicitConsolidationValidation.ok) {
        return engineToolExecutionResultSchema.parse({
          content: {
            error: "invalid_input",
            issues: explicitConsolidationValidation.issues,
            toolId: request.tool.id
          },
          isError: true
        });
      }

      const staleBaselineRetentionValidation = validateStaleBaselineRetention({
        closedOpenQuestions: normalizedClosedOpenQuestions,
        completedNextActions: normalizedCompletedNextActions,
        consolidatedNextActions: normalizedConsolidatedNextActions,
        consolidatedOpenQuestions: normalizedConsolidatedOpenQuestions,
        nextActions: normalizedNextActions,
        openQuestions: normalizedOpenQuestions,
        promptBaseline: input.focusedRegisterContext.promptBaseline,
        replacedNextActions: normalizedReplacedNextActions,
        replacedOpenQuestions: normalizedReplacedOpenQuestions,
        resolutions: normalizedResolutions
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
