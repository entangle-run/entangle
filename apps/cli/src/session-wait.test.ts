import { describe, expect, it } from "vitest";
import type {
  SessionInspectionResponse,
  SessionLaunchResponse
} from "@entangle/types";
import {
  projectHostSessionLaunchSummary,
  projectHostSessionWaitSummary,
  resolveHostSessionWaitOutcome,
  shouldHostSessionWaitExitNonZero
} from "./session-wait.js";

function createInspection(
  statuses: Array<SessionInspectionResponse["nodes"][number]["session"]["status"]>
): SessionInspectionResponse {
  return {
    graphId: "federated-preview",
    nodes: statuses.map((status, index) => {
      const nodeId = `worker-${index + 1}`;

      return {
        nodeId,
        runtime: {
          backendKind: "docker",
          contextAvailable: true,
          desiredState: "running",
          graphId: "federated-preview",
          graphRevisionId: "federated-preview-20260425-000000",
          nodeId,
          observedState: "running",
          restartGeneration: 0
        },
        session: {
          activeConversationIds:
            status === "active" ? [`conversation-${index + 1}`] : [],
          graphId: "federated-preview",
          intent: "Prepare a workbench report.",
          openedAt: "2026-04-25T12:00:00.000Z",
          ownerNodeId: nodeId,
          rootArtifactIds:
            status === "completed" ? [`artifact-${index + 1}`] : [],
          sessionId: "session-alpha",
          status,
          traceId: `trace-${index + 1}`,
          updatedAt: "2026-04-25T12:00:01.000Z",
          waitingApprovalIds:
            status === "waiting_approval" ? [`approval-${index + 1}`] : []
        }
      };
    }),
    sessionId: "session-alpha"
  };
}

function createLaunch(): SessionLaunchResponse {
  return {
    conversationId: "conversation-alpha",
    eventId: "event-alpha",
    fromNodeId: "operator",
    publishedRelays: ["ws://localhost:7777"],
    relayUrls: ["ws://localhost:7777"],
    sessionId: "session-alpha",
    targetNodeId: "worker-1",
    turnId: "turn-alpha"
  };
}

describe("session wait CLI projection", () => {
  it("resolves wait outcomes from inspected session node statuses", () => {
    expect(resolveHostSessionWaitOutcome(createInspection(["active"]))).toBe(
      "observing"
    );
    expect(
      resolveHostSessionWaitOutcome(createInspection(["waiting_approval"]))
    ).toBe("waiting_approval");
    expect(
      resolveHostSessionWaitOutcome(createInspection(["completed", "completed"]))
    ).toBe("completed");
    expect(
      resolveHostSessionWaitOutcome(createInspection(["active", "failed"]))
    ).toBe("failed");
    expect(resolveHostSessionWaitOutcome(createInspection(["timed_out"]))).toBe(
      "session_timed_out"
    );
  });

  it("projects launch and wait summaries with follow-up commands", () => {
    const wait = projectHostSessionWaitSummary({
      elapsedMs: 1200,
      inspection: createInspection(["completed"]),
      outcome: "completed",
      pollCount: 3,
      timedOut: false
    });

    expect(
      projectHostSessionLaunchSummary({
        launch: createLaunch(),
        wait
      })
    ).toMatchObject({
      launch: {
        nextCommands: [
          "entangle host sessions get session-alpha --summary",
          "entangle host runtimes turns worker-1 --summary",
          "entangle host runtimes artifacts worker-1 --session-id session-alpha --summary"
        ],
        sessionId: "session-alpha"
      },
      wait: {
        elapsedMs: 1200,
        outcome: "completed",
        pollCount: 3,
        session: {
          sessionId: "session-alpha",
          traceIds: ["trace-1"]
        },
        timedOut: false
      }
    });
  });

  it("marks failed and expired wait attempts as non-zero CLI outcomes", () => {
    expect(
      shouldHostSessionWaitExitNonZero({
        elapsedMs: 2000,
        outcome: "observing",
        pollCount: 2,
        timedOut: true
      })
    ).toBe(true);
    expect(
      shouldHostSessionWaitExitNonZero({
        elapsedMs: 2000,
        outcome: "failed",
        pollCount: 2,
        timedOut: false
      })
    ).toBe(true);
    expect(
      shouldHostSessionWaitExitNonZero({
        elapsedMs: 2000,
        outcome: "waiting_approval",
        pollCount: 2,
        timedOut: false
      })
    ).toBe(false);
  });
});
