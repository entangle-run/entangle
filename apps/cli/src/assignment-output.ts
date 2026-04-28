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
  entryKind: string;
  message?: string;
  receiptKind?: string;
  status?: string;
  timestamp: string;
};

export type RuntimeAssignmentTimelineCliSummary = {
  assignment: RuntimeAssignmentCliSummary;
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
    receiptCount: response.receipts.length,
    timeline: sortRuntimeAssignmentTimelineForCli(response.timeline).map(
      (entry) => ({
        entryKind: entry.entryKind,
        ...(entry.message ? { message: entry.message } : {}),
        ...(entry.receiptKind ? { receiptKind: entry.receiptKind } : {}),
        ...(entry.status ? { status: entry.status } : {}),
        timestamp: entry.timestamp
      })
    )
  };
}
