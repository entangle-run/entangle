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

const defaultExternalHttpTimeoutMs = 120_000;

function resolveTimeoutMs(): number {
  const raw = process.env.ENTANGLE_EXTERNAL_HTTP_ENGINE_TIMEOUT_MS;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : defaultExternalHttpTimeoutMs;
}

function buildExternalHttpPayload(input: {
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

function classifyHttpStatus(status: number) {
  if (status === 401 || status === 403) {
    return "auth_error" as const;
  }

  if (status === 408 || status === 429) {
    return "rate_limit" as const;
  }

  if (status >= 400 && status < 500) {
    return "bad_request" as const;
  }

  return "provider_unavailable" as const;
}

function parseExternalHttpResult(rawBody: string): unknown {
  if (!rawBody.trim()) {
    throw new AgentEngineExecutionError(
      "External HTTP agent engine returned an empty response body.",
      {
        classification: "tool_protocol_error"
      }
    );
  }

  try {
    return JSON.parse(rawBody);
  } catch (error) {
    throw new AgentEngineExecutionError(
      "External HTTP agent engine response body was not valid JSON.",
      {
        classification: "tool_protocol_error",
        cause: error
      }
    );
  }
}

function buildHeaders(input: {
  profileId: string;
  runtimeContext: EffectiveRuntimeContext;
}): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-entangle-agent-engine-profile-id": input.profileId,
    "x-entangle-graph-id": input.runtimeContext.binding.graphId,
    "x-entangle-node-id": input.runtimeContext.binding.node.nodeId
  };
}

export function createExternalHttpAgentEngine(input: {
  runtimeContext: EffectiveRuntimeContext;
}): AgentEngine {
  const profile = input.runtimeContext.agentRuntimeContext.engineProfile;

  if (profile.kind !== "external_http") {
    throw new AgentEngineConfigurationError(
      `Cannot create an external HTTP engine from profile kind '${profile.kind}'.`
    );
  }

  if (!profile.baseUrl) {
    throw new AgentEngineConfigurationError(
      `External HTTP engine profile '${profile.id}' must declare a base URL.`
    );
  }

  return {
    async executeTurn(request, options?: AgentEngineTurnOptions) {
      const controller = new AbortController();
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, resolveTimeoutMs());
      const abortHandler = (): void => controller.abort();

      options?.abortSignal?.addEventListener("abort", abortHandler, {
        once: true
      });

      if (options?.abortSignal?.aborted) {
        controller.abort();
      }

      try {
        const response = await fetch(profile.baseUrl!, {
          body: JSON.stringify(
            buildExternalHttpPayload({
              request,
              runtimeContext: input.runtimeContext
            })
          ),
          headers: buildHeaders({
            profileId: profile.id,
            runtimeContext: input.runtimeContext
          }),
          method: "POST",
          signal: controller.signal
        });
        const responseBody = await response.text();

        if (!response.ok) {
          throw new AgentEngineExecutionError(
            `External HTTP agent engine '${profile.id}' returned HTTP ${response.status}${
              responseBody.trim() ? `: ${responseBody.trim()}` : "."
            }`,
            {
              classification: classifyHttpStatus(response.status)
            }
          );
        }

        const parsed = agentEngineTurnResultSchema.safeParse(
          parseExternalHttpResult(responseBody)
        );

        if (!parsed.success) {
          throw new AgentEngineExecutionError(
            "External HTTP agent engine result did not match the turn result schema.",
            {
              classification: "tool_protocol_error",
              cause: parsed.error
            }
          );
        }

        return parsed.data;
      } catch (error) {
        if (options?.abortSignal?.aborted) {
          throw new AgentEngineExecutionError(
            `External HTTP agent engine '${profile.id}' was cancelled.`,
            {
              classification: "cancelled"
            }
          );
        }

        if (error instanceof AgentEngineExecutionError) {
          throw error;
        }

        if (timedOut) {
          throw new AgentEngineExecutionError(
            `External HTTP agent engine '${profile.id}' timed out.`,
            {
              classification: "provider_unavailable",
              cause: error
            }
          );
        }

        throw new AgentEngineExecutionError(
          `External HTTP agent engine '${profile.id}' could not complete the turn request.`,
          {
            classification: "provider_unavailable",
            cause: error
          }
        );
      } finally {
        clearTimeout(timeout);
        options?.abortSignal?.removeEventListener("abort", abortHandler);
      }
    }
  };
}
