import type { ArtifactRecord } from "@entangle/types";

export function sortRuntimeArtifacts(
  artifacts: ArtifactRecord[]
): ArtifactRecord[] {
  return [...artifacts].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  );
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
