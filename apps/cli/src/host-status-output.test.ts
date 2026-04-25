import { describe, expect, it } from "vitest";
import type { HostStatusResponse } from "@entangle/types";
import { projectHostStatusSummary } from "./host-status-output.js";

function createStatus(): HostStatusResponse {
  return {
    graphRevisionId: "team-alpha-20260425-080000",
    reconciliation: {
      backendKind: "docker",
      blockedRuntimeCount: 1,
      degradedRuntimeCount: 1,
      failedRuntimeCount: 1,
      findingCodes: ["runtime_failed"],
      issueCount: 1,
      lastReconciledAt: "2026-04-25T08:00:01.000Z",
      managedRuntimeCount: 2,
      runningRuntimeCount: 1,
      stoppedRuntimeCount: 0,
      transitioningRuntimeCount: 0
    },
    runtimeCounts: {
      desired: 2,
      observed: 2,
      running: 1
    },
    service: "entangle-host",
    status: "degraded",
    timestamp: "2026-04-25T08:00:02.000Z"
  };
}

describe("host status CLI summary projection", () => {
  it("projects host status into compact operator summaries", () => {
    expect(projectHostStatusSummary(createStatus())).toMatchObject({
      graphRevisionId: "team-alpha-20260425-080000",
      label: "entangle-host · degraded",
      reconciliation: {
        findingCodes: ["runtime_failed"],
        summary: "2 runtimes · 1 issues · 1 degraded · 1 blocked"
      },
      runtimeCounts: {
        running: 1
      },
      status: "degraded"
    });
    expect(projectHostStatusSummary(createStatus()).detailLines).toContain(
      "findings runtime_failed"
    );
  });
});
