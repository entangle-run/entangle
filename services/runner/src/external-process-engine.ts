import { spawn as spawnChildProcess } from "node:child_process";
import type {
  ChildProcessWithoutNullStreams,
  SpawnOptionsWithoutStdio
} from "node:child_process";
import {
  AgentEngineConfigurationError,
  AgentEngineExecutionError,
  type AgentEngine,
  type AgentEngineTurnOptions
} from "@entangle/agent-engine";
import {
  agentEngineTurnResultSchema,
  type AgentEngineTurnRequest,
  type EffectiveRuntimeContext
} from "@entangle/types";

type ExternalProcess = Pick<
  ChildProcessWithoutNullStreams,
  "kill" | "on" | "once" | "stderr" | "stdin" | "stdout"
>;

export type ExternalProcessSpawn = (
  command: string,
  args: string[],
  options: SpawnOptionsWithoutStdio
) => ExternalProcess;

const defaultExternalProcessTimeoutMs = 120_000;
const maxCapturedOutputCharacters = 64_000;

const defaultExternalProcessSpawn: ExternalProcessSpawn = (
  command,
  args,
  options
) =>
  spawnChildProcess(command, args, {
    ...options,
    stdio: "pipe"
  });

function appendBounded(current: string, chunk: Buffer): string {
  const next = `${current}${chunk.toString("utf8")}`;

  if (next.length <= maxCapturedOutputCharacters) {
    return next;
  }

  return next.slice(next.length - maxCapturedOutputCharacters);
}

function resolveTimeoutMs(): number {
  const raw = process.env.ENTANGLE_EXTERNAL_PROCESS_ENGINE_TIMEOUT_MS;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : defaultExternalProcessTimeoutMs;
}

function buildExternalProcessPayload(input: {
  request: AgentEngineTurnRequest;
  runtimeContext: EffectiveRuntimeContext;
}): Record<string, unknown> {
  return {
    request: input.request,
    runtime: {
      agentRuntime: {
        defaultAgent: input.runtimeContext.agentRuntimeContext.defaultAgent,
        engineProfileRef:
          input.runtimeContext.agentRuntimeContext.engineProfileRef,
        engineProfile:
          input.runtimeContext.agentRuntimeContext.engineProfile,
        mode: input.runtimeContext.agentRuntimeContext.mode
      },
      graphId: input.runtimeContext.binding.graphId,
      graphRevisionId: input.runtimeContext.binding.graphRevisionId,
      nodeId: input.runtimeContext.binding.node.nodeId,
      runtimeProfile: input.runtimeContext.binding.runtimeProfile,
      workspace: {
        artifactWorkspaceRoot:
          input.runtimeContext.workspace.artifactWorkspaceRoot,
        memoryRoot: input.runtimeContext.workspace.memoryRoot,
        runtimeRoot: input.runtimeContext.workspace.runtimeRoot,
        sourceWorkspaceRoot: input.runtimeContext.workspace.sourceWorkspaceRoot
      }
    },
    schemaVersion: 1
  };
}

function parseExternalProcessResult(stdout: string): unknown {
  const trimmed = stdout.trim();

  if (!trimmed) {
    throw new AgentEngineExecutionError(
      "External process agent engine did not write a JSON result to stdout.",
      {
        classification: "tool_protocol_error"
      }
    );
  }

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    throw new AgentEngineExecutionError(
      "External process agent engine stdout was not valid JSON.",
      {
        classification: "tool_protocol_error",
        cause: error
      }
    );
  }
}

export function createExternalProcessAgentEngine(input: {
  runtimeContext: EffectiveRuntimeContext;
  spawn?: ExternalProcessSpawn;
}): AgentEngine {
  const profile = input.runtimeContext.agentRuntimeContext.engineProfile;

  if (profile.kind !== "external_process") {
    throw new AgentEngineConfigurationError(
      `Cannot create an external process engine from profile kind '${profile.kind}'.`
    );
  }

  if (!profile.executable) {
    throw new AgentEngineConfigurationError(
      `External process engine profile '${profile.id}' must declare an executable.`
    );
  }

  const spawn = input.spawn ?? defaultExternalProcessSpawn;

  return {
    executeTurn(request, options?: AgentEngineTurnOptions) {
      return new Promise((resolve, reject) => {
        const signal = options?.abortSignal;
        const child = spawn(profile.executable!, [], {
          cwd:
            input.runtimeContext.workspace.sourceWorkspaceRoot ??
            input.runtimeContext.workspace.runtimeRoot,
          env: {
            ...process.env,
            ENTANGLE_AGENT_ENGINE_PROFILE_ID: profile.id,
            ENTANGLE_AGENT_ENGINE_PROFILE_KIND: profile.kind,
            ENTANGLE_GRAPH_ID: input.runtimeContext.binding.graphId,
            ENTANGLE_NODE_ID: input.runtimeContext.binding.node.nodeId,
            ENTANGLE_RUNTIME_ROOT: input.runtimeContext.workspace.runtimeRoot,
            ...(input.runtimeContext.workspace.sourceWorkspaceRoot
              ? {
                  ENTANGLE_SOURCE_WORKSPACE_ROOT:
                    input.runtimeContext.workspace.sourceWorkspaceRoot
                }
              : {})
          }
        });
        let stdout = "";
        let stderr = "";
        let settled = false;

        const clearTurnWatchers = () => {
          clearTimeout(timeout);
          signal?.removeEventListener("abort", abort);
        };

        const rejectTurn = (error: Error) => {
          if (settled) {
            return;
          }

          settled = true;
          clearTurnWatchers();
          reject(error);
        };

        const timeout = setTimeout(() => {
          child.kill("SIGTERM");
          rejectTurn(
            new AgentEngineExecutionError(
              `External process agent engine '${profile.id}' timed out.`,
              {
                classification: "provider_unavailable"
              }
            )
          );
        }, resolveTimeoutMs());

        const abort = () => {
          child.kill("SIGTERM");
          rejectTurn(
            new AgentEngineExecutionError(
              `External process agent engine '${profile.id}' was cancelled.`,
              {
                classification: "cancelled"
              }
            )
          );
        };

        if (signal?.aborted) {
          abort();
          return;
        }

        signal?.addEventListener("abort", abort, { once: true });

        child.stdout.on("data", (chunk: Buffer) => {
          stdout = appendBounded(stdout, chunk);
        });
        child.stderr.on("data", (chunk: Buffer) => {
          stderr = appendBounded(stderr, chunk);
        });
        child.stdin.once("error", (error) => {
          rejectTurn(
            new AgentEngineExecutionError(
              `External process agent engine '${profile.id}' could not receive the turn request.`,
              {
                classification: "provider_unavailable",
                cause: error
              }
            )
          );
        });
        child.once("error", (error) => {
          rejectTurn(
            new AgentEngineExecutionError(
              `External process agent engine '${profile.id}' could not start.`,
              {
                classification: "provider_unavailable",
                cause: error
              }
            )
          );
        });
        child.once("close", (code) => {
          if (settled) {
            return;
          }

          settled = true;
          clearTurnWatchers();

          if (code !== 0) {
            reject(
              new AgentEngineExecutionError(
                `External process agent engine '${profile.id}' exited with code ${code ?? "unknown"}${
                  stderr.trim() ? `: ${stderr.trim()}` : "."
                }`,
                {
                  classification: "provider_unavailable"
                }
              )
            );
            return;
          }

          try {
            const parsed = agentEngineTurnResultSchema.safeParse(
              parseExternalProcessResult(stdout)
            );

            if (!parsed.success) {
              throw new AgentEngineExecutionError(
                "External process agent engine result did not match the turn result schema.",
                {
                  classification: "tool_protocol_error",
                  cause: parsed.error
                }
              );
            }

            resolve(parsed.data);
          } catch (error) {
            reject(
              error instanceof Error
                ? error
                : new AgentEngineExecutionError(
                    "External process agent engine result could not be parsed.",
                    {
                      classification: "tool_protocol_error"
                    }
                  )
            );
          }
        });

        child.stdin.end(
          `${JSON.stringify(
            buildExternalProcessPayload({
              request,
              runtimeContext: input.runtimeContext
            })
          )}\n`
        );
      });
    }
  };
}
