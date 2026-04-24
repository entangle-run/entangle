import { describe, expect, it } from "vitest";
import type { HostEventRecord } from "@entangle/types";
import {
  filterHostEvents,
  hostEventMatchesFilter,
  runtimeRecoveryEventTypePrefixes
} from "./event-inspection.js";

function createRuntimeRecoveryRecordedEvent(): HostEventRecord {
  return {
    category: "runtime",
    desiredState: "running",
    eventId: "evt-runtime-recovery-recorded",
    graphId: "team-alpha",
    graphRevisionId: "team-alpha-20260424-000000",
    message: "Runtime 'worker-it' recorded a recovery snapshot in observed state 'failed'.",
    nodeId: "worker-it",
    observedState: "failed",
    recordedAt: "2026-04-24T10:00:00.000Z",
    recoveryId: "worker-it-20260424t100000-failed",
    restartGeneration: 1,
    schemaVersion: "1",
    timestamp: "2026-04-24T10:00:00.000Z",
    type: "runtime.recovery.recorded"
  };
}

function createSessionEvent(): HostEventRecord {
  return {
    category: "session",
    eventId: "evt-session-updated",
    graphId: "team-alpha",
    message: "Session 'session-alpha' is now 'active'.",
    nodeId: "worker-it",
    ownerNodeId: "user-root",
    schemaVersion: "1",
    sessionId: "session-alpha",
    status: "active",
    timestamp: "2026-04-24T10:00:10.000Z",
    traceId: "trace-alpha",
    type: "session.updated",
    updatedAt: "2026-04-24T10:00:10.000Z"
  };
}

describe("host event inspection helpers", () => {
  it("matches runtime recovery events by node id and type prefix", () => {
    const event = createRuntimeRecoveryRecordedEvent();

    expect(
      hostEventMatchesFilter(event, {
        nodeId: "worker-it",
        typePrefixes: [...runtimeRecoveryEventTypePrefixes]
      })
    ).toBe(true);
    expect(
      hostEventMatchesFilter(event, {
        nodeId: "worker-marketing",
        typePrefixes: [...runtimeRecoveryEventTypePrefixes]
      })
    ).toBe(false);
  });

  it("filters host events by category, node id, and type prefix", () => {
    const events: HostEventRecord[] = [
      createSessionEvent(),
      createRuntimeRecoveryRecordedEvent()
    ];

    expect(
      filterHostEvents(events, {
        categories: ["runtime"],
        nodeId: "worker-it",
        typePrefixes: ["runtime.recovery."]
      })
    ).toEqual([createRuntimeRecoveryRecordedEvent()]);
  });
});
