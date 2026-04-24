import { describe, expect, it } from "vitest";
import type { HostEventRecord } from "@entangle/types";
import {
  collectRuntimeTraceEvents,
  describeRuntimeTraceEvent,
  formatRuntimeTraceEventLabel
} from "./runtime-trace.js";

describe("runtime trace helpers", () => {
  it("collects only runtime-trace events for one node", () => {
    const events: HostEventRecord[] = [
      {
        category: "runner",
        consumedArtifactIds: [],
        eventId: "evt-runner-turn",
        graphId: "team-alpha",
        message: "Runner turn 'turn-alpha' on node 'worker-it' is now in phase 'persisting'.",
        nodeId: "worker-it",
        phase: "persisting",
        producedArtifactIds: [],
        schemaVersion: "1",
        startedAt: "2026-04-24T11:00:03.000Z",
        timestamp: "2026-04-24T11:00:03.000Z",
        triggerKind: "message",
        turnId: "turn-alpha",
        type: "runner.turn.updated",
        updatedAt: "2026-04-24T11:00:03.000Z"
      },
      {
        category: "runtime",
        desiredState: "running",
        eventId: "evt-recovery",
        graphId: "team-alpha",
        graphRevisionId: "team-alpha-20260424-000000",
        message: "Runtime 'worker-it' recorded a recovery snapshot.",
        nodeId: "worker-it",
        observedState: "failed",
        recordedAt: "2026-04-24T11:00:04.000Z",
        recoveryId: "recovery-alpha",
        restartGeneration: 1,
        schemaVersion: "1",
        timestamp: "2026-04-24T11:00:04.000Z",
        type: "runtime.recovery.recorded"
      }
    ];

    expect(collectRuntimeTraceEvents(events, "worker-it")).toHaveLength(1);
  });

  it("describes runner-turn engine outcome in a bounded way", () => {
    const event: HostEventRecord = {
      category: "runner",
      consumedArtifactIds: [],
      engineOutcome: {
        providerStopReason: "end_turn",
        stopReason: "completed",
        toolExecutions: [
          {
            outcome: "success",
            sequence: 1,
            toolCallId: "toolu_alpha",
            toolId: "inspect_artifact_input"
          },
          {
            errorCode: "tool_result_error",
            outcome: "error",
            sequence: 2,
            toolCallId: "toolu_beta",
            toolId: "inspect_memory_ref"
          }
        ],
        usage: {
          inputTokens: 13,
          outputTokens: 7
        }
      },
      eventId: "evt-turn-observed",
      graphId: "team-alpha",
      message: "Runner turn 'turn-alpha' completed with engine outcome.",
      nodeId: "worker-it",
      phase: "emitting",
      producedArtifactIds: [],
      schemaVersion: "1",
      startedAt: "2026-04-24T11:00:03.000Z",
      timestamp: "2026-04-24T11:00:04.000Z",
      triggerKind: "message",
      turnId: "turn-alpha",
      type: "runner.turn.updated",
      updatedAt: "2026-04-24T11:00:04.000Z"
    };

    expect(formatRuntimeTraceEventLabel(event)).toBe("Turn turn-alpha is emitting");
    expect(describeRuntimeTraceEvent(event)).toEqual({
      detailLines: [
        "Outcome: completed (provider: end_turn)",
        "Usage: 13 input / 7 output tokens",
        "Tool executions: 2 total (1 success, 1 error)",
        "Recent tools: 1. inspect_artifact_input (success), 2. inspect_memory_ref (error:tool_result_error)"
      ],
      label: "Turn turn-alpha is emitting"
    });
  });
});
