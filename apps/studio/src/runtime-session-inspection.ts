import type { HostSessionSummary } from "@entangle/types";

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

  return `Nodes ${nodeSummary} · traces ${traceSummary}`;
}
