import type {
  ApprovalStatusCounts,
  HostSessionConsistencyFinding,
  ConversationStatusCounts,
  HostSessionNodeInspection,
  HostSessionSummary,
  SessionInspectionResponse
} from "@entangle/types";

const conversationStatusOrder: Array<keyof ConversationStatusCounts> = [
  "opened",
  "acknowledged",
  "working",
  "blocked",
  "awaiting_approval",
  "resolved",
  "rejected",
  "closed",
  "expired"
];

const emptyConversationStatusCounts: ConversationStatusCounts = {
  acknowledged: 0,
  awaiting_approval: 0,
  blocked: 0,
  closed: 0,
  expired: 0,
  opened: 0,
  rejected: 0,
  resolved: 0,
  working: 0
};

const approvalStatusOrder: Array<keyof ApprovalStatusCounts> = [
  "not_required",
  "pending",
  "approved",
  "rejected",
  "expired",
  "withdrawn"
];

const emptyApprovalStatusCounts: ApprovalStatusCounts = {
  approved: 0,
  expired: 0,
  not_required: 0,
  pending: 0,
  rejected: 0,
  withdrawn: 0
};

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

export function resolveHostSessionConversationStatusCounts(
  counts?: ConversationStatusCounts
): ConversationStatusCounts {
  return {
    ...emptyConversationStatusCounts,
    ...(counts ?? {})
  };
}

export function countHostSessionConversationStatusRecords(
  counts?: ConversationStatusCounts
): number {
  const normalizedCounts = resolveHostSessionConversationStatusCounts(counts);

  return conversationStatusOrder.reduce(
    (total, status) => total + normalizedCounts[status],
    0
  );
}

export function formatHostSessionConversationStatusDetail(
  counts?: ConversationStatusCounts
): string {
  return `conversation statuses ${formatHostSessionConversationStatusSummary(counts)}`;
}

export function formatHostSessionConversationStatusSummary(
  counts?: ConversationStatusCounts
): string {
  const normalizedCounts = resolveHostSessionConversationStatusCounts(counts);
  const statusParts = conversationStatusOrder
    .filter((status) => normalizedCounts[status] > 0)
    .map((status) => `${status} ${normalizedCounts[status]}`);

  return statusParts.length > 0 ? statusParts.join(", ") : "none";
}

export function resolveHostSessionApprovalStatusCounts(
  counts?: ApprovalStatusCounts
): ApprovalStatusCounts {
  return {
    ...emptyApprovalStatusCounts,
    ...(counts ?? {})
  };
}

export function countHostSessionApprovalStatusRecords(
  counts?: ApprovalStatusCounts
): number {
  const normalizedCounts = resolveHostSessionApprovalStatusCounts(counts);

  return approvalStatusOrder.reduce(
    (total, status) => total + normalizedCounts[status],
    0
  );
}

export function formatHostSessionApprovalStatusDetail(
  counts?: ApprovalStatusCounts
): string {
  return `approval statuses ${formatHostSessionApprovalStatusSummary(counts)}`;
}

export function formatHostSessionApprovalStatusSummary(
  counts?: ApprovalStatusCounts
): string {
  const normalizedCounts = resolveHostSessionApprovalStatusCounts(counts);
  const statusParts = approvalStatusOrder
    .filter((status) => normalizedCounts[status] > 0)
    .map((status) => `${status} ${normalizedCounts[status]}`);

  return statusParts.length > 0 ? statusParts.join(", ") : "none";
}

export function countHostSessionConsistencyFindings(
  findings?: HostSessionConsistencyFinding[]
): number {
  return findings?.length ?? 0;
}

export function formatHostSessionConsistencyFinding(
  finding: HostSessionConsistencyFinding
): string {
  const target = finding.conversationId
    ? `${finding.nodeId}/${finding.conversationId}`
    : `${finding.nodeId}/session`;

  return `${finding.severity} ${finding.code} on ${target}`;
}

export function formatHostSessionConsistencySummary(
  findings?: HostSessionConsistencyFinding[]
): string {
  if (!findings || findings.length === 0) {
    return "consistency findings none";
  }

  const preview = findings
    .slice(0, 2)
    .map(formatHostSessionConsistencyFinding)
    .join("; ");
  const overflowCount = findings.length - 2;

  return overflowCount > 0
    ? `consistency findings ${findings.length}: ${preview}; +${overflowCount} more`
    : `consistency findings ${findings.length}: ${preview}`;
}

export function formatHostSessionDetail(
  session: HostSessionSummary
): string {
  const nodeSummary = session.nodeStatuses
    .map((entry) => `${entry.nodeId}:${entry.status}`)
    .join(", ");

  const traceSummary =
    session.traceIds.length > 0 ? session.traceIds.join(", ") : "no trace ids";
  const conversationRecordCount = countHostSessionConversationStatusRecords(
    session.conversationStatusCounts
  );
  const consistencyFindingCount = countHostSessionConsistencyFindings(
    session.sessionConsistencyFindings
  );
  const approvalRecordCount = countHostSessionApprovalStatusRecords(
    session.approvalStatusCounts
  );
  const activeWorkSummary = [
    `active conversations ${session.activeConversationIds.length}`,
    `recorded conversations ${conversationRecordCount}`,
    ...(conversationRecordCount > 0
      ? [
          formatHostSessionConversationStatusDetail(
            session.conversationStatusCounts
          )
        ]
      : []),
    ...(consistencyFindingCount > 0
      ? [
          formatHostSessionConsistencySummary(
            session.sessionConsistencyFindings
          )
        ]
      : []),
    `approvals ${session.waitingApprovalIds.length}`,
    `recorded approvals ${approvalRecordCount}`,
    ...(approvalRecordCount > 0
      ? [formatHostSessionApprovalStatusDetail(session.approvalStatusCounts)]
      : []),
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
  const conversationRecordCount = countHostSessionConversationStatusRecords(
    entry.conversationStatusCounts
  );
  const consistencyFindingCount = countHostSessionConsistencyFindings(
    entry.sessionConsistencyFindings
  );
  const approvalRecordCount = countHostSessionApprovalStatusRecords(
    entry.approvalStatusCounts
  );

  return [
    `Runtime ${entry.runtime.desiredState}/${entry.runtime.observedState}`,
    `active conversations ${entry.session.activeConversationIds.length}`,
    `recorded conversations ${conversationRecordCount}`,
    ...(conversationRecordCount > 0
      ? [
          formatHostSessionConversationStatusDetail(
            entry.conversationStatusCounts
          )
        ]
      : []),
    ...(consistencyFindingCount > 0
      ? [
          formatHostSessionConsistencySummary(
            entry.sessionConsistencyFindings
          )
        ]
      : []),
    `approvals ${entry.session.waitingApprovalIds.length}`,
    `recorded approvals ${approvalRecordCount}`,
    ...(approvalRecordCount > 0
      ? [formatHostSessionApprovalStatusDetail(entry.approvalStatusCounts)]
      : []),
    `root artifacts ${entry.session.rootArtifactIds.length}`,
    ...(entry.session.lastMessageType
      ? [`last message ${entry.session.lastMessageType}`]
      : [])
  ].join(" · ");
}
