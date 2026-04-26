import { describe, expect, it } from "vitest";
import { projectRuntimeWikiRepositoryPublicationSummary } from "./runtime-wiki-repository-output.js";

describe("runtime wiki repository CLI output", () => {
  it("projects publication summaries", () => {
    expect(
      projectRuntimeWikiRepositoryPublicationSummary({
        artifactId: "wiki-repository-worker-it-wiki-commit",
        branch: "worker-it/wiki-repository/entangle-wiki",
        commit: "wiki-commit-alpha",
        createdAt: "2026-04-24T00:00:00.000Z",
        graphId: "team-alpha",
        graphRevisionId: "team-alpha-20260424-000000",
        nodeId: "worker-it",
        publication: {
          publishedAt: "2026-04-24T00:00:01.000Z",
          remoteName: "entangle-local-gitea",
          remoteUrl: "ssh://git@gitea:22/team-alpha/team-alpha.git",
          state: "published"
        },
        publicationId: "wiki-publication-alpha",
        targetGitServiceRef: "local-gitea",
        targetNamespace: "team-alpha",
        targetRepositoryName: "team-alpha",
        updatedAt: "2026-04-24T00:00:01.000Z"
      })
    ).toEqual({
      artifactId: "wiki-repository-worker-it-wiki-commit",
      branch: "worker-it/wiki-repository/entangle-wiki",
      commit: "wiki-commit-alpha",
      createdAt: "2026-04-24T00:00:00.000Z",
      nodeId: "worker-it",
      publicationId: "wiki-publication-alpha",
      status: "published to local-gitea/team-alpha/team-alpha",
      targetGitServiceRef: "local-gitea",
      targetNamespace: "team-alpha",
      targetRepositoryName: "team-alpha",
      updatedAt: "2026-04-24T00:00:01.000Z"
    });
  });
});
