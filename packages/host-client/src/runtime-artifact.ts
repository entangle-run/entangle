import type {
  ArtifactBackend,
  ArtifactKind,
  ArtifactLifecycleState,
  ArtifactPublicationState,
  ArtifactRecord,
  ArtifactRetrievalState
} from "@entangle/types";

export type RuntimeArtifactPresentationFilterOptions = {
  backend?: ArtifactBackend;
  kind?: ArtifactKind;
  lifecycleState?: ArtifactLifecycleState;
  publicationState?: ArtifactPublicationState | "not_requested";
  retrievalState?: ArtifactRetrievalState | "not_retrieved";
  sessionId?: string;
};

export function sortRuntimeArtifactsForPresentation(
  artifacts: ArtifactRecord[]
): ArtifactRecord[] {
  return [...artifacts].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  );
}

export function filterRuntimeArtifactsForPresentation(
  artifacts: ArtifactRecord[],
  options: RuntimeArtifactPresentationFilterOptions
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

    if (options.sessionId && artifact.ref.sessionId !== options.sessionId) {
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

export function formatRuntimeArtifactLabel(
  artifact: ArtifactRecord
): string {
  const kind = artifact.ref.artifactKind ?? "artifact";
  return `${artifact.ref.artifactId} · ${artifact.ref.backend}/${kind}`;
}

export function formatRuntimeArtifactStatus(
  artifact: ArtifactRecord
): string {
  const lifecycleState = artifact.ref.status ?? "unknown";
  const publicationState = artifact.publication?.state ?? "not_requested";
  const retrievalState = artifact.retrieval?.state ?? "not_retrieved";

  return `Lifecycle ${lifecycleState} · publication ${publicationState} · retrieval ${retrievalState}`;
}

export function formatRuntimeArtifactLocator(
  artifact: ArtifactRecord
): string {
  switch (artifact.ref.backend) {
    case "git": {
      const repositoryLabel =
        artifact.ref.locator.repositoryName ??
        `${artifact.ref.locator.namespace ?? "unscoped"}/unknown`;

      return `${repositoryLabel}:${artifact.ref.locator.path}@${artifact.ref.locator.commit.slice(0, 12)}`;
    }
    case "wiki":
      return `${artifact.ref.locator.nodeId}:${artifact.ref.locator.path}`;
    case "local_file":
      return artifact.ref.locator.path;
  }
}

export function formatRuntimeArtifactDetailLines(
  artifact: ArtifactRecord
): string[] {
  const lines = [
    `created ${artifact.createdAt}`,
    `updated ${artifact.updatedAt}`
  ];

  if (artifact.ref.createdByNodeId) {
    lines.push(`created by ${artifact.ref.createdByNodeId}`);
  }

  if (artifact.ref.sessionId) {
    lines.push(`session ${artifact.ref.sessionId}`);
  }

  if (artifact.turnId) {
    lines.push(`turn ${artifact.turnId}`);
  }

  if (artifact.ref.contentSummary) {
    lines.push(`summary ${artifact.ref.contentSummary}`);
  }

  if (artifact.materialization?.repoPath) {
    lines.push(`repo ${artifact.materialization.repoPath}`);
  }

  if (artifact.materialization?.localPath) {
    lines.push(`local ${artifact.materialization.localPath}`);
  }

  if (artifact.publication?.state) {
    lines.push(`publication ${artifact.publication.state}`);
  }

  if (artifact.publication?.remoteUrl) {
    lines.push(`published remote ${artifact.publication.remoteUrl}`);
  }

  if (artifact.publication?.lastError) {
    lines.push(`publication error ${artifact.publication.lastError}`);
  }

  if (artifact.retrieval?.state) {
    lines.push(`retrieval ${artifact.retrieval.state}`);
  }

  if (artifact.retrieval?.lastError) {
    lines.push(`retrieval error ${artifact.retrieval.lastError}`);
  }

  return lines;
}
