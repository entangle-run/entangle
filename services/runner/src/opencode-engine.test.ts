import { EventEmitter } from "node:events";
import { rm } from "node:fs/promises";
import path from "node:path";
import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it } from "vitest";
import { AgentEngineExecutionError } from "@entangle/agent-engine";
import {
  agentEngineTurnRequestSchema,
  type AgentEngineTurnRequest
} from "@entangle/types";
import {
  buildOpenCodePrompt,
  createOpenCodeAgentEngine,
  extractEntangleActionDirectives,
  type OpenCodeSpawn
} from "./opencode-engine.js";
import {
  cleanupRuntimeFixtures,
  createRuntimeFixture
} from "./test-fixtures.js";

type MockSpawnCall = {
  args: string[];
  command: string;
  killSignals: Array<NodeJS.Signals | number | undefined>;
  options: Parameters<OpenCodeSpawn>[2];
  readStdin: () => string;
};

type MockOpenCodeProcessStep = {
  autoClose?: boolean;
  closeCode?: number;
  closeSignal?: NodeJS.Signals | null;
  stderr?: string;
  stdout?: string;
  stdoutLines?: string[];
};

function buildTurnRequest(
  input: Partial<AgentEngineTurnRequest> = {}
): AgentEngineTurnRequest {
  return agentEngineTurnRequestSchema.parse({
    artifactInputs: [],
    artifactRefs: [],
    executionLimits: {
      maxOutputTokens: 1024,
      maxToolTurns: 4
    },
    interactionPromptParts: ["Review the current workspace and summarize work."],
    memoryRefs: [],
    nodeId: "worker-it",
    sessionId: "session-alpha",
    systemPromptParts: ["You are an Entangle runtime node."],
    toolDefinitions: [],
    ...input
  });
}

function createMockOpenCodeSpawn(input: {
  autoClose?: boolean;
  closeCode?: number;
  closeSignal?: NodeJS.Signals | null;
  processes?: MockOpenCodeProcessStep[];
  stderr?: string;
  stdout?: string;
  stdoutLines?: string[];
} = {}): {
  calls: MockSpawnCall[];
  spawn: OpenCodeSpawn;
} {
  const calls: MockSpawnCall[] = [];
  const processes =
    input.processes ??
    [
      {
        autoClose: input.autoClose,
        closeCode: input.closeCode,
        closeSignal: input.closeSignal,
        stderr: input.stderr,
        stdout: input.stdout,
        stdoutLines: input.stdoutLines
      }
    ];
  const spawn: OpenCodeSpawn = (command, args, options) => {
    const step = processes[calls.length] ?? processes[processes.length - 1] ?? {};
    const emitter = new EventEmitter();
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    const killSignals: Array<NodeJS.Signals | number | undefined> = [];
    let stdinText = "";

    stdin.on("data", (chunk: Buffer | string) => {
      stdinText += chunk.toString();
    });
    calls.push({
      args,
      command,
      killSignals,
      options,
      readStdin: () => stdinText
    });

    process.nextTick(() => {
      if (step.stdout) {
        stdout.write(step.stdout);
      }

      for (const line of step.stdoutLines ?? []) {
        stdout.write(`${line}\n`);
      }

      if (step.autoClose !== false) {
        stdout.end();
      }

      if (step.stderr) {
        stderr.write(step.stderr);
      }

      if (step.autoClose !== false) {
        stderr.end();
        emitter.emit("close", step.closeCode ?? 0, step.closeSignal ?? null);
      }
    });

    return {
      kill: (signal?: NodeJS.Signals | number) => {
        killSignals.push(signal);
        return true;
      },
      on: emitter.on.bind(emitter),
      once: emitter.once.bind(emitter),
      stderr,
      stdin,
      stdout
    } as ReturnType<OpenCodeSpawn>;
  };

  return {
    calls,
    spawn
  };
}

async function waitForMockSpawnCallCount(
  mock: { calls: MockSpawnCall[] },
  count: number
): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (mock.calls.length >= count) {
      return;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }

  throw new Error(`Expected at least ${count} OpenCode spawn call(s).`);
}

afterEach(async () => {
  await cleanupRuntimeFixtures();
});

describe("OpenCode runner engine adapter", () => {
  it("renders an Entangle turn request into a structured OpenCode prompt", () => {
    const prompt = buildOpenCodePrompt(
      buildTurnRequest({
        artifactRefs: [
          {
            artifactId: "input-report",
            artifactKind: "report_file",
            backend: "git",
            contentSummary: "Input report",
            locator: {
              branch: "main",
              commit: "abc123",
              gitServiceRef: "gitea",
              namespace: "team-alpha",
              path: "reports/input.md",
              repositoryName: "graph-alpha"
            },
            status: "published"
          }
        ],
        memoryRefs: ["/workspace/memory/wiki/index.md"]
      })
    );

    expect(prompt).toContain("# Entangle Node Task");
    expect(prompt).toContain("Node: worker-it");
    expect(prompt).toContain("## System");
    expect(prompt).toContain("## Task");
    expect(prompt).toContain("input-report");
    expect(prompt).toContain("/workspace/memory/wiki/index.md");
  });

  it("runs OpenCode with node-scoped workspace state and parses JSON events", async () => {
    const fixture = await createRuntimeFixture();
    const mock = createMockOpenCodeSpawn({
      processes: [
        {
          stdout: "0.10.0\n"
        },
        {
          stdoutLines: [
            JSON.stringify({
              part: {
                text: "Completed the requested review."
              },
              sessionID: "opencode-session",
              type: "text"
            }),
            JSON.stringify({
              part: {
                callID: "tool-call-1",
                id: "tool-part-1",
                state: {
                  input: {
                    apiKey: "secret-value",
                    command: "pnpm test"
                  },
                  output: "Tests passed.",
                  status: "completed",
                  time: {
                    end: 1650,
                    start: 1000
                  },
                  title: "Run tests"
                },
                tool: "bash"
              },
              sessionID: "opencode-session",
              type: "tool_use"
            })
          ]
        }
      ]
    });
    const engine = createOpenCodeAgentEngine({
      runtimeContext: fixture.context,
      spawn: mock.spawn
    });

    const result = await engine.executeTurn(buildTurnRequest());

    expect(result).toMatchObject({
      assistantMessages: ["Completed the requested review."],
      engineSessionId: "opencode-session",
      engineVersion: "0.10.0",
      providerStopReason: "opencode_process_exit_0",
      stopReason: "completed",
      toolExecutions: [
        {
          durationMs: 650,
          inputSummary:
            '{"apiKey":"[redacted]","command":"pnpm test"}',
          outcome: "success",
          outputSummary: "Tests passed.",
          sequence: 1,
          title: "Run tests",
          toolCallId: "tool-call-1",
          toolId: "bash"
        }
      ]
    });
    expect(result.toolExecutions[0]?.inputSummary).not.toContain(
      "secret-value"
    );
    expect(mock.calls).toHaveLength(2);
    expect(mock.calls[0]!.command).toBe("opencode");
    expect(mock.calls[0]!.args).toEqual(["--version"]);
    expect(mock.calls[1]!.command).toBe("opencode");
    expect(mock.calls[1]!.args).toEqual(
      expect.arrayContaining([
        "run",
        "--format=json",
        "--dir",
        fixture.context.workspace.sourceWorkspaceRoot,
        "--agent",
        "general"
      ])
    );
    expect(mock.calls[1]!.options.cwd).toBe(
      fixture.context.workspace.sourceWorkspaceRoot
    );
    const engineStateRoot = fixture.context.workspace.engineStateRoot!;
    expect(mock.calls[1]!.options.env).toMatchObject({
      ENTANGLE_NODE_ID: "worker-it",
      OPENCODE_CONFIG_DIR: path.join(engineStateRoot, "config"),
      OPENCODE_DB: path.join(engineStateRoot, "opencode.db"),
      OPENCODE_TEST_HOME: path.join(engineStateRoot, "home"),
      XDG_CACHE_HOME: path.join(engineStateRoot, "xdg", "cache"),
      XDG_CONFIG_HOME: path.join(engineStateRoot, "xdg", "config"),
      XDG_DATA_HOME: path.join(engineStateRoot, "xdg", "data"),
      XDG_STATE_HOME: path.join(engineStateRoot, "xdg", "state")
    });
    expect(mock.calls[1]!.readStdin()).toContain(
      "Review the current workspace"
    );
  });

  it("kills the OpenCode run process when the turn abort signal is cancelled", async () => {
    const fixture = await createRuntimeFixture();
    const mock = createMockOpenCodeSpawn({
      processes: [
        {
          stdout: "0.10.0\n"
        },
        {
          autoClose: false
        }
      ]
    });
    const engine = createOpenCodeAgentEngine({
      runtimeContext: fixture.context,
      spawn: mock.spawn
    });
    const abortController = new AbortController();
    const turnPromise = engine.executeTurn(buildTurnRequest(), {
      abortSignal: abortController.signal
    });

    await waitForMockSpawnCallCount(mock, 2);
    abortController.abort();

    await expect(turnPromise).rejects.toMatchObject({
      classification: "cancelled",
      name: AgentEngineExecutionError.name
    });
    expect(mock.calls[1]?.killSignals).toContain("SIGTERM");
  });

  it("extracts Entangle action handoffs from OpenCode text blocks", () => {
    const extraction = extractEntangleActionDirectives([
      [
        "Prepared the source changes and delegated review.",
        "```entangle-actions",
        JSON.stringify({
          handoffDirectives: [
            {
              includeArtifacts: "all",
              summary: "Review the produced source changes.",
              targetNodeId: "reviewer-it"
            }
          ]
        }),
        "```"
      ].join("\n")
    ]);

    expect(extraction).toMatchObject({
      assistantMessages: ["Prepared the source changes and delegated review."],
      errors: [],
      handoffDirectives: [
        {
          includeArtifacts: "all",
          responsePolicy: {
            closeOnResult: true,
            maxFollowups: 1,
            responseRequired: true
          },
          summary: "Review the produced source changes.",
          targetNodeId: "reviewer-it"
        }
      ]
    });
  });

  it("extracts Entangle action approval requests from OpenCode text blocks", () => {
    const extraction = extractEntangleActionDirectives([
      [
        "Prepared the source history and requested approval.",
        "```entangle-actions",
        JSON.stringify({
          approvalRequestDirectives: [
            {
              approvalId: "approval-source-publication-alpha",
              approverNodeIds: ["operator-alpha"],
              operation: "source_publication",
              reason: "Approve publication before pushing source history.",
              resource: {
                id: "source-history-alpha",
                kind: "source_history"
              }
            }
          ]
        }),
        "```"
      ].join("\n")
    ]);

    expect(extraction).toMatchObject({
      approvalRequestDirectives: [
        {
          approvalId: "approval-source-publication-alpha",
          approverNodeIds: ["operator-alpha"],
          operation: "source_publication",
          reason: "Approve publication before pushing source history.",
          resource: {
            id: "source-history-alpha",
            kind: "source_history"
          }
        }
      ],
      assistantMessages: ["Prepared the source history and requested approval."],
      errors: []
    });
  });

  it("parses OpenCode Entangle action blocks into handoff directives", async () => {
    const fixture = await createRuntimeFixture();
    const mock = createMockOpenCodeSpawn({
      processes: [
        {
          stdout: "0.10.0\n"
        },
        {
          stdoutLines: [
            JSON.stringify({
              part: {
                text: [
                  "I prepared the implementation.",
                  "```entangle-actions",
                  JSON.stringify({
                    handoffDirectives: [
                      {
                        summary: "Review the implementation artifact.",
                        targetNodeId: "reviewer-it"
                      }
                    ]
                  }),
                  "```"
                ].join("\n")
              },
              sessionID: "opencode-session",
              type: "text"
            })
          ]
        }
      ]
    });
    const engine = createOpenCodeAgentEngine({
      runtimeContext: fixture.context,
      spawn: mock.spawn
    });

    const result = await engine.executeTurn(buildTurnRequest());

    expect(result.assistantMessages).toEqual(["I prepared the implementation."]);
    expect(result.handoffDirectives).toEqual([
      {
        includeArtifacts: "produced",
        responsePolicy: {
          closeOnResult: true,
          maxFollowups: 1,
          responseRequired: true
        },
        summary: "Review the implementation artifact.",
        targetNodeId: "reviewer-it"
      }
    ]);
  });

  it("parses OpenCode Entangle action blocks into approval request directives", async () => {
    const fixture = await createRuntimeFixture();
    const mock = createMockOpenCodeSpawn({
      processes: [
        {
          stdout: "0.10.0\n"
        },
        {
          stdoutLines: [
            JSON.stringify({
              part: {
                text: [
                  "I prepared the source change candidate.",
                  "```entangle-actions",
                  JSON.stringify({
                    approvalRequestDirectives: [
                      {
                        approvalId: "approval-source-apply-alpha",
                        operation: "source_application",
                        reason: "Approve applying the source change candidate.",
                        resource: {
                          id: "source-change-alpha",
                          kind: "source_change_candidate"
                        }
                      }
                    ]
                  }),
                  "```"
                ].join("\n")
              },
              sessionID: "opencode-session",
              type: "text"
            })
          ]
        }
      ]
    });
    const engine = createOpenCodeAgentEngine({
      runtimeContext: fixture.context,
      spawn: mock.spawn
    });

    const result = await engine.executeTurn(buildTurnRequest());

    expect(result.assistantMessages).toEqual([
      "I prepared the source change candidate."
    ]);
    expect(result.approvalRequestDirectives).toEqual([
      {
        approvalId: "approval-source-apply-alpha",
        approverNodeIds: [],
        operation: "source_application",
        reason: "Approve applying the source change candidate.",
        resource: {
          id: "source-change-alpha",
          kind: "source_change_candidate"
        }
      }
    ]);
  });

  it("returns a bounded bad-request result for malformed Entangle action blocks", async () => {
    const fixture = await createRuntimeFixture();
    const mock = createMockOpenCodeSpawn({
      processes: [
        {
          stdout: "0.10.0\n"
        },
        {
          stdoutLines: [
            JSON.stringify({
              part: {
                text: [
                  "I tried to delegate.",
                  "```entangle-actions",
                  "{\"handoffDirectives\":[{\"summary\":\"Missing target\"}]}",
                  "```"
                ].join("\n")
              },
              sessionID: "opencode-session",
              type: "text"
            })
          ]
        }
      ]
    });
    const engine = createOpenCodeAgentEngine({
      runtimeContext: fixture.context,
      spawn: mock.spawn
    });

    const result = await engine.executeTurn(buildTurnRequest());

    expect(result).toMatchObject({
      assistantMessages: ["I tried to delegate."],
      failure: {
        classification: "bad_request"
      },
      providerStopReason: "entangle_action_directive_parse_error",
      stopReason: "error"
    });
    expect(result.failure?.message).toContain(
      "Engine handoff directives must specify edgeId or targetNodeId."
    );
  });

  it("throws a classified execution error when the OpenCode version probe fails", async () => {
    const fixture = await createRuntimeFixture();
    const mock = createMockOpenCodeSpawn({
      processes: [
        {
          closeCode: 127,
          stderr: "opencode not found"
        }
      ]
    });
    const engine = createOpenCodeAgentEngine({
      runtimeContext: fixture.context,
      spawn: mock.spawn
    });

    await expect(engine.executeTurn(buildTurnRequest())).rejects.toMatchObject({
      classification: "provider_unavailable",
      name: AgentEngineExecutionError.name
    });
    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0]!.args).toEqual(["--version"]);
  });

  it("kills the OpenCode run process when it exceeds the adapter timeout", async () => {
    const fixture = await createRuntimeFixture();
    const mock = createMockOpenCodeSpawn({
      processes: [
        {
          stdout: "0.10.0\n"
        },
        {
          autoClose: false,
          stdoutLines: [
            JSON.stringify({
              part: {
                text: "still running"
              },
              sessionID: "opencode-session",
              type: "text"
            })
          ]
        }
      ]
    });
    const engine = createOpenCodeAgentEngine({
      processTimeoutMs: 5,
      runtimeContext: fixture.context,
      spawn: mock.spawn
    });

    const turn = engine.executeTurn(buildTurnRequest());

    await expect(turn).rejects.toThrow(/timed out/);
    await expect(turn).rejects.toMatchObject({
      classification: "provider_unavailable",
      name: AgentEngineExecutionError.name
    });
    expect(mock.calls).toHaveLength(2);
    expect(mock.calls[1]!.killSignals).toEqual(["SIGTERM"]);
  });

  it("returns a policy-denied result when OpenCode auto-rejects a permission request", async () => {
    const fixture = await createRuntimeFixture();
    const mock = createMockOpenCodeSpawn({
      processes: [
        {
          stdout: "0.10.0\n"
        },
        {
          stdoutLines: [
            "! permission requested: bash (git push origin main); auto-rejecting"
          ]
        }
      ]
    });
    const engine = createOpenCodeAgentEngine({
      runtimeContext: fixture.context,
      spawn: mock.spawn
    });

    const result = await engine.executeTurn(buildTurnRequest());

    expect(result).toMatchObject({
      engineVersion: "0.10.0",
      failure: {
        classification: "policy_denied",
        message:
          "OpenCode requested permission and the one-shot CLI auto-rejected it: bash (git push origin main)."
      },
      permissionObservations: [
        {
          decision: "rejected",
          operation: "git_push",
          patterns: ["git push origin main"],
          permission: "bash"
        }
      ],
      providerStopReason: "opencode_permission_auto_rejected",
      stopReason: "error"
    });
  });

  it("returns a bounded error result when OpenCode emits an error event", async () => {
    const fixture = await createRuntimeFixture();
    const mock = createMockOpenCodeSpawn({
      processes: [
        {
          stdout: "0.10.0\n"
        },
        {
          stdoutLines: [
            JSON.stringify({
              error: {
                data: {
                  message: "Provider authentication failed."
                }
              },
              type: "error"
            })
          ]
        }
      ]
    });
    const engine = createOpenCodeAgentEngine({
      runtimeContext: fixture.context,
      spawn: mock.spawn
    });

    const result = await engine.executeTurn(buildTurnRequest());

    expect(result).toMatchObject({
      engineVersion: "0.10.0",
      failure: {
        classification: "unknown_provider_error",
        message: "Provider authentication failed."
      },
      providerStopReason: "opencode_error_event",
      stopReason: "error"
    });
  });

  it("throws a classified execution error when the OpenCode process exits non-zero", async () => {
    const fixture = await createRuntimeFixture();
    const mock = createMockOpenCodeSpawn({
      processes: [
        {
          stdout: "0.10.0\n"
        },
        {
          closeCode: 1,
          stderr: "opencode failed"
        }
      ]
    });
    const engine = createOpenCodeAgentEngine({
      runtimeContext: fixture.context,
      spawn: mock.spawn
    });

    await expect(engine.executeTurn(buildTurnRequest())).rejects.toMatchObject({
      classification: "provider_unavailable",
      name: AgentEngineExecutionError.name
    });
  });

  it("throws a classified configuration error when the node workspace is unavailable", async () => {
    const fixture = await createRuntimeFixture();
    const mock = createMockOpenCodeSpawn();
    await rm(fixture.context.workspace.sourceWorkspaceRoot!, {
      force: true,
      recursive: true
    });
    const engine = createOpenCodeAgentEngine({
      runtimeContext: fixture.context,
      spawn: mock.spawn
    });

    await expect(engine.executeTurn(buildTurnRequest())).rejects.toMatchObject({
      classification: "configuration_error",
      name: AgentEngineExecutionError.name
    });
    expect(mock.calls).toHaveLength(0);
  });
});
