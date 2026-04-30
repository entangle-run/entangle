import type {
  RuntimeWikiPublishRequest,
  RuntimeWikiPublishResponse,
  RuntimeWikiUpsertPageRequest,
  RuntimeWikiUpsertPageResponse
} from "@entangle/types";

export type RuntimeWikiPublicationDraft = {
  reason: string;
  requestedBy: string;
  retryFailedPublication: boolean;
  targetGitServiceRef: string;
  targetNamespace: string;
  targetRepositoryName: string;
};

export type RuntimeWikiPageUpsertDraft = {
  content: string;
  expectedCurrentSha256: string;
  mode: "append" | "patch" | "replace";
  path: string;
  reason: string;
  requestedBy: string;
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

export function createEmptyRuntimeWikiPageUpsertDraft(): RuntimeWikiPageUpsertDraft {
  return {
    content: "",
    expectedCurrentSha256: "",
    mode: "replace",
    path: "",
    reason: "",
    requestedBy: ""
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

export function buildRuntimeWikiPageUpsertRequest(
  draft: RuntimeWikiPageUpsertDraft
): RuntimeWikiUpsertPageRequest {
  return {
    content: draft.content,
    ...(optionalTrimmed(draft.expectedCurrentSha256)
      ? { expectedCurrentSha256: optionalTrimmed(draft.expectedCurrentSha256) }
      : {}),
    mode: draft.mode,
    path: draft.path.trim(),
    ...(optionalTrimmed(draft.reason)
      ? { reason: optionalTrimmed(draft.reason) }
      : {}),
    ...(optionalTrimmed(draft.requestedBy)
      ? { requestedBy: optionalTrimmed(draft.requestedBy) }
      : {})
  };
}

export function formatRuntimeWikiPageUpsertRequestSummary(
  response: RuntimeWikiUpsertPageResponse
): string {
  return `Wiki page ${response.path} requested on ${response.assignmentId} (${response.commandId})`;
}
