import type { SourceHistoryRecord } from "@entangle/types";

export function sortRuntimeSourceHistoryForPresentation(
  history: SourceHistoryRecord[]
): SourceHistoryRecord[] {
  return [...history].sort((left, right) =>
    right.appliedAt.localeCompare(left.appliedAt)
  );
}

export function formatRuntimeSourceHistoryLabel(
  history: SourceHistoryRecord
): string {
  return `${history.sourceHistoryId} · ${history.mode}`;
}

export function formatRuntimeSourceHistoryDetailLines(
  history: SourceHistoryRecord
): string[] {
  return [
    `history ${history.sourceHistoryId}`,
    `candidate ${history.candidateId}`,
    `status ${history.mode}`,
    `applied at ${history.appliedAt}`,
    ...(history.appliedBy ? [`applied by ${history.appliedBy}`] : []),
    `commit ${history.commit}`,
    `branch ${history.branch}`,
    ...(history.publication
      ? [
          `artifact ${history.publication.artifactId}`,
          `publication ${history.publication.publication.state}`,
          `publication branch ${history.publication.branch}`,
          ...(history.publication.publication.remoteName
            ? [`publication remote ${history.publication.publication.remoteName}`]
            : []),
          ...(history.publication.publication.remoteUrl
            ? [`published remote ${history.publication.publication.remoteUrl}`]
            : []),
          ...(history.publication.publication.lastError
            ? [`publication error ${history.publication.publication.lastError}`]
            : [])
        ]
      : []),
    `turn ${history.turnId}`,
    ...(history.sessionId ? [`session ${history.sessionId}`] : []),
    ...(history.conversationId
      ? [`conversation ${history.conversationId}`]
      : []),
    `files ${history.sourceChangeSummary.fileCount}`,
    `additions ${history.sourceChangeSummary.additions}`,
    `deletions ${history.sourceChangeSummary.deletions}`,
    ...(history.reason ? [`reason ${history.reason}`] : [])
  ];
}
