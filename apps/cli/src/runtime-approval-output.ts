import {
  filterRuntimeApprovalsForPresentation,
  formatRuntimeApprovalDetailLines,
  formatRuntimeApprovalLabel,
  formatRuntimeApprovalStatus,
  sortRuntimeApprovalsForPresentation,
  type RuntimeApprovalPresentationFilterOptions
} from "@entangle/host-client";
import type { ApprovalRecord } from "@entangle/types";

export type RuntimeApprovalCliFilterOptions =
  RuntimeApprovalPresentationFilterOptions;

export const filterRuntimeApprovalsForCli =
  filterRuntimeApprovalsForPresentation;
export const sortRuntimeApprovalsForCli = sortRuntimeApprovalsForPresentation;

export interface RuntimeApprovalSummaryRecord {
  approvalId: string;
  approverNodeIds: string[];
  conversationId?: string;
  detailLines: string[];
  label: string;
  operation?: ApprovalRecord["operation"];
  resource?: ApprovalRecord["resource"];
  requestedAt: string;
  requestedByNodeId: string;
  sessionId: string;
  status: ApprovalRecord["status"];
  statusText: string;
  updatedAt: string;
}

export function projectRuntimeApprovalSummary(
  approval: ApprovalRecord
): RuntimeApprovalSummaryRecord {
  return {
    approvalId: approval.approvalId,
    approverNodeIds: approval.approverNodeIds,
    ...(approval.conversationId
      ? { conversationId: approval.conversationId }
      : {}),
    detailLines: formatRuntimeApprovalDetailLines(approval),
    label: formatRuntimeApprovalLabel(approval),
    ...(approval.operation ? { operation: approval.operation } : {}),
    ...(approval.resource ? { resource: approval.resource } : {}),
    requestedAt: approval.requestedAt,
    requestedByNodeId: approval.requestedByNodeId,
    sessionId: approval.sessionId,
    status: approval.status,
    statusText: formatRuntimeApprovalStatus(approval),
    updatedAt: approval.updatedAt
  };
}
