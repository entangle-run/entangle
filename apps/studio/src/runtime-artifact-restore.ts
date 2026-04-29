import type {
  RuntimeArtifactRestoreRequest,
  RuntimeArtifactRestoreResponse
} from "@entangle/types";

export type RuntimeArtifactRestoreDraft = {
  reason: string;
  requestedBy: string;
  restoreId: string;
};

export function createEmptyRuntimeArtifactRestoreDraft(): RuntimeArtifactRestoreDraft {
  return {
    reason: "",
    requestedBy: "",
    restoreId: ""
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
