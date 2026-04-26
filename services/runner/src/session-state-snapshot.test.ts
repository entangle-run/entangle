import { afterEach, describe, expect, it } from "vitest";
import {
  ensureRunnerStatePaths,
  writeApprovalRecord,
  writeArtifactRecord,
  writeConversationRecord,
  writeRunnerTurnRecord,
  writeSessionRecord
} from "./state-store.js";
import {
  cleanupRuntimeFixtures,
  createRuntimeFixture,
  runnerPublicKey
} from "./test-fixtures.js";
import {
  buildRunnerSessionStateSnapshot,
  renderRunnerSessionStateSnapshotForPrompt
} from "./session-state-snapshot.js";

afterEach(async () => {
  await cleanupRuntimeFixtures();
});

async function seedSessionState(runtimeRoot: string): Promise<void> {
  const statePaths = await ensureRunnerStatePaths(runtimeRoot);

  await writeSessionRecord(statePaths, {
    activeConversationIds: ["conv-zeta", "conv-alpha"],
    entrypointNodeId: "lead-it",
    graphId: "graph-alpha",
    intent: "Review the relay recovery follow-up.",
    lastMessageType: "task.update",
    openedAt: "2026-04-24T11:00:00.000Z",
    ownerNodeId: "worker-it",
    rootArtifactIds: ["artifact-session-root"],
    sessionId: "session-alpha",
    status: "active",
    traceId: "trace-alpha",
    updatedAt: "2026-04-24T11:10:00.000Z",
    waitingApprovalIds: ["approval-1"]
  });

  await Promise.all([
    writeApprovalRecord(statePaths, {
      approvalId: "approval-1",
      approverNodeIds: ["lead-it"],
      conversationId: "conv-alpha",
      graphId: "graph-alpha",
      reason: "Confirm the relay recovery plan before handoff.",
      requestedAt: "2026-04-24T11:05:30.000Z",
      requestedByNodeId: "worker-it",
      sessionId: "session-alpha",
      status: "pending",
      updatedAt: "2026-04-24T11:07:00.000Z"
    }),
    writeApprovalRecord(statePaths, {
      approvalId: "approval-2",
      approverNodeIds: ["reviewer-it"],
      graphId: "graph-alpha",
      requestedAt: "2026-04-24T11:04:30.000Z",
      requestedByNodeId: "worker-it",
      sessionId: "session-alpha",
      status: "approved",
      updatedAt: "2026-04-24T11:06:00.000Z"
    }),
    writeApprovalRecord(statePaths, {
      approvalId: "approval-other",
      approverNodeIds: ["lead-it"],
      graphId: "graph-alpha",
      requestedAt: "2026-04-24T10:04:30.000Z",
      requestedByNodeId: "worker-it",
      sessionId: "session-other",
      status: "pending",
      updatedAt: "2026-04-24T11:09:00.000Z"
    })
  ]);

  await Promise.all([
    writeConversationRecord(statePaths, {
      artifactIds: ["artifact-input"],
      conversationId: "conv-zeta",
      followupCount: 0,
      graphId: "graph-alpha",
      initiator: "peer",
      localNodeId: "worker-it",
      localPubkey: runnerPublicKey,
      openedAt: "2026-04-24T11:02:00.000Z",
      peerNodeId: "reviewer-it",
      peerPubkey: runnerPublicKey,
      responsePolicy: {
        closeOnResult: true,
        maxFollowups: 1,
        responseRequired: true
      },
      sessionId: "session-alpha",
      status: "working",
      updatedAt: "2026-04-24T11:03:00.000Z"
    }),
    writeConversationRecord(statePaths, {
      artifactIds: ["artifact-extra"],
      conversationId: "conv-alpha",
      followupCount: 2,
      graphId: "graph-alpha",
      initiator: "self",
      lastMessageType: "task.result",
      localNodeId: "worker-it",
      localPubkey: runnerPublicKey,
      openedAt: "2026-04-24T11:01:00.000Z",
      peerNodeId: "lead-it",
      peerPubkey: runnerPublicKey,
      responsePolicy: {
        closeOnResult: false,
        maxFollowups: 2,
        responseRequired: true
      },
      sessionId: "session-alpha",
      status: "acknowledged",
      updatedAt: "2026-04-24T11:08:00.000Z"
    })
  ]);

  await Promise.all([
    writeRunnerTurnRecord(statePaths, {
      consumedArtifactIds: ["artifact-input"],
      engineOutcome: {
        providerMetadata: {
          adapterKind: "anthropic",
          modelId: "claude-opus",
          profileId: "shared-model"
        },
        stopReason: "completed",
        toolExecutions: [
          {
            outcome: "success",
            sequence: 1,
            toolCallId: "toolu_alpha",
            toolId: "inspect_session_state"
          }
        ],
        usage: {
          inputTokens: 12,
          outputTokens: 8
        }
      },
      graphId: "graph-alpha",
      nodeId: "worker-it",
      phase: "persisting",
      producedArtifactIds: ["artifact-output"],
      sessionId: "session-alpha",
      startedAt: "2026-04-24T11:05:00.000Z",
      triggerKind: "message",
      turnId: "turn-newer",
      updatedAt: "2026-04-24T11:09:00.000Z"
    }),
    writeRunnerTurnRecord(statePaths, {
      consumedArtifactIds: [],
      engineOutcome: {
        failure: {
          classification: "provider_unavailable",
          message: "temporary failure"
        },
        providerMetadata: {
          adapterKind: "anthropic",
          modelId: "claude-opus",
          profileId: "shared-model"
        },
        stopReason: "error",
        toolExecutions: [],
        usage: {
          inputTokens: 4,
          outputTokens: 0
        }
      },
      graphId: "graph-alpha",
      nodeId: "worker-it",
      phase: "errored",
      producedArtifactIds: [],
      sessionId: "session-alpha",
      startedAt: "2026-04-24T11:03:00.000Z",
      triggerKind: "operator",
      turnId: "turn-older",
      updatedAt: "2026-04-24T11:04:00.000Z"
    })
  ]);

  await Promise.all([
    writeArtifactRecord(statePaths, {
      createdAt: "2026-04-24T11:01:30.000Z",
      ref: {
        artifactId: "artifact-input",
        artifactKind: "report_file",
        backend: "git",
        locator: {
          branch: "reviewer-it/session-alpha/input",
          commit: "abc123",
          gitServiceRef: "gitea",
          namespace: "team-alpha",
          repositoryName: "graph-alpha",
          path: "reports/session-alpha/input.md"
        },
        preferred: true,
        status: "published"
      },
      retrieval: {
        retrievedAt: "2026-04-24T11:01:45.000Z",
        state: "retrieved"
      },
      updatedAt: "2026-04-24T11:01:45.000Z"
    }),
    writeArtifactRecord(statePaths, {
      createdAt: "2026-04-24T11:04:15.000Z",
      publication: {
        publishedAt: "2026-04-24T11:09:15.000Z",
        remoteName: "origin",
        remoteUrl: "ssh://git@gitea:22/team-alpha/graph-alpha.git",
        state: "published"
      },
      ref: {
        artifactId: "artifact-output",
        artifactKind: "report_file",
        backend: "git",
        locator: {
          branch: "worker-it/session-alpha/report",
          commit: "def456",
          gitServiceRef: "gitea",
          namespace: "team-alpha",
          repositoryName: "graph-alpha",
          path: "reports/session-alpha/output.md"
        },
        preferred: true,
        status: "published"
      },
      turnId: "turn-newer",
      updatedAt: "2026-04-24T11:09:15.000Z"
    }),
    writeArtifactRecord(statePaths, {
      createdAt: "2026-04-24T11:02:30.000Z",
      ref: {
        artifactId: "artifact-session-root",
        artifactKind: "report_file",
        backend: "git",
        locator: {
          branch: "worker-it/session-alpha/root",
          commit: "ghi789",
          gitServiceRef: "gitea",
          namespace: "team-alpha",
          repositoryName: "graph-alpha",
          path: "reports/session-alpha/root.md"
        },
        preferred: true,
        status: "materialized"
      },
      turnId: "turn-newer",
      updatedAt: "2026-04-24T11:07:00.000Z"
    })
  ]);
}

describe("session state snapshot", () => {
  it("builds a deterministic bounded snapshot and prompt projection for the current session", async () => {
    const fixture = await createRuntimeFixture();
    await seedSessionState(fixture.context.workspace.runtimeRoot);

    const snapshot = await buildRunnerSessionStateSnapshot({
      maxArtifacts: 2,
      maxApprovals: 2,
      maxRecentTurns: 1,
      sessionId: "session-alpha",
      statePaths: await ensureRunnerStatePaths(fixture.context.workspace.runtimeRoot)
    });

    expect(snapshot).toBeDefined();

    if (!snapshot) {
      throw new Error("Expected a session snapshot.");
    }

    expect(snapshot.counts).toEqual({
      activeConversationCount: 2,
      approvalCount: 2,
      artifactCount: 4,
      conversationCount: 2,
      recentTurnCount: 1,
      waitingApprovalCount: 1
    });
    expect(snapshot.approvals.map((approval) => approval.approvalId)).toEqual([
      "approval-1",
      "approval-2"
    ]);
    expect(snapshot.approvals[0]).toMatchObject({
      approvalId: "approval-1",
      approverNodeIds: ["lead-it"],
      conversationId: "conv-alpha",
      reason: "Confirm the relay recovery plan before handoff.",
      requestedByNodeId: "worker-it",
      status: "pending"
    });
    expect(snapshot.conversations.map((conversation) => conversation.conversationId)).toEqual([
      "conv-alpha",
      "conv-zeta"
    ]);
    expect(snapshot.recentTurns).toHaveLength(1);
    expect(snapshot.recentTurns[0]?.turnId).toBe("turn-newer");
    expect(snapshot.artifacts.map((artifact) => artifact.artifactId)).toEqual([
      "artifact-output",
      "artifact-session-root"
    ]);

    const rendered = renderRunnerSessionStateSnapshotForPrompt(snapshot);
    expect(rendered).toContain("Current session snapshot:");
    expect(rendered).toContain("Session status: `active`");
    expect(rendered).toContain("Active conversations: 2");
    expect(rendered).toContain("Waiting approvals: 1");
    expect(rendered).toContain("Recorded approvals: 2");
    expect(rendered).toContain(
      "approval-1 [pending] requestedBy=worker-it approvers=1 conversation=conv-alpha"
    );
    expect(rendered).toContain("Conversations observed: 2");
    expect(rendered).toContain("conv-alpha with lead-it [acknowledged] followups=2");
    expect(rendered).toContain(
      "turn-newer [persisting/message] outcome=completed produced=1 consumed=1"
    );
    expect(rendered).toContain("artifact-output [git/report_file/published]");
  });

  it("returns undefined when the requested session does not exist", async () => {
    const fixture = await createRuntimeFixture();

    const snapshot = await buildRunnerSessionStateSnapshot({
      maxArtifacts: 2,
      maxApprovals: 2,
      maxRecentTurns: 2,
      sessionId: "missing-session",
      statePaths: await ensureRunnerStatePaths(fixture.context.workspace.runtimeRoot)
    });

    expect(snapshot).toBeUndefined();
  });
});
