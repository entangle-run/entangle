import { describe, expect, it } from "vitest";
import type { RuntimeAssignmentRecord } from "@entangle/types";
import {
  projectRuntimeAssignmentSummary,
  projectRuntimeAssignmentTimelineSummary,
  sortRuntimeAssignmentsForCli
} from "./assignment-output.js";

const assignments: RuntimeAssignmentRecord[] = [
  {
    assignmentId: "assignment-b",
    assignmentRevision: 0,
    graphId: "team-alpha",
    graphRevisionId: "rev-1",
    hostAuthorityPubkey:
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    lease: {
      expiresAt: "2026-04-26T12:10:00.000Z",
      issuedAt: "2026-04-26T12:00:00.000Z",
      leaseId: "lease-b",
      renewBy: "2026-04-26T12:08:00.000Z"
    },
    nodeId: "worker-b",
    offeredAt: "2026-04-26T12:00:00.000Z",
    runnerId: "runner-b",
    runnerPubkey: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    runtimeKind: "agent_runner",
    schemaVersion: "1",
    status: "offered",
    updatedAt: "2026-04-26T12:00:00.000Z"
  },
  {
    assignmentId: "assignment-a",
    assignmentRevision: 1,
    graphId: "team-alpha",
    graphRevisionId: "rev-1",
    hostAuthorityPubkey:
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    nodeId: "worker-a",
    offeredAt: "2026-04-26T12:00:00.000Z",
    runnerId: "runner-a",
    runnerPubkey: "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    runtimeKind: "agent_runner",
    schemaVersion: "1",
    status: "accepted",
    updatedAt: "2026-04-26T12:01:00.000Z"
  }
];

describe("assignment CLI output", () => {
  it("sorts assignments and projects compact summaries", () => {
    expect(sortRuntimeAssignmentsForCli(assignments).map((item) => item.assignmentId))
      .toEqual(["assignment-a", "assignment-b"]);
    expect(projectRuntimeAssignmentSummary(assignments[0]!)).toMatchObject({
      assignmentId: "assignment-b",
      leaseExpiresAt: "2026-04-26T12:10:00.000Z",
      nodeId: "worker-b",
      runnerId: "runner-b",
      status: "offered"
    });
  });

  it("projects compact assignment timeline summaries", () => {
    expect(
      projectRuntimeAssignmentTimelineSummary({
        assignment: assignments[0]!,
        generatedAt: "2026-04-26T12:03:00.000Z",
        receipts: [
          {
            assignmentId: "assignment-b",
            hostAuthorityPubkey:
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            observedAt: "2026-04-26T12:02:00.000Z",
            projection: {
              source: "observation_event",
              updatedAt: "2026-04-26T12:02:00.000Z"
            },
            receiptKind: "started",
            runnerId: "runner-b",
            runnerPubkey:
              "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
          }
        ],
        timeline: [
          {
            assignmentId: "assignment-b",
            entryKind: "assignment.receipt",
            receiptKind: "started",
            runnerId: "runner-b",
            timestamp: "2026-04-26T12:02:00.000Z"
          },
          {
            assignmentId: "assignment-b",
            entryKind: "assignment.offered",
            nodeId: "worker-b",
            runnerId: "runner-b",
            status: "offered",
            timestamp: "2026-04-26T12:00:00.000Z"
          }
        ]
      })
    ).toMatchObject({
      assignment: {
        assignmentId: "assignment-b"
      },
      receiptCount: 1,
      timeline: [
        {
          entryKind: "assignment.offered"
        },
        {
          entryKind: "assignment.receipt",
          receiptKind: "started"
        }
      ]
    });
  });
});
