import { describe, expect, it } from "vitest";
import type { HostEventRecord } from "@entangle/types";
import { projectRuntimeTraceSummary } from "./runtime-trace-output.js";

describe("projectRuntimeTraceSummary", () => {
  it("projects bootstrap operator request audit events into structured summaries", () => {
    const event: HostEventRecord = {
      auditPreviousEventHash:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      auditRecordHash:
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      authMode: "bootstrap_operator_token",
      category: "security",
      eventId: "evt-operator-request",
      message: "Host operator request 'PUT /v1/catalog' completed with status 403.",
      method: "PUT",
      operatorId: "audit-viewer",
      operatorRole: "viewer",
      path: "/v1/catalog",
      requestId: "req-operator-1",
      schemaVersion: "1",
      statusCode: 403,
      timestamp: "2026-04-29T21:00:00.000Z",
      type: "host.operator_request.completed"
    };

    expect(projectRuntimeTraceSummary(event)).toEqual({
      auditPreviousEventHash:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      auditRecordHash:
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      detailLines: [
        "Operator: audit-viewer (viewer)",
        "Method: PUT",
        "Path: /v1/catalog",
        "Status: 403",
        "Auth: bootstrap_operator_token"
      ],
      eventId: "evt-operator-request",
      label: "Operator audit-viewer PUT /v1/catalog -> 403",
      message: "Host operator request 'PUT /v1/catalog' completed with status 403.",
      timestamp: "2026-04-29T21:00:00.000Z",
      type: "host.operator_request.completed"
    });
  });

  it("projects runner-turn events into structured summary records", () => {
    const event: HostEventRecord = {
      category: "runner",
      consumedArtifactIds: ["artifact-inbound-001"],
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
      sourceChangeCandidateIds: [],
      startedAt: "2026-04-24T11:00:02.000Z",
      timestamp: "2026-04-24T11:00:03.000Z",
      triggerKind: "message",
      turnId: "turn-alpha",
      type: "runner.turn.updated",
      updatedAt: "2026-04-24T11:00:03.000Z"
    };

    expect(projectRuntimeTraceSummary(event)).toEqual({
      detailLines: [
        "Provider: anthropic/shared-anthropic (claude-opus-4-7)",
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
