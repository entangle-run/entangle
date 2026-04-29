import { createServer, type IncomingHttpHeaders, type IncomingMessage, type ServerResponse } from "node:http";

export type FakeOpenAICompatibleChatMessage =
  | {
      content: string;
      role: "system" | "user";
    }
  | {
      content?: string | null;
      role: "assistant";
      tool_calls?: FakeOpenAICompatibleToolCall[];
    }
  | {
      content: string;
      role: "tool";
      tool_call_id: string;
    };

export type FakeOpenAICompatibleToolCall = {
  function: {
    arguments: string;
    name: string;
  };
  id: string;
  type: "function";
};

export type FakeOpenAICompatibleChatCompletionRequest = {
  max_tokens?: number;
  messages?: FakeOpenAICompatibleChatMessage[];
  model?: string;
  tool_choice?: unknown;
  tools?: unknown[];
};

export type FakeOpenAICompatibleChatCompletionResponse = {
  choices: Array<{
    finish_reason?: string | null;
    message: {
      content?: string | null;
      tool_calls?: FakeOpenAICompatibleToolCall[];
    };
  }>;
  model?: string;
  usage?: {
    completion_tokens?: number;
    prompt_tokens?: number;
  };
};

export type FakeOpenAICompatibleRequestRecord = {
  authorization?: string;
  body: FakeOpenAICompatibleChatCompletionRequest;
  headers: IncomingHttpHeaders;
  method: string;
  pathname: string;
  rawBody: string;
};

export type FakeOpenAICompatibleHandlerResult = {
  body: FakeOpenAICompatibleChatCompletionResponse | Record<string, unknown>;
  status?: number;
};

export type FakeOpenAICompatibleHandler = (input: {
  request: FakeOpenAICompatibleChatCompletionRequest;
  requestIndex: number;
}) =>
  | FakeOpenAICompatibleHandlerResult
  | Promise<FakeOpenAICompatibleHandlerResult>;

export type FakeOpenAICompatibleServer = {
  baseUrl: string;
  close(): Promise<void>;
  requests: FakeOpenAICompatibleRequestRecord[];
};

export async function startFakeOpenAICompatibleServer(input: {
  apiKey?: string;
  defaultCompletionTokens?: number;
  defaultContent?: string;
  defaultModel?: string;
  defaultPromptTokens?: number;
  handler?: FakeOpenAICompatibleHandler;
} = {}): Promise<FakeOpenAICompatibleServer> {
  const requests: FakeOpenAICompatibleRequestRecord[] = [];
  const server = createServer((request, response) => {
    void handleFakeOpenAICompatibleRequest({
      input,
      request,
      requests,
      response
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();

  if (!address || typeof address === "string") {
    await closeServer(server);
    throw new Error("Fake OpenAI-compatible server did not expose a TCP address.");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close() {
      return closeServer(server);
    },
    requests
  };
}

async function handleFakeOpenAICompatibleRequest(input: {
  input: {
    apiKey?: string;
    defaultCompletionTokens?: number;
    defaultContent?: string;
    defaultModel?: string;
    defaultPromptTokens?: number;
    handler?: FakeOpenAICompatibleHandler;
  };
  request: IncomingMessage;
  requests: FakeOpenAICompatibleRequestRecord[];
  response: ServerResponse;
}): Promise<void> {
  try {
    const url = new URL(input.request.url ?? "/", "http://127.0.0.1");

    if (input.request.method === "GET" && url.pathname === "/v1/models") {
      sendJson(input.response, 200, {
        data: [
          {
            id: input.input.defaultModel ?? "deterministic-test-model",
            object: "model",
            owned_by: "entangle-test"
          }
        ],
        object: "list"
      });
      return;
    }

    if (
      input.request.method !== "POST" ||
      url.pathname !== "/v1/chat/completions"
    ) {
      sendJson(input.response, 404, {
        error: {
          message: `Unsupported fake provider route '${input.request.method ?? "GET"} ${url.pathname}'.`
        }
      });
      return;
    }

    const authorization =
      typeof input.request.headers.authorization === "string"
        ? input.request.headers.authorization
        : undefined;

    if (input.input.apiKey && authorization !== `Bearer ${input.input.apiKey}`) {
      sendJson(input.response, 401, {
        error: {
          message: "invalid_api_key"
        }
      });
      return;
    }

    const rawBody = await readIncomingBody(input.request);
    const body = parseFakeChatCompletionRequest(rawBody);
    const record: FakeOpenAICompatibleRequestRecord = {
      body,
      headers: input.request.headers,
      method: input.request.method ?? "POST",
      pathname: url.pathname,
      rawBody,
      ...(authorization ? { authorization } : {})
    };
    input.requests.push(record);

    const handlerResult = input.input.handler
      ? await input.input.handler({
          request: body,
          requestIndex: input.requests.length
        })
      : {
          body: buildDefaultChatCompletionResponse({
            content:
              input.input.defaultContent ??
              "Deterministic OpenAI-compatible test response.",
            completionTokens: input.input.defaultCompletionTokens ?? 7,
            model: body.model ?? input.input.defaultModel ?? "deterministic-test-model",
            promptTokens: input.input.defaultPromptTokens ?? 19
          })
        };

    sendJson(input.response, handlerResult.status ?? 200, handlerResult.body);
  } catch (error) {
    sendJson(input.response, 500, {
      error: {
        message: error instanceof Error ? error.message : "fake_provider_error"
      }
    });
  }
}

function buildDefaultChatCompletionResponse(input: {
  completionTokens: number;
  content: string;
  model: string;
  promptTokens: number;
}): FakeOpenAICompatibleChatCompletionResponse {
  return {
    choices: [
      {
        finish_reason: "stop",
        message: {
          content: input.content
        }
      }
    ],
    model: input.model,
    usage: {
      completion_tokens: input.completionTokens,
      prompt_tokens: input.promptTokens
    }
  };
}

async function readIncomingBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    request.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    request.once("end", resolve);
    request.once("error", reject);
  });

  return Buffer.concat(chunks).toString("utf8");
}

function parseFakeChatCompletionRequest(
  rawBody: string
): FakeOpenAICompatibleChatCompletionRequest {
  const parsed = rawBody.trim().length === 0 ? {} : (JSON.parse(rawBody) as unknown);

  if (!isPlainObjectRecord(parsed)) {
    throw new Error("Expected a JSON object chat-completions request.");
  }

  return parsed;
}

function isPlainObjectRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function sendJson(
  response: ServerResponse,
  statusCode: number,
  body: unknown
): void {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify(body));
}

async function closeServer(server: ReturnType<typeof createServer>): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
