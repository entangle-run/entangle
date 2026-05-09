import { writeFile } from "node:fs/promises";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse
} from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import type { AgentEngineExecutionError } from "@entangle/agent-engine";
import {
  agentEngineTurnRequestSchema,
  type EffectiveRuntimeContext
} from "@entangle/types";
import { createExternalHttpAgentEngine } from "./external-http-engine.js";
import { runRunnerOnce } from "./index.js";
import {
  cleanupRuntimeFixtures,
  createRuntimeFixture,
  runnerSecretHex
} from "./test-fixtures.js";

type HttpHandler = (
  request: IncomingMessage,
  response: ServerResponse,
  body: string
) => void;

const serverClosers: Array<() => Promise<void>> = [];

function buildTurnRequest() {
  return agentEngineTurnRequestSchema.parse({
    artifactInputs: [],
    artifactRefs: [],
    executionLimits: {
      maxOutputTokens: 1024,
      maxToolTurns: 4
    },
    interactionPromptParts: ["Summarize the workspace."],
    memoryRefs: [],
    nodeId: "worker-it",
    sessionId: "session-alpha",
    systemPromptParts: ["You are an Entangle runtime node."],
    toolDefinitions: []
  });
}

function createExternalRuntimeContext(
  context: EffectiveRuntimeContext,
  baseUrl: string,
  options: {
    healthUrl?: string;
    httpAuth?: NonNullable<
      EffectiveRuntimeContext["agentRuntimeContext"]["engineProfile"]["httpAuth"]
    >;
  } = {}
): EffectiveRuntimeContext {
  return {
    ...context,
    agentRuntimeContext: {
      ...context.agentRuntimeContext,
      engineProfile: {
        baseUrl,
        displayName: "External HTTP",
        ...(options.healthUrl ? { healthUrl: options.healthUrl } : {}),
        ...(options.httpAuth ? { httpAuth: options.httpAuth } : {}),
        id: "external-http-test",
        kind: "external_http" as const,
        stateScope: "node" as const
      },
      engineProfileRef: "external-http-test"
    }
  };
}

async function startHttpEngine(handler: HttpHandler): Promise<string> {
  const server = createServer((request, response) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => handler(request, response, body));
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  serverClosers.push(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      })
  );

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("HTTP engine fixture did not expose a TCP address.");
  }

  return `http://127.0.0.1:${address.port}/turn`;
}

function buildHealthUrl(turnUrl: string): string {
  return new URL("/health", turnUrl).toString();
}

afterEach(async () => {
  delete process.env.ENTANGLE_EXTERNAL_HTTP_ENGINE_TOKEN;
  await cleanupRuntimeFixtures();
  await Promise.all(serverClosers.splice(0).map((closeServer) => closeServer()));
});

describe("external HTTP runner engine adapter", () => {
  it("executes one JSON HTTP engine turn", async () => {
    const baseUrl = await startHttpEngine((request, response, body) => {
      const payload = JSON.parse(body) as unknown;
      const record =
        payload && typeof payload === "object"
          ? (payload as {
              request?: { nodeId?: unknown };
              runtime?: { nodeId?: unknown };
            })
          : {};

      expect(request.method).toBe("POST");
      expect(request.headers["x-entangle-node-id"]).toBe("worker-it");
      expect(record.request?.nodeId).toBe("worker-it");
      expect(record.runtime?.nodeId).toBe("worker-it");
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          assistantMessages: ["external HTTP handled worker-it in worker-it"],
          engineVersion: "external-http-fixture-1",
          stopReason: "completed"
        })
      );
    });
    const fixture = await createRuntimeFixture();
    const runtimeContext = createExternalRuntimeContext(fixture.context, baseUrl);
    const engine = createExternalHttpAgentEngine({ runtimeContext });

    await expect(engine.executeTurn(buildTurnRequest())).resolves.toMatchObject({
      assistantMessages: ["external HTTP handled worker-it in worker-it"],
      engineVersion: "external-http-fixture-1",
      stopReason: "completed"
    });
  });

  it("sends external HTTP bearer auth from the configured environment variable", async () => {
    process.env.ENTANGLE_EXTERNAL_HTTP_ENGINE_TOKEN = "engine-token";
    const baseUrl = await startHttpEngine((request, response) => {
      expect(request.headers.authorization).toBe("Bearer engine-token");
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          assistantMessages: ["authenticated external HTTP"],
          stopReason: "completed"
        })
      );
    });
    const fixture = await createRuntimeFixture();
    const runtimeContext = createExternalRuntimeContext(fixture.context, baseUrl, {
      httpAuth: {
        mode: "bearer_env",
        tokenEnvVar: "ENTANGLE_EXTERNAL_HTTP_ENGINE_TOKEN"
      }
    });
    const engine = createExternalHttpAgentEngine({ runtimeContext });

    await expect(engine.executeTurn(buildTurnRequest())).resolves.toMatchObject({
      assistantMessages: ["authenticated external HTTP"],
      stopReason: "completed"
    });
  });

  it("probes configured external HTTP health URLs before posting a turn", async () => {
    const requests: string[] = [];
    const baseUrl = await startHttpEngine((request, response) => {
      requests.push(`${request.method} ${request.url}`);
      if (request.method === "GET" && request.url === "/health") {
        response.setHeader("content-type", "application/json");
        response.end(
          JSON.stringify({
            healthy: true,
            version: "external-http-fixture-healthy"
          })
        );
        return;
      }

      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          assistantMessages: ["health checked external HTTP"],
          stopReason: "completed"
        })
      );
    });
    const fixture = await createRuntimeFixture();
    const runtimeContext = createExternalRuntimeContext(fixture.context, baseUrl, {
      healthUrl: buildHealthUrl(baseUrl)
    });
    const engine = createExternalHttpAgentEngine({ runtimeContext });

    await expect(engine.executeTurn(buildTurnRequest())).resolves.toMatchObject({
      assistantMessages: ["health checked external HTTP"],
      stopReason: "completed"
    });
    expect(requests).toEqual(["GET /health", "POST /turn"]);
  });

  it("does not post turns when the configured external HTTP health probe fails", async () => {
    const requests: string[] = [];
    const baseUrl = await startHttpEngine((request, response) => {
      requests.push(`${request.method} ${request.url}`);
      if (request.method === "GET" && request.url === "/health") {
        response.statusCode = 503;
        response.end("unhealthy");
        return;
      }

      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          assistantMessages: ["should not be called"],
          stopReason: "completed"
        })
      );
    });
    const fixture = await createRuntimeFixture();
    const runtimeContext = createExternalRuntimeContext(fixture.context, baseUrl, {
      healthUrl: buildHealthUrl(baseUrl)
    });
    const engine = createExternalHttpAgentEngine({ runtimeContext });

    await expect(engine.executeTurn(buildTurnRequest())).rejects.toMatchObject({
      classification: "provider_unavailable",
      name: "AgentEngineExecutionError"
    } satisfies Partial<AgentEngineExecutionError>);
    expect(requests).toEqual(["GET /health"]);
  });

  it("fails configuration when external HTTP bearer auth env var is missing", async () => {
    delete process.env.ENTANGLE_EXTERNAL_HTTP_ENGINE_TOKEN;
    const baseUrl = await startHttpEngine((_request, response) => {
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          assistantMessages: ["should not be called"],
          stopReason: "completed"
        })
      );
    });
    const fixture = await createRuntimeFixture();
    const runtimeContext = createExternalRuntimeContext(fixture.context, baseUrl, {
      httpAuth: {
        mode: "bearer_env",
        tokenEnvVar: "ENTANGLE_EXTERNAL_HTTP_ENGINE_TOKEN"
      }
    });
    const engine = createExternalHttpAgentEngine({ runtimeContext });

    await expect(engine.executeTurn(buildTurnRequest())).rejects.toMatchObject({
      name: "AgentEngineConfigurationError"
    });
  });

  it("is selected by normal runner startup for external_http profiles", async () => {
    const baseUrl = await startHttpEngine((_request, response) => {
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          assistantMessages: ["runner startup selected external HTTP"],
          stopReason: "completed"
        })
      );
    });
    const fixture = await createRuntimeFixture();
    const runtimeContext = createExternalRuntimeContext(fixture.context, baseUrl);
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;
    await writeFile(fixture.contextPath, JSON.stringify(runtimeContext, null, 2), "utf8");

    await expect(
      runRunnerOnce({ runtimeContextPath: fixture.contextPath })
    ).resolves.toMatchObject({
      result: {
        assistantMessages: ["runner startup selected external HTTP"],
        stopReason: "completed"
      }
    });
  });

  it("classifies non-OK HTTP responses", async () => {
    const baseUrl = await startHttpEngine((_request, response) => {
      response.statusCode = 401;
      response.end("missing token");
    });
    const fixture = await createRuntimeFixture();
    const runtimeContext = createExternalRuntimeContext(fixture.context, baseUrl);
    const engine = createExternalHttpAgentEngine({ runtimeContext });

    await expect(engine.executeTurn(buildTurnRequest())).rejects.toMatchObject({
      classification: "auth_error",
      name: "AgentEngineExecutionError"
    } satisfies Partial<AgentEngineExecutionError>);
  });

  it("rejects invalid JSON responses as a tool protocol error", async () => {
    const baseUrl = await startHttpEngine((_request, response) => {
      response.end("not json");
    });
    const fixture = await createRuntimeFixture();
    const runtimeContext = createExternalRuntimeContext(fixture.context, baseUrl);
    const engine = createExternalHttpAgentEngine({ runtimeContext });

    await expect(engine.executeTurn(buildTurnRequest())).rejects.toMatchObject({
      classification: "tool_protocol_error",
      name: "AgentEngineExecutionError"
    } satisfies Partial<AgentEngineExecutionError>);
  });

  it("rejects schema-invalid JSON responses as a tool protocol error", async () => {
    const baseUrl = await startHttpEngine((_request, response) => {
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          assistantMessages: "not-an-array",
          stopReason: "completed"
        })
      );
    });
    const fixture = await createRuntimeFixture();
    const runtimeContext = createExternalRuntimeContext(fixture.context, baseUrl);
    const engine = createExternalHttpAgentEngine({ runtimeContext });

    await expect(engine.executeTurn(buildTurnRequest())).rejects.toMatchObject({
      classification: "tool_protocol_error",
      name: "AgentEngineExecutionError"
    } satisfies Partial<AgentEngineExecutionError>);
  });
});
