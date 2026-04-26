import { describe, expect, it } from "vitest";
import {
  formatRuntimeWikiRepositoryPublicationStatus,
  sortRuntimeWikiRepositoryPublicationsForPresentation
} from "./runtime-wiki-repository.js";

describe("runtime wiki repository presentation", () => {
  it("formats publication states", () => {
    expect(
      formatRuntimeWikiRepositoryPublicationStatus({
        artifactId: "wiki-repository-worker-it-commit",
        branch: "worker-it/wiki-repository/entangle-wiki",
        commit: "wiki-commit-alpha",
        createdAt: "2026-04-24T00:00:00.000Z",
        graphId: "team-alpha",
        graphRevisionId: "team-alpha-20260424-000000",
        nodeId: "worker-it",
        publication: {
          publishedAt: "2026-04-24T00:00:01.000Z",
          remoteName: "entangle-gitea",
          remoteUrl: "ssh://git@gitea:22/team-alpha/team-alpha.git",
          state: "published"
        },
        publicationId: "wiki-publication-alpha",
        targetGitServiceRef: "gitea",
        targetNamespace: "team-alpha",
        targetRepositoryName: "team-alpha",
        updatedAt: "2026-04-24T00:00:01.000Z"
      })
    ).toBe("published to gitea/team-alpha/team-alpha");
  });

  it("sorts publications newest first", () => {
    const older = {
      artifactId: "wiki-repository-worker-it-older",
      branch: "worker-it/wiki-repository/entangle-wiki",
      commit: "older",
      createdAt: "2026-04-24T00:00:00.000Z",
      graphId: "team-alpha",
      graphRevisionId: "team-alpha-20260424-000000",
      nodeId: "worker-it",
      publication: {
        state: "published"
      },
      publicationId: "wiki-publication-older",
      updatedAt: "2026-04-24T00:00:00.000Z"
    } as const;
    const newer = {
      ...older,
      artifactId: "wiki-repository-worker-it-newer",
      commit: "newer",
      publicationId: "wiki-publication-newer",
      updatedAt: "2026-04-24T00:00:02.000Z"
    } as const;

    expect(
      sortRuntimeWikiRepositoryPublicationsForPresentation([older, newer]).map(
        (publication) => publication.publicationId
      )
    ).toEqual(["wiki-publication-newer", "wiki-publication-older"]);
  });
});
