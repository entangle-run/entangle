import { describe, expect, it } from "vitest";
import type { SourceHistoryRecord } from "@entangle/types";
import {
  buildRuntimeSourceHistoryPublicationRequest,
  buildRuntimeSourceHistoryReplayRequest,
  createEmptyRuntimeSourceHistoryPublicationDraft,
  createEmptyRuntimeSourceHistoryReplayDraft,
  formatRuntimeSourceHistoryPublicationRequestSummary,
  formatRuntimeSourceHistoryReplayRequestSummary,
  formatRuntimeSourceHistoryDetailLines,
  formatRuntimeSourceHistoryLabel,
  sortRuntimeSourceHistory
} from "./runtime-source-history-inspection.js";

const entries: SourceHistoryRecord[] = [
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
      filePreviews: [],
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
        remoteName: "entangle-gitea",
        remoteUrl: "ssh://git@gitea.example:22/team-alpha/graph-alpha.git",
        state: "published"
      },
      requestedAt: "2026-04-24T00:04:00.000Z",
      targetGitServiceRef: "gitea",
      targetNamespace: "team-alpha",
      targetRepositoryName: "graph-alpha"
    },
    sourceChangeSummary: {
      additions: 2,
      checkedAt: "2026-04-24T00:02:00.000Z",
      deletions: 1,
      fileCount: 2,
      filePreviews: [],
      files: [],
      status: "changed",
      truncated: false
    },
    sourceHistoryId: "source-history-source-change-turn-new",
    turnId: "turn-new",
    updatedAt: "2026-04-24T00:03:00.000Z"
  }
];

describe("runtime source history Studio helpers", () => {
  it("sorts and formats source history entries", () => {
    expect(sortRuntimeSourceHistory(entries)[0]?.sourceHistoryId).toBe(
      "source-history-source-change-turn-new"
    );
    expect(formatRuntimeSourceHistoryLabel(entries[1]!)).toBe(
      "source-history-source-change-turn-new · already_in_workspace"
    );
    expect(formatRuntimeSourceHistoryDetailLines(entries[1]!)).toContain(
      "commit commit-new"
    );
    expect(formatRuntimeSourceHistoryDetailLines(entries[1]!)).toContain(
      "artifact source-source-history-source-change-turn-new"
    );
    expect(formatRuntimeSourceHistoryDetailLines(entries[1]!)).toContain(
      "publication target gitea/team-alpha/graph-alpha"
    );
    expect(formatRuntimeSourceHistoryDetailLines(entries[1]!)).toContain(
      "publication approval approval-source-publish-new"
    );
  });

  it("builds publication requests from optional target and approval fields", () => {
    expect(
      buildRuntimeSourceHistoryPublicationRequest(
        createEmptyRuntimeSourceHistoryPublicationDraft()
      )
    ).toEqual({
      retryFailedPublication: false
    });

    expect(
      buildRuntimeSourceHistoryPublicationRequest({
        approvalId: " approval-source-publication ",
        reason: " publish source history ",
        requestedBy: " operator-it ",
        retryFailedPublication: true,
        targetGitServiceRef: " gitea ",
        targetNamespace: " team-alpha ",
        targetRepositoryName: " graph-alpha-public "
      })
    ).toEqual({
      approvalId: "approval-source-publication",
      reason: "publish source history",
      requestedBy: "operator-it",
      retryFailedPublication: true,
      target: {
        gitServiceRef: "gitea",
        namespace: "team-alpha",
        repositoryName: "graph-alpha-public"
      }
    });

    expect(
      formatRuntimeSourceHistoryPublicationRequestSummary({
        assignmentId: "assignment-alpha",
        commandId: "cmd-source-history-publish-alpha",
        nodeId: "worker-it",
        requestedAt: "2026-04-28T00:00:00.000Z",
        sourceHistoryId: "source-history-alpha",
        status: "requested"
      })
    ).toBe(
      "source-history-alpha publication requested on assignment-alpha (cmd-source-history-publish-alpha)"
    );
  });

  it("builds replay requests from optional operator fields", () => {
    expect(
      buildRuntimeSourceHistoryReplayRequest(
        createEmptyRuntimeSourceHistoryReplayDraft()
      )
    ).toEqual({});

    expect(
      buildRuntimeSourceHistoryReplayRequest({
        approvalId: " approval-source-application ",
        reason: " restore accepted source ",
        replayId: " replay-alpha ",
        replayedBy: " operator-it "
      })
    ).toEqual({
      approvalId: "approval-source-application",
      reason: "restore accepted source",
      replayId: "replay-alpha",
      replayedBy: "operator-it"
    });

    expect(
      formatRuntimeSourceHistoryReplayRequestSummary({
        assignmentId: "assignment-alpha",
        commandId: "cmd-source-history-replay-alpha",
        nodeId: "worker-it",
        requestedAt: "2026-04-28T00:00:00.000Z",
        sourceHistoryId: "source-history-alpha",
        status: "requested"
      })
    ).toBe(
      "source-history-alpha requested on assignment-alpha (cmd-source-history-replay-alpha)"
    );
  });
});
