import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import Anthropic from "@anthropic-ai/sdk";
import { type Message } from "@anthropic-ai/sdk/resources/messages";
import type { ModelRuntimeContext } from "@entangle/types";
import {
  AgentEngineConfigurationError,
  createAgentEngineForModelContext
} from "./index.js";
import type { AgentEngineExecutionError } from "./index.js";

const createdDirectories: string[] = [];

async function createTempTextFile(relativePath: string, content: string): Promise<string> {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "entangle-agent-engine-"));
  createdDirectories.push(tempRoot);
  const filePath = path.join(tempRoot, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
  return filePath;
}

function buildModelContext(
  overrides: Partial<ModelRuntimeContext["modelEndpointProfile"]> = {}
): ModelRuntimeContext {
  return {
    auth: {
      secretRef: "secret://shared-model",
      status: "available",
      delivery: {
        mode: "env_var",
        envVar: "ENTANGLE_MODEL_SECRET"
      }
    },
    modelEndpointProfile: {
      id: "shared-model",
      displayName: "Shared Model",
      adapterKind: "anthropic",
      baseUrl: "https://api.anthropic.com",
      authMode: "header_secret",
      secretRef: "secret://shared-model",
      defaultModel: "claude-opus-4-7",
      ...overrides
    }
  };
}

afterEach(async () => {
  delete process.env.ENTANGLE_MODEL_SECRET;
  await Promise.all(
    createdDirectories.splice(0, createdDirectories.length).map((directory) =>
      rm(directory, { force: true, recursive: true })
    )
  );
});

describe("agent-engine anthropic adapter", () => {
  it("renders prompt parts, artifact inputs, and memory refs into a real anthropic request", async () => {
    const artifactPath = await createTempTextFile(
      "artifacts/inbound.md",
      "Inbound artifact content.\n"
    );
    const memoryPath = await createTempTextFile(
      "memory/AGENTS.md",
      "# Memory Rules\n"
    );
    process.env.ENTANGLE_MODEL_SECRET = "anthropic-api-key";

    let capturedClientOptions:
      | {
          apiKey?: string;
          authToken?: string;
          baseURL: string;
        }
      | undefined;
    let capturedRequest:
      | {
          system?: string | Array<unknown>;
          messages: Array<{ content: string; role: "user" }>;
          model: string;
          max_tokens: number;
        }
      | undefined;
    const engine = createAgentEngineForModelContext({
      modelContext: buildModelContext(),
      clientFactory: (clientOptions) => {
        capturedClientOptions = clientOptions;
        return {
          messages: {
            create(request) {
              capturedRequest = request as {
                system?: string | Array<unknown>;
                messages: Array<{ content: string; role: "user" }>;
                model: string;
                max_tokens: number;
              };

              return Promise.resolve({
                id: "msg_test",
                type: "message",
                role: "assistant",
                content: [
                  {
                    type: "text",
                    text: "Real adapter path executed."
                  }
                ],
                model: "claude-opus-4-7",
                stop_reason: "end_turn",
                stop_sequence: null,
                usage: {
                  input_tokens: 42,
                  output_tokens: 12
                }
              } as Message);
            }
          }
        };
      }
    });

    const result = await engine.executeTurn({
      sessionId: "session-alpha",
      nodeId: "worker-it",
      systemPromptParts: ["System prompt from package.", "Runtime profile: local"],
      interactionPromptParts: ["Review the inbound artifact carefully."],
      toolDefinitions: [],
      artifactRefs: [
        {
          artifactId: "artifact-alpha",
          artifactKind: "report_file",
          backend: "git",
          locator: {
            gitServiceRef: "local-gitea",
            namespace: "team-alpha",
            repositoryName: "graph-alpha",
            branch: "worker-it/session-alpha/review",
            commit: "abc123",
            path: "reports/session-alpha/input.md"
          },
          preferred: true,
          status: "published"
        }
      ],
      artifactInputs: [
        {
          artifactId: "artifact-alpha",
          backend: "git",
          localPath: artifactPath,
          sourceRef: {
            artifactId: "artifact-alpha",
            artifactKind: "report_file",
            backend: "git",
            locator: {
              gitServiceRef: "local-gitea",
              namespace: "team-alpha",
              repositoryName: "graph-alpha",
              branch: "worker-it/session-alpha/review",
              commit: "abc123",
              path: "reports/session-alpha/input.md"
            },
            preferred: true,
            status: "published"
          }
        }
      ],
      memoryRefs: [memoryPath],
      executionLimits: {
        maxToolTurns: 8,
        maxOutputTokens: 2048
      }
    });

    expect(capturedClientOptions).toEqual({
      apiKey: "anthropic-api-key",
      authToken: undefined,
      baseURL: "https://api.anthropic.com"
    });
    expect(capturedRequest?.model).toBe("claude-opus-4-7");
    expect(capturedRequest?.max_tokens).toBe(2048);
    expect(capturedRequest?.system).toContain("System prompt from package.");
    expect(capturedRequest?.messages[0]?.content).toContain(
      "Review the inbound artifact carefully."
    );
    expect(capturedRequest?.messages[0]?.content).toContain(
      "Inbound artifact content."
    );
    expect(capturedRequest?.messages[0]?.content).toContain("# Memory Rules");
    expect(result).toMatchObject({
      assistantMessages: ["Real adapter path executed."],
      stopReason: "completed",
      usage: {
        inputTokens: 42,
        outputTokens: 12
      }
    });
  });

  it("maps api_key_bearer auth mode to the sdk authToken option", async () => {
    process.env.ENTANGLE_MODEL_SECRET = "anthropic-bearer-token";

    let capturedClientOptions:
      | {
          apiKey?: string;
          authToken?: string;
          baseURL: string;
        }
      | undefined;
    const engine = createAgentEngineForModelContext({
      modelContext: buildModelContext({
        authMode: "api_key_bearer"
      }),
      clientFactory: (clientOptions) => {
        capturedClientOptions = clientOptions;
        return {
          messages: {
            create() {
              return Promise.resolve({
                id: "msg_test",
                type: "message",
                role: "assistant",
                content: [{ type: "text", text: "ok" }],
                model: "claude-opus-4-7",
                stop_reason: "end_turn",
                stop_sequence: null,
                usage: {
                  input_tokens: 1,
                  output_tokens: 1
                }
              } as Message);
            }
          }
        };
      }
    });

    await engine.executeTurn({
      sessionId: "session-alpha",
      nodeId: "worker-it",
      systemPromptParts: ["System prompt."],
      interactionPromptParts: ["Hello."],
      toolDefinitions: [],
      artifactRefs: [],
      artifactInputs: [],
      memoryRefs: [],
      executionLimits: {
        maxToolTurns: 8,
        maxOutputTokens: 512
      }
    });

    expect(capturedClientOptions).toEqual({
      apiKey: undefined,
      authToken: "anthropic-bearer-token",
      baseURL: "https://api.anthropic.com"
    });
  });

  it("runs a bounded internal tool loop with a configured tool executor", async () => {
    process.env.ENTANGLE_MODEL_SECRET = "anthropic-api-key";
    const artifactPath = await createTempTextFile(
      "artifacts/input.md",
      "Inbound artifact content.\n"
    );

    const capturedRequests: Array<{
      messages: Array<unknown>;
      tools?: Array<unknown>;
    }> = [];
    const capturedToolCalls: Array<{
      artifactInputs: Array<unknown>;
      input: Record<string, unknown>;
      toolCallId: string;
      toolId: string;
    }> = [];
    let callCount = 0;
    const engine = createAgentEngineForModelContext({
      modelContext: buildModelContext(),
      toolExecutor: {
        executeToolCall(request) {
          capturedToolCalls.push({
            artifactInputs: request.artifactInputs,
            input: request.input,
            toolCallId: request.toolCallId,
            toolId: request.tool.id
          });

          return Promise.resolve({
            content: {
              artifactId: request.input.artifactId,
              preview: "Inbound artifact content."
            },
            isError: false
          });
        }
      },
      clientFactory: () => ({
        messages: {
          create(request) {
            capturedRequests.push({
              messages: request.messages,
              ...(request.tools ? { tools: request.tools } : {})
            });
            callCount += 1;

            if (callCount === 1) {
              return Promise.resolve({
                id: "msg_tool_use",
                type: "message",
                role: "assistant",
                content: [
                  {
                    type: "text",
                    text: "I'll inspect the artifact first."
                  },
                  {
                    type: "tool_use",
                    id: "toolu_01D7FLrfh4GYq7yT1ULFeyMV",
                    name: "inspect_artifact_input",
                    input: {
                      artifactId: "artifact-alpha"
                    },
                    caller: "direct"
                  }
                ],
                model: "claude-opus-4-7",
                stop_reason: "tool_use",
                stop_sequence: null,
                usage: {
                  input_tokens: 30,
                  output_tokens: 10
                }
              } as unknown as Message);
            }

            return Promise.resolve({
              id: "msg_final",
              type: "message",
              role: "assistant",
              content: [
                {
                  type: "text",
                  text: "The inspected artifact looks consistent."
                }
              ],
              model: "claude-opus-4-7",
              stop_reason: "end_turn",
              stop_sequence: null,
              usage: {
                input_tokens: 20,
                output_tokens: 8
              }
            } as unknown as Message);
          }
        }
      })
    });

    const result = await engine.executeTurn({
      sessionId: "session-alpha",
      nodeId: "worker-it",
      systemPromptParts: ["System prompt."],
      interactionPromptParts: ["Inspect the inbound artifact."],
      toolDefinitions: [
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
          }
        }
      ],
      artifactRefs: [],
      artifactInputs: [
        {
          artifactId: "artifact-alpha",
          backend: "git",
          localPath: artifactPath,
          sourceRef: {
            artifactId: "artifact-alpha",
            artifactKind: "report_file",
            backend: "git",
            locator: {
              branch: "worker-it/session-alpha/review",
              commit: "abc123",
              gitServiceRef: "local-gitea",
              namespace: "team-alpha",
              repositoryName: "graph-alpha",
              path: "reports/session-alpha/input.md"
            },
            preferred: true,
            status: "published"
          }
        }
      ],
      memoryRefs: [],
      executionLimits: {
        maxToolTurns: 2,
        maxOutputTokens: 1024
      }
    });

    expect(capturedRequests).toHaveLength(2);
    expect(capturedRequests[0]?.tools).toEqual([
      {
        description: "Inspect a retrieved inbound artifact by artifact id.",
        input_schema: {
          type: "object",
          properties: {
            artifactId: {
              type: "string"
            }
          },
          required: ["artifactId"]
        },
        name: "inspect_artifact_input"
      }
    ]);
    expect(capturedRequests[1]?.messages).toHaveLength(3);
    expect(capturedToolCalls).toEqual([
      {
        artifactInputs: [
          expect.objectContaining({
            artifactId: "artifact-alpha"
          })
        ],
        input: {
          artifactId: "artifact-alpha"
        },
        toolCallId: "toolu_01D7FLrfh4GYq7yT1ULFeyMV",
        toolId: "inspect_artifact_input"
      }
    ]);
    expect(result).toMatchObject({
      assistantMessages: ["The inspected artifact looks consistent."],
      stopReason: "completed",
      usage: {
        inputTokens: 50,
        outputTokens: 18
      }
    });
  });

  it("fails deterministically when the model exceeds the configured tool loop budget", async () => {
    process.env.ENTANGLE_MODEL_SECRET = "anthropic-api-key";

    const engine = createAgentEngineForModelContext({
      modelContext: buildModelContext(),
      toolExecutor: {
        executeToolCall() {
          return Promise.resolve({
            content: "tool result",
            isError: false
          });
        }
      },
      clientFactory: () => ({
        messages: {
          create() {
            return Promise.resolve({
              id: "msg_tool_use",
              type: "message",
              role: "assistant",
              content: [
                {
                  type: "tool_use",
                  id: "toolu_01D7FLrfh4GYq7yT1ULFeyMV",
                  name: "inspect_artifact_input",
                  input: {
                    artifactId: "artifact-alpha"
                  },
                  caller: "direct"
                }
              ],
              model: "claude-opus-4-7",
              stop_reason: "tool_use",
              stop_sequence: null,
              usage: {
                input_tokens: 10,
                output_tokens: 5
              }
            } as unknown as Message);
          }
        }
      })
    });

    await expect(
      engine.executeTurn({
        sessionId: "session-alpha",
        nodeId: "worker-it",
        systemPromptParts: ["System prompt."],
        interactionPromptParts: ["Inspect the inbound artifact."],
        toolDefinitions: [
          {
            id: "inspect_artifact_input",
            description: "Inspect a retrieved inbound artifact by artifact id.",
            inputSchema: {
              type: "object"
            }
          }
        ],
        artifactRefs: [],
        artifactInputs: [],
        memoryRefs: [],
        executionLimits: {
          maxToolTurns: 1,
          maxOutputTokens: 1024
        }
      })
    ).rejects.toMatchObject({
      classification: "tool_protocol_error",
      name: "AgentEngineExecutionError"
    } satisfies Partial<AgentEngineExecutionError>);
  });

  it("normalizes anthropic auth failures into engine execution errors", async () => {
    process.env.ENTANGLE_MODEL_SECRET = "anthropic-api-key";

    const engine = createAgentEngineForModelContext({
      modelContext: buildModelContext(),
      clientFactory: () => ({
        messages: {
          create() {
            throw new Anthropic.AuthenticationError(
              401,
              {},
              "unauthorized",
              new Headers()
            );
          }
        }
      })
    });

    await expect(
      engine.executeTurn({
        sessionId: "session-alpha",
        nodeId: "worker-it",
        systemPromptParts: ["System prompt."],
        interactionPromptParts: ["Hello."],
        toolDefinitions: [],
        artifactRefs: [],
        artifactInputs: [],
        memoryRefs: [],
        executionLimits: {
          maxToolTurns: 8,
          maxOutputTokens: 512
        }
      })
    ).rejects.toMatchObject({
      classification: "auth_error",
      name: "AgentEngineExecutionError"
    });
  });

  it("rejects unimplemented adapters deterministically", () => {
    expect(() =>
      createAgentEngineForModelContext({
        modelContext: buildModelContext({
          adapterKind: "openai_compatible"
        })
      })
    ).toThrow(AgentEngineConfigurationError);
  });
});
