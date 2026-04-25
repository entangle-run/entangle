import { describe, expect, it } from "vitest";
import type { RuntimeInspectionResponse } from "@entangle/types";
import {
  buildSessionLaunchRequest,
  createDefaultSessionLaunchDraft,
  isSessionLaunchDraftReady
} from "./session-launch.js";

function createRuntime(
  overrides: Partial<RuntimeInspectionResponse> = {}
): RuntimeInspectionResponse {
  return {
    backendKind: "docker",
    contextAvailable: true,
    desiredState: "running",
    graphId: "team-alpha",
    graphRevisionId: "team-alpha-20260424-000000",
    nodeId: "worker-it",
    observedState: "running",
    reconciliation: {
      findingCodes: [],
      state: "aligned"
    },
    restartGeneration: 0,
    ...overrides
  };
}

describe("studio session launch helpers", () => {
  it("creates a selected-runtime default draft", () => {
    expect(createDefaultSessionLaunchDraft(createRuntime())).toEqual({
      intent: "",
      summary: "Inspect local state for worker-it."
    });
  });

  it("requires a realizable runtime context and a non-empty summary", () => {
    expect(
      isSessionLaunchDraftReady(createRuntime(), {
        intent: "",
        summary: " Inspect local state. "
      })
    ).toBe(true);
    expect(
      isSessionLaunchDraftReady(createRuntime({ contextAvailable: false }), {
        intent: "",
        summary: "Inspect local state."
      })
    ).toBe(false);
    expect(
      isSessionLaunchDraftReady(createRuntime(), {
        intent: "",
        summary: "   "
      })
    ).toBe(false);
  });

  it("builds a host launch request without optional empty fields", () => {
    expect(
      buildSessionLaunchRequest(createRuntime(), {
        intent: "  Review the runtime trace. ",
        summary: " Inspect local state. "
      })
    ).toEqual({
      intent: "Review the runtime trace.",
      summary: "Inspect local state.",
      targetNodeId: "worker-it"
    });

    expect(
      buildSessionLaunchRequest(createRuntime(), {
        intent: " ",
        summary: " Inspect local state. "
      })
    ).toEqual({
      summary: "Inspect local state.",
      targetNodeId: "worker-it"
    });
  });
});
