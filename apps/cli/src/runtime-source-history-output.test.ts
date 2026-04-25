import { describe, expect, it } from "vitest";
import type { SourceHistoryRecord } from "@entangle/types";
import { projectRuntimeSourceHistorySummary } from "./runtime-source-history-output.js";

const entry: SourceHistoryRecord = {
  appliedAt: "2026-04-24T00:03:00.000Z",
  appliedBy: "operator-alpha",
  baseTree: "base-tree-alpha",
  branch: "entangle-source-history",
  candidateId: "source-change-turn-alpha",
  commit: "commit-alpha",
  graphId: "team-alpha",
  graphRevisionId: "team-alpha-20260424-000000",
  headTree: "head-tree-alpha",
  mode: "already_in_workspace",
  nodeId: "worker-it",
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
      mode: "already_in_workspace",
      sourceHistoryId: "source-history-source-change-turn-alpha"
    });
    expect(projectRuntimeSourceHistorySummary(entry).detailLines).toContain(
      "commit commit-alpha"
    );
  });
});
