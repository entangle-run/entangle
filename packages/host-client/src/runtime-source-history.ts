import type {
  SourceHistoryPublicationRecord,
  SourceHistoryRecord
} from "@entangle/types";

export type RuntimeSourceHistoryPublicationPresentation = {
  approvalId?: string;
  artifactId: string;
  branch: string;
  state: SourceHistoryPublicationRecord["publication"]["state"];
  target?: string;
};

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

function formatSourceHistoryPublicationTarget(
  publication: SourceHistoryPublicationRecord
): string | undefined {
  const target = [
    publication.targetGitServiceRef,
    publication.targetNamespace,
    publication.targetRepositoryName
  ]
    .filter((entry) => entry !== undefined)
    .join("/");

  return target.length > 0 ? target : undefined;
}

export function listRuntimeSourceHistoryPublications(
  history: SourceHistoryRecord
): RuntimeSourceHistoryPublicationPresentation[] {
  const records =
    history.publications.length > 0
      ? history.publications
      : history.publication
        ? [history.publication]
        : [];

  return records.map((publication) => {
    const target = formatSourceHistoryPublicationTarget(publication);

    return {
      ...(publication.approvalId ? { approvalId: publication.approvalId } : {}),
      artifactId: publication.artifactId,
      branch: publication.branch,
      state: publication.publication.state,
      ...(target ? { target } : {})
    };
  });
}

export function formatRuntimeSourceHistoryDetailLines(
  history: SourceHistoryRecord
): string[] {
  const publicationTarget = history.publication
    ? formatSourceHistoryPublicationTarget(history.publication)
    : undefined;
  const publications = listRuntimeSourceHistoryPublications(history);

  return [
    `history ${history.sourceHistoryId}`,
    `candidate ${history.candidateId}`,
    `status ${history.mode}`,
    `applied at ${history.appliedAt}`,
    ...(history.appliedBy ? [`applied by ${history.appliedBy}`] : []),
    ...(history.applicationApprovalId
      ? [`application approval ${history.applicationApprovalId}`]
      : []),
    `commit ${history.commit}`,
    `branch ${history.branch}`,
    ...(history.publication
      ? [
          `artifact ${history.publication.artifactId}`,
          `publication ${history.publication.publication.state}`,
          `publication branch ${history.publication.branch}`,
          ...(history.publication.approvalId
            ? [`publication approval ${history.publication.approvalId}`]
            : []),
          ...(publicationTarget
            ? [`publication target ${publicationTarget}`]
            : []),
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
    ...(publications.length > 1
      ? [
          `publications ${publications.length}`,
          ...publications.map((publication, index) =>
            [
              `publication ${index + 1}`,
              publication.state,
              publication.artifactId,
              ...(publication.target ? [`target ${publication.target}`] : [])
            ].join(" ")
          )
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
