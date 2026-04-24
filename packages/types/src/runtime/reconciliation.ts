import { z } from "zod";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";
import {
  runtimeBackendKindSchema,
  runtimeDesiredStateSchema,
  runtimeObservedStateSchema
} from "./runtime-state.js";

export const runtimeReconciliationFindingCodeSchema = z.enum([
  "context_unavailable",
  "runtime_failed",
  "runtime_missing",
  "runtime_stopped"
]);

export const runtimeReconciliationStateSchema = z.enum([
  "aligned",
  "transitioning",
  "degraded"
]);

export const runtimeReconciliationInputSchema = z.object({
  contextAvailable: z.boolean(),
  desiredState: runtimeDesiredStateSchema,
  observedState: runtimeObservedStateSchema
});

export const runtimeReconciliationSummarySchema = z.object({
  findingCodes: z.array(runtimeReconciliationFindingCodeSchema),
  state: runtimeReconciliationStateSchema
});

export type RuntimeReconciliationFindingCode = z.infer<
  typeof runtimeReconciliationFindingCodeSchema
>;
export type RuntimeReconciliationState = z.infer<
  typeof runtimeReconciliationStateSchema
>;
export type RuntimeReconciliationInput = z.infer<
  typeof runtimeReconciliationInputSchema
>;
export type RuntimeReconciliationSummary = z.infer<
  typeof runtimeReconciliationSummarySchema
>;

export function classifyRuntimeReconciliation(
  input: RuntimeReconciliationInput
): RuntimeReconciliationSummary {
  const findingCodes: RuntimeReconciliationFindingCode[] = [];

  if (!input.contextAvailable) {
    findingCodes.push("context_unavailable");
  }

  if (input.observedState === "failed") {
    findingCodes.push("runtime_failed");
  }

  if (input.desiredState === "running" && input.observedState === "missing") {
    findingCodes.push("runtime_missing");
  }

  if (input.desiredState === "running" && input.observedState === "stopped") {
    findingCodes.push("runtime_stopped");
  }

  if (findingCodes.length > 0) {
    return runtimeReconciliationSummarySchema.parse({
      findingCodes,
      state: "degraded"
    });
  }

  if (
    (input.desiredState === "running" && input.observedState === "starting") ||
    (input.desiredState === "stopped" &&
      (input.observedState === "running" ||
        input.observedState === "starting"))
  ) {
    return runtimeReconciliationSummarySchema.parse({
      findingCodes: [],
      state: "transitioning"
    });
  }

  return runtimeReconciliationSummarySchema.parse({
    findingCodes: [],
    state: "aligned"
  });
}

export const reconciliationNodeSummarySchema = z
  .object({
    desiredState: runtimeDesiredStateSchema,
    nodeId: identifierSchema,
    observedState: runtimeObservedStateSchema,
    reconciliation: runtimeReconciliationSummarySchema.optional(),
    statusMessage: nonEmptyStringSchema.optional()
  })
  .transform((value) => ({
    ...value,
    reconciliation:
      value.reconciliation ??
      classifyRuntimeReconciliation({
        contextAvailable: true,
        desiredState: value.desiredState,
        observedState: value.observedState
      })
  }));

function summarizeReconciliationNodes(
  nodes: ReconciliationNodeSummary[]
): {
  blockedRuntimeCount: number;
  degradedRuntimeCount: number;
  failedRuntimeCount: number;
  findingCodes: RuntimeReconciliationFindingCode[];
  issueCount: number;
  managedRuntimeCount: number;
  runningRuntimeCount: number;
  stoppedRuntimeCount: number;
  transitioningRuntimeCount: number;
} {
  const findingCodes = new Set<RuntimeReconciliationFindingCode>();
  let blockedRuntimeCount = 0;
  let degradedRuntimeCount = 0;
  let failedRuntimeCount = 0;
  let issueCount = 0;
  let runningRuntimeCount = 0;
  let stoppedRuntimeCount = 0;
  let transitioningRuntimeCount = 0;

  for (const node of nodes) {
    if (node.reconciliation.state === "degraded") {
      degradedRuntimeCount += 1;
    }

    if (node.reconciliation.state === "transitioning") {
      transitioningRuntimeCount += 1;
    }

    if (node.reconciliation.findingCodes.includes("context_unavailable")) {
      blockedRuntimeCount += 1;
    }

    if (node.observedState === "failed") {
      failedRuntimeCount += 1;
    }

    if (node.observedState === "running") {
      runningRuntimeCount += 1;
    }

    if (node.observedState === "stopped" || node.observedState === "missing") {
      stoppedRuntimeCount += 1;
    }

    issueCount += node.reconciliation.findingCodes.length;

    for (const findingCode of node.reconciliation.findingCodes) {
      findingCodes.add(findingCode);
    }
  }

  return {
    blockedRuntimeCount,
    degradedRuntimeCount,
    failedRuntimeCount,
    findingCodes: Array.from(findingCodes).sort(),
    issueCount,
    managedRuntimeCount: nodes.length,
    runningRuntimeCount,
    stoppedRuntimeCount,
    transitioningRuntimeCount
  };
}

export const reconciliationSnapshotSchema = z
  .object({
    backendKind: runtimeBackendKindSchema,
    blockedRuntimeCount: z.number().int().nonnegative().optional(),
    degradedRuntimeCount: z.number().int().nonnegative().optional(),
    failedRuntimeCount: z.number().int().nonnegative(),
    findingCodes: z.array(runtimeReconciliationFindingCodeSchema).optional(),
    graphId: identifierSchema.optional(),
    graphRevisionId: identifierSchema.optional(),
    issueCount: z.number().int().nonnegative().optional(),
    lastReconciledAt: nonEmptyStringSchema,
    managedRuntimeCount: z.number().int().nonnegative(),
    nodes: z.array(reconciliationNodeSummarySchema),
    runningRuntimeCount: z.number().int().nonnegative(),
    schemaVersion: z.literal("1"),
    stoppedRuntimeCount: z.number().int().nonnegative(),
    transitioningRuntimeCount: z.number().int().nonnegative().optional()
  })
  .transform((value) => {
    const summary = summarizeReconciliationNodes(value.nodes);

    return {
      ...value,
      blockedRuntimeCount:
        value.blockedRuntimeCount ?? summary.blockedRuntimeCount,
      degradedRuntimeCount:
        value.degradedRuntimeCount ?? summary.degradedRuntimeCount,
      failedRuntimeCount: value.failedRuntimeCount,
      findingCodes: value.findingCodes ?? summary.findingCodes,
      issueCount: value.issueCount ?? summary.issueCount,
      managedRuntimeCount: value.managedRuntimeCount,
      runningRuntimeCount: value.runningRuntimeCount,
      stoppedRuntimeCount: value.stoppedRuntimeCount,
      transitioningRuntimeCount:
        value.transitioningRuntimeCount ?? summary.transitioningRuntimeCount
    };
  });

export type ReconciliationNodeSummary = z.infer<
  typeof reconciliationNodeSummarySchema
>;
export type ReconciliationSnapshot = z.infer<typeof reconciliationSnapshotSchema>;
