import { describe, expect, it } from "vitest";
import type { HostStatusResponse } from "@entangle/types";
import { projectHostStatusSummary } from "./host-status-output.js";

function createStatus(): HostStatusResponse {
  return {
    artifactBackendCache: {
      available: true,
      repositoryCount: 1,
      totalSizeBytes: 2048,
      updatedAt: "2026-04-25T08:00:02.000Z"
    },
    graphRevisionId: "team-alpha-20260425-080000",
    reconciliation: {
      backendKind: "docker",
      blockedRuntimeCount: 1,
      degradedRuntimeCount: 1,
      failedRuntimeCount: 1,
      findingCodes: ["runtime_failed"],
      issueCount: 1,
      lastReconciledAt: "2026-04-25T08:00:01.000Z",
      managedRuntimeCount: 2,
      runningRuntimeCount: 1,
      stoppedRuntimeCount: 0,
      transitioningRuntimeCount: 0
    },
    runtimeCounts: {
      desired: 2,
      observed: 2,
      running: 1
    },
    security: {
      operatorAuthMode: "bootstrap_operator_token",
      operatorId: "ops-lead",
      operatorRole: "operator"
    },
    service: "entangle-host",
    sessionDiagnostics: {
      consistencyFindingCount: 3,
      inspectedSessionCount: 2,
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
        configuredRelayCount: 2,
        relayUrls: ["ws://relay-a.entangle.test", "ws://relay-b.entangle.test"],
        relays: [
          {
            relayUrl: "ws://relay-a.entangle.test",
            status: "subscribed",
            subscribedAt: "2026-04-25T08:00:01.000Z",
            updatedAt: "2026-04-25T08:00:01.000Z"
          },
          {
            relayUrl: "ws://relay-b.entangle.test",
            status: "subscribed",
            subscribedAt: "2026-04-25T08:00:01.000Z",
            updatedAt: "2026-04-25T08:00:01.000Z"
          }
        ],
        status: "subscribed",
        subscribedAt: "2026-04-25T08:00:01.000Z",
        updatedAt: "2026-04-25T08:00:01.000Z"
      }
    }
  };
}

describe("host status CLI summary projection", () => {
  it("projects host status into compact operator summaries", () => {
    expect(projectHostStatusSummary(createStatus())).toMatchObject({
      graphRevisionId: "team-alpha-20260425-080000",
      label: "entangle-host · degraded",
      reconciliation: {
        findingCodes: ["runtime_failed"],
        summary: "2 runtimes · 1 issues · 1 degraded · 1 blocked"
      },
      runtimeCounts: {
        running: 1
      },
      security: {
        operatorAuthMode: "bootstrap_operator_token",
        operatorId: "ops-lead",
        operatorRole: "operator",
        summary: "bootstrap operator token · ops-lead · operator"
      },
      sessionDiagnostics: {
        consistencyFindingCount: 3,
        summary: "2 sessions · 3 consistency findings · 1 affected"
      },
      stateLayout: {
        summary: "v1 · current"
      },
      status: "degraded",
      transport: {
        controlObserve: {
          relays: [
            {
              relayUrl: "ws://relay-a.entangle.test",
              status: "subscribed"
            },
            {
              relayUrl: "ws://relay-b.entangle.test",
              status: "subscribed"
            }
          ],
          summary: "subscribed · 2 relays"
        }
      }
    });
    expect(projectHostStatusSummary(createStatus()).detailLines).toContain(
      "findings runtime_failed"
    );
    expect(projectHostStatusSummary(createStatus()).detailLines).toContain(
      "transport control/observe subscribed · 2 relays"
    );
    expect(projectHostStatusSummary(createStatus()).detailLines).toContain(
      "artifact backend cache 1 repository · 2048 bytes"
    );
    expect(projectHostStatusSummary(createStatus()).detailLines).toContain(
      "security bootstrap operator token · ops-lead · operator"
    );
    expect(projectHostStatusSummary(createStatus()).detailLines).toContain(
      "transport relay ws://relay-a.entangle.test subscribed · subscribed 2026-04-25T08:00:01.000Z"
    );
  });
});
