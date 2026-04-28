import { describe, expect, it } from "vitest";
import type {
  HostProjectionSnapshot,
  UserConversationProjectionRecord,
  UserNodeIdentityRecord
} from "@entangle/types";
import {
  buildUserNodeRuntimeSummaries,
  formatRuntimeProjectionDetail,
  formatRuntimeProjectionLabel,
  formatAssignmentReceiptDetail,
  formatAssignmentReceiptLabel,
  formatUserConversationDetail,
  formatUserConversationLabel,
  formatUserNodeIdentityDetail,
  formatUserNodeIdentityLabel,
  formatUserNodeRuntimeSummaryDetail,
  formatUserNodeRuntimeSummaryLabel,
  sortRuntimeProjectionsForStudio,
  sortAssignmentReceiptsForStudio,
  sortUserConversationsForStudio,
  sortUserNodeIdentitiesForStudio,
  summarizeFederationProjection
} from "./federation-inspection.js";

const projection: HostProjectionSnapshot = {
  artifactRefs: [],
  assignmentReceipts: [
    {
      assignmentId: "assignment-alpha",
      hostAuthorityPubkey:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      observedAt: "2026-04-26T12:01:00.000Z",
      projection: {
        source: "observation_event",
        updatedAt: "2026-04-26T12:01:00.000Z"
      },
      receiptKind: "started",
      receiptMessage: "Assignment runtime is running.",
      runnerId: "runner-alpha",
      runnerPubkey:
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    }
  ],
  assignments: [
    {
      assignmentId: "assignment-alpha",
      graphId: "team-alpha",
      graphRevisionId: "rev-1",
      hostAuthorityPubkey:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      nodeId: "worker-it",
      projection: {
        source: "observation_event",
        updatedAt: "2026-04-26T12:00:00.000Z"
      },
      runnerId: "runner-alpha",
      status: "accepted"
    }
  ],
  freshness: "current",
  generatedAt: "2026-04-26T12:00:00.000Z",
  hostAuthorityPubkey:
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  runtimes: [
    {
      assignmentId: "assignment-alpha",
      backendKind: "federated",
      clientUrl: "http://127.0.0.1:4173/",
      desiredState: "running",
      graphId: "team-alpha",
      graphRevisionId: "rev-1",
      hostAuthorityPubkey:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      lastSeenAt: "2026-04-26T12:00:00.000Z",
      nodeId: "worker-it",
      observedState: "running",
      projection: {
        source: "observation_event",
        updatedAt: "2026-04-26T12:00:00.000Z"
      },
      restartGeneration: 0,
      runnerId: "runner-alpha",
      runtimeHandle: "federated:runner-alpha:assignment-alpha"
    },
    {
      assignmentId: "assignment-user-a",
      backendKind: "federated",
      clientUrl: "http://127.0.0.1:4174/",
      desiredState: "running",
      graphId: "team-alpha",
      graphRevisionId: "rev-1",
      hostAuthorityPubkey:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      lastSeenAt: "2026-04-26T12:03:00.000Z",
      nodeId: "user-a",
      observedState: "running",
      projection: {
        source: "observation_event",
        updatedAt: "2026-04-26T12:03:00.000Z"
      },
      restartGeneration: 0,
      runnerId: "runner-user-a",
      runtimeHandle: "federated:runner-user-a:assignment-user-a"
    }
  ],
  runners: [],
  schemaVersion: "1",
  sourceChangeRefs: [],
  userConversations: [],
  wikiRefs: []
};

const userNodes: UserNodeIdentityRecord[] = [
  {
    createdAt: "2026-04-26T12:00:00.000Z",
    gatewayIds: ["studio-main"],
    graphId: "team-alpha",
    hostAuthorityPubkey:
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    keyAlgorithm: "nostr_secp256k1",
    keyRef: "secret://user-nodes/team-alpha-user-b",
    nodeId: "user-b",
    publicKey: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    schemaVersion: "1",
    status: "active",
    updatedAt: "2026-04-26T12:00:00.000Z"
  },
  {
    createdAt: "2026-04-26T12:00:00.000Z",
    gatewayIds: [],
    graphId: "team-alpha",
    hostAuthorityPubkey:
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    keyAlgorithm: "nostr_secp256k1",
    keyRef: "secret://user-nodes/team-alpha-user-a",
    nodeId: "user-a",
    publicKey: "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    schemaVersion: "1",
    status: "active",
    updatedAt: "2026-04-26T12:00:00.000Z"
  }
];

const conversations: UserConversationProjectionRecord[] = [
  {
    artifactIds: [],
    conversationId: "conversation-old",
    graphId: "team-alpha",
    peerNodeId: "worker-a",
    pendingApprovalIds: [],
    projection: {
      source: "observation_event",
      updatedAt: "2026-04-26T12:00:00.000Z"
    },
    status: "opened",
    unreadCount: 0,
    userNodeId: "user-a"
  },
  {
    artifactIds: [],
    conversationId: "conversation-new",
    graphId: "team-alpha",
    lastMessageAt: "2026-04-26T12:05:00.000Z",
    lastReadAt: "2026-04-26T12:04:30.000Z",
    peerNodeId: "worker-b",
    pendingApprovalIds: ["approval-alpha"],
    projection: {
      source: "observation_event",
      updatedAt: "2026-04-26T12:04:00.000Z"
    },
    status: "opened",
    unreadCount: 2,
    userNodeId: "user-a"
  }
];

describe("Studio federation inspection helpers", () => {
  it("summarizes projection counts for operator panels", () => {
    expect(summarizeFederationProjection(projection)).toMatchObject({
      assignmentCount: 1,
      assignmentReceiptCount: 1,
      freshness: "current",
      runtimeCount: 2,
      runningRuntimeCount: 2
    });
  });

  it("sorts and formats assignment receipts", () => {
    const receipts = sortAssignmentReceiptsForStudio([
      {
        ...projection.assignmentReceipts[0]!,
        assignmentId: "assignment-old",
        observedAt: "2026-04-26T12:00:00.000Z"
      },
      projection.assignmentReceipts[0]!
    ]);

    expect(receipts.map((receipt) => receipt.assignmentId)).toEqual([
      "assignment-alpha",
      "assignment-old"
    ]);
    expect(formatAssignmentReceiptLabel(receipts[0]!)).toBe(
      "assignment-alpha · started"
    );
    expect(formatAssignmentReceiptDetail(receipts[0]!)).toContain(
      "runner runner-alpha"
    );
    expect(formatAssignmentReceiptDetail(receipts[0]!)).toContain(
      "Assignment runtime is running."
    );
  });

  it("sorts and formats runtime projections", () => {
    const sorted = sortRuntimeProjectionsForStudio([
      {
        ...projection.runtimes[0]!,
        nodeId: "worker-z"
      },
      projection.runtimes[0]!
    ]);

    expect(sorted.map((runtime) => runtime.nodeId)).toEqual([
      "worker-it",
      "worker-z"
    ]);
    expect(formatRuntimeProjectionLabel(projection.runtimes[0]!)).toBe(
      "worker-it · running"
    );
    expect(formatRuntimeProjectionDetail(projection.runtimes[0]!)).toContain(
      "runner runner-alpha"
    );
    expect(formatRuntimeProjectionDetail(projection.runtimes[0]!)).toContain(
      "client http://127.0.0.1:4173/"
    );
  });

  it("sorts and formats User Node conversations", () => {
    const sorted = sortUserConversationsForStudio(conversations);

    expect(sorted.map((conversation) => conversation.conversationId)).toEqual([
      "conversation-new",
      "conversation-old"
    ]);
    expect(formatUserConversationLabel(conversations[1]!)).toBe(
      "user-a to worker-b"
    );
    expect(formatUserConversationDetail(conversations[1]!)).toContain(
      "approvals 1"
    );
    expect(formatUserConversationDetail(conversations[1]!)).toContain(
      "read 2026-04-26T12:04:30.000Z"
    );
  });

  it("sorts and formats User Node identities", () => {
    const sorted = sortUserNodeIdentitiesForStudio(userNodes);

    expect(sorted.map((userNode) => userNode.nodeId)).toEqual([
      "user-a",
      "user-b"
    ]);
    expect(formatUserNodeIdentityLabel(userNodes[0]!)).toBe("user-b · active");
    expect(formatUserNodeIdentityDetail(userNodes[0]!)).toContain("gateways 1");
  });

  it("builds User Node runtime summaries for operator visibility", () => {
    const summaries = buildUserNodeRuntimeSummaries(userNodes, {
      ...projection,
      userConversations: conversations
    });
    const userSummary = summaries.find((summary) => summary.nodeId === "user-a");

    expect(userSummary).toMatchObject({
      activeConversationCount: 2,
      clientUrl: "http://127.0.0.1:4174/",
      conversationCount: 2,
      pendingApprovalCount: 1,
      runnerId: "runner-user-a",
      runtimeObservedState: "running",
      unreadCount: 2
    });
    expect(formatUserNodeRuntimeSummaryLabel(userSummary!)).toBe(
      "user-a · active · running"
    );
    expect(formatUserNodeRuntimeSummaryDetail(userSummary!)).toContain(
      "approvals 1"
    );
  });
});
