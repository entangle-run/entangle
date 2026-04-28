import type {
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
