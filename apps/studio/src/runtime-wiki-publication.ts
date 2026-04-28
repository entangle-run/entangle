import type {
  RuntimeWikiPublishRequest,
  RuntimeWikiPublishResponse
} from "@entangle/types";

export type RuntimeWikiPublicationDraft = {
  reason: string;
  requestedBy: string;
  retryFailedPublication: boolean;
};

export function createEmptyRuntimeWikiPublicationDraft(): RuntimeWikiPublicationDraft {
  return {
    reason: "",
    requestedBy: "",
    retryFailedPublication: false
  };
}

function optionalTrimmed(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function buildRuntimeWikiPublicationRequest(
  draft: RuntimeWikiPublicationDraft
): RuntimeWikiPublishRequest {
  return {
    ...(optionalTrimmed(draft.reason)
      ? { reason: optionalTrimmed(draft.reason) }
      : {}),
    ...(optionalTrimmed(draft.requestedBy)
      ? { requestedBy: optionalTrimmed(draft.requestedBy) }
      : {}),
    retryFailedPublication: draft.retryFailedPublication
  };
}

export function formatRuntimeWikiPublicationRequestSummary(
  response: RuntimeWikiPublishResponse
): string {
  return `Wiki publication requested on ${response.assignmentId} (${response.commandId})`;
}
