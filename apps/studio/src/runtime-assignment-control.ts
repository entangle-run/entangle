import type {
  AssignmentProjectionRecord,
  GraphSpec,
  HostProjectionSnapshot,
  RuntimeAssignmentOfferRequest
} from "@entangle/types";

export type RuntimeAssignmentControlDraft = {
  leaseDurationSeconds: string;
  nodeId: string;
  runnerId: string;
};

export type RuntimeAssignmentControlOption = {
  detail: string;
  id: string;
  label: string;
};

const revocableAssignmentStatuses = new Set<AssignmentProjectionRecord["status"]>([
  "accepted",
  "active",
  "offered",
  "revoking"
]);

export function createEmptyRuntimeAssignmentControlDraft(): RuntimeAssignmentControlDraft {
  return {
    leaseDurationSeconds: "3600",
    nodeId: "",
    runnerId: ""
  };
}

export function buildRuntimeAssignmentNodeOptions(
  graph: GraphSpec | null | undefined
): RuntimeAssignmentControlOption[] {
  return [...(graph?.nodes ?? [])]
    .sort((left, right) => left.nodeId.localeCompare(right.nodeId))
    .map((node) => ({
      detail: node.nodeKind,
      id: node.nodeId,
      label: `${node.nodeId} - ${node.nodeKind}`
    }));
}

export function buildRuntimeAssignmentRunnerOptions(
  projection: HostProjectionSnapshot | null | undefined
): RuntimeAssignmentControlOption[] {
  return [...(projection?.runners ?? [])]
    .filter((runner) => runner.trustState === "trusted")
    .sort((left, right) => left.runnerId.localeCompare(right.runnerId))
    .map((runner) => ({
      detail: `${runner.trustState} - ${runner.operationalState}`,
      id: runner.runnerId,
      label: `${runner.runnerId} - ${runner.operationalState}`
    }));
}

export function normalizeRuntimeAssignmentControlDraft(input: {
  draft: RuntimeAssignmentControlDraft;
  nodeOptions: RuntimeAssignmentControlOption[];
  runnerOptions: RuntimeAssignmentControlOption[];
}): RuntimeAssignmentControlDraft {
  const nodeId = input.nodeOptions.some(
    (option) => option.id === input.draft.nodeId
  )
    ? input.draft.nodeId
    : (input.nodeOptions[0]?.id ?? "");
  const runnerId = input.runnerOptions.some(
    (option) => option.id === input.draft.runnerId
  )
    ? input.draft.runnerId
    : (input.runnerOptions[0]?.id ?? "");

  return {
    leaseDurationSeconds: input.draft.leaseDurationSeconds.trim()
      ? input.draft.leaseDurationSeconds
      : "3600",
    nodeId,
    runnerId
  };
}

export function buildRuntimeAssignmentOfferRequest(
  draft: RuntimeAssignmentControlDraft
): RuntimeAssignmentOfferRequest {
  const leaseDurationSeconds = Number.parseInt(draft.leaseDurationSeconds, 10);

  if (!draft.nodeId.trim()) {
    throw new Error("Select a node before offering a runtime assignment.");
  }

  if (!draft.runnerId.trim()) {
    throw new Error("Select a trusted runner before offering a runtime assignment.");
  }

  if (
    !Number.isSafeInteger(leaseDurationSeconds) ||
    leaseDurationSeconds <= 0
  ) {
    throw new Error("Assignment lease duration must be a positive integer.");
  }

  return {
    leaseDurationSeconds,
    nodeId: draft.nodeId,
    runnerId: draft.runnerId
  };
}

export function sortAssignmentProjectionsForStudio(
  assignments: AssignmentProjectionRecord[]
): AssignmentProjectionRecord[] {
  return [...assignments].sort((left, right) => {
    const statusPriority = (status: AssignmentProjectionRecord["status"]) =>
      status === "active"
        ? 0
        : status === "accepted"
          ? 1
          : status === "offered"
            ? 2
            : 3;
    const priorityOrder =
      statusPriority(left.status) - statusPriority(right.status);

    if (priorityOrder !== 0) {
      return priorityOrder;
    }

    const nodeOrder = left.nodeId.localeCompare(right.nodeId);

    if (nodeOrder !== 0) {
      return nodeOrder;
    }

    return left.assignmentId.localeCompare(right.assignmentId);
  });
}

export function canRevokeAssignmentProjection(
  assignment: AssignmentProjectionRecord
): boolean {
  return revocableAssignmentStatuses.has(assignment.status);
}

export function formatAssignmentProjectionLabel(
  assignment: AssignmentProjectionRecord
): string {
  return `${assignment.nodeId} -> ${assignment.runnerId}`;
}

export function formatAssignmentProjectionDetail(
  assignment: AssignmentProjectionRecord
): string {
  return `${assignment.status} - ${assignment.assignmentId}`;
}
