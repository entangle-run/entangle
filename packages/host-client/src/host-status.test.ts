import { describe, expect, it } from "vitest";
import type { HostStatusResponse } from "@entangle/types";
import {
  formatHostStatusDetailLines,
  formatHostStatusLabel,
  formatHostStatusReconciliationSummary
} from "./host-status.js";

function createStatus(): HostStatusResponse {
  return {
    graphRevisionId: "team-alpha-20260425-080000",
    reconciliation: {
      backendKind: "docker",
      blockedRuntimeCount: 1,
      degradedRuntimeCount: 1,
      failedRuntimeCount: 1,
      findingCodes: ["context_unavailable", "runtime_failed"],
      issueCount: 2,
      lastReconciledAt: "2026-04-25T08:00:01.000Z",
      managedRuntimeCount: 3,
      runningRuntimeCount: 1,
      stoppedRuntimeCount: 1,
      transitioningRuntimeCount: 0
    },
    runtimeCounts: {
      desired: 3,
      observed: 3,
      running: 1
    },
    service: "entangle-host",
    status: "degraded",
    timestamp: "2026-04-25T08:00:02.000Z"
  };
}

describe("host status presentation helpers", () => {
  it("formats host status labels and reconciliation summaries", () => {
    const status = createStatus();

    expect(formatHostStatusLabel(status)).toBe("entangle-host · degraded");
    expect(formatHostStatusReconciliationSummary(status)).toBe(
      "3 runtimes · 2 issues · 1 degraded · 1 blocked"
    );
  });

  it("formats bounded host status detail lines", () => {
    const detailLines = formatHostStatusDetailLines(createStatus());

    expect(detailLines).toContain(
      "runtime counts desired 3, observed 3, running 1"
    );
    expect(detailLines).toContain(
      "findings context_unavailable, runtime_failed"
    );
    expect(detailLines).toContain(
      "last reconciled 2026-04-25T08:00:01.000Z"
    );
  });
});
