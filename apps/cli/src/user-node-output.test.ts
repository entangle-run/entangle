import { describe, expect, it } from "vitest";
import type {
  UserConversationProjectionRecord,
  UserNodeIdentityRecord
} from "@entangle/types";
import {
  projectUserConversationSummary,
  projectUserNodeIdentitySummary,
  projectUserNodeMessagePublishSummary,
  sortUserConversationsForCli,
  sortUserNodeIdentitiesForCli
} from "./user-node-output.js";
import {
  buildUserNodeApprovalPublishRequestFromMessage,
  buildUserNodeApprovalMetadata,
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

describe("user node CLI output", () => {
  it("sorts and projects User Node conversation projection records", () => {
    expect(
      sortUserConversationsForCli(conversations).map(
        (item) => item.conversationId
      )
    ).toEqual(["conversation-new", "conversation-old"]);
    expect(projectUserConversationSummary(conversations[1]!)).toMatchObject({
      conversationId: "conversation-new",
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
        targetNodeId: "worker-it",
        toPubkey:
          "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        turnId: "turn-alpha"
      })
    ).toMatchObject({
      eventId: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      fromNodeId: "user-a",
      messageType: "approval.response",
      publishedRelayCount: 1
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
    const request = buildUserNodeApprovalPublishRequestFromMessage({
      decision: "approved",
      message: {
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
        summary: "Please approve.",
        toNodeId: "user-a",
        toPubkey:
          "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        turnId: "turn-alpha",
        userNodeId: "user-a"
      }
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
  });
});
