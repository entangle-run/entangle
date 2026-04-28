import { afterEach, describe, expect, it, vi } from "vitest";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import path from "node:path";
import type { AgentEngine } from "@entangle/agent-engine";
import type {
  EffectiveRuntimeContext,
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
import { startHumanInterfaceRuntime } from "./human-interface-runtime.js";
import type { RunnerJoinTransport } from "./join-service.js";
import { InMemoryRunnerTransport } from "./transport.js";

afterEach(async () => {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("ENTANGLE_NODE_IDENTITY_")) {
      delete process.env[key];
    }
  }

  delete process.env.ENTANGLE_NOSTR_SECRET_KEY;
  delete process.env.ENTANGLE_RUNNER_JOIN_CONFIG_JSON;
  delete process.env.ENTANGLE_RUNNER_JOIN_CONFIG_PATH;
  delete process.env.ENTANGLE_RUNNER_NOSTR_SECRET_KEY;
  delete process.env.ENTANGLE_RUNNER_STATE_ROOT;
  delete process.env.ENTANGLE_HOST_TOKEN;
  delete process.env.ENTANGLE_HUMAN_INTERFACE_PUBLIC_URL;
  delete process.env.ENTANGLE_USER_CLIENT_STATIC_DIR;
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

function buildRuntimeBootstrapBundle(context: EffectiveRuntimeContext) {
  return {
    graphId: context.binding.graphId,
    graphRevisionId: context.binding.graphRevisionId,
    nodeId: context.binding.node.nodeId,
    runtimeContext: context,
    schemaVersion: "1",
    snapshots: []
  };
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

function buildRuntimeStartEvent(assignment: RuntimeAssignmentRecord): EntangleControlEvent {
  return {
    envelope: {
      createdAt: "2026-04-26T12:00:01.000Z",
      eventId: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      payloadHash:
        "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      protocol: "entangle.control.v1",
      recipientPubkey: runnerPublicKey,
      schemaVersion: "1",
      signature:
        "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      signerPubkey: hostPublicKey
    },
    payload: {
      assignmentId: assignment.assignmentId,
      commandId: "cmd-start-alpha",
      eventType: "runtime.start",
      graphId: assignment.graphId,
      hostAuthorityPubkey: hostPublicKey,
      issuedAt: "2026-04-26T12:00:01.000Z",
      nodeId: assignment.nodeId,
      protocol: "entangle.control.v1",
      reason: "Operator start",
      runnerId: assignment.runnerId,
      runnerPubkey: runnerPublicKey
    }
  };
}

function buildRuntimeStopEvent(assignment: RuntimeAssignmentRecord): EntangleControlEvent {
  return {
    envelope: {
      createdAt: "2026-04-26T12:00:02.000Z",
      eventId: "1111111111111111111111111111111111111111111111111111111111111111",
      payloadHash:
        "2222222222222222222222222222222222222222222222222222222222222222",
      protocol: "entangle.control.v1",
      recipientPubkey: runnerPublicKey,
      schemaVersion: "1",
      signature:
        "33333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333",
      signerPubkey: hostPublicKey
    },
    payload: {
      assignmentId: assignment.assignmentId,
      commandId: "cmd-stop-alpha",
      eventType: "runtime.stop",
      graphId: assignment.graphId,
      hostAuthorityPubkey: hostPublicKey,
      issuedAt: "2026-04-26T12:00:02.000Z",
      nodeId: assignment.nodeId,
      protocol: "entangle.control.v1",
      reason: "Operator stop",
      runnerId: assignment.runnerId,
      runnerPubkey: runnerPublicKey
    }
  };
}

function buildRuntimeRestartEvent(
  assignment: RuntimeAssignmentRecord
): EntangleControlEvent {
  return {
    envelope: {
      createdAt: "2026-04-26T12:00:03.000Z",
      eventId: "4444444444444444444444444444444444444444444444444444444444444444",
      payloadHash:
        "5555555555555555555555555555555555555555555555555555555555555555",
      protocol: "entangle.control.v1",
      recipientPubkey: runnerPublicKey,
      schemaVersion: "1",
      signature:
        "66666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666",
      signerPubkey: hostPublicKey
    },
    payload: {
      assignmentId: assignment.assignmentId,
      commandId: "cmd-restart-alpha",
      eventType: "runtime.restart",
      graphId: assignment.graphId,
      hostAuthorityPubkey: hostPublicKey,
      issuedAt: "2026-04-26T12:00:03.000Z",
      nodeId: assignment.nodeId,
      protocol: "entangle.control.v1",
      reason: "Operator restart",
      runnerId: assignment.runnerId,
      runnerPubkey: runnerPublicKey
    }
  };
}

function buildRuntimeSessionCancelEvent(
  assignment: RuntimeAssignmentRecord
): EntangleControlEvent {
  return {
    envelope: {
      createdAt: "2026-04-26T12:00:04.000Z",
      eventId: "7777777777777777777777777777777777777777777777777777777777777777",
      payloadHash:
        "8888888888888888888888888888888888888888888888888888888888888888",
      protocol: "entangle.control.v1",
      recipientPubkey: runnerPublicKey,
      schemaVersion: "1",
      signature:
        "99999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999",
      signerPubkey: hostPublicKey
    },
    payload: {
      assignmentId: assignment.assignmentId,
      cancellation: {
        cancellationId: "cancel-alpha",
        graphId: assignment.graphId,
        nodeId: assignment.nodeId,
        requestedAt: "2026-04-26T12:00:04.000Z",
        sessionId: "session-alpha",
        status: "requested"
      },
      commandId: "cmd-cancel-alpha",
      eventType: "runtime.session.cancel",
      graphId: assignment.graphId,
      hostAuthorityPubkey: hostPublicKey,
      issuedAt: "2026-04-26T12:00:04.000Z",
      nodeId: assignment.nodeId,
      protocol: "entangle.control.v1",
      reason: "Operator cancellation",
      runnerId: assignment.runnerId,
      runnerPubkey: runnerPublicKey,
      sessionId: "session-alpha"
    }
  };
}

function buildRuntimeSourceHistoryPublishEvent(
  assignment: RuntimeAssignmentRecord
): EntangleControlEvent {
  return {
    envelope: {
      createdAt: "2026-04-26T12:00:05.000Z",
      eventId: "abababababababababababababababababababababababababababababababab",
      payloadHash:
        "cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd",
      protocol: "entangle.control.v1",
      recipientPubkey: runnerPublicKey,
      schemaVersion: "1",
      signature:
        "efefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefef",
      signerPubkey: hostPublicKey
    },
    payload: {
      assignmentId: assignment.assignmentId,
      commandId: "cmd-source-history-publish-alpha",
      eventType: "runtime.source_history.publish",
      graphId: assignment.graphId,
      hostAuthorityPubkey: hostPublicKey,
      issuedAt: "2026-04-26T12:00:05.000Z",
      nodeId: assignment.nodeId,
      protocol: "entangle.control.v1",
      reason: "Retry publication",
      requestedBy: "operator-main",
      retryFailedPublication: true,
      runnerId: assignment.runnerId,
      runnerPubkey: runnerPublicKey,
      sourceHistoryId: "source-history-alpha"
    }
  };
}

function buildRuntimeSourceHistoryReplayEvent(
  assignment: RuntimeAssignmentRecord
): EntangleControlEvent {
  return {
    envelope: {
      createdAt: "2026-04-26T12:00:06.000Z",
      eventId: "adadadadadadadadadadadadadadadadadadadadadadadadadadadadadadadad",
      payloadHash:
        "cececececececececececececececececececececececececececececececece",
      protocol: "entangle.control.v1",
      recipientPubkey: runnerPublicKey,
      schemaVersion: "1",
      signature:
        "edededededededededededededededededededededededededededededededededededededededededededededededededededededededededededededededed",
      signerPubkey: hostPublicKey
    },
    payload: {
      approvalId: "approval-source-history-replay-alpha",
      assignmentId: assignment.assignmentId,
      commandId: "cmd-source-history-replay-alpha",
      eventType: "runtime.source_history.replay",
      graphId: assignment.graphId,
      hostAuthorityPubkey: hostPublicKey,
      issuedAt: "2026-04-26T12:00:06.000Z",
      nodeId: assignment.nodeId,
      protocol: "entangle.control.v1",
      reason: "Replay source history",
      replayedBy: "operator-main",
      replayId: "replay-source-history-alpha",
      runnerId: assignment.runnerId,
      runnerPubkey: runnerPublicKey,
      sourceHistoryId: "source-history-alpha"
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

  it("starts a Human Interface Runtime as a local User Node client", async () => {
    const fixture = await createRuntimeFixture();
    const context: EffectiveRuntimeContext = {
      ...fixture.context,
      agentRuntimeContext: {
        ...fixture.context.agentRuntimeContext,
        mode: "disabled"
      },
      binding: {
        ...fixture.context.binding,
        node: {
          ...fixture.context.binding.node,
          displayName: "User",
          nodeId: "user-main",
          nodeKind: "user"
        }
      }
    };
    const handle = await startHumanInterfaceRuntime({
      context
    });

    try {
      const response = await fetch(new URL("/health", handle.clientUrl));
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        nodeId: "user-main",
        ok: true,
        runtimeKind: "human_interface"
      });
    } finally {
      await handle.stop();
    }
  });

  it("can serve a dedicated User Client static bundle when configured", async () => {
    const fixture = await createRuntimeFixture();
    const staticRoot = path.join(fixture.context.workspace.root, "user-client");
    await mkdir(path.join(staticRoot, "assets"), { recursive: true });
    await Promise.all([
      writeFile(
        path.join(staticRoot, "index.html"),
        "<!doctype html><title>Dedicated User Client</title><div id=\"root\"></div>",
        "utf8"
      ),
      writeFile(
        path.join(staticRoot, "assets", "app.js"),
        "globalThis.__entangleUserClient = true;\n",
        "utf8"
      )
    ]);
    process.env.ENTANGLE_USER_CLIENT_STATIC_DIR = staticRoot;
    const context: EffectiveRuntimeContext = {
      ...fixture.context,
      agentRuntimeContext: {
        ...fixture.context.agentRuntimeContext,
        mode: "disabled"
      },
      binding: {
        ...fixture.context.binding,
        node: {
          ...fixture.context.binding.node,
          displayName: "User",
          nodeId: "user-main",
          nodeKind: "user"
        }
      }
    };
    const handle = await startHumanInterfaceRuntime({
      context
    });

    try {
      const indexResponse = await fetch(new URL("/", handle.clientUrl));
      expect(indexResponse.status).toBe(200);
      expect(indexResponse.headers.get("content-type")).toContain("text/html");
      expect(await indexResponse.text()).toContain("Dedicated User Client");

      const assetResponse = await fetch(
        new URL("/assets/app.js", handle.clientUrl)
      );
      expect(assetResponse.status).toBe(200);
      expect(assetResponse.headers.get("content-type")).toContain(
        "text/javascript"
      );
      expect(await assetResponse.text()).toContain("__entangleUserClient");

      const stateResponse = await fetch(new URL("/api/state", handle.clientUrl));
      expect(stateResponse.status).toBe(200);
      await expect(stateResponse.json()).resolves.toMatchObject({
        userNodeId: "user-main"
      });
    } finally {
      await handle.stop();
    }
  });

  it("serves User Node inbox state and publishes selected conversation messages", async () => {
    const fixture = await createRuntimeFixture();
    const hostRequests: Array<{
      authorization?: string;
      body?: unknown;
      method: string;
      url: string;
    }> = [];
    let conversationUnreadCount = 1;
    const sourceChangeCandidate = (
      status: "pending_review" | "accepted" | "rejected" = "pending_review",
      review?: {
        decidedAt: string;
        decidedBy: string;
        decision: "accepted" | "rejected";
        reason: string;
      }
    ) => ({
      candidateId: "source-change-turn-alpha",
      conversationId: "conversation-alpha",
      createdAt: "2026-04-26T12:02:00.000Z",
      graphId: "graph-alpha",
      nodeId: "worker-it",
      ...(review ? { review } : {}),
      sessionId: "session-alpha",
      sourceChangeSummary: {
        additions: 3,
        checkedAt: "2026-04-26T12:02:00.000Z",
        deletions: 1,
        fileCount: 1,
        files: [
          {
            additions: 3,
            deletions: 1,
            path: "src/index.ts",
            status: "modified"
          }
        ],
        status: "changed",
        truncated: false
      },
      status,
      turnId: "turn-approval",
      updatedAt:
        status === "pending_review"
          ? "2026-04-26T12:02:00.000Z"
          : "2026-04-26T12:04:00.000Z"
    });
    const hostServer = createServer((request, response) => {
      void (async () => {
        const chunks: Buffer[] = [];

        for await (const chunk of request as AsyncIterable<Uint8Array | string>) {
          chunks.push(
            typeof chunk === "string"
              ? Buffer.from(chunk, "utf8")
              : Buffer.from(chunk)
          );
        }

        const rawBody = Buffer.concat(chunks).toString("utf8");
        const authorization =
          typeof request.headers.authorization === "string"
            ? request.headers.authorization
            : undefined;
        const requestRecord = {
          ...(authorization ? { authorization } : {}),
          ...(rawBody ? { body: JSON.parse(rawBody) as unknown } : {}),
          method: request.method ?? "GET",
          url: request.url ?? "/"
        };
        hostRequests.push(requestRecord);
        response.setHeader("content-type", "application/json; charset=utf-8");

        if (request.method === "GET" && request.url === "/v1/projection") {
          response.end(
            JSON.stringify({
              artifactRefs: [
                {
                  artifactId: "artifact-alpha",
                  artifactPreview: {
                    available: true,
                    bytesRead: 28,
                    content: "Projected report preview body.",
                    contentEncoding: "utf8",
                    contentType: "text/markdown",
                    truncated: false
                  },
                  artifactRef: {
                    artifactId: "artifact-alpha",
                    artifactKind: "report_file",
                    backend: "git",
                    contentSummary: "Review report.",
                    locator: {
                      branch: "main",
                      commit: "abc123",
                      path: "reports/review.md",
                      repositoryName: "worker-artifacts"
                    },
                    status: "materialized"
                  },
                  graphId: "graph-alpha",
                  hostAuthorityPubkey: hostPublicKey,
                  nodeId: "worker-it",
                  projection: {
                    source: "observation_event",
                    updatedAt: "2026-04-26T12:02:00.000Z"
                  },
                  runnerId: "runner-alpha",
                  runnerPubkey: remotePublicKey
                }
              ],
              generatedAt: "2026-04-26T12:02:00.000Z",
              hostAuthorityPubkey: hostPublicKey,
              schemaVersion: "1",
              sourceChangeRefs: [
                {
                  artifactRefs: [],
                  candidateId: "source-change-turn-alpha",
                  graphId: "graph-alpha",
                  hostAuthorityPubkey: hostPublicKey,
                  nodeId: "worker-it",
                  projection: {
                    source: "observation_event",
                    updatedAt: "2026-04-26T12:02:00.000Z"
                  },
                  runnerId: "runner-alpha",
                  runnerPubkey: remotePublicKey,
                  sourceChangeSummary: {
                    additions: 3,
                    checkedAt: "2026-04-26T12:02:00.000Z",
                    deletions: 1,
                    diffExcerpt:
                      "diff --git a/src/index.ts b/src/index.ts\n+projected behavior\n-old behavior\n",
                    fileCount: 1,
                    files: [
                      {
                        additions: 3,
                        deletions: 1,
                        path: "src/index.ts",
                        status: "modified"
                      }
                    ],
                    status: "changed",
                    truncated: false
                  },
                  status: "pending_review"
                }
              ],
              wikiRefs: [
                {
                  artifactId: "wiki-alpha",
                  artifactPreview: {
                    available: true,
                    bytesRead: 34,
                    content: "# Working Context\n\nReady for review.",
                    contentEncoding: "utf8",
                    contentType: "text/markdown",
                    truncated: false
                  },
                  artifactRef: {
                    artifactId: "wiki-alpha",
                    artifactKind: "knowledge_summary",
                    backend: "wiki",
                    contentSummary: "Wiki repository committed at abc123.",
                    locator: {
                      nodeId: "worker-it",
                      path: "/wiki/summaries/working-context.md"
                    },
                    status: "materialized"
                  },
                  graphId: "graph-alpha",
                  hostAuthorityPubkey: hostPublicKey,
                  nodeId: "worker-it",
                  projection: {
                    source: "observation_event",
                    updatedAt: "2026-04-26T12:02:30.000Z"
                  },
                  runnerId: "runner-alpha",
                  runnerPubkey: remotePublicKey
                }
              ]
            })
          );
          return;
        }

        if (
          request.method === "GET" &&
          request.url === "/v1/user-nodes/user-main/inbox"
        ) {
          response.end(
            JSON.stringify({
              conversations: [
                {
                  conversationId: "conversation-alpha",
                  graphId: "graph-alpha",
                  lastMessageAt: "2026-04-26T12:01:00.000Z",
                  lastMessageType: "question",
                  peerNodeId: "worker-it",
                  projection: {
                    source: "observation_event",
                    updatedAt: "2026-04-26T12:01:00.000Z"
                  },
                  sessionId: "session-alpha",
                  status: "working",
                  unreadCount: conversationUnreadCount,
                  userNodeId: "user-main"
                }
              ],
              generatedAt: "2026-04-26T12:02:00.000Z",
              userNodeId: "user-main"
            })
          );
          return;
        }

        if (
          request.method === "GET" &&
          request.url === "/v1/user-nodes/user-main/inbox/conversation-alpha"
        ) {
          response.end(
            JSON.stringify({
              conversationId: "conversation-alpha",
              generatedAt: "2026-04-26T12:03:00.000Z",
              messages: [
                {
                  conversationId: "conversation-alpha",
                  createdAt: "2026-04-26T12:01:00.000Z",
                  direction: "outbound",
                  deliveryErrors: [],
                  deliveryStatus: "published",
                  eventId:
                    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                  fromNodeId: "user-main",
                  fromPubkey: runnerPublicKey,
                  messageType: "question",
                  peerNodeId: "worker-it",
                  publishedRelays: ["ws://strfry:7777"],
                  relayUrls: ["ws://strfry:7777"],
                  schemaVersion: "1",
                  sessionId: "session-alpha",
                  summary: "Previous user message.",
                  toNodeId: "worker-it",
                  toPubkey: remotePublicKey,
                  turnId: "turn-alpha",
                  userNodeId: "user-main"
                },
                {
                  conversationId: "conversation-alpha",
                  createdAt: "2026-04-26T12:01:30.000Z",
                  direction: "outbound",
                  deliveryErrors: [
                    {
                      message: "connection failed",
                      relayUrl: "ws://strfry:7777"
                    }
                  ],
                  deliveryStatus: "failed",
                  eventId:
                    "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
                  fromNodeId: "user-main",
                  fromPubkey: runnerPublicKey,
                  messageType: "question",
                  parentMessageId:
                    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                  peerNodeId: "worker-it",
                  publishedRelays: [],
                  relayUrls: ["ws://strfry:7777"],
                  schemaVersion: "1",
                  sessionId: "session-alpha",
                  summary: "Failed user message.",
                  toNodeId: "worker-it",
                  toPubkey: remotePublicKey,
                  turnId: "turn-failed",
                  userNodeId: "user-main"
                },
                {
                  approval: {
                    approvalId: "approval-alpha",
                    approverNodeIds: ["user-main"],
                    operation: "source_application",
                    resource: {
                      id: "source-change-turn-alpha",
                      kind: "source_change_candidate",
                      label: "source-change-turn-alpha"
                    }
                  },
                  artifactRefs: [
                    {
                      artifactId: "artifact-alpha",
                      artifactKind: "report_file",
                      backend: "git",
                      contentSummary: "Review report.",
                      locator: {
                        branch: "main",
                        commit: "abc123",
                        path: "reports/review.md",
                        repositoryName: "worker-artifacts"
                      }
                    }
                  ],
                  conversationId: "conversation-alpha",
                  createdAt: "2026-04-26T12:02:00.000Z",
                  direction: "inbound",
                  eventId:
                    "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
                  fromNodeId: "worker-it",
                  fromPubkey: remotePublicKey,
                  messageType: "approval.request",
                  parentMessageId:
                    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                  peerNodeId: "worker-it",
                  publishedRelays: [],
                  relayUrls: [],
                  schemaVersion: "1",
                  sessionId: "session-alpha",
                  summary: "Approve source application.",
                  toNodeId: "user-main",
                  toPubkey: runnerPublicKey,
                  turnId: "turn-approval",
                  userNodeId: "user-main"
                },
                {
                  approval: {
                    approvalId: "approval-wiki",
                    approverNodeIds: ["user-main"],
                    operation: "wiki_update",
                    resource: {
                      id: "worker-it",
                      kind: "wiki_repository",
                      label: "worker-it wiki"
                    }
                  },
                  conversationId: "conversation-alpha",
                  createdAt: "2026-04-26T12:02:30.000Z",
                  direction: "inbound",
                  eventId:
                    "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                  fromNodeId: "worker-it",
                  fromPubkey: remotePublicKey,
                  messageType: "approval.request",
                  peerNodeId: "worker-it",
                  publishedRelays: [],
                  relayUrls: [],
                  schemaVersion: "1",
                  sessionId: "session-alpha",
                  summary: "Review wiki memory update.",
                  toNodeId: "user-main",
                  toPubkey: runnerPublicKey,
                  turnId: "turn-wiki",
                  userNodeId: "user-main"
                }
              ],
              userNodeId: "user-main"
            })
          );
          return;
        }

        if (
          request.method === "POST" &&
          request.url === "/v1/user-nodes/user-main/inbox/conversation-alpha/read"
        ) {
          conversationUnreadCount = 0;
          response.end(
            JSON.stringify({
              conversation: {
                conversationId: "conversation-alpha",
                graphId: "graph-alpha",
                lastReadAt: "2026-04-26T12:05:00.000Z",
                peerNodeId: "worker-it",
                projection: {
                  source: "observation_event",
                  updatedAt: "2026-04-26T12:05:00.000Z"
                },
                unreadCount: 0,
                userNodeId: "user-main"
              },
              read: {
                conversationId: "conversation-alpha",
                readAt: "2026-04-26T12:05:00.000Z",
                userNodeId: "user-main"
              }
            })
          );
          return;
        }

        if (
          request.method === "GET" &&
          request.url ===
            "/v1/runtimes/worker-it/source-change-candidates/source-change-turn-alpha/diff"
        ) {
          response.end(
            JSON.stringify({
              candidate: sourceChangeCandidate(),
              diff: {
                available: true,
                bytesRead: 51,
                content:
                  "diff --git a/src/index.ts b/src/index.ts\n+new behavior\n-old behavior\n",
                contentEncoding: "utf8",
                contentType: "text/x-diff",
                truncated: false
              }
            })
          );
          return;
        }

        if (
          request.method === "GET" &&
          request.url ===
            "/v1/runtimes/worker-it/artifacts/artifact-alpha/preview"
        ) {
          response.end(
            JSON.stringify({
              artifact: {
                createdAt: "2026-04-26T12:02:00.000Z",
                ref: {
                  artifactId: "artifact-alpha",
                  artifactKind: "report_file",
                  backend: "git",
                  contentSummary: "Review report.",
                  locator: {
                    branch: "main",
                    commit: "abc123",
                    path: "reports/review.md",
                    repositoryName: "worker-artifacts"
                  },
                  status: "materialized"
                },
                updatedAt: "2026-04-26T12:02:00.000Z"
              },
              preview: {
                available: true,
                bytesRead: 27,
                content: "Review report preview body.",
                contentEncoding: "utf8",
                contentType: "text/markdown",
                sourcePath: "/runtime/worker-it/artifacts/reports/review.md",
                truncated: false
              }
            })
          );
          return;
        }

        if (
          request.method === "POST" &&
          request.url === "/v1/user-nodes/user-main/messages"
        ) {
          const body = requestRecord.body as
            | { messageType?: string; targetNodeId?: string }
            | undefined;
          response.end(
            JSON.stringify({
              conversationId: "conversation-alpha",
              eventId:
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              fromNodeId: "user-main",
              fromPubkey: runnerPublicKey,
              messageType: body?.messageType ?? "answer",
              publishedRelays: ["ws://strfry:7777"],
              relayUrls: ["ws://strfry:7777"],
              sessionId: "session-alpha",
              targetNodeId: body?.targetNodeId ?? "worker-it",
              toPubkey: remotePublicKey,
              turnId: "turn-alpha"
            })
          );
          return;
        }

        if (
          request.method === "POST" &&
          request.url === "/v1/user-nodes/user-main/messages/inbound"
        ) {
          response.end(
            JSON.stringify({
              conversationId: "conversation-alpha",
              createdAt: "2026-04-26T12:04:00.000Z",
              direction: "inbound",
              eventId:
                "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
              fromNodeId: "worker-it",
              fromPubkey: remotePublicKey,
              messageType: "task.result",
              peerNodeId: "worker-it",
              publishedRelays: [],
              relayUrls: [],
              schemaVersion: "1",
              sessionId: "session-alpha",
              summary: "Inbound worker result.",
              toNodeId: "user-main",
              toPubkey: runnerPublicKey,
              turnId: "turn-result",
              userNodeId: "user-main"
            })
          );
          return;
        }

        response.statusCode = 404;
        response.end(JSON.stringify({ error: "not_found" }));
      })();
    });

    await new Promise<void>((resolve, reject) => {
      hostServer.once("error", reject);
      hostServer.listen(0, "127.0.0.1", () => {
        hostServer.off("error", reject);
        resolve();
      });
    });

    const hostAddress = hostServer.address() as AddressInfo;
    const context: EffectiveRuntimeContext = {
      ...fixture.context,
      agentRuntimeContext: {
        ...fixture.context.agentRuntimeContext,
        mode: "disabled"
      },
      binding: {
        ...fixture.context.binding,
        node: {
          ...fixture.context.binding.node,
          displayName: "User",
          nodeId: "user-main",
          nodeKind: "user"
        }
      },
      relayContext: {
        ...fixture.context.relayContext,
        edgeRoutes: [
          {
            channel: "a2a",
            edgeId: "user-to-worker",
            peerNodeId: "worker-it",
            peerPubkey: remotePublicKey,
            relation: "delegates_to",
            relayProfileRefs: ["preview-relay"]
          }
        ]
      }
    };
    process.env.ENTANGLE_HOST_TOKEN = "host-secret";
    const transport = new InMemoryRunnerTransport();
    const handle = await startHumanInterfaceRuntime({
      context,
      hostApi: {
        auth: {
          envVar: "ENTANGLE_HOST_TOKEN",
          mode: "bearer_env"
        },
        baseUrl: `http://127.0.0.1:${hostAddress.port}`
      },
      transport
    });

    try {
      await transport.publish({
        constraints: {
          approvalRequiredBeforeAction: false
        },
        conversationId: "conversation-alpha",
        fromNodeId: "worker-it",
        fromPubkey: remotePublicKey,
        graphId: context.binding.graphId,
        intent: "Send a result to the user.",
        messageType: "task.result",
        parentMessageId:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        protocol: "entangle.a2a.v1",
        responsePolicy: {
          closeOnResult: true,
          maxFollowups: 0,
          responseRequired: false
        },
        sessionId: "session-alpha",
        toNodeId: "user-main",
        toPubkey: context.identityContext.publicKey,
        turnId: "turn-result",
        work: {
          artifactRefs: [],
          metadata: {},
          summary: "Inbound worker result."
        }
      });

      const stateResponse = await fetch(new URL("/api/state", handle.clientUrl));
      expect(stateResponse.status).toBe(200);
      const stateBody = await stateResponse.json();
      expect(stateBody).toMatchObject({
        conversations: [
          {
            conversationId: "conversation-alpha",
            peerNodeId: "worker-it"
          }
        ],
        targets: [
          {
            nodeId: "worker-it"
          }
        ],
        wikiRefs: [
          {
            artifactId: "wiki-alpha",
            nodeId: "worker-it"
          }
        ],
        runtime: {
          hostApiBaseUrl: `http://127.0.0.1:${hostAddress.port}`,
          hostApiConfigured: true,
          identityPublicKey: runnerPublicKey,
          primaryRelayProfileRef: "preview-relay",
          relayUrls: ["ws://strfry:7777"]
        },
        userNodeId: "user-main"
      });

      const conversationApiResponse = await fetch(
        new URL("/api/conversations/conversation-alpha", handle.clientUrl)
      );
      expect(conversationApiResponse.status).toBe(200);
      const conversationApiBody = (await conversationApiResponse.json()) as {
        conversationId: string;
        messages: Array<{
          direction: string;
          messageType: string;
          summary: string;
        }>;
        userNodeId: string;
      };
      expect(conversationApiBody).toMatchObject({
        conversationId: "conversation-alpha",
        userNodeId: "user-main"
      });
      expect(
        conversationApiBody.messages.find(
          (message) =>
            message.direction === "outbound" &&
            message.summary === "Previous user message."
        )
      ).toBeDefined();
      expect(
        conversationApiBody.messages.find(
          (message) =>
            message.direction === "inbound" &&
            message.messageType === "approval.request" &&
            message.summary === "Approve source application."
        )
      ).toBeDefined();

      const jsonPublishResponse = await fetch(
        new URL("/api/messages", handle.clientUrl),
        {
          body: JSON.stringify({
            conversationId: "conversation-alpha",
            messageType: "answer",
            sessionId: "session-alpha",
            summary: "The JSON client answer is ready.",
            targetNodeId: "worker-it"
          }),
          headers: {
            "content-type": "application/json"
          },
          method: "POST"
        }
      );
      expect(jsonPublishResponse.status).toBe(200);
      await expect(jsonPublishResponse.json()).resolves.toMatchObject({
        conversationId: "conversation-alpha",
        messageType: "answer",
        targetNodeId: "worker-it"
      });

      const jsonArtifactPreviewResponse = await fetch(
        new URL(
          "/api/artifacts/preview?nodeId=worker-it&artifactId=artifact-alpha",
          handle.clientUrl
        )
      );
      expect(jsonArtifactPreviewResponse.status).toBe(200);
      await expect(jsonArtifactPreviewResponse.json()).resolves.toMatchObject({
        artifact: {
          artifactId: "artifact-alpha",
          backend: "git"
        },
        nodeId: "worker-it",
        preview: {
          available: true,
          content: "Projected report preview body."
        },
        source: "projection"
      });

      const jsonSourceDiffResponse = await fetch(
        new URL(
          "/api/source-change-candidates/diff?nodeId=worker-it&candidateId=source-change-turn-alpha",
          handle.clientUrl
        )
      );
      expect(jsonSourceDiffResponse.status).toBe(200);
      const jsonSourceDiffBody = (await jsonSourceDiffResponse.json()) as {
        diff: {
          content?: string;
        };
        source: string;
        status: string;
      };
      expect(jsonSourceDiffBody).toMatchObject({
        candidateId: "source-change-turn-alpha",
        diff: {
          available: true
        },
        nodeId: "worker-it",
        source: "projection",
        status: "pending_review"
      });
      expect(jsonSourceDiffBody.diff.content).toContain("+projected behavior");

      const jsonSourceReviewResponse = await fetch(
        new URL("/api/source-change-candidates/review", handle.clientUrl),
        {
          body: JSON.stringify({
            candidateId: "source-change-turn-alpha",
            conversationId: "conversation-alpha",
            nodeId: "worker-it",
            parentMessageId:
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            reason: "JSON review rejected.",
            sessionId: "session-alpha",
            status: "rejected",
            turnId: "turn-alpha"
          }),
          headers: {
            "content-type": "application/json"
          },
          method: "POST"
        }
      );
      expect(jsonSourceReviewResponse.status).toBe(200);
      await expect(jsonSourceReviewResponse.json()).resolves.toMatchObject({
        conversationId: "conversation-alpha",
        messageType: "source_change.review",
        targetNodeId: "worker-it"
      });
      const sourceReviewHostRequest = hostRequests.find(
        (record) =>
          record.method === "POST" &&
          record.url === "/v1/user-nodes/user-main/messages" &&
          typeof record.body === "object" &&
          record.body !== null &&
          "sourceChangeReview" in record.body
      );
      expect(sourceReviewHostRequest?.body).toMatchObject({
        messageType: "source_change.review",
        parentMessageId:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        sourceChangeReview: {
          candidateId: "source-change-turn-alpha",
          decision: "rejected",
          reason: "JSON review rejected."
        },
        targetNodeId: "worker-it"
      });

      const pageResponse = await fetch(
        new URL("/?conversationId=conversation-alpha", handle.clientUrl)
      );
      const pageBody = await pageResponse.text();
      expect(pageBody).toContain("conversation-alpha");
      expect(pageBody).toContain("data-live-status");
      expect(pageBody).toContain("Live state current");
      expect(pageBody).toContain(runnerPublicKey);
      expect(pageBody).toContain(`http://127.0.0.1:${hostAddress.port}`);
      expect(pageBody).toContain("ws://strfry:7777");
      expect(pageBody).toContain("Previous user message.");
      expect(pageBody).toContain("delivery published 1/1 relays");
      expect(pageBody).toContain("delivery failed 0/1 relays");
      expect(pageBody).toContain("Retry delivery");
      expect(pageBody).toContain("delivery received by User Client");
      expect(pageBody).toContain(
        "reply to bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
      );
      expect(pageBody).toContain("approval-alpha");
      expect(pageBody).toContain("approval-wiki");
      expect(pageBody).toContain("wiki_repository:worker-it");
      expect(pageBody.match(/Wiki repository committed at abc123\./g) ?? [])
        .toHaveLength(2);
      expect(pageBody).toContain("Ready for review.");
      expect(pageBody).toContain("/wiki/summaries/working-context.md");
      expect(pageBody).toContain("artifact-alpha");
      expect(pageBody).toContain("reports/review.md");
      expect(pageBody).toContain(
        "/artifacts/preview?nodeId=worker-it&amp;artifactId=artifact-alpha&amp;conversationId=conversation-alpha"
      );
      expect(pageBody).toContain("source_change_candidate:source-change-turn-alpha");
      expect(pageBody).toContain("3</strong> additions");
      expect(pageBody).toContain("modified src/index.ts +3 -1");
      expect(pageBody).toContain(
        "/source-change-candidates/diff?nodeId=worker-it&amp;candidateId=source-change-turn-alpha&amp;conversationId=conversation-alpha&amp;parentMessageId=dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd&amp;sessionId=session-alpha&amp;turnId=turn-approval"
      );
      expect(pageBody).toContain("Accept candidate");
      expect(pageBody).toContain("Reject candidate");
      expect(pageBody).toContain("Approve");

      const jsonReadResponse = await fetch(
        new URL("/api/conversations/conversation-alpha/read", handle.clientUrl),
        {
          method: "POST"
        }
      );
      expect(jsonReadResponse.status).toBe(200);
      await expect(jsonReadResponse.json()).resolves.toMatchObject({
        read: {
          conversationId: "conversation-alpha",
          userNodeId: "user-main"
        }
      });

      const sourceDiffResponse = await fetch(
        new URL(
          "/source-change-candidates/diff?nodeId=worker-it&candidateId=source-change-turn-alpha&conversationId=conversation-alpha&parentMessageId=dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd&sessionId=session-alpha&turnId=turn-approval",
          handle.clientUrl
        )
      );
      const sourceDiffBody = await sourceDiffResponse.text();
      expect(sourceDiffResponse.status).toBe(200);
      expect(sourceDiffBody).toContain("src/index.ts");
      expect(sourceDiffBody).toContain("projection excerpt");
      expect(sourceDiffBody).toContain("+projected behavior");
      expect(sourceDiffBody).toContain("Accept candidate");
      expect(sourceDiffBody).toContain("Reject candidate");
      expect(
        hostRequests.some(
          (record) =>
            record.url ===
            "/v1/runtimes/worker-it/source-change-candidates/source-change-turn-alpha/diff"
        )
      ).toBe(false);

      const sourceReviewResponse = await fetch(
        new URL("/source-change-candidates/review", handle.clientUrl),
        {
          body: new URLSearchParams({
            candidateId: "source-change-turn-alpha",
            conversationId: "conversation-alpha",
            nodeId: "worker-it",
            parentMessageId:
              "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
            reason: "Looks good for application.",
            sessionId: "session-alpha",
            status: "accepted",
            turnId: "turn-approval"
          }),
          headers: {
            "content-type": "application/x-www-form-urlencoded"
          },
          method: "POST"
        }
      );
      const sourceReviewBody = await sourceReviewResponse.text();
      expect(sourceReviewResponse.status).toBe(200);
      expect(sourceReviewBody).toContain("Published source review");

      const artifactPreviewResponse = await fetch(
        new URL(
          "/artifacts/preview?nodeId=worker-it&artifactId=artifact-alpha&conversationId=conversation-alpha",
          handle.clientUrl
        )
      );
      const artifactPreviewBody = await artifactPreviewResponse.text();
      expect(artifactPreviewResponse.status).toBe(200);
      expect(artifactPreviewBody).toContain("Projected report preview body.");
      expect(artifactPreviewBody).toContain("projection excerpt");
      expect(artifactPreviewBody).not.toContain(
        "/runtime/worker-it/artifacts/reports/review.md"
      );

      const publishResponse = await fetch(new URL("/messages", handle.clientUrl), {
        body: new URLSearchParams({
          conversationId: "conversation-alpha",
          messageType: "answer",
          sessionId: "session-alpha",
          summary: "The reviewed answer is ready.",
          targetNodeId: "worker-it"
        }),
        headers: {
          "content-type": "application/x-www-form-urlencoded"
        },
        method: "POST"
      });
      expect(publishResponse.status).toBe(200);

      const approvalResponse = await fetch(new URL("/messages", handle.clientUrl), {
        body: new URLSearchParams({
          approvalDecision: "approved",
          approvalId: "approval-alpha",
          approvalOperation: "source_application",
          approvalReason: "Approve source application.",
          approvalResourceId: "source-change-turn-alpha",
          approvalResourceKind: "source_change_candidate",
          approvalResourceLabel: "source-change-turn-alpha",
          conversationId: "conversation-alpha",
          messageType: "approval.response",
          parentMessageId:
            "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
          sessionId: "session-alpha",
          targetNodeId: "worker-it"
        }),
        headers: {
          "content-type": "application/x-www-form-urlencoded"
        },
        method: "POST"
      });
      expect(approvalResponse.status).toBe(200);
    } finally {
      await handle.stop();
      await new Promise<void>((resolve, reject) => {
        hostServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }

    expect(hostRequests).toContainEqual(
      expect.objectContaining({
        authorization: "Bearer host-secret",
        method: "GET",
        url: "/v1/user-nodes/user-main/inbox"
      })
    );
    expect(hostRequests).toContainEqual(
      expect.objectContaining({
        authorization: "Bearer host-secret",
        method: "POST",
        url: "/v1/user-nodes/user-main/inbox/conversation-alpha/read"
      })
    );
    expect(
      hostRequests.some(
        (request) =>
          request.method === "GET" &&
          request.url === "/v1/runtimes/worker-it/artifacts/artifact-alpha/preview"
      )
    ).toBe(false);
    expect(
      hostRequests.some(
        (request) =>
          request.method === "GET" &&
          request.url ===
            "/v1/runtimes/worker-it/source-change-candidates/source-change-turn-alpha/diff"
      )
    ).toBe(false);
    const sourceReviewRequest = hostRequests.find(
      (request) =>
        request.method === "POST" &&
        request.url === "/v1/user-nodes/user-main/messages" &&
        typeof request.body === "object" &&
        request.body !== null &&
        "sourceChangeReview" in request.body &&
        JSON.stringify(request.body).includes("Looks good for application.")
    );
    expect(sourceReviewRequest).toMatchObject({
      authorization: "Bearer host-secret"
    });
    expect(sourceReviewRequest?.body).toMatchObject({
      messageType: "source_change.review",
      sourceChangeReview: {
        candidateId: "source-change-turn-alpha",
        decision: "accepted",
        reason: "Looks good for application."
      },
      targetNodeId: "worker-it"
    });
    const jsonSourceReviewRequest = hostRequests.find(
      (request) =>
        request.method === "POST" &&
        request.url === "/v1/user-nodes/user-main/messages" &&
        typeof request.body === "object" &&
        request.body !== null &&
        "sourceChangeReview" in request.body &&
        JSON.stringify(request.body).includes("JSON review rejected.")
    );
    expect(jsonSourceReviewRequest?.body).toMatchObject({
      messageType: "source_change.review",
      sourceChangeReview: {
        candidateId: "source-change-turn-alpha",
        decision: "rejected",
        reason: "JSON review rejected."
      },
      targetNodeId: "worker-it"
    });
    const publishRequest = hostRequests.find(
      (request) =>
        request.method === "POST" &&
        request.url === "/v1/user-nodes/user-main/messages" &&
        (request.body as { messageType?: string } | undefined)?.messageType ===
          "answer" &&
        (request.body as { summary?: string } | undefined)?.summary ===
          "The reviewed answer is ready."
    );
    expect(publishRequest).toMatchObject({
      authorization: "Bearer host-secret"
    });
    expect(publishRequest?.body).toMatchObject({
      conversationId: "conversation-alpha",
      messageType: "answer",
      sessionId: "session-alpha",
      summary: "The reviewed answer is ready.",
      targetNodeId: "worker-it"
    });
    const jsonPublishRequest = hostRequests.find(
      (request) =>
        request.method === "POST" &&
        request.url === "/v1/user-nodes/user-main/messages" &&
        (request.body as { messageType?: string } | undefined)?.messageType ===
          "answer" &&
        (request.body as { summary?: string } | undefined)?.summary ===
          "The JSON client answer is ready."
    );
    expect(jsonPublishRequest?.body).toMatchObject({
      conversationId: "conversation-alpha",
      messageType: "answer",
      sessionId: "session-alpha",
      summary: "The JSON client answer is ready.",
      targetNodeId: "worker-it"
    });
    const readReceiptRequest = hostRequests.find(
      (request) =>
        request.method === "POST" &&
        request.url === "/v1/user-nodes/user-main/messages" &&
        (request.body as { messageType?: string } | undefined)?.messageType ===
          "read.receipt"
    );
    expect(readReceiptRequest?.body).toMatchObject({
      conversationId: "conversation-alpha",
      messageType: "read.receipt",
      parentMessageId:
        "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      responsePolicy: {
        closeOnResult: true,
        maxFollowups: 0,
        responseRequired: false
      },
      sessionId: "session-alpha",
      summary: "Read conversation-alpha.",
      targetNodeId: "worker-it"
    });
    const approvalPublishRequest = hostRequests.find(
      (request) =>
        request.method === "POST" &&
        request.url === "/v1/user-nodes/user-main/messages" &&
        (request.body as { messageType?: string } | undefined)?.messageType ===
          "approval.response"
    );
    expect(approvalPublishRequest?.body).toMatchObject({
      approval: {
        approvalId: "approval-alpha",
        decision: "approved",
        operation: "source_application",
        reason: "Approve source application.",
        resource: {
          id: "source-change-turn-alpha",
          kind: "source_change_candidate",
          label: "source-change-turn-alpha"
        }
      },
      conversationId: "conversation-alpha",
      messageType: "approval.response",
      parentMessageId:
        "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      sessionId: "session-alpha",
      summary: "Approved approval-alpha.",
      targetNodeId: "worker-it"
    });
    const inboundRequest = hostRequests.find(
      (request) =>
        request.method === "POST" &&
        request.url === "/v1/user-nodes/user-main/messages/inbound"
    );
    expect(inboundRequest).toMatchObject({
      authorization: "Bearer host-secret"
    });
    expect(inboundRequest?.body).toMatchObject({
      message: {
        fromNodeId: "worker-it",
        messageType: "task.result",
        toNodeId: "user-main"
      }
    });
    expect(
      (inboundRequest?.body as { message?: { work?: { summary?: string } } })
        .message?.work?.summary
    ).toBe("Inbound worker result.");
  });

  it("can advertise a configured public Human Interface Runtime URL", async () => {
    const fixture = await createRuntimeFixture();
    const context: EffectiveRuntimeContext = {
      ...fixture.context,
      agentRuntimeContext: {
        ...fixture.context.agentRuntimeContext,
        mode: "disabled"
      },
      binding: {
        ...fixture.context.binding,
        node: {
          ...fixture.context.binding.node,
          displayName: "User",
          nodeId: "user-main",
          nodeKind: "user"
        }
      }
    };
    process.env.ENTANGLE_HUMAN_INTERFACE_PUBLIC_URL =
      "https://user-main.example/client";
    const handle = await startHumanInterfaceRuntime({
      context
    });

    try {
      expect(handle.clientUrl).toBe("https://user-main.example/client");
    } finally {
      await handle.stop();
    }
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
        ENTANGLE_RUNNER_JOIN_CONFIG_JSON: JSON.stringify({
          schemaVersion: "1"
        })
      })
    ).toEqual({
      mode: "join"
    });
    expect(
      parseRunnerCliMode([], {
        ENTANGLE_RUNTIME_CONTEXT_PATH: "/tmp/context.json"
      })
    ).toEqual({
      mode: "runtime-context",
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

  it("starts generic federated join from inline env JSON", async () => {
    const fixture = await createRunnerJoinFixture();
    const abortController = new AbortController();
    const transport = new FakeRunnerJoinTransport();
    process.env.ENTANGLE_RUNNER_JOIN_CONFIG_JSON = JSON.stringify(fixture.config);
    process.env.ENTANGLE_RUNNER_NOSTR_SECRET_KEY = runnerSecretHex;

    abortController.abort();

    const result = await runGenericRunnerUntilSignal({
      abortSignal: abortController.signal,
      clock: () => "2026-04-26T12:00:00.000Z",
      nonceFactory: () => "nonce-alpha",
      transport
    });

    expect(result).toMatchObject({
      configPath: "ENTANGLE_RUNNER_JOIN_CONFIG_JSON",
      runnerId: "runner-alpha",
      runnerPubkey: runnerPublicKey
    });
    expect(transport.observations[0]).toMatchObject({
      eventType: "runner.hello",
      runnerId: "runner-alpha"
    });
  });

  it("emits periodic join heartbeats with accepted assignment ids", async () => {
    const fixture = await createRunnerJoinFixture({
      heartbeatIntervalMs: 1_000
    });
    const transport = new FakeRunnerJoinTransport();
    process.env.ENTANGLE_RUNNER_NOSTR_SECRET_KEY = runnerSecretHex;
    vi.useFakeTimers();

    const configured = await createConfiguredRunnerJoinService(
      fixture.configPath,
      {
        clock: () => "2026-04-26T12:00:00.000Z",
        materializer: ({ assignment }) =>
          Promise.resolve({
            accepted: true,
            ...(assignment.lease ? { lease: assignment.lease } : {})
          }),
        nonceFactory: () => "nonce-alpha",
        transport
      }
    );
    let stopped = false;

    try {
      await configured.service.start();

      expect(transport.observations.map((payload) => payload.eventType)).toEqual([
        "runner.hello"
      ]);

      await vi.advanceTimersByTimeAsync(1_000);

      expect(transport.observations.at(-1)).toMatchObject({
        assignmentIds: [],
        eventType: "runner.heartbeat",
        observedAt: "2026-04-26T12:00:00.000Z",
        operationalState: "ready",
        runnerId: "runner-alpha"
      });

      await transport.dispatch(buildAssignmentOfferEvent(buildAssignment()));
      await vi.advanceTimersByTimeAsync(1_000);

      expect(transport.observations.at(-1)).toMatchObject({
        assignmentIds: ["assignment-alpha"],
        eventType: "runner.heartbeat",
        observedAt: "2026-04-26T12:00:00.000Z",
        operationalState: "busy",
        runnerId: "runner-alpha"
      });

      await configured.service.stop();
      stopped = true;
      const observationCountAfterStop = transport.observations.length;

      await vi.advanceTimersByTimeAsync(1_000);

      expect(transport.observations).toHaveLength(observationCountAfterStop);
    } finally {
      if (!stopped) {
        await configured.service.stop();
      }
      vi.useRealTimers();
    }
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

  it("starts a node runtime when materialization returns a runtime context path", async () => {
    const fixture = await createRunnerJoinFixture();
    const transport = new FakeRunnerJoinTransport();
    const runtimeStops: string[] = [];
    const runtimeStarts: string[] = [];
    process.env.ENTANGLE_RUNNER_NOSTR_SECRET_KEY = runnerSecretHex;

    const configured = await createConfiguredRunnerJoinService(
      fixture.configPath,
      {
        clock: () => "2026-04-26T12:00:00.000Z",
        materializer: () =>
          Promise.resolve({
            accepted: true,
            runtimeContextPath: "/runner/assignments/assignment-alpha/runtime-context.json"
          }),
        nonceFactory: () => "nonce-alpha",
        runtimeStarter: ({ runtimeContextPath }) => {
          runtimeStarts.push(runtimeContextPath);
          return Promise.resolve({
            clientUrl: "http://127.0.0.1:4173/",
            runtimeContextPath,
            stop: () => {
              runtimeStops.push(runtimeContextPath);
              return Promise.resolve();
            }
          });
        },
        transport
      }
    );

    await configured.service.start();
    await transport.dispatch(buildAssignmentOfferEvent(buildAssignment()));

    expect(runtimeStarts).toEqual([
      "/runner/assignments/assignment-alpha/runtime-context.json"
    ]);
    expect(transport.observations.map((payload) => payload.eventType)).toEqual([
      "runner.hello",
      "assignment.receipt",
      "runtime.status",
      "runtime.status",
      "assignment.accepted"
    ]);
    expect(
      transport.observations.filter(
        (payload) => payload.eventType === "runtime.status"
      )
    ).toMatchObject([
      {
        assignmentId: "assignment-alpha",
        graphId: "graph-alpha",
        graphRevisionId: "graph-alpha-rev-1",
        nodeId: "worker-it",
        observedState: "starting"
      },
      {
        assignmentId: "assignment-alpha",
        graphId: "graph-alpha",
        graphRevisionId: "graph-alpha-rev-1",
        clientUrl: "http://127.0.0.1:4173/",
        nodeId: "worker-it",
        observedState: "running"
      }
    ]);

    await configured.service.stop();

    expect(runtimeStops).toEqual([
      "/runner/assignments/assignment-alpha/runtime-context.json"
    ]);
    expect(transport.observations.at(-1)).toMatchObject({
      assignmentId: "assignment-alpha",
      eventType: "runtime.status",
      observedState: "stopped"
    });
    expect(configured.service.getAcceptedAssignments()).toEqual([]);
  });

  it("handles federated runtime lifecycle commands for accepted assignments", async () => {
    const fixture = await createRunnerJoinFixture();
    const transport = new FakeRunnerJoinTransport();
    const runtimeStops: string[] = [];
    const runtimeStarts: string[] = [];
    const runtimeCancellations: string[] = [];
    const runtimeSourceHistoryPublications: string[] = [];
    const runtimeSourceHistoryReplays: string[] = [];
    process.env.ENTANGLE_RUNNER_NOSTR_SECRET_KEY = runnerSecretHex;

    const configured = await createConfiguredRunnerJoinService(
      fixture.configPath,
      {
        clock: () => "2026-04-26T12:00:00.000Z",
        materializer: () =>
          Promise.resolve({
            accepted: true,
            runtimeContextPath: "/runner/assignments/assignment-alpha/runtime-context.json"
          }),
        nonceFactory: () => "nonce-alpha",
        runtimeStarter: ({ runtimeContextPath }) => {
          runtimeStarts.push(runtimeContextPath);
          return Promise.resolve({
            clientUrl: "http://127.0.0.1:4173/",
            cancelSession: (request) => {
              runtimeCancellations.push(request.sessionId);
              return Promise.resolve();
            },
            publishSourceHistory: (request) => {
              runtimeSourceHistoryPublications.push(
                `${request.sourceHistoryId}:${request.retryFailedPublication ? "retry" : "publish"}:${request.requestedBy ?? "unknown"}`
              );
              return Promise.resolve({
                publicationState: "published",
                sourceHistoryId: request.sourceHistoryId
              });
            },
            replaySourceHistory: (request) => {
              runtimeSourceHistoryReplays.push(
                `${request.sourceHistoryId}:${request.replayId ?? "generated"}:${request.approvalId ?? "none"}`
              );
              return Promise.resolve({
                replayId: request.replayId ?? "generated",
                replayStatus: "replayed",
                sourceHistoryId: request.sourceHistoryId
              });
            },
            runtimeContextPath,
            stop: () => {
              runtimeStops.push(runtimeContextPath);
              return Promise.resolve();
            }
          });
        },
        transport
      }
    );
    const assignment = buildAssignment();

    await configured.service.start();
    await transport.dispatch(buildAssignmentOfferEvent(assignment));
    await transport.dispatch(buildRuntimeStopEvent(assignment));
    await transport.dispatch(buildRuntimeStartEvent(assignment));
    await transport.dispatch(buildRuntimeRestartEvent(assignment));
    await transport.dispatch(buildRuntimeSessionCancelEvent(assignment));
    await transport.dispatch(buildRuntimeSourceHistoryPublishEvent(assignment));
    await transport.dispatch(buildRuntimeSourceHistoryReplayEvent(assignment));

    expect(runtimeStarts).toEqual([
      "/runner/assignments/assignment-alpha/runtime-context.json",
      "/runner/assignments/assignment-alpha/runtime-context.json",
      "/runner/assignments/assignment-alpha/runtime-context.json"
    ]);
    expect(runtimeStops).toEqual([
      "/runner/assignments/assignment-alpha/runtime-context.json",
      "/runner/assignments/assignment-alpha/runtime-context.json"
    ]);
    expect(runtimeCancellations).toEqual(["session-alpha"]);
    expect(runtimeSourceHistoryPublications).toEqual([
      "source-history-alpha:retry:operator-main"
    ]);
    expect(runtimeSourceHistoryReplays).toEqual([
      "source-history-alpha:replay-source-history-alpha:approval-source-history-replay-alpha"
    ]);
    expect(
      transport.observations.filter(
        (payload) =>
          payload.eventType === "assignment.receipt" &&
          payload.assignmentId === "assignment-alpha"
      )
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ receiptKind: "received" }),
        expect.objectContaining({ receiptKind: "stopped" }),
        expect.objectContaining({ receiptKind: "started" })
      ])
    );
    expect(
      transport.observations.filter(
        (payload) => payload.eventType === "runtime.status"
      )
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ observedState: "stopped" }),
        expect.objectContaining({ observedState: "starting" }),
        expect.objectContaining({ observedState: "running" })
      ])
    );

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
        runtimeStarter: ({ runtimeContextPath }) =>
          Promise.resolve({
            runtimeContextPath,
            stop: () => Promise.resolve()
          }),
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

  it("rejects new assignment offers after reaching runner capacity", async () => {
    const fixture = await createRunnerJoinFixture({
      capabilities: {
        agentEngineKinds: ["opencode_server"],
        labels: [],
        maxAssignments: 1,
        runtimeKinds: ["agent_runner"],
        supportsLocalWorkspace: true,
        supportsNip59: true
      }
    });
    const runnerStateRoot = path.join(path.dirname(fixture.configPath), "runner-state");
    const transport = new FakeRunnerJoinTransport();
    process.env.ENTANGLE_RUNNER_NOSTR_SECRET_KEY = runnerSecretHex;
    process.env.ENTANGLE_RUNNER_STATE_ROOT = runnerStateRoot;

    const configured = await createConfiguredRunnerJoinService(
      fixture.configPath,
      {
        clock: () => "2026-04-26T12:00:00.000Z",
        nonceFactory: () => "nonce-alpha",
        runtimeStarter: ({ runtimeContextPath }) =>
          Promise.resolve({
            runtimeContextPath,
            stop: () => Promise.resolve()
          }),
        transport
      }
    );

    await configured.service.start();
    await transport.dispatch(buildAssignmentOfferEvent(buildAssignment()));
    await transport.dispatch(
      buildAssignmentOfferEvent({
        ...buildAssignment(),
        assignmentId: "assignment-beta",
        lease: {
          ...buildAssignment().lease!,
          leaseId: "lease-beta"
        },
        nodeId: "reviewer-it"
      })
    );

    expect(configured.service.getAcceptedAssignments()).toHaveLength(1);
    expect(transport.observations.at(-1)).toMatchObject({
      assignmentId: "assignment-beta",
      eventType: "assignment.rejected",
      rejectionReason:
        "Runner 'runner-alpha' has reached its assignment capacity of '1'."
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

        expect(requestUrl).toBe(
          "http://host.test/v1/runtimes/worker-it/bootstrap-bundle"
        );
        expect(init?.headers).toMatchObject({
          accept: "application/json",
          authorization: "Bearer host-token"
        });

        return Promise.resolve(
          new Response(
            JSON.stringify(buildRuntimeBootstrapBundle(runtimeFixture.context)),
            {
              headers: {
                "content-type": "application/json"
              },
              status: 200
            }
          )
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

    const runtimeContextPath = path.join(
      runnerStateRoot,
      "assignments",
      "assignment-alpha",
      "runtime-context.json"
    );
    const materializedContext = await loadRuntimeContext(runtimeContextPath);
    expect(materializedContext).toMatchObject({
      binding: {
        packageSource: {
          absolutePath: path.join(
            runnerStateRoot,
            "assignments",
            "assignment-alpha",
            "workspace",
            "package"
          )
        },
        node: {
          nodeId: "worker-it"
        }
      },
      schemaVersion: "1"
    });
    expect(materializedContext.workspace.runtimeRoot).toBe(
      path.join(
        runnerStateRoot,
        "assignments",
        "assignment-alpha",
        "workspace",
        "runtime"
      )
    );
    expect(materializedContext.workspace.runtimeRoot).not.toBe(
      runtimeFixture.context.workspace.runtimeRoot
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await configured.service.stop();
  });

  it("can fetch Host runtime identity secrets for assigned runtime startup", async () => {
    const runtimeFixture = await createRuntimeFixture();
    const fixture = await createRunnerJoinFixture({
      hostApi: {
        auth: {
          envVar: "ENTANGLE_HOST_TOKEN",
          mode: "bearer_env"
        },
        baseUrl: "http://host.test",
        runtimeIdentitySecret: {
          mode: "host_api"
        }
      }
    });
    const runnerStateRoot = path.join(path.dirname(fixture.configPath), "runner-state");
    const transport = new FakeRunnerJoinTransport();
    const fetchMock = vi.fn(
      (url: string | URL | Request, init?: RequestInit) => {
        const requestUrl = url instanceof Request ? url.url : url.toString();

        expect(init?.headers).toMatchObject({
          accept: "application/json",
          authorization: "Bearer host-token"
        });

        if (
          requestUrl === "http://host.test/v1/runtimes/worker-it/bootstrap-bundle"
        ) {
          return Promise.resolve(
            new Response(
              JSON.stringify(buildRuntimeBootstrapBundle(runtimeFixture.context)),
              {
                headers: {
                  "content-type": "application/json"
                },
                status: 200
              }
            )
          );
        }

        expect(requestUrl).toBe(
          "http://host.test/v1/runtimes/worker-it/identity-secret"
        );
        return Promise.resolve(
          new Response(
            JSON.stringify({
              graphId: runtimeFixture.context.binding.graphId,
              graphRevisionId: runtimeFixture.context.binding.graphRevisionId,
              nodeId: "worker-it",
              publicKey: runtimeFixture.context.identityContext.publicKey,
              schemaVersion: "1",
              secretDelivery: {
                envVar: "ENTANGLE_NOSTR_SECRET_KEY",
                mode: "env_var"
              },
              secretKey: runnerSecretHex
            }),
            {
              headers: {
                "content-type": "application/json"
              },
              status: 200
            }
          )
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
        runtimeStarter: ({ runtimeContextPath }) =>
          Promise.resolve({
            runtimeContextPath,
            stop: () => Promise.resolve()
          }),
        transport
      }
    );

    await configured.service.start();
    await transport.dispatch(buildAssignmentOfferEvent(buildAssignment()));

    const materializedContext = await loadRuntimeContext(
      path.join(
        runnerStateRoot,
        "assignments",
        "assignment-alpha",
        "runtime-context.json"
      )
    );
    expect(materializedContext.identityContext.secretDelivery).toMatchObject({
      envVar: "ENTANGLE_NODE_IDENTITY_ASSIGNMENT_ALPHA",
      mode: "env_var"
    });
    expect(process.env.ENTANGLE_NODE_IDENTITY_ASSIGNMENT_ALPHA).toBe(
      runnerSecretHex
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await configured.service.stop();
  });
});
