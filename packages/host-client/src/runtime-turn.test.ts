import { describe, expect, it } from "vitest";
import type { RunnerTurnRecord } from "@entangle/types";
import {
  formatRuntimeTurnArtifactSummary,
  formatRuntimeTurnDetailLines,
  formatRuntimeTurnLabel,
  formatRuntimeTurnStatus,
  sortRuntimeTurnsForPresentation
} from "./runtime-turn.js";

function createTurn(
  turnId: string,
  updatedAt: string
): RunnerTurnRecord {
  return {
    consumedArtifactIds: ["artifact-inbound"],
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
          outcome: "success",
          sequence: 1,
          toolCallId: "toolu-alpha",
          toolId: "inspect_artifact_input"
        },
        {
          errorCode: "tool_execution_failed",
          message: "Tool 'inspect_memory_ref' failed during execution.",
          outcome: "error",
          sequence: 2,
          toolCallId: "toolu-beta",
          toolId: "inspect_memory_ref"
        }
      ],
      usage: {
        inputTokens: 42,
        outputTokens: 12
      }
    },
    emittedHandoffMessageIds: [
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    ],
    graphId: "team-alpha",
    memoryRepositorySyncOutcome: {
      branch: "entangle-wiki",
      changedFileCount: 4,
      commit: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      status: "committed",
      syncedAt: updatedAt
    },
    memorySynthesisOutcome: {
      status: "succeeded",
      updatedAt,
      updatedSummaryPagePaths: [
        "/tmp/runtime/memory/wiki/summaries/working-context.md",
        "/tmp/runtime/memory/wiki/summaries/stable-facts.md"
      ],
      workingContextPagePath:
        "/tmp/runtime/memory/wiki/summaries/working-context.md"
    },
    nodeId: "worker-it",
    phase: "emitting",
    producedArtifactIds: ["artifact-report"],
    sessionId: "session-alpha",
    sourceChangeCandidateIds: ["source-change-turn-alpha"],
    sourceChangeSummary: {
      additions: 8,
      checkedAt: "2026-04-24T11:00:00.000Z",
      deletions: 2,
      fileCount: 2,
      files: [
        {
          additions: 6,
          deletions: 1,
          path: "src/worker.ts",
          status: "modified"
        },
        {
          additions: 2,
          deletions: 1,
          path: "tests/worker.test.ts",
          status: "added"
        }
      ],
      status: "changed"
    },
    startedAt: "2026-04-24T10:00:00.000Z",
    triggerKind: "message",
    turnId,
    updatedAt
  };
}

describe("runtime turn presentation helpers", () => {
  it("sorts runtime turns by most recent update first", () => {
    const older = createTurn("turn-older", "2026-04-24T10:00:00.000Z");
    const newer = createTurn("turn-newer", "2026-04-24T11:00:00.000Z");

    expect(
      sortRuntimeTurnsForPresentation([older, newer]).map((turn) => turn.turnId)
    ).toEqual(["turn-newer", "turn-older"]);
  });

  it("formats labels, status, artifact summaries, and detail lines", () => {
    const turn = createTurn("turn-alpha", "2026-04-24T11:00:00.000Z");

    expect(formatRuntimeTurnLabel(turn)).toBe(
      "turn-alpha · emitting · session-alpha"
    );
    expect(formatRuntimeTurnStatus(turn)).toBe(
      "Trigger message · engine completed · memory succeeded · wiki repo committed · source changed"
    );
    expect(formatRuntimeTurnArtifactSummary(turn)).toBe(
      "Artifacts consumed 1 · produced 1 · handoffs 1"
    );
    expect(formatRuntimeTurnDetailLines(turn)).toEqual(
      expect.arrayContaining([
        "handoff messages aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "source change candidates source-change-turn-alpha",
        "source changes 2 files (+8/-2)",
        "source file modified src/worker.ts (+6/-1)",
        "source file added tests/worker.test.ts (+2/-1)",
        "provider anthropic/shared-anthropic (claude-opus-4-7)",
        "engine outcome completed",
        "engine session engine-session-alpha",
        "engine version 0.10.0",
        "provider stop end_turn",
        "permission rejected command_execution: OpenCode one-shot CLI auto-rejected the permission request.",
        "usage 42 input / 12 output tokens",
        "tool executions 2 total (1 success, 1 error)",
        "tool error #2 inspect_memory_ref: tool_execution_failed - Tool 'inspect_memory_ref' failed during execution.",
        "memory synthesis succeeded with 2 summary pages",
        "wiki repository committed bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb on entangle-wiki (4 changed files)"
      ])
    );
  });
});
