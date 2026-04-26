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
});
