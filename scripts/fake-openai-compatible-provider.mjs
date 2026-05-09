#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";

const defaultOptions = {
  apiKey: "entangle-test-key",
  content: "Deterministic Entangle test provider response.",
  host: "127.0.0.1",
  jsonLog: false,
  model: "entangle-deterministic-test",
  port: 18080,
  requireAuth: true,
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

const requests = [];
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

      sendJson(input.response, 200, buildResponsesBody(body));
      return;
    }

    if (body.stream === true) {
      sendChatStream(input.response, body);
      return;
    }

    sendJson(input.response, 200, buildChatCompletionBody(body));
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

function buildChatCompletionBody(body) {
  const model = typeof body.model === "string" && body.model ? body.model : options.model;

  if (shouldSendToolCall(body)) {
    return buildChatToolCallBody({ body, model });
  }

  return {
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

function resolveToolCallName(body) {
  const firstToolName = Array.isArray(body.tools)
    ? body.tools.find((tool) => typeof tool?.function?.name === "string")
        ?.function?.name
    : undefined;

  return options.toolCallName ?? firstToolName ?? "inspect_artifact_input";
}

function buildResponsesBody(body) {
  const model = typeof body.model === "string" && body.model ? body.model : options.model;
  const responseId = `resp_${randomUUID()}`;

  return {
    created_at: Math.floor(Date.now() / 1000),
    id: responseId,
    model,
    object: "response",
    output: [
      {
        content: [
          {
            annotations: [],
            text: options.content,
            type: "output_text"
          }
        ],
        id: `msg_${randomUUID()}`,
        role: "assistant",
        status: "completed",
        type: "message"
      }
    ],
    output_text: options.content,
    status: "completed",
    usage: {
      input_tokens: countApproxPromptTokens(body),
      output_tokens: countApproxTokens(options.content)
    }
  };
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

  return parsed;
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
`);
}
