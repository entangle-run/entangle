import { describe, expect, it } from "vitest";
import type {
  ArtifactRecord,
  RuntimeArtifactDiffResponse,
  RuntimeArtifactHistoryResponse
} from "@entangle/types";
import {
  formatRuntimeArtifactDetailLines,
  formatRuntimeArtifactDiffStatus,
  formatRuntimeArtifactHistoryLines,
  formatRuntimeArtifactHistoryStatus,
  formatRuntimeArtifactLabel,
  formatRuntimeArtifactLocator,
  formatRuntimeArtifactStatus,
  sortRuntimeArtifacts
} from "./runtime-artifact-inspection.js";

function createArtifact(
  artifactId: string,
  updatedAt: string
): ArtifactRecord {
  return {
    createdAt: updatedAt,
    publication: {
      publishedAt: updatedAt,
      remoteName: "origin",
      remoteUrl: "ssh://git@example.com/team-alpha/worker-it.git",
      state: "published"
    },
    ref: {
      artifactId,
      artifactKind: "report_file",
      backend: "git",
      locator: {
        branch: "artifact/session-alpha",
        commit: "1234567890abcdef1234567890abcdef12345678",
        gitServiceRef: "gitea-primary",
        namespace: "team-alpha",
        path: `artifacts/${artifactId}.md`,
        repositoryName: "worker-it"
      },
      preferred: true,
      status: "published"
    },
    updatedAt
  };
}

describe("studio runtime artifact inspection helpers", () => {
  it("sorts runtime artifacts by most recent update first", () => {
    const older = createArtifact("artifact-older", "2026-04-24T10:00:00.000Z");
    const newer = createArtifact("artifact-newer", "2026-04-24T11:00:00.000Z");

    expect(sortRuntimeArtifacts([older, newer]).map((artifact) => artifact.ref.artifactId)).toEqual([
      "artifact-newer",
      "artifact-older"
    ]);
  });

  it("formats artifact labels, status, and locator summaries", () => {
    const artifact = createArtifact("artifact-report", "2026-04-24T11:00:00.000Z");

    expect(formatRuntimeArtifactLabel(artifact)).toBe(
      "artifact-report · git/report_file"
    );
    expect(formatRuntimeArtifactStatus(artifact)).toContain("publication published");
    expect(formatRuntimeArtifactLocator(artifact)).toContain("worker-it:artifacts/artifact-report.md");
    expect(formatRuntimeArtifactDetailLines(artifact)).toEqual(
      expect.arrayContaining([
        "created 2026-04-24T11:00:00.000Z",
        "updated 2026-04-24T11:00:00.000Z",
        "publication published",
        "published remote ssh://git@example.com/team-alpha/worker-it.git"
      ])
    );
  });

  it("formats artifact history and diff inspection states", () => {
    const history: RuntimeArtifactHistoryResponse["history"] = {
      available: true,
      commits: [
        {
          abbreviatedCommit: "1234567",
          authorName: "worker-it",
          commit: "1234567890abcdef1234567890abcdef12345678",
          committedAt: "2026-04-24T11:00:00.000Z",
          subject: "Publish artifact"
        }
      ],
      inspectedPath: "artifacts/artifact-report.md",
      truncated: false
    };
    const diff: RuntimeArtifactDiffResponse["diff"] = {
      available: true,
      bytesRead: 31,
      content: "diff --git a/report.md b/report.md\n",
      contentEncoding: "utf8",
      contentType: "text/x-diff",
      fromCommit: "0000000000000000000000000000000000000000",
      toCommit: "1234567890abcdef1234567890abcdef12345678",
      truncated: false
    };

    expect(formatRuntimeArtifactHistoryStatus(history)).toBe("1 commits");
    expect(formatRuntimeArtifactHistoryLines(history)).toEqual([
      "1234567 · 2026-04-24T11:00:00.000Z · worker-it · Publish artifact"
    ]);
    expect(formatRuntimeArtifactDiffStatus(diff)).toBe(
      "000000000000..1234567890ab · 31 bytes"
    );
  });
});
