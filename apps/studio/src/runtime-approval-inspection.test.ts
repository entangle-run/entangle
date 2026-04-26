import { describe, expect, it } from "vitest";
import type { ApprovalRecord } from "@entangle/types";
import {
  filterRuntimeApprovals,
  formatRuntimeApprovalDetailLines,
  formatRuntimeApprovalLabel,
  formatRuntimeApprovalStatus,
  sortRuntimeApprovals
} from "./runtime-approval-inspection.js";

const approvals: ApprovalRecord[] = [
  {
    approvalId: "approval-newer",
    approverNodeIds: ["supervisor-it"],
    conversationId: "conv-alpha",
    graphId: "team-alpha",
    operation: "source_publication",
    reason: "Review publication.",
    requestedAt: "2026-04-24T11:00:00.000Z",
    requestedByNodeId: "worker-it",
    resource: {
      id: "source-history-alpha|gitea|team-alpha|team-alpha",
      kind: "source_history_publication",
      label: "source-history-alpha -> gitea/team-alpha/team-alpha"
    },
    sessionId: "session-alpha",
    status: "pending",
    updatedAt: "2026-04-24T11:05:00.000Z"
  },
  {
    approvalId: "approval-older",
    approverNodeIds: ["lead-it"],
    graphId: "team-alpha",
    requestedAt: "2026-04-24T10:00:00.000Z",
    requestedByNodeId: "worker-it",
    sessionId: "session-beta",
    status: "approved",
    updatedAt: "2026-04-24T10:10:00.000Z"
  }
];

describe("studio runtime approval inspection helpers", () => {
  it("filters approvals for visual inspection and sorts by recency", () => {
    expect(
      sortRuntimeApprovals(
        filterRuntimeApprovals(approvals, {
          requestedByNodeId: "worker-it"
        })
      ).map((approval) => approval.approvalId)
    ).toEqual(["approval-newer", "approval-older"]);
  });

  it("formats approval labels, status text, and detail lines", () => {
    const [approval] = approvals;

    expect(approval).toBeDefined();
    expect(formatRuntimeApprovalLabel(approval!)).toBe(
      "approval-newer · pending"
    );
    expect(formatRuntimeApprovalStatus(approval!)).toBe(
      "Requested by worker-it · approvers 1 · session session-alpha"
    );
    expect(formatRuntimeApprovalDetailLines(approval!)).toEqual(
      expect.arrayContaining([
        "requested 2026-04-24T11:00:00.000Z",
        "operation source_publication",
        "resource source_history_publication:source-history-alpha|gitea|team-alpha|team-alpha (source-history-alpha -> gitea/team-alpha/team-alpha)",
        "conversation conv-alpha",
        "reason Review publication."
      ])
    );
  });
});
