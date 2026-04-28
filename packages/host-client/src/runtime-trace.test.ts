import { describe, expect, it } from "vitest";
import type { HostEventRecord } from "@entangle/types";
import {
  collectRuntimeTraceEvents,
  describeRuntimeTraceEvent,
  formatRuntimeTraceEventLabel
} from "./runtime-trace.js";

describe("runtime trace helpers", () => {
  it("collects only runtime-trace events for one node", () => {
    const events: HostEventRecord[] = [
      {
        category: "runner",
        consumedArtifactIds: [],
        eventId: "evt-runner-turn",
        graphId: "team-alpha",
        message: "Runner turn 'turn-alpha' on node 'worker-it' is now in phase 'persisting'.",
        nodeId: "worker-it",
        phase: "persisting",
        producedArtifactIds: [],
        schemaVersion: "1",
        sourceChangeCandidateIds: [],
        startedAt: "2026-04-24T11:00:03.000Z",
        timestamp: "2026-04-24T11:00:03.000Z",
        triggerKind: "message",
        turnId: "turn-alpha",
        type: "runner.turn.updated",
        updatedAt: "2026-04-24T11:00:03.000Z"
      },
      {
        category: "runtime",
        desiredState: "running",
        eventId: "evt-recovery",
        graphId: "team-alpha",
        graphRevisionId: "team-alpha-20260424-000000",
        message: "Runtime 'worker-it' recorded a recovery snapshot.",
        nodeId: "worker-it",
        observedState: "failed",
        recordedAt: "2026-04-24T11:00:04.000Z",
        recoveryId: "recovery-alpha",
        restartGeneration: 1,
        schemaVersion: "1",
        timestamp: "2026-04-24T11:00:04.000Z",
        type: "runtime.recovery.recorded"
      }
    ];

    expect(collectRuntimeTraceEvents(events, "worker-it")).toHaveLength(1);
  });

  it("describes session activity with bounded active-work details", () => {
    const event: HostEventRecord = {
      activeConversationIds: ["conv-alpha"],
      approvalStatusCounts: {
        approved: 0,
        expired: 0,
        not_required: 0,
        pending: 1,
        rejected: 0,
        withdrawn: 0
      },
      category: "session",
      conversationStatusCounts: {
        acknowledged: 0,
        awaiting_approval: 0,
        blocked: 0,
        closed: 1,
        expired: 0,
        opened: 0,
        rejected: 0,
        resolved: 0,
        working: 1
      },
      eventId: "evt-session-updated",
      graphId: "team-alpha",
      lastMessageType: "task.result",
      message: "Session 'session-alpha' on node 'worker-it' is now 'active'.",
      nodeId: "worker-it",
      ownerNodeId: "worker-it",
      rootArtifactIds: ["artifact-report-001", "artifact-report-002"],
      schemaVersion: "1",
      sessionConsistencyFindingCodes: ["terminal_conversation_still_active"],
      sessionConsistencyFindingCount: 1,
      sessionId: "session-alpha",
      status: "active",
      timestamp: "2026-04-24T11:00:03.000Z",
      traceId: "trace-alpha",
      type: "session.updated",
      updatedAt: "2026-04-24T11:00:03.000Z"
    };

    expect(describeRuntimeTraceEvent(event)).toEqual({
      detailLines: [
        "Trace: trace-alpha",
        "Active conversations: 1",
        "Recorded conversations: 2",
        "Conversation statuses: working 1, closed 1",
        "Recorded approvals: 1",
        "Approval statuses: pending 1",
        "Consistency findings: 1 (terminal_conversation_still_active)",
        "Root artifacts: 2",
        "Last message: task.result"
      ],
      label: "Session session-alpha moved to active"
    });
  });

  it("describes runner-turn engine outcome in a bounded way", () => {
    const event: HostEventRecord = {
      category: "runner",
      consumedArtifactIds: [],
      engineOutcome: {
        engineSessionId: "engine-session-alpha",
        engineVersion: "0.10.0",
        permissionObservations: [
          {
            decision: "rejected",
            operation: "command_execution",
            patterns: ["git push origin main"],
            permission: "bash",
            reason: "OpenCode one-shot CLI auto-rejected the permission request."
          }
        ],
        providerMetadata: {
          adapterKind: "anthropic",
          modelId: "claude-opus-4-7",
          profileId: "shared-anthropic"
        },
        providerStopReason: "end_turn",
        stopReason: "completed",
        toolExecutions: [
          {
            durationMs: 650,
            outcome: "success",
            sequence: 1,
            title: "Run tests",
            toolCallId: "toolu_alpha",
            toolId: "inspect_artifact_input"
          },
          {
            errorCode: "tool_result_error",
            message: "Tool 'inspect_memory_ref' returned an error result.",
            outcome: "error",
            sequence: 2,
            toolCallId: "toolu_beta",
            toolId: "inspect_memory_ref"
          }
        ],
        usage: {
          inputTokens: 13,
          outputTokens: 7
        }
      },
      memorySynthesisOutcome: {
        status: "succeeded",
        updatedAt: "2026-04-24T11:00:04.000Z",
        updatedSummaryPagePaths: [
          "/tmp/entangle-runner/memory/wiki/summaries/working-context.md",
          "/tmp/entangle-runner/memory/wiki/summaries/decisions.md",
          "/tmp/entangle-runner/memory/wiki/summaries/stable-facts.md",
          "/tmp/entangle-runner/memory/wiki/summaries/open-questions.md",
          "/tmp/entangle-runner/memory/wiki/summaries/next-actions.md",
          "/tmp/entangle-runner/memory/wiki/summaries/resolutions.md"
        ],
        workingContextPagePath:
          "/tmp/entangle-runner/memory/wiki/summaries/working-context.md"
      },
      eventId: "evt-turn-observed",
      graphId: "team-alpha",
      message: "Runner turn 'turn-alpha' completed with engine outcome.",
      nodeId: "worker-it",
      phase: "emitting",
      producedArtifactIds: [],
      schemaVersion: "1",
      sourceChangeCandidateIds: ["source-change-turn-alpha"],
      sourceChangeSummary: {
        additions: 7,
        checkedAt: "2026-04-24T11:00:04.000Z",
        deletions: 3,
        fileCount: 2,
        files: [],
        status: "changed"
      },
      startedAt: "2026-04-24T11:00:03.000Z",
      timestamp: "2026-04-24T11:00:04.000Z",
      triggerKind: "message",
      turnId: "turn-alpha",
      type: "runner.turn.updated",
      updatedAt: "2026-04-24T11:00:04.000Z"
    };

    expect(formatRuntimeTraceEventLabel(event)).toBe("Turn turn-alpha is emitting");
    expect(describeRuntimeTraceEvent(event)).toEqual({
      detailLines: [
        "Provider: anthropic/shared-anthropic (claude-opus-4-7)",
        "Engine session: engine-session-alpha",
        "Engine version: 0.10.0",
        "Outcome: completed (provider: end_turn)",
        "Permission: rejected command_execution: OpenCode one-shot CLI auto-rejected the permission request.",
        "Usage: 13 input / 7 output tokens",
        "Tool executions: 2 total (1 success, 1 error)",
        "Recent tools: 1. inspect_artifact_input - Run tests (success, 650ms), 2. inspect_memory_ref (error:tool_result_error) - Tool 'inspect_memory_ref' returned an error result.",
        "Memory synthesis: updated 6 summary pages",
        "Source changes: 2 files (+7/-3)",
        "Source change candidates: source-change-turn-alpha"
      ],
      label: "Turn turn-alpha is emitting"
    });
  });

  it("surfaces bounded engine failures in runtime-trace detail lines", () => {
    const event: HostEventRecord = {
      category: "runner",
      consumedArtifactIds: [],
      engineOutcome: {
        failure: {
          classification: "auth_error",
          message: "Authentication failed at the provider boundary."
        },
        providerMetadata: {
          adapterKind: "anthropic",
          modelId: "claude-opus-4-7",
          profileId: "shared-anthropic"
        },
        stopReason: "error",
        toolExecutions: []
      },
      memorySynthesisOutcome: {
        errorMessage: "provider unavailable",
        status: "failed",
        updatedAt: "2026-04-24T11:00:04.000Z"
      },
      eventId: "evt-turn-error",
      graphId: "team-alpha",
      message: "Runner turn 'turn-beta' failed.",
      nodeId: "worker-it",
      phase: "errored",
      producedArtifactIds: [],
      schemaVersion: "1",
      sourceChangeCandidateIds: [],
      startedAt: "2026-04-24T11:00:03.000Z",
      timestamp: "2026-04-24T11:00:04.000Z",
      triggerKind: "message",
      turnId: "turn-beta",
      type: "runner.turn.updated",
      updatedAt: "2026-04-24T11:00:04.000Z"
    };

    expect(describeRuntimeTraceEvent(event)).toEqual({
      detailLines: [
        "Provider: anthropic/shared-anthropic (claude-opus-4-7)",
        "Outcome: error",
        "Failure: auth_error — Authentication failed at the provider boundary.",
        "Memory synthesis: failed — provider unavailable"
      ],
      label: "Turn turn-beta is errored"
    });
  });

  it("describes source history publication events", () => {
    const event: HostEventRecord = {
      artifactId: "source-source-history-source-change-turn-alpha",
      candidateId: "source-change-turn-alpha",
      category: "runtime",
      commit: "artifact-commit-alpha",
      eventId: "evt-source-history-published",
      graphId: "team-alpha",
      graphRevisionId: "team-alpha-20260424-000000",
      historyId: "source-history-source-change-turn-alpha",
      message: "Published source history.",
      nodeId: "worker-it",
      publicationState: "published",
      remoteUrl: "ssh://git@gitea.example:22/team-alpha/graph-alpha.git",
      schemaVersion: "1",
      sourceHistoryBranch:
        "worker-it/source-history/source-history-source-change-turn-alpha",
      timestamp: "2026-04-24T11:00:04.000Z",
      turnId: "turn-alpha",
      type: "source_history.published"
    };

    expect(describeRuntimeTraceEvent(event)).toEqual({
      detailLines: [
        "Candidate: source-change-turn-alpha",
        "Artifact: source-source-history-source-change-turn-alpha",
        "Publication: published",
        "Remote: ssh://git@gitea.example:22/team-alpha/graph-alpha.git"
      ],
      label:
        "Source history source-history-source-change-turn-alpha publication published"
    });
  });

  it("describes source history replay events", () => {
    const event: HostEventRecord = {
      candidateId: "source-change-turn-alpha",
      category: "runtime",
      commit: "commit-alpha",
      eventId: "evt-source-history-replayed",
      graphId: "team-alpha",
      graphRevisionId: "team-alpha-20260424-000000",
      historyId: "source-history-source-change-turn-alpha",
      message: "Replayed source history.",
      nodeId: "worker-it",
      replayId: "replay-source-history-alpha",
      replayStatus: "replayed",
      schemaVersion: "1",
      timestamp: "2026-04-24T11:00:05.000Z",
      turnId: "turn-alpha",
      type: "source_history.replayed"
    };

    expect(describeRuntimeTraceEvent(event)).toEqual({
      detailLines: [
        "Candidate: source-change-turn-alpha",
        "Replay: replay-source-history-alpha",
        "Status: replayed",
        "Commit: commit-alpha"
      ],
      label: "Source history source-history-source-change-turn-alpha replay replayed"
    });
  });

  it("describes wiki repository publication events", () => {
    const event: HostEventRecord = {
      artifactId: "wiki-repository-worker-it-wiki-commit",
      branch: "worker-it/wiki-repository/entangle-wiki",
      category: "runtime",
      commit: "wiki-commit-alpha",
      eventId: "evt-wiki-repository-published",
      graphId: "team-alpha",
      graphRevisionId: "team-alpha-20260424-000000",
      message: "Published wiki repository.",
      nodeId: "worker-it",
      publicationId: "wiki-publication-alpha",
      publicationState: "published",
      remoteUrl: "ssh://git@gitea.example:22/team-alpha/graph-alpha.git",
      schemaVersion: "1",
      timestamp: "2026-04-24T11:00:06.000Z",
      type: "wiki_repository.published"
    };

    expect(describeRuntimeTraceEvent(event)).toEqual({
      detailLines: [
        "Publication: wiki-publication-alpha",
        "Artifact: wiki-repository-worker-it-wiki-commit",
        "State: published",
        "Branch: worker-it/wiki-repository/entangle-wiki",
        "Remote: ssh://git@gitea.example:22/team-alpha/graph-alpha.git"
      ],
      label: "Wiki repository worker-it publication published"
    });
  });
});
