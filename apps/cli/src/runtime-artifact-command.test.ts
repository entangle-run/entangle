import { describe, expect, it } from "vitest";

import type { ArtifactRecord } from "@entangle/types";

import {
  filterRuntimeArtifactsForCli,
  projectRuntimeArtifactDiffSummary,
  projectRuntimeArtifactHistorySummary,
  projectRuntimeArtifactPreviewSummary,
  projectRuntimeArtifactSummary,
  sortRuntimeArtifactsForCli
} from "./runtime-artifact-command.js";

const artifacts: ArtifactRecord[] = [
  {
    createdAt: "2026-04-24T10:00:00.000Z",
    materialization: {
      localPath: "/tmp/worker-it/report.md"
    },
    publication: {
      publishedAt: "2026-04-24T10:01:00.000Z",
      remoteName: "origin",
      remoteUrl: "ssh://git@example.com/team/worker-it.git",
      state: "published"
    },
    ref: {
      artifactId: "artifact-report",
      artifactKind: "report_file",
      backend: "git",
      locator: {
        branch: "artifact/report",
        commit: "0123456789abcdef",
        namespace: "team",
        path: "reports/report.md",
        repositoryName: "worker-it"
      },
      sessionId: "session-alpha",
      status: "published"
    },
    updatedAt: "2026-04-24T10:02:00.000Z"
  },
  {
    createdAt: "2026-04-24T09:00:00.000Z",
    ref: {
      artifactId: "artifact-summary",
      artifactKind: "knowledge_summary",
      backend: "wiki",
      locator: {
        nodeId: "worker-it",
        path: "memory/wiki/tasks/task.md"
      },
      sessionId: "session-beta",
      status: "materialized"
    },
    retrieval: {
      retrievedAt: "2026-04-24T09:10:00.000Z",
      state: "retrieved"
    },
    updatedAt: "2026-04-24T09:10:00.000Z"
  },
  {
    createdAt: "2026-04-24T08:00:00.000Z",
    publication: {
      lastAttemptAt: "2026-04-24T08:05:00.000Z",
      lastError: "remote unavailable",
      state: "failed"
    },
    ref: {
      artifactId: "artifact-patch",
      artifactKind: "patch",
      backend: "git",
      locator: {
        branch: "artifact/patch",
        commit: "fedcba9876543210",
        path: "patches/fix.patch"
      },
      sessionId: "session-alpha",
      status: "failed"
    },
    updatedAt: "2026-04-24T08:05:00.000Z"
  }
];

describe("runtime-artifact-command", () => {
  it("sorts artifacts from newest to oldest update", () => {
    expect(sortRuntimeArtifactsForCli(artifacts).map((artifact) => artifact.ref.artifactId))
      .toEqual(["artifact-report", "artifact-summary", "artifact-patch"]);
  });

  it("filters artifacts by backend and publication state", () => {
    const filtered = filterRuntimeArtifactsForCli(artifacts, {
      backend: "git",
      publicationState: "published"
    });
    const sessionFiltered = filterRuntimeArtifactsForCli(artifacts, {
      sessionId: "session-alpha"
    });

    expect(filtered.map((artifact) => artifact.ref.artifactId)).toEqual([
      "artifact-report"
    ]);
    expect(sessionFiltered.map((artifact) => artifact.ref.artifactId)).toEqual([
      "artifact-report",
      "artifact-patch"
    ]);
  });

  it("treats missing publication and retrieval metadata as explicit CLI defaults", () => {
    const publicationFiltered = filterRuntimeArtifactsForCli(artifacts, {
      publicationState: "not_requested"
    });
    const retrievalFiltered = filterRuntimeArtifactsForCli(artifacts, {
      retrievalState: "not_retrieved"
    });

    expect(publicationFiltered.map((artifact) => artifact.ref.artifactId)).toEqual([
      "artifact-summary"
    ]);
    expect(retrievalFiltered.map((artifact) => artifact.ref.artifactId)).toEqual([
      "artifact-report",
      "artifact-patch"
    ]);
  });

  it("projects artifacts into compact operator summaries", () => {
    const [artifact] = artifacts;

    expect(artifact).toBeDefined();
    expect(projectRuntimeArtifactSummary(artifact!)).toMatchObject({
      artifactId: "artifact-report",
      backend: "git",
      kind: "report_file",
      label: "artifact-report · git/report_file",
      lifecycleState: "published",
      locator: "worker-it:reports/report.md@0123456789ab",
      publicationState: "published",
      retrievalState: "not_retrieved",
      sessionId: "session-alpha",
      status:
        "Lifecycle published · publication published · retrieval not_retrieved",
      updatedAt: "2026-04-24T10:02:00.000Z"
    });
    expect(projectRuntimeArtifactSummary(artifact!).detailLines).toEqual(
      expect.arrayContaining([
        "published remote ssh://git@example.com/team/worker-it.git"
      ])
    );
  });

  it("projects artifact previews without duplicating full content in summary mode", () => {
    const [artifact] = artifacts;

    expect(artifact).toBeDefined();
    expect(
      projectRuntimeArtifactPreviewSummary({
        artifact: artifact!,
        preview: {
          available: true,
          bytesRead: 42,
          content: "# Report\n\nFull preview content.",
          contentEncoding: "utf8",
          contentType: "text/markdown",
          sourcePath: "/tmp/worker-it/report.md",
          truncated: false
        }
      })
    ).toMatchObject({
      artifact: {
        artifactId: "artifact-report"
      },
      preview: {
        available: true,
        bytesRead: 42,
        contentType: "text/markdown",
        sourcePath: "/tmp/worker-it/report.md",
        truncated: false
      }
    });
  });

  it("projects artifact history without dropping operator context", () => {
    const [artifact] = artifacts;

    expect(artifact).toBeDefined();
    expect(
      projectRuntimeArtifactHistorySummary({
        artifact: artifact!,
        history: {
          available: true,
          commits: [
            {
              abbreviatedCommit: "0123456",
              authorName: "worker-it",
              commit: "0123456789abcdef",
              committedAt: "2026-04-24T10:00:00.000Z",
              subject: "Materialize report artifact"
            }
          ],
          inspectedPath: "reports/report.md",
          truncated: false
        }
      })
    ).toMatchObject({
      artifact: {
        artifactId: "artifact-report"
      },
      history: {
        available: true,
        commits: [
          {
            abbreviatedCommit: "0123456",
            subject: "Materialize report artifact"
          }
        ],
        inspectedPath: "reports/report.md",
        status: "1 commits"
      }
    });
  });

  it("projects artifact diffs without duplicating full diff content in summary mode", () => {
    const [artifact] = artifacts;

    expect(artifact).toBeDefined();
    expect(
      projectRuntimeArtifactDiffSummary({
        artifact: artifact!,
        diff: {
          available: true,
          bytesRead: 42,
          content: "diff --git a/report.md b/report.md\n",
          contentEncoding: "utf8",
          contentType: "text/x-diff",
          fromCommit: "0000000000000000000000000000000000000000",
          toCommit: "0123456789abcdef0123456789abcdef01234567",
          truncated: false
        }
      })
    ).toMatchObject({
      artifact: {
        artifactId: "artifact-report"
      },
      diff: {
        available: true,
        bytesRead: 42,
        contentType: "text/x-diff",
        status: "000000000000..0123456789ab · 42 bytes",
        truncated: false
      }
    });
  });

});
