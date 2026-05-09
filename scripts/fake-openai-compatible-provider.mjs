#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";

const defaultOptions = {
  apiKey: "entangle-test-key",
  content: "Deterministic Entangle test provider response.",
  host: "127.0.0.1",
  jsonLog: false,
  model: "entangle-deterministic-test",
  port: 18080,
  requireAuth: true,
  script: undefined,
  scriptPath: undefined,
  toolCallArguments: '{"artifactId":"artifact-alpha"}',
  toolCallId: "call_entangle_fake_provider_001",
  toolCallName: undefined,
  toolCallOnFirstRequest: false
};

let options;

try {
  options = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(`[fake-openai-provider] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

if (options.help) {
  printHelp();
  process.exit(0);
}

if (options.scriptPath) {
  try {
    options.script = await loadScript(options.scriptPath);
  } catch (error) {
    console.error(
      `[fake-openai-provider] ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

const requests = [];
const scriptState = {
  chatCompletionIndex: 0,
  responsesIndex: 0
};
const server = createServer((request, response) => {
  void handleRequest({ request, response });
});

server.on("error", (error) => {
  console.error(`[fake-openai-provider] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});

server.listen(options.port, options.host, () => {
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : options.port;
  const baseUrl = `http://${options.host}:${port}`;
  const payload = {
    apiKey: options.apiKey,
    baseUrl: `${baseUrl}/v1`,
    healthUrl: `${baseUrl}/health`,
    model: options.model
  };

  if (options.jsonLog) {
    console.log(JSON.stringify({ event: "listening", ...payload }));
    return;
  }

  console.log("Entangle deterministic OpenAI-compatible test provider");
  console.log(`health: ${payload.healthUrl}`);
  console.log(`baseUrl: ${payload.baseUrl}`);
  console.log(`apiKey: ${payload.apiKey}`);
  console.log(`model: ${payload.model}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => {
      process.exit(0);
    });
  });
}

async function handleRequest(input) {
  try {
    const url = new URL(input.request.url ?? "/", "http://127.0.0.1");

    if (input.request.method === "GET" && url.pathname === "/health") {
      sendJson(input.response, 200, {
        ok: true,
        requestCount: requests.length
      });
      return;
    }

    if (isModelsPath(input.request, url)) {
      if (!isAuthorized(input.request)) {
        sendJson(input.response, 401, {
          error: {
            message: "invalid_api_key"
          }
        });
        return;
      }

      sendJson(input.response, 200, {
        data: [
          {
            id: options.model,
            object: "model",
            owned_by: "entangle-test"
          }
        ],
        object: "list"
      });
      return;
    }

    if (!isSupportedCompletionPath(input.request, url)) {
      sendJson(input.response, 404, {
        error: {
          message: `Unsupported fake provider route '${input.request.method ?? "GET"} ${url.pathname}'.`
        }
      });
      return;
    }

    if (!isAuthorized(input.request)) {
      sendJson(input.response, 401, {
        error: {
          message: "invalid_api_key"
        }
      });
      return;
    }

    const rawBody = await readIncomingBody(input.request);
    const body = parseJsonObject(rawBody);
    requests.push({
      body,
      method: input.request.method ?? "POST",
      path: url.pathname
    });

    if (url.pathname.endsWith("/responses")) {
      if (body.stream === true) {
        sendResponsesStream(input.response, body);
        return;
      }

      const result = buildResponsesResult(body);
      sendJson(input.response, result.statusCode, result.body);
      return;
    }

    if (body.stream === true) {
      sendChatStream(input.response, body);
      return;
    }

    const result = buildChatCompletionResult(body);
    sendJson(input.response, result.statusCode, result.body);
  } catch (error) {
    sendJson(input.response, 500, {
      error: {
        message: error instanceof Error ? error.message : "fake_provider_error"
      }
    });
  }
}

function isModelsPath(request, url) {
  return (
    request.method === "GET" &&
    (url.pathname === "/v1/models" || url.pathname === "/models")
  );
}

function isSupportedCompletionPath(request, url) {
  if (request.method !== "POST") {
    return false;
  }

  return (
    url.pathname === "/v1/chat/completions" ||
    url.pathname === "/chat/completions" ||
    url.pathname === "/v1/responses" ||
    url.pathname === "/responses"
  );
}

function isAuthorized(request) {
  if (!options.requireAuth) {
    return true;
  }

  return request.headers.authorization === `Bearer ${options.apiKey}`;
}

function buildChatCompletionResult(body) {
  const model = typeof body.model === "string" && body.model ? body.model : options.model;
  const scriptedStep = takeScriptedChatCompletionStep();

  if (scriptedStep) {
    return buildScriptedChatCompletionResult({ body, model, scriptedStep });
  }

  if (shouldSendToolCall(body)) {
    return {
      body: buildChatToolCallBody({ body, model }),
      statusCode: 200
    };
  }

  return {
    body: {
      choices: [
        {
          finish_reason: "stop",
          index: 0,
          message: {
            content: options.content,
            role: "assistant"
          }
        }
      ],
      created: Math.floor(Date.now() / 1000),
      id: `chatcmpl_${randomUUID()}`,
      model,
      object: "chat.completion",
      usage: {
        completion_tokens: countApproxTokens(options.content),
        prompt_tokens: countApproxPromptTokens(body)
      }
    },
    statusCode: 200
  };
}

function shouldSendToolCall(body) {
  return (
    options.toolCallOnFirstRequest === true &&
    Array.isArray(body.tools) &&
    body.tools.length > 0 &&
    !hasToolResultMessage(body)
  );
}

function hasToolResultMessage(body) {
  return (
    Array.isArray(body.messages) &&
    body.messages.some((message) => message?.role === "tool")
  );
}

function buildChatToolCallBody(input) {
  const toolName = resolveToolCallName(input.body);

  return {
    choices: [
      {
        finish_reason: "tool_calls",
        index: 0,
        message: {
          content: null,
          role: "assistant",
          tool_calls: [
            {
              function: {
                arguments: options.toolCallArguments,
                name: toolName
              },
              id: options.toolCallId,
              type: "function"
            }
          ]
        }
      }
    ],
    created: Math.floor(Date.now() / 1000),
    id: `chatcmpl_${randomUUID()}`,
    model: input.model,
    object: "chat.completion",
    usage: {
      completion_tokens: countApproxTokens(options.toolCallArguments),
      prompt_tokens: countApproxPromptTokens(input.body)
    }
  };
}

function buildScriptedChatCompletionResult(input) {
  if (input.scriptedStep.type === "error") {
    return buildScriptedErrorResult(input.scriptedStep);
  }

  if (input.scriptedStep.type === "tool_call") {
    return {
      body: {
        choices: [
          {
            finish_reason: "tool_calls",
            index: 0,
            message: {
              content: null,
              role: "assistant",
              tool_calls: [
                {
                  function: {
                    arguments: JSON.stringify(input.scriptedStep.arguments),
                    name: input.scriptedStep.name
                  },
                  id: input.scriptedStep.id,
                  type: "function"
                }
              ]
            }
          }
        ],
        created: Math.floor(Date.now() / 1000),
        id: `chatcmpl_${randomUUID()}`,
        model: input.model,
        object: "chat.completion",
        usage: {
          completion_tokens: countApproxTokens(JSON.stringify(input.scriptedStep.arguments)),
          prompt_tokens: countApproxPromptTokens(input.body)
        }
      },
      statusCode: 200
    };
  }

  return {
    body: {
      choices: [
        {
          finish_reason: input.scriptedStep.finishReason,
          index: 0,
          message: {
            content: input.scriptedStep.content,
            role: "assistant"
          }
        }
      ],
      created: Math.floor(Date.now() / 1000),
      id: `chatcmpl_${randomUUID()}`,
      model: input.model,
      object: "chat.completion",
      usage: {
        completion_tokens: countApproxTokens(input.scriptedStep.content),
        prompt_tokens: countApproxPromptTokens(input.body)
      }
    },
    statusCode: 200
  };
}

function buildScriptedErrorResult(step) {
  return {
    body: {
      error: {
        message: step.message,
        type: step.errorType
      }
    },
    statusCode: step.status
  };
}

function resolveToolCallName(body) {
  const firstToolName = Array.isArray(body.tools)
    ? body.tools.find((tool) => typeof tool?.function?.name === "string")
        ?.function?.name
    : undefined;

  return options.toolCallName ?? firstToolName ?? "inspect_artifact_input";
}

function buildResponsesResult(body) {
  const model = typeof body.model === "string" && body.model ? body.model : options.model;
  const responseId = `resp_${randomUUID()}`;
  const scriptedStep = takeScriptedResponsesStep();

  if (scriptedStep?.type === "error") {
    return buildScriptedErrorResult(scriptedStep);
  }

  const content = scriptedStep?.content ?? options.content;

  return {
    body: {
      created_at: Math.floor(Date.now() / 1000),
      id: responseId,
      model,
      object: "response",
      output: [
        {
          content: [
            {
              annotations: [],
              text: content,
              type: "output_text"
            }
          ],
          id: `msg_${randomUUID()}`,
          role: "assistant",
          status: "completed",
          type: "message"
        }
      ],
      output_text: content,
      status: "completed",
      usage: {
        input_tokens: countApproxPromptTokens(body),
        output_tokens: countApproxTokens(content)
      }
    },
    statusCode: 200
  };
}

function takeScriptedChatCompletionStep() {
  if (
    !options.script ||
    scriptState.chatCompletionIndex >= options.script.chatCompletions.length
  ) {
    return undefined;
  }

  const step = options.script.chatCompletions[scriptState.chatCompletionIndex];
  scriptState.chatCompletionIndex += 1;
  return step;
}

function takeScriptedResponsesStep() {
  if (
    !options.script ||
    scriptState.responsesIndex >= options.script.responses.length
  ) {
    return undefined;
  }

  const step = options.script.responses[scriptState.responsesIndex];
  scriptState.responsesIndex += 1;
  return step;
}

function sendChatStream(response, body) {
  const model = typeof body.model === "string" && body.model ? body.model : options.model;
  const id = `chatcmpl_${randomUUID()}`;
  beginEventStream(response);
  writeSseData(response, {
    choices: [
      {
        delta: {
          role: "assistant"
        },
        finish_reason: null,
        index: 0
      }
    ],
    created: Math.floor(Date.now() / 1000),
    id,
    model,
    object: "chat.completion.chunk"
  });
  writeSseData(response, {
    choices: [
      {
        delta: {
          content: options.content
        },
        finish_reason: null,
        index: 0
      }
    ],
    created: Math.floor(Date.now() / 1000),
    id,
    model,
    object: "chat.completion.chunk"
  });
  writeSseData(response, {
    choices: [
      {
        delta: {},
        finish_reason: "stop",
        index: 0
      }
    ],
    created: Math.floor(Date.now() / 1000),
    id,
    model,
    object: "chat.completion.chunk"
  });
  response.write("data: [DONE]\n\n");
  response.end();
}

function sendResponsesStream(response, body) {
  const model = typeof body.model === "string" && body.model ? body.model : options.model;
  const id = `resp_${randomUUID()}`;
  beginEventStream(response);
  writeSseEvent(response, "response.created", {
    response: {
      created_at: Math.floor(Date.now() / 1000),
      id,
      model,
      service_tier: null
    },
    type: "response.created"
  });
  writeSseEvent(response, "response.output_text.delta", {
    delta: options.content,
    item_id: `item_${randomUUID()}`,
    logprobs: null,
    type: "response.output_text.delta"
  });
  writeSseEvent(response, "response.completed", {
    response: {
      id,
      incomplete_details: null,
      model,
      output_text: options.content,
      service_tier: null,
      usage: {
        input_tokens: countApproxPromptTokens(body),
        input_tokens_details: null,
        output_tokens: countApproxTokens(options.content),
        output_tokens_details: null
      }
    },
    type: "response.completed"
  });
  response.write("data: [DONE]\n\n");
  response.end();
}

function beginEventStream(response) {
  response.statusCode = 200;
  response.setHeader("cache-control", "no-cache");
  response.setHeader("connection", "keep-alive");
  response.setHeader("content-type", "text/event-stream");
}

function writeSseData(response, body) {
  response.write(`data: ${JSON.stringify(body)}\n\n`);
}

function writeSseEvent(response, event, body) {
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(body)}\n\n`);
}

async function readIncomingBody(request) {
  const chunks = [];

  await new Promise((resolve, reject) => {
    request.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    request.once("end", resolve);
    request.once("error", reject);
  });

  return Buffer.concat(chunks).toString("utf8");
}

function parseJsonObject(rawBody) {
  const parsed = rawBody.trim().length === 0 ? {} : JSON.parse(rawBody);

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Expected a JSON object request body.");
  }

  return parsed;
}

function countApproxPromptTokens(body) {
  const serialized = JSON.stringify(body);
  return Math.max(1, Math.ceil(serialized.length / 4));
}

function countApproxTokens(text) {
  return Math.max(1, Math.ceil(text.length / 4));
}

function sendJson(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify(body));
}

function parseArgs(args) {
  const parsed = { ...defaultOptions };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      return { ...parsed, help: true };
    }

    if (arg === "--json-log") {
      parsed.jsonLog = true;
      continue;
    }

    if (arg === "--allow-missing-auth") {
      parsed.requireAuth = false;
      continue;
    }

    if (arg === "--tool-call-on-first-request") {
      parsed.toolCallOnFirstRequest = true;
      continue;
    }

    if (
      arg === "--api-key" ||
      arg === "--content" ||
      arg === "--host" ||
      arg === "--model" ||
      arg === "--port" ||
      arg === "--script" ||
      arg === "--tool-call-arguments" ||
      arg === "--tool-call-id" ||
      arg === "--tool-call-name"
    ) {
      const value = args[index + 1];
      if (!value) {
        throw new Error(`Missing value for ${arg}.`);
      }
      index += 1;

      if (arg === "--api-key") {
        parsed.apiKey = value;
      } else if (arg === "--content") {
        parsed.content = value;
      } else if (arg === "--host") {
        parsed.host = value;
      } else if (arg === "--model") {
        parsed.model = value;
      } else if (arg === "--port") {
        const port = Number(value);
        if (!Number.isInteger(port) || port < 0 || port > 65535) {
          throw new Error(`Invalid port '${value}'.`);
        }
        parsed.port = port;
      } else if (arg === "--script") {
        parsed.scriptPath = value;
      } else if (arg === "--tool-call-arguments") {
        validateJsonObjectString(value, arg);
        parsed.toolCallArguments = value;
      } else if (arg === "--tool-call-id") {
        parsed.toolCallId = value;
      } else if (arg === "--tool-call-name") {
        parsed.toolCallName = value;
      }
      continue;
    }

    throw new Error(`Unknown option '${arg}'.`);
  }

  if (parsed.scriptPath && parsed.toolCallOnFirstRequest) {
    throw new Error("--script cannot be combined with --tool-call-on-first-request.");
  }

  return parsed;
}

async function loadScript(path) {
  let parsed;

  try {
    parsed = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error(
      `Failed to load script '${path}': ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Script '${path}' must be a JSON object.`);
  }

  return {
    chatCompletions: parseScriptArray({
      name: "chatCompletions",
      parser: parseScriptedChatCompletionStep,
      path,
      value: parsed.chatCompletions
    }),
    responses: parseScriptArray({
      name: "responses",
      parser: parseScriptedResponsesStep,
      path,
      value: parsed.responses
    })
  };
}

function parseScriptArray(input) {
  if (input.value === undefined) {
    return [];
  }

  if (!Array.isArray(input.value)) {
    throw new Error(`Script '${input.path}' field '${input.name}' must be an array.`);
  }

  return input.value.map((entry, index) =>
    input.parser({ entry, index, path: input.path })
  );
}

function parseScriptedChatCompletionStep(input) {
  const entry = parseScriptObjectEntry(input);
  const hasContent = Object.hasOwn(entry, "content");
  const hasError = Object.hasOwn(entry, "error");
  const hasToolCall = Object.hasOwn(entry, "toolCall");

  if ([hasContent, hasError, hasToolCall].filter(Boolean).length !== 1) {
    throw new Error(
      `Script '${input.path}' chatCompletions[${input.index}] must define exactly one of 'content', 'error', or 'toolCall'.`
    );
  }

  if (hasContent) {
    if (typeof entry.content !== "string") {
      throw new Error(
        `Script '${input.path}' chatCompletions[${input.index}].content must be a string.`
      );
    }

    return {
      content: entry.content,
      finishReason:
        typeof entry.finishReason === "string" && entry.finishReason
          ? entry.finishReason
          : "stop",
      type: "content"
    };
  }

  if (hasError) {
    return parseScriptedErrorStep({
      endpoint: "chatCompletions",
      error: entry.error,
      index: input.index,
      path: input.path
    });
  }

  const toolCall = entry.toolCall;
  if (typeof toolCall !== "object" || toolCall === null || Array.isArray(toolCall)) {
    throw new Error(
      `Script '${input.path}' chatCompletions[${input.index}].toolCall must be an object.`
    );
  }

  if (typeof toolCall.name !== "string" || toolCall.name.trim().length === 0) {
    throw new Error(
      `Script '${input.path}' chatCompletions[${input.index}].toolCall.name must be a non-empty string.`
    );
  }

  const id =
    typeof toolCall.id === "string" && toolCall.id.trim().length > 0
      ? toolCall.id
      : `call_scripted_${input.index + 1}`;
  const toolArguments = toolCall.arguments ?? {};

  if (
    typeof toolArguments !== "object" ||
    toolArguments === null ||
    Array.isArray(toolArguments)
  ) {
    throw new Error(
      `Script '${input.path}' chatCompletions[${input.index}].toolCall.arguments must be an object when provided.`
    );
  }

  return {
    arguments: toolArguments,
    id,
    name: toolCall.name,
    type: "tool_call"
  };
}

function parseScriptedResponsesStep(input) {
  const entry = parseScriptObjectEntry(input);
  const hasContent = Object.hasOwn(entry, "content");
  const hasError = Object.hasOwn(entry, "error");

  if (hasContent === hasError) {
    throw new Error(
      `Script '${input.path}' responses[${input.index}] must define exactly one of 'content' or 'error'.`
    );
  }

  if (hasError) {
    return parseScriptedErrorStep({
      endpoint: "responses",
      error: entry.error,
      index: input.index,
      path: input.path
    });
  }

  if (typeof entry.content !== "string") {
    throw new Error(
      `Script '${input.path}' responses[${input.index}].content must be a string.`
    );
  }

  return {
    content: entry.content,
    type: "content"
  };
}

function parseScriptedErrorStep(input) {
  if (
    typeof input.error !== "object" ||
    input.error === null ||
    Array.isArray(input.error)
  ) {
    throw new Error(
      `Script '${input.path}' ${input.endpoint}[${input.index}].error must be an object.`
    );
  }

  if (
    !Number.isInteger(input.error.status) ||
    input.error.status < 400 ||
    input.error.status > 599
  ) {
    throw new Error(
      `Script '${input.path}' ${input.endpoint}[${input.index}].error.status must be an HTTP error status.`
    );
  }

  if (typeof input.error.message !== "string" || input.error.message.length === 0) {
    throw new Error(
      `Script '${input.path}' ${input.endpoint}[${input.index}].error.message must be a non-empty string.`
    );
  }

  return {
    errorType:
      typeof input.error.type === "string" && input.error.type.length > 0
        ? input.error.type
        : "scripted_error",
    message: input.error.message,
    status: input.error.status,
    type: "error"
  };
}

function parseScriptObjectEntry(input) {
  if (
    typeof input.entry !== "object" ||
    input.entry === null ||
    Array.isArray(input.entry)
  ) {
    throw new Error(
      `Script '${input.path}' step '${input.index}' in the selected array must be an object.`
    );
  }

  return input.entry;
}

function validateJsonObjectString(value, optionName) {
  try {
    const parsed = JSON.parse(value);

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("Expected JSON object.");
    }
  } catch (error) {
    throw new Error(
      `${optionName} must be a JSON object string: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

function printHelp() {
  console.log(`Usage: node scripts/fake-openai-compatible-provider.mjs [options]

Options:
  --host <host>              Listen host. Default: 127.0.0.1
  --port <port>              Listen port. Default: 18080
  --api-key <key>            Expected bearer token. Default: entangle-test-key
  --model <id>               Model id exposed by /v1/models.
  --content <text>           Deterministic assistant response content.
  --script <path>            JSON script for non-streaming chat/responses sequences.
  --allow-missing-auth       Do not require Authorization: Bearer <key>.
  --tool-call-on-first-request
                             Return one chat-completions tool call when tools are present.
  --tool-call-name <name>    Override tool call function name.
  --tool-call-id <id>        Tool call id. Default: call_entangle_fake_provider_001
  --tool-call-arguments <json>
                             Tool call arguments object string.
  --json-log                 Print startup metadata as JSON.
  -h, --help                 Show this help.

Routes:
  GET  /health
  GET  /v1/models
  POST /v1/chat/completions
  POST /v1/responses

Script format:
  {
    "chatCompletions": [
      { "content": "First scripted assistant text." },
      {
        "toolCall": {
          "id": "call_scripted_001",
          "name": "inspect_artifact_input",
          "arguments": { "artifactId": "artifact-alpha" }
        }
      },
      { "error": { "status": 429, "message": "scripted_rate_limit" } }
    ],
    "responses": [
      { "content": "Scripted Responses API text." },
      { "error": { "status": 503, "message": "scripted_unavailable" } }
    ]
  }
`);
}
