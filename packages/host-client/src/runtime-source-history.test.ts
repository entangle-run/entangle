import { describe, expect, it } from "vitest";
import type { SourceHistoryRecord } from "@entangle/types";
import {
  formatRuntimeSourceHistoryDetailLines,
  formatRuntimeSourceHistoryLabel,
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
    publications: [],
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
      artifactId:
        "source-source-history-source-change-turn-new-gitea-team-alpha-public",
      branch: "worker-it/source-history/source-history-source-change-turn-new",
      publication: {
        publishedAt: "2026-04-24T00:04:00.000Z",
        remoteName: "entangle-gitea",
        remoteUrl: "ssh://git@gitea.example:22/team-alpha/graph-alpha.git",
        state: "published"
      },
      requestedAt: "2026-04-24T00:04:00.000Z",
      targetGitServiceRef: "gitea",
      targetNamespace: "team-alpha",
      targetRepositoryName: "graph-alpha-public"
    },
    publications: [
      {
        artifactId: "source-source-history-source-change-turn-new",
        branch: "worker-it/source-history/source-history-source-change-turn-new",
        publication: {
          publishedAt: "2026-04-24T00:03:30.000Z",
          remoteName: "entangle-gitea",
          remoteUrl: "ssh://git@gitea.example:22/team-alpha/graph-alpha.git",
          state: "published"
        },
        requestedAt: "2026-04-24T00:03:30.000Z",
        targetGitServiceRef: "gitea",
        targetNamespace: "team-alpha",
        targetRepositoryName: "graph-alpha"
      },
      {
        approvalId: "approval-source-publish-new",
        artifactId:
          "source-source-history-source-change-turn-new-gitea-team-alpha-public",
        branch: "worker-it/source-history/source-history-source-change-turn-new",
        publication: {
          publishedAt: "2026-04-24T00:04:00.000Z",
          remoteName: "entangle-gitea",
          remoteUrl:
            "ssh://git@gitea.example:22/team-alpha/graph-alpha-public.git",
          state: "published"
        },
        requestedAt: "2026-04-24T00:04:00.000Z",
        targetGitServiceRef: "gitea",
        targetNamespace: "team-alpha",
        targetRepositoryName: "graph-alpha-public"
      }
    ],
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
      "publication target gitea/team-alpha/graph-alpha-public"
    );
    expect(formatRuntimeSourceHistoryDetailLines(history[1]!)).toContain(
      "publications 2"
    );
    expect(formatRuntimeSourceHistoryDetailLines(history[1]!)).toContain(
      "publication 1 published source-source-history-source-change-turn-new target gitea/team-alpha/graph-alpha"
    );
    expect(formatRuntimeSourceHistoryDetailLines(history[1]!)).toContain(
      "publication 2 published source-source-history-source-change-turn-new-gitea-team-alpha-public target gitea/team-alpha/graph-alpha-public"
    );
    expect(formatRuntimeSourceHistoryDetailLines(history[1]!)).toContain(
      "application approval approval-source-apply-new"
    );
    expect(formatRuntimeSourceHistoryDetailLines(history[1]!)).toContain(
      "publication approval approval-source-publish-new"
    );
  });
});
