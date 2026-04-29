import { describe, expect, it } from "vitest";
import type {
  HostProjectionSnapshot,
  UserConversationProjectionRecord,
  UserNodeIdentityRecord,
  UserNodeMessageRecord
} from "@entangle/types";
import {
  buildUserNodeClientSummariesForCli,
  projectUserConversationSummary,
  projectUserNodeIdentitySummary,
  projectUserNodeMessageSummary,
  projectUserNodeMessagePublishSummary,
  sortUserConversationsForCli,
  sortUserNodeIdentitiesForCli
} from "./user-node-output.js";
import {
  buildUserNodeApprovalPublishRequestFromMessage,
  buildUserNodeApprovalMetadata,
  buildUserNodeSourceChangeReviewPublishRequestFromMessage,
  hasUserNodeApprovalContextOptions
} from "./user-node-message-command.js";

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
    updatedAt: "2026-04-26T12:01:00.000Z"
  }
];

const conversations: UserConversationProjectionRecord[] = [
  {
    conversationId: "conversation-old",
    graphId: "team-alpha",
    peerNodeId: "worker-a",
    pendingApprovalIds: [],
    projection: {
      source: "observation_event",
      updatedAt: "2026-04-26T12:00:00.000Z"
    },
    unreadCount: 0,
    userNodeId: "user-a"
  },
  {
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
    unreadCount: 2,
    userNodeId: "user-a"
  }
];

const projection: HostProjectionSnapshot = {
  artifactRefs: [],
  assignmentReceipts: [],
  assignments: [],
  freshness: "current",
  generatedAt: "2026-04-26T12:06:00.000Z",
  hostAuthorityPubkey:
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  runtimes: [
    {
      assignmentId: "assignment-user-a",
      backendKind: "federated",
      clientUrl: "http://127.0.0.1:4301/",
      desiredState: "running",
      graphId: "team-alpha",
      graphRevisionId: "graph-revision-alpha",
      hostAuthorityPubkey:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      lastSeenAt: "2026-04-26T12:05:30.000Z",
      nodeId: "user-a",
      observedState: "running",
      projection: {
        source: "observation_event",
        updatedAt: "2026-04-26T12:05:30.000Z"
      },
      restartGeneration: 0,
      runnerId: "runner-human-a",
      statusMessage: "Human Interface Runtime listening"
    }
  ],
  runners: [],
  schemaVersion: "1",
  sourceChangeRefs: [],
  sourceHistoryRefs: [],
  sourceHistoryReplays: [],
  userConversations: conversations,
  wikiRefs: []
};

describe("user node CLI output", () => {
  it("sorts and projects User Node conversation projection records", () => {
    expect(
      sortUserConversationsForCli(conversations).map(
        (item) => item.conversationId
      )
    ).toEqual(["conversation-new", "conversation-old"]);
    expect(projectUserConversationSummary(conversations[1]!)).toMatchObject({
      conversationId: "conversation-new",
      lastReadAt: "2026-04-26T12:04:30.000Z",
      pendingApprovalCount: 1,
      unreadCount: 2,
      userNodeId: "user-a"
    });
  });

  it("sorts User Nodes and projects compact summaries", () => {
    expect(sortUserNodeIdentitiesForCli(userNodes).map((item) => item.nodeId))
      .toEqual(["user-a", "user-b"]);
    expect(projectUserNodeIdentitySummary(userNodes[0]!)).toMatchObject({
      gatewayCount: 1,
      nodeId: "user-b",
      status: "active"
    });
  });

  it("joins User Node identities with projected User Client runtimes", () => {
    expect(
      buildUserNodeClientSummariesForCli({
        projection,
        userNodes
      })
    ).toEqual([
      {
        assignmentId: "assignment-user-a",
        clientUrl: "http://127.0.0.1:4301/",
        desiredState: "running",
        graphId: "team-alpha",
        identityStatus: "active",
        lastSeenAt: "2026-04-26T12:05:30.000Z",
        nodeId: "user-a",
        observedState: "running",
        publicKey:
          "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        runnerId: "runner-human-a",
        statusMessage: "Human Interface Runtime listening",
        updatedAt: "2026-04-26T12:05:30.000Z"
      },
      {
        graphId: "team-alpha",
        identityStatus: "active",
        nodeId: "user-b",
        observedState: "unassigned",
        publicKey:
          "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
      }
    ]);
  });

  it("projects published User Node messages", () => {
    expect(
      projectUserNodeMessagePublishSummary({
        conversationId: "conversation-alpha",
        eventId:
          "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        fromNodeId: "user-a",
        fromPubkey:
          "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        messageType: "approval.response",
        publishedRelays: ["ws://localhost:7777"],
        relayUrls: ["ws://localhost:7777"],
        sessionId: "session-alpha",
        signerPubkey:
          "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        targetNodeId: "worker-it",
        toPubkey:
          "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        turnId: "turn-alpha"
      })
    ).toMatchObject({
      eventId: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      fromNodeId: "user-a",
      messageType: "approval.response",
      publishedRelayCount: 1,
      signerMatchesFromPubkey: true,
      signerPubkey:
        "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
    });
  });

  it("projects recorded User Node messages with signer audit state", () => {
    expect(
      projectUserNodeMessageSummary({
        artifactRefs: [],
        conversationId: "conversation-alpha",
        createdAt: "2026-04-29T12:00:00.000Z",
        direction: "inbound",
        eventId:
          "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        fromNodeId: "worker-it",
        fromPubkey:
          "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        messageType: "approval.request",
        peerNodeId: "worker-it",
        publishedRelays: [],
        relayUrls: [],
        schemaVersion: "1",
        sessionId: "session-alpha",
        signerPubkey:
          "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        summary: "Please approve.",
        toNodeId: "user-a",
        toPubkey:
          "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        turnId: "turn-alpha",
        userNodeId: "user-a"
      })
    ).toMatchObject({
      direction: "inbound",
      eventId: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      signerMatchesFromPubkey: true,
      signerPubkey:
        "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
    });
  });

  it("builds scoped approval response metadata from CLI options", () => {
    expect(
      buildUserNodeApprovalMetadata({
        approvalId: "approval-source-alpha",
        decision: "approved",
        options: {
          approvalOperation: "source_application",
          approvalReason: "Reviewed source diff.",
          approvalResourceId: "source-change-alpha",
          approvalResourceKind: "source_change_candidate",
          approvalResourceLabel: "Source change alpha"
        }
      })
    ).toEqual({
      approvalId: "approval-source-alpha",
      decision: "approved",
      operation: "source_application",
      reason: "Reviewed source diff.",
      resource: {
        id: "source-change-alpha",
        kind: "source_change_candidate",
        label: "Source change alpha"
      }
    });
  });

  it("validates approval context options for User Node CLI messages", () => {
    expect(
      hasUserNodeApprovalContextOptions({
        approvalResourceId: "source-change-alpha"
      })
    ).toBe(true);
    expect(hasUserNodeApprovalContextOptions({})).toBe(false);
    expect(() =>
      buildUserNodeApprovalMetadata({
        approvalId: "approval-source-alpha",
        decision: "approved",
        options: {
          approvalResourceId: "source-change-alpha"
        }
      })
    ).toThrow(
      "Approval resource context requires both --approval-resource-id and --approval-resource-kind."
    );
    expect(() =>
      buildUserNodeApprovalMetadata({
        approvalId: "approval-source-alpha",
        decision: "approved",
        options: {
          approvalOperation: "delete_everything"
        }
      })
    ).toThrow();
    expect(() =>
      buildUserNodeApprovalMetadata({
        approvalId: "approval-source-alpha",
        decision: "approved",
        options: {
          approvalResourceId: "source-change-alpha",
          approvalResourceKind: "made_up_resource"
        }
      })
    ).toThrow();
  });

  it("builds approval responses from recorded approval request messages", () => {
    const message: UserNodeMessageRecord = {
      approval: {
        approvalId: "approval-source-alpha",
        approverNodeIds: ["user-a"],
        operation: "source_application",
        reason: "Review source change.",
        resource: {
          id: "source-change-alpha",
          kind: "source_change_candidate",
          label: "Source change alpha"
        }
      },
      artifactRefs: [],
      conversationId: "conversation-alpha",
      createdAt: "2026-04-26T12:00:00.000Z",
      direction: "inbound",
      eventId: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      fromNodeId: "worker-it",
      fromPubkey:
        "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      messageType: "approval.request",
      peerNodeId: "worker-it",
      publishedRelays: [],
      relayUrls: [],
      schemaVersion: "1",
      sessionId: "session-alpha",
      summary: "Please approve.",
      toNodeId: "user-a",
      toPubkey:
        "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      turnId: "turn-alpha",
      userNodeId: "user-a"
    };
    const request = buildUserNodeApprovalPublishRequestFromMessage({
      decision: "approved",
      message
    });

    expect(request).toMatchObject({
      approval: {
        approvalId: "approval-source-alpha",
        decision: "approved",
        operation: "source_application",
        reason: "Review source change.",
        resource: {
          id: "source-change-alpha",
          kind: "source_change_candidate"
        }
      },
      conversationId: "conversation-alpha",
      messageType: "approval.response",
      parentMessageId:
        "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      sessionId: "session-alpha",
      targetNodeId: "worker-it",
      turnId: "turn-alpha"
    });

    expect(
      buildUserNodeSourceChangeReviewPublishRequestFromMessage({
        decision: "accepted",
        message,
        reason: "Looks correct."
      })
    ).toMatchObject({
      conversationId: "conversation-alpha",
      messageType: "source_change.review",
      parentMessageId:
        "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      responsePolicy: {
        closeOnResult: false,
        maxFollowups: 0,
        responseRequired: false
      },
      sessionId: "session-alpha",
      sourceChangeReview: {
        candidateId: "source-change-alpha",
        decision: "accepted",
        reason: "Looks correct."
      },
      targetNodeId: "worker-it",
      turnId: "turn-alpha"
    });
  });
});
