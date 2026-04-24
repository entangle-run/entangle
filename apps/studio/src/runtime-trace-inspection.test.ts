import { describe, expect, it } from "vitest";
import type { HostEventRecord } from "@entangle/types";
import {
  collectRuntimeTraceEvents,
  formatRuntimeTraceEventDetailLines,
  formatRuntimeTraceEventLabel
} from "./runtime-trace-inspection.js";

describe("studio runtime trace inspection helpers", () => {
  it("collects only trace events for the selected runtime", () => {
    const events: HostEventRecord[] = [
      {
        category: "session",
        eventId: "evt-conversation-trace",
        message: "Conversation 'conv-alpha' is now 'awaiting_response'.",
        conversationId: "conv-alpha",
        followupCount: 1,
        graphId: "team-alpha",
        initiator: "remote",
        nodeId: "worker-it",
        peerNodeId: "lead-it",
        schemaVersion: "1",
        sessionId: "session-alpha",
        status: "working",
        timestamp: "2026-04-24T11:00:00.000Z",
        type: "conversation.trace.event",
        updatedAt: "2026-04-24T11:00:00.000Z",
        artifactIds: []
      },
      {
        category: "runtime",
        desiredState: "running",
        eventId: "evt-runtime-recovery-recorded",
        graphId: "team-alpha",
        graphRevisionId: "team-alpha-20260424-000000",
        message: "Runtime 'worker-it' recorded a recovery snapshot in observed state 'failed'.",
        nodeId: "worker-it",
        observedState: "failed",
        recordedAt: "2026-04-24T11:00:01.000Z",
        recoveryId: "worker-it-20260424t110001-failed",
        restartGeneration: 1,
        schemaVersion: "1",
        timestamp: "2026-04-24T11:00:01.000Z",
        type: "runtime.recovery.recorded"
      },
      {
        category: "runner",
        consumedArtifactIds: [],
        eventId: "evt-runner-turn",
        graphId: "team-alpha",
        message: "Runner turn 'turn-alpha' advanced to 'completed'.",
        nodeId: "worker-it",
        phase: "emitting",
        producedArtifactIds: ["artifact-report"],
        schemaVersion: "1",
        startedAt: "2026-04-24T11:00:02.000Z",
        timestamp: "2026-04-24T11:00:03.000Z",
        triggerKind: "message",
        turnId: "turn-alpha",
        type: "runner.turn.updated",
        updatedAt: "2026-04-24T11:00:03.000Z"
      },
      {
        category: "session",
        eventId: "evt-session-foreign",
        graphId: "team-alpha",
        message: "Session 'session-beta' is now 'active'.",
        nodeId: "worker-marketing",
        ownerNodeId: "user-root",
        schemaVersion: "1",
        sessionId: "session-beta",
        status: "active",
        timestamp: "2026-04-24T11:00:04.000Z",
        traceId: "trace-beta",
        type: "session.updated",
        updatedAt: "2026-04-24T11:00:04.000Z"
      }
    ];

    expect(collectRuntimeTraceEvents(events, "worker-it")).toHaveLength(2);
  });

  it("formats runtime trace labels for the supported event classes", () => {
    expect(
      formatRuntimeTraceEventLabel({
        artifactId: "artifact-report",
        backend: "git",
        category: "session",
        eventId: "evt-artifact-trace",
        graphId: "team-alpha",
        lifecycleState: "published",
        message: "Artifact 'artifact-report' moved to lifecycle state 'published'.",
        nodeId: "worker-it",
        publicationState: "published",
        schemaVersion: "1",
        sessionId: "session-alpha",
        timestamp: "2026-04-24T11:00:00.000Z",
        type: "artifact.trace.event",
        updatedAt: "2026-04-24T11:00:00.000Z"
      })
    ).toContain("Artifact artifact-report is published");
  });

  it("surfaces bounded engine-outcome detail lines for runner-turn events", () => {
    const detailLines = formatRuntimeTraceEventDetailLines({
      category: "runner",
      consumedArtifactIds: ["artifact-inbound"],
      engineOutcome: {
        providerMetadata: {
          adapterKind: "anthropic",
          modelId: "claude-opus-4-7",
          profileId: "shared-anthropic"
        },
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
            errorCode: "tool_execution_failed",
            outcome: "error",
            sequence: 2,
            toolCallId: "toolu_beta",
            toolId: "inspect_memory_ref"
          }
        ],
        usage: {
          inputTokens: 42,
          outputTokens: 12
        }
      },
      memorySynthesisOutcome: {
        status: "succeeded",
        updatedAt: "2026-04-24T11:00:03.500Z",
        updatedSummaryPagePaths: [
          "/tmp/entangle-runner/memory/wiki/summaries/working-context.md",
          "/tmp/entangle-runner/memory/wiki/summaries/stable-facts.md",
          "/tmp/entangle-runner/memory/wiki/summaries/open-questions.md"
        ],
        workingContextPagePath:
          "/tmp/entangle-runner/memory/wiki/summaries/working-context.md"
      },
      eventId: "evt-runner-turn-observed",
      graphId: "team-alpha",
      message: "Runner turn 'turn-alpha' observed a completed engine outcome.",
      nodeId: "worker-it",
      phase: "persisting",
      producedArtifactIds: ["artifact-report"],
      schemaVersion: "1",
      sessionId: "session-alpha",
      startedAt: "2026-04-24T11:00:02.000Z",
      timestamp: "2026-04-24T11:00:03.000Z",
      triggerKind: "message",
      turnId: "turn-alpha",
      type: "runner.turn.updated",
      updatedAt: "2026-04-24T11:00:03.000Z"
    });

    expect(detailLines).toEqual([
      "Provider: anthropic/shared-anthropic (claude-opus-4-7)",
      "Outcome: completed (provider: end_turn)",
      "Usage: 42 input / 12 output tokens",
      "Tool executions: 2 total (1 success, 1 error)",
      "Recent tools: 1. inspect_artifact_input (success), 2. inspect_memory_ref (error:tool_execution_failed)",
      "Memory synthesis: updated 3 summary pages"
    ]);
  });
});
