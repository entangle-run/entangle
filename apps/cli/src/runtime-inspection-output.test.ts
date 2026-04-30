import { describe, expect, it } from "vitest";
import type { RuntimeInspectionResponse } from "@entangle/types";
import { projectRuntimeInspectionSummary } from "./runtime-inspection-output.js";

function createRuntime(): RuntimeInspectionResponse {
  return {
    agentRuntime: {
      engineKind: "opencode_server",
      enginePermissionMode: "auto_reject",
      engineProfileRef: "opencode-default",
      lastEngineSessionId: "opencode-session-alpha",
      lastEngineVersion: "0.10.0",
      lastPermissionDecision: "rejected",
      lastPermissionOperation: "command_execution",
      lastPermissionReason:
        "OpenCode one-shot CLI auto-rejected the permission request.",
      lastProducedArtifactIds: ["artifact-report"],
      lastRequestedApprovalIds: ["approval-source-publication"],
      lastSourceChangeCandidateId: "source-change-turn-alpha",
      lastSourceChangeSummary: {
        additions: 4,
        checkedAt: "2026-04-25T08:05:00.000Z",
        deletions: 0,
        fileCount: 1,
        files: [
          {
            additions: 4,
            deletions: 0,
            path: "README.md",
            status: "modified"
          }
        ],
        status: "changed"
      },
      mode: "coding_agent",
      pendingApprovalIds: ["approval-source-publication"],
      stateScope: "node"
    },
    backendKind: "docker",
    contextAvailable: false,
    desiredState: "running",
    graphId: "team-alpha",
    graphRevisionId: "team-alpha-20260425-080000",
    nodeId: "worker-it",
    observedState: "failed",
    packageSourceId: "it-pack",
    reconciliation: {
      findingCodes: ["runtime_failed"],
      state: "degraded"
    },
    restartGeneration: 3,
    statusMessage: "container exited",
    workspaceHealth: {
      checkedAt: "2026-04-25T08:05:01.000Z",
      layoutVersion: "entangle-workspace-v1",
      status: "degraded",
      surfaces: [
        {
          access: ["read", "write"],
          reason: "Workspace surface is not writable by the host process.",
          required: true,
          status: "unwritable",
          surface: "source_workspace"
        }
      ]
    }
  };
}

describe("runtime inspection CLI summary projection", () => {
  it("projects runtime inspection into compact operator summaries", () => {
    expect(projectRuntimeInspectionSummary(createRuntime())).toMatchObject({
      backendKind: "docker",
      contextAvailable: false,
      findingCodes: ["runtime_failed"],
      label: "worker-it · failed",
      nodeId: "worker-it",
      observedState: "failed",
      reconciliationState: "degraded",
      restartGeneration: 3,
      status: "running/failed · reconciliation degraded · findings runtime_failed"
    });
    expect(projectRuntimeInspectionSummary(createRuntime()).detailLines).toContain(
      "status container exited"
    );
    expect(projectRuntimeInspectionSummary(createRuntime()).detailLines).toContain(
      "workspace degraded · source_workspace:unwritable"
    );
    expect(projectRuntimeInspectionSummary(createRuntime()).detailLines).toContain(
      "agent runtime coding_agent / opencode_server / opencode-default"
    );
    expect(projectRuntimeInspectionSummary(createRuntime()).detailLines).toContain(
      "engine permission mode auto_reject"
    );
    expect(projectRuntimeInspectionSummary(createRuntime()).detailLines).toContain(
      "last engine version 0.10.0"
    );
    expect(projectRuntimeInspectionSummary(createRuntime()).detailLines).toContain(
      "last permission rejected command_execution: OpenCode one-shot CLI auto-rejected the permission request."
    );
    expect(projectRuntimeInspectionSummary(createRuntime()).detailLines).toContain(
      "pending approvals approval-source-publication"
    );
    expect(projectRuntimeInspectionSummary(createRuntime()).detailLines).toContain(
      "last produced artifacts artifact-report"
    );
    expect(projectRuntimeInspectionSummary(createRuntime()).detailLines).toContain(
      "last source changes 1 file (+4/-0)"
    );
    expect(projectRuntimeInspectionSummary(createRuntime()).detailLines).toContain(
      "last source candidate source-change-turn-alpha"
    );
  });
});
