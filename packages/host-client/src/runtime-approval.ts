import type {
  ApprovalLifecycleState,
  ApprovalRecord
} from "@entangle/types";

export type RuntimeApprovalPresentationFilterOptions = {
  approverNodeId?: string;
  conversationId?: string;
  requestedByNodeId?: string;
  sessionId?: string;
  status?: ApprovalLifecycleState;
};

export function sortRuntimeApprovalsForPresentation(
  approvals: ApprovalRecord[]
): ApprovalRecord[] {
  return [...approvals].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  );
}

export function filterRuntimeApprovalsForPresentation(
  approvals: ApprovalRecord[],
  options: RuntimeApprovalPresentationFilterOptions
): ApprovalRecord[] {
  return approvals.filter((approval) => {
    if (options.status && approval.status !== options.status) {
      return false;
    }

    if (options.sessionId && approval.sessionId !== options.sessionId) {
      return false;
    }

    if (
      options.conversationId &&
      approval.conversationId !== options.conversationId
    ) {
      return false;
    }

    if (
      options.requestedByNodeId &&
      approval.requestedByNodeId !== options.requestedByNodeId
    ) {
      return false;
    }

    if (
      options.approverNodeId &&
      !approval.approverNodeIds.includes(options.approverNodeId)
    ) {
      return false;
    }

    return true;
  });
}

export function formatRuntimeApprovalLabel(
  approval: ApprovalRecord
): string {
  return `${approval.approvalId} · ${approval.status}`;
}

export function formatRuntimeApprovalStatus(
  approval: ApprovalRecord
): string {
  return (
    `Requested by ${approval.requestedByNodeId} · ` +
    `approvers ${approval.approverNodeIds.length} · ` +
    `session ${approval.sessionId}`
  );
}

export function formatRuntimeApprovalDetailLines(
  approval: ApprovalRecord
): string[] {
  const lines = [
    `requested ${approval.requestedAt}`,
    `updated ${approval.updatedAt}`,
    `graph ${approval.graphId}`,
    `session ${approval.sessionId}`,
    `requested by ${approval.requestedByNodeId}`,
    `approvers ${formatApprovalIdList(approval.approverNodeIds)}`,
    `status ${approval.status}`
  ];

  if (approval.conversationId) {
    lines.push(`conversation ${approval.conversationId}`);
  }

  if (approval.reason) {
    lines.push(`reason ${approval.reason}`);
  }

  return lines;
}

function formatApprovalIdList(values: string[]): string {
  return values.length > 0 ? values.join(", ") : "none";
}
