import { describe, expect, it } from "vitest";
import type {
  HostProjectionSnapshot,
  RuntimeAssignmentTimelineResponse,
  RunnerRegistryEntry,
  UserConversationProjectionRecord,
  UserNodeIdentityRecord
} from "@entangle/types";
import {
  buildAssignmentOperationalDetailsForStudio,
  buildAssignmentRelatedNavigationForStudio,
  buildUserNodeRuntimeSummaries,
  canRevokeRunnerProjection,
  canTrustRunnerProjection,
  formatRuntimeAssignmentTimelineDetail,
  formatRuntimeAssignmentTimelineLabel,
  formatRuntimeProjectionDetail,
  formatRuntimeProjectionLabel,
  formatAssignmentReceiptDetail,
  formatAssignmentReceiptLabel,
  formatRuntimeCommandReceiptDetail,
  formatRuntimeCommandReceiptLabel,
  formatRunnerProjectionDetail,
  formatRunnerProjectionLabel,
  formatUserConversationDetail,
  formatUserConversationLabel,
  formatUserNodeIdentityDetail,
  formatUserNodeIdentityLabel,
  formatUserNodeRuntimeSummaryDetail,
  formatUserNodeRuntimeSummaryLabel,
  sortRuntimeCommandReceiptsForStudio,
  sortRuntimeProjectionsForStudio,
  sortRunnerProjectionsForStudio,
  sortAssignmentReceiptsForStudio,
  sortRuntimeAssignmentTimelineForStudio,
  sortUserConversationsForStudio,
  sortUserNodeIdentitiesForStudio,
  summarizeAssignmentCommandReceiptsForStudio,
  summarizeAssignmentReceiptsForStudio,
  summarizeRuntimeAssignmentTimelineForStudio,
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
  runtimeCommandReceipts: [
    {
      assignmentId: "assignment-alpha",
      commandEventType: "runtime.start",
      commandId: "cmd-start-alpha",
      graphId: "team-alpha",
      hostAuthorityPubkey:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      nodeId: "worker-it",
      observedAt: "2026-04-26T12:02:00.000Z",
      projection: {
        source: "observation_event",
        updatedAt: "2026-04-26T12:02:00.000Z"
      },
      receiptStatus: "completed",
      requestedBy: "user-main",
      runnerId: "runner-alpha",
      runnerPubkey:
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    }
  ],
  runners: [
    {
      assignmentIds: ["assignment-alpha"],
      hostAuthorityPubkey:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      lastSeenAt: "2026-04-26T12:02:00.000Z",
      operationalState: "ready",
      projection: {
        source: "observation_event",
        updatedAt: "2026-04-26T12:02:00.000Z"
      },
      publicKey:
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      runnerId: "runner-trusted",
      trustState: "trusted"
    },
    {
      assignmentIds: [],
      hostAuthorityPubkey:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      operationalState: "ready",
      projection: {
        source: "observation_event",
        updatedAt: "2026-04-26T12:01:00.000Z"
      },
      publicKey:
        "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      runnerId: "runner-pending",
      trustState: "pending"
    },
    {
      assignmentIds: [],
      hostAuthorityPubkey:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      operationalState: "offline",
      projection: {
        source: "observation_event",
        updatedAt: "2026-04-26T12:00:00.000Z"
      },
      publicKey:
        "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      runnerId: "runner-revoked",
      trustState: "revoked"
    }
  ],
  schemaVersion: "1",
  sourceChangeRefs: [],
  sourceHistoryRefs: [],
  sourceHistoryReplays: [],
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

const runnerRegistryEntry: RunnerRegistryEntry = {
  heartbeat: {
    assignmentIds: ["assignment-alpha"],
    hostAuthorityPubkey:
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    lastHeartbeatAt: "2026-04-26T12:03:00.000Z",
    operationalState: "ready",
    runnerId: "runner-trusted",
    runnerPubkey:
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    schemaVersion: "1",
    updatedAt: "2026-04-26T12:03:00.000Z"
  },
  liveness: "online",
  offlineAfterSeconds: 300,
  projectedAt: "2026-04-26T12:03:00.000Z",
  registration: {
    capabilities: {
      agentEngineKinds: ["opencode_server"],
      labels: ["macbook"],
      maxAssignments: 2,
      runtimeKinds: ["agent_runner", "human_interface"],
      supportsLocalWorkspace: true,
      supportsNip59: true
    },
    firstSeenAt: "2026-04-26T12:00:00.000Z",
    hostAuthorityPubkey:
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    lastSeenAt: "2026-04-26T12:02:00.000Z",
    publicKey:
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    runnerId: "runner-trusted",
    schemaVersion: "1",
    trustState: "trusted",
    updatedAt: "2026-04-26T12:02:00.000Z"
  },
  staleAfterSeconds: 60
};

const assignmentRunnerRegistryEntry: RunnerRegistryEntry = {
  ...runnerRegistryEntry,
  heartbeat: {
    ...runnerRegistryEntry.heartbeat!,
    runnerId: "runner-alpha"
  },
  registration: {
    ...runnerRegistryEntry.registration,
    runnerId: "runner-alpha"
  }
};

const assignmentTimeline: RuntimeAssignmentTimelineResponse = {
  assignment: {
    acceptedAt: "2026-04-26T12:00:30.000Z",
    assignmentId: "assignment-alpha",
    assignmentRevision: 0,
    graphId: "team-alpha",
    graphRevisionId: "rev-1",
    hostAuthorityPubkey:
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    nodeId: "worker-it",
    offeredAt: "2026-04-26T12:00:00.000Z",
    runnerId: "runner-alpha",
    runnerPubkey:
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    runtimeKind: "agent_runner",
    schemaVersion: "1",
    status: "accepted",
    updatedAt: "2026-04-26T12:00:30.000Z"
  },
  commandReceipts: projection.runtimeCommandReceipts,
  generatedAt: "2026-04-26T12:03:00.000Z",
  receipts: projection.assignmentReceipts,
  timeline: [
    {
      assignmentId: "assignment-alpha",
      commandEventType: "runtime.start",
      commandId: "cmd-start-alpha",
      entryKind: "runtime.command.receipt",
      receiptStatus: "completed",
      timestamp: "2026-04-26T12:02:00.000Z"
    },
    {
      assignmentId: "assignment-alpha",
      entryKind: "assignment.receipt",
      message: "Assignment runtime is running.",
      receiptKind: "started",
      timestamp: "2026-04-26T12:01:00.000Z"
    },
    {
      assignmentId: "assignment-alpha",
      entryKind: "assignment.accepted",
      status: "accepted",
      timestamp: "2026-04-26T12:00:00.000Z"
    }
  ]
};

describe("Studio federation inspection helpers", () => {
  it("summarizes projection counts for operator panels", () => {
    expect(summarizeFederationProjection(projection)).toMatchObject({
      assignmentCount: 1,
      assignmentReceiptCount: 1,
      freshness: "current",
      runtimeCommandReceiptCount: 1,
      runtimeCount: 2,
      runningRuntimeCount: 2,
      sourceHistoryReplayCount: 0
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
    expect(
      summarizeAssignmentReceiptsForStudio({
        assignment: projection.assignments[0]!,
        receipts: projection.assignmentReceipts
      })
    ).toContain("1 receipt");
  });

  it("sorts and formats runtime command receipts", () => {
    const receipts = sortRuntimeCommandReceiptsForStudio([
      {
        ...projection.runtimeCommandReceipts[0]!,
        commandId: "cmd-old",
        observedAt: "2026-04-26T12:00:00.000Z"
      },
      projection.runtimeCommandReceipts[0]!
    ]);

    expect(receipts.map((receipt) => receipt.commandId)).toEqual([
      "cmd-start-alpha",
      "cmd-old"
    ]);
    expect(formatRuntimeCommandReceiptLabel(receipts[0]!)).toBe(
      "assignment-alpha · runtime.start · completed"
    );
    expect(formatRuntimeCommandReceiptDetail(receipts[0]!)).toContain(
      "command cmd-start-alpha"
    );
    expect(formatRuntimeCommandReceiptDetail(receipts[0]!)).toContain(
      "requested by user-main"
    );
    expect(
      summarizeAssignmentCommandReceiptsForStudio({
        assignment: projection.assignments[0]!,
        receipts: projection.runtimeCommandReceipts
      })
    ).toContain("1 command receipt");
  });

  it("sorts and formats runtime assignment timelines", () => {
    const sorted = sortRuntimeAssignmentTimelineForStudio(
      assignmentTimeline.timeline
    );

    expect(sorted.map((entry) => entry.entryKind)).toEqual([
      "assignment.accepted",
      "assignment.receipt",
      "runtime.command.receipt"
    ]);
    expect(summarizeRuntimeAssignmentTimelineForStudio(assignmentTimeline)).toBe(
      "assignment-alpha · accepted · 1 receipt · 1 command receipt · 3 timeline entries"
    );
    expect(formatRuntimeAssignmentTimelineLabel(sorted[2]!)).toBe(
      "runtime.command.receipt · runtime.start · completed"
    );
    expect(formatRuntimeAssignmentTimelineDetail(sorted[2]!)).toContain(
      "command cmd-start-alpha"
    );
  });

  it("builds assignment operational detail from projection and runner registry", () => {
    expect(
      buildAssignmentOperationalDetailsForStudio({
        assignment: projection.assignments[0]!,
        projection,
        runnerRegistryEntry: assignmentRunnerRegistryEntry
      })
    ).toEqual([
      "runtime running / desired running",
      "runner liveness online",
      "runner heartbeat 2026-04-26T12:03:00.000Z",
      "source histories 0",
      "history replays 0",
      "command receipts 1"
    ]);
  });

  it("builds assignment related navigation from projection and runner registry", () => {
    expect(
      buildAssignmentRelatedNavigationForStudio({
        assignment: projection.assignments[0]!,
        projection,
        runnerRegistryEntry: assignmentRunnerRegistryEntry
      })
    ).toMatchObject({
      assignmentId: "assignment-alpha",
      commandReceiptAvailable: true,
      commandReceiptCount: 1,
      commandReceiptLabel: "1 command receipt",
      runnerAvailable: true,
      runnerId: "runner-alpha",
      runtimeAvailable: true,
      runtimeLabel: "Runtime worker-it · running / desired running",
      runtimeNodeId: "worker-it",
      sourceHistoryAvailable: true,
      sourceHistoryCount: 0,
      sourceHistoryLabel: "0 source histories"
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

  it("sorts and formats runner registry projection rows", () => {
    const sorted = sortRunnerProjectionsForStudio(projection.runners);

    expect(sorted.map((runner) => runner.runnerId)).toEqual([
      "runner-pending",
      "runner-trusted",
      "runner-revoked"
    ]);
    expect(formatRunnerProjectionLabel(sorted[0]!)).toBe(
      "runner-pending · pending"
    );
    expect(formatRunnerProjectionDetail(sorted[1]!, runnerRegistryEntry)).toContain(
      "liveness online"
    );
    expect(formatRunnerProjectionDetail(sorted[1]!, runnerRegistryEntry)).toContain(
      "assignments 1"
    );
    expect(formatRunnerProjectionDetail(sorted[1]!, runnerRegistryEntry)).toContain(
      "runtimes agent_runner/human_interface"
    );
    expect(canTrustRunnerProjection(sorted[0]!)).toBe(true);
    expect(canTrustRunnerProjection(sorted[1]!)).toBe(false);
    expect(canRevokeRunnerProjection(sorted[1]!)).toBe(true);
    expect(canRevokeRunnerProjection(sorted[2]!)).toBe(false);
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
      runtimeCommandReceipts: [
        ...projection.runtimeCommandReceipts,
        {
          assignmentId: "assignment-worker-a",
          commandEventType: "runtime.wiki.publish",
          commandId: "cmd-user-a-wiki-publish",
          graphId: "team-alpha",
          hostAuthorityPubkey:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          nodeId: "worker-a",
          observedAt: "2026-04-26T12:06:00.000Z",
          projection: {
            source: "observation_event",
            updatedAt: "2026-04-26T12:06:00.000Z"
          },
          receiptStatus: "completed",
          requestedBy: "user-a",
          runnerId: "runner-worker-a",
          runnerPubkey:
            "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
        },
        {
          assignmentId: "assignment-worker-b",
          commandEventType: "runtime.artifact.restore",
          commandId: "cmd-user-a-artifact-restore",
          graphId: "team-alpha",
          hostAuthorityPubkey:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          nodeId: "worker-b",
          observedAt: "2026-04-26T12:07:00.000Z",
          projection: {
            source: "observation_event",
            updatedAt: "2026-04-26T12:07:00.000Z"
          },
          receiptStatus: "failed",
          requestedBy: "user-a",
          runnerId: "runner-worker-b",
          runnerPubkey:
            "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
        }
      ],
      userConversations: conversations
    });
    const userSummary = summaries.find((summary) => summary.nodeId === "user-a");

    expect(userSummary).toMatchObject({
      activeConversationCount: 2,
      assignmentId: "assignment-user-a",
      clientUrl: "http://127.0.0.1:4174/",
      commandReceiptCount: 2,
      conversationCount: 2,
      failedCommandReceiptCount: 1,
      pendingApprovalCount: 1,
      runnerId: "runner-user-a",
      runtimeObservedState: "running",
      unreadCount: 2
    });
    expect(formatUserNodeRuntimeSummaryLabel(userSummary!)).toBe(
      "user-a · active · running"
    );
    expect(formatUserNodeRuntimeSummaryDetail(userSummary!)).toContain(
      "assignment assignment-user-a"
    );
    expect(formatUserNodeRuntimeSummaryDetail(userSummary!)).toContain(
      "approvals 1"
    );
    expect(formatUserNodeRuntimeSummaryDetail(userSummary!)).toContain(
      "failed commands 1"
    );
  });
});
