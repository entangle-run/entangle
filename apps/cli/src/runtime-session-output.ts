import {
  collectHostSessionInspectionTraceIds,
  formatHostSessionDetail,
  formatHostSessionInspectionNodeDetail,
  formatHostSessionInspectionNodeLabel,
  formatHostSessionLabel,
  sortHostSessionInspectionNodes
} from "@entangle/host-client";
import type {
  HostSessionSummary,
  SessionInspectionResponse
} from "@entangle/types";

export interface HostSessionCliSummaryRecord {
  activeConversationCount: number;
  detail: string;
  graphId: string;
  label: string;
  latestMessageType?: HostSessionSummary["latestMessageType"];
  nodeIds: string[];
  rootArtifactCount: number;
  sessionId: string;
  statusByNode: HostSessionSummary["nodeStatuses"];
  traceIds: string[];
  updatedAt: string;
  waitingApprovalCount: number;
}

export interface HostSessionInspectionCliNodeRecord {
  activeConversationCount: number;
  detail: string;
  label: string;
  nodeId: string;
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
    detail: formatHostSessionDetail(session),
    graphId: session.graphId,
    label: formatHostSessionLabel(session),
    ...(session.latestMessageType
      ? { latestMessageType: session.latestMessageType }
      : {}),
    nodeIds: session.nodeIds,
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
      detail: formatHostSessionInspectionNodeDetail(entry),
      label: formatHostSessionInspectionNodeLabel(entry),
      nodeId: entry.nodeId,
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
