import { describe, expect, it } from "vitest";
import type { RunnerTurnRecord } from "@entangle/types";
import { projectRuntimeTurnSummary } from "./runtime-turn-output.js";

describe("runtime turn CLI output", () => {
  it("projects persisted runner turns into compact summary records", () => {
    const turn: RunnerTurnRecord = {
      consumedArtifactIds: ["artifact-inbound"],
      emittedHandoffMessageIds: [],
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
            errorCode: "tool_result_error",
            message: "Tool 'inspect_memory_ref' returned an error result.",
            outcome: "error",
            sequence: 1,
            toolCallId: "toolu-alpha",
            toolId: "inspect_memory_ref"
          }
        ],
        usage: {
          inputTokens: 21,
          outputTokens: 8
        }
      },
      graphId: "team-alpha",
      nodeId: "worker-it",
      phase: "persisting",
      producedArtifactIds: ["artifact-report"],
      sessionId: "session-alpha",
      sourceChangeCandidateIds: ["source-change-turn-alpha"],
      sourceChangeSummary: {
        additions: 3,
        checkedAt: "2026-04-24T10:01:00.000Z",
        deletions: 1,
        fileCount: 1,
        files: [
          {
            additions: 3,
            deletions: 1,
            path: "src/index.ts",
            status: "modified"
          }
        ],
        status: "changed"
      },
      startedAt: "2026-04-24T10:00:00.000Z",
      triggerKind: "message",
      turnId: "turn-alpha",
      updatedAt: "2026-04-24T10:01:00.000Z"
    };

    const summary = projectRuntimeTurnSummary(turn);

    expect(summary).toMatchObject({
      artifactSummary: "Artifacts consumed 1 · produced 1 · handoffs 0",
      label: "turn-alpha · persisting · session-alpha",
      phase: "persisting",
      sessionId: "session-alpha",
      status:
        "Trigger message · engine completed · memory not_run · wiki repo not_run · source changed",
      turnId: "turn-alpha",
      updatedAt: "2026-04-24T10:01:00.000Z"
    });
    expect(summary.detailLines).toEqual(
      expect.arrayContaining([
        "handoff messages none",
        "source change candidates source-change-turn-alpha",
        "source changes 1 file (+3/-1)",
        "provider anthropic/shared-anthropic (claude-opus-4-7)",
        "tool error #1 inspect_memory_ref: tool_result_error - Tool 'inspect_memory_ref' returned an error result."
      ])
    );
  });
});
