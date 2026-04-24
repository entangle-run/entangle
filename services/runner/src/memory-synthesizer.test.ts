import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { AgentEngine } from "@entangle/agent-engine";
import type { AgentEngineTurnRequest } from "@entangle/types";
import { buildAgentEngineTurnRequest, loadRuntimeContext } from "./runtime-context.js";
import { performPostTurnMemoryUpdate } from "./memory-maintenance.js";
import { createModelGuidedMemorySynthesizer } from "./memory-synthesizer.js";
import {
  buildInboundTaskRequest,
  cleanupRuntimeFixtures,
  createRuntimeFixture
} from "./test-fixtures.js";

afterEach(async () => {
  await cleanupRuntimeFixtures();
});

describe("model-guided memory synthesis", () => {
  it("writes and indexes a bounded working-context summary via a forced strict tool call", async () => {
    const fixture = await createRuntimeFixture();
    const context = await loadRuntimeContext(fixture.contextPath);
    const envelope = buildInboundTaskRequest({
      summary: "Review the relay recovery follow-up."
    });
    const memoryUpdate = await performPostTurnMemoryUpdate({
      consumedArtifactIds: ["input-report"],
      context,
      envelope,
      producedArtifactIds: ["report-turn-005"],
      result: {
        assistantMessages: [
          "Reviewed the recovery follow-up and identified the next checkpoint."
        ],
        stopReason: "completed",
        toolExecutions: [],
        toolRequests: [],
        usage: {
          inputTokens: 12,
          outputTokens: 7
        }
      },
      turnId: "turn-memory-005"
    });

    let capturedRequest: AgentEngineTurnRequest | undefined;
    const synthesizer = createModelGuidedMemorySynthesizer({
      context,
      engineFactory(toolExecutor): AgentEngine {
        return {
          async executeTurn(request) {
            capturedRequest = request;
            const summaryTool = request.toolDefinitions.find(
              (toolDefinition) => toolDefinition.id === "write_memory_summary"
            );

            if (!summaryTool) {
              throw new Error("Expected the working-context synthesis tool.");
            }

            const toolResult = await toolExecutor.executeToolCall({
              artifactInputs: [],
              input: {
                focus: "Keep the recovery follow-up aligned with the relay-runtime work.",
                nextActions: [
                  "Validate the recovery checkpoint against the latest runner behavior.",
                  "Confirm the relay failure path in the next session."
                ],
                openQuestions: [
                  "Does the current recovery trace expose enough detail for operators?"
                ],
                stableFacts: [
                  "The runner already persists recovery history through the host.",
                  "The latest turn completed without additional blockers."
                ],
                summary:
                  "The node is currently focused on the relay recovery follow-up. " +
                  "The current state is stable enough to proceed, but the operator " +
                  "still needs clearer confirmation around the next recovery checkpoint."
              },
              memoryRefs: request.memoryRefs,
              nodeId: request.nodeId,
              sessionId: request.sessionId,
              tool: summaryTool,
              toolCallId: "toolu_working_context"
            });

            expect(toolResult.isError).toBe(false);

            return {
              assistantMessages: ["Working context summary updated."],
              stopReason: "completed",
              toolExecutions: [],
              toolRequests: [],
              usage: {
                inputTokens: 3,
                outputTokens: 2
              }
            };
          }
        };
      }
    });

    const synthesisResult = await synthesizer.synthesize({
      consumedArtifactIds: ["input-report"],
      context,
      envelope,
      producedArtifactIds: ["report-turn-005"],
      recentWorkSummaryPath: memoryUpdate.summaryPagePath,
      result: {
        assistantMessages: [
          "Reviewed the recovery follow-up and identified the next checkpoint."
        ],
        stopReason: "completed",
        toolExecutions: [],
        toolRequests: [],
        usage: {
          inputTokens: 12,
          outputTokens: 7
        }
      },
      taskPagePath: memoryUpdate.taskPagePath,
      turnId: "turn-memory-005"
    });

    expect(synthesisResult.ok).toBe(true);
    const workingContextPagePath =
      synthesisResult.ok ? synthesisResult.workingContextPagePath : undefined;

    expect(capturedRequest?.toolChoice).toEqual({
      type: "tool",
      toolId: "write_memory_summary"
    });
    expect(capturedRequest?.toolDefinitions).toEqual([
      expect.objectContaining({
        id: "write_memory_summary",
        strict: true
      })
    ]);
    expect(capturedRequest?.memoryRefs).toEqual(
      expect.arrayContaining([
        memoryUpdate.summaryPagePath,
        memoryUpdate.taskPagePath
      ])
    );

    if (!workingContextPagePath) {
      throw new Error("Expected a working context summary path.");
    }

    const [workingContextPage, indexPage, logPage, followupTurnRequest] =
      await Promise.all([
        readFile(workingContextPagePath, "utf8"),
        readFile(memoryUpdate.indexPath, "utf8"),
        readFile(memoryUpdate.logPath, "utf8"),
        buildAgentEngineTurnRequest(context)
      ]);

    expect(workingContextPage).toContain("# Working Context Summary");
    expect(workingContextPage).toContain("## Current Focus");
    expect(workingContextPage).toContain(
      "Keep the recovery follow-up aligned with the relay-runtime work."
    );
    expect(workingContextPage).toContain("## Stable Facts");
    expect(workingContextPage).toContain(
      "The runner already persists recovery history through the host."
    );
    expect(indexPage).toContain("[Working Context Summary](summaries/working-context.md)");
    expect(logPage).toContain("memory synthesis | turn-memory-005");
    expect(followupTurnRequest.memoryRefs).toContain(workingContextPagePath);
  });

  it("records synthesis failure in the wiki log without throwing", async () => {
    const fixture = await createRuntimeFixture();
    const context = await loadRuntimeContext(fixture.contextPath);
    const envelope = buildInboundTaskRequest();
    const memoryUpdate = await performPostTurnMemoryUpdate({
      consumedArtifactIds: [],
      context,
      envelope,
      producedArtifactIds: ["report-turn-006"],
      result: {
        assistantMessages: ["Completed the task and handed off the report."],
        stopReason: "completed",
        toolExecutions: [],
        toolRequests: [],
        usage: {
          inputTokens: 10,
          outputTokens: 6
        }
      },
      turnId: "turn-memory-006"
    });
    const synthesizer = createModelGuidedMemorySynthesizer({
      context,
      engineFactory(): AgentEngine {
        return {
          executeTurn() {
            return Promise.reject(new Error("provider unavailable"));
          }
        };
      }
    });

    const synthesisResult = await synthesizer.synthesize({
      consumedArtifactIds: [],
      context,
      envelope,
      producedArtifactIds: ["report-turn-006"],
      recentWorkSummaryPath: memoryUpdate.summaryPagePath,
      result: {
        assistantMessages: ["Completed the task and handed off the report."],
        stopReason: "completed",
        toolExecutions: [],
        toolRequests: [],
        usage: {
          inputTokens: 10,
          outputTokens: 6
        }
      },
      taskPagePath: memoryUpdate.taskPagePath,
      turnId: "turn-memory-006"
    });

    expect(synthesisResult).toEqual({
      errorMessage: "provider unavailable",
      ok: false
    });

    const logPage = await readFile(
      path.join(context.workspace.memoryRoot, "wiki", "log.md"),
      "utf8"
    );

    expect(logPage).toContain("memory synthesis failed | turn-memory-006");
    expect(logPage).toContain("provider unavailable");
  });
});
