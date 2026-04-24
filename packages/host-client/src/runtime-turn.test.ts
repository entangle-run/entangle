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
    graphId: "team-alpha",
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
      "Trigger message · engine completed · memory succeeded"
    );
    expect(formatRuntimeTurnArtifactSummary(turn)).toBe(
      "Artifacts consumed 1 · produced 1"
    );
    expect(formatRuntimeTurnDetailLines(turn)).toEqual(
      expect.arrayContaining([
        "provider anthropic/shared-anthropic (claude-opus-4-7)",
        "engine outcome completed",
        "provider stop end_turn",
        "usage 42 input / 12 output tokens",
        "tool executions 2 total (1 success, 1 error)",
        "tool error #2 inspect_memory_ref: tool_execution_failed - Tool 'inspect_memory_ref' failed during execution.",
        "memory synthesis succeeded with 2 summary pages"
      ])
    );
  });
});
