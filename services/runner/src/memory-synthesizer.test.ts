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
  readFocusedRegisterState,
  writeArtifactRecord,
  writeConversationRecord,
  writeFocusedRegisterState,
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
    const previousOpenQuestion =
      "Will the relay recovery trace stay readable for operators after the next deploy?";
    const previousNextAction =
      "Confirm the operator checkpoint once the next relay run finishes.";
    const previousResolution =
      "The earlier alert-routing concern is closed for the current review.";
    await Promise.all([
      writeFile(
        path.join(
          context.workspace.memoryRoot,
          "wiki",
          "summaries",
          "open-questions.md"
        ),
        [
          "# Open Questions Summary",
          "",
          "## Open Questions",
          "",
          `- ${previousOpenQuestion}`,
          ""
        ].join("\n"),
        "utf8"
      ),
      writeFile(
        path.join(
          context.workspace.memoryRoot,
          "wiki",
          "summaries",
          "next-actions.md"
        ),
        [
          "# Next Actions Summary",
          "",
          "## Next Actions",
          "",
          `- ${previousNextAction}`,
          ""
        ].join("\n"),
        "utf8"
      ),
      writeFile(
        path.join(
          context.workspace.memoryRoot,
          "wiki",
          "summaries",
          "resolutions.md"
        ),
        [
          "# Resolutions Summary",
          "",
          "## Resolutions",
          "",
          `- ${previousResolution}`,
          ""
        ].join("\n"),
        "utf8"
      )
    ]);
    const statePaths = await ensureRunnerStatePaths(context.workspace.runtimeRoot);
    await writeFocusedRegisterState(statePaths, {
      registers: {
        nextActions: [
          {
            carryCount: 2,
            firstObservedTurnId: "turn-memory-003",
            lastObservedTurnId: "turn-memory-004",
            normalizedKey:
              "confirm the operator checkpoint once the next relay run finishes.",
            text: previousNextAction
          }
        ],
        openQuestions: [
          {
            carryCount: 3,
            firstObservedTurnId: "turn-memory-002",
            lastObservedTurnId: "turn-memory-004",
            normalizedKey:
              "will the relay recovery trace stay readable for operators after the next deploy?",
            text: previousOpenQuestion
          }
        ],
        resolutions: [
          {
            carryCount: 2,
            firstObservedTurnId: "turn-memory-003",
            lastObservedTurnId: "turn-memory-004",
            normalizedKey:
              "the earlier alert-routing concern is closed for the current review.",
            text: previousResolution
          }
        ]
      },
      schemaVersion: "1",
      updatedAt: "2026-04-24T11:04:50.000Z",
      updatedTurnId: "turn-memory-004"
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
                closedOpenQuestions: [previousOpenQuestion],
                completedNextActions: [previousNextAction],
                decisions: [
                  "Treat the inbound recovery notes as the canonical baseline for the next checkpoint review.",
                  "Carry the produced report forward as the current proposal for the next operator validation step."
                ],
                executionInsights: [
                  "The current turn needed both session-state and artifact inspection before finalizing the checkpoint.",
                  "The provider reached a normal end_turn stop after the bounded tool work completed."
                ],
                focus: "Keep the recovery follow-up aligned with the relay-runtime work.",
                nextActions: [
                  "Confirm the relay failure path in the next session."
                ],
                openQuestions: [
                  "Which operator should validate the next checkpoint once the review closes?"
                ],
                resolutions: [
                  "The current checkpoint review no longer needs extra operator-detail validation.",
                  "The earlier relay-capacity concern is considered resolved for the current checkpoint review.",
                  "The previous draft action item to gather raw relay logs is complete.",
                  "Checkpoint validation has moved into the follow-up queue."
                ],
                sessionInsights: [
                  "The session is still active and centered on the relay recovery follow-up.",
                  "The live conversation with the reviewer remains the coordination path for the next checkpoint."
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
    const decisionsPagePath =
      synthesisResult.ok
        ? synthesisResult.updatedSummaryPagePaths.find((summaryPagePath) =>
            summaryPagePath.endsWith(path.join("summaries", "decisions.md"))
          )
        : undefined;
    const stableFactsPagePath =
      synthesisResult.ok
        ? synthesisResult.updatedSummaryPagePaths.find((summaryPagePath) =>
            summaryPagePath.endsWith(path.join("summaries", "stable-facts.md"))
          )
        : undefined;
    const openQuestionsPagePath =
      synthesisResult.ok
        ? synthesisResult.updatedSummaryPagePaths.find((summaryPagePath) =>
            summaryPagePath.endsWith(path.join("summaries", "open-questions.md"))
          )
        : undefined;
    const nextActionsPagePath =
      synthesisResult.ok
        ? synthesisResult.updatedSummaryPagePaths.find((summaryPagePath) =>
            summaryPagePath.endsWith(path.join("summaries", "next-actions.md"))
          )
        : undefined;
    const resolutionsPagePath =
      synthesisResult.ok
        ? synthesisResult.updatedSummaryPagePaths.find((summaryPagePath) =>
            summaryPagePath.endsWith(path.join("summaries", "resolutions.md"))
          )
        : undefined;

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
    expect(capturedRequest?.interactionPromptParts.join("\n")).toContain(
      "Current focused register baseline:"
    );
    expect(capturedRequest?.systemPromptParts.join("\n")).toContain(
      "populate the explicit closure-reference fields with the exact original baseline text"
    );
    expect(capturedRequest?.interactionPromptParts.join("\n")).toContain(
      previousOpenQuestion
    );
    expect(capturedRequest?.interactionPromptParts.join("\n")).toContain(
      "[carried 3 synthesis passes; stale review candidate]"
    );
    expect(capturedRequest?.interactionPromptParts.join("\n")).toContain(
      previousNextAction
    );
    expect(capturedRequest?.interactionPromptParts.join("\n")).toContain(
      "[carried 2 synthesis passes]"
    );
    expect(capturedRequest?.interactionPromptParts.join("\n")).toContain(
      previousResolution
    );
    expect(capturedRequest?.artifactInputs.map((artifactInput) => artifactInput.artifactId))
      .toEqual(["artifact-input", "report-turn-005"]);
    expect(capturedRequest?.artifactRefs.map((artifactRef) => artifactRef.artifactId)).toEqual(
      ["artifact-input", "report-turn-005"]
    );

    if (!workingContextPagePath) {
      throw new Error("Expected a working context summary path.");
    }

    if (!stableFactsPagePath) {
      throw new Error("Expected a stable facts summary path.");
    }

    if (!decisionsPagePath) {
      throw new Error("Expected a decisions summary path.");
    }

    if (!openQuestionsPagePath) {
      throw new Error("Expected an open questions summary path.");
    }

    if (!nextActionsPagePath) {
      throw new Error("Expected a next actions summary path.");
    }

    if (!resolutionsPagePath) {
      throw new Error("Expected a resolutions summary path.");
    }

    const [
      workingContextPage,
      decisionsPage,
      stableFactsPage,
      openQuestionsPage,
      nextActionsPage,
      resolutionsPage,
      focusedRegisterState,
      indexPage,
      logPage,
      followupTurnRequest
    ] =
      await Promise.all([
        readFile(workingContextPagePath, "utf8"),
        readFile(decisionsPagePath, "utf8"),
        readFile(stableFactsPagePath, "utf8"),
        readFile(openQuestionsPagePath, "utf8"),
        readFile(nextActionsPagePath, "utf8"),
        readFile(resolutionsPagePath, "utf8"),
        readFocusedRegisterState(statePaths),
        readFile(memoryUpdate.indexPath, "utf8"),
        readFile(memoryUpdate.logPath, "utf8"),
        buildAgentEngineTurnRequest(context)
      ]);

    expect(workingContextPage).toContain("# Working Context Summary");
    expect(workingContextPage).toContain("## Current Focus");
    expect(workingContextPage).toContain(
      "Keep the recovery follow-up aligned with the relay-runtime work."
    );
    expect(workingContextPage).toContain("## Session Context");
    expect(workingContextPage).toContain("- Session status: `active`");
    expect(workingContextPage).toContain("- Active conversations: 1");
    expect(workingContextPage).toContain("- Recent turns in snapshot: 1");
    expect(workingContextPage).toContain("### Durable Session Insights");
    expect(workingContextPage).toContain(
      "The live conversation with the reviewer remains the coordination path for the next checkpoint."
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
    expect(workingContextPage).toContain("## Decisions");
    expect(workingContextPage).toContain(
      "Treat the inbound recovery notes as the canonical baseline for the next checkpoint review."
    );
    expect(workingContextPage).toContain("## Recent Resolutions");
    expect(workingContextPage).toContain(
      "The earlier relay-capacity concern is considered resolved for the current checkpoint review."
    );
    expect(decisionsPage).toContain("# Decisions Summary");
    expect(decisionsPage).toContain("## Decisions");
    expect(decisionsPage).toContain(
      "Carry the produced report forward as the current proposal for the next operator validation step."
    );
    expect(stableFactsPage).toContain("# Stable Facts Summary");
    expect(stableFactsPage).toContain("## Stable Facts");
    expect(stableFactsPage).toContain(
      "The latest turn completed without additional blockers."
    );
    expect(openQuestionsPage).toContain("# Open Questions Summary");
    expect(openQuestionsPage).toContain("## Open Questions");
    expect(openQuestionsPage).not.toContain(previousOpenQuestion);
    expect(openQuestionsPage).toContain(
      "Which operator should validate the next checkpoint once the review closes?"
    );
    expect(openQuestionsPage).toContain("## Coordination");
    expect(openQuestionsPage).toContain("[Next Actions Summary](summaries/next-actions.md)");
    expect(nextActionsPage).toContain("# Next Actions Summary");
    expect(nextActionsPage).toContain("## Next Actions");
    expect(nextActionsPage).not.toContain(previousNextAction);
    expect(nextActionsPage).toContain(
      "Confirm the relay failure path in the next session."
    );
    expect(resolutionsPage).toContain("# Resolutions Summary");
    expect(resolutionsPage).toContain("## Resolutions");
    expect(resolutionsPage).not.toContain(previousOpenQuestion);
    expect(resolutionsPage).not.toContain(previousNextAction);
    expect(resolutionsPage).toContain(
      "The current checkpoint review no longer needs extra operator-detail validation."
    );
    expect(resolutionsPage).toContain(
      "The previous draft action item to gather raw relay logs is complete."
    );
    expect(focusedRegisterState).toBeDefined();
    expect(
      focusedRegisterState?.registers.openQuestions.find(
        (entry) =>
          entry.text ===
          "Which operator should validate the next checkpoint once the review closes?"
      )?.carryCount
    ).toBe(1);
    expect(
      focusedRegisterState?.registers.nextActions.find(
        (entry) => entry.text === "Confirm the relay failure path in the next session."
      )?.carryCount
    ).toBe(1);
    expect(
      focusedRegisterState?.registers.resolutions.find(
        (entry) =>
          entry.text ===
          "The current checkpoint review no longer needs extra operator-detail validation."
      )?.carryCount
    ).toBe(1);
    expect(
      focusedRegisterState?.registers.resolutions.find(
        (entry) => entry.text === previousResolution
      )
    ).toBeUndefined();
    expect(indexPage).toContain("[Working Context Summary](summaries/working-context.md)");
    expect(indexPage).toContain("[Decisions Summary](summaries/decisions.md)");
    expect(indexPage).toContain("[Stable Facts Summary](summaries/stable-facts.md)");
    expect(indexPage).toContain(
      "[Open Questions Summary](summaries/open-questions.md)"
    );
    expect(indexPage).toContain("[Next Actions Summary](summaries/next-actions.md)");
    expect(indexPage).toContain("[Resolutions Summary](summaries/resolutions.md)");
    expect(logPage).toContain("memory synthesis | turn-memory-005");
    expect(followupTurnRequest.memoryRefs).toContain(workingContextPagePath);
    expect(followupTurnRequest.memoryRefs).toContain(decisionsPagePath);
    expect(followupTurnRequest.memoryRefs).toContain(stableFactsPagePath);
    expect(followupTurnRequest.memoryRefs).toContain(openQuestionsPagePath);
    expect(followupTurnRequest.memoryRefs).toContain(nextActionsPagePath);
    expect(followupTurnRequest.memoryRefs).toContain(resolutionsPagePath);
  });

  it("increments carry counts when focused register entries remain active", async () => {
    const fixture = await createRuntimeFixture();
    const context = await loadRuntimeContext(fixture.contextPath);
    const envelope = buildInboundTaskRequest({
      summary: "Keep the relay operator follow-up active."
    });
    const memoryUpdate = await performPostTurnMemoryUpdate({
      consumedArtifactIds: [],
      context,
      envelope,
      producedArtifactIds: [],
      result: {
        assistantMessages: ["Kept the operator follow-up active."],
        stopReason: "completed",
        toolExecutions: [],
        toolRequests: [],
        usage: {
          inputTokens: 8,
          outputTokens: 4
        }
      },
      turnId: "turn-memory-007"
    });
    const carriedOpenQuestion =
      "Which operator should validate the next relay checkpoint?";
    const carriedNextAction =
      "Confirm the next relay checkpoint with the operator lead.";
    await Promise.all([
      writeFile(
        path.join(
          context.workspace.memoryRoot,
          "wiki",
          "summaries",
          "open-questions.md"
        ),
        [
          "# Open Questions Summary",
          "",
          "## Open Questions",
          "",
          `- ${carriedOpenQuestion}`,
          ""
        ].join("\n"),
        "utf8"
      ),
      writeFile(
        path.join(
          context.workspace.memoryRoot,
          "wiki",
          "summaries",
          "next-actions.md"
        ),
        [
          "# Next Actions Summary",
          "",
          "## Next Actions",
          "",
          `- ${carriedNextAction}`,
          ""
        ].join("\n"),
        "utf8"
      )
    ]);
    const statePaths = await ensureRunnerStatePaths(context.workspace.runtimeRoot);
    await writeFocusedRegisterState(statePaths, {
      registers: {
        nextActions: [
          {
            carryCount: 2,
            firstObservedTurnId: "turn-memory-005",
            lastObservedTurnId: "turn-memory-006",
            normalizedKey:
              "confirm the next relay checkpoint with the operator lead.",
            text: carriedNextAction
          }
        ],
        openQuestions: [
          {
            carryCount: 3,
            firstObservedTurnId: "turn-memory-004",
            lastObservedTurnId: "turn-memory-006",
            normalizedKey:
              "which operator should validate the next relay checkpoint?",
            text: carriedOpenQuestion
          }
        ],
        resolutions: []
      },
      schemaVersion: "1",
      updatedAt: "2026-04-24T12:00:00.000Z",
      updatedTurnId: "turn-memory-006"
    });

    const synthesizer = createModelGuidedMemorySynthesizer({
      context,
      engineFactory(toolExecutor): AgentEngine {
        return {
          async executeTurn(request) {
            const summaryTool = request.toolDefinitions.find(
              (toolDefinition) => toolDefinition.id === "write_memory_summary"
            );

            if (!summaryTool) {
              throw new Error("Expected the working-context synthesis tool.");
            }

            await toolExecutor.executeToolCall({
              artifactInputs: [],
              input: {
                artifactInsights: [],
                closedOpenQuestions: [],
                completedNextActions: [],
                decisions: [],
                executionInsights: [],
                focus: "Keep the relay operator follow-up active.",
                nextActions: [carriedNextAction],
                openQuestions: [carriedOpenQuestion],
                resolutions: [],
                sessionInsights: [],
                stableFacts: [],
                summary:
                  "The operator follow-up remains active and needs another pass."
              },
              memoryRefs: request.memoryRefs,
              nodeId: request.nodeId,
              sessionId: request.sessionId,
              tool: summaryTool,
              toolCallId: "toolu_working_context"
            });

            return {
              assistantMessages: ["Working context summary updated."],
              stopReason: "completed",
              toolExecutions: [],
              toolRequests: [],
              usage: {
                inputTokens: 2,
                outputTokens: 1
              }
            };
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
      producedArtifactIds: [],
      recentWorkSummaryPath: memoryUpdate.summaryPagePath,
      result: {
        assistantMessages: ["Kept the operator follow-up active."],
        stopReason: "completed",
        toolExecutions: [],
        toolRequests: [],
        usage: {
          inputTokens: 8,
          outputTokens: 4
        }
      },
      taskPagePath: memoryUpdate.taskPagePath,
      turnId: "turn-memory-007"
    });

    expect(synthesisResult.ok).toBe(true);

    const focusedRegisterState = await readFocusedRegisterState(statePaths);

    expect(
      focusedRegisterState?.registers.openQuestions.find(
        (entry) => entry.text === carriedOpenQuestion
      )?.carryCount
    ).toBe(4);
    expect(
      focusedRegisterState?.registers.nextActions.find(
        (entry) => entry.text === carriedNextAction
      )?.carryCount
    ).toBe(3);
  });

  it("rejects explicit closure refs that do not match the current focused-register baseline", async () => {
    const fixture = await createRuntimeFixture();
    const context = await loadRuntimeContext(fixture.contextPath);
    const envelope = buildInboundTaskRequest({
      summary: "Review a mismatched closure reference."
    });
    const memoryUpdate = await performPostTurnMemoryUpdate({
      consumedArtifactIds: [],
      context,
      envelope,
      producedArtifactIds: [],
      result: {
        assistantMessages: ["Reviewed the closure reference mismatch."],
        stopReason: "completed",
        toolExecutions: [],
        toolRequests: [],
        usage: {
          inputTokens: 5,
          outputTokens: 3
        }
      },
      turnId: "turn-memory-008"
    });
    const activeOpenQuestion =
      "Which operator should validate the next relay checkpoint?";
    await writeFile(
      path.join(
        context.workspace.memoryRoot,
        "wiki",
        "summaries",
        "open-questions.md"
      ),
      [
        "# Open Questions Summary",
        "",
        "## Open Questions",
        "",
        `- ${activeOpenQuestion}`,
        ""
      ].join("\n"),
      "utf8"
    );

    const synthesizer = createModelGuidedMemorySynthesizer({
      context,
      engineFactory(toolExecutor): AgentEngine {
        return {
          async executeTurn(request) {
            const summaryTool = request.toolDefinitions.find(
              (toolDefinition) => toolDefinition.id === "write_memory_summary"
            );

            if (!summaryTool) {
              throw new Error("Expected the working-context synthesis tool.");
            }

            const toolResult = await toolExecutor.executeToolCall({
              artifactInputs: [],
              input: {
                artifactInsights: [],
                closedOpenQuestions: ["A missing baseline question."],
                completedNextActions: [],
                decisions: [],
                executionInsights: [],
                focus: "Review a mismatched closure reference.",
                nextActions: [],
                openQuestions: [activeOpenQuestion],
                resolutions: ["The question is no longer relevant."],
                sessionInsights: [],
                stableFacts: [],
                summary: "The closure ref should be rejected."
              },
              memoryRefs: request.memoryRefs,
              nodeId: request.nodeId,
              sessionId: request.sessionId,
              tool: summaryTool,
              toolCallId: "toolu_working_context"
            });

            expect(toolResult.isError).toBe(true);
            expect(JSON.stringify(toolResult.content)).toContain("invalid_input");
            expect(JSON.stringify(toolResult.content)).toContain(
              "does not match any current focused-register open question"
            );

            return {
              assistantMessages: ["The invalid closure ref was rejected."],
              stopReason: "completed",
              toolExecutions: [],
              toolRequests: [],
              usage: {
                inputTokens: 1,
                outputTokens: 1
              }
            };
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
      producedArtifactIds: [],
      recentWorkSummaryPath: memoryUpdate.summaryPagePath,
      result: {
        assistantMessages: ["Reviewed the closure reference mismatch."],
        stopReason: "completed",
        toolExecutions: [],
        toolRequests: [],
        usage: {
          inputTokens: 5,
          outputTokens: 3
        }
      },
      taskPagePath: memoryUpdate.taskPagePath,
      turnId: "turn-memory-008"
    });

    expect(synthesisResult).toEqual({
      errorMessage:
        "Model-guided memory synthesis completed without updating the working-context summary.",
      ok: false
    });
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
