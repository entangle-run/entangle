import { describe, expect, it } from "vitest";
import {
  buildRuntimeWikiPublicationRequest,
  createEmptyRuntimeWikiPublicationDraft,
  formatRuntimeWikiPublicationRequestSummary
} from "./runtime-wiki-publication.js";

describe("runtime wiki publication Studio helpers", () => {
  it("builds publication requests from optional operator fields", () => {
    expect(
      buildRuntimeWikiPublicationRequest(createEmptyRuntimeWikiPublicationDraft())
    ).toEqual({
      retryFailedPublication: false
    });

    expect(
      buildRuntimeWikiPublicationRequest({
        reason: " publish current wiki snapshot ",
        requestedBy: " operator-main ",
        retryFailedPublication: true,
        targetGitServiceRef: " gitea ",
        targetNamespace: " team-alpha ",
        targetRepositoryName: " wiki-public "
      })
    ).toEqual({
      reason: "publish current wiki snapshot",
      requestedBy: "operator-main",
      retryFailedPublication: true,
      target: {
        gitServiceRef: "gitea",
        namespace: "team-alpha",
        repositoryName: "wiki-public"
      }
    });
  });

  it("formats requested publication summaries", () => {
    expect(
      formatRuntimeWikiPublicationRequestSummary({
        assignmentId: "assignment-alpha",
        commandId: "cmd-wiki-publish-alpha",
        nodeId: "worker-it",
        requestedAt: "2026-04-28T00:00:00.000Z",
        status: "requested"
      })
    ).toBe(
      "Wiki publication requested on assignment-alpha (cmd-wiki-publish-alpha)"
    );
  });
});
