import type {
  RuntimeSourceHistoryPublishRequest,
  RuntimeSourceHistoryPublishResponse,
  RuntimeSourceHistoryReconcileResponse,
  RuntimeSourceHistoryReplayRequest,
  RuntimeSourceHistoryReplayResponse
} from "@entangle/types";

export {
  formatRuntimeSourceHistoryDetailLines,
  formatRuntimeSourceHistoryLabel,
  sortRuntimeSourceHistoryForPresentation as sortRuntimeSourceHistory
} from "@entangle/host-client";

export type RuntimeSourceHistoryReplayDraft = {
  approvalId: string;
  reason: string;
  replayId: string;
  replayedBy: string;
};

export type RuntimeSourceHistoryPublicationDraft = {
  approvalId: string;
  reason: string;
  requestedBy: string;
  retryFailedPublication: boolean;
  targetGitServiceRef: string;
  targetNamespace: string;
  targetRepositoryName: string;
};

export function createEmptyRuntimeSourceHistoryPublicationDraft(): RuntimeSourceHistoryPublicationDraft {
  return {
    approvalId: "",
    reason: "",
    requestedBy: "",
    retryFailedPublication: false,
    targetGitServiceRef: "",
    targetNamespace: "",
    targetRepositoryName: ""
  };
}

export function createEmptyRuntimeSourceHistoryReplayDraft(): RuntimeSourceHistoryReplayDraft {
  return {
    approvalId: "",
    reason: "",
    replayId: "",
    replayedBy: ""
  };
}

function optionalTrimmed(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function buildRuntimeSourceHistoryPublicationRequest(
  draft: RuntimeSourceHistoryPublicationDraft
): RuntimeSourceHistoryPublishRequest {
  const target =
    optionalTrimmed(draft.targetGitServiceRef) ||
    optionalTrimmed(draft.targetNamespace) ||
    optionalTrimmed(draft.targetRepositoryName)
      ? {
          ...(optionalTrimmed(draft.targetGitServiceRef)
            ? { gitServiceRef: optionalTrimmed(draft.targetGitServiceRef) }
            : {}),
          ...(optionalTrimmed(draft.targetNamespace)
            ? { namespace: optionalTrimmed(draft.targetNamespace) }
            : {}),
          ...(optionalTrimmed(draft.targetRepositoryName)
            ? { repositoryName: optionalTrimmed(draft.targetRepositoryName) }
            : {})
        }
      : undefined;

  return {
    ...(optionalTrimmed(draft.approvalId)
      ? { approvalId: optionalTrimmed(draft.approvalId) }
      : {}),
    ...(optionalTrimmed(draft.reason) ? { reason: optionalTrimmed(draft.reason) } : {}),
    ...(optionalTrimmed(draft.requestedBy)
      ? { requestedBy: optionalTrimmed(draft.requestedBy) }
      : {}),
    retryFailedPublication: draft.retryFailedPublication,
    ...(target ? { target } : {})
  };
}

export function buildRuntimeSourceHistoryReplayRequest(
  draft: RuntimeSourceHistoryReplayDraft
): RuntimeSourceHistoryReplayRequest {
  return {
    ...(optionalTrimmed(draft.approvalId)
      ? { approvalId: optionalTrimmed(draft.approvalId) }
      : {}),
    ...(optionalTrimmed(draft.reason) ? { reason: optionalTrimmed(draft.reason) } : {}),
    ...(optionalTrimmed(draft.replayId)
      ? { replayId: optionalTrimmed(draft.replayId) }
      : {}),
    ...(optionalTrimmed(draft.replayedBy)
      ? { replayedBy: optionalTrimmed(draft.replayedBy) }
      : {})
  };
}

export function formatRuntimeSourceHistoryReplayRequestSummary(
  response: RuntimeSourceHistoryReplayResponse
): string {
  return `${response.sourceHistoryId} requested on ${response.assignmentId} (${response.commandId})`;
}

export function formatRuntimeSourceHistoryReconcileRequestSummary(
  response: RuntimeSourceHistoryReconcileResponse
): string {
  return `${response.sourceHistoryId} reconcile requested on ${response.assignmentId} (${response.commandId})`;
}

export function formatRuntimeSourceHistoryPublicationRequestSummary(
  response: RuntimeSourceHistoryPublishResponse
): string {
  return `${response.sourceHistoryId} publication requested on ${response.assignmentId} (${response.commandId})`;
}
