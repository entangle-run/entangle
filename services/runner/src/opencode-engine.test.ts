import { EventEmitter } from "node:events";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  delete process.env.OPENCODE_SERVER_PASSWORD;
  delete process.env.OPENCODE_SERVER_USERNAME;
  vi.unstubAllGlobals();
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
    await expect(
      readFile(
        path.join(
          fixture.context.workspace.engineStateRoot!,
          "entangle-opencode-session-map.json"
        ),
        "utf8"
      )
    ).resolves.toContain('"session-alpha": "opencode-session"');
  });

  it("continues a mapped OpenCode session for later turns", async () => {
    const fixture = await createRuntimeFixture();
    const sessionMapPath = path.join(
      fixture.context.workspace.engineStateRoot!,
      "entangle-opencode-session-map.json"
    );
    await writeFile(
      sessionMapPath,
      `${JSON.stringify(
        {
          "session-alpha": "previous-opencode-session"
        },
        null,
        2
      )}\n`,
      "utf8"
    );
    const mock = createMockOpenCodeSpawn({
      processes: [
        {
          stdout: "0.10.0\n"
        },
        {
          stdoutLines: [
            JSON.stringify({
              part: {
                text: "Continued the existing engine session."
              },
              sessionID: "next-opencode-session",
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
      assistantMessages: ["Continued the existing engine session."],
      engineSessionId: "next-opencode-session"
    });
    expect(mock.calls[1]!.args).toEqual(
      expect.arrayContaining(["--session", "previous-opencode-session"])
    );
    await expect(readFile(sessionMapPath, "utf8")).resolves.toContain(
      '"session-alpha": "next-opencode-session"'
    );
  });

  it("passes the OpenCode auto-approve permission flag when configured", async () => {
    const fixture = await createRuntimeFixture();
    const context = {
      ...fixture.context,
      agentRuntimeContext: {
        ...fixture.context.agentRuntimeContext,
        engineProfile: {
          ...fixture.context.agentRuntimeContext.engineProfile,
          permissionMode: "auto_approve" as const
        }
      }
    };
    const mock = createMockOpenCodeSpawn({
      processes: [
        {
          stdout: "0.10.0\n"
        },
        {
          stdoutLines: [
            JSON.stringify({
              part: {
                text: "Completed with engine-managed tool permissions."
              },
              sessionID: "opencode-session",
              type: "text"
            })
          ]
        }
      ]
    });
    const engine = createOpenCodeAgentEngine({
      runtimeContext: context,
      spawn: mock.spawn
    });

    await engine.executeTurn(buildTurnRequest());

    expect(mock.calls[1]!.args).toContain("--dangerously-skip-permissions");
  });

  it("probes attached OpenCode server health before running a turn", async () => {
    const fixture = await createRuntimeFixture();
    const baseUrl = "http://127.0.0.1:4567";
    const context = {
      ...fixture.context,
      agentRuntimeContext: {
        ...fixture.context.agentRuntimeContext,
        engineProfile: {
          ...fixture.context.agentRuntimeContext.engineProfile,
          baseUrl
        }
      }
    };
    const mock = createMockOpenCodeSpawn();
    const requests: Array<{
      authorization?: string | undefined;
      method?: string | undefined;
      url: string;
    }> = [];
    process.env.OPENCODE_SERVER_USERNAME = "entangle";
    process.env.OPENCODE_SERVER_PASSWORD = "server-secret";
    vi.stubGlobal(
      "fetch",
      (
        input: Parameters<typeof fetch>[0],
        init?: Parameters<typeof fetch>[1]
      ) => {
        const url =
          input instanceof URL
            ? input.toString()
            : typeof input === "string"
              ? input
              : input.url;
        const headers = new Headers(init?.headers);

        requests.push({
          authorization: headers.get("authorization") ?? undefined,
          method: init?.method,
          url
        });

        if (url === "http://127.0.0.1:4567/global/health") {
          return new Response(
            JSON.stringify({
              healthy: true,
              version: "1.14.20"
            }),
            {
              headers: {
                "content-type": "application/json"
              },
              status: 200
            }
          );
        }

        if (url === "http://127.0.0.1:4567/session") {
          return new Response(JSON.stringify({ id: "opencode-session" }), {
            headers: {
              "content-type": "application/json"
            },
            status: 200
          });
        }

        if (url === "http://127.0.0.1:4567/event") {
          const encoder = new TextEncoder();
          return new Response(
            new ReadableStream({
              start(controller) {
                controller.enqueue(
                  encoder.encode(
                    [
                      "data: {\"type\":\"server.connected\",\"properties\":{}}",
                      "",
                      "data: {\"type\":\"message.part.updated\",\"properties\":{\"part\":{\"sessionID\":\"opencode-session\",\"type\":\"text\",\"text\":\"Completed through attached server.\"}}}",
                      "",
                      "data: {\"type\":\"session.status\",\"properties\":{\"sessionID\":\"opencode-session\",\"status\":{\"type\":\"idle\"}}}",
                      "",
                      ""
                    ].join("\n")
                  )
                );
                controller.close();
              }
            }),
            {
              headers: {
                "content-type": "text/event-stream"
              },
              status: 200
            }
          );
        }

        if (
          url ===
          "http://127.0.0.1:4567/session/opencode-session/prompt_async"
        ) {
          return new Response("{}", {
            headers: {
              "content-type": "application/json"
            },
            status: 200
          });
        }

        return new Response(
          JSON.stringify({
            message: `Unexpected OpenCode test URL ${url}`
          }),
          {
            headers: {
              "content-type": "application/json"
            },
            status: 404
          }
        );
      }
    );
    const engine = createOpenCodeAgentEngine({
      runtimeContext: context,
      spawn: mock.spawn
    });

    const result = await engine.executeTurn(buildTurnRequest());

    expect(result).toMatchObject({
      assistantMessages: ["Completed through attached server."],
      engineVersion: "server 1.14.20",
      providerStopReason: "opencode_server_idle"
    });
    expect(requests[0]).toEqual(
      {
        authorization: `Basic ${Buffer.from("entangle:server-secret").toString(
          "base64"
        )}`,
        method: undefined,
        url: "http://127.0.0.1:4567/global/health"
      }
    );
    expect(requests.map((request) => request.url)).toEqual([
      "http://127.0.0.1:4567/global/health",
      "http://127.0.0.1:4567/session",
      "http://127.0.0.1:4567/event",
      "http://127.0.0.1:4567/session/opencode-session/prompt_async"
    ]);
    expect(mock.calls).toHaveLength(0);
  });

  it("bridges attached OpenCode permission requests through Entangle approval callback", async () => {
    const fixture = await createRuntimeFixture();
    const baseUrl = "http://127.0.0.1:4567";
    const context = {
      ...fixture.context,
      agentRuntimeContext: {
        ...fixture.context.agentRuntimeContext,
        engineProfile: {
          ...fixture.context.agentRuntimeContext.engineProfile,
          baseUrl,
          permissionMode: "entangle_approval" as const
        }
      }
    };
    const permissionReplies: unknown[] = [];
    const permissionRequests: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      (
        input: Parameters<typeof fetch>[0],
        init?: Parameters<typeof fetch>[1]
      ) => {
        const url =
          input instanceof URL
            ? input.toString()
            : typeof input === "string"
              ? input
              : input.url;

        if (url === "http://127.0.0.1:4567/global/health") {
          return new Response(
            JSON.stringify({
              healthy: true,
              version: "1.14.20"
            }),
            {
              headers: {
                "content-type": "application/json"
              },
              status: 200
            }
          );
        }

        if (url === "http://127.0.0.1:4567/session") {
          return new Response(JSON.stringify({ id: "opencode-session" }), {
            headers: {
              "content-type": "application/json"
            },
            status: 200
          });
        }

        if (url === "http://127.0.0.1:4567/event") {
          const encoder = new TextEncoder();
          return new Response(
            new ReadableStream({
              start(controller) {
                controller.enqueue(
                  encoder.encode(
                    [
                      "data: {\"type\":\"server.connected\",\"properties\":{}}",
                      "",
                      "data: {\"type\":\"permission.asked\",\"properties\":{\"id\":\"permission-alpha\",\"sessionID\":\"opencode-session\",\"permission\":\"bash\",\"patterns\":[\"git commit -m test\"],\"metadata\":{\"command\":\"git commit -m test\"},\"tool\":{\"callID\":\"tool-call-alpha\"}}}",
                      "",
                      "data: {\"type\":\"message.part.updated\",\"properties\":{\"part\":{\"sessionID\":\"opencode-session\",\"type\":\"text\",\"text\":\"Committed after approval.\"}}}",
                      "",
                      "data: {\"type\":\"session.status\",\"properties\":{\"sessionID\":\"opencode-session\",\"status\":{\"type\":\"idle\"}}}",
                      "",
                      ""
                    ].join("\n")
                  )
                );
                controller.close();
              }
            }),
            {
              headers: {
                "content-type": "text/event-stream"
              },
              status: 200
            }
          );
        }

        if (
          url ===
          "http://127.0.0.1:4567/permission/permission-alpha/reply"
        ) {
          if (typeof init?.body !== "string") {
            throw new Error("Expected JSON permission reply body.");
          }
          permissionReplies.push(JSON.parse(init.body));
          return new Response("{}", {
            headers: {
              "content-type": "application/json"
            },
            status: 200
          });
        }

        if (
          url ===
          "http://127.0.0.1:4567/session/opencode-session/prompt_async"
        ) {
          return new Response("{}", {
            headers: {
              "content-type": "application/json"
            },
            status: 200
          });
        }

        return new Response("{}", {
          status: 404
        });
      }
    );
    const engine = createOpenCodeAgentEngine({
      runtimeContext: context,
      spawn: createMockOpenCodeSpawn().spawn
    });

    const result = await engine.executeTurn(buildTurnRequest(), {
      requestPermission: (request) => {
        permissionRequests.push(request);
        return Promise.resolve({
          approvalId: "approval-engine-permission-alpha",
          decision: "approved",
          message: "Approved by Entangle policy."
        });
      }
    });

    expect(permissionRequests).toEqual([
      expect.objectContaining({
        operation: "git_commit",
        patterns: ["git commit -m test"],
        permission: "bash",
        toolCallId: "tool-call-alpha"
      })
    ]);
    expect(permissionReplies).toEqual([
      {
        message: "Approved by Entangle policy.",
        reply: "once"
      }
    ]);
    expect(result).toMatchObject({
      assistantMessages: ["Committed after approval."],
      permissionObservations: [
        {
          decision: "pending",
          operation: "git_commit",
          permission: "bash"
        },
        {
          decision: "allowed",
          operation: "git_commit",
          permission: "bash",
          reason: "Approved by Entangle policy."
        }
      ],
      providerStopReason: "opencode_server_idle",
      stopReason: "completed"
    });
  });

  it("fails before launching OpenCode run when the attached server is unhealthy", async () => {
    const fixture = await createRuntimeFixture();
    const context = {
      ...fixture.context,
      agentRuntimeContext: {
        ...fixture.context.agentRuntimeContext,
        engineProfile: {
          ...fixture.context.agentRuntimeContext.engineProfile,
          baseUrl: "http://127.0.0.1:4567"
        }
      }
    };
    const mock = createMockOpenCodeSpawn({
      processes: [
        {
          stdout: "0.10.0\n"
        }
      ]
    });
    vi.stubGlobal("fetch", () => {
      return new Response(JSON.stringify({ healthy: false }), {
        status: 503
      });
    });
    const engine = createOpenCodeAgentEngine({
      runtimeContext: context,
      spawn: mock.spawn
    });

    await expect(engine.executeTurn(buildTurnRequest())).rejects.toMatchObject({
      classification: "provider_unavailable",
      name: AgentEngineExecutionError.name
    });
    expect(mock.calls).toHaveLength(0);
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
          "OpenCode requested permission and Entangle rejected it: bash (git push origin main)."
      },
      permissionObservations: [
        {
          decision: "rejected",
          operation: "git_push",
          patterns: ["git push origin main"],
          permission: "bash"
        }
      ],
      providerStopReason: "opencode_permission_rejected",
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
