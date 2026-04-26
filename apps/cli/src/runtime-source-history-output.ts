import type {
  RuntimeSourceHistoryReplayRecord,
  SourceHistoryRecord
} from "@entangle/types";
import {
  formatRuntimeSourceHistoryDetailLines,
  formatRuntimeSourceHistoryLabel,
  formatRuntimeSourceHistoryReplayStatus
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

  return {
    appliedAt: entry.appliedAt,
    candidateId: entry.candidateId,
    commit: entry.commit,
    detailLines: formatRuntimeSourceHistoryDetailLines(entry),
    applicationApprovalId: entry.applicationApprovalId,
    label: formatRuntimeSourceHistoryLabel(entry),
    mode: entry.mode,
    nodeId: entry.nodeId,
    publicationState: entry.publication?.publication.state ?? "not_requested",
    ...(publicationTarget ? { publicationTarget } : {}),
    publicationApprovalId: entry.publication?.approvalId,
    publishedArtifactId: entry.publication?.artifactId,
    sourceHistoryId: entry.sourceHistoryId,
    turnId: entry.turnId
  };
}

export function projectRuntimeSourceHistoryReplaySummary(
  replay: RuntimeSourceHistoryReplayRecord
) {
  return {
    baseTree: replay.baseTree,
    candidateId: replay.candidateId,
    commit: replay.commit,
    createdAt: replay.createdAt,
    headTree: replay.headTree,
    nodeId: replay.nodeId,
    replayedFileCount: replay.replayedFileCount,
    replayedPath: replay.replayedPath,
    replayId: replay.replayId,
    sourceHistoryId: replay.sourceHistoryId,
    status: formatRuntimeSourceHistoryReplayStatus(replay),
    unavailableReason: replay.unavailableReason,
    updatedAt: replay.updatedAt
  };
}
