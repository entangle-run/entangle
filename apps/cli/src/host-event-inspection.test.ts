import { describe, expect, it } from "vitest";
import { buildHostEventFilter } from "./host-event-inspection.js";

describe("buildHostEventFilter", () => {
  it("builds a recovery-oriented runtime filter without duplicate prefixes", () => {
    expect(
      buildHostEventFilter({
        nodeId: "worker-it",
        recoveryOnly: true,
        typePrefixes: ["runtime.recovery.", "runtime.restart.requested"]
      })
    ).toEqual({
      nodeId: "worker-it",
      typePrefixes: [
        "runtime.recovery.",
        "runtime.restart.requested",
        "runtime.observed_state.changed"
      ]
    });
  });

  it("preserves explicit category-only filters", () => {
    expect(
      buildHostEventFilter({
        category: "session"
      })
    ).toEqual({
      categories: ["session"]
    });
  });

  it("builds a runtime-trace filter without duplicating trace prefixes", () => {
    expect(
      buildHostEventFilter({
        nodeId: "worker-it",
        runtimeTraceOnly: true,
        typePrefixes: ["runner.turn.updated", "artifact.trace.event"]
      })
    ).toEqual({
      nodeId: "worker-it",
      typePrefixes: [
        "runner.turn.updated",
        "artifact.trace.event",
        "session.updated",
        "conversation.trace.event",
        "approval.trace.event",
        "source_change_candidate.reviewed",
        "source_history.updated",
        "source_history.published",
        "source_history.replayed"
      ]
    });
  });
});
