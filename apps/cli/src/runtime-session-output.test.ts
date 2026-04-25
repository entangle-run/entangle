import { describe, expect, it } from "vitest";
import type {
  HostSessionSummary,
  SessionInspectionResponse
} from "@entangle/types";
import {
  projectHostSessionInspectionSummary,
  projectHostSessionSummary
} from "./runtime-session-output.js";

function createConversationStatusCounts(
  overrides: Partial<NonNullable<HostSessionSummary["conversationStatusCounts"]>>
): NonNullable<HostSessionSummary["conversationStatusCounts"]> {
  return {
    acknowledged: 0,
    awaiting_approval: 0,
    blocked: 0,
    closed: 0,
    expired: 0,
    opened: 0,
    rejected: 0,
    resolved: 0,
    working: 0,
    ...overrides
  };
}

describe("runtime session CLI output", () => {
  it("projects aggregated session summaries into compact active-work records", () => {
    const session: HostSessionSummary = {
      activeConversationIds: ["conv-alpha"],
      conversationStatusCounts: createConversationStatusCounts({
        working: 1
      }),
      graphId: "team-alpha",
      latestMessageType: "task.result",
      nodeIds: ["worker-it", "lead-it"],
      nodeStatuses: [
        { nodeId: "worker-it", status: "active" },
        { nodeId: "lead-it", status: "planning" }
      ],
      rootArtifactIds: ["artifact-alpha"],
      sessionConsistencyFindings: [
        {
          code: "active_session_without_open_conversations",
          message:
            "Session 'session-alpha' on node 'worker-it' is active but has no active conversation ids and no open conversation records.",
          nodeId: "worker-it",
          severity: "warning"
        }
      ],
      sessionId: "session-alpha",
      traceIds: ["trace-alpha"],
      updatedAt: "2026-04-24T10:05:00.000Z",
      waitingApprovalIds: ["approval-alpha"]
    };

    expect(projectHostSessionSummary(session)).toMatchObject({
      activeConversationCount: 1,
      consistencyFindingCount: 1,
      conversationStatusCounts: createConversationStatusCounts({
        working: 1
      }),
      graphId: "team-alpha",
      label: "session-alpha · worker-it:active, lead-it:planning",
      latestMessageType: "task.result",
      recordedConversationCount: 1,
      rootArtifactCount: 1,
      sessionConsistencyFindings: [
        {
          code: "active_session_without_open_conversations",
          nodeId: "worker-it",
          severity: "warning"
        }
      ],
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
          conversationStatusCounts: createConversationStatusCounts({
            closed: 1,
            working: 1
          }),
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
          },
          sessionConsistencyFindings: [
            {
              code: "open_conversation_missing_active_reference",
              conversationId: "conv-beta",
              message:
                "Session 'session-alpha' on node 'worker-it' has open conversation 'conv-beta' in 'working' but it is missing from activeConversationIds.",
              nodeId: "worker-it",
              severity: "warning"
            }
          ]
        }
      ],
      sessionId: "session-alpha"
    };

    expect(projectHostSessionInspectionSummary(inspection)).toMatchObject({
      graphId: "team-alpha",
      nodes: [
        {
          activeConversationCount: 1,
          consistencyFindingCount: 1,
          conversationStatusCounts: createConversationStatusCounts({
            closed: 1,
            working: 1
          }),
          label: "worker-it · active",
          nodeId: "worker-it",
          recordedConversationCount: 2,
          rootArtifactCount: 1,
          runtimeState: "running/running",
          sessionConsistencyFindings: [
            {
              code: "open_conversation_missing_active_reference",
              conversationId: "conv-beta",
              nodeId: "worker-it",
              severity: "warning"
            }
          ],
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
    expect(projectHostSessionInspectionSummary(inspection).nodes[0]?.detail).toContain(
      "conversation statuses working 1, closed 1"
    );
    expect(projectHostSessionInspectionSummary(inspection).nodes[0]?.detail).toContain(
      "consistency findings 1: warning open_conversation_missing_active_reference on worker-it/conv-beta"
    );
  });
});
