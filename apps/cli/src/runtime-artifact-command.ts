import type {
  ArtifactBackend,
  ArtifactKind,
  ArtifactLifecycleState,
  ArtifactPublicationState,
  ArtifactRecord,
  ArtifactRetrievalState
} from "@entangle/types";

export type RuntimeArtifactCliFilterOptions = {
  backend?: ArtifactBackend;
  kind?: ArtifactKind;
  lifecycleState?: ArtifactLifecycleState;
  publicationState?: ArtifactPublicationState | "not_requested";
  retrievalState?: ArtifactRetrievalState | "not_retrieved";
};

export function sortRuntimeArtifactsForCli(
  artifacts: ArtifactRecord[]
): ArtifactRecord[] {
  return [...artifacts].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  );
}

export function filterRuntimeArtifactsForCli(
  artifacts: ArtifactRecord[],
  options: RuntimeArtifactCliFilterOptions
): ArtifactRecord[] {
  return artifacts.filter((artifact) => {
    if (options.backend && artifact.ref.backend !== options.backend) {
      return false;
    }

    if (options.kind && artifact.ref.artifactKind !== options.kind) {
      return false;
    }

    if (options.lifecycleState && artifact.ref.status !== options.lifecycleState) {
      return false;
    }

    const publicationState = artifact.publication?.state ?? "not_requested";
    if (options.publicationState && publicationState !== options.publicationState) {
      return false;
    }

    const retrievalState = artifact.retrieval?.state ?? "not_retrieved";
    if (options.retrievalState && retrievalState !== options.retrievalState) {
      return false;
    }

    return true;
  });
}
