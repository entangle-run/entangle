import { describe, expect, it } from "vitest";
import type {
  HostEventRecord,
  RuntimeRecoveryControllerRecord,
  RuntimeRecoveryPolicyRecord,
  RuntimeRecoveryRecord
} from "@entangle/types";
import {
  collectRuntimeRecoveryEvents,
  describeRuntimeRecoveryController,
  describeRuntimeRecoveryPolicy,
  formatRuntimeRecoveryEventLabel,
  formatRuntimeRecoveryRecordDetailLines,
  formatRuntimeRecoveryRecordLabel
} from "./runtime-recovery.js";

describe("runtime recovery presentation helpers", () => {
  it("describes recovery policy and controller records", () => {
    const policyRecord: RuntimeRecoveryPolicyRecord = {
      nodeId: "worker-it",
      policy: {
        cooldownSeconds: 30,
        maxAttempts: 3,
        mode: "restart_on_failure"
      },
      schemaVersion: "1",
      updatedAt: "2026-04-24T10:00:00.000Z"
    };
    const controller: RuntimeRecoveryControllerRecord = {
      attemptsUsed: 2,
      nextEligibleAt: "2026-04-24T10:05:00.000Z",
      nodeId: "worker-it",
      schemaVersion: "1",
      state: "cooldown",
      updatedAt: "2026-04-24T10:00:00.000Z"
    };

    expect(describeRuntimeRecoveryPolicy(policyRecord)).toContain(
      "Restart on failure"
    );
    expect(describeRuntimeRecoveryController(controller)).toContain(
      "Cooldown until"
    );
  });

  it("filters runtime recovery events for one runtime and formats labels", () => {
    const events: HostEventRecord[] = [
      {
        activeConversationIds: ["conv-alpha"],
        category: "session",
        eventId: "evt-session",
        graphId: "team-alpha",
        message: "Session 'session-alpha' is now 'active'.",
        nodeId: "worker-it",
        ownerNodeId: "user-root",
        rootArtifactIds: [],
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
        message:
          "Runtime 'worker-it' recorded a recovery snapshot in observed state 'failed'.",
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

  it("formats recovery history records", () => {
    const record: RuntimeRecoveryRecord = {
      lastError: "container exited",
      recordedAt: "2026-04-24T10:01:00.000Z",
      recoveryId: "worker-it-20260424t100100-failed",
      runtime: {
        backendKind: "docker",
        contextAvailable: true,
        desiredState: "running",
        graphId: "team-alpha",
        graphRevisionId: "team-alpha-20260424-000000",
        nodeId: "worker-it",
        observedState: "failed",
        reconciliation: {
          findingCodes: ["runtime_failed"],
          state: "degraded"
        },
        restartGeneration: 1,
        statusMessage: "container exited"
      }
    };

    expect(formatRuntimeRecoveryRecordLabel(record)).toBe(
      "worker-it-20260424t100100-failed · failed"
    );
    expect(formatRuntimeRecoveryRecordDetailLines(record)).toEqual(
      expect.arrayContaining([
        "observed failed",
        "findings runtime_failed",
        "last error container exited"
      ])
    );
  });
});
