import { describe, expect, it } from "vitest";
import type { HostProjectionSnapshot } from "@entangle/types";
import {
  filterRuntimeCommandReceiptsForCli,
  parseRuntimeCommandReceiptStatusForCli,
  projectHostProjectionSummary,
  projectRuntimeCommandReceiptSummary,
  projectRuntimeProjectionSummary,
  sortRuntimeCommandReceiptsForCli,
  sortRuntimeProjectionsForCli
} from "./projection-output.js";

const projection: HostProjectionSnapshot = {
  artifactRefs: [],
  assignmentReceipts: [
    {
      assignmentId: "assignment-alpha",
      hostAuthorityPubkey:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      observedAt: "2026-04-26T12:00:01.000Z",
      projection: {
        source: "observation_event",
        updatedAt: "2026-04-26T12:00:01.000Z"
      },
      receiptKind: "started",
      runnerId: "runner-alpha",
      runnerPubkey:
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    }
  ],
  assignments: [],
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
      graphRevisionId: "team-alpha-rev-1",
      hostAuthorityPubkey:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      lastSeenAt: "2026-04-26T12:00:00.000Z",
      nodeId: "worker-b",
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
      backendKind: "federated",
      desiredState: "running",
      graphId: "team-alpha",
      graphRevisionId: "team-alpha-rev-1",
      hostAuthorityPubkey:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      nodeId: "worker-a",
      observedState: "missing",
      projection: {
        source: "desired_state",
        updatedAt: "2026-04-26T12:00:00.000Z"
      },
      restartGeneration: 0
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
      nodeId: "worker-b",
      observedAt: "2026-04-26T12:02:00.000Z",
      projection: {
        source: "observation_event",
        updatedAt: "2026-04-26T12:02:00.000Z"
      },
      receiptStatus: "completed",
      runnerId: "runner-alpha",
      runnerPubkey:
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    },
    {
      assignmentId: "assignment-alpha",
      commandEventType: "runtime.stop",
      commandId: "cmd-stop-alpha",
      graphId: "team-alpha",
      hostAuthorityPubkey:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      nodeId: "worker-b",
      observedAt: "2026-04-26T12:01:00.000Z",
      projection: {
        source: "observation_event",
        updatedAt: "2026-04-26T12:01:00.000Z"
      },
      receiptStatus: "failed",
      runnerId: "runner-alpha",
      runnerPubkey:
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    },
    {
      assignmentId: "assignment-beta",
      commandEventType: "runtime.source_history.publish",
      commandId: "cmd-publish-beta",
      graphId: "team-alpha",
      hostAuthorityPubkey:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      nodeId: "worker-a",
      observedAt: "2026-04-26T12:03:00.000Z",
      projection: {
        source: "observation_event",
        updatedAt: "2026-04-26T12:03:00.000Z"
      },
      receiptStatus: "received",
      runnerId: "runner-beta",
      runnerPubkey:
        "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
    }
  ],
  runners: [],
  schemaVersion: "1",
  sourceChangeRefs: [],
  sourceHistoryRefs: [],
  sourceHistoryReplays: [],
  userConversations: [
    {
      conversationId: "conversation-alpha",
      graphId: "team-alpha",
      lastMessageAt: "2026-04-26T12:00:00.000Z",
      peerNodeId: "worker-b",
      pendingApprovalIds: [],
      projection: {
        source: "observation_event",
        updatedAt: "2026-04-26T12:00:00.000Z"
      },
      unreadCount: 0,
      userNodeId: "user-main"
    }
  ],
  wikiRefs: []
};

describe("projection CLI output", () => {
  it("sorts runtime projection records for stable output", () => {
    expect(
      sortRuntimeProjectionsForCli(projection.runtimes).map(
        (runtime) => runtime.nodeId
      )
    ).toEqual(["worker-a", "worker-b"]);
  });

  it("projects compact runtime summaries", () => {
    expect(projectRuntimeProjectionSummary(projection.runtimes[0]!)).toMatchObject({
      assignmentId: "assignment-alpha",
      clientUrl: "http://127.0.0.1:4173/",
      nodeId: "worker-b",
      observedState: "running",
      projectionSource: "observation_event",
      runnerId: "runner-alpha"
    });
  });

  it("projects compact Host projection summaries", () => {
    expect(projectHostProjectionSummary(projection)).toMatchObject({
      assignmentReceiptCount: 1,
      failedRuntimeCount: 0,
      runtimeCount: 2,
      runtimeCommandReceiptCount: 3,
      runtimeCommandReceipts: [
        {
          commandEventType: "runtime.source_history.publish",
          commandId: "cmd-publish-beta",
          receiptStatus: "received"
        },
        {
          commandEventType: "runtime.start",
          commandId: "cmd-start-alpha",
          receiptStatus: "completed"
        },
        {
          commandEventType: "runtime.stop",
          commandId: "cmd-stop-alpha",
          receiptStatus: "failed"
        }
      ],
      runningRuntimeCount: 1,
      sourceHistoryReplayCount: 0,
      userConversationCount: 1,
      runtimes: [
        {
          nodeId: "worker-a",
          observedState: "missing"
        },
        {
          nodeId: "worker-b",
          observedState: "running"
        }
      ]
    });
  });

  it("sorts runtime command receipts by newest observation", () => {
    expect(
      sortRuntimeCommandReceiptsForCli(projection.runtimeCommandReceipts).map(
        (receipt) => receipt.commandId
      )
    ).toEqual(["cmd-publish-beta", "cmd-start-alpha", "cmd-stop-alpha"]);
  });

  it("filters runtime command receipts for dedicated CLI inspection", () => {
    const failedAlphaReceipts = filterRuntimeCommandReceiptsForCli(
      projection.runtimeCommandReceipts,
      {
        assignmentId: "assignment-alpha",
        nodeId: "worker-b",
        receiptStatus: "failed",
        runnerId: "runner-alpha"
      }
    );

    expect(failedAlphaReceipts.map(projectRuntimeCommandReceiptSummary)).toEqual([
      {
        assignmentId: "assignment-alpha",
        commandEventType: "runtime.stop",
        commandId: "cmd-stop-alpha",
        nodeId: "worker-b",
        observedAt: "2026-04-26T12:01:00.000Z",
        receiptStatus: "failed",
        runnerId: "runner-alpha"
      }
    ]);
  });

  it("validates runtime command receipt status options", () => {
    expect(parseRuntimeCommandReceiptStatusForCli("completed")).toBe(
      "completed"
    );
    expect(parseRuntimeCommandReceiptStatusForCli(undefined)).toBeUndefined();
    expect(() => parseRuntimeCommandReceiptStatusForCli("done")).toThrow(
      "--status must be one of received, completed, or failed."
    );
  });
});
