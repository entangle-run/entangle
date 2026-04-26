import { describe, expect, it } from "vitest";
import type { HostEventRecord } from "@entangle/types";
import {
  filterHostEvents,
  hostEventMatchesFilter,
  runtimeRecoveryEventTypePrefixes,
  runtimeTraceEventTypePrefixes
} from "./event-inspection.js";

function createRuntimeRecoveryRecordedEvent(): HostEventRecord {
  return {
    category: "runtime",
    desiredState: "running",
    eventId: "evt-runtime-recovery-recorded",
    graphId: "team-alpha",
    graphRevisionId: "team-alpha-20260424-000000",
    message: "Runtime 'worker-it' recorded a recovery snapshot in observed state 'failed'.",
    nodeId: "worker-it",
    observedState: "failed",
    recordedAt: "2026-04-24T10:00:00.000Z",
    recoveryId: "worker-it-20260424t100000-failed",
    restartGeneration: 1,
    schemaVersion: "1",
    timestamp: "2026-04-24T10:00:00.000Z",
    type: "runtime.recovery.recorded"
  };
}

function createSessionEvent(): HostEventRecord {
  return {
    activeConversationIds: ["conv-alpha"],
    category: "session",
    eventId: "evt-session-updated",
    graphId: "team-alpha",
    lastMessageType: "task.request",
    message: "Session 'session-alpha' is now 'active'.",
    nodeId: "worker-it",
    ownerNodeId: "user-root",
    rootArtifactIds: ["artifact-report"],
    schemaVersion: "1",
    sessionId: "session-alpha",
    status: "active",
    timestamp: "2026-04-24T10:00:10.000Z",
    traceId: "trace-alpha",
    type: "session.updated",
    updatedAt: "2026-04-24T10:00:10.000Z"
  };
}

function createSourceChangeCandidateReviewedEvent(): HostEventRecord {
  return {
    candidateId: "source-change-turn-alpha",
    category: "runtime",
    eventId: "evt-source-change-reviewed",
    graphId: "team-alpha",
    graphRevisionId: "team-alpha-20260424-000000",
    message:
      "Source change candidate 'source-change-turn-alpha' for runtime 'worker-it' was reviewed as 'accepted'.",
    nodeId: "worker-it",
    previousStatus: "pending_review",
    reviewedAt: "2026-04-24T10:00:20.000Z",
    schemaVersion: "1",
    status: "accepted",
    timestamp: "2026-04-24T10:00:20.000Z",
    turnId: "turn-alpha",
    type: "source_change_candidate.reviewed"
  };
}

function createSourceHistoryUpdatedEvent(): HostEventRecord {
  return {
    candidateId: "source-change-turn-alpha",
    category: "runtime",
    commit: "commit-alpha",
    eventId: "evt-source-history-updated",
    graphId: "team-alpha",
    graphRevisionId: "team-alpha-20260424-000000",
    historyId: "source-history-source-change-turn-alpha",
    message:
      "Source history 'source-history-source-change-turn-alpha' for runtime 'worker-it' recorded candidate 'source-change-turn-alpha' at commit 'commit-alpha'.",
    mode: "already_in_workspace",
    nodeId: "worker-it",
    schemaVersion: "1",
    sourceHistoryRef: "refs/heads/entangle-source-history",
    timestamp: "2026-04-24T10:00:30.000Z",
    turnId: "turn-alpha",
    type: "source_history.updated"
  };
}

function createSourceHistoryPublishedEvent(): HostEventRecord {
  return {
    artifactId: "source-source-history-source-change-turn-alpha",
    candidateId: "source-change-turn-alpha",
    category: "runtime",
    commit: "artifact-commit-alpha",
    eventId: "evt-source-history-published",
    graphId: "team-alpha",
    graphRevisionId: "team-alpha-20260424-000000",
    historyId: "source-history-source-change-turn-alpha",
    message:
      "Source history 'source-history-source-change-turn-alpha' for runtime 'worker-it' published artifact 'source-source-history-source-change-turn-alpha'.",
    nodeId: "worker-it",
    publicationState: "published",
    schemaVersion: "1",
    sourceHistoryBranch:
      "worker-it/source-history/source-history-source-change-turn-alpha",
    timestamp: "2026-04-24T10:00:40.000Z",
    turnId: "turn-alpha",
    type: "source_history.published"
  };
}

function createWikiRepositoryPublishedEvent(): HostEventRecord {
  return {
    artifactId: "wiki-repository-worker-it-wiki-commit",
    branch: "worker-it/wiki-repository/entangle-wiki",
    category: "runtime",
    commit: "wiki-commit-alpha",
    eventId: "evt-wiki-repository-published",
    graphId: "team-alpha",
    graphRevisionId: "team-alpha-20260424-000000",
    message:
      "Wiki repository for runtime 'worker-it' published artifact 'wiki-repository-worker-it-wiki-commit'.",
    nodeId: "worker-it",
    publicationId: "wiki-publication-alpha",
    publicationState: "published",
    schemaVersion: "1",
    timestamp: "2026-04-24T10:00:50.000Z",
    type: "wiki_repository.published"
  };
}

describe("host event inspection helpers", () => {
  it("matches runtime recovery events by node id and type prefix", () => {
    const event = createRuntimeRecoveryRecordedEvent();

    expect(
      hostEventMatchesFilter(event, {
        nodeId: "worker-it",
        typePrefixes: [...runtimeRecoveryEventTypePrefixes]
      })
    ).toBe(true);
    expect(
      hostEventMatchesFilter(event, {
        nodeId: "worker-marketing",
        typePrefixes: [...runtimeRecoveryEventTypePrefixes]
      })
    ).toBe(false);
  });

  it("filters host events by category, node id, and type prefix", () => {
    const events: HostEventRecord[] = [
      createSessionEvent(),
      createRuntimeRecoveryRecordedEvent()
    ];

    expect(
      filterHostEvents(events, {
        categories: ["runtime"],
        nodeId: "worker-it",
        typePrefixes: ["runtime.recovery."]
      })
    ).toEqual([createRuntimeRecoveryRecordedEvent()]);
  });

  it("exposes a runtime trace prefix set that matches session activity and excludes recovery-only events", () => {
    expect(
      hostEventMatchesFilter(createSessionEvent(), {
        nodeId: "worker-it",
        typePrefixes: [...runtimeTraceEventTypePrefixes]
      })
    ).toBe(true);

    expect(
      hostEventMatchesFilter(createRuntimeRecoveryRecordedEvent(), {
        nodeId: "worker-it",
        typePrefixes: [...runtimeTraceEventTypePrefixes]
      })
    ).toBe(false);
    expect(
      hostEventMatchesFilter(createSourceChangeCandidateReviewedEvent(), {
        nodeId: "worker-it",
        typePrefixes: [...runtimeTraceEventTypePrefixes]
      })
    ).toBe(true);
    expect(
      hostEventMatchesFilter(createSourceHistoryUpdatedEvent(), {
        nodeId: "worker-it",
        typePrefixes: [...runtimeTraceEventTypePrefixes]
      })
    ).toBe(true);
    expect(
      hostEventMatchesFilter(createSourceHistoryPublishedEvent(), {
        nodeId: "worker-it",
        typePrefixes: [...runtimeTraceEventTypePrefixes]
      })
    ).toBe(true);
    expect(
      hostEventMatchesFilter(createWikiRepositoryPublishedEvent(), {
        nodeId: "worker-it",
        typePrefixes: [...runtimeTraceEventTypePrefixes]
      })
    ).toBe(true);
  });
});
