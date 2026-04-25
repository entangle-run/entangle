import { describe, expect, it } from "vitest";
import type { RuntimeInspectionResponse } from "@entangle/types";
import { projectRuntimeInspectionSummary } from "./runtime-inspection-output.js";

function createRuntime(): RuntimeInspectionResponse {
  return {
    backendKind: "docker",
    contextAvailable: false,
    desiredState: "running",
    graphId: "team-alpha",
    graphRevisionId: "team-alpha-20260425-080000",
    nodeId: "worker-it",
    observedState: "failed",
    packageSourceId: "it-pack",
    reconciliation: {
      findingCodes: ["runtime_failed"],
      state: "degraded"
    },
    restartGeneration: 3,
    statusMessage: "container exited"
  };
}

describe("runtime inspection CLI summary projection", () => {
  it("projects runtime inspection into compact operator summaries", () => {
    expect(projectRuntimeInspectionSummary(createRuntime())).toMatchObject({
      backendKind: "docker",
      contextAvailable: false,
      findingCodes: ["runtime_failed"],
      label: "worker-it · failed",
      nodeId: "worker-it",
      observedState: "failed",
      reconciliationState: "degraded",
      restartGeneration: 3,
      status: "running/failed · reconciliation degraded · findings runtime_failed"
    });
    expect(projectRuntimeInspectionSummary(createRuntime()).detailLines).toContain(
      "status container exited"
    );
  });
});
