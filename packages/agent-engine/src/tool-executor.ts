import type {
  EngineToolExecutionRequest,
  EngineToolExecutionResult
} from "@entangle/types";

export interface AgentEngineToolExecutor {
  executeToolCall(
    request: EngineToolExecutionRequest
  ): Promise<EngineToolExecutionResult>;
}
