import { describe, expect, it } from "vitest";
import type { HostStatusResponse } from "@entangle/types";
import {
  formatHostArtifactBackendCacheClearSummary,
  formatHostArtifactBackendCacheSummary,
  formatHostStatusDetailLines,
  formatHostStatusLabel,
  formatHostStatusReconciliationSummary,
  formatHostTransportControlObserveSummary
} from "./host-status.js";

function createStatus(): HostStatusResponse {
  return {
    artifactBackendCache: {
      available: true,
      repositoryCount: 2,
      totalSizeBytes: 4096,
      updatedAt: "2026-04-25T08:00:02.000Z"
    },
    graphRevisionId: "team-alpha-20260425-080000",
    reconciliation: {
      backendKind: "docker",
      blockedRuntimeCount: 1,
      degradedRuntimeCount: 1,
      failedRuntimeCount: 1,
      findingCodes: ["context_unavailable", "runtime_failed"],
      issueCount: 2,
      lastReconciledAt: "2026-04-25T08:00:01.000Z",
      managedRuntimeCount: 3,
      runningRuntimeCount: 1,
      stoppedRuntimeCount: 1,
      transitioningRuntimeCount: 0
    },
    runtimeCounts: {
      desired: 3,
      observed: 3,
      running: 1
    },
    service: "entangle-host",
    sessionDiagnostics: {
      consistencyFindingCount: 2,
      inspectedSessionCount: 4,
      sessionsWithConsistencyFindings: 1
    },
    stateLayout: {
      checkedAt: "2026-04-25T08:00:02.000Z",
      currentLayoutVersion: 1,
      minimumSupportedLayoutVersion: 1,
      recordedAt: "2026-04-25T08:00:00.000Z",
      recordedLayoutVersion: 1,
      status: "current"
    },
    status: "degraded",
    timestamp: "2026-04-25T08:00:02.000Z",
    transport: {
      controlObserve: {
        configuredRelayCount: 1,
        lastFailureAt: "2026-04-25T08:00:02.000Z",
        lastFailureMessage: "subscription refused",
        relayUrls: ["ws://relay.entangle.test"],
        relays: [
          {
            lastFailureAt: "2026-04-25T08:00:02.000Z",
            lastFailureMessage: "subscription refused",
            relayUrl: "ws://relay.entangle.test",
            status: "degraded",
            updatedAt: "2026-04-25T08:00:02.000Z"
          }
        ],
        status: "degraded",
        updatedAt: "2026-04-25T08:00:02.000Z"
      }
    }
  };
}

describe("host status presentation helpers", () => {
  it("formats host status labels and reconciliation summaries", () => {
    const status = createStatus();

    expect(formatHostStatusLabel(status)).toBe("entangle-host · degraded");
    expect(formatHostStatusReconciliationSummary(status)).toBe(
      "3 runtimes · 2 issues · 1 degraded · 1 blocked"
    );
    expect(formatHostTransportControlObserveSummary(status)).toBe(
      "degraded · 1 relay"
    );
    expect(formatHostArtifactBackendCacheSummary(status)).toBe(
      "2 repositories · 4096 bytes"
    );
    expect(
      formatHostArtifactBackendCacheClearSummary({
        completedAt: "2026-04-25T08:00:03.000Z",
        dryRun: false,
        maxSizeBytes: 8192,
        olderThanSeconds: 3600,
        repositoryCount: 2,
        retainedRepositoryCount: 1,
        retainedSizeBytes: 2048,
        status: "cleared",
        totalSizeBytes: 4096
      })
    ).toBe(
      "cleared · older than 3600s · max 8192 bytes · 2 repositories · 1 retained · 2048 retained bytes · 4096 bytes"
    );
  });

  it("formats bounded host status detail lines", () => {
    const detailLines = formatHostStatusDetailLines(createStatus());

    expect(detailLines).toContain(
      "runtime counts desired 3, observed 3, running 1"
    );
    expect(detailLines).toContain(
      "session diagnostics 4 sessions · 2 consistency findings · 1 affected"
    );
    expect(detailLines).toContain(
      "artifact backend cache 2 repositories · 4096 bytes"
    );
    expect(detailLines).toContain("state layout v1 · current");
    expect(detailLines).toContain(
      "findings context_unavailable, runtime_failed"
    );
    expect(detailLines).toContain(
      "last reconciled 2026-04-25T08:00:01.000Z"
    );
    expect(detailLines).toContain(
      "transport control/observe degraded · 1 relay"
    );
    expect(detailLines).toContain("transport failure subscription refused");
    expect(detailLines).toContain("transport relays ws://relay.entangle.test");
    expect(detailLines).toContain(
      "transport relay ws://relay.entangle.test degraded · failure subscription refused"
    );
  });
});
