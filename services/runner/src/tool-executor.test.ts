import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadRuntimeContext } from "./runtime-context.js";
import {
  ensureRunnerStatePaths,
  writeApprovalRecord,
  writeArtifactRecord,
  writeConversationRecord,
  writeRunnerTurnRecord,
  writeSessionRecord
} from "./state-store.js";
import { cleanupRuntimeFixtures, createRuntimeFixture } from "./test-fixtures.js";
import { createBuiltinToolExecutor } from "./tool-executor.js";

afterEach(async () => {
  await cleanupRuntimeFixtures();
});

describe("runner builtin tool executor", () => {
  it("returns a structured preview for a declared inspect_artifact_input tool", async () => {
    const fixture = await createRuntimeFixture({
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_artifact_input",
            description: "Inspect a retrieved inbound artifact by artifact id.",
            inputSchema: {
              type: "object",
              properties: {
                artifactId: {
                  type: "string"
                }
              },
              required: ["artifactId"]
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_artifact_input"
            }
          }
        ]
      }
    });
    const context = await loadRuntimeContext(fixture.contextPath);
    const executor = createBuiltinToolExecutor({
      context,
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_artifact_input",
            description: "Inspect a retrieved inbound artifact by artifact id.",
            inputSchema: {
              type: "object",
              properties: {
                artifactId: {
                  type: "string"
                }
              },
              required: ["artifactId"]
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_artifact_input"
            }
          }
        ]
      }
    });

    const result = await executor.executeToolCall({
      artifactInputs: [
        {
          artifactId: "artifact-alpha",
          backend: "git",
          localPath: `${context.workspace.packageRoot}/prompts/interaction.md`,
          repoPath: context.workspace.packageRoot,
          sourceRef: {
            artifactId: "artifact-alpha",
            artifactKind: "report_file",
            backend: "git",
            locator: {
              branch: "worker-it/session-alpha/review",
              commit: "abc123",
              gitServiceRef: "gitea",
              namespace: "team-alpha",
              repositoryName: "graph-alpha",
              path: "reports/session-alpha/input.md"
            },
            preferred: true,
            status: "published"
          }
        }
      ],
      input: {
        artifactId: "artifact-alpha"
      },
      memoryRefs: [],
      nodeId: "worker-it",
      sessionId: "session-alpha",
      tool: {
        id: "inspect_artifact_input",
        description: "Inspect a retrieved inbound artifact by artifact id.",
        inputSchema: {
          type: "object"
        }
      },
      toolCallId: "toolu_01D7FLrfh4GYq7yT1ULFeyMV"
    });

    expect(result.isError).toBe(false);
    expect(result.content).toEqual(
      expect.objectContaining({
        artifactId: "artifact-alpha"
      })
    );
  });

  it("returns a deterministic error payload when the requested artifact is missing", async () => {
    const fixture = await createRuntimeFixture({
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_artifact_input",
            description: "Inspect a retrieved inbound artifact by artifact id.",
            inputSchema: {
              type: "object"
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_artifact_input"
            }
          }
        ]
      }
    });
    const context = await loadRuntimeContext(fixture.contextPath);
    const executor = createBuiltinToolExecutor({
      context,
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_artifact_input",
            description: "Inspect a retrieved inbound artifact by artifact id.",
            inputSchema: {
              type: "object"
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_artifact_input"
            }
          }
        ]
      }
    });

    const result = await executor.executeToolCall({
      artifactInputs: [],
      input: {
        artifactId: "missing-artifact"
      },
      memoryRefs: [],
      nodeId: "worker-it",
      sessionId: "session-alpha",
      tool: {
        id: "inspect_artifact_input",
        description: "Inspect a retrieved inbound artifact by artifact id.",
        inputSchema: {
          type: "object"
        }
      },
      toolCallId: "toolu_01D7FLrfh4GYq7yT1ULFeyMV"
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual(
      expect.objectContaining({
        error: "artifact_not_found",
        requestedArtifactId: "missing-artifact"
      })
    );
  });

  it("returns a structured preview for a declared inspect_memory_ref tool using an exact memory ref", async () => {
    const fixture = await createRuntimeFixture({
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_memory_ref",
            description: "Inspect a bounded memory reference by exact path.",
            inputSchema: {
              type: "object",
              properties: {
                memoryRef: {
                  type: "string"
                }
              },
              required: ["memoryRef"]
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_memory_ref"
            }
          }
        ]
      }
    });
    const context = await loadRuntimeContext(fixture.contextPath);
    const schemaPath = path.join(context.workspace.memoryRoot, "schema", "AGENTS.md");
    const executor = createBuiltinToolExecutor({
      context,
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_memory_ref",
            description: "Inspect a bounded memory reference by exact path.",
            inputSchema: {
              type: "object",
              properties: {
                memoryRef: {
                  type: "string"
                }
              },
              required: ["memoryRef"]
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_memory_ref"
            }
          }
        ]
      }
    });

    const result = await executor.executeToolCall({
      artifactInputs: [],
      input: {
        memoryRef: schemaPath
      },
      memoryRefs: [schemaPath],
      nodeId: "worker-it",
      sessionId: "session-alpha",
      tool: {
        id: "inspect_memory_ref",
        description: "Inspect a bounded memory reference by exact path.",
        inputSchema: {
          type: "object"
        }
      },
      toolCallId: "toolu_01memoryrefexact"
    });

    expect(result.isError).toBe(false);
    expect(result.content).toEqual(
      expect.objectContaining({
        basename: "AGENTS.md",
        memoryRef: schemaPath
      })
    );
  });

  it("resolves a unique memory basename deterministically", async () => {
    const fixture = await createRuntimeFixture({
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_memory_ref",
            description: "Inspect a bounded memory reference by basename.",
            inputSchema: {
              type: "object",
              properties: {
                basename: {
                  type: "string"
                }
              },
              required: ["basename"]
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_memory_ref"
            }
          }
        ]
      }
    });
    const context = await loadRuntimeContext(fixture.contextPath);
    const logPath = path.join(context.workspace.memoryRoot, "wiki", "log.md");
    await writeFile(logPath, "# Log\n\n- Entry\n", "utf8");
    const executor = createBuiltinToolExecutor({
      context,
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_memory_ref",
            description: "Inspect a bounded memory reference by basename.",
            inputSchema: {
              type: "object",
              properties: {
                basename: {
                  type: "string"
                }
              },
              required: ["basename"]
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_memory_ref"
            }
          }
        ]
      }
    });

    const result = await executor.executeToolCall({
      artifactInputs: [],
      input: {
        basename: "log.md"
      },
      memoryRefs: [logPath],
      nodeId: "worker-it",
      sessionId: "session-alpha",
      tool: {
        id: "inspect_memory_ref",
        description: "Inspect a bounded memory reference by basename.",
        inputSchema: {
          type: "object"
        }
      },
      toolCallId: "toolu_01memoryrefbasename"
    });

    expect(result.isError).toBe(false);
    expect(result.content).toEqual(
      expect.objectContaining({
        basename: "log.md",
        memoryRef: logPath,
        preview: "# Log\n\n- Entry"
      })
    );
  });

  it("returns a deterministic not-found payload when the requested memory ref is unavailable", async () => {
    const fixture = await createRuntimeFixture({
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_memory_ref",
            description: "Inspect a bounded memory reference by exact path.",
            inputSchema: {
              type: "object"
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_memory_ref"
            }
          }
        ]
      }
    });
    const context = await loadRuntimeContext(fixture.contextPath);
    const executor = createBuiltinToolExecutor({
      context,
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_memory_ref",
            description: "Inspect a bounded memory reference by exact path.",
            inputSchema: {
              type: "object"
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_memory_ref"
            }
          }
        ]
      }
    });
    const missingPath = path.join(
      context.workspace.memoryRoot,
      "wiki",
      "tasks",
      "missing.md"
    );

    const result = await executor.executeToolCall({
      artifactInputs: [],
      input: {
        memoryRef: missingPath
      },
      memoryRefs: [path.join(context.workspace.memoryRoot, "schema", "AGENTS.md")],
      nodeId: "worker-it",
      sessionId: "session-alpha",
      tool: {
        id: "inspect_memory_ref",
        description: "Inspect a bounded memory reference by exact path.",
        inputSchema: {
          type: "object"
        }
      },
      toolCallId: "toolu_01memoryrefmissing"
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual(
      expect.objectContaining({
        error: "memory_ref_not_found",
        requestedMemoryRef: missingPath
      })
    );
  });

  it("rejects inspect_memory_ref calls that provide neither or both selector inputs", async () => {
    const fixture = await createRuntimeFixture({
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_memory_ref",
            description: "Inspect a bounded memory reference.",
            inputSchema: {
              type: "object"
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_memory_ref"
            }
          }
        ]
      }
    });
    const context = await loadRuntimeContext(fixture.contextPath);
    const schemaPath = path.join(context.workspace.memoryRoot, "schema", "AGENTS.md");
    const executor = createBuiltinToolExecutor({
      context,
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_memory_ref",
            description: "Inspect a bounded memory reference.",
            inputSchema: {
              type: "object"
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_memory_ref"
            }
          }
        ]
      }
    });

    const noSelectorResult = await executor.executeToolCall({
      artifactInputs: [],
      input: {},
      memoryRefs: [schemaPath],
      nodeId: "worker-it",
      sessionId: "session-alpha",
      tool: {
        id: "inspect_memory_ref",
        description: "Inspect a bounded memory reference.",
        inputSchema: {
          type: "object"
        }
      },
      toolCallId: "toolu_01memoryrefinvalid1"
    });
    const conflictingSelectorResult = await executor.executeToolCall({
      artifactInputs: [],
      input: {
        basename: "AGENTS.md",
        memoryRef: schemaPath
      },
      memoryRefs: [schemaPath],
      nodeId: "worker-it",
      sessionId: "session-alpha",
      tool: {
        id: "inspect_memory_ref",
        description: "Inspect a bounded memory reference.",
        inputSchema: {
          type: "object"
        }
      },
      toolCallId: "toolu_01memoryrefinvalid2"
    });

    expect(noSelectorResult.isError).toBe(true);
    expect(conflictingSelectorResult.isError).toBe(true);
    expect(noSelectorResult.content).toEqual(
      expect.objectContaining({
        error: "invalid_input"
      })
    );
    expect(conflictingSelectorResult.content).toEqual(
      expect.objectContaining({
        error: "invalid_input"
      })
    );
  });

  it("returns a deterministic error when a basename matches multiple memory refs", async () => {
    const fixture = await createRuntimeFixture({
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_memory_ref",
            description: "Inspect a bounded memory reference by basename.",
            inputSchema: {
              type: "object"
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_memory_ref"
            }
          }
        ]
      }
    });
    const context = await loadRuntimeContext(fixture.contextPath);
    const firstTaskPath = path.join(
      context.workspace.memoryRoot,
      "wiki",
      "tasks",
      "alpha",
      "notes.md"
    );
    const secondTaskPath = path.join(
      context.workspace.memoryRoot,
      "wiki",
      "tasks",
      "beta",
      "notes.md"
    );
    await Promise.all([
      mkdir(path.dirname(firstTaskPath), { recursive: true }),
      mkdir(path.dirname(secondTaskPath), { recursive: true })
    ]);
    await Promise.all([
      writeFile(firstTaskPath, "# Alpha\n", "utf8"),
      writeFile(secondTaskPath, "# Beta\n", "utf8")
    ]);
    const executor = createBuiltinToolExecutor({
      context,
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_memory_ref",
            description: "Inspect a bounded memory reference by basename.",
            inputSchema: {
              type: "object"
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_memory_ref"
            }
          }
        ]
      }
    });

    const result = await executor.executeToolCall({
      artifactInputs: [],
      input: {
        basename: "notes.md"
      },
      memoryRefs: [firstTaskPath, secondTaskPath],
      nodeId: "worker-it",
      sessionId: "session-alpha",
      tool: {
        id: "inspect_memory_ref",
        description: "Inspect a bounded memory reference by basename.",
        inputSchema: {
          type: "object"
        }
      },
      toolCallId: "toolu_01memoryrefambiguous"
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual({
      error: "memory_ref_ambiguous",
      matchingMemoryRefs: [firstTaskPath, secondTaskPath],
      requestedBasename: "notes.md"
    });
  });

  it("returns a bounded current-session snapshot for a declared inspect_session_state tool", async () => {
    const fixture = await createRuntimeFixture({
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_session_state",
            description: "Inspect bounded local state for the current session.",
            inputSchema: {
              type: "object",
              properties: {
                maxArtifacts: {
                  type: "integer"
                },
                maxApprovals: {
                  type: "integer"
                },
                maxRecentTurns: {
                  type: "integer"
                }
              }
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_session_state"
            }
          }
        ]
      }
    });
    const context = await loadRuntimeContext(fixture.contextPath);
    const statePaths = await ensureRunnerStatePaths(context.workspace.runtimeRoot);
    const localPubkey = context.identityContext.publicKey;

    await writeSessionRecord(statePaths, {
      activeConversationIds: ["conv-alpha", "conv-beta"],
      entrypointNodeId: "lead-it",
      graphId: "graph-alpha",
      intent: "Review the current implementation state for critical risks.",
      openedAt: "2026-04-24T10:00:00.000Z",
      ownerNodeId: "worker-it",
      rootArtifactIds: ["artifact-root"],
      sessionId: "session-alpha",
      status: "active",
      traceId: "trace-alpha",
      updatedAt: "2026-04-24T10:07:00.000Z",
      waitingApprovalIds: ["approval-alpha"]
    });
    await writeApprovalRecord(statePaths, {
      approvalId: "approval-alpha",
      approverNodeIds: ["lead-it"],
      conversationId: "conv-beta",
      graphId: "graph-alpha",
      reason: "Approve the blocked planner handoff.",
      requestedAt: "2026-04-24T10:05:30.000Z",
      requestedByNodeId: "worker-it",
      sessionId: "session-alpha",
      status: "pending",
      updatedAt: "2026-04-24T10:06:15.000Z"
    });
    await Promise.all([
      writeConversationRecord(statePaths, {
        artifactIds: ["artifact-conv-alpha"],
        conversationId: "conv-alpha",
        followupCount: 1,
        graphId: "graph-alpha",
        initiator: "local",
        localNodeId: "worker-it",
        localPubkey,
        openedAt: "2026-04-24T10:00:00.000Z",
        peerNodeId: "reviewer-it",
        peerPubkey: localPubkey,
        responsePolicy: {
          closeOnResult: true,
          maxFollowups: 1,
          responseRequired: true
        },
        sessionId: "session-alpha",
        status: "working",
        updatedAt: "2026-04-24T10:05:00.000Z"
      }),
      writeConversationRecord(statePaths, {
        artifactIds: [],
        conversationId: "conv-beta",
        followupCount: 0,
        graphId: "graph-alpha",
        initiator: "remote",
        localNodeId: "worker-it",
        localPubkey,
        openedAt: "2026-04-24T10:02:00.000Z",
        peerNodeId: "planner-it",
        peerPubkey: localPubkey,
        responsePolicy: {
          closeOnResult: false,
          maxFollowups: 2,
          responseRequired: true
        },
        sessionId: "session-alpha",
        status: "blocked",
        updatedAt: "2026-04-24T10:06:00.000Z"
      })
    ]);
    await Promise.all([
      writeRunnerTurnRecord(statePaths, {
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
              toolCallId: "toolu_session_1",
              toolId: "inspect_memory_ref"
            }
          ],
          usage: {
            inputTokens: 12,
            outputTokens: 8
          }
        },
        graphId: "graph-alpha",
        nodeId: "worker-it",
        phase: "persisting",
        producedArtifactIds: ["artifact-root"],
        sessionId: "session-alpha",
        startedAt: "2026-04-24T10:03:00.000Z",
        triggerKind: "message",
        turnId: "turn-alpha",
        updatedAt: "2026-04-24T10:06:30.000Z"
      }),
      writeRunnerTurnRecord(statePaths, {
        consumedArtifactIds: [],
        graphId: "graph-alpha",
        nodeId: "worker-it",
        phase: "receiving",
        producedArtifactIds: ["artifact-conv-alpha"],
        sessionId: "session-alpha",
        startedAt: "2026-04-24T10:01:00.000Z",
        triggerKind: "message",
        turnId: "turn-beta",
        updatedAt: "2026-04-24T10:04:00.000Z"
      }),
      writeRunnerTurnRecord(statePaths, {
        consumedArtifactIds: [],
        graphId: "graph-alpha",
        nodeId: "worker-it",
        phase: "idle",
        producedArtifactIds: [],
        sessionId: "session-other",
        startedAt: "2026-04-24T09:59:00.000Z",
        triggerKind: "message",
        turnId: "turn-other",
        updatedAt: "2026-04-24T10:00:00.000Z"
      })
    ]);
    await Promise.all([
      writeArtifactRecord(statePaths, {
        createdAt: "2026-04-24T10:03:30.000Z",
        publication: {
          publishedAt: "2026-04-24T10:06:45.000Z",
          remoteName: "origin",
          remoteUrl: "ssh://git@gitea:22/team-alpha/graph-alpha.git",
          state: "published"
        },
        ref: {
          artifactId: "artifact-root",
          artifactKind: "report_file",
          backend: "git",
          locator: {
            branch: "worker-it/session-alpha/report",
            commit: "abc123",
            gitServiceRef: "gitea",
            namespace: "team-alpha",
            repositoryName: "graph-alpha",
            path: "reports/session-alpha/result.md"
          },
          preferred: true,
          status: "published"
        },
        turnId: "turn-alpha",
        updatedAt: "2026-04-24T10:06:45.000Z"
      }),
      writeArtifactRecord(statePaths, {
        createdAt: "2026-04-24T10:04:30.000Z",
        ref: {
          artifactId: "artifact-conv-alpha",
          artifactKind: "report_file",
          backend: "git",
          locator: {
            branch: "worker-it/session-alpha/conv-alpha",
            commit: "def456",
            gitServiceRef: "gitea",
            namespace: "team-alpha",
            repositoryName: "graph-alpha",
            path: "reports/session-alpha/conv-alpha.md"
          },
          preferred: true,
          status: "materialized"
        },
        turnId: "turn-beta",
        updatedAt: "2026-04-24T10:04:45.000Z"
      }),
      writeArtifactRecord(statePaths, {
        createdAt: "2026-04-24T10:02:30.000Z",
        ref: {
          artifactId: "artifact-input",
          artifactKind: "report_file",
          backend: "git",
          locator: {
            branch: "reviewer-it/session-alpha/input",
            commit: "ghi789",
            gitServiceRef: "gitea",
            namespace: "team-alpha",
            repositoryName: "graph-alpha",
            path: "reports/session-alpha/input.md"
          },
          preferred: true,
          status: "published"
        },
        retrieval: {
          retrievedAt: "2026-04-24T10:03:15.000Z",
          state: "retrieved"
        },
        updatedAt: "2026-04-24T10:03:15.000Z"
      })
    ]);

    const executor = createBuiltinToolExecutor({
      context,
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_session_state",
            description: "Inspect bounded local state for the current session.",
            inputSchema: {
              type: "object"
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_session_state"
            }
          }
        ]
      }
    });

    const result = await executor.executeToolCall({
      artifactInputs: [],
      input: {
        maxArtifacts: 2,
        maxApprovals: 1,
        maxRecentTurns: 1
      },
      memoryRefs: [],
      nodeId: "worker-it",
      sessionId: "session-alpha",
      tool: {
        id: "inspect_session_state",
        description: "Inspect bounded local state for the current session.",
        inputSchema: {
          type: "object"
        }
      },
      toolCallId: "toolu_01sessionstate"
    });

    expect(result.isError).toBe(false);
    expect(typeof result.content).toBe("object");
    expect(result.content).not.toBeNull();

    if (typeof result.content === "string" || result.content === null) {
      throw new Error("Expected inspect_session_state to return an object payload.");
    }
    const content = result.content;
    const counts = content.counts;
    const session = content.session;
    const approvals = content.approvals;
    const conversations = content.conversations;
    const recentTurns = content.recentTurns;
    const artifacts = content.artifacts;

    expect(counts).toEqual({
      activeConversationCount: 2,
      approvalCount: 1,
      artifactCount: 3,
      conversationCount: 2,
      recentTurnCount: 1,
      waitingApprovalCount: 1
    });
    expect(session).toMatchObject({
      activeConversationIds: ["conv-alpha", "conv-beta"],
      sessionId: "session-alpha",
      status: "active",
      waitingApprovalIds: ["approval-alpha"]
    });
    expect(approvals).toHaveLength(1);
    expect(approvals[0]).toMatchObject({
      approvalId: "approval-alpha",
      approverNodeIds: ["lead-it"],
      conversationId: "conv-beta",
      reason: "Approve the blocked planner handoff.",
      requestedByNodeId: "worker-it",
      status: "pending"
    });
    expect(conversations).toHaveLength(2);
    expect(conversations[0]).toMatchObject({
      conversationId: "conv-beta",
      status: "blocked"
    });
    expect(conversations[1]).toMatchObject({
      conversationId: "conv-alpha",
      status: "working"
    });
    expect(recentTurns).toHaveLength(1);
    expect(recentTurns[0]).toMatchObject({
      engineOutcome: {
        providerMetadata: {
          adapterKind: "anthropic",
          modelId: "claude-opus",
          profileId: "shared-model"
        },
        stopReason: "completed",
        toolExecutionCount: 1
      },
      turnId: "turn-alpha"
    });
    expect(artifacts).toHaveLength(2);
    expect(artifacts[0]).toMatchObject({
      artifactId: "artifact-root",
      publicationState: "published"
    });
    expect(artifacts[1]).toMatchObject({
      artifactId: "artifact-conv-alpha",
      status: "materialized"
    });
  });

  it("rejects inspect_session_state input that widens beyond the current session", async () => {
    const fixture = await createRuntimeFixture({
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_session_state",
            description: "Inspect bounded local state for the current session.",
            inputSchema: {
              type: "object"
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_session_state"
            }
          }
        ]
      }
    });
    const context = await loadRuntimeContext(fixture.contextPath);
    const executor = createBuiltinToolExecutor({
      context,
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_session_state",
            description: "Inspect bounded local state for the current session.",
            inputSchema: {
              type: "object"
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_session_state"
            }
          }
        ]
      }
    });

    const result = await executor.executeToolCall({
      artifactInputs: [],
      input: {
        sessionId: "session-other"
      },
      memoryRefs: [],
      nodeId: "worker-it",
      sessionId: "session-alpha",
      tool: {
        id: "inspect_session_state",
        description: "Inspect bounded local state for the current session.",
        inputSchema: {
          type: "object"
        }
      },
      toolCallId: "toolu_01sessionstateinvalid"
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual(
      expect.objectContaining({
        error: "invalid_input",
        requestedSessionId: "session-other",
        sessionId: "session-alpha"
      })
    );
  });

  it("rejects inspect_session_state limits outside the bounded numeric contract", async () => {
    const fixture = await createRuntimeFixture({
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_session_state",
            description: "Inspect bounded local state for the current session.",
            inputSchema: {
              type: "object"
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_session_state"
            }
          }
        ]
      }
    });
    const context = await loadRuntimeContext(fixture.contextPath);
    const executor = createBuiltinToolExecutor({
      context,
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_session_state",
            description: "Inspect bounded local state for the current session.",
            inputSchema: {
              type: "object"
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_session_state"
            }
          }
        ]
      }
    });

    const result = await executor.executeToolCall({
      artifactInputs: [],
      input: {
        maxRecentTurns: 0
      },
      memoryRefs: [],
      nodeId: "worker-it",
      sessionId: "session-alpha",
      tool: {
        id: "inspect_session_state",
        description: "Inspect bounded local state for the current session.",
        inputSchema: {
          type: "object"
        }
      },
      toolCallId: "toolu_01sessionstatebadlimit"
    });
    const approvalLimitResult = await executor.executeToolCall({
      artifactInputs: [],
      input: {
        maxApprovals: 21
      },
      memoryRefs: [],
      nodeId: "worker-it",
      sessionId: "session-alpha",
      tool: {
        id: "inspect_session_state",
        description: "Inspect bounded local state for the current session.",
        inputSchema: {
          type: "object"
        }
      },
      toolCallId: "toolu_01sessionstatebadapprovallimit"
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual(
      expect.objectContaining({
        error: "invalid_input",
        fieldName: "maxRecentTurns",
        maxValue: 10
      })
    );
    expect(approvalLimitResult.isError).toBe(true);
    expect(approvalLimitResult.content).toEqual(
      expect.objectContaining({
        error: "invalid_input",
        fieldName: "maxApprovals",
        maxValue: 20
      })
    );
  });

  it("returns a deterministic not-found payload when inspect_session_state has no local session record", async () => {
    const fixture = await createRuntimeFixture({
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_session_state",
            description: "Inspect bounded local state for the current session.",
            inputSchema: {
              type: "object"
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_session_state"
            }
          }
        ]
      }
    });
    const context = await loadRuntimeContext(fixture.contextPath);
    const executor = createBuiltinToolExecutor({
      context,
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_session_state",
            description: "Inspect bounded local state for the current session.",
            inputSchema: {
              type: "object"
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_session_state"
            }
          }
        ]
      }
    });

    const result = await executor.executeToolCall({
      artifactInputs: [],
      input: {},
      memoryRefs: [],
      nodeId: "worker-it",
      sessionId: "session-alpha",
      tool: {
        id: "inspect_session_state",
        description: "Inspect bounded local state for the current session.",
        inputSchema: {
          type: "object"
        }
      },
      toolCallId: "toolu_01sessionstatenotfound"
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual({
      error: "session_not_found",
      sessionId: "session-alpha"
    });
  });
});
