import type {
  RuntimeAssignmentRecord,
  RuntimeAssignmentTimelineEntry,
  RuntimeAssignmentTimelineResponse
} from "@entangle/types";

export type RuntimeAssignmentCliSummary = {
  assignmentId: string;
  leaseExpiresAt?: string;
  nodeId: string;
  runnerId: string;
  status: string;
  updatedAt: string;
};

export type RuntimeAssignmentTimelineCliEntry = {
  commandEventType?: string;
  commandId?: string;
  entryKind: string;
  message?: string;
  receiptKind?: string;
  receiptStatus?: string;
  status?: string;
  timestamp: string;
};

export type RuntimeAssignmentTimelineCliSummary = {
  assignment: RuntimeAssignmentCliSummary;
  commandReceiptCount: number;
  receiptCount: number;
  timeline: RuntimeAssignmentTimelineCliEntry[];
};

export function sortRuntimeAssignmentsForCli(
  assignments: RuntimeAssignmentRecord[]
): RuntimeAssignmentRecord[] {
  return [...assignments].sort((left, right) =>
    left.assignmentId.localeCompare(right.assignmentId)
  );
}

export function projectRuntimeAssignmentSummary(
  assignment: RuntimeAssignmentRecord
): RuntimeAssignmentCliSummary {
  return {
    assignmentId: assignment.assignmentId,
    ...(assignment.lease?.expiresAt
      ? { leaseExpiresAt: assignment.lease.expiresAt }
      : {}),
    nodeId: assignment.nodeId,
    runnerId: assignment.runnerId,
    status: assignment.status,
    updatedAt: assignment.updatedAt
  };
}

export function sortRuntimeAssignmentTimelineForCli(
  entries: RuntimeAssignmentTimelineEntry[]
): RuntimeAssignmentTimelineEntry[] {
  return [...entries].sort((left, right) => {
    const timeOrder = left.timestamp.localeCompare(right.timestamp);
    return timeOrder !== 0
      ? timeOrder
      : left.entryKind.localeCompare(right.entryKind);
  });
}

export function projectRuntimeAssignmentTimelineSummary(
  response: RuntimeAssignmentTimelineResponse
): RuntimeAssignmentTimelineCliSummary {
  return {
    assignment: projectRuntimeAssignmentSummary(response.assignment),
    commandReceiptCount: response.commandReceipts.length,
    receiptCount: response.receipts.length,
    timeline: sortRuntimeAssignmentTimelineForCli(response.timeline).map(
      (entry) => ({
        ...(entry.commandEventType
          ? { commandEventType: entry.commandEventType }
          : {}),
        ...(entry.commandId ? { commandId: entry.commandId } : {}),
        entryKind: entry.entryKind,
        ...(entry.message ? { message: entry.message } : {}),
        ...(entry.receiptKind ? { receiptKind: entry.receiptKind } : {}),
        ...(entry.receiptStatus ? { receiptStatus: entry.receiptStatus } : {}),
        ...(entry.status ? { status: entry.status } : {}),
        timestamp: entry.timestamp
      })
    )
  };
}
