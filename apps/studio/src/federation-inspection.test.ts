import { describe, expect, it } from "vitest";
import type {
  HostProjectionSnapshot,
  UserConversationProjectionRecord,
  UserNodeIdentityRecord
} from "@entangle/types";
import {
  formatRuntimeProjectionDetail,
  formatRuntimeProjectionLabel,
  formatUserConversationDetail,
  formatUserConversationLabel,
  formatUserNodeIdentityDetail,
  formatUserNodeIdentityLabel,
  sortRuntimeProjectionsForStudio,
  sortUserConversationsForStudio,
  sortUserNodeIdentitiesForStudio,
  summarizeFederationProjection
} from "./federation-inspection.js";

const projection: HostProjectionSnapshot = {
  artifactRefs: [],
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
      freshness: "current",
      runtimeCount: 1,
      runningRuntimeCount: 1
    });
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
});
