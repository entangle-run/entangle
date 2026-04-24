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

    expect(shouldRefreshOverviewFromHostEvent(packageSourceEvent)).toBe(true);
    expect(shouldRefreshOverviewFromHostEvent(packageSourceDeletedEvent)).toBe(
      true
    );
    expect(shouldRefreshOverviewFromHostEvent(externalPrincipalDeletedEvent)).toBe(
      true
    );
    expect(shouldRefreshOverviewFromHostEvent(graphEvent)).toBe(true);
    expect(shouldRefreshOverviewFromHostEvent(runtimeEvent)).toBe(true);
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
  });
});
