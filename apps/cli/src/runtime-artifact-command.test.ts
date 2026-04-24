import { describe, expect, it } from "vitest";

import type { ArtifactRecord } from "@entangle/types";

import {
  filterRuntimeArtifactsForCli,
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

    expect(filtered.map((artifact) => artifact.ref.artifactId)).toEqual([
      "artifact-report"
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
});
