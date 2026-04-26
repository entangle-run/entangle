import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import Anthropic, {
  APIConnectionError,
  APIConnectionTimeoutError,
  AuthenticationError,
  BadRequestError,
  InternalServerError,
  PermissionDeniedError,
  RateLimitError,
  UnprocessableEntityError
} from "@anthropic-ai/sdk";
import type {
  Message,
  MessageCreateParamsNonStreaming,
  MessageParam,
  Tool,
  ToolResultBlockParam,
  ToolUseBlock
} from "@anthropic-ai/sdk/resources/messages";
import {
  agentEngineTurnRequestSchema,
  agentEngineTurnResultSchema,
  type AgentEngineFailureClassification,
  type AgentEngineTurnRequest,
  type AgentEngineTurnResult,
  type EngineProviderMetadata,
  engineToolExecutionObservationSchema,
  type EngineToolExecutionObservation,
  engineToolExecutionRequestSchema,
  engineToolExecutionResultSchema,
  engineToolRequestSchema,
  type EngineToolRequest,
  type EngineToolExecutionResult,
  type ModelRuntimeContext,
  type ResolvedSecretBinding
} from "@entangle/types";
import type { AgentEngineToolExecutor } from "./tool-executor.js";
export type { AgentEngineToolExecutor } from "./tool-executor.js";

const maxRenderedArtifactInputs = 8;
const maxRenderedMemoryFiles = 8;
const maxRenderedFileCharacters = 12_000;
const providerTimeoutMs = 120_000;
type AnthropicMessageParamContentBlock = Exclude<
  MessageParam["content"],
  string
>[number];

type ExecutedAnthropicToolRound = {
  toolExecutions: EngineToolExecutionObservation[];
  toolRequests: EngineToolRequest[];
  toolResults: ToolResultBlockParam[];
};

type OpenAICompatibleChatMessage =
  | {
      content: string;
      role: "system" | "user";
    }
  | {
      content?: string | null;
      role: "assistant";
      tool_calls?: OpenAICompatibleToolCall[];
    }
  | {
      content: string;
      role: "tool";
      tool_call_id: string;
    };

type OpenAICompatibleToolDefinition = {
  function: {
    description: string;
    name: string;
    parameters: Record<string, unknown>;
    strict?: boolean;
  };
  type: "function";
};

type OpenAICompatibleToolChoice =
  | "auto"
  | {
      function: {
        name: string;
      };
      type: "function";
    };

type OpenAICompatibleChatCompletionRequest = {
  max_tokens: number;
  messages: OpenAICompatibleChatMessage[];
  model: string;
  tool_choice?: OpenAICompatibleToolChoice;
  tools?: OpenAICompatibleToolDefinition[];
};

type OpenAICompatibleToolCall = {
  function: {
    arguments: string;
    name: string;
  };
  id: string;
  type: "function";
};

type OpenAICompatibleChatCompletionResponse = {
  choices: Array<{
    finish_reason?: string | null;
    message: {
      content?: string | null;
      tool_calls?: OpenAICompatibleToolCall[];
    };
  }>;
  model?: string;
  usage?: {
    completion_tokens?: number;
    prompt_tokens?: number;
  };
};

type ExecutedOpenAICompatibleToolRound = {
  messages: OpenAICompatibleChatMessage[];
  toolExecutions: EngineToolExecutionObservation[];
  toolRequests: EngineToolRequest[];
};

export interface AgentEngine {
  executeTurn(
    request: AgentEngineTurnRequest,
    options?: AgentEngineTurnOptions
  ): Promise<AgentEngineTurnResult>;
}

export interface AgentEngineTurnOptions {
  abortSignal?: AbortSignal;
}

type AnthropicClientLike = {
  messages: {
    create(request: MessageCreateParamsNonStreaming): Promise<Message>;
  };
};

type AnthropicRequestBody = Omit<MessageCreateParamsNonStreaming, "model">;

type AnthropicClientFactory = (input: {
  apiKey?: string;
  authToken?: string;
  baseURL: string;
}) => AnthropicClientLike;

type OpenAICompatibleClientLike = {
  createChatCompletion(
    request: OpenAICompatibleChatCompletionRequest
  ): Promise<OpenAICompatibleChatCompletionResponse>;
};

type OpenAICompatibleClientFactory = (input: {
  apiKey: string;
  baseURL: string;
}) => OpenAICompatibleClientLike;

export class AgentEngineConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentEngineConfigurationError";
  }
}

export class AgentEngineExecutionError extends Error {
  readonly classification: AgentEngineFailureClassification;

  constructor(
    message: string,
    input: {
      classification: AgentEngineFailureClassification;
      cause?: unknown;
    }
  ) {
    super(message, input.cause ? { cause: input.cause } : undefined);
    this.name = "AgentEngineExecutionError";
    this.classification = input.classification;
  }
}

function throwIfAgentEngineAborted(input: {
  nodeId: string;
  signal?: AbortSignal;
}): void {
  if (!input.signal?.aborted) {
    return;
  }

  throw new AgentEngineExecutionError(
    `Agent engine turn for node '${input.nodeId}' was cancelled.`,
    {
      classification: "cancelled"
    }
  );
}

function createAnthropicClient(input: {
  apiKey?: string;
  authToken?: string;
  baseURL: string;
}): AnthropicClientLike {
  return new Anthropic({
    apiKey: input.apiKey,
    authToken: input.authToken,
    baseURL: input.baseURL,
    maxRetries: 0,
    timeout: providerTimeoutMs
  });
}

class OpenAICompatibleProviderError extends Error {
  readonly body: unknown;
  readonly status: number;

  constructor(input: {
    body: unknown;
    message: string;
    status: number;
  }) {
    super(input.message);
    this.name = "OpenAICompatibleProviderError";
    this.body = input.body;
    this.status = input.status;
  }
}

function buildOpenAICompatibleChatCompletionUrl(baseURL: string): string {
  const trimmedBaseURL = baseURL.replace(/\/+$/, "");

  return trimmedBaseURL.endsWith("/chat/completions")
    ? trimmedBaseURL
    : `${trimmedBaseURL}/chat/completions`;
}

function parseJsonResponseBody(rawBody: string): unknown {
  if (rawBody.trim().length === 0) {
    return null;
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return rawBody;
  }
}

function createOpenAICompatibleClient(input: {
  apiKey: string;
  baseURL: string;
}): OpenAICompatibleClientLike {
  const endpointUrl = buildOpenAICompatibleChatCompletionUrl(input.baseURL);

  return {
    async createChatCompletion(request) {
      const response = await fetch(endpointUrl, {
        body: JSON.stringify(request),
        headers: {
          authorization: `Bearer ${input.apiKey}`,
          "content-type": "application/json"
        },
        method: "POST",
        signal: AbortSignal.timeout(providerTimeoutMs)
      });
      const responseBodyText = await response.text();
      const responseBody = parseJsonResponseBody(responseBodyText);

      if (!response.ok) {
        throw new OpenAICompatibleProviderError({
          body: responseBody,
          message:
            typeof responseBody === "string"
              ? responseBody
              : JSON.stringify(responseBody),
          status: response.status
        });
      }

      if (!isPlainObjectRecord(responseBody)) {
        throw new OpenAICompatibleProviderError({
          body: responseBody,
          message: "OpenAI-compatible provider returned a non-object response.",
          status: response.status
        });
      }

      return responseBody as OpenAICompatibleChatCompletionResponse;
    }
  };
}

async function readDeliveredSecretValue(
  binding: ResolvedSecretBinding | undefined,
  label: string
): Promise<string> {
  if (!binding) {
    throw new AgentEngineConfigurationError(
      `Cannot execute ${label}: runtime context does not include a resolved secret binding.`
    );
  }

  if (binding.status !== "available" || !binding.delivery) {
    throw new AgentEngineConfigurationError(
      `Cannot execute ${label}: secret '${binding.secretRef}' is not available.`
    );
  }

  let secretValue: string | undefined;

  if (binding.delivery.mode === "env_var") {
    secretValue = process.env[binding.delivery.envVar]?.trim();
  } else if (binding.delivery.mode === "mounted_file") {
    secretValue = (await readFile(binding.delivery.filePath, "utf8")).trim();
  }

  if (!secretValue) {
    throw new AgentEngineConfigurationError(
      `Cannot execute ${label}: resolved secret '${binding.secretRef}' is empty.`
    );
  }

  return secretValue;
}

async function readTextFilePreview(
  filePath: string,
  maxCharacters = maxRenderedFileCharacters
): Promise<string | undefined> {
  const fileStat = await stat(filePath);

  if (!fileStat.isFile()) {
    return undefined;
  }

  const content = await readFile(filePath, "utf8");
  const trimmedContent = content.trim();

  if (trimmedContent.length === 0) {
    return "[Empty file]";
  }

  if (trimmedContent.length <= maxCharacters) {
    return trimmedContent;
  }

  return (
    `${trimmedContent.slice(0, maxCharacters)}\n\n` +
    `[Truncated ${trimmedContent.length - maxCharacters} additional characters.]`
  );
}

function buildArtifactRefSummary(request: AgentEngineTurnRequest): string | undefined {
  if (request.artifactRefs.length === 0) {
    return undefined;
  }

  return [
    "Artifact references:",
    ...request.artifactRefs.map((artifactRef) => {
      const locatorSummary =
        artifactRef.backend === "git"
          ? `${artifactRef.locator.namespace}/${artifactRef.locator.repositoryName}:${artifactRef.locator.path}@${artifactRef.locator.commit}`
          : "unsupported-backend";
      return (
        `- ${artifactRef.artifactId} (${artifactRef.artifactKind}, ${artifactRef.status}) ` +
        `from ${artifactRef.createdByNodeId ?? "unknown-node"} -> ${locatorSummary}`
      );
    })
  ].join("\n");
}

async function buildArtifactInputSection(
  request: AgentEngineTurnRequest
): Promise<string | undefined> {
  const sections = await Promise.all(
    request.artifactInputs
      .slice(0, maxRenderedArtifactInputs)
      .map(async (artifactInput) => {
        const preview = await readTextFilePreview(artifactInput.localPath);

        return [
          `Artifact input: ${artifactInput.artifactId}`,
          `Local path: ${artifactInput.localPath}`,
          ...(artifactInput.repoPath ? [`Repository path: ${artifactInput.repoPath}`] : []),
          `Source backend: ${artifactInput.backend}`,
          `Source status: ${artifactInput.sourceRef.status}`,
          "",
          preview ?? "[Non-file artifact input omitted from inline prompt assembly.]"
        ].join("\n");
      })
  );

  if (sections.length === 0) {
    return undefined;
  }

  return sections.join("\n\n---\n\n");
}

async function buildMemorySection(
  request: AgentEngineTurnRequest
): Promise<string | undefined> {
  const sections: string[] = [];

  for (const memoryRef of request.memoryRefs) {
    if (sections.length >= maxRenderedMemoryFiles) {
      break;
    }

    const preview = await readTextFilePreview(memoryRef);

    if (!preview) {
      continue;
    }

    sections.push(
      [`Memory reference: ${path.basename(memoryRef)}`, `Path: ${memoryRef}`, "", preview].join(
        "\n"
      )
    );
  }

  if (sections.length === 0) {
    return undefined;
  }

  return sections.join("\n\n---\n\n");
}

function mapToolDefinitionsToAnthropicTools(
  request: AgentEngineTurnRequest
): Tool[] | undefined {
  if (request.toolDefinitions.length === 0) {
    return undefined;
  }

  return request.toolDefinitions.map((toolDefinition) => {
    if (typeof toolDefinition.inputSchema.type !== "string") {
      throw new AgentEngineConfigurationError(
        `Tool '${toolDefinition.id}' must declare an inputSchema with a top-level string 'type' property to be sent to Anthropic.`
      );
    }

    return {
      description: toolDefinition.description,
      input_schema: toolDefinition.inputSchema as Tool["input_schema"],
      name: toolDefinition.id,
      ...(toolDefinition.strict ? { strict: true } : {})
    };
  });
}

function mapToolChoice(
  request: AgentEngineTurnRequest
): MessageCreateParamsNonStreaming["tool_choice"] | undefined {
  const toolChoice = request.toolChoice;

  if (!toolChoice) {
    return undefined;
  }

  if (toolChoice.type === "auto") {
    return {
      type: "auto"
    };
  }

  const matchedToolDefinition = request.toolDefinitions.find(
    (toolDefinition) => toolDefinition.id === toolChoice.toolId
  );

  if (!matchedToolDefinition) {
    throw new AgentEngineConfigurationError(
      `Requested tool_choice '${toolChoice.toolId}' is not declared for this turn.`
    );
  }

  return {
    type: "tool",
    name: matchedToolDefinition.id
  };
}

async function buildInitialAnthropicUserMessage(
  request: AgentEngineTurnRequest
): Promise<MessageParam> {
  const artifactRefSummary = buildArtifactRefSummary(request);
  const artifactInputSection = await buildArtifactInputSection(request);
  const memorySection = await buildMemorySection(request);
  const interactionSections = [
    request.interactionPromptParts.join("\n\n"),
    artifactRefSummary,
    artifactInputSection,
    memorySection
  ].filter((value): value is string => Boolean(value));

  return {
    role: "user",
    content: interactionSections.join("\n\n")
  };
}

async function buildAnthropicRequest(
  request: AgentEngineTurnRequest,
  input: {
    messages?: MessageParam[];
  } = {}
): Promise<AnthropicRequestBody> {
  const messages =
    input.messages ?? [await buildInitialAnthropicUserMessage(request)];
  const tools = mapToolDefinitionsToAnthropicTools(request);
  const toolChoice = mapToolChoice(request);

  return {
    max_tokens: request.executionLimits.maxOutputTokens,
    system: request.systemPromptParts.join("\n\n"),
    messages,
    ...(tools ? { tools } : {}),
    ...(toolChoice ? { tool_choice: toolChoice } : {})
  };
}

function mapToolDefinitionsToOpenAICompatibleTools(
  request: AgentEngineTurnRequest
): OpenAICompatibleToolDefinition[] | undefined {
  if (request.toolDefinitions.length === 0) {
    return undefined;
  }

  return request.toolDefinitions.map((toolDefinition) => {
    if (typeof toolDefinition.inputSchema.type !== "string") {
      throw new AgentEngineConfigurationError(
        `Tool '${toolDefinition.id}' must declare an inputSchema with a top-level string 'type' property to be sent to OpenAI-compatible providers.`
      );
    }

    return {
      function: {
        description: toolDefinition.description,
        name: toolDefinition.id,
        parameters: toolDefinition.inputSchema,
        ...(toolDefinition.strict ? { strict: true } : {})
      },
      type: "function"
    };
  });
}

function mapOpenAICompatibleToolChoice(
  request: AgentEngineTurnRequest
): OpenAICompatibleToolChoice | undefined {
  const toolChoice = request.toolChoice;

  if (!toolChoice) {
    return undefined;
  }

  if (toolChoice.type === "auto") {
    return "auto";
  }

  const matchedToolDefinition = request.toolDefinitions.find(
    (toolDefinition) => toolDefinition.id === toolChoice.toolId
  );

  if (!matchedToolDefinition) {
    throw new AgentEngineConfigurationError(
      `Requested tool_choice '${toolChoice.toolId}' is not declared for this turn.`
    );
  }

  return {
    function: {
      name: matchedToolDefinition.id
    },
    type: "function"
  };
}

async function buildInitialOpenAICompatibleMessages(
  request: AgentEngineTurnRequest
): Promise<OpenAICompatibleChatMessage[]> {
  const artifactRefSummary = buildArtifactRefSummary(request);
  const artifactInputSection = await buildArtifactInputSection(request);
  const memorySection = await buildMemorySection(request);
  const interactionSections = [
    request.interactionPromptParts.join("\n\n"),
    artifactRefSummary,
    artifactInputSection,
    memorySection
  ].filter((value): value is string => Boolean(value));

  return [
    {
      content: request.systemPromptParts.join("\n\n"),
      role: "system"
    },
    {
      content: interactionSections.join("\n\n"),
      role: "user"
    }
  ];
}

async function buildOpenAICompatibleRequest(
  request: AgentEngineTurnRequest,
  input: {
    messages?: OpenAICompatibleChatMessage[];
  } = {}
): Promise<Omit<OpenAICompatibleChatCompletionRequest, "model">> {
  const messages =
    input.messages ?? (await buildInitialOpenAICompatibleMessages(request));
  const tools = mapToolDefinitionsToOpenAICompatibleTools(request);
  const toolChoice = mapOpenAICompatibleToolChoice(request);

  return {
    max_tokens: request.executionLimits.maxOutputTokens,
    messages,
    ...(tools ? { tools } : {}),
    ...(toolChoice ? { tool_choice: toolChoice } : {})
  };
}

function accumulateUsage(
  currentUsage: AgentEngineTurnResult["usage"],
  response: Message
): AgentEngineTurnResult["usage"] {
  const responseUsage = response.usage
    ? {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens
      }
    : undefined;

  if (!responseUsage) {
    return currentUsage;
  }

  if (!currentUsage) {
    return responseUsage;
  }

  return {
    inputTokens: currentUsage.inputTokens + responseUsage.inputTokens,
    outputTokens: currentUsage.outputTokens + responseUsage.outputTokens
  };
}

function accumulateOpenAICompatibleUsage(
  currentUsage: AgentEngineTurnResult["usage"],
  response: OpenAICompatibleChatCompletionResponse
): AgentEngineTurnResult["usage"] {
  const promptTokens = response.usage?.prompt_tokens;
  const completionTokens = response.usage?.completion_tokens;

  if (promptTokens === undefined && completionTokens === undefined) {
    return currentUsage;
  }

  const responseUsage = {
    inputTokens: promptTokens ?? 0,
    outputTokens: completionTokens ?? 0
  };

  if (!currentUsage) {
    return responseUsage;
  }

  return {
    inputTokens: currentUsage.inputTokens + responseUsage.inputTokens,
    outputTokens: currentUsage.outputTokens + responseUsage.outputTokens
  };
}

function mapAssistantContentBlockForContinuation(
  block: Message["content"][number]
): AnthropicMessageParamContentBlock {
  switch (block.type) {
    case "text":
      return {
        text: block.text,
        type: "text"
      };
    case "tool_use":
      return {
        id: block.id,
        input: block.input,
        name: block.name,
        type: "tool_use"
      };
    default:
      throw new AgentEngineExecutionError(
        `Anthropic returned an unsupported assistant content block type '${block.type}' during tool-loop continuation.`,
        {
          classification: "tool_protocol_error"
        }
      );
  }
}

function buildAssistantContinuationMessage(response: Message): MessageParam {
  return {
    role: "assistant",
    content: response.content.map(mapAssistantContentBlockForContinuation)
  };
}

function extractToolUses(response: Message): ToolUseBlock[] {
  return response.content.filter(
    (block): block is ToolUseBlock => block.type === "tool_use"
  );
}

function renderToolExecutionContent(
  content: EngineToolExecutionResult["content"]
): string {
  return typeof content === "string" ? content : JSON.stringify(content, null, 2);
}

function buildToolProtocolErrorResult(
  toolUseId: string,
  message: string
): ToolResultBlockParam {
  return {
    tool_use_id: toolUseId,
    type: "tool_result",
    content: message,
    is_error: true
  };
}

function isPlainObjectRecord(
  input: unknown
): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function buildToolExecutionObservation(
  input: Omit<EngineToolExecutionObservation, "sequence" | "toolCallId" | "toolId"> & {
    sequence: number;
    toolCallId: string;
    toolId: string;
  }
): EngineToolExecutionObservation {
  return engineToolExecutionObservationSchema.parse({
    ...(input.errorCode ? { errorCode: input.errorCode } : {}),
    ...(input.message ? { message: input.message } : {}),
    outcome: input.outcome,
    sequence: input.sequence,
    toolCallId: input.toolCallId,
    toolId: input.toolId
  });
}

async function executeAnthropicToolRound(input: {
  request: AgentEngineTurnRequest;
  response: Message;
  startingSequence: number;
  toolExecutor: AgentEngineToolExecutor;
}): Promise<ExecutedAnthropicToolRound> {
  const toolUses = extractToolUses(input.response);

  if (toolUses.length === 0) {
    throw new AgentEngineExecutionError(
      "Anthropic returned stop_reason=tool_use without any tool_use content blocks.",
      {
        classification: "tool_protocol_error"
      }
    );
  }

  const roundEntries = await Promise.all(
    toolUses.map(async (toolUse, index) => {
      const toolRequest = engineToolRequestSchema.parse({
        input: isPlainObjectRecord(toolUse.input) ? toolUse.input : {},
        toolId: toolUse.name
      });
      const sequence = input.startingSequence + index + 1;
      const toolDefinition = input.request.toolDefinitions.find(
        (candidate) => candidate.id === toolUse.name
      );

      if (!toolDefinition) {
        return {
          toolExecution: buildToolExecutionObservation({
            errorCode: "tool_not_declared",
            message: `Tool '${toolUse.name}' was not declared for this turn.`,
            outcome: "error",
            sequence,
            toolCallId: toolUse.id,
            toolId: toolUse.name
          }),
          toolRequest,
          toolResult: buildToolProtocolErrorResult(
            toolUse.id,
            `Tool '${toolUse.name}' was not declared for this turn.`
          )
        };
      }

      if (!isPlainObjectRecord(toolUse.input)) {
        return {
          toolExecution: buildToolExecutionObservation({
            errorCode: "invalid_input",
            message: `Tool '${toolUse.name}' produced a non-object input payload.`,
            outcome: "error",
            sequence,
            toolCallId: toolUse.id,
            toolId: toolUse.name
          }),
          toolRequest,
          toolResult: buildToolProtocolErrorResult(
            toolUse.id,
            `Tool '${toolUse.name}' produced a non-object input payload.`
          )
        };
      }

      try {
        const executionRequest = engineToolExecutionRequestSchema.parse({
          artifactInputs: input.request.artifactInputs,
          input: toolUse.input,
          memoryRefs: input.request.memoryRefs,
          nodeId: input.request.nodeId,
          sessionId: input.request.sessionId,
          tool: toolDefinition,
          toolCallId: toolUse.id
        });
        const executionResult = engineToolExecutionResultSchema.parse(
          await input.toolExecutor.executeToolCall(executionRequest)
        );

        return {
          toolExecution: buildToolExecutionObservation({
            ...(executionResult.isError ? { errorCode: "tool_result_error" } : {}),
            ...(executionResult.isError
              ? { message: `Tool '${toolUse.name}' returned an error result.` }
              : {}),
            outcome: executionResult.isError ? "error" : "success",
            sequence,
            toolCallId: toolUse.id,
            toolId: toolUse.name
          }),
          toolRequest,
          toolResult: {
            tool_use_id: toolUse.id,
            type: "tool_result",
            content: renderToolExecutionContent(executionResult.content),
            ...(executionResult.isError ? { is_error: true } : {})
          } satisfies ToolResultBlockParam
        };
      } catch {
        return {
          toolExecution: buildToolExecutionObservation({
            errorCode: "tool_execution_failed",
            message: `Tool '${toolUse.name}' failed during execution.`,
            outcome: "error",
            sequence,
            toolCallId: toolUse.id,
            toolId: toolUse.name
          }),
          toolRequest,
          toolResult: buildToolProtocolErrorResult(
            toolUse.id,
            `Tool '${toolUse.name}' failed during execution.`
          )
        };
      }
    })
  );

  return {
    toolExecutions: roundEntries.map((entry) => entry.toolExecution),
    toolRequests: roundEntries.map((entry) => entry.toolRequest),
    toolResults: roundEntries.map((entry) => entry.toolResult)
  };
}

function getOpenAICompatibleChoice(
  response: OpenAICompatibleChatCompletionResponse
): OpenAICompatibleChatCompletionResponse["choices"][number] {
  const choice = response.choices[0];

  if (!choice) {
    throw new AgentEngineExecutionError(
      "OpenAI-compatible provider returned no choices.",
      {
        classification: "provider_unavailable"
      }
    );
  }

  return choice;
}

function extractOpenAICompatibleToolCalls(
  response: OpenAICompatibleChatCompletionResponse
): OpenAICompatibleToolCall[] {
  return getOpenAICompatibleChoice(response).message.tool_calls ?? [];
}

function parseOpenAICompatibleToolArguments(rawArguments: string): {
  input: Record<string, unknown>;
  ok: boolean;
} {
  try {
    const parsed = JSON.parse(rawArguments) as unknown;

    if (isPlainObjectRecord(parsed)) {
      return {
        input: parsed,
        ok: true
      };
    }
  } catch {
    // The caller records the invalid input as a bounded tool protocol result.
  }

  return {
    input: {},
    ok: false
  };
}

function buildOpenAICompatibleAssistantContinuationMessage(
  response: OpenAICompatibleChatCompletionResponse
): OpenAICompatibleChatMessage {
  const message = getOpenAICompatibleChoice(response).message;

  return {
    ...(message.content ? { content: message.content } : { content: null }),
    role: "assistant",
    ...(message.tool_calls && message.tool_calls.length > 0
      ? { tool_calls: message.tool_calls }
      : {})
  };
}

function buildOpenAICompatibleToolResultMessage(input: {
  content: string;
  toolCallId: string;
}): OpenAICompatibleChatMessage {
  return {
    content: input.content,
    role: "tool",
    tool_call_id: input.toolCallId
  };
}

async function executeOpenAICompatibleToolRound(input: {
  request: AgentEngineTurnRequest;
  response: OpenAICompatibleChatCompletionResponse;
  startingSequence: number;
  toolExecutor: AgentEngineToolExecutor;
}): Promise<ExecutedOpenAICompatibleToolRound> {
  const toolCalls = extractOpenAICompatibleToolCalls(input.response);

  if (toolCalls.length === 0) {
    throw new AgentEngineExecutionError(
      "OpenAI-compatible provider returned finish_reason=tool_calls without tool_calls.",
      {
        classification: "tool_protocol_error"
      }
    );
  }

  const roundEntries = await Promise.all(
    toolCalls.map(async (toolCall, index) => {
      const parsedArguments = parseOpenAICompatibleToolArguments(
        toolCall.function.arguments
      );
      const toolRequest = engineToolRequestSchema.parse({
        input: parsedArguments.input,
        toolId: toolCall.function.name
      });
      const sequence = input.startingSequence + index + 1;
      const toolDefinition = input.request.toolDefinitions.find(
        (candidate) => candidate.id === toolCall.function.name
      );

      if (!toolDefinition) {
        return {
          toolExecution: buildToolExecutionObservation({
            errorCode: "tool_not_declared",
            message: `Tool '${toolCall.function.name}' was not declared for this turn.`,
            outcome: "error",
            sequence,
            toolCallId: toolCall.id,
            toolId: toolCall.function.name
          }),
          toolRequest,
          toolResult: buildOpenAICompatibleToolResultMessage({
            content: `Tool '${toolCall.function.name}' was not declared for this turn.`,
            toolCallId: toolCall.id
          })
        };
      }

      if (!parsedArguments.ok) {
        return {
          toolExecution: buildToolExecutionObservation({
            errorCode: "invalid_input",
            message: `Tool '${toolCall.function.name}' produced invalid JSON object arguments.`,
            outcome: "error",
            sequence,
            toolCallId: toolCall.id,
            toolId: toolCall.function.name
          }),
          toolRequest,
          toolResult: buildOpenAICompatibleToolResultMessage({
            content: `Tool '${toolCall.function.name}' produced invalid JSON object arguments.`,
            toolCallId: toolCall.id
          })
        };
      }

      try {
        const executionRequest = engineToolExecutionRequestSchema.parse({
          artifactInputs: input.request.artifactInputs,
          input: parsedArguments.input,
          memoryRefs: input.request.memoryRefs,
          nodeId: input.request.nodeId,
          sessionId: input.request.sessionId,
          tool: toolDefinition,
          toolCallId: toolCall.id
        });
        const executionResult = engineToolExecutionResultSchema.parse(
          await input.toolExecutor.executeToolCall(executionRequest)
        );

        return {
          toolExecution: buildToolExecutionObservation({
            ...(executionResult.isError ? { errorCode: "tool_result_error" } : {}),
            ...(executionResult.isError
              ? {
                  message: `Tool '${toolCall.function.name}' returned an error result.`
                }
              : {}),
            outcome: executionResult.isError ? "error" : "success",
            sequence,
            toolCallId: toolCall.id,
            toolId: toolCall.function.name
          }),
          toolRequest,
          toolResult: buildOpenAICompatibleToolResultMessage({
            content: renderToolExecutionContent(executionResult.content),
            toolCallId: toolCall.id
          })
        };
      } catch {
        return {
          toolExecution: buildToolExecutionObservation({
            errorCode: "tool_execution_failed",
            message: `Tool '${toolCall.function.name}' failed during execution.`,
            outcome: "error",
            sequence,
            toolCallId: toolCall.id,
            toolId: toolCall.function.name
          }),
          toolRequest,
          toolResult: buildOpenAICompatibleToolResultMessage({
            content: `Tool '${toolCall.function.name}' failed during execution.`,
            toolCallId: toolCall.id
          })
        };
      }
    })
  );

  return {
    messages: roundEntries.map((entry) => entry.toolResult),
    toolExecutions: roundEntries.map((entry) => entry.toolExecution),
    toolRequests: roundEntries.map((entry) => entry.toolRequest)
  };
}

function classifyAnthropicError(
  error: unknown
): AgentEngineFailureClassification {
  if (error instanceof AuthenticationError) {
    return "auth_error";
  }

  if (error instanceof PermissionDeniedError) {
    return /quota|credit|billing|spend/i.test(error.message)
      ? "quota_error"
      : "auth_error";
  }

  if (error instanceof RateLimitError) {
    return "rate_limit";
  }

  if (error instanceof BadRequestError || error instanceof UnprocessableEntityError) {
    if (/context|token|too long|max_tokens/i.test(error.message)) {
      return "context_limit_error";
    }

    if (/tool/i.test(error.message)) {
      return "tool_protocol_error";
    }

    return "bad_request";
  }

  if (
    error instanceof APIConnectionError ||
    error instanceof APIConnectionTimeoutError ||
    error instanceof InternalServerError
  ) {
    return "provider_unavailable";
  }

  return "unknown_provider_error";
}

function classifyOpenAICompatibleError(
  error: unknown
): AgentEngineFailureClassification {
  if (error instanceof OpenAICompatibleProviderError) {
    if (error.status === 401 || error.status === 403) {
      return /quota|credit|billing|spend/i.test(error.message)
        ? "quota_error"
        : "auth_error";
    }

    if (error.status === 429) {
      return /quota|credit|billing|spend/i.test(error.message)
        ? "quota_error"
        : "rate_limit";
    }

    if (error.status === 400 || error.status === 422) {
      if (/context|token|too long|max_tokens/i.test(error.message)) {
        return "context_limit_error";
      }

      if (/tool|function/i.test(error.message)) {
        return "tool_protocol_error";
      }

      return "bad_request";
    }

    if (error.status >= 500) {
      return "provider_unavailable";
    }
  }

  if (error instanceof TypeError || error instanceof DOMException) {
    return "provider_unavailable";
  }

  return "unknown_provider_error";
}

function mapStopReason(message: Message): AgentEngineTurnResult["stopReason"] {
  switch (message.stop_reason) {
    case "end_turn":
    case "stop_sequence":
      return "completed";
    case "max_tokens":
      return "max_turns_reached";
    case "tool_use":
      return "tool_call_requested";
    case "pause_turn":
    case "refusal":
    case null:
      return "completed";
    default:
      return "error";
  }
}

function mapOpenAICompatibleStopReason(
  response: OpenAICompatibleChatCompletionResponse
): AgentEngineTurnResult["stopReason"] {
  switch (getOpenAICompatibleChoice(response).finish_reason) {
    case "length":
      return "max_turns_reached";
    case "tool_calls":
    case "function_call":
      return "tool_call_requested";
    case "stop":
    case "content_filter":
    case null:
    case undefined:
      return "completed";
    default:
      return "completed";
  }
}

function resolveProviderStopReason(message: Message): string | undefined {
  return message.stop_reason ?? undefined;
}

function resolveOpenAICompatibleProviderStopReason(
  response: OpenAICompatibleChatCompletionResponse
): string | undefined {
  return getOpenAICompatibleChoice(response).finish_reason ?? undefined;
}

function extractAssistantMessages(message: Message): string[] {
  return message.content.flatMap((block) =>
    block.type === "text" && block.text.trim().length > 0 ? [block.text] : []
  );
}

function extractOpenAICompatibleAssistantMessages(
  response: OpenAICompatibleChatCompletionResponse
): string[] {
  const content = getOpenAICompatibleChoice(response).message.content?.trim();

  return content ? [content] : [];
}

function resolveAnthropicCredentialShape(input: {
  profile: NonNullable<ModelRuntimeContext["modelEndpointProfile"]>;
  secretValue: string;
}): { apiKey?: string; authToken?: string } {
  return input.profile.authMode === "api_key_bearer"
    ? { authToken: input.secretValue }
    : { apiKey: input.secretValue };
}

function validateOpenAICompatibleCredentialShape(input: {
  profile: NonNullable<ModelRuntimeContext["modelEndpointProfile"]>;
  secretValue: string;
}): string {
  if (input.profile.authMode !== "api_key_bearer") {
    throw new AgentEngineConfigurationError(
      "OpenAI-compatible model execution currently requires authMode 'api_key_bearer'."
    );
  }

  return input.secretValue;
}

function resolveConfiguredModelId(
  modelContext: ModelRuntimeContext
): string {
  const configuredModelId = modelContext.modelEndpointProfile?.defaultModel?.trim();

  if (!configuredModelId) {
    throw new AgentEngineConfigurationError(
      "Cannot create the anthropic engine: the model endpoint profile has no defaultModel."
    );
  }

  return configuredModelId;
}

function buildProviderMetadata(input: {
  modelContext: ModelRuntimeContext;
  modelId?: string;
}): EngineProviderMetadata | undefined {
  const profile = input.modelContext.modelEndpointProfile;

  if (!profile) {
    return undefined;
  }

  return {
    adapterKind: profile.adapterKind,
    ...(input.modelId || profile.defaultModel
      ? { modelId: input.modelId ?? profile.defaultModel }
      : {}),
    profileId: profile.id
  };
}

export function createAnthropicAgentEngine(input: {
  clientFactory?: AnthropicClientFactory;
  modelContext: ModelRuntimeContext;
  toolExecutor?: AgentEngineToolExecutor;
}): AgentEngine {
  const profile = input.modelContext.modelEndpointProfile;

  if (!profile) {
    throw new AgentEngineConfigurationError(
      "Cannot create the anthropic engine without an effective model endpoint profile."
    );
  }

  const modelId = resolveConfiguredModelId(input.modelContext);
  const clientFactory = input.clientFactory ?? createAnthropicClient;
  let clientPromise: Promise<AnthropicClientLike> | undefined;

  return {
    async executeTurn(request, options): Promise<AgentEngineTurnResult> {
      if (!clientPromise) {
        clientPromise = readDeliveredSecretValue(
          input.modelContext.auth,
          "anthropic model execution"
        ).then((secretValue) =>
          clientFactory({
            ...resolveAnthropicCredentialShape({
              profile,
              secretValue
            }),
            baseURL: profile.baseUrl
          })
        );
      }

      const client = await clientPromise;
      const normalizedRequest = agentEngineTurnRequestSchema.parse(request);
      const aggregatedToolExecutions: AgentEngineTurnResult["toolExecutions"] = [];
      const aggregatedToolRequests: AgentEngineTurnResult["toolRequests"] = [];
      let messages: MessageParam[] | undefined;
      let aggregatedUsage: AgentEngineTurnResult["usage"];
      let toolLoopCount = 0;

      try {
        while (true) {
          throwIfAgentEngineAborted({
            nodeId: normalizedRequest.nodeId,
            ...(options?.abortSignal ? { signal: options.abortSignal } : {})
          });

          const response = await client.messages.create({
            ...(await buildAnthropicRequest(normalizedRequest, {
              ...(messages ? { messages } : {})
            })),
            model: modelId
          });
          aggregatedUsage = accumulateUsage(aggregatedUsage, response);

          if (response.stop_reason !== "tool_use") {
            const providerMetadata = buildProviderMetadata({
              modelContext: input.modelContext,
              modelId: response.model
            });

            return agentEngineTurnResultSchema.parse({
              assistantMessages: extractAssistantMessages(response),
              ...(providerMetadata ? { providerMetadata } : {}),
              ...(resolveProviderStopReason(response)
                ? { providerStopReason: resolveProviderStopReason(response) }
                : {}),
              toolExecutions: aggregatedToolExecutions,
              toolRequests: aggregatedToolRequests,
              stopReason: mapStopReason(response),
              usage: aggregatedUsage
            });
          }

          if (!input.toolExecutor) {
            throw new AgentEngineExecutionError(
              "Anthropic requested tool use without a configured Entangle tool executor.",
              {
                classification: "tool_protocol_error"
              }
            );
          }

          if (toolLoopCount >= normalizedRequest.executionLimits.maxToolTurns) {
            throw new AgentEngineExecutionError(
              `Anthropic requested more than ${normalizedRequest.executionLimits.maxToolTurns} tool rounds for node '${normalizedRequest.nodeId}'.`,
              {
                classification: "tool_protocol_error"
              }
            );
          }

          const toolRound = await executeAnthropicToolRound({
            request: normalizedRequest,
            response,
            startingSequence: aggregatedToolExecutions.length,
            toolExecutor: input.toolExecutor
          });
          aggregatedToolExecutions.push(...toolRound.toolExecutions);
          aggregatedToolRequests.push(...toolRound.toolRequests);

          messages = [
            ...(messages ?? [
              await buildInitialAnthropicUserMessage(normalizedRequest)
            ]),
            buildAssistantContinuationMessage(response),
            {
              role: "user",
              content: toolRound.toolResults
            }
          ];
          toolLoopCount += 1;
        }
      } catch (error) {
        if (error instanceof AgentEngineConfigurationError) {
          throw error;
        }

        if (error instanceof AgentEngineExecutionError) {
          throw error;
        }

        throw new AgentEngineExecutionError(
          `Anthropic engine execution failed for node '${normalizedRequest.nodeId}'.`,
          {
            classification: classifyAnthropicError(error),
            cause: error
          }
        );
      }
    }
  };
}

export function createOpenAICompatibleAgentEngine(input: {
  clientFactory?: OpenAICompatibleClientFactory;
  modelContext: ModelRuntimeContext;
  toolExecutor?: AgentEngineToolExecutor;
}): AgentEngine {
  const profile = input.modelContext.modelEndpointProfile;

  if (!profile) {
    throw new AgentEngineConfigurationError(
      "Cannot create the OpenAI-compatible engine without an effective model endpoint profile."
    );
  }

  const modelId = resolveConfiguredModelId(input.modelContext);
  const clientFactory = input.clientFactory ?? createOpenAICompatibleClient;
  let clientPromise: Promise<OpenAICompatibleClientLike> | undefined;

  return {
    async executeTurn(request, options): Promise<AgentEngineTurnResult> {
      if (!clientPromise) {
        clientPromise = readDeliveredSecretValue(
          input.modelContext.auth,
          "OpenAI-compatible model execution"
        ).then((secretValue) =>
          clientFactory({
            apiKey: validateOpenAICompatibleCredentialShape({
              profile,
              secretValue
            }),
            baseURL: profile.baseUrl
          })
        );
      }

      const client = await clientPromise;
      const normalizedRequest = agentEngineTurnRequestSchema.parse(request);
      const aggregatedToolExecutions: AgentEngineTurnResult["toolExecutions"] = [];
      const aggregatedToolRequests: AgentEngineTurnResult["toolRequests"] = [];
      let messages: OpenAICompatibleChatMessage[] | undefined;
      let aggregatedUsage: AgentEngineTurnResult["usage"];
      let toolLoopCount = 0;

      try {
        while (true) {
          throwIfAgentEngineAborted({
            nodeId: normalizedRequest.nodeId,
            ...(options?.abortSignal ? { signal: options.abortSignal } : {})
          });

          const response = await client.createChatCompletion({
            ...(await buildOpenAICompatibleRequest(normalizedRequest, {
              ...(messages ? { messages } : {})
            })),
            model: modelId
          });
          aggregatedUsage = accumulateOpenAICompatibleUsage(
            aggregatedUsage,
            response
          );

          if (getOpenAICompatibleChoice(response).finish_reason !== "tool_calls") {
            const providerMetadata = buildProviderMetadata({
              modelContext: input.modelContext,
              modelId: response.model ?? modelId
            });
            const providerStopReason =
              resolveOpenAICompatibleProviderStopReason(response);

            return agentEngineTurnResultSchema.parse({
              assistantMessages: extractOpenAICompatibleAssistantMessages(response),
              ...(providerMetadata ? { providerMetadata } : {}),
              ...(providerStopReason ? { providerStopReason } : {}),
              toolExecutions: aggregatedToolExecutions,
              toolRequests: aggregatedToolRequests,
              stopReason: mapOpenAICompatibleStopReason(response),
              usage: aggregatedUsage
            });
          }

          if (!input.toolExecutor) {
            throw new AgentEngineExecutionError(
              "OpenAI-compatible provider requested tool use without a configured Entangle tool executor.",
              {
                classification: "tool_protocol_error"
              }
            );
          }

          if (toolLoopCount >= normalizedRequest.executionLimits.maxToolTurns) {
            throw new AgentEngineExecutionError(
              `OpenAI-compatible provider requested more than ${normalizedRequest.executionLimits.maxToolTurns} tool rounds for node '${normalizedRequest.nodeId}'.`,
              {
                classification: "tool_protocol_error"
              }
            );
          }

          const toolRound = await executeOpenAICompatibleToolRound({
            request: normalizedRequest,
            response,
            startingSequence: aggregatedToolExecutions.length,
            toolExecutor: input.toolExecutor
          });
          aggregatedToolExecutions.push(...toolRound.toolExecutions);
          aggregatedToolRequests.push(...toolRound.toolRequests);

          messages = [
            ...(messages ?? [
              ...(await buildInitialOpenAICompatibleMessages(normalizedRequest))
            ]),
            buildOpenAICompatibleAssistantContinuationMessage(response),
            ...toolRound.messages
          ];
          toolLoopCount += 1;
        }
      } catch (error) {
        if (error instanceof AgentEngineConfigurationError) {
          throw error;
        }

        if (error instanceof AgentEngineExecutionError) {
          throw error;
        }

        throw new AgentEngineExecutionError(
          `OpenAI-compatible engine execution failed for node '${normalizedRequest.nodeId}'.`,
          {
            classification: classifyOpenAICompatibleError(error),
            cause: error
          }
        );
      }
    }
  };
}

export function createAgentEngineForModelContext(input: {
  clientFactory?: AnthropicClientFactory;
  modelContext: ModelRuntimeContext;
  openAICompatibleClientFactory?: OpenAICompatibleClientFactory;
  toolExecutor?: AgentEngineToolExecutor;
}): AgentEngine {
  const adapterKind = input.modelContext.modelEndpointProfile?.adapterKind;

  if (!adapterKind) {
    throw new AgentEngineConfigurationError(
      "Cannot create an agent engine without an effective model endpoint profile."
    );
  }

  if (adapterKind === "anthropic") {
    return createAnthropicAgentEngine(input);
  }

  if (adapterKind === "openai_compatible") {
    return createOpenAICompatibleAgentEngine({
      modelContext: input.modelContext,
      ...(input.openAICompatibleClientFactory
        ? { clientFactory: input.openAICompatibleClientFactory }
        : {}),
      ...(input.toolExecutor ? { toolExecutor: input.toolExecutor } : {})
    });
  }

  throw new AgentEngineConfigurationError(
    "Unsupported model endpoint adapter kind."
  );
}

export function createStubAgentEngine(): AgentEngine {
  return {
    executeTurn(
      request: AgentEngineTurnRequest,
      options?: AgentEngineTurnOptions
    ): Promise<AgentEngineTurnResult> {
      throwIfAgentEngineAborted({
        nodeId: request.nodeId,
        ...(options?.abortSignal ? { signal: options.abortSignal } : {})
      });

      return Promise.resolve(
        agentEngineTurnResultSchema.parse({
          assistantMessages: [
            `Stub engine executed for node '${request.nodeId}' with ${request.toolDefinitions.length} tool definitions.`
          ],
          toolExecutions: [],
          toolRequests: [],
          stopReason: "completed",
          usage: {
            inputTokens: 0,
            outputTokens: 0
          }
        })
      );
    }
  };
}
