import {
  collectHostSessionInspectionTraceIds,
  countHostSessionConversationStatusRecords,
  formatHostSessionDetail,
  formatHostSessionInspectionNodeDetail,
  formatHostSessionInspectionNodeLabel,
  formatHostSessionLabel,
  sortHostSessionInspectionNodes
} from "@entangle/host-client";
import type {
  ConversationStatusCounts,
  HostSessionSummary,
  SessionInspectionResponse
} from "@entangle/types";

export interface HostSessionCliSummaryRecord {
  activeConversationCount: number;
  conversationStatusCounts?: ConversationStatusCounts;
  detail: string;
  graphId: string;
  label: string;
  latestMessageType?: HostSessionSummary["latestMessageType"];
  nodeIds: string[];
  recordedConversationCount: number;
  rootArtifactCount: number;
  sessionId: string;
  statusByNode: HostSessionSummary["nodeStatuses"];
  traceIds: string[];
  updatedAt: string;
  waitingApprovalCount: number;
}

export interface HostSessionInspectionCliNodeRecord {
  activeConversationCount: number;
  conversationStatusCounts?: ConversationStatusCounts;
  detail: string;
  label: string;
  nodeId: string;
  recordedConversationCount: number;
  rootArtifactCount: number;
  runtimeState: string;
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
    recordedConversationCount: countHostSessionConversationStatusRecords(
      session.conversationStatusCounts
    ),
    rootArtifactCount: session.rootArtifactIds.length,
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
      ...(entry.conversationStatusCounts
        ? { conversationStatusCounts: entry.conversationStatusCounts }
        : {}),
      detail: formatHostSessionInspectionNodeDetail(entry),
      label: formatHostSessionInspectionNodeLabel(entry),
      nodeId: entry.nodeId,
      recordedConversationCount: countHostSessionConversationStatusRecords(
        entry.conversationStatusCounts
      ),
      rootArtifactCount: entry.session.rootArtifactIds.length,
      runtimeState: `${entry.runtime.desiredState}/${entry.runtime.observedState}`,
      status: entry.session.status,
      traceId: entry.session.traceId,
      updatedAt: entry.session.updatedAt,
      waitingApprovalCount: entry.session.waitingApprovalIds.length
    })),
    sessionId: inspection.sessionId,
    traceIds: collectHostSessionInspectionTraceIds(inspection)
  };
}
