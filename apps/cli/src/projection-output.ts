import type {
  HostProjectionSnapshot,
  RuntimeProjectionRecord
} from "@entangle/types";

export type RuntimeProjectionCliSummary = {
  assignmentId?: string;
  backendKind: string;
  clientUrl?: string;
  desiredState: string;
  lastSeenAt?: string;
  nodeId: string;
  observedState: string;
  projectionSource: string;
  runnerId?: string;
  statusMessage?: string;
};

export type HostProjectionCliSummary = {
  assignmentCount: number;
  failedRuntimeCount: number;
  freshness: string;
  generatedAt: string;
  runtimeCount: number;
  runtimes: RuntimeProjectionCliSummary[];
  runnerCount: number;
  runningRuntimeCount: number;
  userConversationCount: number;
};

export function sortRuntimeProjectionsForCli(
  runtimes: RuntimeProjectionRecord[]
): RuntimeProjectionRecord[] {
  return [...runtimes].sort((left, right) =>
    left.nodeId.localeCompare(right.nodeId)
  );
}

export function projectRuntimeProjectionSummary(
  runtime: RuntimeProjectionRecord
): RuntimeProjectionCliSummary {
  return {
    ...(runtime.assignmentId ? { assignmentId: runtime.assignmentId } : {}),
    backendKind: runtime.backendKind,
    ...(runtime.clientUrl ? { clientUrl: runtime.clientUrl } : {}),
    desiredState: runtime.desiredState,
    ...(runtime.lastSeenAt ? { lastSeenAt: runtime.lastSeenAt } : {}),
    nodeId: runtime.nodeId,
    observedState: runtime.observedState,
    projectionSource: runtime.projection.source,
    ...(runtime.runnerId ? { runnerId: runtime.runnerId } : {}),
    ...(runtime.statusMessage ? { statusMessage: runtime.statusMessage } : {})
  };
}

export function projectHostProjectionSummary(
  projection: HostProjectionSnapshot
): HostProjectionCliSummary {
  return {
    assignmentCount: projection.assignments.length,
    failedRuntimeCount: projection.runtimes.filter(
      (runtime) => runtime.observedState === "failed"
    ).length,
    freshness: projection.freshness,
    generatedAt: projection.generatedAt,
    runtimeCount: projection.runtimes.length,
    runtimes: sortRuntimeProjectionsForCli(projection.runtimes).map(
      projectRuntimeProjectionSummary
    ),
    runnerCount: projection.runners.length,
    runningRuntimeCount: projection.runtimes.filter(
      (runtime) => runtime.observedState === "running"
    ).length,
    userConversationCount: projection.userConversations.length
  };
}
