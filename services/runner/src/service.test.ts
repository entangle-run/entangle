import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { AgentEngineExecutionError } from "@entangle/agent-engine";
import {
  entangleA2AMessageSchema,
  sessionRecordSchema,
  type AgentEngineTurnRequest,
  type EffectiveRuntimeContext
} from "@entangle/types";
import { buildGitCommandEnvForRemoteOperation } from "./artifact-backend.js";
import { loadRuntimeContext } from "./runtime-context.js";
import type { RunnerMemorySynthesisInput } from "./memory-synthesizer.js";
import { RunnerService } from "./service.js";
import {
  buildRunnerStatePaths,
  listArtifactRecords,
  listRunnerTurnRecords,
  readConversationRecord,
  readRunnerTurnRecord,
  readSessionRecord,
  writeApprovalRecord,
  writeConversationRecord,
  writeSessionRecord
} from "./state-store.js";
import {
  buildInboundTaskRequest,
  cleanupRuntimeFixtures,
  createPublishedGitArtifact,
  createRuntimeFixture,
  remotePublicKey,
  runnerPublicKey,
  runnerSecretHex
} from "./test-fixtures.js";
import { InMemoryRunnerTransport } from "./transport.js";

const docsPublicKey =
  "3333333333333333333333333333333333333333333333333333333333333333";

afterEach(async () => {
  delete process.env.ENTANGLE_NOSTR_SECRET_KEY;
  delete process.env.ENTANGLE_TEST_GIT_HTTPS_TOKEN;
  await cleanupRuntimeFixtures();
});

function buildHttpsRuntimeContext(input: {
  context: EffectiveRuntimeContext;
  delivery:
    | {
        filePath: string;
        mode: "mounted_file";
      }
    | {
        envVar: string;
        mode: "env_var";
      };
}): EffectiveRuntimeContext {
  return {
    ...input.context,
    artifactContext: {
      ...input.context.artifactContext,
      gitPrincipalBindings: [
        {
          principal: {
            principalId: "worker-it-git-https",
            displayName: "Worker IT HTTPS Git Principal",
            systemKind: "git",
            gitServiceRef: "local-gitea",
            subject: "worker-it",
            transportAuthMode: "https_token",
            secretRef: "secret://git/worker-it/https-token",
            attribution: {
              displayName: "Worker IT HTTPS Git Principal",
              email: "worker-it@entangle.local"
            },
            signing: {
              mode: "none"
            }
          },
          transport: {
            delivery: input.delivery,
            secretRef: "secret://git/worker-it/https-token",
            status: "available"
          }
        }
      ],
      gitServices: [
        {
          authMode: "https_token",
          baseUrl: "https://gitea.example",
          defaultNamespace: "team-alpha",
          displayName: "Local Gitea",
          id: "local-gitea",
          provisioning: {
            mode: "preexisting"
          },
          remoteBase: "https://gitea.example/git",
          transportKind: "https"
        }
      ],
      primaryGitPrincipalRef: "worker-it-git-https",
      primaryGitRepositoryTarget: {
        gitServiceRef: "local-gitea",
        namespace: "team-alpha",
        provisioningMode: "preexisting",
        remoteUrl: "https://gitea.example/git/team-alpha/graph-alpha.git",
        repositoryName: "graph-alpha",
        transportKind: "https"
      },
      primaryGitServiceRef: "local-gitea"
    }
  };
}

describe("RunnerService", () => {
  it("hands off a published git artifact from one node to a downstream node", async () => {
    const upstreamFixture = await createRuntimeFixture({
      remotePublication: "bare_repo"
    });
    const downstreamFixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    if (!upstreamFixture.remoteRepositoryPath) {
      throw new Error("Expected an upstream bare remote repository path.");
    }

    const upstreamContext = await loadRuntimeContext(upstreamFixture.contextPath);
    const downstreamBaseContext = await loadRuntimeContext(
      downstreamFixture.contextPath
    );
    const downstreamContext: EffectiveRuntimeContext = {
      ...downstreamBaseContext,
      artifactContext: {
        ...downstreamBaseContext.artifactContext,
        primaryGitRepositoryTarget:
          upstreamContext.artifactContext.primaryGitRepositoryTarget
      },
      binding: {
        ...downstreamBaseContext.binding,
        bindingId: "graph-revision-alpha.worker-qa",
        node: {
          ...downstreamBaseContext.binding.node,
          displayName: "Worker QA",
          nodeId: "worker-qa"
        }
      },
      identityContext: {
        ...downstreamBaseContext.identityContext,
        publicKey: remotePublicKey
      }
    };
    const transport = new InMemoryRunnerTransport();
    const upstreamService = new RunnerService({
      context: upstreamContext,
      engine: {
        executeTurn() {
          return Promise.resolve({
            assistantMessages: ["Upstream node produced handoff artifact."],
            providerStopReason: "end_turn",
            stopReason: "completed",
            toolExecutions: [],
            usage: {
              inputTokens: 11,
              outputTokens: 5
            }
          });
        }
      },
      transport
    });
    let downstreamRequest: AgentEngineTurnRequest | undefined;
    const downstreamService = new RunnerService({
      context: downstreamContext,
      engine: {
        executeTurn(request) {
          downstreamRequest = request;
          return Promise.resolve({
            assistantMessages: ["Downstream node consumed handoff artifact."],
            providerStopReason: "end_turn",
            stopReason: "completed",
            toolExecutions: [
              {
                outcome: "success",
                sequence: 1,
                toolCallId: "toolu_handoff",
                toolId: "inspect_artifact_input"
              }
            ]
          });
        }
      },
      transport
    });

    const upstreamResult = await upstreamService.handleInboundEnvelope(
      buildInboundTaskRequest({
        conversationId: "handoff-upstream-conv",
        intent: "produce_handoff_artifact",
        sessionId: "handoff-session",
        summary: "Produce a published artifact for the downstream worker.",
        turnId: "handoff-turn-001"
      })
    );

    if (!upstreamResult.handled || !upstreamResult.response) {
      throw new Error("Expected the upstream node to publish a task result.");
    }

    const handoffArtifactRef =
      upstreamResult.response.message.work.artifactRefs.find(
        (artifactRef) =>
          artifactRef.createdByNodeId === upstreamContext.binding.node.nodeId
      );

    if (!handoffArtifactRef || handoffArtifactRef.backend !== "git") {
      throw new Error("Expected an upstream git artifact ref in the response.");
    }

    expect(handoffArtifactRef.status).toBe("published");

    const upstreamStatePaths = buildRunnerStatePaths(
      upstreamContext.workspace.runtimeRoot
    );
    const upstreamArtifactRecords = await listArtifactRecords(upstreamStatePaths);
    expect(upstreamArtifactRecords).toHaveLength(1);
    expect(upstreamArtifactRecords[0]?.publication?.state).toBe("published");

    const downstreamResult = await downstreamService.handleInboundEnvelope(
      buildInboundTaskRequest({
        artifactRefs: [handoffArtifactRef],
        conversationId: "handoff-downstream-conv",
        fromNodeId: upstreamContext.binding.node.nodeId,
        fromPubkey: runnerPublicKey,
        intent: "consume_handoff_artifact",
        sessionId: "handoff-session",
        summary: "Consume the upstream artifact and produce a downstream report.",
        toNodeId: "worker-qa",
        toPubkey: downstreamContext.identityContext.publicKey,
        turnId: "handoff-turn-002"
      })
    );

    if (!downstreamResult.handled) {
      throw new Error("Expected the downstream node to handle the handoff task.");
    }

    if (!downstreamRequest) {
      throw new Error("Expected the downstream engine to receive a turn request.");
    }

    expect(downstreamRequest.artifactInputs).toHaveLength(1);
    expect(downstreamRequest.artifactInputs[0]).toMatchObject({
      artifactId: handoffArtifactRef.artifactId,
      backend: "git"
    });

    const handoffReportPath = downstreamRequest.artifactInputs[0]?.localPath;
    if (!handoffReportPath) {
      throw new Error(
        "Expected the downstream engine request to include a local artifact path."
      );
    }

    await expect(readFile(handoffReportPath, "utf8")).resolves.toContain(
      "Upstream node produced handoff artifact."
    );

    const downstreamStatePaths = buildRunnerStatePaths(
      downstreamContext.workspace.runtimeRoot
    );
    const downstreamArtifactRecords = await listArtifactRecords(
      downstreamStatePaths
    );
    const retrievedArtifactRecord = downstreamArtifactRecords.find(
      (artifactRecord) =>
        artifactRecord.ref.artifactId === handoffArtifactRef.artifactId
    );
    const producedArtifactRecord = downstreamArtifactRecords.find(
      (artifactRecord) =>
        artifactRecord.ref.createdByNodeId === downstreamContext.binding.node.nodeId
    );

    expect(retrievedArtifactRecord?.retrieval).toMatchObject({
      remoteName: "entangle-local-gitea",
      remoteUrl: upstreamFixture.remoteRepositoryPath,
      state: "retrieved"
    });
    if (!producedArtifactRecord) {
      throw new Error("Expected the downstream node to produce an artifact.");
    }

    expect(producedArtifactRecord.publication?.state).toBe("published");

    const [downstreamTurnFile] = await readdir(downstreamStatePaths.turnsRoot);
    const downstreamTurn = downstreamTurnFile
      ? await readRunnerTurnRecord(
          downstreamStatePaths,
          downstreamTurnFile.replace(/\.json$/, "")
        )
      : undefined;

    expect(downstreamTurn?.consumedArtifactIds).toContain(
      handoffArtifactRef.artifactId
    );
    expect(downstreamTurn?.producedArtifactIds).toContain(
      producedArtifactRecord.ref.artifactId
    );
    expect(downstreamTurn?.engineOutcome?.toolExecutions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          outcome: "success",
          toolId: "inspect_artifact_input"
        })
      ])
    );
  });

  it("emits a topology-bound task handoff from an engine directive", async () => {
    const upstreamFixture = await createRuntimeFixture({
      remotePublication: "bare_repo"
    });
    const downstreamFixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    if (!upstreamFixture.remoteRepositoryPath) {
      throw new Error("Expected an upstream bare remote repository path.");
    }

    const upstreamBaseContext = await loadRuntimeContext(
      upstreamFixture.contextPath
    );
    const downstreamBaseContext = await loadRuntimeContext(
      downstreamFixture.contextPath
    );
    const upstreamContext: EffectiveRuntimeContext = {
      ...upstreamBaseContext,
      binding: {
        ...upstreamBaseContext.binding,
        node: {
          ...upstreamBaseContext.binding.node,
          autonomy: {
            ...upstreamBaseContext.binding.node.autonomy,
            canInitiateSessions: true
          }
        }
      },
      policyContext: {
        ...upstreamBaseContext.policyContext,
        autonomy: {
          ...upstreamBaseContext.policyContext.autonomy,
          canInitiateSessions: true
        }
      },
      relayContext: {
        ...upstreamBaseContext.relayContext,
        edgeRoutes: [
          {
            channel: "default",
            edgeId: "worker-it-to-worker-qa",
            peerNodeId: "worker-qa",
            peerPubkey: remotePublicKey,
            relation: "delegates_to",
            relayProfileRefs: ["local-relay"]
          }
        ]
      }
    };
    const downstreamContext: EffectiveRuntimeContext = {
      ...downstreamBaseContext,
      artifactContext: {
        ...downstreamBaseContext.artifactContext,
        primaryGitRepositoryTarget:
          upstreamContext.artifactContext.primaryGitRepositoryTarget
      },
      binding: {
        ...downstreamBaseContext.binding,
        bindingId: "graph-revision-alpha.worker-qa",
        node: {
          ...downstreamBaseContext.binding.node,
          displayName: "Worker QA",
          nodeId: "worker-qa"
        }
      },
      identityContext: {
        ...downstreamBaseContext.identityContext,
        publicKey: remotePublicKey
      }
    };
    const transport = new InMemoryRunnerTransport();
    const upstreamService = new RunnerService({
      context: upstreamContext,
      engine: {
        executeTurn() {
          return Promise.resolve({
            assistantMessages: ["Upstream node prepared autonomous handoff."],
            handoffDirectives: [
              {
                edgeId: "worker-it-to-worker-qa",
                includeArtifacts: "produced",
                responsePolicy: {
                  closeOnResult: true,
                  maxFollowups: 1,
                  responseRequired: true
                },
                summary: "Review the produced autonomous handoff artifact.",
                targetNodeId: "worker-qa"
              }
            ],
            providerStopReason: "end_turn",
            stopReason: "completed",
            toolExecutions: [],
            toolRequests: []
          });
        }
      },
      transport
    });
    let downstreamRequest: AgentEngineTurnRequest | undefined;
    const downstreamService = new RunnerService({
      context: downstreamContext,
      engine: {
        executeTurn(request) {
          downstreamRequest = request;
          return Promise.resolve({
            assistantMessages: ["Downstream node completed delegated review."],
            providerStopReason: "end_turn",
            stopReason: "completed",
            toolExecutions: [
              {
                outcome: "success",
                sequence: 1,
                toolCallId: "toolu_autonomous_handoff",
                toolId: "inspect_artifact_input"
              }
            ],
            toolRequests: []
          });
        }
      },
      transport
    });

    await upstreamService.start();
    await downstreamService.start();

    try {
      const upstreamResult = await upstreamService.handleInboundEnvelope(
        buildInboundTaskRequest({
          conversationId: "autonomous-handoff-upstream-conv",
          intent: "prepare_autonomous_handoff",
          sessionId: "autonomous-handoff-session",
          summary: "Prepare a handoff artifact and delegate review through the graph.",
          turnId: "autonomous-handoff-turn-001"
        })
      );

      if (!upstreamResult.handled) {
        throw new Error("Expected the upstream node to handle the task.");
      }

      expect(upstreamResult.handoffs).toHaveLength(1);
      const [handoffEnvelope] = upstreamResult.handoffs;

      if (!handoffEnvelope) {
        throw new Error("Expected a published handoff envelope.");
      }

      expect(handoffEnvelope.message).toMatchObject({
        fromNodeId: "worker-it",
        messageType: "task.handoff",
        parentMessageId:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        toNodeId: "worker-qa",
        toPubkey: remotePublicKey
      });
      expect(handoffEnvelope.message.work.artifactRefs).toHaveLength(1);
      expect(handoffEnvelope.message.work.artifactRefs[0]).toMatchObject({
        backend: "git",
        createdByNodeId: "worker-it",
        status: "published"
      });

      if (!downstreamRequest) {
        throw new Error("Expected the downstream node to receive the handoff.");
      }

      expect(downstreamRequest.artifactInputs).toHaveLength(1);
      expect(downstreamRequest.artifactInputs[0]?.artifactId).toBe(
        handoffEnvelope.message.work.artifactRefs[0]?.artifactId
      );
      const downstreamArtifactPath = downstreamRequest.artifactInputs[0]?.localPath;

      if (!downstreamArtifactPath) {
        throw new Error("Expected a downstream local artifact path.");
      }

      await expect(readFile(downstreamArtifactPath, "utf8")).resolves.toContain(
        "Upstream node prepared autonomous handoff."
      );

      const publishedEnvelopes = transport.listPublishedEnvelopes();
      const downstreamResponse = publishedEnvelopes.find(
        (publishedEnvelope) =>
          publishedEnvelope.message.messageType === "task.result" &&
          publishedEnvelope.message.parentMessageId === handoffEnvelope.eventId
      );

      expect(downstreamResponse).toBeDefined();
      if (!downstreamResponse) {
        throw new Error("Expected a downstream task result.");
      }

      const upstreamStatePaths = buildRunnerStatePaths(
        upstreamContext.workspace.runtimeRoot
      );
      const [upstreamTurn] = await listRunnerTurnRecords(upstreamStatePaths);
      const upstreamSession = await readSessionRecord(
        upstreamStatePaths,
        "autonomous-handoff-session"
      );
      const handoffConversation = await readConversationRecord(
        upstreamStatePaths,
        handoffEnvelope.message.conversationId
      );

      expect(upstreamTurn?.emittedHandoffMessageIds).toEqual([
        handoffEnvelope.eventId
      ]);
      expect(handoffConversation?.status).toBe("closed");
      expect(handoffConversation?.lastOutboundMessageId).toBe(
        handoffEnvelope.eventId
      );
      expect(handoffConversation?.lastInboundMessageId).toBe(
        downstreamResponse.eventId
      );
      expect(handoffConversation?.lastMessageType).toBe("task.result");
      expect(upstreamSession?.status).toBe("completed");
      expect(upstreamSession?.activeConversationIds).toEqual([]);
      expect(upstreamSession?.rootArtifactIds).toEqual(
        expect.arrayContaining(
          downstreamResponse.message.work.artifactRefs.map(
            (artifactRef) => artifactRef.artifactId
          )
        )
      );
    } finally {
      await downstreamService.stop();
      await upstreamService.stop();
    }
  });

  it("keeps a delegated session active until every outbound handoff conversation closes", async () => {
    const upstreamFixture = await createRuntimeFixture({
      remotePublication: "bare_repo"
    });
    const downstreamFixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    if (!upstreamFixture.remoteRepositoryPath) {
      throw new Error("Expected an upstream bare remote repository path.");
    }

    const upstreamBaseContext = await loadRuntimeContext(
      upstreamFixture.contextPath
    );
    const downstreamBaseContext = await loadRuntimeContext(
      downstreamFixture.contextPath
    );
    const upstreamContext: EffectiveRuntimeContext = {
      ...upstreamBaseContext,
      binding: {
        ...upstreamBaseContext.binding,
        node: {
          ...upstreamBaseContext.binding.node,
          autonomy: {
            ...upstreamBaseContext.binding.node.autonomy,
            canInitiateSessions: true
          }
        }
      },
      policyContext: {
        ...upstreamBaseContext.policyContext,
        autonomy: {
          ...upstreamBaseContext.policyContext.autonomy,
          canInitiateSessions: true
        }
      },
      relayContext: {
        ...upstreamBaseContext.relayContext,
        edgeRoutes: [
          {
            channel: "default",
            edgeId: "worker-it-to-worker-qa",
            peerNodeId: "worker-qa",
            peerPubkey: remotePublicKey,
            relation: "delegates_to",
            relayProfileRefs: ["local-relay"]
          },
          {
            channel: "default",
            edgeId: "worker-it-to-worker-docs",
            peerNodeId: "worker-docs",
            peerPubkey: docsPublicKey,
            relation: "peer_collaborates_with",
            relayProfileRefs: ["local-relay"]
          }
        ]
      }
    };
    const downstreamContext: EffectiveRuntimeContext = {
      ...downstreamBaseContext,
      artifactContext: {
        ...downstreamBaseContext.artifactContext,
        primaryGitRepositoryTarget:
          upstreamContext.artifactContext.primaryGitRepositoryTarget
      },
      binding: {
        ...downstreamBaseContext.binding,
        bindingId: "graph-revision-alpha.worker-qa",
        node: {
          ...downstreamBaseContext.binding.node,
          displayName: "Worker QA",
          nodeId: "worker-qa"
        }
      },
      identityContext: {
        ...downstreamBaseContext.identityContext,
        publicKey: remotePublicKey
      }
    };
    const transport = new InMemoryRunnerTransport();
    const upstreamService = new RunnerService({
      context: upstreamContext,
      engine: {
        executeTurn() {
          return Promise.resolve({
            assistantMessages: ["Prepared review and documentation handoffs."],
            handoffDirectives: [
              {
                edgeId: "worker-it-to-worker-qa",
                includeArtifacts: "produced",
                responsePolicy: {
                  closeOnResult: true,
                  maxFollowups: 1,
                  responseRequired: true
                },
                summary: "Review the produced multi-handoff artifact.",
                targetNodeId: "worker-qa"
              },
              {
                edgeId: "worker-it-to-worker-docs",
                includeArtifacts: "produced",
                responsePolicy: {
                  closeOnResult: true,
                  maxFollowups: 1,
                  responseRequired: true
                },
                summary: "Prepare documentation notes from the produced artifact.",
                targetNodeId: "worker-docs"
              }
            ],
            providerStopReason: "end_turn",
            stopReason: "completed",
            toolExecutions: [],
            toolRequests: []
          });
        }
      },
      transport
    });
    const downstreamService = new RunnerService({
      context: downstreamContext,
      engine: {
        executeTurn() {
          return Promise.resolve({
            assistantMessages: ["QA completed the delegated review."],
            providerStopReason: "end_turn",
            stopReason: "completed",
            toolExecutions: [],
            toolRequests: []
          });
        }
      },
      transport
    });

    await upstreamService.start();
    await downstreamService.start();

    try {
      const upstreamResult = await upstreamService.handleInboundEnvelope(
        buildInboundTaskRequest({
          conversationId: "multi-handoff-source-conv",
          intent: "prepare_multi_handoff",
          sessionId: "multi-handoff-session",
          summary: "Prepare one artifact and delegate review plus documentation.",
          turnId: "multi-handoff-turn-001"
        })
      );

      if (!upstreamResult.handled || !upstreamResult.response) {
        throw new Error("Expected the upstream node to publish a source result.");
      }

      expect(upstreamResult.handoffs).toHaveLength(2);
      const qaHandoff = upstreamResult.handoffs.find(
        (publishedEnvelope) => publishedEnvelope.message.toNodeId === "worker-qa"
      );
      const docsHandoff = upstreamResult.handoffs.find(
        (publishedEnvelope) => publishedEnvelope.message.toNodeId === "worker-docs"
      );

      if (!qaHandoff || !docsHandoff) {
        throw new Error("Expected QA and documentation handoff envelopes.");
      }

      const downstreamResponse = transport.listPublishedEnvelopes().find(
        (publishedEnvelope) =>
          publishedEnvelope.message.messageType === "task.result" &&
          publishedEnvelope.message.parentMessageId === qaHandoff.eventId
      );

      if (!downstreamResponse) {
        throw new Error("Expected the QA node to close its handoff.");
      }

      const upstreamStatePaths = buildRunnerStatePaths(
        upstreamContext.workspace.runtimeRoot
      );
      const [
        sessionAfterQa,
        sourceConversation,
        qaConversation,
        docsConversation
      ] = await Promise.all([
        readSessionRecord(upstreamStatePaths, "multi-handoff-session"),
        readConversationRecord(upstreamStatePaths, "multi-handoff-source-conv"),
        readConversationRecord(
          upstreamStatePaths,
          qaHandoff.message.conversationId
        ),
        readConversationRecord(
          upstreamStatePaths,
          docsHandoff.message.conversationId
        )
      ]);

      expect(sourceConversation?.status).toBe("closed");
      expect(qaConversation?.status).toBe("closed");
      expect(docsConversation?.status).toBe("working");
      expect(sessionAfterQa?.status).toBe("active");
      expect(sessionAfterQa?.activeConversationIds).toEqual([
        docsHandoff.message.conversationId
      ]);

      const docsResultMessage = entangleA2AMessageSchema.parse({
        constraints: {
          approvalRequiredBeforeAction: false
        },
        conversationId: docsHandoff.message.conversationId,
        fromNodeId: "worker-docs",
        fromPubkey: docsPublicKey,
        graphId: "graph-alpha",
        intent: "prepare_multi_handoff",
        messageType: "task.result",
        parentMessageId: docsHandoff.eventId,
        protocol: "entangle.a2a.v1",
        responsePolicy: {
          closeOnResult: true,
          maxFollowups: 0,
          responseRequired: false
        },
        sessionId: "multi-handoff-session",
        toNodeId: "worker-it",
        toPubkey: upstreamContext.identityContext.publicKey,
        turnId: "multi-handoff-docs-result",
        work: {
          artifactRefs: [],
          metadata: {},
          summary: "Documentation handoff completed."
        }
      });
      const docsResultEnvelope = await transport.publish(docsResultMessage);
      const [finalSession, finalDocsConversation] = await Promise.all([
        readSessionRecord(upstreamStatePaths, "multi-handoff-session"),
        readConversationRecord(
          upstreamStatePaths,
          docsHandoff.message.conversationId
        )
      ]);

      expect(finalDocsConversation?.status).toBe("closed");
      expect(finalSession?.status).toBe("completed");
      expect(finalSession?.activeConversationIds).toEqual([]);
      expect(finalSession?.lastMessageId).toBe(docsResultEnvelope.eventId);
      expect(finalSession?.lastMessageType).toBe("task.result");
    } finally {
      await downstreamService.stop();
      await upstreamService.stop();
    }
  });

  it("moves approval-gated active sessions to waiting_approval when the final conversation closes", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const requestMessageId =
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const resultMessageId =
      "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

    await writeSessionRecord(statePaths, {
      activeConversationIds: ["conv-alpha"],
      graphId: "graph-alpha",
      intent: "Review an approval-gated work product.",
      lastMessageId: requestMessageId,
      lastMessageType: "task.request",
      openedAt: "2026-04-24T10:00:00.000Z",
      ownerNodeId: "worker-it",
      rootArtifactIds: [],
      sessionId: "session-alpha",
      status: "active",
      traceId: "session-alpha",
      updatedAt: "2026-04-24T10:05:00.000Z",
      waitingApprovalIds: ["approval-alpha"]
    });
    await writeConversationRecord(statePaths, {
      artifactIds: [],
      conversationId: "conv-alpha",
      followupCount: 0,
      graphId: "graph-alpha",
      initiator: "remote",
      lastInboundMessageId: requestMessageId,
      lastMessageType: "task.request",
      localNodeId: "worker-it",
      localPubkey: runtimeContext.identityContext.publicKey,
      openedAt: "2026-04-24T10:01:00.000Z",
      peerNodeId: "reviewer-it",
      peerPubkey: remotePublicKey,
      responsePolicy: {
        closeOnResult: true,
        maxFollowups: 1,
        responseRequired: true
      },
      sessionId: "session-alpha",
      status: "working",
      updatedAt: "2026-04-24T10:04:00.000Z"
    });
    await writeApprovalRecord(statePaths, {
      approvalId: "approval-alpha",
      approverNodeIds: ["reviewer-it"],
      conversationId: "conv-alpha",
      graphId: "graph-alpha",
      reason: "Approve the final work product before session completion.",
      requestedAt: "2026-04-24T10:03:00.000Z",
      requestedByNodeId: "worker-it",
      sessionId: "session-alpha",
      status: "pending",
      updatedAt: "2026-04-24T10:03:00.000Z"
    });

    const service = new RunnerService({
      context: runtimeContext,
      transport: new InMemoryRunnerTransport()
    });
    const resultMessage = entangleA2AMessageSchema.parse({
      constraints: {
        approvalRequiredBeforeAction: false
      },
      conversationId: "conv-alpha",
      fromNodeId: "reviewer-it",
      fromPubkey: remotePublicKey,
      graphId: "graph-alpha",
      intent: "Review an approval-gated work product.",
      messageType: "task.result",
      parentMessageId: requestMessageId,
      protocol: "entangle.a2a.v1",
      responsePolicy: {
        closeOnResult: true,
        maxFollowups: 0,
        responseRequired: false
      },
      sessionId: "session-alpha",
      toNodeId: "worker-it",
      toPubkey: runtimeContext.identityContext.publicKey,
      turnId: "approval-gated-result",
      work: {
        artifactRefs: [],
        metadata: {},
        summary: "Review is complete, but approval is still pending."
      }
    });

    const result = await service.handleInboundEnvelope({
      eventId: resultMessageId,
      message: resultMessage,
      receivedAt: "2026-04-24T10:06:00.000Z"
    });

    const [sessionRecord, conversationRecord] = await Promise.all([
      readSessionRecord(statePaths, "session-alpha"),
      readConversationRecord(statePaths, "conv-alpha")
    ]);

    expect(result.handled).toBe(true);
    expect(conversationRecord?.status).toBe("closed");
    expect(sessionRecord?.status).toBe("waiting_approval");
    expect(sessionRecord?.activeConversationIds).toEqual([]);
    expect(sessionRecord?.waitingApprovalIds).toEqual(["approval-alpha"]);
    expect(sessionRecord?.lastMessageId).toBe(resultMessageId);
    expect(sessionRecord?.lastMessageType).toBe("task.result");
  });

  it("completes drained sessions when waiting approvals were already approved", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const requestMessageId =
      "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";
    const resultMessageId =
      "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

    await writeSessionRecord(statePaths, {
      activeConversationIds: ["conv-alpha"],
      graphId: "graph-alpha",
      intent: "Complete an approved work product.",
      lastMessageId: requestMessageId,
      lastMessageType: "task.request",
      openedAt: "2026-04-24T10:00:00.000Z",
      ownerNodeId: "worker-it",
      rootArtifactIds: [],
      sessionId: "session-alpha",
      status: "active",
      traceId: "session-alpha",
      updatedAt: "2026-04-24T10:05:00.000Z",
      waitingApprovalIds: ["approval-alpha"]
    });
    await writeConversationRecord(statePaths, {
      artifactIds: [],
      conversationId: "conv-alpha",
      followupCount: 0,
      graphId: "graph-alpha",
      initiator: "remote",
      lastInboundMessageId: requestMessageId,
      lastMessageType: "task.request",
      localNodeId: "worker-it",
      localPubkey: runtimeContext.identityContext.publicKey,
      openedAt: "2026-04-24T10:01:00.000Z",
      peerNodeId: "reviewer-it",
      peerPubkey: remotePublicKey,
      responsePolicy: {
        closeOnResult: true,
        maxFollowups: 1,
        responseRequired: true
      },
      sessionId: "session-alpha",
      status: "working",
      updatedAt: "2026-04-24T10:04:00.000Z"
    });
    await writeApprovalRecord(statePaths, {
      approvalId: "approval-alpha",
      approverNodeIds: ["reviewer-it"],
      conversationId: "conv-alpha",
      graphId: "graph-alpha",
      reason: "Approve the final work product before session completion.",
      requestedAt: "2026-04-24T10:03:00.000Z",
      requestedByNodeId: "worker-it",
      sessionId: "session-alpha",
      status: "approved",
      updatedAt: "2026-04-24T10:05:30.000Z"
    });

    const service = new RunnerService({
      context: runtimeContext,
      transport: new InMemoryRunnerTransport()
    });
    const resultMessage = entangleA2AMessageSchema.parse({
      constraints: {
        approvalRequiredBeforeAction: false
      },
      conversationId: "conv-alpha",
      fromNodeId: "reviewer-it",
      fromPubkey: remotePublicKey,
      graphId: "graph-alpha",
      intent: "Complete an approved work product.",
      messageType: "task.result",
      parentMessageId: requestMessageId,
      protocol: "entangle.a2a.v1",
      responsePolicy: {
        closeOnResult: true,
        maxFollowups: 0,
        responseRequired: false
      },
      sessionId: "session-alpha",
      toNodeId: "worker-it",
      toPubkey: runtimeContext.identityContext.publicKey,
      turnId: "approval-gated-result",
      work: {
        artifactRefs: [],
        metadata: {},
        summary: "Review is complete and approval has already been granted."
      }
    });

    const result = await service.handleInboundEnvelope({
      eventId: resultMessageId,
      message: resultMessage,
      receivedAt: "2026-04-24T10:06:00.000Z"
    });

    const sessionRecord = await readSessionRecord(statePaths, "session-alpha");

    expect(result.handled).toBe(true);
    expect(sessionRecord?.status).toBe("completed");
    expect(sessionRecord?.activeConversationIds).toEqual([]);
    expect(sessionRecord?.waitingApprovalIds).toEqual([]);
    expect(sessionRecord?.lastMessageId).toBe(resultMessageId);
    expect(sessionRecord?.lastMessageType).toBe("task.result");
  });

  it("retrieves published inbound git artifacts from the primary remote and passes them to the engine", async () => {
    const fixture = await createRuntimeFixture({
      remotePublication: "bare_repo"
    });
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    if (!fixture.remoteRepositoryPath) {
      throw new Error("Expected a bare remote repository path for retrieval tests.");
    }

    const inboundArtifact = await createPublishedGitArtifact({
      remoteRepositoryPath: fixture.remoteRepositoryPath,
      summary: "Remote review notes.\n"
    });
    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    let capturedRequest: AgentEngineTurnRequest | undefined;
    const service = new RunnerService({
      context: runtimeContext,
      engine: {
        executeTurn(request) {
          capturedRequest = request;
          return Promise.resolve({
            assistantMessages: ["Retrieved inbound artifact successfully."],
            providerStopReason: "end_turn",
            stopReason: "completed",
            toolExecutions: [
              {
                outcome: "success",
                sequence: 1,
                toolCallId: "toolu_001",
                toolId: "inspect_artifact_input"
              }
            ],
            toolRequests: [],
            usage: {
              inputTokens: 0,
              outputTokens: 0
            }
          });
        }
      },
      transport
    });

    const result = await service.handleInboundEnvelope(
      buildInboundTaskRequest({
        artifactRefs: [inboundArtifact]
      })
    );

    expect(result.handled).toBe(true);
    expect(capturedRequest?.artifactInputs).toHaveLength(1);
    expect(capturedRequest?.artifactInputs[0]?.sourceRef.artifactId).toBe(
      inboundArtifact.artifactId
    );
    expect(capturedRequest?.artifactInputs[0]?.localPath).toContain(
      path.join("reports", "session-alpha", "input.md")
    );
    expect(capturedRequest?.artifactInputs[0]?.repoPath).toContain(
      runtimeContext.workspace.retrievalRoot
    );

    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const artifactRecords = await listArtifactRecords(statePaths);
    const retrievedArtifact = artifactRecords.find(
      (artifactRecord) => artifactRecord.ref.artifactId === inboundArtifact.artifactId
    );
    const producedArtifact = artifactRecords.find(
      (artifactRecord) => artifactRecord.ref.artifactId !== inboundArtifact.artifactId
    );
    const [turnRecordFile] = await readdir(statePaths.turnsRoot);
    const turnRecord = turnRecordFile
      ? await readRunnerTurnRecord(statePaths, turnRecordFile.replace(/\.json$/, ""))
      : undefined;

    expect(retrievedArtifact?.retrieval?.state).toBe("retrieved");
    expect(retrievedArtifact?.materialization?.repoPath).toContain(
      runtimeContext.workspace.retrievalRoot
    );
    expect(producedArtifact?.ref.backend).toBe("git");
    expect(turnRecord?.consumedArtifactIds).toContain(inboundArtifact.artifactId);
    expect(turnRecord?.engineOutcome).toEqual({
      providerMetadata: {
        adapterKind: "anthropic",
        modelId: "claude-opus",
        profileId: "shared-model"
      },
      providerStopReason: "end_turn",
      stopReason: "completed",
      toolExecutions: [
        {
          outcome: "success",
          sequence: 1,
          toolCallId: "toolu_001",
          toolId: "inspect_artifact_input"
        }
      ],
      usage: {
        inputTokens: 0,
        outputTokens: 0
      }
    });
  });

  it("retrieves published inbound git artifacts from a sibling repository on the primary service", async () => {
    const fixture = await createRuntimeFixture({
      remotePublication: "bare_repo"
    });
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    if (!fixture.remoteRepositoryPath) {
      throw new Error("Expected a bare remote repository path for retrieval tests.");
    }

    const siblingRemoteRepositoryPath = path.join(
      path.dirname(fixture.remoteRepositoryPath),
      "review-artifacts.git"
    );
    spawnSync("git", ["init", "--bare", siblingRemoteRepositoryPath], {
      encoding: "utf8"
    });

    const inboundArtifact = await createPublishedGitArtifact({
      remoteRepositoryPath: siblingRemoteRepositoryPath,
      repositoryName: "review-artifacts",
      summary: "Sibling repository review notes.\n"
    });
    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    let capturedRequest: AgentEngineTurnRequest | undefined;
    const service = new RunnerService({
      context: runtimeContext,
      engine: {
        executeTurn(request) {
          capturedRequest = request;
          return Promise.resolve({
            assistantMessages: ["Retrieved sibling repository artifact successfully."],
            stopReason: "completed",
            toolExecutions: [],
            toolRequests: [],
            usage: {
              inputTokens: 0,
              outputTokens: 0
            }
          });
        }
      },
      transport
    });

    const result = await service.handleInboundEnvelope(
      buildInboundTaskRequest({
        artifactRefs: [inboundArtifact]
      })
    );

    expect(result.handled).toBe(true);
    expect(capturedRequest?.artifactInputs).toHaveLength(1);
    expect(capturedRequest?.artifactInputs[0]?.repoPath).toContain(
      path.join(
        runtimeContext.workspace.retrievalRoot,
        "local-gitea",
        "team-alpha",
        "review-artifacts"
      )
    );

    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const artifactRecords = await listArtifactRecords(statePaths);
    const retrievedArtifact = artifactRecords.find(
      (artifactRecord) => artifactRecord.ref.artifactId === inboundArtifact.artifactId
    );

    expect(retrievedArtifact?.retrieval?.state).toBe("retrieved");
    expect(retrievedArtifact?.retrieval?.remoteUrl).toBe(siblingRemoteRepositoryPath);
  });

  it("fails the turn and persists retrieval failure when inbound git handoff is invalid", async () => {
    const fixture = await createRuntimeFixture({
      remotePublication: "bare_repo"
    });
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    if (!fixture.remoteRepositoryPath) {
      throw new Error("Expected a bare remote repository path for retrieval tests.");
    }

    const inboundArtifact = await createPublishedGitArtifact({
      remoteRepositoryPath: fixture.remoteRepositoryPath
    });
    delete inboundArtifact.locator.repositoryName;
    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    const service = new RunnerService({
      context: runtimeContext,
      transport
    });

    await expect(
      service.handleInboundEnvelope(
        buildInboundTaskRequest({
          artifactRefs: [inboundArtifact]
        })
      )
    ).rejects.toThrow("missing locator.repositoryName");

    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const sessionRecord = await readSessionRecord(statePaths, "session-alpha");
    const artifactRecords = await listArtifactRecords(statePaths);
    const failedArtifact = artifactRecords.find(
      (artifactRecord) => artifactRecord.ref.artifactId === inboundArtifact.artifactId
    );

    expect(sessionRecord?.status).toBe("failed");
    expect(failedArtifact?.retrieval?.state).toBe("failed");
    expect(failedArtifact?.retrieval?.lastError).toContain(
      "cannot resolve the remote repository"
    );
  });

  it("persists bounded engine failure metadata when model execution throws", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    const service = new RunnerService({
      context: runtimeContext,
      engine: {
        executeTurn() {
          throw new AgentEngineExecutionError(
            "Anthropic engine execution failed because authentication was rejected by the provider.",
            {
              classification: "auth_error"
            }
          );
        }
      },
      transport
    });

    await expect(service.handleInboundEnvelope(buildInboundTaskRequest())).rejects.toMatchObject({
      classification: "auth_error",
      name: "AgentEngineExecutionError"
    });

    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const [sessionRecord, turnRecord] = await Promise.all([
      readSessionRecord(statePaths, "session-alpha"),
      readRunnerTurnRecord(statePaths, (await readdir(statePaths.turnsRoot))[0]!.replace(/\.json$/, ""))
    ]);

    expect(sessionRecord?.status).toBe("failed");
    expect(turnRecord?.phase).toBe("errored");
    expect(turnRecord?.engineOutcome).toEqual({
      failure: {
        classification: "auth_error",
        message:
          "Anthropic engine execution failed because authentication was rejected by the provider."
      },
      providerMetadata: {
        adapterKind: "anthropic",
        modelId: "claude-opus",
        profileId: "shared-model"
      },
      stopReason: "error",
      toolExecutions: []
    });
  });

  it("persists engine outcome before artifact materialization so later failures remain inspectable", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    const service = new RunnerService({
      artifactBackend: {
        materializeTurnArtifacts() {
          return Promise.reject(new Error("synthetic artifact materialization failure"));
        },
        retrieveInboundArtifacts() {
          return Promise.resolve({
            artifactInputs: [],
            artifacts: []
          });
        }
      },
      context: runtimeContext,
      engine: {
        executeTurn() {
          return Promise.resolve({
            assistantMessages: ["Completed the core reasoning path."],
            stopReason: "completed",
            toolExecutions: [],
            toolRequests: [],
            usage: {
              inputTokens: 21,
              outputTokens: 9
            }
          });
        }
      },
      transport
    });

    await expect(service.handleInboundEnvelope(buildInboundTaskRequest())).rejects.toThrow(
      "synthetic artifact materialization failure"
    );

    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const [sessionRecord, turnRecord] = await Promise.all([
      readSessionRecord(statePaths, "session-alpha"),
      readRunnerTurnRecord(statePaths, (await readdir(statePaths.turnsRoot))[0]!.replace(/\.json$/, ""))
    ]);

    expect(sessionRecord?.status).toBe("failed");
    expect(turnRecord?.phase).toBe("errored");
    expect(turnRecord?.engineOutcome).toEqual({
      providerMetadata: {
        adapterKind: "anthropic",
        modelId: "claude-opus",
        profileId: "shared-model"
      },
      stopReason: "completed",
      toolExecutions: [],
      usage: {
        inputTokens: 21,
        outputTokens: 9
      }
    });
  });

  it("keeps the completed turn successful when optional memory synthesis throws", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    const service = new RunnerService({
      context: runtimeContext,
      engine: {
        executeTurn() {
          return Promise.resolve({
            assistantMessages: ["Handled the task successfully."],
            stopReason: "completed",
            toolExecutions: [],
            toolRequests: [],
            usage: {
              inputTokens: 0,
              outputTokens: 0
            }
          });
        }
      },
      memorySynthesizer: {
        synthesize() {
          throw new Error("synthetic memory synthesis failure");
        }
      },
      transport
    });

    const result = await service.handleInboundEnvelope(buildInboundTaskRequest());
    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const [sessionRecord, conversationRecord, logPage, turnFiles] = await Promise.all([
      readSessionRecord(statePaths, "session-alpha"),
      readConversationRecord(statePaths, "conv-alpha"),
      readFile(path.join(runtimeContext.workspace.memoryRoot, "wiki", "log.md"), "utf8"),
      readdir(statePaths.turnsRoot)
    ]);
    const turnRecord = turnFiles[0]
      ? await readRunnerTurnRecord(statePaths, turnFiles[0].replace(/\.json$/, ""))
      : undefined;

    expect(result.handled).toBe(true);
    expect(sessionRecord?.status).toBe("completed");
    expect(conversationRecord?.status).toBe("closed");
    expect(logPage).toContain("runner turn | session-alpha /");
    expect(turnRecord?.memorySynthesisOutcome?.status).toBe("failed");
    if (turnRecord?.memorySynthesisOutcome?.status !== "failed") {
      throw new Error("Expected a failed memory synthesis outcome.");
    }
    expect(turnRecord.memorySynthesisOutcome.errorMessage).toBe(
      "synthetic memory synthesis failure"
    );
    expect(turnRecord.memorySynthesisOutcome.updatedAt).toEqual(expect.any(String));
  });

  it("passes retrieved and produced artifact context into optional memory synthesis", async () => {
    const fixture = await createRuntimeFixture({
      remotePublication: "bare_repo"
    });
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    if (!fixture.remoteRepositoryPath) {
      throw new Error("Expected a bare remote repository path for artifact-aware synthesis.");
    }

    const inboundArtifact = await createPublishedGitArtifact({
      remoteRepositoryPath: fixture.remoteRepositoryPath,
      summary: "Remote review notes.\n"
    });
    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    let capturedSynthesisInput: RunnerMemorySynthesisInput | undefined;
    let synthesisConversationStatus: string | undefined;
    let synthesisSessionStatus: string | undefined;
    const service = new RunnerService({
      context: runtimeContext,
      engine: {
        executeTurn() {
          return Promise.resolve({
            assistantMessages: ["Handled the task successfully."],
            stopReason: "completed",
            toolExecutions: [],
            toolRequests: [],
            usage: {
              inputTokens: 0,
              outputTokens: 0
            }
          });
        }
      },
      memorySynthesizer: {
        async synthesize(input) {
          capturedSynthesisInput = input;
          const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
          const [sessionRecord, conversationRecord] = await Promise.all([
            readSessionRecord(statePaths, input.envelope.message.sessionId),
            readConversationRecord(statePaths, input.envelope.message.conversationId)
          ]);
          synthesisConversationStatus = conversationRecord?.status;
          synthesisSessionStatus = sessionRecord?.status;

          return Promise.resolve({
            ok: true,
            updatedSummaryPagePaths: [
              path.join(
                runtimeContext.workspace.memoryRoot,
                "wiki",
                "summaries",
                "working-context.md"
              ),
              path.join(
                runtimeContext.workspace.memoryRoot,
                "wiki",
                "summaries",
                "decisions.md"
              ),
              path.join(
                runtimeContext.workspace.memoryRoot,
                "wiki",
                "summaries",
                "stable-facts.md"
              ),
              path.join(
                runtimeContext.workspace.memoryRoot,
                "wiki",
                "summaries",
                "open-questions.md"
              ),
              path.join(
                runtimeContext.workspace.memoryRoot,
                "wiki",
                "summaries",
                "next-actions.md"
              ),
              path.join(
                runtimeContext.workspace.memoryRoot,
                "wiki",
                "summaries",
                "resolutions.md"
              )
            ],
            workingContextPagePath: path.join(
              runtimeContext.workspace.memoryRoot,
              "wiki",
              "summaries",
              "working-context.md"
            )
          });
        }
      },
      transport
    });

    const result = await service.handleInboundEnvelope(
      buildInboundTaskRequest({
        artifactRefs: [inboundArtifact]
      })
    );
    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const turnFiles = await readdir(statePaths.turnsRoot);
    const turnRecord = turnFiles[0]
      ? await readRunnerTurnRecord(statePaths, turnFiles[0].replace(/\.json$/, ""))
      : undefined;

    expect(result.handled).toBe(true);
    expect(capturedSynthesisInput?.artifactInputs).toHaveLength(2);
    expect(capturedSynthesisInput?.artifactInputs.map((artifactInput) => artifactInput.artifactId))
      .toEqual([inboundArtifact.artifactId, expect.stringMatching(/^report-/)]);
    expect(capturedSynthesisInput?.artifactRefs).toHaveLength(2);
    expect(capturedSynthesisInput?.artifactRefs[0]?.artifactId).toBe(
      inboundArtifact.artifactId
    );
    expect(capturedSynthesisInput?.artifactInputs[0]?.localPath).toContain(
      path.join("reports", "session-alpha", "input.md")
    );
    expect(capturedSynthesisInput?.artifactInputs[1]?.localPath).toContain(
      path.join("reports", "session-alpha")
    );
    expect(synthesisConversationStatus).toBe("closed");
    expect(synthesisSessionStatus).toBe("completed");
    expect(turnRecord?.memorySynthesisOutcome?.status).toBe("succeeded");
    if (turnRecord?.memorySynthesisOutcome?.status !== "succeeded") {
      throw new Error("Expected a successful memory synthesis outcome.");
    }
    expect(turnRecord.memorySynthesisOutcome.updatedAt).toEqual(expect.any(String));
    expect(turnRecord.memorySynthesisOutcome.workingContextPagePath).toBe(
      path.join(
        runtimeContext.workspace.memoryRoot,
        "wiki",
        "summaries",
        "working-context.md"
      )
    );
    expect(turnRecord.memorySynthesisOutcome.updatedSummaryPagePaths).toEqual([
      path.join(
        runtimeContext.workspace.memoryRoot,
        "wiki",
        "summaries",
        "working-context.md"
      ),
      path.join(
        runtimeContext.workspace.memoryRoot,
        "wiki",
        "summaries",
        "decisions.md"
      ),
      path.join(
        runtimeContext.workspace.memoryRoot,
        "wiki",
        "summaries",
        "stable-facts.md"
      ),
      path.join(
        runtimeContext.workspace.memoryRoot,
        "wiki",
        "summaries",
        "open-questions.md"
      ),
      path.join(
        runtimeContext.workspace.memoryRoot,
        "wiki",
        "summaries",
        "next-actions.md"
      ),
      path.join(
        runtimeContext.workspace.memoryRoot,
        "wiki",
        "summaries",
        "resolutions.md"
      )
    ]);
  });

  it("publishes git-backed artifacts to a configured preexisting remote repository", async () => {
    const fixture = await createRuntimeFixture({
      remotePublication: "bare_repo"
    });
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    const service = new RunnerService({
      context: runtimeContext,
      transport
    });

    const result = await service.handleInboundEnvelope(buildInboundTaskRequest());

    expect(result.handled).toBe(true);

    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const artifactRecords = await listArtifactRecords(statePaths);
    expect(artifactRecords).toHaveLength(1);

    const artifactRecord = artifactRecords[0];
    if (
      !artifactRecord ||
      artifactRecord.ref.backend !== "git" ||
      !fixture.remoteRepositoryPath
    ) {
      throw new Error("Expected a published git artifact and a bare remote path.");
    }

    expect(artifactRecord.ref.status).toBe("published");
    expect(artifactRecord.publication?.state).toBe("published");
    expect(artifactRecord.publication?.remoteName).toBe("entangle-local-gitea");
    expect(artifactRecord.publication?.remoteUrl).toBe(fixture.remoteRepositoryPath);

    const remoteRef = spawnSync(
      "git",
      [
        "--git-dir",
        fixture.remoteRepositoryPath,
        "show-ref",
        "--verify",
        `refs/heads/${artifactRecord.ref.locator.branch}`
      ],
      {
        encoding: "utf8"
      }
    );

    expect(remoteRef.status).toBe(0);
    expect(remoteRef.stdout.trim().split(/\s+/)[0]).toBe(
      artifactRecord.ref.locator.commit
    );
  });

  it("processes an inbound task request and publishes a task result", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    const service = new RunnerService({
      context: runtimeContext,
      transport
    });

    await service.start();
    await transport.publish(buildInboundTaskRequest().message);

    const publishedEnvelopes = transport.listPublishedEnvelopes();
    const responseEnvelope = publishedEnvelopes.find(
      (envelope) =>
        envelope.message.messageType === "task.result" &&
        envelope.message.fromNodeId === "worker-it"
    );

    expect(responseEnvelope).toBeDefined();
    expect(responseEnvelope?.message.toNodeId).toBe("reviewer-it");
    expect(responseEnvelope?.message.parentMessageId).toBeDefined();
    expect(responseEnvelope?.message.toPubkey).toBe(remotePublicKey);

    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const sessionRecord = sessionRecordSchema.parse(
      await readSessionRecord(statePaths, "session-alpha")
    );
    const conversationRecord = await readConversationRecord(statePaths, "conv-alpha");
    const artifactRecords = await listArtifactRecords(statePaths);
    const turnIds = publishedEnvelopes
      .filter((envelope) => envelope.message.fromNodeId === "worker-it")
      .map((envelope) => envelope.message.turnId);
    const [turnRecordFile] = await readdir(statePaths.turnsRoot);
    const turnRecord = turnRecordFile
      ? await readRunnerTurnRecord(statePaths, turnRecordFile.replace(/\.json$/, ""))
      : undefined;

    expect(sessionRecord.status).toBe("completed");
    expect(sessionRecord.lastMessageType).toBe("task.result");
    expect(sessionRecord.rootArtifactIds).toHaveLength(1);
    expect(conversationRecord?.status).toBe("closed");
    expect(conversationRecord?.artifactIds).toEqual(sessionRecord.rootArtifactIds);
    expect(conversationRecord?.lastOutboundMessageId).toBe(responseEnvelope?.eventId);
    expect(conversationRecord?.followupCount).toBe(1);
    expect(turnIds).toHaveLength(1);
    expect(turnRecord?.producedArtifactIds).toEqual(sessionRecord.rootArtifactIds);
    expect(artifactRecords).toHaveLength(1);
    const artifactRecord = artifactRecords[0];
    if (!artifactRecord || artifactRecord.ref.backend !== "git") {
      throw new Error("Expected a git-backed artifact record.");
    }

    expect(responseEnvelope?.message.work.artifactRefs).toEqual(
      expect.arrayContaining([artifactRecord.ref])
    );
    expect(artifactRecord.ref.backend).toBe("git");
    expect(artifactRecord.ref.artifactKind).toBe("report_file");
    expect(artifactRecord.ref.status).toBe("materialized");
    expect(artifactRecord.publication?.state).toBe("not_requested");
    expect(artifactRecord.materialization?.repoPath).toBe(
      runtimeContext.workspace.artifactWorkspaceRoot
    );
    expect(artifactRecord.ref.locator).not.toHaveProperty("repoPath");

    const reportAbsolutePath = path.join(
      runtimeContext.workspace.artifactWorkspaceRoot,
      artifactRecord.ref.locator.path
    );
    const memoryTaskPagePath = path.join(
      runtimeContext.workspace.memoryRoot,
      "wiki",
      "tasks",
      "session-alpha",
      `${turnRecord?.turnId}.md`
    );
    const memoryLogPath = path.join(
      runtimeContext.workspace.memoryRoot,
      "wiki",
      "log.md"
    );
    const memorySummaryPath = path.join(
      runtimeContext.workspace.memoryRoot,
      "wiki",
      "summaries",
      "recent-work.md"
    );
    const [reportContent, memoryTaskPage, memoryLog, memorySummary] =
      await Promise.all([
        readFile(reportAbsolutePath, "utf8"),
        readFile(memoryTaskPagePath, "utf8"),
        readFile(memoryLogPath, "utf8"),
        readFile(memorySummaryPath, "utf8")
      ]);
    expect(reportContent).toContain("## Inbound Summary");
    expect(reportContent).toContain("Review the parser patch and summarize blocking issues.");
    expect(memoryTaskPage).toContain(`# Task Memory session-alpha / ${turnRecord?.turnId}`);
    expect(memoryTaskPage).toContain("## Produced Artifacts");
    expect(memoryLog).toContain(`runner turn | session-alpha / ${turnRecord?.turnId}`);
    expect(memorySummary).toContain("# Recent Work Summary");
    expect(memorySummary).toContain(`### session-alpha / ${turnRecord?.turnId}`);

    const gitDirectoryStats = await stat(
      path.join(runtimeContext.workspace.artifactWorkspaceRoot, ".git")
    );
    expect(gitDirectoryStats.isDirectory()).toBe(true);

    const headCommit = spawnSync(
      "git",
      ["-C", runtimeContext.workspace.artifactWorkspaceRoot, "rev-parse", "HEAD"],
      {
        encoding: "utf8"
      }
    );
    expect(headCommit.status).toBe(0);
    expect(headCommit.stdout.trim()).toBe(artifactRecord.ref.locator.commit);

    const authorEmail = spawnSync(
      "git",
      [
        "-C",
        runtimeContext.workspace.artifactWorkspaceRoot,
        "log",
        "-1",
        "--format=%ae"
      ],
      {
        encoding: "utf8"
      }
    );
    expect(authorEmail.status).toBe(0);
    expect(authorEmail.stdout.trim()).toBe("worker-it@entangle.local");

    await service.stop();
  });

  it("preserves the local artifact and records publication failure when the remote is unavailable", async () => {
    const fixture = await createRuntimeFixture({
      remotePublication: "missing_repo"
    });
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    const service = new RunnerService({
      context: runtimeContext,
      transport
    });

    const result = await service.handleInboundEnvelope(buildInboundTaskRequest());

    expect(result.handled).toBe(true);

    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const artifactRecords = await listArtifactRecords(statePaths);
    expect(artifactRecords).toHaveLength(1);

    const artifactRecord = artifactRecords[0];
    if (
      !artifactRecord ||
      artifactRecord.ref.backend !== "git" ||
      !fixture.remoteRepositoryPath
    ) {
      throw new Error(
        "Expected a git artifact and a configured-but-missing remote path."
      );
    }

    expect(artifactRecord.ref.status).toBe("materialized");
    expect(artifactRecord.publication?.state).toBe("failed");
    expect(artifactRecord.publication?.remoteName).toBe("entangle-local-gitea");
    expect(artifactRecord.publication?.remoteUrl).toBe(fixture.remoteRepositoryPath);
    expect(artifactRecord.publication?.lastError).toContain("Git command failed");
    expect(artifactRecord.materialization?.repoPath).toBe(
      runtimeContext.workspace.artifactWorkspaceRoot
    );
  });

  it("does not publish a follow-up when the inbound response policy does not require one", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    const service = new RunnerService({
      context: runtimeContext,
      transport
    });

    const result = await service.handleInboundEnvelope(
      buildInboundTaskRequest({
        responsePolicy: {
          closeOnResult: true,
          maxFollowups: 0,
          responseRequired: false
        }
      })
    );

    expect(result).toEqual({
      handled: true,
      handoffs: [],
      response: undefined
    });
    expect(transport.listPublishedEnvelopes()).toHaveLength(0);

    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const sessionRecord = await readSessionRecord(statePaths, "session-alpha");
    const conversationRecord = await readConversationRecord(statePaths, "conv-alpha");
    const artifactRecords = await listArtifactRecords(statePaths);
    const [turnRecordFile] = await readdir(statePaths.turnsRoot);
    const turnRecord = turnRecordFile
      ? await readRunnerTurnRecord(statePaths, turnRecordFile.replace(/\.json$/, ""))
      : undefined;

    expect(sessionRecord?.status).toBe("completed");
    expect(sessionRecord?.rootArtifactIds).toHaveLength(1);
    expect(conversationRecord?.status).toBe("closed");
    expect(conversationRecord?.artifactIds).toEqual(sessionRecord?.rootArtifactIds);
    expect(turnRecord?.phase).toBe("persisting");
    expect(turnRecord?.producedArtifactIds).toEqual(sessionRecord?.rootArtifactIds);
    expect(artifactRecords).toHaveLength(1);
    if (!artifactRecords[0]) {
      throw new Error("Expected an artifact record for the persisted turn.");
    }
    expect(artifactRecords[0].ref.backend).toBe("git");
    expect(artifactRecords[0].publication?.state).toBe("not_requested");
  });

  it("ignores envelopes addressed to another node id", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    const service = new RunnerService({
      context: runtimeContext,
      transport
    });

    const result = await service.handleInboundEnvelope(
      buildInboundTaskRequest({
        toNodeId: "worker-marketing"
      })
    );

    expect(result).toEqual({
      handled: false,
      reason: "wrong_node"
    });
  });

  it("ignores envelopes addressed to another pubkey", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    const service = new RunnerService({
      context: runtimeContext,
      transport
    });

    const result = await service.handleInboundEnvelope(
      buildInboundTaskRequest({
        toPubkey:
          "9039756d4d20ef2f01f196f0ff8e9a6bc036413f648f4f46fc47f4cefbfbd0e8"
      })
    );

    expect(result).toEqual({
      handled: false,
      reason: "wrong_pubkey"
    });
  });

  it("rejects syntactically invalid inbound messages before state mutation", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    const service = new RunnerService({
      context: runtimeContext,
      transport
    });

    const invalidEnvelope = buildInboundTaskRequest();
    invalidEnvelope.message.parentMessageId =
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    invalidEnvelope.message.fromNodeId = invalidEnvelope.message.toNodeId;

    const result = await service.handleInboundEnvelope(invalidEnvelope);

    expect(result).toEqual({
      handled: false,
      reason: "invalid_message"
    });

    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    expect(await readSessionRecord(statePaths, "session-alpha")).toBeUndefined();
  });

  it("starts idempotently and does not register duplicate subscriptions", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    const service = new RunnerService({
      context: runtimeContext,
      transport
    });

    const firstStart = await service.start();
    const secondStart = await service.start();

    expect(secondStart).toEqual(firstStart);

    await transport.publish(buildInboundTaskRequest().message);
    const responses = transport
      .listPublishedEnvelopes()
      .filter((envelope) => envelope.message.fromNodeId === "worker-it");

    expect(responses).toHaveLength(1);

    await service.stop();
  });

  it("repairs stale session active conversation ids from durable conversation records on start", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);

    await writeSessionRecord(statePaths, {
      activeConversationIds: ["conv-closed", "conv-missing"],
      graphId: "graph-alpha",
      intent: "Repair delegated session state.",
      lastMessageType: "task.result",
      openedAt: "2026-04-24T10:00:00.000Z",
      ownerNodeId: "worker-it",
      rootArtifactIds: [],
      sessionId: "session-alpha",
      status: "active",
      traceId: "session-alpha",
      updatedAt: "2026-04-24T10:05:00.000Z",
      waitingApprovalIds: []
    });
    await writeConversationRecord(statePaths, {
      artifactIds: [],
      conversationId: "conv-closed",
      followupCount: 1,
      graphId: "graph-alpha",
      initiator: "local",
      lastMessageType: "task.result",
      localNodeId: "worker-it",
      localPubkey: runtimeContext.identityContext.publicKey,
      openedAt: "2026-04-24T10:01:00.000Z",
      peerNodeId: "reviewer-it",
      peerPubkey: remotePublicKey,
      responsePolicy: {
        closeOnResult: true,
        maxFollowups: 1,
        responseRequired: true
      },
      sessionId: "session-alpha",
      status: "closed",
      updatedAt: "2026-04-24T10:04:00.000Z"
    });
    await writeConversationRecord(statePaths, {
      artifactIds: [],
      conversationId: "conv-open",
      followupCount: 0,
      graphId: "graph-alpha",
      initiator: "local",
      lastMessageType: "task.handoff",
      localNodeId: "worker-it",
      localPubkey: runtimeContext.identityContext.publicKey,
      openedAt: "2026-04-24T10:02:00.000Z",
      peerNodeId: "reviewer-it",
      peerPubkey: remotePublicKey,
      responsePolicy: {
        closeOnResult: true,
        maxFollowups: 1,
        responseRequired: true
      },
      sessionId: "session-alpha",
      status: "working",
      updatedAt: "2026-04-24T10:06:00.000Z"
    });

    const service = new RunnerService({
      context: runtimeContext,
      transport: new InMemoryRunnerTransport()
    });

    await service.start();

    try {
      const repairedSession = await readSessionRecord(statePaths, "session-alpha");

      expect(repairedSession?.status).toBe("active");
      expect(repairedSession?.activeConversationIds).toEqual(["conv-open"]);
      expect(repairedSession?.lastMessageType).toBe("task.result");
    } finally {
      await service.stop();
    }
  });

  it("completes active sessions with no open work during bounded startup repair", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const lastMessageId =
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    await writeSessionRecord(statePaths, {
      activeConversationIds: ["conv-closed"],
      graphId: "graph-alpha",
      intent: "Complete drained delegated session state.",
      lastMessageId,
      lastMessageType: "task.result",
      openedAt: "2026-04-24T10:00:00.000Z",
      ownerNodeId: "worker-it",
      rootArtifactIds: [],
      sessionId: "session-alpha",
      status: "active",
      traceId: "session-alpha",
      updatedAt: "2026-04-24T10:05:00.000Z",
      waitingApprovalIds: []
    });
    await writeConversationRecord(statePaths, {
      artifactIds: [],
      conversationId: "conv-closed",
      followupCount: 1,
      graphId: "graph-alpha",
      initiator: "local",
      lastInboundMessageId: lastMessageId,
      lastMessageType: "task.result",
      localNodeId: "worker-it",
      localPubkey: runtimeContext.identityContext.publicKey,
      openedAt: "2026-04-24T10:01:00.000Z",
      peerNodeId: "reviewer-it",
      peerPubkey: remotePublicKey,
      responsePolicy: {
        closeOnResult: true,
        maxFollowups: 1,
        responseRequired: true
      },
      sessionId: "session-alpha",
      status: "closed",
      updatedAt: "2026-04-24T10:04:00.000Z"
    });

    const service = new RunnerService({
      context: runtimeContext,
      transport: new InMemoryRunnerTransport()
    });

    await service.start();

    try {
      const repairedSession = await readSessionRecord(statePaths, "session-alpha");

      expect(repairedSession?.status).toBe("completed");
      expect(repairedSession?.activeConversationIds).toEqual([]);
      expect(repairedSession?.lastMessageId).toBe(lastMessageId);
      expect(repairedSession?.lastMessageType).toBe("task.result");
    } finally {
      await service.stop();
    }
  });

  it("moves approval-gated drained sessions to waiting_approval during startup repair", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const lastMessageId =
      "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";

    await writeSessionRecord(statePaths, {
      activeConversationIds: ["conv-closed"],
      graphId: "graph-alpha",
      intent: "Repair approval-gated delegated session state.",
      lastMessageId,
      lastMessageType: "task.result",
      openedAt: "2026-04-24T10:00:00.000Z",
      ownerNodeId: "worker-it",
      rootArtifactIds: [],
      sessionId: "session-alpha",
      status: "active",
      traceId: "session-alpha",
      updatedAt: "2026-04-24T10:05:00.000Z",
      waitingApprovalIds: ["approval-alpha"]
    });
    await writeConversationRecord(statePaths, {
      artifactIds: [],
      conversationId: "conv-closed",
      followupCount: 1,
      graphId: "graph-alpha",
      initiator: "local",
      lastInboundMessageId: lastMessageId,
      lastMessageType: "task.result",
      localNodeId: "worker-it",
      localPubkey: runtimeContext.identityContext.publicKey,
      openedAt: "2026-04-24T10:01:00.000Z",
      peerNodeId: "reviewer-it",
      peerPubkey: remotePublicKey,
      responsePolicy: {
        closeOnResult: true,
        maxFollowups: 1,
        responseRequired: true
      },
      sessionId: "session-alpha",
      status: "closed",
      updatedAt: "2026-04-24T10:04:00.000Z"
    });
    await writeApprovalRecord(statePaths, {
      approvalId: "approval-alpha",
      approverNodeIds: ["reviewer-it"],
      conversationId: "conv-closed",
      graphId: "graph-alpha",
      reason: "Approve the final work product before session completion.",
      requestedAt: "2026-04-24T10:03:00.000Z",
      requestedByNodeId: "worker-it",
      sessionId: "session-alpha",
      status: "pending",
      updatedAt: "2026-04-24T10:03:00.000Z"
    });

    const service = new RunnerService({
      context: runtimeContext,
      transport: new InMemoryRunnerTransport()
    });

    await service.start();

    try {
      const repairedSession = await readSessionRecord(statePaths, "session-alpha");

      expect(repairedSession?.status).toBe("waiting_approval");
      expect(repairedSession?.activeConversationIds).toEqual([]);
      expect(repairedSession?.waitingApprovalIds).toEqual(["approval-alpha"]);
      expect(repairedSession?.lastMessageId).toBe(lastMessageId);
      expect(repairedSession?.lastMessageType).toBe("task.result");
    } finally {
      await service.stop();
    }
  });

  it("completes waiting sessions during startup repair when all gates are approved", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const lastMessageId =
      "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

    await writeSessionRecord(statePaths, {
      activeConversationIds: ["conv-closed"],
      graphId: "graph-alpha",
      intent: "Repair an approved delegated session state.",
      lastMessageId,
      lastMessageType: "task.result",
      openedAt: "2026-04-24T10:00:00.000Z",
      ownerNodeId: "worker-it",
      rootArtifactIds: [],
      sessionId: "session-alpha",
      status: "waiting_approval",
      traceId: "session-alpha",
      updatedAt: "2026-04-24T10:05:00.000Z",
      waitingApprovalIds: ["approval-alpha"]
    });
    await writeConversationRecord(statePaths, {
      artifactIds: [],
      conversationId: "conv-closed",
      followupCount: 1,
      graphId: "graph-alpha",
      initiator: "local",
      lastInboundMessageId: lastMessageId,
      lastMessageType: "task.result",
      localNodeId: "worker-it",
      localPubkey: runtimeContext.identityContext.publicKey,
      openedAt: "2026-04-24T10:01:00.000Z",
      peerNodeId: "reviewer-it",
      peerPubkey: remotePublicKey,
      responsePolicy: {
        closeOnResult: true,
        maxFollowups: 1,
        responseRequired: true
      },
      sessionId: "session-alpha",
      status: "closed",
      updatedAt: "2026-04-24T10:04:00.000Z"
    });
    await writeApprovalRecord(statePaths, {
      approvalId: "approval-alpha",
      approverNodeIds: ["reviewer-it"],
      conversationId: "conv-closed",
      graphId: "graph-alpha",
      reason: "Approve the final work product before session completion.",
      requestedAt: "2026-04-24T10:03:00.000Z",
      requestedByNodeId: "worker-it",
      sessionId: "session-alpha",
      status: "approved",
      updatedAt: "2026-04-24T10:05:30.000Z"
    });

    const service = new RunnerService({
      context: runtimeContext,
      transport: new InMemoryRunnerTransport()
    });

    await service.start();

    try {
      const repairedSession = await readSessionRecord(statePaths, "session-alpha");

      expect(repairedSession?.status).toBe("completed");
      expect(repairedSession?.activeConversationIds).toEqual([]);
      expect(repairedSession?.waitingApprovalIds).toEqual([]);
      expect(repairedSession?.lastMessageId).toBe(lastMessageId);
      expect(repairedSession?.lastMessageType).toBe("task.result");
    } finally {
      await service.stop();
    }
  });
});

describe("buildGitCommandEnvForRemoteOperation", () => {
  const httpsTokenEnvVar = "ENTANGLE_TEST_GIT_HTTPS_TOKEN";

  it("builds a non-persistent askpass environment for HTTPS token mounted files", async () => {
    const fixture = await createRuntimeFixture();
    const tokenPath = path.join(
      fixture.context.workspace.runtimeRoot,
      "https-token"
    );
    await writeFile(tokenPath, "mounted-token\n", "utf8");
    const context = buildHttpsRuntimeContext({
      context: fixture.context,
      delivery: {
        filePath: tokenPath,
        mode: "mounted_file"
      }
    });

    const env = await buildGitCommandEnvForRemoteOperation({
      context,
      target: context.artifactContext.primaryGitRepositoryTarget!
    });

    expect(env).toMatchObject({
      ENTANGLE_GIT_ASKPASS_TOKEN: "mounted-token",
      ENTANGLE_GIT_ASKPASS_USERNAME: "worker-it",
      GIT_TERMINAL_PROMPT: "0"
    });
    expect(env?.GIT_ASKPASS).toBe(
      path.join(context.workspace.runtimeRoot, "git-https-askpass.sh")
    );

    const askPassScript = await readFile(env?.GIT_ASKPASS ?? "", "utf8");
    expect(askPassScript).toContain("ENTANGLE_GIT_ASKPASS_TOKEN");
    expect(askPassScript).not.toContain("mounted-token");
  });

  it("builds a non-interactive askpass environment from env-var delivery", async () => {
    const fixture = await createRuntimeFixture();
    process.env[httpsTokenEnvVar] = "env-token";
    const context = buildHttpsRuntimeContext({
      context: fixture.context,
      delivery: {
        envVar: httpsTokenEnvVar,
        mode: "env_var"
      }
    });

    const env = await buildGitCommandEnvForRemoteOperation({
      context,
      target: context.artifactContext.primaryGitRepositoryTarget!
    });

    expect(env?.ENTANGLE_GIT_ASKPASS_TOKEN).toBe("env-token");
    expect(env?.ENTANGLE_GIT_ASKPASS_USERNAME).toBe("worker-it");
    expect(env?.GIT_TERMINAL_PROMPT).toBe("0");
  });

  it("rejects HTTPS token principals when secret material is unavailable", async () => {
    const fixture = await createRuntimeFixture();
    const context = buildHttpsRuntimeContext({
      context: fixture.context,
      delivery: {
        envVar: httpsTokenEnvVar,
        mode: "env_var"
      }
    });

    await expect(
      buildGitCommandEnvForRemoteOperation({
        context,
        target: context.artifactContext.primaryGitRepositoryTarget!
      })
    ).rejects.toThrow(
      "Remote git operations require non-empty HTTPS token secret material"
    );
  });
});
