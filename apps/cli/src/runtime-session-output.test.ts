import { describe, expect, it } from "vitest";
import type {
  HostSessionSummary,
  SessionInspectionResponse
} from "@entangle/types";
import {
  projectHostSessionInspectionSummary,
  projectHostSessionSummary
} from "./runtime-session-output.js";

describe("runtime session CLI output", () => {
  it("projects aggregated session summaries into compact active-work records", () => {
    const session: HostSessionSummary = {
      activeConversationIds: ["conv-alpha"],
      graphId: "team-alpha",
      latestMessageType: "task.result",
      nodeIds: ["worker-it", "lead-it"],
      nodeStatuses: [
        { nodeId: "worker-it", status: "active" },
        { nodeId: "lead-it", status: "planning" }
      ],
      rootArtifactIds: ["artifact-alpha"],
      sessionId: "session-alpha",
      traceIds: ["trace-alpha"],
      updatedAt: "2026-04-24T10:05:00.000Z",
      waitingApprovalIds: ["approval-alpha"]
    };

    expect(projectHostSessionSummary(session)).toMatchObject({
      activeConversationCount: 1,
      graphId: "team-alpha",
      label: "session-alpha · worker-it:active, lead-it:planning",
      latestMessageType: "task.result",
      rootArtifactCount: 1,
      sessionId: "session-alpha",
      traceIds: ["trace-alpha"],
      waitingApprovalCount: 1
    });
    expect(projectHostSessionSummary(session).detail).toContain(
      "active conversations 1"
    );
  });

  it("projects session inspection detail into per-node summaries", () => {
    const inspection: SessionInspectionResponse = {
      graphId: "team-alpha",
      nodes: [
        {
          nodeId: "worker-it",
          runtime: {
            backendKind: "docker",
            contextAvailable: true,
            desiredState: "running",
            graphId: "team-alpha",
            graphRevisionId: "team-alpha-20260424-000001",
            nodeId: "worker-it",
            observedState: "running",
            restartGeneration: 0
          },
          session: {
            activeConversationIds: ["conv-alpha"],
            graphId: "team-alpha",
            intent: "Review the latest patch set.",
            lastMessageType: "task.result",
            openedAt: "2026-04-24T10:00:00.000Z",
            ownerNodeId: "worker-it",
            rootArtifactIds: ["artifact-alpha"],
            sessionId: "session-alpha",
            status: "active",
            traceId: "trace-alpha",
            updatedAt: "2026-04-24T10:05:00.000Z",
            waitingApprovalIds: ["approval-alpha"]
          }
        }
      ],
      sessionId: "session-alpha"
    };

    expect(projectHostSessionInspectionSummary(inspection)).toMatchObject({
      graphId: "team-alpha",
      nodes: [
        {
          activeConversationCount: 1,
          label: "worker-it · active",
          nodeId: "worker-it",
          rootArtifactCount: 1,
          runtimeState: "running/running",
          status: "active",
          traceId: "trace-alpha",
          waitingApprovalCount: 1
        }
      ],
      sessionId: "session-alpha",
      traceIds: ["trace-alpha"]
    });
    expect(projectHostSessionInspectionSummary(inspection).nodes[0]?.detail).toContain(
      "last message task.result"
    );
  });
});
