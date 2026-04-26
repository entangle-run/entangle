import type {
  SessionInspectionResponse,
  SessionLifecycleState
} from "@entangle/types";

export {
  collectHostSessionInspectionTraceIds as collectSessionInspectionTraceIds,
  filterHostSessionsForNode as filterRuntimeSessions,
  formatHostSessionDetail as formatRuntimeSessionDetail,
  formatHostSessionInspectionNodeDetail as formatSessionInspectionNodeDetail,
  formatHostSessionInspectionNodeLabel as formatSessionInspectionNodeLabel,
  formatHostSessionLabel as formatRuntimeSessionLabel,
  sessionInspectionReferencesNode as sessionInspectionReferencesRuntime,
  sortHostSessionInspectionNodes as sortSessionInspectionNodes
} from "@entangle/host-client";

const terminalSessionStatuses = new Set<SessionLifecycleState>([
  "cancelled",
  "completed",
  "failed",
  "timed_out"
]);

export function isTerminalRuntimeSessionStatus(
  status: SessionLifecycleState
): boolean {
  return terminalSessionStatuses.has(status);
}

export function listCancellableSessionNodeIds(
  inspection: SessionInspectionResponse
): string[] {
  return inspection.nodes
    .filter((entry) => !isTerminalRuntimeSessionStatus(entry.session.status))
    .map((entry) => entry.nodeId)
    .sort();
}

export function formatSessionCancellationTargetSummary(
  nodeIds: string[]
): string {
  return nodeIds.length > 0 ? nodeIds.join(", ") : "no cancellable nodes";
}
