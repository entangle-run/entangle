import { describe, expect, it } from "vitest";
import type {
  HostProjectionSnapshot,
  RuntimeAssignmentRecord,
  RuntimeCommandReceiptProjectionRecord,
  UserConversationProjectionRecord,
  UserNodeIdentityRecord,
  UserNodeMessageRecord
} from "@entangle/types";
import {
  attachUserNodeClientHealthForCli,
  buildUserNodeClientSummariesForCli,
  filterUserNodeAssignmentsForCli,
  filterUserConversationsForCli,
  filterUserNodeApprovalMessagesForCli,
  filterUserNodeMessagesForCli,
  filterUserNodeSourceReviewMessagesForCli,
  filterUserNodeClientSummariesForCli,
  filterUserNodeCommandReceiptsForCli,
  listCurrentUserNodeAssignmentsForCli,
  projectUserNodeCommandReceiptSummary,
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

const runtimeCommandReceipts: RuntimeCommandReceiptProjectionRecord[] = [
  {
    assignmentId: "assignment-worker-b",
    commandEventType: "runtime.wiki.publish",
    commandId: "cmd-user-a-wiki-publish",
    graphId: "team-alpha",
    hostAuthorityPubkey:
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    nodeId: "worker-b",
    observedAt: "2026-04-26T12:08:00.000Z",
    projection: {
      source: "observation_event",
      updatedAt: "2026-04-26T12:08:00.000Z"
    },
    receiptStatus: "completed",
    requestedBy: "user-a",
    runnerId: "runner-worker-b",
    runnerPubkey:
      "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    wikiArtifactId: "wiki-alpha"
  },
  {
    assignmentId: "assignment-worker-a",
    commandEventType: "runtime.artifact.restore",
    commandId: "cmd-user-a-artifact-restore",
    graphId: "team-alpha",
    hostAuthorityPubkey:
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    nodeId: "worker-a",
    observedAt: "2026-04-26T12:07:00.000Z",
    projection: {
      source: "observation_event",
      updatedAt: "2026-04-26T12:07:00.000Z"
    },
    receiptStatus: "failed",
    requestedBy: "user-a",
    runnerId: "runner-worker-a",
    runnerPubkey:
      "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
  },
  {
    assignmentId: "assignment-worker-b",
    commandEventType: "runtime.wiki.publish",
    commandId: "cmd-user-b-wiki-publish",
    graphId: "team-alpha",
    hostAuthorityPubkey:
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    nodeId: "worker-b",
    observedAt: "2026-04-26T12:09:00.000Z",
    projection: {
      source: "observation_event",
      updatedAt: "2026-04-26T12:09:00.000Z"
    },
    receiptStatus: "completed",
    requestedBy: "user-b",
    runnerId: "runner-worker-b",
    runnerPubkey:
      "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
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
  runtimeCommandReceipts,
  runners: [],
  schemaVersion: "1",
  sourceChangeRefs: [],
  sourceHistoryRefs: [],
  sourceHistoryReplays: [],
  userConversations: conversations,
  wikiRefs: []
};

const assignments: RuntimeAssignmentRecord[] = [
  {
    acceptedAt: "2026-04-26T12:01:00.000Z",
    assignmentId: "assignment-active",
    assignmentRevision: 0,
    graphId: "team-alpha",
    graphRevisionId: "graph-revision-alpha",
    hostAuthorityPubkey:
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    lease: {
      expiresAt: "2026-04-26T13:01:00.000Z",
      issuedAt: "2026-04-26T12:01:00.000Z",
      leaseId: "lease-active",
      renewBy: "2026-04-26T12:51:00.000Z"
    },
    nodeId: "user-a",
    offeredAt: "2026-04-26T12:00:00.000Z",
    runnerId: "runner-user-a",
    runnerPubkey:
      "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    runtimeKind: "human_interface",
    schemaVersion: "1",
    status: "active",
    updatedAt: "2026-04-26T12:01:00.000Z"
  },
  {
    assignmentId: "assignment-revoked",
    assignmentRevision: 0,
    graphId: "team-alpha",
    graphRevisionId: "graph-revision-alpha",
    hostAuthorityPubkey:
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    nodeId: "user-a",
    offeredAt: "2026-04-26T11:00:00.000Z",
    revokedAt: "2026-04-26T11:30:00.000Z",
    runnerId: "runner-old",
    runnerPubkey:
      "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    runtimeKind: "human_interface",
    schemaVersion: "1",
    status: "revoked",
    updatedAt: "2026-04-26T11:30:00.000Z"
  },
  {
    assignmentId: "assignment-offered",
    assignmentRevision: 0,
    graphId: "team-alpha",
    graphRevisionId: "graph-revision-alpha",
    hostAuthorityPubkey:
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    nodeId: "user-a",
    offeredAt: "2026-04-26T12:02:00.000Z",
    runnerId: "runner-user-b",
    runnerPubkey:
      "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    runtimeKind: "human_interface",
    schemaVersion: "1",
    status: "offered",
    updatedAt: "2026-04-26T12:02:00.000Z"
  },
  {
    assignmentId: "assignment-worker",
    assignmentRevision: 0,
    graphId: "team-alpha",
    graphRevisionId: "graph-revision-alpha",
    hostAuthorityPubkey:
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    nodeId: "worker-a",
    offeredAt: "2026-04-26T12:03:00.000Z",
    runnerId: "runner-worker-a",
    runnerPubkey:
      "9999999999999999999999999999999999999999999999999999999999999999",
    runtimeKind: "agent_runner",
    schemaVersion: "1",
    status: "offered",
    updatedAt: "2026-04-26T12:03:00.000Z"
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
      lastReadAt: "2026-04-26T12:04:30.000Z",
      pendingApprovalCount: 1,
      unreadCount: 2,
      userNodeId: "user-a"
    });
  });

  it("filters User Node conversations by unread state and peer node", () => {
    expect(
      filterUserConversationsForCli({
        conversations,
        peerNodeId: "worker-b",
        unreadOnly: true
      }).map((conversation) => conversation.conversationId)
    ).toEqual(["conversation-new"]);
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
        commandReceiptCount: 2,
        conversationCount: 2,
        desiredState: "running",
        failedCommandReceiptCount: 1,
        graphId: "team-alpha",
        identityStatus: "active",
        lastMessageAt: "2026-04-26T12:05:00.000Z",
        lastSeenAt: "2026-04-26T12:05:30.000Z",
        nodeId: "user-a",
        observedState: "running",
        pendingApprovalCount: 1,
        publicKey:
          "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        runnerId: "runner-human-a",
        statusMessage: "Human Interface Runtime listening",
        unreadCount: 2,
        updatedAt: "2026-04-26T12:05:30.000Z"
      },
      {
        commandReceiptCount: 1,
        conversationCount: 0,
        failedCommandReceiptCount: 0,
        graphId: "team-alpha",
        identityStatus: "active",
        nodeId: "user-b",
        observedState: "unassigned",
        pendingApprovalCount: 0,
        publicKey:
          "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        unreadCount: 0
      }
    ]);
  });

  it("filters User Client summaries by selected User Node id", () => {
    const summaries = buildUserNodeClientSummariesForCli({
      projection,
      userNodes
    });

    expect(
      filterUserNodeClientSummariesForCli({
        nodeId: "user-a",
        summaries
      }).map((summary) => summary.nodeId)
    ).toEqual(["user-a"]);
  });

  it("attaches operator-side User Client health checks", async () => {
    const healthUrls: string[] = [];
    const signals: (AbortSignal | undefined)[] = [];
    const summaries = buildUserNodeClientSummariesForCli({
      projection,
      userNodes
    });
    const checked = await attachUserNodeClientHealthForCli({
      fetchImpl: (url, init) => {
        healthUrls.push(url);
        signals.push(init?.signal);

        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: "OK"
        });
      },
      now: () => "2026-04-26T12:10:00.000Z",
      summaries
    });

    expect(healthUrls).toEqual(["http://127.0.0.1:4301/health"]);
    expect(signals[0]).toBeInstanceOf(AbortSignal);
    expect(checked[0]?.clientHealth).toEqual({
      checkedAt: "2026-04-26T12:10:00.000Z",
      ok: true,
      statusCode: 200,
      statusText: "OK",
      url: "http://127.0.0.1:4301/health"
    });
    expect(checked[1]?.clientHealth).toEqual({
      checkedAt: "2026-04-26T12:10:00.000Z",
      error: "missing clientUrl",
      ok: false
    });
  });

  it("captures failed User Client health checks without throwing", async () => {
    const summaries = buildUserNodeClientSummariesForCli({
      projection,
      userNodes
    });
    const checked = await attachUserNodeClientHealthForCli({
      fetchImpl: () => Promise.reject(new Error("connection refused")),
      now: () => "2026-04-26T12:10:00.000Z",
      summaries: summaries.slice(0, 1)
    });

    expect(checked[0]?.clientHealth).toEqual({
      checkedAt: "2026-04-26T12:10:00.000Z",
      error: "connection refused",
      ok: false,
      url: "http://127.0.0.1:4301/health"
    });
  });

  it("bounds User Client health probes with a timeout", async () => {
    const summaries = buildUserNodeClientSummariesForCli({
      projection,
      userNodes
    });
    const checked = await attachUserNodeClientHealthForCli({
      fetchImpl: (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new Error("aborted"));
          });
        }),
      now: () => "2026-04-26T12:10:00.000Z",
      summaries: summaries.slice(0, 1),
      timeoutMs: 1
    });

    expect(checked[0]?.clientHealth).toEqual({
      checkedAt: "2026-04-26T12:10:00.000Z",
      error: "User Client health check timed out after 1ms.",
      ok: false,
      url: "http://127.0.0.1:4301/health"
    });
  });

  it("finds current User Node assignments for explicit reassignment", () => {
    expect(
      listCurrentUserNodeAssignmentsForCli({
        assignments,
        nodeId: "user-a"
      }).map((assignment) => assignment.assignmentId)
    ).toEqual(["assignment-active", "assignment-offered"]);
  });

  it("filters User Node assignments for focused reassignment inspection", () => {
    expect(
      filterUserNodeAssignmentsForCli({
        assignments,
        nodeId: "user-a"
      }).map((assignment) => assignment.assignmentId)
    ).toEqual([
      "assignment-active",
      "assignment-offered",
      "assignment-revoked"
    ]);

    expect(
      filterUserNodeAssignmentsForCli({
        assignments,
        currentOnly: true,
        nodeId: "user-a"
      }).map((assignment) => assignment.assignmentId)
    ).toEqual(["assignment-active", "assignment-offered"]);
  });

  it("filters projected command receipts to one User Node requester", () => {
    const receipts = filterUserNodeCommandReceiptsForCli({
      receipts: runtimeCommandReceipts,
      receiptStatus: "completed",
      userNodeId: "user-a"
    });

    expect(receipts.map((receipt) => receipt.commandId)).toEqual([
      "cmd-user-a-wiki-publish"
    ]);
    expect(projectUserNodeCommandReceiptSummary(receipts[0]!)).toMatchObject({
      commandEventType: "runtime.wiki.publish",
      commandId: "cmd-user-a-wiki-publish",
      nodeId: "worker-b",
      receiptStatus: "completed",
      wikiArtifactId: "wiki-alpha"
    });
    expect(
      filterUserNodeCommandReceiptsForCli({
        commandEventType: "runtime.wiki.publish",
        nodeId: "worker-b",
        receipts: runtimeCommandReceipts,
        userNodeId: "user-a"
      }).map((receipt) => receipt.commandId)
    ).toEqual(["cmd-user-a-wiki-publish"]);
  });

  it("projects User Node wiki conflict command receipts", () => {
    expect(
      projectUserNodeCommandReceiptSummary({
        assignmentId: "assignment-worker-b",
        commandEventType: "runtime.wiki.upsert_page",
        commandId: "cmd-user-a-wiki-conflict",
        graphId: "team-alpha",
        hostAuthorityPubkey:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        nodeId: "worker-b",
        observedAt: "2026-05-05T12:00:00.000Z",
        projection: {
          source: "observation_event",
          updatedAt: "2026-05-05T12:00:00.000Z"
        },
        receiptStatus: "failed",
        requestedBy: "user-a",
        runnerId: "runner-worker-b",
        runnerPubkey:
          "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        targetPath: "wiki/summaries/working-context.md",
        wikiPageExpectedSha256:
          "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        wikiPagePath: "wiki/summaries/working-context.md",
        wikiPagePreviousSha256:
          "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
      })
    ).toMatchObject({
      commandId: "cmd-user-a-wiki-conflict",
      wikiConflict: {
        currentShort: "eeeeeeeeeeee",
        expectedShort: "cccccccccccc",
        path: "wiki/summaries/working-context.md"
      },
      wikiPagePath: "wiki/summaries/working-context.md"
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

  it("filters recorded User Node messages for CLI conversation detail", () => {
    const messages: UserNodeMessageRecord[] = [
      {
        artifactRefs: [],
        conversationId: "conversation-alpha",
        createdAt: "2026-04-26T12:00:00.000Z",
        direction: "outbound",
        eventId:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        fromNodeId: "user-a",
        fromPubkey:
          "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        messageType: "answer",
        peerNodeId: "worker-it",
        publishedRelays: [],
        relayUrls: [],
        schemaVersion: "1",
        sessionId: "session-alpha",
        summary: "Reply.",
        toNodeId: "worker-it",
        toPubkey:
          "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        turnId: "turn-alpha",
        userNodeId: "user-a"
      },
      {
        artifactRefs: [],
        conversationId: "conversation-alpha",
        createdAt: "2026-04-26T12:02:00.000Z",
        direction: "inbound",
        eventId:
          "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        fromNodeId: "worker-it",
        fromPubkey:
          "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        messageType: "task.result",
        peerNodeId: "worker-it",
        publishedRelays: [],
        relayUrls: [],
        schemaVersion: "1",
        sessionId: "session-alpha",
        summary: "Done.",
        toNodeId: "user-a",
        toPubkey:
          "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        turnId: "turn-alpha",
        userNodeId: "user-a"
      },
      {
        artifactRefs: [],
        conversationId: "conversation-alpha",
        createdAt: "2026-04-26T12:01:00.000Z",
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
    ];

    expect(
      filterUserNodeMessagesForCli({
        direction: "inbound",
        limit: 1,
        messages
      }).map((message) => message.eventId)
    ).toEqual([
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    ]);
    expect(
      filterUserNodeMessagesForCli({
        messageType: "approval.request",
        messages
      }).map((message) => message.eventId)
    ).toEqual([
      "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"
    ]);
  });

  it("filters approval request messages for the headless User Node inbox", () => {
    const messages: UserNodeMessageRecord[] = [
      {
        artifactRefs: [],
        conversationId: "conversation-alpha",
        createdAt: "2026-04-26T12:00:00.000Z",
        direction: "inbound",
        eventId:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        fromNodeId: "worker-it",
        fromPubkey:
          "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        messageType: "approval.request",
        peerNodeId: "worker-it",
        publishedRelays: [],
        relayUrls: [],
        schemaVersion: "1",
        sessionId: "session-alpha",
        summary: "Please approve old work.",
        toNodeId: "user-a",
        toPubkey:
          "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        turnId: "turn-alpha",
        userNodeId: "user-a"
      },
      {
        approval: {
          approvalId: "approval-source-alpha",
          approverNodeIds: ["user-a"],
          operation: "source_application",
          resource: {
            id: "source-change-alpha",
            kind: "source_change_candidate",
            label: "Source change alpha"
          }
        },
        artifactRefs: [],
        conversationId: "conversation-alpha",
        createdAt: "2026-04-26T12:02:00.000Z",
        direction: "inbound",
        eventId:
          "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        fromNodeId: "worker-it",
        fromPubkey:
          "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        messageType: "approval.request",
        peerNodeId: "worker-it",
        publishedRelays: [],
        relayUrls: [],
        schemaVersion: "1",
        sessionId: "session-alpha",
        summary: "Please approve source.",
        toNodeId: "user-a",
        toPubkey:
          "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        turnId: "turn-alpha",
        userNodeId: "user-a"
      },
      {
        artifactRefs: [],
        conversationId: "conversation-alpha",
        createdAt: "2026-04-26T12:03:00.000Z",
        direction: "outbound",
        eventId:
          "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        fromNodeId: "user-a",
        fromPubkey:
          "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        messageType: "approval.response",
        peerNodeId: "worker-it",
        publishedRelays: [],
        relayUrls: [],
        schemaVersion: "1",
        sessionId: "session-alpha",
        summary: "Approved.",
        toNodeId: "worker-it",
        toPubkey:
          "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        turnId: "turn-alpha",
        userNodeId: "user-a"
      }
    ];

    const approvals = filterUserNodeApprovalMessagesForCli({
      limit: 1,
      messages
    });

    expect(approvals.map((message) => message.eventId)).toEqual([
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    ]);
    expect(projectUserNodeMessageSummary(approvals[0]!)).toMatchObject({
      approvalId: "approval-source-alpha",
      approvalOperation: "source_application",
      approvalResourceId: "source-change-alpha",
      approvalResourceKind: "source_change_candidate",
      messageType: "approval.request"
    });
  });

  it("filters source review request messages for the headless User Node inbox", () => {
    const messages: UserNodeMessageRecord[] = [
      {
        approval: {
          approvalId: "approval-generic-alpha",
          approverNodeIds: ["user-a"],
          operation: "tool_execution",
          resource: {
            id: "artifact-alpha",
            kind: "artifact",
            label: "Artifact alpha"
          }
        },
        artifactRefs: [],
        conversationId: "conversation-alpha",
        createdAt: "2026-04-26T12:00:00.000Z",
        direction: "inbound",
        eventId:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        fromNodeId: "worker-it",
        fromPubkey:
          "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        messageType: "approval.request",
        peerNodeId: "worker-it",
        publishedRelays: [],
        relayUrls: [],
        schemaVersion: "1",
        sessionId: "session-alpha",
        summary: "Approve artifact.",
        toNodeId: "user-a",
        toPubkey:
          "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        turnId: "turn-alpha",
        userNodeId: "user-a"
      },
      {
        approval: {
          approvalId: "approval-source-alpha",
          approverNodeIds: ["user-a"],
          operation: "source_application",
          resource: {
            id: "source-change-alpha",
            kind: "source_change_candidate",
            label: "Source change alpha"
          }
        },
        artifactRefs: [],
        conversationId: "conversation-alpha",
        createdAt: "2026-04-26T12:01:00.000Z",
        direction: "inbound",
        eventId:
          "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        fromNodeId: "worker-it",
        fromPubkey:
          "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        messageType: "approval.request",
        peerNodeId: "worker-it",
        publishedRelays: [],
        relayUrls: [],
        schemaVersion: "1",
        sessionId: "session-alpha",
        summary: "Review source.",
        toNodeId: "user-a",
        toPubkey:
          "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        turnId: "turn-alpha",
        userNodeId: "user-a"
      }
    ];

    expect(
      filterUserNodeSourceReviewMessagesForCli({ messages }).map(
        (message) => message.eventId
      )
    ).toEqual([
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    ]);
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
