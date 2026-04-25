import { describe, expect, it } from "vitest";
import type {
  HostSessionSummary,
  SessionInspectionResponse
} from "@entangle/types";
import {
  collectHostSessionInspectionTraceIds,
  filterHostSessionsForNode,
  formatHostSessionConsistencyFinding,
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

function createApprovalStatusCounts(
  overrides: Partial<NonNullable<HostSessionSummary["approvalStatusCounts"]>>
): NonNullable<HostSessionSummary["approvalStatusCounts"]> {
  return {
    approved: 0,
    expired: 0,
    not_required: 0,
    pending: 0,
    rejected: 0,
    withdrawn: 0,
    ...overrides
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
    session.approvalStatusCounts = createApprovalStatusCounts({
      pending: 1
    });
    session.conversationStatusCounts = createConversationStatusCounts({
      working: 1
    });
    session.latestMessageType = "task.result";
    session.rootArtifactIds = ["artifact-alpha"];
    session.sessionConsistencyFindings = [
      {
        code: "active_conversation_missing_record",
        conversationId: "conv-missing",
        message:
          "Session 'session-alpha' on node 'worker-it' references active conversation 'conv-missing', but no conversation record exists.",
        nodeId: "worker-it",
        severity: "error"
      }
    ];
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
    expect(formatHostSessionDetail(session)).toContain(
      "recorded conversations 1"
    );
    expect(formatHostSessionDetail(session)).toContain(
      "conversation statuses working 1"
    );
    expect(formatHostSessionDetail(session)).toContain(
      "consistency findings 1: error active_conversation_missing_record on worker-it/conversation/conv-missing"
    );
    expect(formatHostSessionDetail(session)).toContain("approvals 1");
    expect(formatHostSessionDetail(session)).toContain("recorded approvals 1");
    expect(formatHostSessionDetail(session)).toContain(
      "approval statuses pending 1"
    );
    expect(formatHostSessionDetail(session)).toContain("root artifacts 1");
    expect(formatHostSessionDetail(session)).toContain(
      "latest message task.result"
    );
    expect(formatHostSessionDetail(session)).toContain("trace-session-alpha");
  });

  it("formats session-level consistency findings without synthetic conversation ids", () => {
    expect(
      formatHostSessionConsistencyFinding({
        code: "active_session_without_open_conversations",
        message:
          "Session 'session-alpha' on node 'worker-it' is active but has no active conversation ids and no open conversation records.",
        nodeId: "worker-it",
        severity: "warning"
      })
    ).toBe(
      "warning active_session_without_open_conversations on worker-it/session"
    );
  });

  it("formats approval-level consistency findings without pretending they are conversations", () => {
    expect(
      formatHostSessionConsistencyFinding({
        approvalId: "approval-alpha",
        code: "waiting_approval_missing_record",
        message:
          "Session 'session-alpha' on node 'worker-it' references waiting approval 'approval-alpha', but no approval record exists.",
        nodeId: "worker-it",
        severity: "error"
      })
    ).toBe(
      "error waiting_approval_missing_record on worker-it/approval/approval-alpha"
    );
  });

  it("formats selected session drilldown without inventing client state", () => {
    const inspection: SessionInspectionResponse = {
      graphId: "team-alpha",
      nodes: [
        {
          nodeId: "lead-it",
          conversationStatusCounts: createConversationStatusCounts({
            resolved: 1
          }),
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
          approvalStatusCounts: createApprovalStatusCounts({
            pending: 1
          }),
          conversationStatusCounts: createConversationStatusCounts({
            awaiting_approval: 1,
            working: 1
          }),
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
          },
          sessionConsistencyFindings: [
            {
              code: "open_conversation_missing_active_reference",
              conversationId: "conv-extra",
              message:
                "Session 'session-alpha' on node 'worker-it' has open conversation 'conv-extra' in 'working' but it is missing from activeConversationIds.",
              nodeId: "worker-it",
              severity: "warning"
            }
          ]
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
      "recorded conversations 2"
    );
    expect(formatHostSessionInspectionNodeDetail(workerEntry!)).toContain(
      "conversation statuses working 1, awaiting_approval 1"
    );
    expect(formatHostSessionInspectionNodeDetail(workerEntry!)).toContain(
      "consistency findings 1: warning open_conversation_missing_active_reference on worker-it/conversation/conv-extra"
    );
    expect(formatHostSessionInspectionNodeDetail(workerEntry!)).toContain(
      "approvals 1"
    );
    expect(formatHostSessionInspectionNodeDetail(workerEntry!)).toContain(
      "recorded approvals 1"
    );
    expect(formatHostSessionInspectionNodeDetail(workerEntry!)).toContain(
      "approval statuses pending 1"
    );
    expect(formatHostSessionInspectionNodeDetail(workerEntry!)).toContain(
      "last message task.result"
    );
  });
});
