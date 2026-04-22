import {
  agentEngineTurnResultSchema,
  type AgentEngineTurnRequest,
  type AgentEngineTurnResult
} from "@entangle/types";

export interface AgentEngine {
  executeTurn(request: AgentEngineTurnRequest): Promise<AgentEngineTurnResult>;
}

export function createStubAgentEngine(): AgentEngine {
  return {
    async executeTurn(
      request: AgentEngineTurnRequest
    ): Promise<AgentEngineTurnResult> {
      return agentEngineTurnResultSchema.parse({
        assistantMessages: [
          `Stub engine executed for node '${request.nodeId}' with ${request.toolDefinitions.length} tool definitions.`
        ],
        toolRequests: [],
        stopReason: "completed",
        usage: {
          inputTokens: 0,
          outputTokens: 0
        }
      });
    }
  };
}
