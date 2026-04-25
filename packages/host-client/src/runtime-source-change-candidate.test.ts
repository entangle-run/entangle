import { describe, expect, it } from "vitest";
import type { SourceChangeCandidateRecord } from "@entangle/types";
import {
  filterRuntimeSourceChangeCandidatesForPresentation,
  formatRuntimeSourceChangeCandidateDetailLines,
  formatRuntimeSourceChangeCandidateDiffStatus,
  formatRuntimeSourceChangeCandidateFilePreviewStatus,
  formatRuntimeSourceChangeCandidateLabel,
  formatRuntimeSourceChangeCandidateStatus,
  sortRuntimeSourceChangeCandidatesForPresentation
} from "./runtime-source-change-candidate.js";

const candidates: SourceChangeCandidateRecord[] = [
  {
    candidateId: "source-change-turn-old",
    createdAt: "2026-04-24T10:00:00.000Z",
    graphId: "team-alpha",
    nodeId: "worker-it",
    sessionId: "session-alpha",
    sourceChangeSummary: {
      additions: 1,
      checkedAt: "2026-04-24T10:00:00.000Z",
      deletions: 0,
      fileCount: 1,
      files: [
        {
          additions: 1,
          deletions: 0,
          path: "src/old.ts",
          status: "added"
        }
      ],
      status: "changed",
      truncated: false
    },
    status: "pending_review",
    turnId: "turn-old",
    updatedAt: "2026-04-24T10:00:00.000Z"
  },
  {
    candidateId: "source-change-turn-new",
    conversationId: "conv-alpha",
    createdAt: "2026-04-24T11:00:00.000Z",
    graphId: "team-alpha",
    nodeId: "worker-it",
    sessionId: "session-beta",
    snapshot: {
      baseTree: "base-tree",
      headTree: "head-tree",
      kind: "shadow_git_tree"
    },
    sourceChangeSummary: {
      additions: 5,
      checkedAt: "2026-04-24T11:00:00.000Z",
      deletions: 2,
      diffExcerpt: "diff --git a/src/new.ts b/src/new.ts",
      fileCount: 2,
      files: [
        {
          additions: 3,
          deletions: 1,
          path: "src/new.ts",
          status: "modified"
        }
      ],
      status: "changed",
      truncated: false
    },
    status: "accepted",
    turnId: "turn-new",
    updatedAt: "2026-04-24T11:00:00.000Z"
  }
];

describe("runtime source change candidate presentation helpers", () => {
  it("sorts candidates by latest update first", () => {
    expect(
      sortRuntimeSourceChangeCandidatesForPresentation(candidates).map(
        (candidate) => candidate.candidateId
      )
    ).toEqual(["source-change-turn-new", "source-change-turn-old"]);
  });

  it("filters candidates by status, session, and turn", () => {
    expect(
      filterRuntimeSourceChangeCandidatesForPresentation(candidates, {
        status: "pending_review"
      }).map((candidate) => candidate.candidateId)
    ).toEqual(["source-change-turn-old"]);
    expect(
      filterRuntimeSourceChangeCandidatesForPresentation(candidates, {
        sessionId: "session-beta",
        turnId: "turn-new"
      }).map((candidate) => candidate.candidateId)
    ).toEqual(["source-change-turn-new"]);
  });

  it("formats labels, status, and detail lines", () => {
    const candidate = candidates[1]!;

    expect(formatRuntimeSourceChangeCandidateLabel(candidate)).toBe(
      "source-change-turn-new · accepted"
    );
    expect(formatRuntimeSourceChangeCandidateStatus(candidate)).toBe(
      "Turn turn-new · 2 files (+5/-2) · session session-beta"
    );
    expect(formatRuntimeSourceChangeCandidateDetailLines(candidate)).toEqual(
      expect.arrayContaining([
        "turn turn-new",
        "status accepted",
        "session session-beta",
        "conversation conv-alpha",
        "snapshot shadow_git_tree base-tree..head-tree",
        "source file modified src/new.ts (+3/-1)",
        "diff excerpt available"
      ])
    );
  });

  it("formats source candidate diff status", () => {
    expect(
      formatRuntimeSourceChangeCandidateDiffStatus({
        candidate: candidates[1]!,
        diff: {
          available: true,
          bytesRead: 128,
          content: "diff --git a/src/new.ts b/src/new.ts\n",
          contentEncoding: "utf8",
          contentType: "text/x-diff",
          truncated: true
        }
      })
    ).toBe("text/x-diff · 128 bytes · truncated");
    expect(
      formatRuntimeSourceChangeCandidateDiffStatus({
        candidate: candidates[0]!,
        diff: {
          available: false,
          reason:
            "Source change candidate diff is unavailable because the candidate has no snapshot."
        }
      })
    ).toBe(
      "Source change candidate diff is unavailable because the candidate has no snapshot."
    );
  });

  it("formats source candidate file preview status", () => {
    expect(
      formatRuntimeSourceChangeCandidateFilePreviewStatus({
        candidate: candidates[1]!,
        path: "src/new.ts",
        preview: {
          available: true,
          bytesRead: 42,
          content: "export const value = true;\n",
          contentEncoding: "utf8",
          contentType: "text/plain",
          truncated: true
        }
      })
    ).toBe("text/plain · 42 bytes · truncated");
    expect(
      formatRuntimeSourceChangeCandidateFilePreviewStatus({
        candidate: candidates[0]!,
        path: "src/old.ts",
        preview: {
          available: false,
          reason: "Source change candidate file preview is unavailable."
        }
      })
    ).toBe("Source change candidate file preview is unavailable.");
  });
});
