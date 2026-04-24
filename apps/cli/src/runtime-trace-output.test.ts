import { describe, expect, it } from "vitest";
import type { HostEventRecord } from "@entangle/types";
import { projectRuntimeTraceSummary } from "./runtime-trace-output.js";

describe("projectRuntimeTraceSummary", () => {
  it("projects runner-turn events into structured summary records", () => {
    const event: HostEventRecord = {
      category: "runner",
      consumedArtifactIds: ["artifact-inbound-001"],
      engineOutcome: {
        providerStopReason: "end_turn",
        stopReason: "completed",
        toolExecutions: [
          {
            outcome: "success",
            sequence: 1,
            toolCallId: "toolu_alpha",
            toolId: "inspect_artifact_input"
          }
        ],
        usage: {
          inputTokens: 42,
          outputTokens: 12
        }
      },
      eventId: "evt-runner-turn",
      graphId: "team-alpha",
      message: "Runner turn 'turn-alpha' on node 'worker-it' is now in phase 'persisting'.",
      nodeId: "worker-it",
      phase: "persisting",
      producedArtifactIds: ["artifact-report-001"],
      schemaVersion: "1",
      sessionId: "session-alpha",
      startedAt: "2026-04-24T11:00:02.000Z",
      timestamp: "2026-04-24T11:00:03.000Z",
      triggerKind: "message",
      turnId: "turn-alpha",
      type: "runner.turn.updated",
      updatedAt: "2026-04-24T11:00:03.000Z"
    };

    expect(projectRuntimeTraceSummary(event)).toEqual({
      detailLines: [
        "Outcome: completed (provider: end_turn)",
        "Usage: 42 input / 12 output tokens",
        "Tool executions: 1 total (1 success, 0 error)",
        "Recent tools: 1. inspect_artifact_input (success)"
      ],
      eventId: "evt-runner-turn",
      label: "Turn turn-alpha is persisting",
      message:
        "Runner turn 'turn-alpha' on node 'worker-it' is now in phase 'persisting'.",
      timestamp: "2026-04-24T11:00:03.000Z",
      type: "runner.turn.updated"
    });
  });
});
