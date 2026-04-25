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
  type OpenCodeSpawn
} from "./opencode-engine.js";
import {
  cleanupRuntimeFixtures,
  createRuntimeFixture
} from "./test-fixtures.js";

type MockSpawnCall = {
  args: string[];
  command: string;
  options: Parameters<OpenCodeSpawn>[2];
  readStdin: () => string;
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
  closeCode?: number;
  closeSignal?: NodeJS.Signals | null;
  stderr?: string;
  stdoutLines?: string[];
} = {}): {
  calls: MockSpawnCall[];
  spawn: OpenCodeSpawn;
} {
  const calls: MockSpawnCall[] = [];
  const spawn: OpenCodeSpawn = (command, args, options) => {
    const emitter = new EventEmitter();
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    let stdinText = "";

    stdin.on("data", (chunk: Buffer | string) => {
      stdinText += chunk.toString();
    });
    calls.push({
      args,
      command,
      options,
      readStdin: () => stdinText
    });

    process.nextTick(() => {
      for (const line of input.stdoutLines ?? []) {
        stdout.write(`${line}\n`);
      }
      stdout.end();

      if (input.stderr) {
        stderr.write(input.stderr);
      }
      stderr.end();
      emitter.emit("close", input.closeCode ?? 0, input.closeSignal ?? null);
    });

    return {
      kill: () => true,
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
              gitServiceRef: "local-gitea",
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
            id: "tool-1",
            state: {
              status: "completed"
            },
            tool: "bash"
          },
          sessionID: "opencode-session",
          type: "tool_use"
        })
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
      providerStopReason: "opencode_process_exit_0",
      stopReason: "completed",
      toolExecutions: [
        {
          outcome: "success",
          sequence: 1,
          toolCallId: "tool-1",
          toolId: "bash"
        }
      ]
    });
    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0]!.command).toBe("opencode");
    expect(mock.calls[0]!.args).toEqual(
      expect.arrayContaining([
        "run",
        "--format=json",
        "--dir",
        fixture.context.workspace.sourceWorkspaceRoot,
        "--agent",
        "general"
      ])
    );
    expect(mock.calls[0]!.options.cwd).toBe(
      fixture.context.workspace.sourceWorkspaceRoot
    );
    const engineStateRoot = fixture.context.workspace.engineStateRoot!;
    expect(mock.calls[0]!.options.env).toMatchObject({
      ENTANGLE_NODE_ID: "worker-it",
      OPENCODE_CONFIG_DIR: path.join(engineStateRoot, "config"),
      OPENCODE_DB: path.join(engineStateRoot, "opencode.db"),
      OPENCODE_TEST_HOME: path.join(engineStateRoot, "home"),
      XDG_CACHE_HOME: path.join(engineStateRoot, "xdg", "cache"),
      XDG_CONFIG_HOME: path.join(engineStateRoot, "xdg", "config"),
      XDG_DATA_HOME: path.join(engineStateRoot, "xdg", "data"),
      XDG_STATE_HOME: path.join(engineStateRoot, "xdg", "state")
    });
    expect(mock.calls[0]!.readStdin()).toContain(
      "Review the current workspace"
    );
  });

  it("returns a bounded error result when OpenCode emits an error event", async () => {
    const fixture = await createRuntimeFixture();
    const mock = createMockOpenCodeSpawn({
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
    });
    const engine = createOpenCodeAgentEngine({
      runtimeContext: fixture.context,
      spawn: mock.spawn
    });

    const result = await engine.executeTurn(buildTurnRequest());

    expect(result).toMatchObject({
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
      closeCode: 1,
      stderr: "opencode failed"
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
