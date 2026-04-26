import { describe, expect, it } from "vitest";
import type { RuntimeInspectionResponse } from "@entangle/types";
import {
  formatRuntimeInspectionDetailLines,
  formatRuntimeInspectionLabel,
  formatRuntimeInspectionStatus,
  formatRuntimeWorkspaceHealthSummary,
  sortRuntimeInspectionsForPresentation
} from "./runtime-inspection.js";

function createRuntime(
  nodeId: string,
  observedState: RuntimeInspectionResponse["observedState"]
): RuntimeInspectionResponse {
  return {
    agentRuntime: {
      defaultAgent: "general",
      engineKind: "opencode_server",
      engineProfileDisplayName: "Local OpenCode",
      engineProfileRef: "local-opencode",
      lastEngineSessionId: "opencode-session-alpha",
      lastEngineStopReason: "completed",
      lastEngineVersion: "0.10.0",
      lastPermissionDecision: "rejected",
      lastPermissionOperation: "command_execution",
      lastPermissionReason:
        "OpenCode one-shot CLI auto-rejected the permission request.",
      lastProducedArtifactIds: ["artifact-report"],
      lastRequestedApprovalIds: ["approval-source-publication"],
      lastSourceChangeCandidateId: "source-change-turn-alpha",
      lastSourceChangeSummary: {
        additions: 5,
        checkedAt: "2026-04-25T08:05:00.000Z",
        deletions: 1,
        fileCount: 1,
        files: [
          {
            additions: 5,
            deletions: 1,
            path: "src/agent.ts",
            status: "modified"
          }
        ],
        status: "changed"
      },
      lastTurnId: "turn-alpha",
      lastTurnUpdatedAt: "2026-04-25T08:05:00.000Z",
      mode: "coding_agent",
      pendingApprovalIds: ["approval-source-publication"],
      stateScope: "node"
    },
    backendKind: "docker",
    contextAvailable: observedState !== "failed",
    desiredState: "running",
    graphId: "team-alpha",
    graphRevisionId: "team-alpha-20260425-080000",
    nodeId,
    observedState,
    packageSourceId: `${nodeId}-pack`,
    primaryGitRepositoryProvisioning: {
      checkedAt: "2026-04-25T08:00:00.000Z",
      created: false,
      schemaVersion: "1",
      state: "ready",
      target: {
        gitServiceRef: "local-gitea",
        namespace: "team-alpha",
        provisioningMode: "gitea_api",
        remoteUrl: "http://gitea.local/team-alpha/runtime.git",
        repositoryName: "runtime",
        transportKind: "https"
      }
    },
    reconciliation:
      observedState === "failed"
        ? {
            findingCodes: ["runtime_failed"],
            state: "degraded"
          }
        : {
            findingCodes: [],
            state: "aligned"
          },
    restartGeneration: 2,
    runtimeHandle: `${nodeId}-container`,
    workspaceHealth: {
      checkedAt: "2026-04-25T08:05:01.000Z",
      layoutVersion: "entangle-local-workspace-v1",
      status: "ready",
      surfaces: [
        {
          access: ["read", "write"],
          required: true,
          status: "ready",
          surface: "source_workspace"
        },
        {
          access: ["read", "write"],
          required: true,
          status: "ready",
          surface: "engine_state"
        }
      ]
    }
  };
}

describe("runtime inspection presentation helpers", () => {
  it("sorts runtime inspections by node id", () => {
    expect(
      sortRuntimeInspectionsForPresentation([
        createRuntime("worker-b", "running"),
        createRuntime("worker-a", "running")
      ]).map((runtime) => runtime.nodeId)
    ).toEqual(["worker-a", "worker-b"]);
  });

  it("formats runtime labels, status, and detail lines", () => {
    const runtime = createRuntime("worker-it", "failed");

    expect(formatRuntimeInspectionLabel(runtime)).toBe("worker-it · failed");
    expect(formatRuntimeInspectionStatus(runtime)).toBe(
      "running/failed · reconciliation degraded · findings runtime_failed"
    );
    expect(formatRuntimeInspectionDetailLines(runtime)).toContain(
      "context unavailable"
    );
    expect(formatRuntimeInspectionDetailLines(runtime)).toContain(
      "git provisioning ready · created no · local-gitea/team-alpha/runtime"
    );
    expect(formatRuntimeInspectionDetailLines(runtime)).toContain(
      "agent runtime coding_agent / opencode_server / local-opencode"
    );
    expect(formatRuntimeInspectionDetailLines(runtime)).toContain(
      "last engine session opencode-session-alpha"
    );
    expect(formatRuntimeInspectionDetailLines(runtime)).toContain(
      "last engine version 0.10.0"
    );
    expect(formatRuntimeInspectionDetailLines(runtime)).toContain(
      "last permission rejected command_execution: OpenCode one-shot CLI auto-rejected the permission request."
    );
    expect(formatRuntimeInspectionDetailLines(runtime)).toContain(
      "pending approvals approval-source-publication"
    );
    expect(formatRuntimeInspectionDetailLines(runtime)).toContain(
      "last produced artifacts artifact-report"
    );
    expect(formatRuntimeInspectionDetailLines(runtime)).toContain(
      "last requested approvals approval-source-publication"
    );
    expect(formatRuntimeInspectionDetailLines(runtime)).toContain(
      "last source changes 1 file (+5/-1)"
    );
    expect(formatRuntimeInspectionDetailLines(runtime)).toContain(
      "last source candidate source-change-turn-alpha"
    );
    expect(formatRuntimeWorkspaceHealthSummary(runtime)).toBe(
      "ready · 2 surfaces"
    );
    expect(formatRuntimeInspectionDetailLines(runtime)).toContain(
      "workspace ready · 2 surfaces"
    );
  });
});
