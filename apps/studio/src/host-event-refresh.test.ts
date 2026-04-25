import { describe, expect, it } from "vitest";

import type { HostEventRecord } from "@entangle/types";

import {
  shouldRefreshOverviewFromHostEvent,
  shouldRefreshSelectedRuntimeFromHostEvent
} from "./host-event-refresh.js";

const baseEvent = {
  eventId: "evt-1",
  schemaVersion: "1",
  timestamp: "2026-04-24T10:00:00.000Z"
} as const;

describe("host-event-refresh", () => {
  it("flags control-plane and runtime lifecycle events that should refresh the overview", () => {
    const packageSourceEvent: HostEventRecord = {
      ...baseEvent,
      category: "control_plane",
      message: "Admitted package source 'worker-it'.",
      packageSourceId: "worker-it",
      type: "package_source.admitted"
    };
    const packageSourceDeletedEvent: HostEventRecord = {
      ...baseEvent,
      category: "control_plane",
      message: "Deleted package source 'worker-it'.",
      packageSourceId: "worker-it",
      type: "package_source.deleted"
    };
    const externalPrincipalDeletedEvent: HostEventRecord = {
      ...baseEvent,
      category: "control_plane",
      message: "Deleted external principal 'worker-it-git'.",
      principalId: "worker-it-git",
      type: "external_principal.deleted"
    };
    const graphEvent: HostEventRecord = {
      ...baseEvent,
      activeRevisionId: "team-alpha-20260424t100000z",
      category: "control_plane",
      graphId: "team-alpha",
      message: "Applied graph revision.",
      type: "graph.revision.applied"
    };
    const runtimeEvent: HostEventRecord = {
      ...baseEvent,
      backendKind: "docker",
      category: "runtime",
      desiredState: "running",
      graphId: "team-alpha",
      graphRevisionId: "team-alpha-20260424t100000z",
      message: "Observed runtime state changed for 'worker-it'.",
      nodeId: "worker-it",
      observedState: "running",
      runtimeHandle: "runtime-worker-it",
      type: "runtime.observed_state.changed"
    };
    const sessionEvent: HostEventRecord = {
      ...baseEvent,
      activeConversationIds: ["conv-alpha"],
      category: "session",
      graphId: "team-alpha",
      message: "Session 'session-alpha' on node 'worker-it' changed.",
      nodeId: "worker-it",
      ownerNodeId: "user",
      rootArtifactIds: [],
      sessionId: "session-alpha",
      status: "active",
      traceId: "trace-alpha",
      type: "session.updated",
      updatedAt: "2026-04-24T10:00:01.000Z"
    };
    const conversationEvent: HostEventRecord = {
      ...baseEvent,
      artifactIds: [],
      category: "session",
      conversationId: "conv-alpha",
      followupCount: 1,
      graphId: "team-alpha",
      initiator: "local",
      lastMessageType: "task.request",
      message: "Conversation 'conv-alpha' on node 'worker-it' changed.",
      nodeId: "worker-it",
      peerNodeId: "worker-review",
      sessionId: "session-alpha",
      status: "working",
      type: "conversation.trace.event",
      updatedAt: "2026-04-24T10:00:02.000Z"
    };

    expect(shouldRefreshOverviewFromHostEvent(packageSourceEvent)).toBe(true);
    expect(shouldRefreshOverviewFromHostEvent(packageSourceDeletedEvent)).toBe(
      true
    );
    expect(shouldRefreshOverviewFromHostEvent(externalPrincipalDeletedEvent)).toBe(
      true
    );
    expect(shouldRefreshOverviewFromHostEvent(graphEvent)).toBe(true);
    expect(shouldRefreshOverviewFromHostEvent(runtimeEvent)).toBe(true);
    expect(shouldRefreshOverviewFromHostEvent(sessionEvent)).toBe(true);
    expect(shouldRefreshOverviewFromHostEvent(conversationEvent)).toBe(true);
  });

  it("does not refresh the overview for trace-only events", () => {
    const traceEvent: HostEventRecord = {
      ...baseEvent,
      artifactId: "artifact-1",
      artifactKind: "report_file",
      backend: "git",
      category: "session",
      conversationId: "conv-1",
      graphId: "team-alpha",
      lifecycleState: "published",
      message: "Recorded artifact trace event for 'worker-it'.",
      nodeId: "worker-it",
      publicationState: "published",
      sessionId: "session-1",
      updatedAt: "2026-04-24T10:00:02.000Z",
      type: "artifact.trace.event"
    };

    expect(shouldRefreshOverviewFromHostEvent(traceEvent)).toBe(false);
  });

  it("refreshes the selected runtime only for matching node-scoped events", () => {
    const selectedRuntimeEvent: HostEventRecord = {
      ...baseEvent,
      category: "runtime",
      graphId: "team-alpha",
      graphRevisionId: "team-alpha-20260424t100000z",
      message: "Updated recovery policy for 'worker-it'.",
      nodeId: "worker-it",
      policy: {
        cooldownSeconds: 300,
        mode: "restart_on_failure",
        maxAttempts: 3
      },
      type: "runtime.recovery_policy.updated"
    };
    const otherRuntimeEvent: HostEventRecord = {
      ...baseEvent,
      category: "runtime",
      graphId: "team-alpha",
      graphRevisionId: "team-alpha-20260424t100000z",
      message: "Updated recovery policy for 'worker-marketing'.",
      nodeId: "worker-marketing",
      policy: {
        cooldownSeconds: 120,
        mode: "restart_on_failure",
        maxAttempts: 2
      },
      type: "runtime.recovery_policy.updated"
    };
    const sourceHistoryPublishedEvent: HostEventRecord = {
      ...baseEvent,
      artifactId: "source-source-history-source-change-turn-alpha",
      candidateId: "source-change-turn-alpha",
      category: "runtime",
      commit: "artifact-commit-alpha",
      graphId: "team-alpha",
      graphRevisionId: "team-alpha-20260424t100000z",
      historyId: "source-history-source-change-turn-alpha",
      message: "Published source history for 'worker-it'.",
      nodeId: "worker-it",
      publicationState: "published",
      sourceHistoryBranch:
        "worker-it/source-history/source-history-source-change-turn-alpha",
      turnId: "turn-alpha",
      type: "source_history.published"
    };

    expect(
      shouldRefreshSelectedRuntimeFromHostEvent(
        selectedRuntimeEvent,
        "worker-it"
      )
    ).toBe(true);
    expect(
      shouldRefreshSelectedRuntimeFromHostEvent(
        otherRuntimeEvent,
        "worker-it"
      )
    ).toBe(false);
    expect(
      shouldRefreshSelectedRuntimeFromHostEvent(selectedRuntimeEvent, null)
    ).toBe(false);
    expect(
      shouldRefreshSelectedRuntimeFromHostEvent(
        sourceHistoryPublishedEvent,
        "worker-it"
      )
    ).toBe(true);
  });
});
