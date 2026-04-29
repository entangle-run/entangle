import { describe, expect, it } from "vitest";
import {
  buildRuntimeArtifactRestoreRequest,
  buildRuntimeArtifactSourceChangeProposalRequest,
  createEmptyRuntimeArtifactRestoreDraft,
  createEmptyRuntimeArtifactSourceChangeProposalDraft,
  formatRuntimeArtifactRestoreRequestSummary,
  formatRuntimeArtifactSourceChangeProposalRequestSummary
} from "./runtime-artifact-restore.js";

describe("runtime artifact restore helpers", () => {
  it("builds trimmed restore requests from Studio drafts", () => {
    expect(
      buildRuntimeArtifactRestoreRequest({
        reason: " restore report ",
        requestedBy: " operator-main ",
        restoreId: " restore-alpha "
      })
    ).toEqual({
      reason: "restore report",
      requestedBy: "operator-main",
      restoreId: "restore-alpha"
    });

    expect(
      buildRuntimeArtifactRestoreRequest(createEmptyRuntimeArtifactRestoreDraft())
    ).toEqual({});
  });

  it("formats restore request acknowledgements", () => {
    expect(
      formatRuntimeArtifactRestoreRequestSummary({
        artifactId: "artifact-alpha",
        assignmentId: "assignment-alpha",
        commandId: "cmd-artifact-restore-alpha",
        nodeId: "worker-it",
        requestedAt: "2026-04-29T10:00:00.000Z",
        status: "requested"
      })
    ).toBe(
      "Artifact artifact-alpha restore requested on assignment-alpha (cmd-artifact-restore-alpha)"
    );
  });

  it("builds trimmed source-change proposal requests from Studio drafts", () => {
    expect(
      buildRuntimeArtifactSourceChangeProposalRequest({
        overwrite: true,
        proposalId: " proposal-alpha ",
        reason: " promote report ",
        requestedBy: " operator-main ",
        targetPath: " src/report "
      })
    ).toEqual({
      overwrite: true,
      proposalId: "proposal-alpha",
      reason: "promote report",
      requestedBy: "operator-main",
      targetPath: "src/report"
    });

    expect(
      buildRuntimeArtifactSourceChangeProposalRequest(
        createEmptyRuntimeArtifactSourceChangeProposalDraft()
      )
    ).toEqual({
      overwrite: false
    });
  });

  it("formats source-change proposal acknowledgements", () => {
    expect(
      formatRuntimeArtifactSourceChangeProposalRequestSummary({
        artifactId: "artifact-alpha",
        assignmentId: "assignment-alpha",
        commandId: "cmd-artifact-proposal-alpha",
        nodeId: "worker-it",
        proposalId: "proposal-alpha",
        requestedAt: "2026-04-29T10:05:00.000Z",
        status: "requested",
        targetPath: "src/report"
      })
    ).toBe(
      "Artifact artifact-alpha source-change proposal requested into src/report as proposal-alpha on assignment-alpha (cmd-artifact-proposal-alpha)"
    );
  });
});
