import { describe, expect, it } from "vitest";
import type {
  HostSessionSummary,
  SessionInspectionResponse
} from "@entangle/types";
import {
  collectHostSessionInspectionTraceIds,
  filterHostSessionsForNode,
  formatHostSessionDetail,
  formatHostSessionInspectionNodeDetail,
  formatHostSessionInspectionNodeLabel,
  formatHostSessionLabel,
  sessionInspectionReferencesNode,
  sortHostSessionInspectionNodes,
  sortHostSessionSummariesForPresentation
} from "./runtime-session.js";

function createSession(
  sessionId: string,
  updatedAt: string,
  nodeStatuses: HostSessionSummary["nodeStatuses"]
): HostSessionSummary {
  return {
    activeConversationIds: [],
    graphId: "team-alpha",
    nodeIds: nodeStatuses.map((entry) => entry.nodeId),
    nodeStatuses,
    rootArtifactIds: [],
    sessionId,
    traceIds: [`trace-${sessionId}`],
    waitingApprovalIds: [],
    updatedAt
  };
}

describe("host session presentation helpers", () => {
  it("sorts and filters session summaries for operator presentation", () => {
    const sessions = [
      createSession("session-older", "2026-04-24T10:00:00.000Z", [
        { nodeId: "worker-it", status: "active" }
      ]),
      createSession("session-newer", "2026-04-24T11:00:00.000Z", [
        { nodeId: "worker-it", status: "synthesizing" }
      ]),
      createSession("session-foreign", "2026-04-24T12:00:00.000Z", [
        { nodeId: "worker-marketing", status: "active" }
      ])
    ];

    expect(
      sortHostSessionSummariesForPresentation(sessions).map(
        (session) => session.sessionId
      )
    ).toEqual(["session-foreign", "session-newer", "session-older"]);
    expect(
      filterHostSessionsForNode(sessions, "worker-it").map(
        (session) => session.sessionId
      )
    ).toEqual(["session-newer", "session-older"]);
  });

  it("formats summary labels and active-work detail", () => {
    const session = createSession("session-alpha", "2026-04-24T11:00:00.000Z", [
      { nodeId: "worker-it", status: "active" },
      { nodeId: "lead-it", status: "planning" }
    ]);
    session.activeConversationIds = ["conv-alpha"];
    session.latestMessageType = "task.result";
    session.rootArtifactIds = ["artifact-alpha"];
    session.waitingApprovalIds = ["approval-alpha"];

    expect(formatHostSessionLabel(session, "worker-it")).toBe(
      "session-alpha · active"
    );
    expect(formatHostSessionLabel(session)).toBe(
      "session-alpha · worker-it:active, lead-it:planning"
    );
    expect(formatHostSessionDetail(session)).toContain("lead-it:planning");
    expect(formatHostSessionDetail(session)).toContain(
      "active conversations 1"
    );
    expect(formatHostSessionDetail(session)).toContain("approvals 1");
    expect(formatHostSessionDetail(session)).toContain("root artifacts 1");
    expect(formatHostSessionDetail(session)).toContain(
      "latest message task.result"
    );
    expect(formatHostSessionDetail(session)).toContain("trace-session-alpha");
  });

  it("formats selected session drilldown without inventing client state", () => {
    const inspection: SessionInspectionResponse = {
      graphId: "team-alpha",
      nodes: [
        {
          nodeId: "lead-it",
          runtime: {
            backendKind: "docker",
            contextAvailable: true,
            desiredState: "running",
            graphId: "team-alpha",
            graphRevisionId: "team-alpha-20260424-000000",
            nodeId: "lead-it",
            observedState: "running",
            reconciliation: {
              findingCodes: [],
              state: "aligned"
            },
            restartGeneration: 1
          },
          session: {
            activeConversationIds: ["conv-lead"],
            graphId: "team-alpha",
            intent: "Review the latest patch set.",
            openedAt: "2026-04-24T10:00:00.000Z",
            ownerNodeId: "lead-it",
            rootArtifactIds: ["artifact-lead"],
            sessionId: "session-alpha",
            status: "planning",
            traceId: "trace-alpha",
            updatedAt: "2026-04-24T10:03:00.000Z",
            waitingApprovalIds: []
          }
        },
        {
          nodeId: "worker-it",
          runtime: {
            backendKind: "docker",
            contextAvailable: true,
            desiredState: "running",
            graphId: "team-alpha",
            graphRevisionId: "team-alpha-20260424-000000",
            nodeId: "worker-it",
            observedState: "running",
            reconciliation: {
              findingCodes: [],
              state: "aligned"
            },
            restartGeneration: 1
          },
          session: {
            activeConversationIds: ["conv-worker"],
            graphId: "team-alpha",
            intent: "Review the latest patch set.",
            lastMessageType: "task.result",
            openedAt: "2026-04-24T10:00:00.000Z",
            ownerNodeId: "worker-it",
            rootArtifactIds: ["artifact-worker"],
            sessionId: "session-alpha",
            status: "active",
            traceId: "trace-alpha",
            updatedAt: "2026-04-24T10:05:00.000Z",
            waitingApprovalIds: ["approval-worker"]
          }
        }
      ],
      sessionId: "session-alpha"
    };

    expect(sessionInspectionReferencesNode(inspection, "worker-it")).toBe(true);
    expect(sessionInspectionReferencesNode(inspection, "worker-marketing")).toBe(
      false
    );
    const sortedInspectionNodes = sortHostSessionInspectionNodes(
      inspection,
      "worker-it"
    );
    const [workerEntry] = sortedInspectionNodes;

    expect(sortedInspectionNodes.map((entry) => entry.nodeId)).toEqual([
      "worker-it",
      "lead-it"
    ]);
    expect(collectHostSessionInspectionTraceIds(inspection)).toEqual([
      "trace-alpha"
    ]);
    expect(workerEntry).toBeDefined();
    expect(formatHostSessionInspectionNodeLabel(workerEntry!, "worker-it")).toBe(
      "worker-it · active · selected runtime"
    );
    expect(formatHostSessionInspectionNodeLabel(workerEntry!)).toBe(
      "worker-it · active"
    );
    expect(formatHostSessionInspectionNodeDetail(workerEntry!)).toContain(
      "active conversations 1"
    );
    expect(formatHostSessionInspectionNodeDetail(workerEntry!)).toContain(
      "approvals 1"
    );
    expect(formatHostSessionInspectionNodeDetail(workerEntry!)).toContain(
      "last message task.result"
    );
  });
});
