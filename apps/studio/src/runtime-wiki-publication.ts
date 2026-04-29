import type {
  RuntimeWikiPublishRequest,
  RuntimeWikiPublishResponse
} from "@entangle/types";

export type RuntimeWikiPublicationDraft = {
  reason: string;
  requestedBy: string;
  retryFailedPublication: boolean;
  targetGitServiceRef: string;
  targetNamespace: string;
  targetRepositoryName: string;
};

export function createEmptyRuntimeWikiPublicationDraft(): RuntimeWikiPublicationDraft {
  return {
    reason: "",
    requestedBy: "",
    retryFailedPublication: false,
    targetGitServiceRef: "",
    targetNamespace: "",
    targetRepositoryName: ""
  };
}

function optionalTrimmed(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function buildRuntimeWikiPublicationRequest(
  draft: RuntimeWikiPublicationDraft
): RuntimeWikiPublishRequest {
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
    ...(optionalTrimmed(draft.reason)
      ? { reason: optionalTrimmed(draft.reason) }
      : {}),
    ...(optionalTrimmed(draft.requestedBy)
      ? { requestedBy: optionalTrimmed(draft.requestedBy) }
      : {}),
    retryFailedPublication: draft.retryFailedPublication,
    ...(target ? { target } : {})
  };
}

export function formatRuntimeWikiPublicationRequestSummary(
  response: RuntimeWikiPublishResponse
): string {
  return `Wiki publication requested on ${response.assignmentId} (${response.commandId})`;
}
