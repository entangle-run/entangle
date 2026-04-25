import { describe, expect, it } from "vitest";
import type { RuntimeInspectionResponse } from "@entangle/types";
import {
  formatRuntimeInspectionDetailLines,
  formatRuntimeInspectionLabel,
  formatRuntimeInspectionStatus,
  sortRuntimeInspectionsForPresentation
} from "./runtime-inspection.js";

function createRuntime(
  nodeId: string,
  observedState: RuntimeInspectionResponse["observedState"]
): RuntimeInspectionResponse {
  return {
    backendKind: "docker",
    contextAvailable: observedState !== "failed",
    desiredState: "running",
    graphId: "team-alpha",
    graphRevisionId: "team-alpha-20260425-080000",
    nodeId,
    observedState,
    packageSourceId: `${nodeId}-pack`,
    primaryGitRepositoryProvisioning: {
      checkedAt: "2026-04-25T08:00:00.000Z",
      created: false,
      schemaVersion: "1",
      state: "ready",
      target: {
        gitServiceRef: "local-gitea",
        namespace: "team-alpha",
        provisioningMode: "gitea_api",
        remoteUrl: "http://gitea.local/team-alpha/runtime.git",
        repositoryName: "runtime",
        transportKind: "https"
      }
    },
    reconciliation:
      observedState === "failed"
        ? {
            findingCodes: ["runtime_failed"],
            state: "degraded"
          }
        : {
            findingCodes: [],
            state: "aligned"
          },
    restartGeneration: 2,
    runtimeHandle: `${nodeId}-container`
  };
}

describe("runtime inspection presentation helpers", () => {
  it("sorts runtime inspections by node id", () => {
    expect(
      sortRuntimeInspectionsForPresentation([
        createRuntime("worker-b", "running"),
        createRuntime("worker-a", "running")
      ]).map((runtime) => runtime.nodeId)
    ).toEqual(["worker-a", "worker-b"]);
  });

  it("formats runtime labels, status, and detail lines", () => {
    const runtime = createRuntime("worker-it", "failed");

    expect(formatRuntimeInspectionLabel(runtime)).toBe("worker-it · failed");
    expect(formatRuntimeInspectionStatus(runtime)).toBe(
      "running/failed · reconciliation degraded · findings runtime_failed"
    );
    expect(formatRuntimeInspectionDetailLines(runtime)).toContain(
      "context unavailable"
    );
    expect(formatRuntimeInspectionDetailLines(runtime)).toContain(
      "git provisioning ready · created no · local-gitea/team-alpha/runtime"
    );
  });
});
