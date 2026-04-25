import { describe, expect, it } from "vitest";
import type { RuntimeRecoveryInspectionResponse } from "@entangle/types";
import { projectRuntimeRecoverySummary } from "./runtime-recovery-output.js";

describe("runtime recovery CLI output", () => {
  it("projects recovery inspection into compact operator summaries", () => {
    const recovery: RuntimeRecoveryInspectionResponse = {
      controller: {
        attemptsUsed: 1,
        nodeId: "worker-it",
        schemaVersion: "1",
        state: "manual_required",
        updatedAt: "2026-04-24T10:02:00.000Z"
      },
      currentRuntime: {
        backendKind: "docker",
        contextAvailable: true,
        desiredState: "running",
        graphId: "team-alpha",
        graphRevisionId: "team-alpha-20260424-000000",
        nodeId: "worker-it",
        observedState: "failed",
        reconciliation: {
          findingCodes: ["runtime_failed"],
          state: "degraded"
        },
        restartGeneration: 1,
        statusMessage: "container exited"
      },
      entries: [
        {
          lastError: "container exited",
          recordedAt: "2026-04-24T10:01:00.000Z",
          recoveryId: "worker-it-20260424t100100-failed",
          runtime: {
            backendKind: "docker",
            contextAvailable: true,
            desiredState: "running",
            graphId: "team-alpha",
            graphRevisionId: "team-alpha-20260424-000000",
            nodeId: "worker-it",
            observedState: "failed",
            reconciliation: {
              findingCodes: ["runtime_failed"],
              state: "degraded"
            },
            restartGeneration: 1,
            statusMessage: "container exited"
          }
        }
      ],
      nodeId: "worker-it",
      policy: {
        nodeId: "worker-it",
        policy: {
          cooldownSeconds: 30,
          maxAttempts: 3,
          mode: "restart_on_failure"
        },
        schemaVersion: "1",
        updatedAt: "2026-04-24T10:00:00.000Z"
      }
    };

    expect(projectRuntimeRecoverySummary(recovery)).toMatchObject({
      controller: "Manual intervention required",
      controllerState: "manual_required",
      currentObservedState: "failed",
      entries: [
        {
          label: "worker-it-20260424t100100-failed · failed",
          observedState: "failed",
          recoveryId: "worker-it-20260424t100100-failed",
          restartGeneration: 1
        }
      ],
      nodeId: "worker-it",
      policyMode: "restart_on_failure"
    });
    expect(projectRuntimeRecoverySummary(recovery).entries[0]?.detailLines).toEqual(
      expect.arrayContaining(["last error container exited"])
    );
  });
});
