import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { AgentEngine } from "@entangle/agent-engine";
import type { AgentEngineTurnRequest } from "@entangle/types";
import { buildAgentEngineTurnRequest, loadRuntimeContext } from "./runtime-context.js";
import { performPostTurnMemoryUpdate } from "./memory-maintenance.js";
import { createModelGuidedMemorySynthesizer } from "./memory-synthesizer.js";
import {
  ensureRunnerStatePaths,
  writeArtifactRecord,
  writeConversationRecord,
  writeRunnerTurnRecord,
  writeSessionRecord
} from "./state-store.js";
import {
  buildInboundTaskRequest,
  cleanupRuntimeFixtures,
  createRuntimeFixture
} from "./test-fixtures.js";

afterEach(async () => {
  await cleanupRuntimeFixtures();
});

async function seedCurrentSessionState(input: {
  publicKey: string;
  runtimeRoot: string;
}): Promise<void> {
  const statePaths = await ensureRunnerStatePaths(input.runtimeRoot);

  await writeSessionRecord(statePaths, {
    activeConversationIds: ["conv-alpha"],
    entrypointNodeId: "lead-it",
    graphId: "graph-alpha",
    intent: "Review the relay recovery follow-up.",
    openedAt: "2026-04-24T11:00:00.000Z",
    ownerNodeId: "worker-it",
    rootArtifactIds: ["artifact-output"],
    sessionId: "session-alpha",
    status: "active",
    traceId: "trace-alpha",
    updatedAt: "2026-04-24T11:05:00.000Z",
    waitingApprovalIds: []
  });
  await writeConversationRecord(statePaths, {
    artifactIds: ["artifact-input"],
    conversationId: "conv-alpha",
    followupCount: 1,
    graphId: "graph-alpha",
    initiator: "local",
    localNodeId: "worker-it",
    localPubkey: input.publicKey,
    openedAt: "2026-04-24T11:00:00.000Z",
    peerNodeId: "reviewer-it",
    peerPubkey: input.publicKey,
    responsePolicy: {
      closeOnResult: true,
      maxFollowups: 1,
      responseRequired: true
    },
    sessionId: "session-alpha",
    status: "working",
    updatedAt: "2026-04-24T11:04:00.000Z"
  });
  await writeRunnerTurnRecord(statePaths, {
    consumedArtifactIds: ["artifact-input"],
    engineOutcome: {
      providerMetadata: {
        adapterKind: "anthropic",
        modelId: "claude-opus",
        profileId: "shared-model"
      },
      stopReason: "completed",
      toolExecutions: [
        {
          outcome: "success",
          sequence: 1,
          toolCallId: "toolu_previous",
          toolId: "inspect_session_state"
        }
      ],
      usage: {
        inputTokens: 10,
        outputTokens: 6
      }
    },
    graphId: "graph-alpha",
    nodeId: "worker-it",
    phase: "persisting",
    producedArtifactIds: ["artifact-output"],
    sessionId: "session-alpha",
    startedAt: "2026-04-24T11:01:00.000Z",
    triggerKind: "message",
    turnId: "turn-prev",
    updatedAt: "2026-04-24T11:04:30.000Z"
  });
  await Promise.all([
    writeArtifactRecord(statePaths, {
      createdAt: "2026-04-24T11:01:30.000Z",
      ref: {
        artifactId: "artifact-input",
        artifactKind: "report_file",
        backend: "git",
        locator: {
          branch: "reviewer-it/session-alpha/input",
          commit: "abc123",
          gitServiceRef: "local-gitea",
          namespace: "team-alpha",
          repositoryName: "graph-alpha",
          path: "reports/session-alpha/input.md"
        },
        preferred: true,
        status: "published"
      },
      retrieval: {
        retrievedAt: "2026-04-24T11:01:45.000Z",
        state: "retrieved"
      },
      updatedAt: "2026-04-24T11:01:45.000Z"
    }),
    writeArtifactRecord(statePaths, {
      createdAt: "2026-04-24T11:04:15.000Z",
      publication: {
        publishedAt: "2026-04-24T11:04:40.000Z",
        remoteName: "origin",
        remoteUrl: "ssh://git@gitea:22/team-alpha/graph-alpha.git",
        state: "published"
      },
      ref: {
        artifactId: "artifact-output",
        artifactKind: "report_file",
        backend: "git",
        locator: {
          branch: "worker-it/session-alpha/report",
          commit: "def456",
          gitServiceRef: "local-gitea",
          namespace: "team-alpha",
          repositoryName: "graph-alpha",
          path: "reports/session-alpha/output.md"
        },
        preferred: true,
        status: "published"
      },
      turnId: "turn-prev",
      updatedAt: "2026-04-24T11:04:40.000Z"
    })
  ]);
}

describe("model-guided memory synthesis", () => {
  it("writes and indexes a bounded working-context summary via a forced strict tool call", async () => {
    const fixture = await createRuntimeFixture();
    const context = await loadRuntimeContext(fixture.contextPath);
    await seedCurrentSessionState({
      publicKey: context.identityContext.publicKey,
      runtimeRoot: context.workspace.runtimeRoot
    });
    const artifactInputPath = path.join(
      context.workspace.runtimeRoot,
      "memory-synthesis-artifacts",
      "input-report.md"
    );
    const producedArtifactPath = path.join(
      context.workspace.runtimeRoot,
      "memory-synthesis-artifacts",
      "output-report.md"
    );
    await mkdir(path.dirname(artifactInputPath), { recursive: true });
    await Promise.all([
      writeFile(
        artifactInputPath,
        "# Input Artifact\n\nRelay recovery checkpoint summary.\n",
        "utf8"
      ),
      writeFile(
        producedArtifactPath,
        "# Output Artifact\n\nProposed next recovery checkpoint.\n",
        "utf8"
      )
    ]);
    const envelope = buildInboundTaskRequest({
      summary: "Review the relay recovery follow-up."
    });
    const memoryUpdate = await performPostTurnMemoryUpdate({
      consumedArtifactIds: ["artifact-input"],
      context,
      envelope,
      producedArtifactIds: ["report-turn-005"],
      result: {
        assistantMessages: [
          "Reviewed the recovery follow-up and identified the next checkpoint."
        ],
        providerStopReason: "end_turn",
        stopReason: "completed",
        toolExecutions: [
          {
            outcome: "success",
            sequence: 1,
            toolCallId: "toolu_session",
            toolId: "inspect_session_state"
          },
          {
            outcome: "success",
            sequence: 2,
            toolCallId: "toolu_artifact",
            toolId: "inspect_artifact_input"
          }
        ],
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
                artifactInsights: [
                  "The inbound recovery notes remain the canonical reference for relay-failure checkpoints.",
                  "The newly produced report captures the next recovery checkpoint to validate with operators."
                ],
                executionInsights: [
                  "The current turn needed both session-state and artifact inspection before finalizing the checkpoint.",
                  "The provider reached a normal end_turn stop after the bounded tool work completed."
                ],
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
      artifactInputs: [
        {
          artifactId: "artifact-input",
          backend: "git",
          localPath: artifactInputPath,
          repoPath: "reports/session-alpha/input.md",
          sourceRef: {
            artifactId: "artifact-input",
            artifactKind: "report_file",
            backend: "git",
            locator: {
              branch: "reviewer-it/session-alpha/input",
              commit: "abc123",
              gitServiceRef: "local-gitea",
              namespace: "team-alpha",
              repositoryName: "graph-alpha",
              path: "reports/session-alpha/input.md"
            },
            preferred: true,
            status: "published"
          }
        },
        {
          artifactId: "report-turn-005",
          backend: "git",
          localPath: producedArtifactPath,
          repoPath: "reports/session-alpha/output.md",
          sourceRef: {
            artifactId: "report-turn-005",
            artifactKind: "report_file",
            backend: "git",
            locator: {
              branch: "worker-it/session-alpha/report",
              commit: "def456",
              gitServiceRef: "local-gitea",
              namespace: "team-alpha",
              repositoryName: "graph-alpha",
              path: "reports/session-alpha/output.md"
            },
            preferred: true,
            status: "materialized"
          }
        }
      ],
      artifactRefs: [
        {
          artifactId: "artifact-input",
          artifactKind: "report_file",
          backend: "git",
          locator: {
            branch: "reviewer-it/session-alpha/input",
            commit: "abc123",
            gitServiceRef: "local-gitea",
            namespace: "team-alpha",
            repositoryName: "graph-alpha",
            path: "reports/session-alpha/input.md"
          },
          preferred: true,
          status: "published"
        },
        {
          artifactId: "report-turn-005",
          artifactKind: "report_file",
          backend: "git",
          createdByNodeId: "worker-it",
          locator: {
            branch: "worker-it/session-alpha/report",
            commit: "def456",
            gitServiceRef: "local-gitea",
            namespace: "team-alpha",
            repositoryName: "graph-alpha",
            path: "reports/session-alpha/output.md"
          },
          preferred: true,
          status: "materialized"
        }
      ],
      consumedArtifactIds: ["artifact-input"],
      context,
      envelope,
      producedArtifactIds: ["report-turn-005"],
      recentWorkSummaryPath: memoryUpdate.summaryPagePath,
      result: {
        assistantMessages: [
          "Reviewed the recovery follow-up and identified the next checkpoint."
        ],
        providerStopReason: "end_turn",
        stopReason: "completed",
        toolExecutions: [
          {
            outcome: "success",
            sequence: 1,
            toolCallId: "toolu_session",
            toolId: "inspect_session_state"
          },
          {
            outcome: "success",
            sequence: 2,
            toolCallId: "toolu_artifact",
            toolId: "inspect_artifact_input"
          }
        ],
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
    expect(capturedRequest?.interactionPromptParts.join("\n")).toContain(
      "Current session snapshot:"
    );
    expect(capturedRequest?.interactionPromptParts.join("\n")).toContain(
      "Current turn engine outcome:"
    );
    expect(capturedRequest?.interactionPromptParts.join("\n")).toContain(
      "- provider stop reason: `end_turn`"
    );
    expect(capturedRequest?.interactionPromptParts.join("\n")).toContain(
      "  - #1 inspect_session_state [success]"
    );
    expect(capturedRequest?.interactionPromptParts.join("\n")).toContain(
      "  - #2 inspect_artifact_input [success]"
    );
    expect(capturedRequest?.interactionPromptParts.join("\n")).toContain(
      "Session status: `active`"
    );
    expect(capturedRequest?.interactionPromptParts.join("\n")).toContain(
      "turn-prev [persisting/message] outcome=completed produced=1 consumed=1"
    );
    expect(capturedRequest?.interactionPromptParts.join("\n")).toContain(
      "artifact-output [git/report_file/published]"
    );
    expect(capturedRequest?.artifactInputs.map((artifactInput) => artifactInput.artifactId))
      .toEqual(["artifact-input", "report-turn-005"]);
    expect(capturedRequest?.artifactRefs.map((artifactRef) => artifactRef.artifactId)).toEqual(
      ["artifact-input", "report-turn-005"]
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
    expect(workingContextPage).toContain("### Consumed Artifacts");
    expect(workingContextPage).toContain("Consumed artifact: `artifact-input`");
    expect(workingContextPage).toContain("### Produced Artifacts");
    expect(workingContextPage).toContain("Produced artifact: `report-turn-005`");
    expect(workingContextPage).toContain("### Durable Artifact Insights");
    expect(workingContextPage).toContain(
      "The inbound recovery notes remain the canonical reference for relay-failure checkpoints."
    );
    expect(workingContextPage).toContain("## Execution Signals");
    expect(workingContextPage).toContain(
      "The current turn needed both session-state and artifact inspection before finalizing the checkpoint."
    );
    expect(workingContextPage).toContain(
      "The provider reached a normal end_turn stop after the bounded tool work completed."
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
      artifactInputs: [],
      artifactRefs: [],
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
