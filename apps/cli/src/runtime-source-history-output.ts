import type { SourceHistoryRecord } from "@entangle/types";
import {
  formatRuntimeSourceHistoryDetailLines,
  formatRuntimeSourceHistoryLabel,
  listRuntimeSourceHistoryPublications
} from "@entangle/host-client";

export function projectRuntimeSourceHistorySummary(entry: SourceHistoryRecord) {
  const publicationTarget = entry.publication
    ? [
        entry.publication.targetGitServiceRef,
        entry.publication.targetNamespace,
        entry.publication.targetRepositoryName
      ]
        .filter((value) => value !== undefined)
        .join("/")
    : undefined;
  const publications = listRuntimeSourceHistoryPublications(entry);

  return {
    appliedAt: entry.appliedAt,
    candidateId: entry.candidateId,
    commit: entry.commit,
    detailLines: formatRuntimeSourceHistoryDetailLines(entry),
    applicationApprovalId: entry.applicationApprovalId,
    label: formatRuntimeSourceHistoryLabel(entry),
    mode: entry.mode,
    nodeId: entry.nodeId,
    publicationCount: publications.length,
    publicationState: entry.publication?.publication.state ?? "not_requested",
    ...(publicationTarget ? { publicationTarget } : {}),
    publicationTargets: publications
      .map((publication) => publication.target)
      .filter((target) => target !== undefined),
    publicationApprovalId: entry.publication?.approvalId,
    publishedArtifactId: entry.publication?.artifactId,
    publishedArtifactIds: publications.map((publication) => publication.artifactId),
    sourceHistoryId: entry.sourceHistoryId,
    turnId: entry.turnId
  };
}
