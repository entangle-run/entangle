import type {
  HostSessionNodeInspection,
  HostSessionSummary,
  SessionInspectionResponse
} from "@entangle/types";

export function filterRuntimeSessions(
  sessions: HostSessionSummary[],
  nodeId: string
): HostSessionSummary[] {
  return sessions
    .filter((session) => session.nodeIds.includes(nodeId))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function formatRuntimeSessionLabel(
  session: HostSessionSummary,
  nodeId: string
): string {
  const nodeStatus =
    session.nodeStatuses.find((entry) => entry.nodeId === nodeId)?.status ??
    "unknown";

  return `${session.sessionId} · ${nodeStatus}`;
}

export function formatRuntimeSessionDetail(
  session: HostSessionSummary
): string {
  const nodeSummary = session.nodeStatuses
    .map((entry) => `${entry.nodeId}:${entry.status}`)
    .join(", ");

  const traceSummary =
    session.traceIds.length > 0 ? session.traceIds.join(", ") : "no trace ids";
  const activeWorkSummary = [
    `active conversations ${session.activeConversationIds.length}`,
    `approvals ${session.waitingApprovalIds.length}`,
    `root artifacts ${session.rootArtifactIds.length}`,
    ...(session.latestMessageType
      ? [`latest message ${session.latestMessageType}`]
      : [])
  ].join(" · ");

  return `Nodes ${nodeSummary} · ${activeWorkSummary} · traces ${traceSummary}`;
}

export function sessionInspectionReferencesRuntime(
  inspection: SessionInspectionResponse,
  nodeId: string
): boolean {
  return inspection.nodes.some((entry) => entry.nodeId === nodeId);
}

export function sortSessionInspectionNodes(
  inspection: SessionInspectionResponse,
  selectedRuntimeId: string
): HostSessionNodeInspection[] {
  return [...inspection.nodes].sort((left, right) => {
    const leftPriority = left.nodeId === selectedRuntimeId ? 0 : 1;
    const rightPriority = right.nodeId === selectedRuntimeId ? 0 : 1;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.nodeId.localeCompare(right.nodeId);
  });
}

export function collectSessionInspectionTraceIds(
  inspection: SessionInspectionResponse
): string[] {
  return Array.from(
    new Set(inspection.nodes.map((entry) => entry.session.traceId))
  ).sort();
}

export function formatSessionInspectionNodeLabel(
  entry: HostSessionNodeInspection,
  selectedRuntimeId: string
): string {
  const roleLabel =
    entry.nodeId === selectedRuntimeId ? "selected runtime" : "peer runtime";

  return `${entry.nodeId} · ${entry.session.status} · ${roleLabel}`;
}

export function formatSessionInspectionNodeDetail(
  entry: HostSessionNodeInspection
): string {
  return [
    `Runtime ${entry.runtime.desiredState}/${entry.runtime.observedState}`,
    `active conversations ${entry.session.activeConversationIds.length}`,
    `approvals ${entry.session.waitingApprovalIds.length}`,
    `root artifacts ${entry.session.rootArtifactIds.length}`,
    ...(entry.session.lastMessageType
      ? [`last message ${entry.session.lastMessageType}`]
      : [])
  ].join(" · ");
}
