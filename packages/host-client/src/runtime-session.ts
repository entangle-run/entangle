import type {
  HostSessionNodeInspection,
  HostSessionSummary,
  SessionInspectionResponse
} from "@entangle/types";

export function sortHostSessionSummariesForPresentation(
  sessions: HostSessionSummary[]
): HostSessionSummary[] {
  return [...sessions].sort((left, right) => {
    const updatedAtOrdering = right.updatedAt.localeCompare(left.updatedAt);

    if (updatedAtOrdering !== 0) {
      return updatedAtOrdering;
    }

    return left.sessionId.localeCompare(right.sessionId);
  });
}

export function filterHostSessionsForNode(
  sessions: HostSessionSummary[],
  nodeId: string
): HostSessionSummary[] {
  return sortHostSessionSummariesForPresentation(
    sessions.filter((session) => session.nodeIds.includes(nodeId))
  );
}

export function formatHostSessionLabel(
  session: HostSessionSummary,
  nodeId?: string
): string {
  if (nodeId) {
    const nodeStatus =
      session.nodeStatuses.find((entry) => entry.nodeId === nodeId)?.status ??
      "unknown";

    return `${session.sessionId} · ${nodeStatus}`;
  }

  const statusSummary = session.nodeStatuses
    .map((entry) => `${entry.nodeId}:${entry.status}`)
    .join(", ");

  return `${session.sessionId} · ${statusSummary}`;
}

export function formatHostSessionDetail(
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

export function sessionInspectionReferencesNode(
  inspection: SessionInspectionResponse,
  nodeId: string
): boolean {
  return inspection.nodes.some((entry) => entry.nodeId === nodeId);
}

export function sortHostSessionInspectionNodes(
  inspection: SessionInspectionResponse,
  selectedNodeId?: string
): HostSessionNodeInspection[] {
  return [...inspection.nodes].sort((left, right) => {
    const leftPriority = left.nodeId === selectedNodeId ? 0 : 1;
    const rightPriority = right.nodeId === selectedNodeId ? 0 : 1;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.nodeId.localeCompare(right.nodeId);
  });
}

export function collectHostSessionInspectionTraceIds(
  inspection: SessionInspectionResponse
): string[] {
  return Array.from(
    new Set(inspection.nodes.map((entry) => entry.session.traceId))
  ).sort();
}

export function formatHostSessionInspectionNodeLabel(
  entry: HostSessionNodeInspection,
  selectedNodeId?: string
): string {
  if (!selectedNodeId) {
    return `${entry.nodeId} · ${entry.session.status}`;
  }

  const roleLabel =
    entry.nodeId === selectedNodeId ? "selected runtime" : "peer runtime";

  return `${entry.nodeId} · ${entry.session.status} · ${roleLabel}`;
}

export function formatHostSessionInspectionNodeDetail(
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
