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
});
