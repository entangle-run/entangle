import { describe, expect, it } from "vitest";
import type { HostEventRecord, RuntimeInspectionResponse } from "@entangle/types";
import {
  collectRuntimeRecoveryEvents,
  deriveSelectedRuntimeId,
  describeRuntimeRecoveryController,
  describeRuntimeRecoveryPolicy,
  formatRuntimeRecoveryEventLabel
} from "./recovery-inspection.js";

function createRuntime(nodeId: string): RuntimeInspectionResponse {
  return {
    backendKind: "memory",
    contextAvailable: true,
    desiredState: "running",
    graphId: "team-alpha",
    graphRevisionId: "team-alpha-20260424-000000",
    nodeId,
    observedState: "running",
    reconciliation: {
      findingCodes: [],
      state: "aligned"
    },
    restartGeneration: 0
  };
}

describe("studio recovery inspection helpers", () => {
  it("keeps the selected runtime when it still exists", () => {
    expect(
      deriveSelectedRuntimeId([createRuntime("worker-it")], "worker-it")
    ).toBe("worker-it");
  });

  it("falls back to the first runtime when the current selection disappears", () => {
    expect(
      deriveSelectedRuntimeId(
        [createRuntime("worker-it"), createRuntime("worker-marketing")],
        "missing-node"
      )
    ).toBe("worker-it");
  });

  it("describes recovery policy and controller records", () => {
    expect(
      describeRuntimeRecoveryPolicy({
        nodeId: "worker-it",
        policy: {
          cooldownSeconds: 30,
          maxAttempts: 3,
          mode: "restart_on_failure"
        },
        schemaVersion: "1",
        updatedAt: "2026-04-24T10:00:00.000Z"
      })
    ).toContain("Restart on failure");

    expect(
      describeRuntimeRecoveryController({
        attemptsUsed: 2,
        nextEligibleAt: "2026-04-24T10:05:00.000Z",
        nodeId: "worker-it",
        schemaVersion: "1",
        state: "cooldown",
        updatedAt: "2026-04-24T10:00:00.000Z"
      })
    ).toContain("Cooldown until");
  });

  it("filters runtime recovery events for one runtime and formats labels", () => {
    const events: HostEventRecord[] = [
      {
        category: "session",
        eventId: "evt-session",
        graphId: "team-alpha",
        message: "Session 'session-alpha' is now 'active'.",
        nodeId: "worker-it",
        ownerNodeId: "user-root",
        schemaVersion: "1",
        sessionId: "session-alpha",
        status: "active",
        timestamp: "2026-04-24T10:00:00.000Z",
        traceId: "trace-alpha",
        type: "session.updated",
        updatedAt: "2026-04-24T10:00:00.000Z"
      },
      {
        category: "runtime",
        desiredState: "running",
        eventId: "evt-recovery-recorded",
        graphId: "team-alpha",
        graphRevisionId: "team-alpha-20260424-000000",
        message: "Runtime 'worker-it' recorded a recovery snapshot in observed state 'failed'.",
        nodeId: "worker-it",
        observedState: "failed",
        recordedAt: "2026-04-24T10:01:00.000Z",
        recoveryId: "worker-it-20260424t100100-failed",
        restartGeneration: 1,
        schemaVersion: "1",
        timestamp: "2026-04-24T10:01:00.000Z",
        type: "runtime.recovery.recorded"
      }
    ];

    const recoveryEvents = collectRuntimeRecoveryEvents(events, "worker-it");

    expect(recoveryEvents).toHaveLength(1);
    expect(formatRuntimeRecoveryEventLabel(recoveryEvents[0]!)).toContain(
      "Recovery snapshot recorded"
    );
  });
});
