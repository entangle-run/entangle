import { afterEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AgentEngine } from "@entangle/agent-engine";
import type {
  EntangleControlEvent,
  EntangleObservationEventPayload,
  RuntimeAssignmentRecord
} from "@entangle/types";
import {
  buildAgentEngineTurnRequest,
  loadRuntimeContext,
  summarizeAgentEngineTurnRequest
} from "./runtime-context.js";
import {
  createConfiguredRunnerJoinService,
  parseRunnerCliMode,
  runGenericRunnerUntilSignal,
  runRunnerOnce,
  runRunnerServiceUntilSignal
} from "./index.js";
import {
  buildInboundTaskRequest,
  cleanupRuntimeFixtures,
  createRunnerJoinFixture,
  createRuntimeFixture,
  hostPublicKey,
  remotePublicKey,
  runnerPublicKey,
  runnerSecretHex
} from "./test-fixtures.js";
import type { RunnerJoinTransport } from "./join-service.js";
import { InMemoryRunnerTransport } from "./transport.js";

afterEach(async () => {
  delete process.env.ENTANGLE_NOSTR_SECRET_KEY;
  delete process.env.ENTANGLE_RUNNER_JOIN_CONFIG_PATH;
  delete process.env.ENTANGLE_RUNNER_NOSTR_SECRET_KEY;
  delete process.env.ENTANGLE_RUNNER_STATE_ROOT;
  delete process.env.ENTANGLE_HOST_TOKEN;
  vi.unstubAllGlobals();
  await cleanupRuntimeFixtures();
});

class FakeRunnerJoinTransport implements RunnerJoinTransport {
  readonly observations: EntangleObservationEventPayload[] = [];
  private closed = false;
  private onControlEvent: ((event: EntangleControlEvent) => Promise<void> | void) | undefined;

  close(): Promise<void> {
    this.closed = true;
    return Promise.resolve();
  }

  dispatch(event: EntangleControlEvent): Promise<void> {
    return Promise.resolve(this.onControlEvent?.(event));
  }

  isClosed(): boolean {
    return this.closed;
  }

  publishObservationEvent(input: {
    payload: EntangleObservationEventPayload;
  }): Promise<{
    event: {
      envelope: {
        eventId: string;
      };
    };
  }> {
    this.observations.push(input.payload);

    return Promise.resolve({
      event: {
        envelope: {
          eventId: `event-${this.observations.length}`
        }
      }
    });
  }

  subscribeControlEvents(input: {
    onEvent: (event: EntangleControlEvent) => Promise<void> | void;
  }): Promise<{
    close(): Promise<void>;
  }> {
    this.onControlEvent = input.onEvent;

    return Promise.resolve({
      close: () => {
        this.onControlEvent = undefined;
        return Promise.resolve();
      }
    });
  }
}

function buildAssignment(): RuntimeAssignmentRecord {
  return {
    assignmentId: "assignment-alpha",
    assignmentRevision: 0,
    graphId: "graph-alpha",
    graphRevisionId: "graph-alpha-rev-1",
    hostAuthorityPubkey: hostPublicKey,
    lease: {
      expiresAt: "2026-04-26T12:10:00.000Z",
      issuedAt: "2026-04-26T12:00:00.000Z",
      leaseId: "lease-alpha",
      renewBy: "2026-04-26T12:08:00.000Z"
    },
    nodeId: "worker-it",
    offeredAt: "2026-04-26T12:00:00.000Z",
    runnerId: "runner-alpha",
    runnerPubkey: runnerPublicKey,
    runtimeKind: "agent_runner",
    schemaVersion: "1",
    status: "offered",
    updatedAt: "2026-04-26T12:00:00.000Z"
  };
}

function buildAssignmentOfferEvent(
  assignment: RuntimeAssignmentRecord
): EntangleControlEvent {
  return {
    envelope: {
      createdAt: "2026-04-26T12:00:00.000Z",
      eventId: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      payloadHash:
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      protocol: "entangle.control.v1",
      recipientPubkey: runnerPublicKey,
      schemaVersion: "1",
      signature:
        "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      signerPubkey: hostPublicKey
    },
    payload: {
      assignment,
      eventType: "runtime.assignment.offer",
      hostAuthorityPubkey: hostPublicKey,
      issuedAt: "2026-04-26T12:00:00.000Z",
      protocol: "entangle.control.v1",
      runnerId: "runner-alpha",
      runnerPubkey: runnerPublicKey
    }
  };
}

describe("runner runtime context", () => {
  const stubEngine: AgentEngine = {
    executeTurn(request) {
      return Promise.resolve({
        assistantMessages: [
          `Stub execution for node '${request.nodeId}' through the configured runner path.`
        ],
        stopReason: "completed",
        toolExecutions: [],
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
    expect(request.interactionPromptParts.join("\n")).toContain(
      "Agent runtime:"
    );
    expect(request.interactionPromptParts.join("\n")).toContain(
      "Workspace boundaries:"
    );
    expect(request.interactionPromptParts.join("\n")).toContain(
      "Policy context:"
    );
    expect(request.interactionPromptParts.join("\n")).toContain(
      "Entangle action contract:"
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

    const summary = summarizeAgentEngineTurnRequest(request, {
      generatedAt: "2026-04-25T00:00:00.000Z"
    });

    expect(summary).toMatchObject({
      actionContractContextIncluded: true,
      agentRuntimeContextIncluded: true,
      artifactInputCount: 0,
      artifactRefCount: 0,
      executionLimits: {
        maxOutputTokens: 1536,
        maxToolTurns: 5
      },
      generatedAt: "2026-04-25T00:00:00.000Z",
      inboundMessageContextIncluded: false,
      interactionPromptPartCount: 9,
      peerRouteContextIncluded: false,
      policyContextIncluded: true,
      systemPromptPartCount: 4,
      toolDefinitionCount: 1,
      workspaceBoundaryContextIncluded: true
    });
    expect(summary.interactionPromptCharacterCount).toBeGreaterThan(0);
    expect(summary.memoryRefCount).toBeGreaterThan(0);
    expect(summary.systemPromptCharacterCount).toBeGreaterThan(0);
  });

  it("includes bounded peer route context in engine turn requests", async () => {
    const fixture = await createRuntimeFixture();
    const context = await loadRuntimeContext(fixture.contextPath);
    const request = await buildAgentEngineTurnRequest({
      ...context,
      relayContext: {
        ...context.relayContext,
        edgeRoutes: [
          {
            channel: "review",
            edgeId: "worker-to-reviewer",
            peerNodeId: "reviewer-it",
            peerPubkey: remotePublicKey,
            relation: "reviews",
            relayProfileRefs: ["preview-relay"]
          }
        ]
      }
    });
    const interactionPrompt = request.interactionPromptParts.join("\n");

    expect(interactionPrompt).toContain("Peer routes:");
    expect(interactionPrompt).toContain("reviewer-it");
    expect(interactionPrompt).toContain(`pubkey=${remotePublicKey}`);
    expect(interactionPrompt).toContain("relation=reviews");

    expect(
      summarizeAgentEngineTurnRequest(request, {
        generatedAt: "2026-04-25T00:00:00.000Z"
      }).peerRouteContextIncluded
    ).toBe(true);
  });

  it("includes bounded inbound control context in engine turn requests", async () => {
    const fixture = await createRuntimeFixture();
    const context = await loadRuntimeContext(fixture.contextPath);
    const request = await buildAgentEngineTurnRequest(context, {
      inboundMessage: buildInboundTaskRequest().message
    });
    const interactionPrompt = request.interactionPromptParts.join("\n");
    const summary = summarizeAgentEngineTurnRequest(request, {
      generatedAt: "2026-04-25T00:00:00.000Z"
    });

    expect(interactionPrompt).toContain("Inbound controls:");
    expect(interactionPrompt).toContain("response required: yes");
    expect(interactionPrompt).toContain("approval required before action: no");
    expect(summary.inboundMessageContextIncluded).toBe(true);
    expect(summary.actionContractContextIncluded).toBe(true);
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

  it("selects federated join mode from CLI args or env", () => {
    expect(parseRunnerCliMode(["join", "--config", "/tmp/runner.json"])).toEqual(
      {
        joinConfigPath: "/tmp/runner.json",
        mode: "join"
      }
    );
    expect(
      parseRunnerCliMode([], {
        ENTANGLE_RUNNER_JOIN_CONFIG_PATH: "/tmp/join.json"
      })
    ).toEqual({
      joinConfigPath: "/tmp/join.json",
      mode: "join"
    });
    expect(
      parseRunnerCliMode([], {
        ENTANGLE_RUNTIME_CONTEXT_PATH: "/tmp/context.json"
      })
    ).toEqual({
      mode: "local-context",
      runtimeContextPath: "/tmp/context.json"
    });
  });

  it("starts generic federated join without runtime context", async () => {
    const fixture = await createRunnerJoinFixture();
    const abortController = new AbortController();
    const transport = new FakeRunnerJoinTransport();
    process.env.ENTANGLE_RUNNER_NOSTR_SECRET_KEY = runnerSecretHex;

    abortController.abort();

    const result = await runGenericRunnerUntilSignal({
      abortSignal: abortController.signal,
      clock: () => "2026-04-26T12:00:00.000Z",
      joinConfigPath: fixture.configPath,
      nonceFactory: () => "nonce-alpha",
      transport
    });

    expect(result).toMatchObject({
      configPath: fixture.configPath,
      hostAuthorityPubkey: hostPublicKey,
      runnerId: "runner-alpha",
      runnerPubkey: runnerPublicKey
    });
    expect(transport.observations[0]).toMatchObject({
      eventType: "runner.hello",
      nonce: "nonce-alpha",
      runnerId: "runner-alpha"
    });
    expect(transport.isClosed()).toBe(true);
  });

  it("accepts assignment offers only after injected materialization succeeds", async () => {
    const fixture = await createRunnerJoinFixture();
    const transport = new FakeRunnerJoinTransport();
    process.env.ENTANGLE_RUNNER_NOSTR_SECRET_KEY = runnerSecretHex;

    const configured = await createConfiguredRunnerJoinService(
      fixture.configPath,
      {
        clock: () => "2026-04-26T12:00:00.000Z",
        materializer: ({ assignment }) =>
          Promise.resolve(
            assignment.lease
              ? {
                  accepted: true,
                  lease: assignment.lease
                }
              : {
                  accepted: true
                }
          ),
        nonceFactory: () => "nonce-alpha",
        transport
      }
    );

    await configured.service.start();
    await transport.dispatch(buildAssignmentOfferEvent(buildAssignment()));

    expect(transport.observations.map((payload) => payload.eventType)).toEqual([
      "runner.hello",
      "assignment.receipt",
      "assignment.accepted"
    ]);
    expect(configured.service.getAcceptedAssignments()).toHaveLength(1);

    await configured.service.stop();
  });

  it("materializes assignment offers to runner-owned storage by default", async () => {
    const fixture = await createRunnerJoinFixture();
    const runnerStateRoot = path.join(path.dirname(fixture.configPath), "runner-state");
    const transport = new FakeRunnerJoinTransport();
    process.env.ENTANGLE_RUNNER_NOSTR_SECRET_KEY = runnerSecretHex;
    process.env.ENTANGLE_RUNNER_STATE_ROOT = runnerStateRoot;

    const configured = await createConfiguredRunnerJoinService(
      fixture.configPath,
      {
        clock: () => "2026-04-26T12:00:00.000Z",
        nonceFactory: () => "nonce-alpha",
        transport
      }
    );

    await configured.service.start();
    const assignment = buildAssignment();
    await transport.dispatch(buildAssignmentOfferEvent(assignment));

    expect(transport.observations.map((payload) => payload.eventType)).toEqual([
      "runner.hello",
      "assignment.receipt",
      "assignment.accepted"
    ]);
    expect(configured.service.getAcceptedAssignments()).toHaveLength(1);

    const assignmentPath = path.join(
      runnerStateRoot,
      "assignments",
      "assignment-alpha",
      "assignment.json"
    );
    const materializationPath = path.join(
      runnerStateRoot,
      "assignments",
      "assignment-alpha",
      "materialization.json"
    );
    expect(JSON.parse(await readFile(assignmentPath, "utf8"))).toMatchObject({
      assignmentId: assignment.assignmentId,
      runnerId: assignment.runnerId
    });
    expect(JSON.parse(await readFile(materializationPath, "utf8"))).toMatchObject({
      assignment: {
        assignmentId: assignment.assignmentId
      },
      schemaVersion: "1"
    });

    await configured.service.stop();
  });

  it("fetches Host runtime context when join config declares a Host API", async () => {
    const runtimeFixture = await createRuntimeFixture();
    const fixture = await createRunnerJoinFixture({
      hostApi: {
        auth: {
          envVar: "ENTANGLE_HOST_TOKEN",
          mode: "bearer_env"
        },
        baseUrl: "http://host.test"
      }
    });
    const runnerStateRoot = path.join(path.dirname(fixture.configPath), "runner-state");
    const transport = new FakeRunnerJoinTransport();
    const fetchMock = vi.fn(
      (url: string | URL | Request, init?: RequestInit) => {
        const requestUrl = url instanceof Request ? url.url : url.toString();

        expect(requestUrl).toBe("http://host.test/v1/runtimes/worker-it/context");
        expect(init?.headers).toMatchObject({
          accept: "application/json",
          authorization: "Bearer host-token"
        });

        return Promise.resolve(
          new Response(JSON.stringify(runtimeFixture.context), {
            headers: {
              "content-type": "application/json"
            },
            status: 200
          })
        );
      }
    );
    process.env.ENTANGLE_HOST_TOKEN = "host-token";
    process.env.ENTANGLE_RUNNER_NOSTR_SECRET_KEY = runnerSecretHex;
    process.env.ENTANGLE_RUNNER_STATE_ROOT = runnerStateRoot;
    vi.stubGlobal("fetch", fetchMock);

    const configured = await createConfiguredRunnerJoinService(
      fixture.configPath,
      {
        clock: () => "2026-04-26T12:00:00.000Z",
        nonceFactory: () => "nonce-alpha",
        transport
      }
    );

    await configured.service.start();
    await transport.dispatch(buildAssignmentOfferEvent(buildAssignment()));

    const hostRuntimeContextPath = path.join(
      runnerStateRoot,
      "assignments",
      "assignment-alpha",
      "host-runtime-context.json"
    );
    expect(JSON.parse(await readFile(hostRuntimeContextPath, "utf8"))).toMatchObject({
      binding: {
        node: {
          nodeId: "worker-it"
        }
      },
      schemaVersion: "1"
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await configured.service.stop();
  });
});
