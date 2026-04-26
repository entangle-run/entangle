import { describe, expect, it } from "vitest";
import type {
  ArtifactRecord,
  RuntimeArtifactDiffResponse,
  RuntimeArtifactHistoryResponse,
  RuntimeArtifactRestoreResponse
} from "@entangle/types";
import {
  filterRuntimeArtifactsForPresentation,
  formatRuntimeArtifactDetailLines,
  formatRuntimeArtifactDiffStatus,
  formatRuntimeArtifactHistoryLines,
  formatRuntimeArtifactHistoryStatus,
  formatRuntimeArtifactLabel,
  formatRuntimeArtifactLocator,
  formatRuntimeArtifactRestoreStatus,
  formatRuntimeArtifactStatus,
  sortRuntimeArtifactsForPresentation
} from "./runtime-artifact.js";

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

describe("runtime artifact presentation helpers", () => {
  it("sorts artifacts from newest to oldest update", () => {
    expect(
      sortRuntimeArtifactsForPresentation(artifacts).map(
        (artifact) => artifact.ref.artifactId
      )
    ).toEqual(["artifact-report", "artifact-summary", "artifact-patch"]);
  });

  it("filters artifacts by backend, publication, and retrieval state", () => {
    const filtered = filterRuntimeArtifactsForPresentation(artifacts, {
      backend: "git",
      publicationState: "published"
    });
    const sessionFiltered = filterRuntimeArtifactsForPresentation(artifacts, {
      sessionId: "session-alpha"
    });
    const publicationFiltered = filterRuntimeArtifactsForPresentation(artifacts, {
      publicationState: "not_requested"
    });
    const retrievalFiltered = filterRuntimeArtifactsForPresentation(artifacts, {
      retrievalState: "not_retrieved"
    });

    expect(filtered.map((artifact) => artifact.ref.artifactId)).toEqual([
      "artifact-report"
    ]);
    expect(sessionFiltered.map((artifact) => artifact.ref.artifactId)).toEqual([
      "artifact-report",
      "artifact-patch"
    ]);
    expect(publicationFiltered.map((artifact) => artifact.ref.artifactId)).toEqual([
      "artifact-summary"
    ]);
    expect(retrievalFiltered.map((artifact) => artifact.ref.artifactId)).toEqual([
      "artifact-report",
      "artifact-patch"
    ]);
  });

  it("formats artifact labels, status, locators, and detail lines", () => {
    const [artifact] = artifacts;

    expect(artifact).toBeDefined();
    expect(formatRuntimeArtifactLabel(artifact!)).toBe(
      "artifact-report · git/report_file"
    );
    expect(formatRuntimeArtifactStatus(artifact!)).toContain(
      "publication published"
    );
    expect(formatRuntimeArtifactLocator(artifact!)).toContain(
      "worker-it:reports/report.md"
    );
    expect(formatRuntimeArtifactDetailLines(artifact!)).toEqual(
      expect.arrayContaining([
        "created 2026-04-24T10:00:00.000Z",
        "updated 2026-04-24T10:02:00.000Z",
        "publication published",
        "published remote ssh://git@example.com/team/worker-it.git"
      ])
    );
  });

  it("formats artifact history and diff inspection summaries", () => {
    const history: RuntimeArtifactHistoryResponse["history"] = {
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
    };
    const diff: RuntimeArtifactDiffResponse["diff"] = {
      available: true,
      bytesRead: 42,
      content: "diff --git a/report.md b/report.md\n",
      contentEncoding: "utf8",
      contentType: "text/x-diff",
      fromCommit: "0000000000000000000000000000000000000000",
      toCommit: "0123456789abcdef0123456789abcdef01234567",
      truncated: false
    };

    expect(formatRuntimeArtifactHistoryStatus(history)).toBe("1 commits");
    expect(formatRuntimeArtifactHistoryLines(history)).toEqual([
      "0123456 · 2026-04-24T10:00:00.000Z · worker-it · Materialize report artifact"
    ]);
    expect(formatRuntimeArtifactDiffStatus(diff)).toBe(
      "000000000000..0123456789ab · 42 bytes"
    );
  });

  it("formats artifact restore summaries", () => {
    const restore: RuntimeArtifactRestoreResponse["restore"] = {
      artifactId: "artifact-report",
      createdAt: "2026-04-24T10:03:00.000Z",
      mode: "restore_workspace",
      nodeId: "worker-it",
      restoreId: "restore-artifact-report",
      restoredFileCount: 1,
      restoredPath: "/tmp/worker-it/restores/restore-artifact-report",
      source: {
        backend: "git",
        commit: "0123456789abcdef",
        path: "reports/report.md"
      },
      status: "restored",
      updatedAt: "2026-04-24T10:03:00.000Z"
    };

    expect(formatRuntimeArtifactRestoreStatus(restore)).toBe("1 file restored");
    expect(
      formatRuntimeArtifactRestoreStatus({
        ...restore,
        restoredFileCount: undefined,
        restoredPath: undefined,
        status: "unavailable",
        unavailableReason: "missing git repository"
      })
    ).toBe("unavailable");
  });
});
