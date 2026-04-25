import {
  collectHostSessionInspectionTraceIds,
  countHostSessionApprovalStatusRecords,
  countHostSessionConsistencyFindings,
  countHostSessionConversationStatusRecords,
  formatHostSessionDetail,
  formatHostSessionInspectionNodeDetail,
  formatHostSessionInspectionNodeLabel,
  formatHostSessionLabel,
  sortHostSessionInspectionNodes
} from "@entangle/host-client";
import type {
  ApprovalStatusCounts,
  ConversationStatusCounts,
  HostSessionConsistencyFinding,
  HostSessionSummary,
  SessionInspectionResponse
} from "@entangle/types";

export interface HostSessionCliSummaryRecord {
  activeConversationCount: number;
  approvalStatusCounts?: ApprovalStatusCounts;
  consistencyFindingCount: number;
  conversationStatusCounts?: ConversationStatusCounts;
  detail: string;
  graphId: string;
  label: string;
  latestMessageType?: HostSessionSummary["latestMessageType"];
  nodeIds: string[];
  recordedApprovalCount: number;
  recordedConversationCount: number;
  rootArtifactCount: number;
  sessionConsistencyFindings?: HostSessionConsistencyFinding[];
  sessionId: string;
  statusByNode: HostSessionSummary["nodeStatuses"];
  traceIds: string[];
  updatedAt: string;
  waitingApprovalCount: number;
}

export interface HostSessionInspectionCliNodeRecord {
  activeConversationCount: number;
  approvalStatusCounts?: ApprovalStatusCounts;
  consistencyFindingCount: number;
  conversationStatusCounts?: ConversationStatusCounts;
  detail: string;
  label: string;
  nodeId: string;
  recordedApprovalCount: number;
  recordedConversationCount: number;
  rootArtifactCount: number;
  runtimeState: string;
  sessionConsistencyFindings?: HostSessionConsistencyFinding[];
  status: HostSessionSummary["nodeStatuses"][number]["status"];
  traceId: string;
  updatedAt: string;
  waitingApprovalCount: number;
}

export interface HostSessionInspectionCliSummaryRecord {
  graphId: string;
  nodes: HostSessionInspectionCliNodeRecord[];
  sessionId: string;
  traceIds: string[];
}

export function projectHostSessionSummary(
  session: HostSessionSummary
): HostSessionCliSummaryRecord {
  return {
    activeConversationCount: session.activeConversationIds.length,
    ...(session.approvalStatusCounts
      ? { approvalStatusCounts: session.approvalStatusCounts }
      : {}),
    consistencyFindingCount: countHostSessionConsistencyFindings(
      session.sessionConsistencyFindings
    ),
    ...(session.conversationStatusCounts
      ? { conversationStatusCounts: session.conversationStatusCounts }
      : {}),
    detail: formatHostSessionDetail(session),
    graphId: session.graphId,
    label: formatHostSessionLabel(session),
    ...(session.latestMessageType
      ? { latestMessageType: session.latestMessageType }
      : {}),
    nodeIds: session.nodeIds,
    recordedApprovalCount: countHostSessionApprovalStatusRecords(
      session.approvalStatusCounts
    ),
    recordedConversationCount: countHostSessionConversationStatusRecords(
      session.conversationStatusCounts
    ),
    rootArtifactCount: session.rootArtifactIds.length,
    ...(session.sessionConsistencyFindings
      ? { sessionConsistencyFindings: session.sessionConsistencyFindings }
      : {}),
    sessionId: session.sessionId,
    statusByNode: session.nodeStatuses,
    traceIds: session.traceIds,
    updatedAt: session.updatedAt,
    waitingApprovalCount: session.waitingApprovalIds.length
  };
}

export function projectHostSessionInspectionSummary(
  inspection: SessionInspectionResponse
): HostSessionInspectionCliSummaryRecord {
  return {
    graphId: inspection.graphId,
    nodes: sortHostSessionInspectionNodes(inspection).map((entry) => ({
      activeConversationCount: entry.session.activeConversationIds.length,
      ...(entry.approvalStatusCounts
        ? { approvalStatusCounts: entry.approvalStatusCounts }
        : {}),
      consistencyFindingCount: countHostSessionConsistencyFindings(
        entry.sessionConsistencyFindings
      ),
      ...(entry.conversationStatusCounts
        ? { conversationStatusCounts: entry.conversationStatusCounts }
        : {}),
      detail: formatHostSessionInspectionNodeDetail(entry),
      label: formatHostSessionInspectionNodeLabel(entry),
      nodeId: entry.nodeId,
      recordedApprovalCount: countHostSessionApprovalStatusRecords(
        entry.approvalStatusCounts
      ),
      recordedConversationCount: countHostSessionConversationStatusRecords(
        entry.conversationStatusCounts
      ),
      rootArtifactCount: entry.session.rootArtifactIds.length,
      runtimeState: `${entry.runtime.desiredState}/${entry.runtime.observedState}`,
      ...(entry.sessionConsistencyFindings
        ? { sessionConsistencyFindings: entry.sessionConsistencyFindings }
        : {}),
      status: entry.session.status,
      traceId: entry.session.traceId,
      updatedAt: entry.session.updatedAt,
      waitingApprovalCount: entry.session.waitingApprovalIds.length
    })),
    sessionId: inspection.sessionId,
    traceIds: collectHostSessionInspectionTraceIds(inspection)
  };
}
