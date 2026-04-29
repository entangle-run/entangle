import type {
  RuntimeArtifactRestoreRequest,
  RuntimeArtifactRestoreResponse,
  RuntimeArtifactSourceChangeProposalRequest,
  RuntimeArtifactSourceChangeProposalResponse
} from "@entangle/types";

export type RuntimeArtifactRestoreDraft = {
  reason: string;
  requestedBy: string;
  restoreId: string;
};

export type RuntimeArtifactSourceChangeProposalDraft = {
  overwrite: boolean;
  proposalId: string;
  reason: string;
  requestedBy: string;
  targetPath: string;
};

export function createEmptyRuntimeArtifactRestoreDraft(): RuntimeArtifactRestoreDraft {
  return {
    reason: "",
    requestedBy: "",
    restoreId: ""
  };
}

export function createEmptyRuntimeArtifactSourceChangeProposalDraft(): RuntimeArtifactSourceChangeProposalDraft {
  return {
    overwrite: false,
    proposalId: "",
    reason: "",
    requestedBy: "",
    targetPath: ""
  };
}

function optionalTrimmed(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function buildRuntimeArtifactRestoreRequest(
  draft: RuntimeArtifactRestoreDraft
): RuntimeArtifactRestoreRequest {
  return {
    ...(optionalTrimmed(draft.reason)
      ? { reason: optionalTrimmed(draft.reason) }
      : {}),
    ...(optionalTrimmed(draft.requestedBy)
      ? { requestedBy: optionalTrimmed(draft.requestedBy) }
      : {}),
    ...(optionalTrimmed(draft.restoreId)
      ? { restoreId: optionalTrimmed(draft.restoreId) }
      : {})
  };
}

export function formatRuntimeArtifactRestoreRequestSummary(
  response: RuntimeArtifactRestoreResponse
): string {
  return `Artifact ${response.artifactId} restore requested on ${response.assignmentId} (${response.commandId})`;
}

export function buildRuntimeArtifactSourceChangeProposalRequest(
  draft: RuntimeArtifactSourceChangeProposalDraft
): RuntimeArtifactSourceChangeProposalRequest {
  return {
    overwrite: draft.overwrite,
    ...(optionalTrimmed(draft.proposalId)
      ? { proposalId: optionalTrimmed(draft.proposalId) }
      : {}),
    ...(optionalTrimmed(draft.reason)
      ? { reason: optionalTrimmed(draft.reason) }
      : {}),
    ...(optionalTrimmed(draft.requestedBy)
      ? { requestedBy: optionalTrimmed(draft.requestedBy) }
      : {}),
    ...(optionalTrimmed(draft.targetPath)
      ? { targetPath: optionalTrimmed(draft.targetPath) }
      : {})
  };
}

export function formatRuntimeArtifactSourceChangeProposalRequestSummary(
  response: RuntimeArtifactSourceChangeProposalResponse
): string {
  const target = response.targetPath ? ` into ${response.targetPath}` : "";
  const proposal = response.proposalId ? ` as ${response.proposalId}` : "";

  return `Artifact ${response.artifactId} source-change proposal requested${target}${proposal} on ${response.assignmentId} (${response.commandId})`;
}
