import { describe, expect, it } from "vitest";
import type { SourceChangeCandidateRecord } from "@entangle/types";
import {
  filterRuntimeSourceChangeCandidates,
  formatRuntimeSourceChangeCandidateDetailLines,
  formatRuntimeSourceChangeCandidateDiffStatus,
  formatRuntimeSourceChangeCandidateLabel,
  formatRuntimeSourceChangeCandidateStatus,
  sortRuntimeSourceChangeCandidates
} from "./runtime-source-change-candidate-inspection.js";

const candidates: SourceChangeCandidateRecord[] = [
  {
    candidateId: "source-change-turn-older",
    createdAt: "2026-04-24T10:00:00.000Z",
    graphId: "team-alpha",
    nodeId: "worker-it",
    sessionId: "session-alpha",
    sourceChangeSummary: {
      additions: 1,
      checkedAt: "2026-04-24T10:00:00.000Z",
      deletions: 0,
      fileCount: 1,
      files: [],
      status: "changed",
      truncated: false
    },
    status: "accepted",
    turnId: "turn-older",
    updatedAt: "2026-04-24T10:00:00.000Z"
  },
  {
    candidateId: "source-change-turn-newer",
    conversationId: "conversation-alpha",
    createdAt: "2026-04-24T11:00:00.000Z",
    graphId: "team-alpha",
    nodeId: "worker-it",
    sessionId: "session-beta",
    snapshot: {
      baseTree: "base-tree-alpha",
      headTree: "head-tree-alpha",
      kind: "shadow_git_tree"
    },
    sourceChangeSummary: {
      additions: 4,
      checkedAt: "2026-04-24T11:00:00.000Z",
      deletions: 2,
      fileCount: 1,
      files: [
        {
          additions: 4,
          deletions: 2,
          path: "src/index.ts",
          status: "modified"
        }
      ],
      status: "changed",
      truncated: false
    },
    status: "pending_review",
    turnId: "turn-newer",
    updatedAt: "2026-04-24T11:00:00.000Z"
  }
];

describe("studio source change candidate inspection helpers", () => {
  it("sorts and filters source change candidates for visual inspection", () => {
    expect(
      sortRuntimeSourceChangeCandidates(candidates).map(
        (candidate) => candidate.candidateId
      )
    ).toEqual(["source-change-turn-newer", "source-change-turn-older"]);
    expect(
      filterRuntimeSourceChangeCandidates(candidates, {
        status: "pending_review"
      }).map((candidate) => candidate.candidateId)
    ).toEqual(["source-change-turn-newer"]);
  });

  it("formats source change candidates for Studio detail panels", () => {
    const candidate = candidates[1]!;

    expect(formatRuntimeSourceChangeCandidateLabel(candidate)).toBe(
      "source-change-turn-newer · pending_review"
    );
    expect(formatRuntimeSourceChangeCandidateStatus(candidate)).toBe(
      "Turn turn-newer · 1 file (+4/-2) · session session-beta"
    );
    expect(formatRuntimeSourceChangeCandidateDetailLines(candidate)).toContain(
      "source file modified src/index.ts (+4/-2)"
    );
    expect(
      formatRuntimeSourceChangeCandidateDiffStatus({
        candidate,
        diff: {
          available: true,
          bytesRead: 128,
          content: "diff --git a/src/index.ts b/src/index.ts\n",
          contentEncoding: "utf8",
          contentType: "text/x-diff",
          truncated: false
        }
      })
    ).toBe("text/x-diff · 128 bytes");
  });
});
