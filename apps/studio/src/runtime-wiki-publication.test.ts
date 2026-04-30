import { describe, expect, it } from "vitest";
import {
  buildRuntimeWikiPageUpsertRequest,
  buildRuntimeWikiPublicationRequest,
  createEmptyRuntimeWikiPageUpsertDraft,
  createEmptyRuntimeWikiPublicationDraft,
  formatRuntimeWikiPageUpsertRequestSummary,
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

  it("builds page upsert requests from operator fields", () => {
    expect(
      buildRuntimeWikiPageUpsertRequest({
        ...createEmptyRuntimeWikiPageUpsertDraft(),
        content: "# Note\n",
        path: " operator/notes.md "
      })
    ).toEqual({
      content: "# Note\n",
      mode: "replace",
      path: "operator/notes.md"
    });

    expect(
      buildRuntimeWikiPageUpsertRequest({
        content: "Append this.\n",
        mode: "append",
        path: " operator/notes.md ",
        reason: " update durable note ",
        requestedBy: " operator-main "
      })
    ).toEqual({
      content: "Append this.\n",
      mode: "append",
      path: "operator/notes.md",
      reason: "update durable note",
      requestedBy: "operator-main"
    });
  });

  it("formats requested page upsert summaries", () => {
    expect(
      formatRuntimeWikiPageUpsertRequestSummary({
        assignmentId: "assignment-alpha",
        commandId: "cmd-wiki-upsert-page-alpha",
        mode: "append",
        nodeId: "worker-it",
        path: "operator/notes.md",
        requestedAt: "2026-04-29T00:00:00.000Z",
        status: "requested"
      })
    ).toBe(
      "Wiki page operator/notes.md requested on assignment-alpha (cmd-wiki-upsert-page-alpha)"
    );
  });
});
