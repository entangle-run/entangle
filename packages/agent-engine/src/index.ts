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
  MessageCreateParamsNonStreaming
} from "@anthropic-ai/sdk/resources/messages";
import {
  agentEngineTurnResultSchema,
  type AgentEngineTurnRequest,
  type AgentEngineTurnResult,
  type ModelRuntimeContext,
  type ResolvedSecretBinding
} from "@entangle/types";

const maxRenderedArtifactInputs = 8;
const maxRenderedMemoryFiles = 8;
const maxRenderedFileCharacters = 12_000;
const providerTimeoutMs = 120_000;

export type AgentEngineErrorClassification =
  | "auth_error"
  | "quota_error"
  | "rate_limit"
  | "bad_request"
  | "provider_unavailable"
  | "tool_protocol_error"
  | "context_limit_error"
  | "unknown_provider_error";

export interface AgentEngine {
  executeTurn(request: AgentEngineTurnRequest): Promise<AgentEngineTurnResult>;
}

type AnthropicClientLike = {
  messages: {
    create(request: MessageCreateParamsNonStreaming): Promise<Message>;
  };
};

type AnthropicClientFactory = (input: {
  apiKey?: string;
  authToken?: string;
  baseURL: string;
}) => AnthropicClientLike;

export class AgentEngineConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentEngineConfigurationError";
  }
}

export class AgentEngineExecutionError extends Error {
  readonly classification: AgentEngineErrorClassification;

  constructor(
    message: string,
    input: {
      classification: AgentEngineErrorClassification;
      cause?: unknown;
    }
  ) {
    super(message, input.cause ? { cause: input.cause } : undefined);
    this.name = "AgentEngineExecutionError";
    this.classification = input.classification;
  }
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

async function buildAnthropicRequest(
  request: AgentEngineTurnRequest
): Promise<MessageCreateParamsNonStreaming> {
  if (request.toolDefinitions.length > 0) {
    throw new AgentEngineConfigurationError(
      "The first anthropic engine slice does not yet support tool definitions."
    );
  }

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
    model: "claude-opus-4-7",
    max_tokens: request.executionLimits.maxOutputTokens,
    system: request.systemPromptParts.join("\n\n"),
    messages: [
      {
        role: "user",
        content: interactionSections.join("\n\n")
      }
    ]
  };
}

function classifyAnthropicError(
  error: unknown
): AgentEngineErrorClassification {
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

function extractAssistantMessages(message: Message): string[] {
  return message.content.flatMap((block) =>
    block.type === "text" && block.text.trim().length > 0 ? [block.text] : []
  );
}

function resolveAnthropicCredentialShape(input: {
  profile: NonNullable<ModelRuntimeContext["modelEndpointProfile"]>;
  secretValue: string;
}): { apiKey?: string; authToken?: string } {
  return input.profile.authMode === "api_key_bearer"
    ? { authToken: input.secretValue }
    : { apiKey: input.secretValue };
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

export function createAnthropicAgentEngine(input: {
  clientFactory?: AnthropicClientFactory;
  modelContext: ModelRuntimeContext;
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
    async executeTurn(request): Promise<AgentEngineTurnResult> {
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

      try {
        const response = await client.messages.create({
          ...(await buildAnthropicRequest(request)),
          model: modelId
        });

        if (response.stop_reason === "tool_use") {
          throw new AgentEngineExecutionError(
            "Anthropic requested tool use before the internal tool loop was enabled.",
            {
              classification: "tool_protocol_error"
            }
          );
        }

        return agentEngineTurnResultSchema.parse({
          assistantMessages: extractAssistantMessages(response),
          toolRequests: [],
          stopReason: mapStopReason(response),
          usage: response.usage
            ? {
                inputTokens: response.usage.input_tokens,
                outputTokens: response.usage.output_tokens
              }
            : undefined
        });
      } catch (error) {
        if (error instanceof AgentEngineExecutionError) {
          throw error;
        }

        throw new AgentEngineExecutionError(
          `Anthropic engine execution failed for node '${request.nodeId}'.`,
          {
            classification: classifyAnthropicError(error),
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

  throw new AgentEngineConfigurationError(
    `Adapter '${adapterKind}' is not implemented yet.`
  );
}

export function createStubAgentEngine(): AgentEngine {
  return {
    executeTurn(
      request: AgentEngineTurnRequest
    ): Promise<AgentEngineTurnResult> {
      return Promise.resolve(
        agentEngineTurnResultSchema.parse({
          assistantMessages: [
            `Stub engine executed for node '${request.nodeId}' with ${request.toolDefinitions.length} tool definitions.`
          ],
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
