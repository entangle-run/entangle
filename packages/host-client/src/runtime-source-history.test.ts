import { describe, expect, it } from "vitest";
import type { SourceHistoryRecord } from "@entangle/types";
import {
  formatRuntimeSourceHistoryDetailLines,
  formatRuntimeSourceHistoryLabel,
  formatRuntimeSourceHistoryReplayStatus,
  sortRuntimeSourceHistoryForPresentation
} from "./runtime-source-history.js";

const history: SourceHistoryRecord[] = [
  {
    appliedAt: "2026-04-24T00:01:00.000Z",
    baseTree: "base-tree-old",
    branch: "entangle-source-history",
    candidateId: "source-change-turn-old",
    commit: "commit-old",
    graphId: "team-alpha",
    graphRevisionId: "team-alpha-20260424-000000",
    headTree: "head-tree-old",
    mode: "applied_to_workspace",
    nodeId: "worker-it",
    sourceChangeSummary: {
      additions: 1,
      checkedAt: "2026-04-24T00:00:00.000Z",
      deletions: 0,
      fileCount: 1,
      files: [],
      status: "changed",
      truncated: false
    },
    sourceHistoryId: "source-history-source-change-turn-old",
    turnId: "turn-old",
    updatedAt: "2026-04-24T00:01:00.000Z"
  },
  {
    appliedAt: "2026-04-24T00:03:00.000Z",
    appliedBy: "operator-alpha",
    applicationApprovalId: "approval-source-apply-new",
    baseTree: "base-tree-new",
    branch: "entangle-source-history",
    candidateId: "source-change-turn-new",
    commit: "commit-new",
    graphId: "team-alpha",
    graphRevisionId: "team-alpha-20260424-000001",
    headTree: "head-tree-new",
    mode: "already_in_workspace",
    nodeId: "worker-it",
    publication: {
      approvalId: "approval-source-publish-new",
      artifactId: "source-source-history-source-change-turn-new",
      branch: "worker-it/source-history/source-history-source-change-turn-new",
      publication: {
        publishedAt: "2026-04-24T00:04:00.000Z",
        remoteName: "entangle-local-gitea",
        remoteUrl: "ssh://git@gitea.local:22/team-alpha/graph-alpha.git",
        state: "published"
      },
      requestedAt: "2026-04-24T00:04:00.000Z",
      targetGitServiceRef: "local-gitea",
      targetNamespace: "team-alpha",
      targetRepositoryName: "graph-alpha"
    },
    reason: "Promote accepted source.",
    sourceChangeSummary: {
      additions: 2,
      checkedAt: "2026-04-24T00:02:00.000Z",
      deletions: 1,
      fileCount: 2,
      files: [],
      status: "changed",
      truncated: false
    },
    sourceHistoryId: "source-history-source-change-turn-new",
    turnId: "turn-new",
    updatedAt: "2026-04-24T00:03:00.000Z"
  }
];

describe("runtime source history presentation helpers", () => {
  it("sorts newest first and formats source history detail", () => {
    expect(
      sortRuntimeSourceHistoryForPresentation(history).map(
        (entry) => entry.sourceHistoryId
      )
    ).toEqual([
      "source-history-source-change-turn-new",
      "source-history-source-change-turn-old"
    ]);

    expect(formatRuntimeSourceHistoryLabel(history[1]!)).toBe(
      "source-history-source-change-turn-new · already_in_workspace"
    );
    expect(formatRuntimeSourceHistoryDetailLines(history[1]!)).toContain(
      "reason Promote accepted source."
    );
    expect(formatRuntimeSourceHistoryDetailLines(history[1]!)).toContain(
      "publication published"
    );
    expect(formatRuntimeSourceHistoryDetailLines(history[1]!)).toContain(
      "publication target local-gitea/team-alpha/graph-alpha"
    );
    expect(formatRuntimeSourceHistoryDetailLines(history[1]!)).toContain(
      "application approval approval-source-apply-new"
    );
    expect(formatRuntimeSourceHistoryDetailLines(history[1]!)).toContain(
      "publication approval approval-source-publish-new"
    );
  });

  it("formats source history replay status", () => {
    expect(
      formatRuntimeSourceHistoryReplayStatus({
        baseTree: "base-tree-new",
        candidateId: "source-change-turn-new",
        commit: "commit-new",
        createdAt: "2026-04-24T00:05:00.000Z",
        graphId: "team-alpha",
        graphRevisionId: "team-alpha-20260424-000001",
        headTree: "head-tree-new",
        nodeId: "worker-it",
        replayedFileCount: 2,
        replayedPath: "/tmp/entangle/source",
        replayId: "replay-source-history-new",
        sourceHistoryId: "source-history-source-change-turn-new",
        status: "replayed",
        turnId: "turn-new",
        updatedAt: "2026-04-24T00:05:00.000Z"
      })
    ).toBe("2 files replayed");
  });
});
