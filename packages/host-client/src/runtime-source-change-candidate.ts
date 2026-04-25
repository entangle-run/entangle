import type { SourceChangeCandidateRecord } from "@entangle/types";
import { formatSourceChangeSummary } from "./runtime-turn.js";

export type RuntimeSourceChangeCandidateFilter = {
  sessionId?: string | undefined;
  status?: SourceChangeCandidateRecord["status"] | undefined;
  turnId?: string | undefined;
};

export function sortRuntimeSourceChangeCandidatesForPresentation(
  candidates: SourceChangeCandidateRecord[]
): SourceChangeCandidateRecord[] {
  return [...candidates].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  );
}

export function filterRuntimeSourceChangeCandidatesForPresentation(
  candidates: SourceChangeCandidateRecord[],
  filter: RuntimeSourceChangeCandidateFilter = {}
): SourceChangeCandidateRecord[] {
  return candidates.filter((candidate) => {
    if (filter.status && candidate.status !== filter.status) {
      return false;
    }

    if (filter.sessionId && candidate.sessionId !== filter.sessionId) {
      return false;
    }

    if (filter.turnId && candidate.turnId !== filter.turnId) {
      return false;
    }

    return true;
  });
}

export function formatRuntimeSourceChangeCandidateLabel(
  candidate: SourceChangeCandidateRecord
): string {
  return `${candidate.candidateId} · ${candidate.status}`;
}

export function formatRuntimeSourceChangeCandidateStatus(
  candidate: SourceChangeCandidateRecord
): string {
  const session = candidate.sessionId ? ` · session ${candidate.sessionId}` : "";

  return `Turn ${candidate.turnId} · ${formatSourceChangeSummary(
    candidate.sourceChangeSummary
  )}${session}`;
}

export function formatRuntimeSourceChangeCandidateDetailLines(
  candidate: SourceChangeCandidateRecord
): string[] {
  const lines = [
    `created ${candidate.createdAt}`,
    `updated ${candidate.updatedAt}`,
    `graph ${candidate.graphId}`,
    `node ${candidate.nodeId}`,
    `turn ${candidate.turnId}`,
    `status ${candidate.status}`,
    `source changes ${formatSourceChangeSummary(candidate.sourceChangeSummary)}`
  ];

  if (candidate.sessionId) {
    lines.push(`session ${candidate.sessionId}`);
  }

  if (candidate.conversationId) {
    lines.push(`conversation ${candidate.conversationId}`);
  }

  if (candidate.snapshot) {
    lines.push(
      `snapshot ${candidate.snapshot.kind} ${candidate.snapshot.baseTree}..${candidate.snapshot.headTree}`
    );
  }

  if (candidate.sourceChangeSummary.files.length > 0) {
    lines.push(
      ...candidate.sourceChangeSummary.files.slice(0, 8).map((file) => {
        const churn =
          file.additions > 0 || file.deletions > 0
            ? ` (+${file.additions}/-${file.deletions})`
            : "";

        return `source file ${file.status} ${file.path}${churn}`;
      })
    );
  }

  if (candidate.sourceChangeSummary.diffExcerpt) {
    lines.push("diff excerpt available");
  }

  return lines;
}
