import type { RuntimeWikiRepositoryPublicationRecord } from "@entangle/types";

export function sortRuntimeWikiRepositoryPublicationsForPresentation(
  publications: RuntimeWikiRepositoryPublicationRecord[]
): RuntimeWikiRepositoryPublicationRecord[] {
  return [...publications].sort((left, right) => {
    const updatedComparison = right.updatedAt.localeCompare(left.updatedAt);
    if (updatedComparison !== 0) {
      return updatedComparison;
    }

    return right.publicationId.localeCompare(left.publicationId);
  });
}

export function formatRuntimeWikiRepositoryPublicationStatus(
  publication: RuntimeWikiRepositoryPublicationRecord
): string {
  if (publication.publication.state === "published") {
    return `published to ${publication.targetGitServiceRef ?? "git"}/${
      publication.targetNamespace ?? "unknown"
    }/${publication.targetRepositoryName ?? "unknown"}`;
  }

  if (publication.publication.state === "failed") {
    return publication.publication.lastError
      ? `failed: ${publication.publication.lastError}`
      : "failed";
  }

  return publication.publication.state;
}
