import type {
  HostProjectionSnapshot,
  RuntimeCommandReceiptProjectionRecord,
  RuntimeProjectionRecord
} from "@entangle/types";

export type RuntimeProjectionCliSummary = {
  assignmentId?: string;
  backendKind: string;
  clientUrl?: string;
  desiredState: string;
  lastSeenAt?: string;
  nodeId: string;
  observedState: string;
  projectionSource: string;
  runnerId?: string;
  statusMessage?: string;
};

export type HostProjectionCliSummary = {
  assignmentCount: number;
  assignmentReceiptCount: number;
  failedRuntimeCount: number;
  freshness: string;
  generatedAt: string;
  runtimeCount: number;
  runtimeCommandReceiptCount: number;
  runtimeCommandReceipts: RuntimeCommandReceiptCliSummary[];
  runtimes: RuntimeProjectionCliSummary[];
  runnerCount: number;
  runningRuntimeCount: number;
  sourceHistoryRefCount: number;
  sourceHistoryReplayCount: number;
  userConversationCount: number;
};

export type RuntimeCommandReceiptCliSummary = {
  assignmentId?: string;
  commandEventType: string;
  commandId: string;
  nodeId: string;
  observedAt: string;
  receiptStatus: string;
  runnerId: string;
};

export type RuntimeCommandReceiptCliFilters = {
  assignmentId?: string;
  commandEventType?: string;
  nodeId?: string;
  receiptStatus?: RuntimeCommandReceiptProjectionRecord["receiptStatus"];
  runnerId?: string;
};

const runtimeCommandReceiptStatuses = new Set<
  RuntimeCommandReceiptProjectionRecord["receiptStatus"]
>(["received", "completed", "failed"]);

export function sortRuntimeProjectionsForCli(
  runtimes: RuntimeProjectionRecord[]
): RuntimeProjectionRecord[] {
  return [...runtimes].sort((left, right) =>
    left.nodeId.localeCompare(right.nodeId)
  );
}

export function projectRuntimeProjectionSummary(
  runtime: RuntimeProjectionRecord
): RuntimeProjectionCliSummary {
  return {
    ...(runtime.assignmentId ? { assignmentId: runtime.assignmentId } : {}),
    backendKind: runtime.backendKind,
    ...(runtime.clientUrl ? { clientUrl: runtime.clientUrl } : {}),
    desiredState: runtime.desiredState,
    ...(runtime.lastSeenAt ? { lastSeenAt: runtime.lastSeenAt } : {}),
    nodeId: runtime.nodeId,
    observedState: runtime.observedState,
    projectionSource: runtime.projection.source,
    ...(runtime.runnerId ? { runnerId: runtime.runnerId } : {}),
    ...(runtime.statusMessage ? { statusMessage: runtime.statusMessage } : {})
  };
}

export function sortRuntimeCommandReceiptsForCli(
  receipts: RuntimeCommandReceiptProjectionRecord[]
): RuntimeCommandReceiptProjectionRecord[] {
  return [...receipts].sort((left, right) => {
    const timeOrder = right.observedAt.localeCompare(left.observedAt);
    return timeOrder !== 0
      ? timeOrder
      : left.commandId.localeCompare(right.commandId);
  });
}

export function parseRuntimeCommandReceiptStatusForCli(
  status: string | undefined
): RuntimeCommandReceiptProjectionRecord["receiptStatus"] | undefined {
  if (status === undefined) {
    return undefined;
  }

  if (
    runtimeCommandReceiptStatuses.has(
      status as RuntimeCommandReceiptProjectionRecord["receiptStatus"]
    )
  ) {
    return status as RuntimeCommandReceiptProjectionRecord["receiptStatus"];
  }

  throw new Error(
    "--status must be one of received, completed, or failed."
  );
}

export function filterRuntimeCommandReceiptsForCli(
  receipts: RuntimeCommandReceiptProjectionRecord[],
  filters: RuntimeCommandReceiptCliFilters
): RuntimeCommandReceiptProjectionRecord[] {
  return receipts.filter((receipt) => {
    if (
      filters.assignmentId !== undefined &&
      receipt.assignmentId !== filters.assignmentId
    ) {
      return false;
    }

    if (
      filters.commandEventType !== undefined &&
      receipt.commandEventType !== filters.commandEventType
    ) {
      return false;
    }

    if (filters.nodeId !== undefined && receipt.nodeId !== filters.nodeId) {
      return false;
    }

    if (
      filters.receiptStatus !== undefined &&
      receipt.receiptStatus !== filters.receiptStatus
    ) {
      return false;
    }

    if (filters.runnerId !== undefined && receipt.runnerId !== filters.runnerId) {
      return false;
    }

    return true;
  });
}

export function projectRuntimeCommandReceiptSummary(
  receipt: RuntimeCommandReceiptProjectionRecord
): RuntimeCommandReceiptCliSummary {
  return {
    ...(receipt.assignmentId ? { assignmentId: receipt.assignmentId } : {}),
    commandEventType: receipt.commandEventType,
    commandId: receipt.commandId,
    nodeId: receipt.nodeId,
    observedAt: receipt.observedAt,
    receiptStatus: receipt.receiptStatus,
    runnerId: receipt.runnerId
  };
}

export function projectHostProjectionSummary(
  projection: HostProjectionSnapshot
): HostProjectionCliSummary {
  return {
    assignmentCount: projection.assignments.length,
    assignmentReceiptCount: projection.assignmentReceipts.length,
    failedRuntimeCount: projection.runtimes.filter(
      (runtime) => runtime.observedState === "failed"
    ).length,
    freshness: projection.freshness,
    generatedAt: projection.generatedAt,
    runtimeCount: projection.runtimes.length,
    runtimeCommandReceiptCount: projection.runtimeCommandReceipts.length,
    runtimeCommandReceipts: sortRuntimeCommandReceiptsForCli(
      projection.runtimeCommandReceipts
    )
      .slice(0, 6)
      .map(projectRuntimeCommandReceiptSummary),
    runtimes: sortRuntimeProjectionsForCli(projection.runtimes).map(
      projectRuntimeProjectionSummary
    ),
    runnerCount: projection.runners.length,
    runningRuntimeCount: projection.runtimes.filter(
      (runtime) => runtime.observedState === "running"
    ).length,
    sourceHistoryRefCount: projection.sourceHistoryRefs.length,
    sourceHistoryReplayCount: projection.sourceHistoryReplays.length,
    userConversationCount: projection.userConversations.length
  };
}
