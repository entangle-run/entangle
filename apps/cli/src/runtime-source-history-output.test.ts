import { describe, expect, it } from "vitest";
import type { SourceHistoryRecord } from "@entangle/types";
import {
  projectRuntimeSourceHistoryReplaySummary,
  projectRuntimeSourceHistorySummary
} from "./runtime-source-history-output.js";

const entry: SourceHistoryRecord = {
  appliedAt: "2026-04-24T00:03:00.000Z",
  appliedBy: "operator-alpha",
  applicationApprovalId: "approval-source-apply-alpha",
  baseTree: "base-tree-alpha",
  branch: "entangle-source-history",
  candidateId: "source-change-turn-alpha",
  commit: "commit-alpha",
  graphId: "team-alpha",
  graphRevisionId: "team-alpha-20260424-000000",
  headTree: "head-tree-alpha",
  mode: "already_in_workspace",
  nodeId: "worker-it",
  publication: {
    approvalId: "approval-source-publish-alpha",
    artifactId: "source-source-history-source-change-turn-alpha",
    branch: "worker-it/source-history/source-history-source-change-turn-alpha",
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
    checkedAt: "2026-04-24T00:01:00.000Z",
    deletions: 1,
    fileCount: 1,
    files: [],
    status: "changed",
    truncated: false
  },
  sourceHistoryId: "source-history-source-change-turn-alpha",
  turnId: "turn-alpha",
  updatedAt: "2026-04-24T00:03:00.000Z"
};

describe("runtime source history CLI output", () => {
  it("projects compact source history summaries", () => {
    expect(projectRuntimeSourceHistorySummary(entry)).toMatchObject({
      candidateId: "source-change-turn-alpha",
      label: "source-history-source-change-turn-alpha · already_in_workspace",
      applicationApprovalId: "approval-source-apply-alpha",
      mode: "already_in_workspace",
      publicationApprovalId: "approval-source-publish-alpha",
      publicationTarget: "local-gitea/team-alpha/graph-alpha",
      publicationState: "published",
      publishedArtifactId: "source-source-history-source-change-turn-alpha",
      sourceHistoryId: "source-history-source-change-turn-alpha"
    });
    expect(projectRuntimeSourceHistorySummary(entry).detailLines).toContain(
      "commit commit-alpha"
    );
  });

  it("projects compact source history replay summaries", () => {
    expect(
      projectRuntimeSourceHistoryReplaySummary({
        baseTree: "base-tree-alpha",
        candidateId: "source-change-turn-alpha",
        commit: "commit-alpha",
        createdAt: "2026-04-24T10:04:00.000Z",
        graphId: "team-alpha",
        graphRevisionId: "team-alpha-20260424-000000",
        headTree: "head-tree-alpha",
        nodeId: "worker-it",
        replayedFileCount: 2,
        replayedPath: "/tmp/entangle/source",
        replayId: "replay-source-history-alpha",
        sourceHistoryId: "source-history-source-change-turn-alpha",
        status: "replayed",
        turnId: "turn-alpha",
        updatedAt: "2026-04-24T10:04:00.000Z"
      })
    ).toMatchObject({
      candidateId: "source-change-turn-alpha",
      replayId: "replay-source-history-alpha",
      sourceHistoryId: "source-history-source-change-turn-alpha",
      status: "2 files replayed"
    });
  });
});
