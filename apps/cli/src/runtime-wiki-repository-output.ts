import { formatRuntimeWikiRepositoryPublicationStatus } from "@entangle/host-client";
import type { RuntimeWikiRepositoryPublicationRecord } from "@entangle/types";

export function projectRuntimeWikiRepositoryPublicationSummary(
  publication: RuntimeWikiRepositoryPublicationRecord
) {
  return {
    artifactId: publication.artifactId,
    branch: publication.branch,
    commit: publication.commit,
    createdAt: publication.createdAt,
    nodeId: publication.nodeId,
    publicationId: publication.publicationId,
    status: formatRuntimeWikiRepositoryPublicationStatus(publication),
    targetGitServiceRef: publication.targetGitServiceRef,
    targetNamespace: publication.targetNamespace,
    targetRepositoryName: publication.targetRepositoryName,
    updatedAt: publication.updatedAt
  };
}
