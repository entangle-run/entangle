import { describe, expect, it } from "vitest";
import type { RuntimeInspectionResponse } from "@entangle/types";
import {
  canRestartRuntime,
  canStartRuntime,
  canStopRuntime,
  formatRuntimeLifecycleActionLabel
} from "./runtime-lifecycle-actions.js";

function createRuntime(
  desiredState: RuntimeInspectionResponse["desiredState"]
): RuntimeInspectionResponse {
  return {
    backendKind: "memory",
    contextAvailable: true,
    desiredState,
    graphId: "team-alpha",
    graphRevisionId: "team-alpha-20260424-000000",
    nodeId: "worker-it",
    observedState: desiredState === "running" ? "running" : "stopped",
    reconciliation: {
      findingCodes: [],
      state: "aligned"
    },
    restartGeneration: 0
  };
}

describe("studio runtime lifecycle action helpers", () => {
  it("enables start only for stopped runtimes", () => {
    expect(canStartRuntime(createRuntime("stopped"))).toBe(true);
    expect(canStartRuntime(createRuntime("running"))).toBe(false);
  });

  it("enables stop and restart only for running runtimes", () => {
    expect(canStopRuntime(createRuntime("running"))).toBe(true);
    expect(canRestartRuntime(createRuntime("running"))).toBe(true);
    expect(canStopRuntime(createRuntime("stopped"))).toBe(false);
    expect(canRestartRuntime(createRuntime("stopped"))).toBe(false);
  });

  it("formats pending action labels deterministically", () => {
    expect(formatRuntimeLifecycleActionLabel("start", "start")).toBe("Starting...");
    expect(formatRuntimeLifecycleActionLabel("stop", "stop")).toBe("Stopping...");
    expect(formatRuntimeLifecycleActionLabel("restart", "restart")).toBe("Restarting...");
    expect(formatRuntimeLifecycleActionLabel("restart", null)).toBe("Restart");
  });
});
