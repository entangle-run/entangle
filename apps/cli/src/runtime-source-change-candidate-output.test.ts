import { describe, expect, it } from "vitest";
import type { SourceChangeCandidateRecord } from "@entangle/types";
import {
  filterRuntimeSourceChangeCandidatesForCli,
  projectRuntimeSourceChangeCandidateDiffSummary,
  projectRuntimeSourceChangeCandidateFilePreviewSummary,
  projectRuntimeSourceChangeCandidateSummary,
  sortRuntimeSourceChangeCandidatesForCli
} from "./runtime-source-change-candidate-output.js";

const candidates: SourceChangeCandidateRecord[] = [
  {
    candidateId: "source-change-turn-old",
    createdAt: "2026-04-24T10:00:00.000Z",
    graphId: "team-alpha",
    nodeId: "worker-it",
    review: {
      decidedAt: "2026-04-24T10:05:00.000Z",
      decision: "rejected",
      reason: "Not wanted."
    },
    sourceChangeSummary: {
      additions: 1,
      checkedAt: "2026-04-24T10:00:00.000Z",
      deletions: 0,
      fileCount: 1,
      files: [],
      status: "changed",
      truncated: false
    },
    status: "rejected",
    turnId: "turn-old",
    updatedAt: "2026-04-24T10:00:00.000Z"
  },
  {
    candidateId: "source-change-turn-new",
    createdAt: "2026-04-24T11:00:00.000Z",
    graphId: "team-alpha",
    nodeId: "worker-it",
    sessionId: "session-alpha",
    sourceChangeSummary: {
      additions: 4,
      checkedAt: "2026-04-24T11:00:00.000Z",
      deletions: 1,
      fileCount: 2,
      files: [],
      status: "changed",
      truncated: false
    },
    status: "pending_review",
    turnId: "turn-new",
    updatedAt: "2026-04-24T11:00:00.000Z"
  }
];

describe("runtime source change candidate CLI output", () => {
  it("sorts and filters source change candidates", () => {
    expect(
      sortRuntimeSourceChangeCandidatesForCli(candidates).map(
        (candidate) => candidate.candidateId
      )
    ).toEqual(["source-change-turn-new", "source-change-turn-old"]);
    expect(
      filterRuntimeSourceChangeCandidatesForCli(candidates, {
        status: "pending_review"
      }).map((candidate) => candidate.candidateId)
    ).toEqual(["source-change-turn-new"]);
  });

  it("projects candidates into compact operator summaries", () => {
    const summary = projectRuntimeSourceChangeCandidateSummary(candidates[1]!);

    expect(summary).toMatchObject({
      candidateId: "source-change-turn-new",
      label: "source-change-turn-new · pending_review",
      sessionId: "session-alpha",
      status: "pending_review",
      summary: "Turn turn-new · 2 files (+4/-1) · session session-alpha",
      turnId: "turn-new"
    });
    expect(summary.detailLines).toContain("source changes 2 files (+4/-1)");
    expect(projectRuntimeSourceChangeCandidateSummary(candidates[0]!).detailLines).toContain(
      "review rejected at 2026-04-24T10:05:00.000Z"
    );
  });

  it("projects source candidate diff previews without duplicating full content", () => {
    expect(
      projectRuntimeSourceChangeCandidateDiffSummary({
        candidate: candidates[1]!,
        diff: {
          available: true,
          bytesRead: 96,
          content: "diff --git a/src/index.ts b/src/index.ts\n",
          contentEncoding: "utf8",
          contentType: "text/x-diff",
          truncated: false
        }
      })
    ).toEqual({
      available: true,
      candidateId: "source-change-turn-new",
      contentType: "text/x-diff",
      previewBytes: 96,
      status: "text/x-diff · 96 bytes",
      truncated: false
    });
  });

  it("projects source candidate file previews without duplicating full content", () => {
    expect(
      projectRuntimeSourceChangeCandidateFilePreviewSummary({
        candidate: candidates[1]!,
        path: "src/index.ts",
        preview: {
          available: true,
          bytesRead: 64,
          content: "export const value = true;\n",
          contentEncoding: "utf8",
          contentType: "text/plain",
          truncated: false
        }
      })
    ).toEqual({
      available: true,
      candidateId: "source-change-turn-new",
      contentType: "text/plain",
      path: "src/index.ts",
      previewBytes: 64,
      status: "text/plain · 64 bytes",
      truncated: false
    });
  });
});
