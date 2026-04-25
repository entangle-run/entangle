import { describe, expect, it } from "vitest";
import type {
  HostSessionSummary,
  SessionInspectionResponse
} from "@entangle/types";
import {
  collectSessionInspectionTraceIds,
  filterRuntimeSessions,
  formatSessionInspectionNodeDetail,
  formatSessionInspectionNodeLabel,
  formatRuntimeSessionDetail,
  formatRuntimeSessionLabel,
  sessionInspectionReferencesRuntime,
  sortSessionInspectionNodes
} from "./runtime-session-inspection.js";

function createSession(
  sessionId: string,
  updatedAt: string,
  nodeStatus: HostSessionSummary["nodeStatuses"]
): HostSessionSummary {
  return {
    activeConversationIds: [],
    graphId: "team-alpha",
    nodeIds: nodeStatus.map((entry) => entry.nodeId),
    nodeStatuses: nodeStatus,
    rootArtifactIds: [],
    sessionId,
    traceIds: [`trace-${sessionId}`],
    waitingApprovalIds: [],
    updatedAt
  };
}

describe("studio runtime session inspection helpers", () => {
  it("filters sessions for one runtime and sorts them by recency", () => {
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

    expect(filterRuntimeSessions(sessions, "worker-it").map((session) => session.sessionId)).toEqual([
      "session-newer",
      "session-older"
    ]);
  });

  it("formats session labels and detail summaries", () => {
    const session = createSession("session-alpha", "2026-04-24T11:00:00.000Z", [
      { nodeId: "worker-it", status: "active" },
      { nodeId: "lead-it", status: "planning" }
    ]);
    session.activeConversationIds = ["conv-alpha"];
    session.latestMessageType = "task.result";
    session.rootArtifactIds = ["artifact-alpha"];
    session.waitingApprovalIds = ["approval-alpha"];

    expect(formatRuntimeSessionLabel(session, "worker-it")).toBe(
      "session-alpha · active"
    );
    expect(formatRuntimeSessionDetail(session)).toContain("lead-it:planning");
    expect(formatRuntimeSessionDetail(session)).toContain(
      "active conversations 1"
    );
    expect(formatRuntimeSessionDetail(session)).toContain("approvals 1");
    expect(formatRuntimeSessionDetail(session)).toContain("root artifacts 1");
    expect(formatRuntimeSessionDetail(session)).toContain(
      "latest message task.result"
    );
    expect(formatRuntimeSessionDetail(session)).toContain("trace-session-alpha");
  });

  it("supports selected session drilldown helpers without inventing client state", () => {
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

    expect(sessionInspectionReferencesRuntime(inspection, "worker-it")).toBe(true);
    expect(sessionInspectionReferencesRuntime(inspection, "worker-marketing")).toBe(
      false
    );
    const sortedInspectionNodes = sortSessionInspectionNodes(inspection, "worker-it");
    const [workerEntry] = sortedInspectionNodes;

    expect(sortedInspectionNodes.map((entry) => entry.nodeId)).toEqual([
      "worker-it",
      "lead-it"
    ]);
    expect(collectSessionInspectionTraceIds(inspection)).toEqual(["trace-alpha"]);
    expect(workerEntry).toBeDefined();
    expect(formatSessionInspectionNodeLabel(workerEntry!, "worker-it")).toBe(
      "worker-it · active · selected runtime"
    );
    expect(formatSessionInspectionNodeDetail(workerEntry!)).toContain(
      "active conversations 1"
    );
    expect(formatSessionInspectionNodeDetail(workerEntry!)).toContain("approvals 1");
    expect(formatSessionInspectionNodeDetail(workerEntry!)).toContain(
      "last message task.result"
    );
  });
});
