import { describe, expect, it } from "vitest";
import type { ApprovalRecord } from "@entangle/types";
import {
  filterRuntimeApprovalsForCli,
  projectRuntimeApprovalSummary,
  sortRuntimeApprovalsForCli
} from "./runtime-approval-output.js";

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
      id: "source-history-alpha|local-gitea|team-alpha|team-alpha",
      kind: "source_history_publication",
      label: "source-history-alpha -> local-gitea/team-alpha/team-alpha"
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

describe("runtime-approval-output", () => {
  it("sorts approvals from newest to oldest update", () => {
    expect(
      sortRuntimeApprovalsForCli(approvals).map((approval) => approval.approvalId)
    ).toEqual(["approval-newer", "approval-older"]);
  });

  it("filters approvals by status and approver", () => {
    expect(
      filterRuntimeApprovalsForCli(approvals, {
        approverNodeId: "supervisor-it",
        status: "pending"
      }).map((approval) => approval.approvalId)
    ).toEqual(["approval-newer"]);
  });

  it("projects approvals into compact operator summaries", () => {
    const [approval] = approvals;

    expect(approval).toBeDefined();
    expect(projectRuntimeApprovalSummary(approval!)).toMatchObject({
      approvalId: "approval-newer",
      approverNodeIds: ["supervisor-it"],
      conversationId: "conv-alpha",
      label: "approval-newer · pending",
      operation: "source_publication",
      resource: {
        id: "source-history-alpha|local-gitea|team-alpha|team-alpha",
        kind: "source_history_publication",
        label: "source-history-alpha -> local-gitea/team-alpha/team-alpha"
      },
      requestedByNodeId: "worker-it",
      sessionId: "session-alpha",
      status: "pending",
      statusText: "Requested by worker-it · approvers 1 · session session-alpha",
      updatedAt: "2026-04-24T11:05:00.000Z"
    });
    expect(projectRuntimeApprovalSummary(approval!).detailLines).toEqual(
      expect.arrayContaining([
        "operation source_publication",
        "resource source_history_publication:source-history-alpha|local-gitea|team-alpha|team-alpha (source-history-alpha -> local-gitea/team-alpha/team-alpha)",
        "reason Review publication.",
        "conversation conv-alpha"
      ])
    );
  });
});
