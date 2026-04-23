import { afterEach, describe, expect, it } from "vitest";
import path from "node:path";
import type { AgentEngine } from "@entangle/agent-engine";
import {
  buildAgentEngineTurnRequest,
  loadRuntimeContext
} from "./runtime-context.js";
import { runRunnerOnce, runRunnerServiceUntilSignal } from "./index.js";
import {
  cleanupRuntimeFixtures,
  createRuntimeFixture,
  runnerPublicKey,
  runnerSecretHex
} from "./test-fixtures.js";
import { InMemoryRunnerTransport } from "./transport.js";

afterEach(async () => {
  delete process.env.ENTANGLE_NOSTR_SECRET_KEY;
  await cleanupRuntimeFixtures();
});

describe("runner runtime context", () => {
  const stubEngine: AgentEngine = {
    executeTurn(request) {
      return Promise.resolve({
        assistantMessages: [
          `Stub execution for node '${request.nodeId}' through the configured runner path.`
        ],
        stopReason: "completed",
        toolRequests: [],
        usage: {
          inputTokens: 0,
          outputTokens: 0
        }
      });
    }
  };

  it("loads runtime context and builds the first engine turn request from package files", async () => {
    const fixture = await createRuntimeFixture({
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_artifact_input",
            description: "Inspect a retrieved inbound artifact by artifact id.",
            inputSchema: {
              type: "object",
              properties: {
                artifactId: {
                  type: "string"
                }
              },
              required: ["artifactId"]
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_artifact_input"
            }
          }
        ]
      }
    });

    const context = await loadRuntimeContext(fixture.contextPath);
    const request = await buildAgentEngineTurnRequest(context);

    expect(request.nodeId).toBe("worker-it");
    expect(request.executionLimits).toEqual({
      maxToolTurns: 5,
      maxOutputTokens: 1536
    });
    expect(request.systemPromptParts[0]).toContain("System prompt from package.");
    expect(request.interactionPromptParts[0]).toContain(
      "Interaction prompt from package."
    );
    expect(request.toolDefinitions).toEqual([
      {
        description: "Inspect a retrieved inbound artifact by artifact id.",
        id: "inspect_artifact_input",
        inputSchema: {
          type: "object",
          properties: {
            artifactId: {
              type: "string"
            }
          },
          required: ["artifactId"]
        }
      }
    ]);
    expect(request.memoryRefs).toContain(
      path.join(context.workspace.memoryRoot, "schema", "AGENTS.md")
    );
  });

  it("executes one stub-engine turn from an injected runtime context", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const result = await runRunnerOnce({
      runtimeContextPath: fixture.contextPath,
      engine: stubEngine
    });

    expect(result.graphId).toBe("graph-alpha");
    expect(result.nodeId).toBe("worker-it");
    expect(result.packageId).toBe("worker-it");
    expect(result.publicKey).toBe(runnerPublicKey);
    expect(result.result.assistantMessages[0]).toContain("worker-it");
  });

  it("can start and stop the long-lived runner service with an injected transport", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;
    const abortController = new AbortController();

    abortController.abort();

    const result = await runRunnerServiceUntilSignal({
      abortSignal: abortController.signal,
      engine: stubEngine,
      runtimeContextPath: fixture.contextPath,
      transport: new InMemoryRunnerTransport()
    });

    expect(result.graphId).toBe("graph-alpha");
    expect(result.nodeId).toBe("worker-it");
    expect(result.publicKey).toBe(runnerPublicKey);
  });
});
