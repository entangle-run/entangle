import type { RuntimeAssignmentRecord } from "@entangle/types";

export type RuntimeAssignmentCliSummary = {
  assignmentId: string;
  leaseExpiresAt?: string;
  nodeId: string;
  runnerId: string;
  status: string;
  updatedAt: string;
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
