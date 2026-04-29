import { describe, expect, it } from "vitest";
import {
  buildRuntimeArtifactRestoreRequest,
  createEmptyRuntimeArtifactRestoreDraft,
  formatRuntimeArtifactRestoreRequestSummary
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
});
