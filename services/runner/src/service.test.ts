import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { AgentEngineExecutionError } from "@entangle/agent-engine";
import {
  entangleA2AMessageSchema,
  sessionRecordSchema,
  sourceHistoryRecordSchema,
  type AgentEngineTurnRequest,
  type ArtifactRef,
  type ApprovalRecord,
  type ConversationRecord,
  type EffectiveRuntimeContext,
  type RunnerTurnRecord,
  type SessionRecord,
  type SourceChangeCandidateRecord,
  type SourceHistoryRecord,
  type SourceHistoryReplayRecord
} from "@entangle/types";
import { buildGitCommandEnvForRemoteOperation } from "./artifact-backend.js";
import { loadRuntimeContext } from "./runtime-context.js";
import type { RunnerMemorySynthesisInput } from "./memory-synthesizer.js";
import { RunnerService, type RunnerServiceObservationPublisher } from "./service.js";
import {
  buildRunnerStatePaths,
  listArtifactRecords,
  listApprovalRecords,
  listRunnerTurnRecords,
  listSourceChangeCandidateRecords,
  listSourceHistoryReplayRecords,
  listSourceHistoryRecords,
  readApprovalRecord,
  readConversationRecord,
  readRunnerTurnRecord,
  readSourceChangeCandidateRecord,
  readSessionRecord,
  writeApprovalRecord,
  writeConversationRecord,
  writeSessionCancellationRequestRecord,
  writeSourceChangeCandidateRecord,
  writeSourceHistoryRecord,
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
import {
  harvestSourceChanges,
  prepareSourceChangeHarvest
} from "./source-change-harvester.js";

type ObservedArtifactRecord = Parameters<
  NonNullable<RunnerServiceObservationPublisher["publishArtifactRefObserved"]>
>[0];

const docsPublicKey =
  "3333333333333333333333333333333333333333333333333333333333333333";

function createDeferred<T>(): {
  promise: Promise<T>;
  reject: (reason?: unknown) => void;
  resolve: (value: T | PromiseLike<T>) => void;
} {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return {
    promise,
    reject,
    resolve
  };
}

function runGitFixtureCommand(input: {
  args: string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
}): string {
  const result = spawnSync("git", input.args, {
    cwd: input.cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      ...input.env
    }
  });

  if (result.status !== 0) {
    throw new Error(
      `Git fixture command failed (${input.args.join(" ")}): ${
        result.stderr.trim() || result.stdout.trim() || `exit ${result.status}`
      }`
    );
  }

  return result.stdout.trim();
}

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
            gitServiceRef: "gitea",
            subject: "worker-it",
            transportAuthMode: "https_token",
            secretRef: "secret://git/worker-it/https-token",
            attribution: {
              displayName: "Worker IT HTTPS Git Principal",
              email: "worker-it@entangle.example"
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
          displayName: "Gitea",
          id: "gitea",
          provisioning: {
            mode: "preexisting"
          },
          remoteBase: "https://gitea.example/git",
          transportKind: "https"
        }
      ],
      primaryGitPrincipalRef: "worker-it-git-https",
      primaryGitRepositoryTarget: {
        gitServiceRef: "gitea",
        namespace: "team-alpha",
        provisioningMode: "preexisting",
        remoteUrl: "https://gitea.example/git/team-alpha/graph-alpha.git",
        repositoryName: "graph-alpha",
        transportKind: "https"
      },
      primaryGitServiceRef: "gitea"
    }
  };
}

describe("RunnerService", () => {
  it("publishes runner turn observations as executable message phases advance", async () => {
    const fixture = await createRuntimeFixture({
      remotePublication: "bare_repo"
    });
    const context = await loadRuntimeContext(fixture.contextPath);
    const observedTurns: RunnerTurnRecord[] = [];
    const transport = new InMemoryRunnerTransport();
    const service = new RunnerService({
      context,
      engine: {
        executeTurn() {
          return Promise.resolve({
            assistantMessages: ["Observed the turn."],
            providerStopReason: "end_turn",
            stopReason: "completed",
            toolExecutions: [],
            toolRequests: []
          });
        }
      },
      observationPublisher: {
        publishConversationUpdated: () => Promise.resolve(),
        publishSessionUpdated: () => Promise.resolve(),
        publishTurnUpdated: (record) => {
          observedTurns.push(record);
          return Promise.resolve();
        }
      },
      transport
    });

    await service.handleInboundEnvelope(
      buildInboundTaskRequest({
        conversationId: "observed-conv",
        intent: "observe_turn",
        sessionId: "observed-session",
        summary: "Observe this turn.",
        turnId: "observed-turn"
      })
    );

    expect(observedTurns.map((record) => record.phase)).toEqual(
      expect.arrayContaining([
        "receiving",
        "validating",
        "contextualizing",
        "reasoning",
        "acting",
        "persisting"
      ])
    );
    expect(observedTurns.at(-1)).toMatchObject({
      graphId: "graph-alpha",
      nodeId: "worker-it",
      sessionId: "observed-session"
    });
  });

  it("records source workspace changes made during an engine turn", async () => {
    const fixture = await createRuntimeFixture();
    const context = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    const observedArtifacts: ObservedArtifactRecord[] = [];
    const observedSourceCandidateIds: string[] = [];
    const observedWikiRefs: Array<{
      artifactId: string;
      previewContent?: string;
    }> = [];
    const service = new RunnerService({
      context,
      engine: {
        async executeTurn() {
          const sourceRoot = context.workspace.sourceWorkspaceRoot;

          if (!sourceRoot) {
            throw new Error("Expected a source workspace root in the fixture.");
          }

          const generatedPath = path.join(sourceRoot, "src", "generated.ts");
          await mkdir(path.dirname(generatedPath), { recursive: true });
          await writeFile(
            generatedPath,
            "export const generated = true;\n",
            "utf8"
          );

          return {
            assistantMessages: ["Generated a source file."],
            providerStopReason: "end_turn",
            stopReason: "completed",
            toolExecutions: [],
            toolRequests: []
          };
        }
      },
      observationPublisher: {
        publishArtifactRefObserved: (record) => {
          observedArtifacts.push(record);
          return Promise.resolve();
        },
        publishConversationUpdated: () => Promise.resolve(),
        publishSessionUpdated: () => Promise.resolve(),
        publishSourceChangeRefObserved: (record) => {
          observedSourceCandidateIds.push(record.candidate.candidateId);
          return Promise.resolve();
        },
        publishTurnUpdated: () => Promise.resolve(),
        publishWikiRefObserved: (record) => {
          observedWikiRefs.push({
            artifactId: record.artifactRef.artifactId,
            ...(record.artifactPreview?.available
              ? { previewContent: record.artifactPreview.content }
              : {})
          });
          return Promise.resolve();
        }
      },
      transport
    });

    const result = await service.handleInboundEnvelope(
      buildInboundTaskRequest({
        conversationId: "source-change-conv",
        intent: "generate_source_file",
        sessionId: "source-change-session",
        summary: "Generate one source file.",
        turnId: "source-change-turn-001"
      })
    );

    expect(result.handled).toBe(true);

    const statePaths = buildRunnerStatePaths(context.workspace.runtimeRoot);
    const [turn] = await listRunnerTurnRecords(statePaths);

    expect(turn?.sourceChangeSummary).toMatchObject({
      additions: 1,
      deletions: 0,
      fileCount: 1,
      status: "changed"
    });
    expect(turn?.sourceChangeSummary?.files).toEqual([
      {
        additions: 1,
        deletions: 0,
        path: "src/generated.ts",
        status: "added"
      }
    ]);
    expect(turn?.sourceChangeSummary?.diffExcerpt).toContain(
      "export const generated = true;"
    );
    expect(turn?.sourceChangeSummary?.filePreviews[0]).toMatchObject({
      available: true,
      content: "export const generated = true;\n",
      contentType: "text/plain",
      path: "src/generated.ts"
    });
    const candidateId = turn ? `source-change-${turn.turnId}` : undefined;
    expect(turn?.sourceChangeCandidateIds).toEqual([candidateId]);

    const [candidate] = await listSourceChangeCandidateRecords(statePaths);
    expect(candidate).toMatchObject({
      candidateId,
      conversationId: "source-change-conv",
      graphId: "graph-alpha",
      nodeId: "worker-it",
      sessionId: "source-change-session",
      status: "pending_review",
      turnId: turn?.turnId
    });
    expect(candidate?.sourceChangeSummary).toMatchObject({
      additions: 1,
      fileCount: 1,
      status: "changed"
    });
    expect(candidate?.snapshot).toMatchObject({
      kind: "shadow_git_tree"
    });
    expect(observedSourceCandidateIds).toEqual([candidateId]);
    const observedReportArtifact = observedArtifacts.find((record) =>
      record.artifactRecord.ref.artifactId.startsWith("report-")
    );
    if (!observedReportArtifact?.artifactPreview?.available) {
      throw new Error("Expected the report artifact observation to include preview content.");
    }
    expect(observedReportArtifact.artifactPreview.content).toContain(
      "# Entangle Turn Report"
    );
    expect(observedReportArtifact.artifactPreview.contentType).toBe("text/markdown");
    expect(observedWikiRefs).toHaveLength(1);
    expect(observedWikiRefs[0]).toMatchObject({
      artifactId: `wiki-${turn?.turnId}`
    });
    expect(observedWikiRefs[0]?.previewContent).toContain("# Wiki Index");
  });

  it("applies runner-owned wiki page upserts and emits wiki refs", async () => {
    const fixture = await createRuntimeFixture();
    const context = await loadRuntimeContext(fixture.contextPath);
    const observedWikiRefs: Array<{
      artifactId: string;
      path: string;
      previewContent?: string;
    }> = [];
    const service = new RunnerService({
      context,
      observationPublisher: {
        publishConversationUpdated: () => Promise.resolve(),
        publishSessionUpdated: () => Promise.resolve(),
        publishTurnUpdated: () => Promise.resolve(),
        publishWikiRefObserved: (record) => {
          observedWikiRefs.push({
            artifactId: record.artifactRef.artifactId,
            path: record.artifactRef.locator.path,
            ...(record.artifactPreview?.available
              ? { previewContent: record.artifactPreview.content }
              : {})
          });
          return Promise.resolve();
        }
      },
      transport: new InMemoryRunnerTransport()
    });

    const result = await service.requestWikiPageUpsert({
      commandId: "cmd-wiki-upsert-page-alpha",
      content: "# Operator Note\n\nPersist this in runner memory.\n",
      mode: "replace",
      path: "operator/notes.md",
      reason: "Record durable operator context.",
      requestedBy: "operator-main"
    });

    expect(result).toMatchObject({
      path: "operator/notes.md",
      syncStatus: "committed"
    });
    await expect(
      readFile(
        path.join(context.workspace.memoryRoot, "wiki", "operator", "notes.md"),
        "utf8"
      )
    ).resolves.toBe("# Operator Note\n\nPersist this in runner memory.\n");
    await expect(
      readFile(path.join(context.workspace.memoryRoot, "wiki", "index.md"), "utf8")
    ).resolves.toContain("- [operator/notes.md](operator/notes.md)");
    expect(
      runGitFixtureCommand({
        args: ["rev-parse", "--verify", "HEAD"],
        cwd: context.workspace.wikiRepositoryRoot!
      })
    ).toMatch(/^[a-f0-9]{40}$/u);
    expect(observedWikiRefs).toEqual([
      expect.objectContaining({
        artifactId: "wiki-cmd-wiki-upsert-page-alpha",
        path: "/operator/notes.md",
        previewContent: "# Operator Note\n\nPersist this in runner memory.\n"
      })
    ]);

    await service.requestWikiPageUpsert({
      commandId: "cmd-wiki-upsert-page-beta",
      content: "Second note.\n",
      mode: "append",
      path: "operator/notes.md"
    });
    await expect(
      readFile(
        path.join(context.workspace.memoryRoot, "wiki", "operator", "notes.md"),
        "utf8"
      )
    ).resolves.toBe(
      "# Operator Note\n\nPersist this in runner memory.\n\nSecond note.\n"
    );
  });

  it("rejects invalid runner-owned wiki page paths", async () => {
    const fixture = await createRuntimeFixture();
    const context = await loadRuntimeContext(fixture.contextPath);
    const service = new RunnerService({
      context,
      transport: new InMemoryRunnerTransport()
    });

    for (const pagePath of [
      "",
      "/absolute.md",
      "../escape.md",
      "folder/../note.md",
      "bad\\path.md",
      "not-markdown.txt"
    ]) {
      await expect(
        service.requestWikiPageUpsert({
          content: "Invalid.",
          path: pagePath
        })
      ).rejects.toThrow();
    }
  });

  it("cancels an active engine turn when an external cancellation request is observed", async () => {
    const fixture = await createRuntimeFixture();
    const context = await loadRuntimeContext(fixture.contextPath);
    const statePaths = buildRunnerStatePaths(context.workspace.runtimeRoot);
    const engineStarted = createDeferred<AbortSignal>();
    const transport = new InMemoryRunnerTransport();
    const service = new RunnerService({
      cancellationPollIntervalMs: 5,
      context,
      engine: {
        executeTurn(_request, options) {
          if (!options?.abortSignal) {
            throw new Error("Expected cancellation abort signal.");
          }

          engineStarted.resolve(options.abortSignal);

          return new Promise<never>((_resolve, reject) => {
            options.abortSignal.addEventListener(
              "abort",
              () => {
                reject(
                  new AgentEngineExecutionError(
                    "Synthetic engine turn was cancelled.",
                    {
                      classification: "cancelled"
                    }
                  )
                );
              },
              { once: true }
            );
          });
        }
      },
      transport
    });
    const handleResultPromise = service.handleInboundEnvelope(
      buildInboundTaskRequest({
        conversationId: "conv-cancel",
        intent: "cancel_active_turn",
        sessionId: "session-cancel",
        summary: "Start work that will be cancelled.",
        turnId: "turn-cancel-001"
      })
    );
    await engineStarted.promise;

    await writeSessionCancellationRequestRecord(statePaths, {
      cancellationId: "cancel-session-alpha",
      graphId: "graph-alpha",
      nodeId: "worker-it",
      reason: "Operator stopped the active turn.",
      requestedAt: "2026-04-24T10:00:00.000Z",
      requestedBy: "operator-main",
      sessionId: "session-cancel",
      status: "requested"
    });

    await expect(handleResultPromise).resolves.toMatchObject({
      handled: true,
      response: undefined
    });

    const [sessionRecord, conversationRecord, turnRecord] = await Promise.all([
      readSessionRecord(statePaths, "session-cancel"),
      readConversationRecord(statePaths, "conv-cancel"),
      listRunnerTurnRecords(statePaths).then((records) => records[0])
    ]);
    const cancellationRecord = JSON.parse(
      await readFile(
        path.join(
          context.workspace.runtimeRoot,
          "session-cancellations",
          "cancel-session-alpha.json"
        ),
        "utf8"
      )
    ) as unknown;

    expect(sessionRecord).toMatchObject({
      activeConversationIds: [],
      sessionId: "session-cancel",
      status: "cancelled",
      waitingApprovalIds: []
    });
    expect(conversationRecord).toMatchObject({
      conversationId: "conv-cancel",
      status: "expired"
    });
    expect(turnRecord).toMatchObject({
      engineOutcome: {
        failure: {
          classification: "cancelled"
        },
        stopReason: "cancelled"
      },
      phase: "cancelled",
      sessionId: "session-cancel"
    });
    expect(cancellationRecord).toMatchObject({
      cancellationId: "cancel-session-alpha",
      observedTurnId: turnRecord?.turnId,
      status: "observed"
    });
  });

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
        "Expected the downstream engine request to include a materialized artifact path."
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
      remoteName: "entangle-gitea",
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
            relayProfileRefs: ["preview-relay"]
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
        throw new Error("Expected a downstream materialized artifact path.");
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

  it("records policy-denied evidence when an engine handoff is not authorized", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;
    const context = await loadRuntimeContext(fixture.contextPath);
    const service = new RunnerService({
      context,
      engine: {
        executeTurn() {
          return Promise.resolve({
            assistantMessages: ["Prepared a handoff outside node policy."],
            engineSessionId: "engine-session-policy-denied",
            engineVersion: "0.10.0",
            handoffDirectives: [
              {
                summary: "Review work without an authorized route.",
                targetNodeId: "worker-qa"
              }
            ],
            providerStopReason: "opencode_process_exit_0",
            stopReason: "completed",
            toolExecutions: [
              {
                outcome: "success",
                sequence: 1,
                toolCallId: "tool-handoff-policy",
                toolId: "bash"
              }
            ],
            toolRequests: []
          });
        }
      },
      transport: new InMemoryRunnerTransport()
    });

    await service.start();

    try {
      await expect(
        service.handleInboundEnvelope(
          buildInboundTaskRequest({
            conversationId: "handoff-policy-denied-conv",
            intent: "attempt_unauthorized_handoff",
            sessionId: "handoff-policy-denied-session",
            summary: "Attempt a handoff without policy authority.",
            turnId: "handoff-policy-denied-turn"
          })
        )
      ).rejects.toMatchObject({
        classification: "policy_denied",
        name: AgentEngineExecutionError.name
      });

      const statePaths = buildRunnerStatePaths(context.workspace.runtimeRoot);
      const [turnRecord] = await listRunnerTurnRecords(statePaths);

      expect(turnRecord?.engineOutcome).toMatchObject({
        engineSessionId: "engine-session-policy-denied",
        engineVersion: "0.10.0",
        failure: {
          classification: "policy_denied"
        },
        providerStopReason: "opencode_process_exit_0",
        stopReason: "error",
        toolExecutions: [
          {
            outcome: "success",
            sequence: 1,
            toolCallId: "tool-handoff-policy",
            toolId: "bash"
          }
        ]
      });
    } finally {
      await service.stop();
    }
  });

  it("materializes engine approval request directives as pending approval gates", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;
    const context = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    const observedApprovals: ApprovalRecord[] = [];
    const observedConversations: ConversationRecord[] = [];
    const observedSessions: SessionRecord[] = [];
    const service = new RunnerService({
      context,
      engine: {
        executeTurn() {
          return Promise.resolve({
            approvalRequestDirectives: [
              {
                approvalId: "approval-engine-source-apply",
                approverNodeIds: ["operator-alpha"],
                operation: "source_application",
                reason: "Approve applying the source change candidate.",
                resource: {
                  id: "source-change-engine-alpha",
                  kind: "source_change_candidate",
                  label: "source-change-engine-alpha"
                }
              }
            ],
            assistantMessages: [
              "Prepared a source change candidate and requested approval."
            ],
            providerStopReason: "opencode_process_exit_0",
            stopReason: "completed",
            toolExecutions: [
              {
                outcome: "success",
                sequence: 1,
                toolCallId: "tool-approval-request",
                toolId: "bash"
              }
            ],
            toolRequests: []
          });
        }
      },
      observationPublisher: {
        publishApprovalUpdated: (record) => {
          observedApprovals.push(record);
          return Promise.resolve();
        },
        publishConversationUpdated: (record) => {
          observedConversations.push(record);
          return Promise.resolve();
        },
        publishSessionUpdated: (record) => {
          observedSessions.push(record);
          return Promise.resolve();
        },
        publishTurnUpdated: () => Promise.resolve()
      },
      transport
    });

    await service.start();

    try {
      const result = await service.handleInboundEnvelope(
        buildInboundTaskRequest({
          conversationId: "engine-approval-conv",
          intent: "prepare_source_change",
          sessionId: "engine-approval-session",
          summary: "Prepare source changes and request approval before applying.",
          turnId: "engine-approval-turn"
        })
      );

      const statePaths = buildRunnerStatePaths(context.workspace.runtimeRoot);
      const [approvalRecord, conversationRecord, sessionRecord, turnRecord] =
        await Promise.all([
          readApprovalRecord(statePaths, "approval-engine-source-apply"),
          readConversationRecord(statePaths, "engine-approval-conv"),
          readSessionRecord(statePaths, "engine-approval-session"),
          listRunnerTurnRecords(statePaths).then((records) => records[0])
        ]);

      expect(result).toEqual({
        handled: true,
        handoffs: [],
        response: undefined
      });
      expect(
        transport
          .listPublishedEnvelopes()
          .some((envelope) => envelope.message.messageType === "task.result")
      ).toBe(false);
      expect(approvalRecord).toMatchObject({
        approvalId: "approval-engine-source-apply",
        approverNodeIds: ["operator-alpha"],
        conversationId: "engine-approval-conv",
        operation: "source_application",
        reason: "Approve applying the source change candidate.",
        requestedByNodeId: "worker-it",
        resource: {
          id: "source-change-engine-alpha",
          kind: "source_change_candidate"
        },
        sessionId: "engine-approval-session",
        sourceMessageId:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        status: "pending"
      });
      expect(observedApprovals).toEqual([
        expect.objectContaining({
          approvalId: "approval-engine-source-apply",
          requestedByNodeId: "worker-it",
          sessionId: "engine-approval-session",
          status: "pending"
        })
      ]);
      expect(conversationRecord?.status).toBe("awaiting_approval");
      expect(sessionRecord?.status).toBe("waiting_approval");
      expect(sessionRecord?.waitingApprovalIds).toEqual([
        "approval-engine-source-apply"
      ]);
      expect(observedConversations.at(-1)).toMatchObject({
        conversationId: "engine-approval-conv",
        status: "awaiting_approval"
      });
      expect(observedSessions.at(-1)).toMatchObject({
        sessionId: "engine-approval-session",
        status: "waiting_approval",
        waitingApprovalIds: ["approval-engine-source-apply"]
      });
      expect(turnRecord?.phase).toBe("blocked");
      expect(turnRecord?.requestedApprovalIds).toEqual([
        "approval-engine-source-apply"
      ]);
      expect(turnRecord?.engineOutcome).toMatchObject({
        providerStopReason: "opencode_process_exit_0",
        stopReason: "completed",
        toolExecutions: [
          {
            outcome: "success",
            toolCallId: "tool-approval-request",
            toolId: "bash"
          }
        ]
      });
    } finally {
      await service.stop();
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
            relayProfileRefs: ["preview-relay"]
          },
          {
            channel: "default",
            edgeId: "worker-it-to-worker-docs",
            peerNodeId: "worker-docs",
            peerPubkey: docsPublicKey,
            relation: "peer_collaborates_with",
            relayProfileRefs: ["preview-relay"]
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
      initiator: "peer",
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

  it("persists inbound approval requests as pending runner gates", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const parentMessageId =
      "abababababababababababababababababababababababababababababababab";
    const approvalRequestMessageId =
      "cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd";
    const service = new RunnerService({
      context: runtimeContext,
      transport: new InMemoryRunnerTransport()
    });
    const approvalRequestMessage = entangleA2AMessageSchema.parse({
      constraints: {
        approvalRequiredBeforeAction: false
      },
      conversationId: "conv-approval-request",
      fromNodeId: "reviewer-it",
      fromPubkey: remotePublicKey,
      graphId: "graph-alpha",
      intent: "Approve publication.",
      messageType: "approval.request",
      parentMessageId,
      protocol: "entangle.a2a.v1",
      responsePolicy: {
        closeOnResult: false,
        maxFollowups: 1,
        responseRequired: true
      },
      sessionId: "session-approval-request",
      toNodeId: "worker-it",
      toPubkey: runtimeContext.identityContext.publicKey,
      turnId: "approval-request-turn",
      work: {
        artifactRefs: [],
        metadata: {
          approval: {
            approvalId: "approval-request-alpha",
            approverNodeIds: ["worker-it"],
            operation: "artifact_publication",
            resource: {
              id: "artifact-alpha",
              kind: "artifact"
            },
            reason: "Approve the proposed publication."
          }
        },
        summary: "Approval is required before publication."
      }
    });

    const result = await service.handleInboundEnvelope({
      eventId: approvalRequestMessageId,
      message: approvalRequestMessage,
      receivedAt: "2026-04-24T10:06:00.000Z"
    });

    const [approvalRecord, conversationRecord, sessionRecord] = await Promise.all([
      readApprovalRecord(statePaths, "approval-request-alpha"),
      readConversationRecord(statePaths, "conv-approval-request"),
      readSessionRecord(statePaths, "session-approval-request")
    ]);

    expect(result.handled).toBe(true);
    expect(approvalRecord).toMatchObject({
      approvalId: "approval-request-alpha",
      approverNodeIds: ["worker-it"],
      conversationId: "conv-approval-request",
      operation: "artifact_publication",
      reason: "Approve the proposed publication.",
      requestEventId: approvalRequestMessageId,
      requestSignerPubkey: remotePublicKey,
      requestedByNodeId: "reviewer-it",
      resource: {
        id: "artifact-alpha",
        kind: "artifact"
      },
      sessionId: "session-approval-request",
      sourceMessageId: parentMessageId,
      status: "pending"
    });
    expect(conversationRecord?.status).toBe("awaiting_approval");
    expect(sessionRecord?.status).toBe("waiting_approval");
    expect(sessionRecord?.waitingApprovalIds).toEqual(["approval-request-alpha"]);
  });

  it("rejects malformed approval requests before writing lifecycle state", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const invalidApprovalRequestMessage = entangleA2AMessageSchema.parse({
      constraints: {
        approvalRequiredBeforeAction: false
      },
      conversationId: "conv-invalid-approval-request",
      fromNodeId: "reviewer-it",
      fromPubkey: remotePublicKey,
      graphId: "graph-alpha",
      intent: "Approve publication.",
      messageType: "approval.request",
      parentMessageId:
        "abababababababababababababababababababababababababababababababab",
      protocol: "entangle.a2a.v1",
      responsePolicy: {
        closeOnResult: false,
        maxFollowups: 1,
        responseRequired: true
      },
      sessionId: "session-invalid-approval-request",
      toNodeId: "worker-it",
      toPubkey: runtimeContext.identityContext.publicKey,
      turnId: "invalid-approval-request-turn",
      work: {
        artifactRefs: [],
        metadata: {},
        summary: "Approval is required before publication."
      }
    });

    const service = new RunnerService({
      context: runtimeContext,
      transport: new InMemoryRunnerTransport()
    });
    const result = await service.handleInboundEnvelope({
      eventId:
        "efefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefef",
      message: invalidApprovalRequestMessage,
      receivedAt: "2026-04-24T10:06:00.000Z"
    });

    const [approvalRecords, conversationRecord, sessionRecord] = await Promise.all([
      listApprovalRecords(statePaths),
      readConversationRecord(statePaths, "conv-invalid-approval-request"),
      readSessionRecord(statePaths, "session-invalid-approval-request")
    ]);

    expect(result).toEqual({
      handled: false,
      reason: "invalid_message"
    });
    expect(approvalRecords).toEqual([]);
    expect(conversationRecord).toBeUndefined();
    expect(sessionRecord).toBeUndefined();
  });

  it("does not create phantom Entangle state for orphan approval responses", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const orphanApprovalResponseMessage = entangleA2AMessageSchema.parse({
      constraints: {
        approvalRequiredBeforeAction: false
      },
      conversationId: "conv-orphan-approval-response",
      fromNodeId: "reviewer-it",
      fromPubkey: remotePublicKey,
      graphId: "graph-alpha",
      intent: "Complete after approval.",
      messageType: "approval.response",
      parentMessageId:
        "cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd",
      protocol: "entangle.a2a.v1",
      responsePolicy: {
        closeOnResult: true,
        maxFollowups: 0,
        responseRequired: false
      },
      sessionId: "session-orphan-approval-response",
      toNodeId: "worker-it",
      toPubkey: runtimeContext.identityContext.publicKey,
      turnId: "orphan-approval-response-turn",
      work: {
        artifactRefs: [],
        metadata: {
          approval: {
            approvalId: "approval-orphan-alpha",
            decision: "approved"
          }
        },
        summary: "Approval is granted."
      }
    });

    const service = new RunnerService({
      context: runtimeContext,
      transport: new InMemoryRunnerTransport()
    });
    const result = await service.handleInboundEnvelope({
      eventId:
        "5656565656565656565656565656565656565656565656565656565656565656",
      message: orphanApprovalResponseMessage,
      receivedAt: "2026-04-24T10:06:00.000Z"
    });

    const [approvalRecord, conversationRecord, sessionRecord] = await Promise.all([
      readApprovalRecord(statePaths, "approval-orphan-alpha"),
      readConversationRecord(statePaths, "conv-orphan-approval-response"),
      readSessionRecord(statePaths, "session-orphan-approval-response")
    ]);

    expect(result).toEqual({
      handled: true,
      handoffs: [],
      response: undefined
    });
    expect(approvalRecord).toBeUndefined();
    expect(conversationRecord).toBeUndefined();
    expect(sessionRecord).toBeUndefined();
  });

  it("applies signed source-change review messages as runner-owned candidate updates", async () => {
    const fixture = await createRuntimeFixture({
      remotePublication: "bare_repo"
    });
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const sourceReviewParentMessageId =
      "abababababababababababababababababababababababababababababababab";
    const sourceReviewMessageId =
      "bcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbc";
    const sourceBaseline = await prepareSourceChangeHarvest(runtimeContext);

    if (sourceBaseline.kind !== "ready") {
      throw new Error("Expected source change harvest baseline to be ready.");
    }

    await mkdir(path.join(runtimeContext.workspace.sourceWorkspaceRoot!, "src"), {
      recursive: true
    });
    await writeFile(
      path.join(runtimeContext.workspace.sourceWorkspaceRoot!, "src", "index.ts"),
      "export const reviewed = true;\n",
      "utf8"
    );
    const sourceHarvest = await harvestSourceChanges(
      runtimeContext,
      sourceBaseline
    );

    if (!sourceHarvest.snapshot) {
      throw new Error("Expected source change harvest to produce a snapshot.");
    }

    await writeSessionRecord(statePaths, {
      activeConversationIds: ["conv-source-review"],
      graphId: "graph-alpha",
      intent: "Review generated source.",
      lastMessageId: sourceReviewParentMessageId,
      lastMessageType: "approval.request",
      openedAt: "2026-04-24T10:00:00.000Z",
      ownerNodeId: "worker-it",
      rootArtifactIds: [],
      sessionId: "session-source-review",
      status: "active",
      traceId: "session-source-review",
      updatedAt: "2026-04-24T10:05:00.000Z",
      waitingApprovalIds: []
    });
    await writeConversationRecord(statePaths, {
      artifactIds: [],
      conversationId: "conv-source-review",
      followupCount: 0,
      graphId: "graph-alpha",
      initiator: "self",
      lastOutboundMessageId: sourceReviewParentMessageId,
      lastMessageType: "approval.request",
      localNodeId: "worker-it",
      localPubkey: runtimeContext.identityContext.publicKey,
      openedAt: "2026-04-24T10:01:00.000Z",
      peerNodeId: "reviewer-it",
      peerPubkey: remotePublicKey,
      responsePolicy: {
        closeOnResult: false,
        maxFollowups: 1,
        responseRequired: true
      },
      sessionId: "session-source-review",
      status: "awaiting_approval",
      updatedAt: "2026-04-24T10:04:00.000Z"
    });
    await writeSourceChangeCandidateRecord(statePaths, {
      candidateId: "source-change-review-alpha",
      conversationId: "conv-source-review",
      createdAt: "2026-04-24T10:02:00.000Z",
      graphId: "graph-alpha",
      nodeId: "worker-it",
      sessionId: "session-source-review",
      snapshot: sourceHarvest.snapshot,
      sourceChangeSummary: sourceHarvest.summary,
      status: "pending_review",
      turnId: "turn-source-review",
      updatedAt: "2026-04-24T10:02:00.000Z"
    });

    const observedArtifacts: ObservedArtifactRecord[] = [];
    const observedSourceReviews: SourceChangeCandidateRecord[] = [];
    const observedSourceHistories: SourceHistoryRecord[] = [];
    const service = new RunnerService({
      context: runtimeContext,
      observationPublisher: {
        publishArtifactRefObserved: (input) => {
          observedArtifacts.push(input);
          return Promise.resolve();
        },
        publishConversationUpdated: () => Promise.resolve(),
        publishSessionUpdated: () => Promise.resolve(),
        publishSourceChangeRefObserved: (input) => {
          observedSourceReviews.push(input.candidate);
          return Promise.resolve();
        },
        publishSourceHistoryRefObserved: (input) => {
          observedSourceHistories.push(input.history);
          return Promise.resolve();
        },
        publishTurnUpdated: () => Promise.resolve()
      },
      transport: new InMemoryRunnerTransport()
    });
    const sourceReviewMessage = entangleA2AMessageSchema.parse({
      constraints: {
        approvalRequiredBeforeAction: false
      },
      conversationId: "conv-source-review",
      fromNodeId: "reviewer-it",
      fromPubkey: remotePublicKey,
      graphId: "graph-alpha",
      intent: "Accept source change candidate.",
      messageType: "source_change.review",
      parentMessageId: sourceReviewParentMessageId,
      protocol: "entangle.a2a.v1",
      responsePolicy: {
        closeOnResult: false,
        maxFollowups: 0,
        responseRequired: false
      },
      sessionId: "session-source-review",
      toNodeId: "worker-it",
      toPubkey: runtimeContext.identityContext.publicKey,
      turnId: "turn-source-review-response",
      work: {
        artifactRefs: [],
        metadata: {
          sourceChangeReview: {
            candidateId: "source-change-review-alpha",
            decision: "accepted",
            reason: "Diff reviewed by the human node."
          }
        },
        summary: "Accept source-change-review-alpha."
      }
    });

    const result = await service.handleInboundEnvelope({
      eventId: sourceReviewMessageId,
      message: sourceReviewMessage,
      receivedAt: "2026-04-24T10:06:00.000Z"
    });

    const [
      artifactRecords,
      candidateRecord,
      conversationRecord,
      sessionRecord,
      sourceHistory
    ] = await Promise.all([
      listArtifactRecords(statePaths),
      readSourceChangeCandidateRecord(statePaths, "source-change-review-alpha"),
      readConversationRecord(statePaths, "conv-source-review"),
      readSessionRecord(statePaths, "session-source-review"),
      listSourceHistoryRecords(statePaths)
    ]);

    expect(result.handled).toBe(true);
    expect(candidateRecord).toMatchObject({
      candidateId: "source-change-review-alpha",
      review: {
        decidedBy: "reviewer-it",
        decision: "accepted",
        reason: "Diff reviewed by the human node."
      },
      status: "accepted"
    });
    expect(candidateRecord?.application).toMatchObject({
      appliedBy: "reviewer-it",
      mode: "already_in_workspace",
      sourceHistoryId: "source-history-source-change-review-alpha"
    });
    expect(sourceHistory).toHaveLength(1);
    const historyRecord = sourceHistory[0]!;

    expect(historyRecord.appliedBy).toBe("reviewer-it");
    expect(historyRecord.candidateId).toBe("source-change-review-alpha");
    expect(historyRecord.mode).toBe("already_in_workspace");
    expect(historyRecord.publication?.artifactId).toBe(
      "source-source-history-source-change-review-alpha"
    );
    expect(historyRecord.publication?.publication.state).toBe("published");
    expect(historyRecord.publications).toHaveLength(1);
    expect(historyRecord.publications[0]).toMatchObject({
      artifactId: "source-source-history-source-change-review-alpha",
      publication: {
        state: "published"
      },
      targetRepositoryName: "graph-alpha"
    });
    expect(historyRecord.sourceHistoryId).toBe(
      "source-history-source-change-review-alpha"
    );
    const artifactRecord = artifactRecords.find(
      (record) =>
        record.ref.artifactId ===
        "source-source-history-source-change-review-alpha"
    );

    expect(artifactRecord?.ref).toMatchObject({
      artifactId: "source-source-history-source-change-review-alpha",
      artifactKind: "commit",
      backend: "git",
      status: "published"
    });
    expect(observedArtifacts[0]).toMatchObject({
      artifactRecord: {
        ref: {
          artifactId: "source-source-history-source-change-review-alpha",
          artifactKind: "commit",
          backend: "git",
          status: "published"
        }
      }
    });
    expect(observedSourceReviews).toHaveLength(1);
    const observedSourceReview: SourceChangeCandidateRecord =
      observedSourceReviews[0]!;

    expect(observedSourceReview.candidateId).toBe("source-change-review-alpha");
    expect(observedSourceReview.status).toBe("accepted");
    expect(observedSourceReview.application?.sourceHistoryId).toBe(
      "source-history-source-change-review-alpha"
    );
    expect(observedSourceHistories).toHaveLength(1);
    const observedSourceHistory = observedSourceHistories[0]!;

    expect(observedSourceHistory.candidateId).toBe("source-change-review-alpha");
    expect(observedSourceHistory.commit).toBe(candidateRecord?.application?.commit);
    expect(observedSourceHistory.publication?.artifactId).toBe(
      "source-source-history-source-change-review-alpha"
    );
    expect(observedSourceHistory.sourceHistoryId).toBe(
      "source-history-source-change-review-alpha"
    );
    expect(conversationRecord?.lastInboundMessageId).toBe(
      sourceReviewMessageId
    );
    expect(conversationRecord?.lastMessageType).toBe("source_change.review");
    expect(sessionRecord?.lastMessageId).toBe(sourceReviewMessageId);
    expect(sessionRecord?.lastMessageType).toBe("source_change.review");
  });

  it("publishes source history on runner-owned control requests and requires explicit failed retry", async () => {
    const fixture = await createRuntimeFixture({
      remotePublication: "bare_repo"
    });
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const sourceBaseline = await prepareSourceChangeHarvest(runtimeContext);

    if (sourceBaseline.kind !== "ready") {
      throw new Error("Expected source change harvest baseline to be ready.");
    }

    await mkdir(path.join(runtimeContext.workspace.sourceWorkspaceRoot!, "src"), {
      recursive: true
    });
    await writeFile(
      path.join(runtimeContext.workspace.sourceWorkspaceRoot!, "src", "index.ts"),
      "export const published = true;\n",
      "utf8"
    );
    const sourceHarvest = await harvestSourceChanges(
      runtimeContext,
      sourceBaseline
    );

    if (!sourceHarvest.snapshot) {
      throw new Error("Expected source change harvest to produce a snapshot.");
    }

    const sourceCommit = runGitFixtureCommand({
      args: [
        "--git-dir",
        path.join(runtimeContext.workspace.runtimeRoot, "source-snapshot.git"),
        "commit-tree",
        sourceHarvest.snapshot.headTree,
        "-m",
        "Apply source-history-control-alpha"
      ],
      cwd: runtimeContext.workspace.sourceWorkspaceRoot!,
      env: {
        GIT_AUTHOR_EMAIL: "worker-it@entangle.invalid",
        GIT_AUTHOR_NAME: "Worker IT",
        GIT_COMMITTER_EMAIL: "worker-it@entangle.invalid",
        GIT_COMMITTER_NAME: "Worker IT"
      }
    });
    const failedHistory = sourceHistoryRecordSchema.parse({
      appliedAt: "2026-04-24T10:07:00.000Z",
      appliedBy: "reviewer-it",
      baseTree: sourceHarvest.snapshot.baseTree,
      branch: "entangle-source-history",
      candidateId: "source-history-control-alpha",
      commit: sourceCommit,
      graphId: runtimeContext.binding.graphId,
      graphRevisionId: runtimeContext.binding.graphRevisionId,
      headTree: sourceHarvest.snapshot.headTree,
      mode: "already_in_workspace",
      nodeId: "worker-it",
      publication: {
        artifactId: "source-source-history-control-alpha",
        branch: "entangle-source-history",
        publication: {
          lastAttemptAt: "2026-04-24T10:08:00.000Z",
          lastError: "Remote was unavailable.",
          state: "failed"
        },
        requestedAt: "2026-04-24T10:08:00.000Z",
        requestedBy: "operator-main"
      },
      sourceChangeSummary: sourceHarvest.summary,
      sourceHistoryId: "source-history-control-alpha",
      turnId: "turn-source-history-control",
      updatedAt: "2026-04-24T10:08:00.000Z"
    });
    await writeSourceHistoryRecord(statePaths, failedHistory);

    const observedArtifacts: ObservedArtifactRecord[] = [];
    const observedSourceHistories: SourceHistoryRecord[] = [];
    const service = new RunnerService({
      context: runtimeContext,
      observationPublisher: {
        publishArtifactRefObserved: (input) => {
          observedArtifacts.push(input);
          return Promise.resolve();
        },
        publishSourceHistoryRefObserved: (input) => {
          observedSourceHistories.push(input.history);
          return Promise.resolve();
        }
      },
      transport: new InMemoryRunnerTransport()
    });

    await expect(
      service.requestSourceHistoryPublication({
        requestedAt: "2026-04-24T10:09:00.000Z",
        requestedBy: "operator-main",
        sourceHistoryId: "source-history-control-alpha"
      })
    ).rejects.toThrow("retry is required");

    const result = await service.requestSourceHistoryPublication({
      reason: "Retry after remote recovery.",
      requestedAt: "2026-04-24T10:10:00.000Z",
      requestedBy: "operator-main",
      retryFailedPublication: true,
      sourceHistoryId: "source-history-control-alpha"
    });
    const [historyRecord] = await listSourceHistoryRecords(statePaths);

    expect(result).toMatchObject({
      publicationState: "published",
      sourceHistoryId: "source-history-control-alpha"
    });
    expect(historyRecord?.publication).toMatchObject({
      reason: "Retry after remote recovery.",
      requestedBy: "operator-main",
      requestedAt: "2026-04-24T10:10:00.000Z",
      publication: {
        state: "published"
      }
    });
    expect(historyRecord?.publications).toHaveLength(1);
    expect(historyRecord?.publications[0]?.publication.state).toBe("published");
    expect(observedArtifacts[0]?.artifactRecord.ref).toMatchObject({
      artifactKind: "commit",
      backend: "git",
      status: "published"
    });
    expect(observedSourceHistories[0]?.publication?.publication.state).toBe(
      "published"
    );
  });

  it("publishes source history to an approved non-primary git target", async () => {
    const fixture = await createRuntimeFixture({ remotePublication: "bare_repo" });
    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    runtimeContext.policyContext.sourceMutation = {
      applyRequiresApproval: false,
      nonPrimaryPublishRequiresApproval: true,
      publishRequiresApproval: false
    };
    const backupRepositoryPath = path.join(
      path.dirname(fixture.remoteRepositoryPath!),
      "graph-alpha-public.git"
    );
    runGitFixtureCommand({
      args: ["init", "--bare", backupRepositoryPath],
      cwd: path.dirname(fixture.remoteRepositoryPath!)
    });
    const statePaths = buildRunnerStatePaths(
      runtimeContext.workspace.runtimeRoot
    );
    const sourceBaseline = await prepareSourceChangeHarvest(runtimeContext);

    if (sourceBaseline.kind !== "ready") {
      throw new Error("Expected source change harvest baseline to be ready.");
    }

    await mkdir(path.join(runtimeContext.workspace.sourceWorkspaceRoot!, "src"), {
      recursive: true
    });
    await writeFile(
      path.join(runtimeContext.workspace.sourceWorkspaceRoot!, "src", "index.ts"),
      "export const publishedToPublic = true;\n",
      "utf8"
    );
    const sourceHarvest = await harvestSourceChanges(
      runtimeContext,
      sourceBaseline
    );

    if (!sourceHarvest.snapshot) {
      throw new Error("Expected source change harvest to produce a snapshot.");
    }

    const sourceCommit = runGitFixtureCommand({
      args: [
        "--git-dir",
        path.join(runtimeContext.workspace.runtimeRoot, "source-snapshot.git"),
        "commit-tree",
        sourceHarvest.snapshot.headTree,
        "-m",
        "Apply source-history-non-primary"
      ],
      cwd: runtimeContext.workspace.sourceWorkspaceRoot!,
      env: {
        GIT_AUTHOR_EMAIL: "worker-it@entangle.invalid",
        GIT_AUTHOR_NAME: "Worker IT",
        GIT_COMMITTER_EMAIL: "worker-it@entangle.invalid",
        GIT_COMMITTER_NAME: "Worker IT"
      }
    });
    const history = sourceHistoryRecordSchema.parse({
      appliedAt: "2026-04-24T10:07:00.000Z",
      appliedBy: "reviewer-it",
      baseTree: sourceHarvest.snapshot.baseTree,
      branch: "entangle-source-history",
      candidateId: "source-history-non-primary",
      commit: sourceCommit,
      graphId: runtimeContext.binding.graphId,
      graphRevisionId: runtimeContext.binding.graphRevisionId,
      headTree: sourceHarvest.snapshot.headTree,
      mode: "already_in_workspace",
      nodeId: "worker-it",
      sessionId: "session-source-history-publication",
      sourceChangeSummary: sourceHarvest.summary,
      sourceHistoryId: "source-history-non-primary",
      turnId: "turn-source-history-non-primary",
      updatedAt: "2026-04-24T10:08:00.000Z"
    });
    await writeSourceHistoryRecord(statePaths, history);
    await writeApprovalRecord(statePaths, {
      approvalId: "approval-source-history-publication-alpha",
      approverNodeIds: ["user-main"],
      graphId: runtimeContext.binding.graphId,
      operation: "source_publication",
      reason: "Approve source history publication to the public repository.",
      requestedAt: "2026-04-24T10:08:30.000Z",
      requestedByNodeId: "worker-it",
      resource: {
        id: "source-history-non-primary|gitea|team-alpha|graph-alpha-public",
        kind: "source_history_publication",
        label: "source-history-non-primary -> gitea/team-alpha/graph-alpha-public"
      },
      sessionId: "session-source-history-publication",
      status: "approved",
      updatedAt: "2026-04-24T10:08:45.000Z"
    });

    const observedArtifacts: ObservedArtifactRecord[] = [];
    const observedSourceHistories: SourceHistoryRecord[] = [];
    const service = new RunnerService({
      context: runtimeContext,
      observationPublisher: {
        publishArtifactRefObserved: (input) => {
          observedArtifacts.push(input);
          return Promise.resolve();
        },
        publishSourceHistoryRefObserved: (input) => {
          observedSourceHistories.push(input.history);
          return Promise.resolve();
        }
      },
      transport: new InMemoryRunnerTransport()
    });

    await expect(
      service.requestSourceHistoryPublication({
        requestedAt: "2026-04-24T10:09:00.000Z",
        requestedBy: "operator-main",
        sourceHistoryId: "source-history-non-primary",
        target: {
          repositoryName: "graph-alpha-public"
        }
      })
    ).rejects.toThrow("requires an approved approvalId");

    const primaryResult = await service.requestSourceHistoryPublication({
      reason: "Publish to primary source history.",
      requestedAt: "2026-04-24T10:09:30.000Z",
      requestedBy: "operator-main",
      sourceHistoryId: "source-history-non-primary"
    });
    expect(primaryResult).toMatchObject({
      publicationState: "published",
      sourceHistoryId: "source-history-non-primary"
    });

    const result = await service.requestSourceHistoryPublication({
      approvalId: "approval-source-history-publication-alpha",
      reason: "Publish to public source history.",
      requestedAt: "2026-04-24T10:10:00.000Z",
      requestedBy: "operator-main",
      sourceHistoryId: "source-history-non-primary",
      target: {
        repositoryName: "graph-alpha-public"
      }
    });
    const [historyRecord] = await listSourceHistoryRecords(statePaths);
    const publishedBranch = historyRecord?.publication?.branch;

    if (!publishedBranch) {
      throw new Error("Expected source history publication branch.");
    }

    const remoteHead = runGitFixtureCommand({
      args: ["--git-dir", backupRepositoryPath, "rev-parse", publishedBranch],
      cwd: path.dirname(backupRepositoryPath)
    });

    expect(result).toMatchObject({
      publicationState: "published",
      sourceHistoryId: "source-history-non-primary"
    });
    expect(historyRecord?.publication).toMatchObject({
      approvalId: "approval-source-history-publication-alpha",
      targetGitServiceRef: "gitea",
      targetNamespace: "team-alpha",
      targetRepositoryName: "graph-alpha-public",
      publication: {
        state: "published"
      }
    });
    expect(historyRecord?.publications).toHaveLength(2);
    expect(historyRecord?.publications.map((publication) => publication.targetRepositoryName)).toEqual([
      "graph-alpha",
      "graph-alpha-public"
    ]);
    expect(historyRecord?.publications[0]?.artifactId).toBe(
      "source-source-history-non-primary"
    );
    expect(historyRecord?.publications[1]?.artifactId).not.toBe(
      historyRecord?.publications[0]?.artifactId
    );
    const targetedArtifact = observedArtifacts.find(
      (record) =>
        record.artifactRecord.ref.backend === "git" &&
        record.artifactRecord.ref.locator.repositoryName === "graph-alpha-public"
    );

    expect(targetedArtifact?.artifactRecord.ref.locator).toMatchObject({
      repositoryName: "graph-alpha-public"
    });
    expect(observedSourceHistories.at(-1)?.publication?.targetRepositoryName).toBe(
      "graph-alpha-public"
    );
    expect(remoteHead).toBe(targetedArtifact?.artifactRecord.ref.locator.commit);
  });

  it("replays source history on runner-owned control requests with scoped approval", async () => {
    const fixture = await createRuntimeFixture({
      remotePublication: "bare_repo"
    });
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const loadedContext = await loadRuntimeContext(fixture.contextPath);
    const runtimeContext: EffectiveRuntimeContext = {
      ...loadedContext,
      policyContext: {
        ...loadedContext.policyContext,
        sourceMutation: {
          ...loadedContext.policyContext.sourceMutation,
          applyRequiresApproval: true
        }
      }
    };
    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const sourceBaseline = await prepareSourceChangeHarvest(runtimeContext);

    if (sourceBaseline.kind !== "ready") {
      throw new Error("Expected source change harvest baseline to be ready.");
    }

    await mkdir(path.join(runtimeContext.workspace.sourceWorkspaceRoot!, "src"), {
      recursive: true
    });
    await writeFile(
      path.join(runtimeContext.workspace.sourceWorkspaceRoot!, "src", "index.ts"),
      "export const replayed = true;\n",
      "utf8"
    );
    const sourceHarvest = await harvestSourceChanges(
      runtimeContext,
      sourceBaseline
    );

    if (!sourceHarvest.snapshot) {
      throw new Error("Expected source change harvest to produce a snapshot.");
    }

    const sourceCommit = runGitFixtureCommand({
      args: [
        "--git-dir",
        path.join(runtimeContext.workspace.runtimeRoot, "source-snapshot.git"),
        "commit-tree",
        sourceHarvest.snapshot.headTree,
        "-m",
        "Apply source-history-replay-alpha"
      ],
      cwd: runtimeContext.workspace.sourceWorkspaceRoot!,
      env: {
        GIT_AUTHOR_EMAIL: "worker-it@entangle.invalid",
        GIT_AUTHOR_NAME: "Worker IT",
        GIT_COMMITTER_EMAIL: "worker-it@entangle.invalid",
        GIT_COMMITTER_NAME: "Worker IT"
      }
    });
    const history = sourceHistoryRecordSchema.parse({
      appliedAt: "2026-04-24T10:07:00.000Z",
      appliedBy: "reviewer-it",
      baseTree: sourceHarvest.snapshot.baseTree,
      branch: "entangle-source-history",
      candidateId: "source-history-replay-alpha",
      commit: sourceCommit,
      graphId: runtimeContext.binding.graphId,
      graphRevisionId: runtimeContext.binding.graphRevisionId,
      headTree: sourceHarvest.snapshot.headTree,
      mode: "already_in_workspace",
      nodeId: "worker-it",
      sessionId: "session-source-history-replay",
      sourceChangeSummary: sourceHarvest.summary,
      sourceHistoryId: "source-history-replay-alpha",
      turnId: "turn-source-history-replay",
      updatedAt: "2026-04-24T10:08:00.000Z"
    });
    await writeSourceHistoryRecord(statePaths, history);
    await writeApprovalRecord(statePaths, {
      approvalId: "approval-source-history-replay-alpha",
      approverNodeIds: ["user-main"],
      graphId: runtimeContext.binding.graphId,
      operation: "source_application",
      reason: "Approve source history replay.",
      requestedAt: "2026-04-24T10:08:30.000Z",
      requestedByNodeId: "worker-it",
      resource: {
        id: "source-history-replay-alpha",
        kind: "source_history",
        label: "source-history-replay-alpha"
      },
      sessionId: "session-source-history-replay",
      status: "approved",
      updatedAt: "2026-04-24T10:08:45.000Z"
    });
    await rm(path.join(runtimeContext.workspace.sourceWorkspaceRoot!, "src"), {
      force: true,
      recursive: true
    });

    const observedReplays: SourceHistoryReplayRecord[] = [];
    const service = new RunnerService({
      context: runtimeContext,
      observationPublisher: {
        publishConversationUpdated: () => Promise.resolve(),
        publishSessionUpdated: () => Promise.resolve(),
        publishSourceHistoryReplayedObserved: (input) => {
          observedReplays.push(input.replay);
          return Promise.resolve();
        },
        publishTurnUpdated: () => Promise.resolve()
      },
      transport: new InMemoryRunnerTransport()
    });

    await expect(
      service.requestSourceHistoryReplay({
        replayedAt: "2026-04-24T10:09:00.000Z",
        sourceHistoryId: "source-history-replay-alpha"
      })
    ).rejects.toThrow("requires an approved approvalId");

    const result = await service.requestSourceHistoryReplay({
      approvalId: "approval-source-history-replay-alpha",
      reason: "Replay accepted source history.",
      replayedAt: "2026-04-24T10:10:00.000Z",
      replayedBy: "operator-main",
      replayId: "replay-source-history-alpha",
      sourceHistoryId: "source-history-replay-alpha"
    });
    const [replayRecord] = await listSourceHistoryReplayRecords(statePaths);
    const replayedFile = await readFile(
      path.join(runtimeContext.workspace.sourceWorkspaceRoot!, "src", "index.ts"),
      "utf8"
    );

    expect(result).toMatchObject({
      replayId: "replay-source-history-alpha",
      replayStatus: "replayed",
      sourceHistoryId: "source-history-replay-alpha"
    });
    expect(replayRecord).toMatchObject({
      approvalId: "approval-source-history-replay-alpha",
      replayedBy: "operator-main",
      replayId: "replay-source-history-alpha",
      status: "replayed"
    });
    expect(replayedFile).toBe("export const replayed = true;\n");
    expect(observedReplays[0]).toMatchObject({
      replayId: "replay-source-history-alpha",
      sourceHistoryId: "source-history-replay-alpha",
      status: "replayed"
    });
  });

  it("applies approved approval responses and completes unblocked waiting sessions", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const approvalRequestMessageId =
      "fafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafa";
    const approvalResponseMessageId =
      "edededededededededededededededededededededededededededededededed";

    await writeSessionRecord(statePaths, {
      activeConversationIds: ["conv-approval-response"],
      graphId: "graph-alpha",
      intent: "Complete after approval.",
      lastMessageId: approvalRequestMessageId,
      lastMessageType: "approval.request",
      openedAt: "2026-04-24T10:00:00.000Z",
      ownerNodeId: "worker-it",
      rootArtifactIds: [],
      sessionId: "session-approval-response",
      status: "waiting_approval",
      traceId: "session-approval-response",
      updatedAt: "2026-04-24T10:05:00.000Z",
      waitingApprovalIds: ["approval-response-alpha"]
    });
    await writeConversationRecord(statePaths, {
      artifactIds: [],
      conversationId: "conv-approval-response",
      followupCount: 0,
      graphId: "graph-alpha",
      initiator: "self",
      lastOutboundMessageId: approvalRequestMessageId,
      lastMessageType: "approval.request",
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
      sessionId: "session-approval-response",
      status: "awaiting_approval",
      updatedAt: "2026-04-24T10:04:00.000Z"
    });
    await writeApprovalRecord(statePaths, {
      approvalId: "approval-response-alpha",
      approverNodeIds: ["reviewer-it"],
      conversationId: "conv-approval-response",
      graphId: "graph-alpha",
      reason: "Approve publication before completing the session.",
      requestedAt: "2026-04-24T10:03:00.000Z",
      requestedByNodeId: "worker-it",
      sessionId: "session-approval-response",
      status: "pending",
      updatedAt: "2026-04-24T10:03:00.000Z"
    });

    const observedApprovals: ApprovalRecord[] = [];
    const service = new RunnerService({
      context: runtimeContext,
      observationPublisher: {
        publishApprovalUpdated: (record) => {
          observedApprovals.push(record);
          return Promise.resolve();
        },
        publishConversationUpdated: () => Promise.resolve(),
        publishSessionUpdated: () => Promise.resolve(),
        publishTurnUpdated: () => Promise.resolve()
      },
      transport: new InMemoryRunnerTransport()
    });
    const approvalResponseMessage = entangleA2AMessageSchema.parse({
      constraints: {
        approvalRequiredBeforeAction: false
      },
      conversationId: "conv-approval-response",
      fromNodeId: "reviewer-it",
      fromPubkey: remotePublicKey,
      graphId: "graph-alpha",
      intent: "Complete after approval.",
      messageType: "approval.response",
      parentMessageId: approvalRequestMessageId,
      protocol: "entangle.a2a.v1",
      responsePolicy: {
        closeOnResult: true,
        maxFollowups: 0,
        responseRequired: false
      },
      sessionId: "session-approval-response",
      toNodeId: "worker-it",
      toPubkey: runtimeContext.identityContext.publicKey,
      turnId: "approval-response-turn",
      work: {
        artifactRefs: [],
        metadata: {
          approval: {
            approvalId: "approval-response-alpha",
            decision: "approved"
          }
        },
        summary: "Approval is granted."
      }
    });

    const result = await service.handleInboundEnvelope({
      eventId: approvalResponseMessageId,
      message: approvalResponseMessage,
      receivedAt: "2026-04-24T10:06:00.000Z"
    });

    const [approvalRecord, conversationRecord, sessionRecord] = await Promise.all([
      readApprovalRecord(statePaths, "approval-response-alpha"),
      readConversationRecord(statePaths, "conv-approval-response"),
      readSessionRecord(statePaths, "session-approval-response")
    ]);

    expect(result.handled).toBe(true);
    expect(approvalRecord?.status).toBe("approved");
    expect(approvalRecord).toMatchObject({
      responseEventId: approvalResponseMessageId,
      responseSignerPubkey: remotePublicKey
    });
    expect(observedApprovals).toEqual([
      expect.objectContaining({
        approvalId: "approval-response-alpha",
        approverNodeIds: ["reviewer-it"],
        responseEventId: approvalResponseMessageId,
        responseSignerPubkey: remotePublicKey,
        status: "approved"
      })
    ]);
    expect(conversationRecord?.status).toBe("closed");
    expect(sessionRecord?.status).toBe("completed");
    expect(sessionRecord?.activeConversationIds).toEqual([]);
    expect(sessionRecord?.waitingApprovalIds).toEqual([]);
    expect(sessionRecord?.lastMessageId).toBe(approvalResponseMessageId);
    expect(sessionRecord?.lastMessageType).toBe("approval.response");
  });

  it("ignores approval responses from nodes outside the approver set", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const approvalRequestMessageId =
      "5656565656565656565656565656565656565656565656565656565656565656";
    const unauthorizedResponseMessageId =
      "7878787878787878787878787878787878787878787878787878787878787878";

    await writeSessionRecord(statePaths, {
      activeConversationIds: ["conv-approval-unauthorized"],
      graphId: "graph-alpha",
      intent: "Ignore unauthorized approval.",
      lastMessageId: approvalRequestMessageId,
      lastMessageType: "approval.request",
      openedAt: "2026-04-24T10:00:00.000Z",
      ownerNodeId: "worker-it",
      rootArtifactIds: [],
      sessionId: "session-approval-unauthorized",
      status: "waiting_approval",
      traceId: "session-approval-unauthorized",
      updatedAt: "2026-04-24T10:05:00.000Z",
      waitingApprovalIds: ["approval-unauthorized-alpha"]
    });
    await writeConversationRecord(statePaths, {
      artifactIds: [],
      conversationId: "conv-approval-unauthorized",
      followupCount: 0,
      graphId: "graph-alpha",
      initiator: "self",
      lastOutboundMessageId: approvalRequestMessageId,
      lastMessageType: "approval.request",
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
      sessionId: "session-approval-unauthorized",
      status: "awaiting_approval",
      updatedAt: "2026-04-24T10:04:00.000Z"
    });
    await writeApprovalRecord(statePaths, {
      approvalId: "approval-unauthorized-alpha",
      approverNodeIds: ["reviewer-it"],
      conversationId: "conv-approval-unauthorized",
      graphId: "graph-alpha",
      reason: "Only reviewer-it may approve this gate.",
      requestedAt: "2026-04-24T10:03:00.000Z",
      requestedByNodeId: "worker-it",
      sessionId: "session-approval-unauthorized",
      status: "pending",
      updatedAt: "2026-04-24T10:03:00.000Z"
    });

    const observedApprovals: ApprovalRecord[] = [];
    const service = new RunnerService({
      context: runtimeContext,
      observationPublisher: {
        publishApprovalUpdated: (record) => {
          observedApprovals.push(record);
          return Promise.resolve();
        },
        publishConversationUpdated: () => Promise.resolve(),
        publishSessionUpdated: () => Promise.resolve(),
        publishTurnUpdated: () => Promise.resolve()
      },
      transport: new InMemoryRunnerTransport()
    });
    const approvalResponseMessage = entangleA2AMessageSchema.parse({
      constraints: {
        approvalRequiredBeforeAction: false
      },
      conversationId: "conv-approval-unauthorized",
      fromNodeId: "intruder-it",
      fromPubkey: remotePublicKey,
      graphId: "graph-alpha",
      intent: "Ignore unauthorized approval.",
      messageType: "approval.response",
      parentMessageId: approvalRequestMessageId,
      protocol: "entangle.a2a.v1",
      responsePolicy: {
        closeOnResult: true,
        maxFollowups: 0,
        responseRequired: false
      },
      sessionId: "session-approval-unauthorized",
      toNodeId: "worker-it",
      toPubkey: runtimeContext.identityContext.publicKey,
      turnId: "approval-unauthorized-turn",
      work: {
        artifactRefs: [],
        metadata: {
          approval: {
            approvalId: "approval-unauthorized-alpha",
            decision: "approved"
          }
        },
        summary: "Approval is granted by the wrong node."
      }
    });

    const result = await service.handleInboundEnvelope({
      eventId: unauthorizedResponseMessageId,
      message: approvalResponseMessage,
      receivedAt: "2026-04-24T10:06:00.000Z"
    });

    const [approvalRecord, conversationRecord, sessionRecord] = await Promise.all([
      readApprovalRecord(statePaths, "approval-unauthorized-alpha"),
      readConversationRecord(statePaths, "conv-approval-unauthorized"),
      readSessionRecord(statePaths, "session-approval-unauthorized")
    ]);

    expect(result.handled).toBe(true);
    expect(approvalRecord).toMatchObject({
      approvalId: "approval-unauthorized-alpha",
      approverNodeIds: ["reviewer-it"],
      status: "pending"
    });
    expect(approvalRecord?.responseEventId).toBeUndefined();
    expect(approvalRecord?.responseSignerPubkey).toBeUndefined();
    expect(observedApprovals).toEqual([]);
    expect(conversationRecord?.status).toBe("awaiting_approval");
    expect(sessionRecord?.status).toBe("waiting_approval");
    expect(sessionRecord?.waitingApprovalIds).toEqual([
      "approval-unauthorized-alpha"
    ]);
  });

  it("applies rejected approval responses and fails the blocked session", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const approvalRequestMessageId =
      "1212121212121212121212121212121212121212121212121212121212121212";
    const approvalResponseMessageId =
      "3434343434343434343434343434343434343434343434343434343434343434";

    await writeSessionRecord(statePaths, {
      activeConversationIds: ["conv-approval-rejected"],
      graphId: "graph-alpha",
      intent: "Fail after rejected approval.",
      lastMessageId: approvalRequestMessageId,
      lastMessageType: "approval.request",
      openedAt: "2026-04-24T10:00:00.000Z",
      ownerNodeId: "worker-it",
      rootArtifactIds: [],
      sessionId: "session-approval-rejected",
      status: "waiting_approval",
      traceId: "session-approval-rejected",
      updatedAt: "2026-04-24T10:05:00.000Z",
      waitingApprovalIds: ["approval-rejected-alpha"]
    });
    await writeConversationRecord(statePaths, {
      artifactIds: [],
      conversationId: "conv-approval-rejected",
      followupCount: 0,
      graphId: "graph-alpha",
      initiator: "self",
      lastOutboundMessageId: approvalRequestMessageId,
      lastMessageType: "approval.request",
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
      sessionId: "session-approval-rejected",
      status: "awaiting_approval",
      updatedAt: "2026-04-24T10:04:00.000Z"
    });
    await writeApprovalRecord(statePaths, {
      approvalId: "approval-rejected-alpha",
      approverNodeIds: ["reviewer-it"],
      conversationId: "conv-approval-rejected",
      graphId: "graph-alpha",
      reason: "Approve publication before completing the session.",
      requestedAt: "2026-04-24T10:03:00.000Z",
      requestedByNodeId: "worker-it",
      sessionId: "session-approval-rejected",
      status: "pending",
      updatedAt: "2026-04-24T10:03:00.000Z"
    });

    const service = new RunnerService({
      context: runtimeContext,
      transport: new InMemoryRunnerTransport()
    });
    const approvalResponseMessage = entangleA2AMessageSchema.parse({
      constraints: {
        approvalRequiredBeforeAction: false
      },
      conversationId: "conv-approval-rejected",
      fromNodeId: "reviewer-it",
      fromPubkey: remotePublicKey,
      graphId: "graph-alpha",
      intent: "Fail after rejected approval.",
      messageType: "approval.response",
      parentMessageId: approvalRequestMessageId,
      protocol: "entangle.a2a.v1",
      responsePolicy: {
        closeOnResult: true,
        maxFollowups: 0,
        responseRequired: false
      },
      sessionId: "session-approval-rejected",
      toNodeId: "worker-it",
      toPubkey: runtimeContext.identityContext.publicKey,
      turnId: "approval-rejected-turn",
      work: {
        artifactRefs: [],
        metadata: {
          approval: {
            approvalId: "approval-rejected-alpha",
            decision: "rejected"
          }
        },
        summary: "Approval is rejected."
      }
    });

    const result = await service.handleInboundEnvelope({
      eventId: approvalResponseMessageId,
      message: approvalResponseMessage,
      receivedAt: "2026-04-24T10:06:00.000Z"
    });

    const [approvalRecord, conversationRecord, sessionRecord] = await Promise.all([
      readApprovalRecord(statePaths, "approval-rejected-alpha"),
      readConversationRecord(statePaths, "conv-approval-rejected"),
      readSessionRecord(statePaths, "session-approval-rejected")
    ]);

    expect(result.handled).toBe(true);
    expect(approvalRecord?.status).toBe("rejected");
    expect(approvalRecord).toMatchObject({
      responseEventId: approvalResponseMessageId,
      responseSignerPubkey: remotePublicKey
    });
    expect(conversationRecord?.status).toBe("closed");
    expect(sessionRecord?.status).toBe("failed");
    expect(sessionRecord?.activeConversationIds).toEqual([]);
    expect(sessionRecord?.waitingApprovalIds).toEqual([]);
    expect(sessionRecord?.lastMessageId).toBe(approvalResponseMessageId);
    expect(sessionRecord?.lastMessageType).toBe("approval.response");
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
      initiator: "peer",
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

  it("creates pending source-change proposals from published git artifacts", async () => {
    const fixture = await createRuntimeFixture({
      remotePublication: "bare_repo"
    });
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    if (!fixture.remoteRepositoryPath) {
      throw new Error("Expected a bare remote repository path for retrieval tests.");
    }

    const inboundArtifact = await createPublishedGitArtifact({
      artifactId: "proposal-report",
      remoteRepositoryPath: fixture.remoteRepositoryPath,
      summary: "Promote this report into source review.\n"
    });
    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const observedSourceChanges: Array<{
      artifactRefs: ArtifactRef[];
      candidate: SourceChangeCandidateRecord;
    }> = [];
    const service = new RunnerService({
      context: runtimeContext,
      observationPublisher: {
        publishConversationUpdated: () => Promise.resolve(),
        publishSessionUpdated: () => Promise.resolve(),
        publishSourceChangeRefObserved: (input) => {
          observedSourceChanges.push({
            artifactRefs: input.artifactRefs,
            candidate: input.candidate
          });
          return Promise.resolve();
        },
        publishTurnUpdated: () => Promise.resolve()
      },
      transport: new InMemoryRunnerTransport()
    });

    const result = await service.requestArtifactSourceChangeProposal({
      artifactRef: inboundArtifact,
      proposalId: "artifact-proposal-alpha",
      reason: "Prepare artifact for source review.",
      requestedAt: "2026-04-29T10:00:00.000Z",
      requestedBy: "operator-main",
      targetPath: "proposals/report.md"
    });

    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const candidates = await listSourceChangeCandidateRecords(statePaths);
    const turns = await listRunnerTurnRecords(statePaths);
    const copiedReport = await readFile(
      path.join(
        runtimeContext.workspace.sourceWorkspaceRoot!,
        "proposals",
        "report.md"
      ),
      "utf8"
    );

    expect(result).toMatchObject({
      artifactId: "proposal-report",
      candidateId: "artifact-proposal-alpha",
      sourceChangeStatus: "changed"
    });
    expect(copiedReport).toContain("Promote this report into source review.");
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      candidateId: "artifact-proposal-alpha",
      sourceChangeSummary: {
        status: "changed"
      },
      status: "pending_review",
      turnId: "artifact-proposal-alpha"
    });
    expect(candidates[0]?.sourceChangeSummary.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "proposals/report.md",
          status: "added"
        })
      ])
    );
    expect(turns[0]).toMatchObject({
      consumedArtifactIds: ["proposal-report"],
      sourceChangeCandidateIds: ["artifact-proposal-alpha"],
      triggerKind: "operator"
    });
    const observedSourceChange = observedSourceChanges[0];
    const observedSourceArtifact = observedSourceChange?.artifactRefs[0];
    expect(observedSourceArtifact?.artifactId).toBe("proposal-report");
    expect(observedSourceChange?.candidate.candidateId).toBe(
      "artifact-proposal-alpha"
    );
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
        "gitea",
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

  it("restores published git artifacts through the runner-owned command path", async () => {
    const fixture = await createRuntimeFixture({
      remotePublication: "bare_repo"
    });
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    if (!fixture.remoteRepositoryPath) {
      throw new Error("Expected a bare remote repository path for restore tests.");
    }

    const inboundArtifact = await createPublishedGitArtifact({
      remoteRepositoryPath: fixture.remoteRepositoryPath,
      summary: "Restore this artifact.\n"
    });
    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const observedArtifacts: ObservedArtifactRecord[] = [];
    const service = new RunnerService({
      context: runtimeContext,
      observationPublisher: {
        publishArtifactRefObserved(record) {
          observedArtifacts.push(record);
          return Promise.resolve();
        },
        publishConversationUpdated: () => Promise.resolve(),
        publishSessionUpdated: () => Promise.resolve(),
        publishTurnUpdated: () => Promise.resolve()
      },
      transport: new InMemoryRunnerTransport()
    });

    const result = await service.requestArtifactRestore({
      artifactRef: inboundArtifact,
      reason: "Restore for review.",
      requestedAt: "2026-04-29T10:00:00.000Z",
      requestedBy: "operator-main",
      restoreId: "restore-alpha"
    });

    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const artifactRecords = await listArtifactRecords(statePaths);
    const restoredArtifact = artifactRecords.find(
      (artifactRecord) => artifactRecord.ref.artifactId === inboundArtifact.artifactId
    );

    expect(result).toEqual({
      artifactId: inboundArtifact.artifactId,
      retrievalState: "retrieved"
    });
    expect(restoredArtifact?.retrieval?.state).toBe("retrieved");
    expect(restoredArtifact?.materialization?.repoPath).toContain(
      runtimeContext.workspace.retrievalRoot
    );
    expect(observedArtifacts[0]?.artifactRecord.ref.artifactId).toBe(
      inboundArtifact.artifactId
    );
    expect(observedArtifacts[0]?.artifactRecord.retrieval?.state).toBe(
      "retrieved"
    );
    expect(observedArtifacts[0]?.artifactPreview?.available).toBe(true);
  });

  it("persists and observes restore failures on the runner-owned command path", async () => {
    const fixture = await createRuntimeFixture({
      remotePublication: "bare_repo"
    });
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    if (!fixture.remoteRepositoryPath) {
      throw new Error("Expected a bare remote repository path for restore tests.");
    }

    const inboundArtifact = await createPublishedGitArtifact({
      remoteRepositoryPath: fixture.remoteRepositoryPath
    });
    delete inboundArtifact.locator.repositoryName;
    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const observedArtifacts: ObservedArtifactRecord[] = [];
    const service = new RunnerService({
      context: runtimeContext,
      observationPublisher: {
        publishArtifactRefObserved(record) {
          observedArtifacts.push(record);
          return Promise.resolve();
        },
        publishConversationUpdated: () => Promise.resolve(),
        publishSessionUpdated: () => Promise.resolve(),
        publishTurnUpdated: () => Promise.resolve()
      },
      transport: new InMemoryRunnerTransport()
    });

    const result = await service.requestArtifactRestore({
      artifactRef: inboundArtifact,
      reason: "Restore invalid artifact.",
      requestedAt: "2026-04-29T10:00:00.000Z",
      requestedBy: "operator-main"
    });

    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const artifactRecords = await listArtifactRecords(statePaths);
    const failedArtifact = artifactRecords.find(
      (artifactRecord) => artifactRecord.ref.artifactId === inboundArtifact.artifactId
    );

    expect(result).toMatchObject({
      artifactId: inboundArtifact.artifactId,
      retrievalState: "failed"
    });
    expect(result.message).toContain("cannot resolve the remote repository");
    expect(failedArtifact?.retrieval?.state).toBe("failed");
    expect(observedArtifacts[0]?.artifactRecord.retrieval?.state).toBe("failed");
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
    expect(artifactRecord.publication?.remoteName).toBe("entangle-gitea");
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
    expect(turnRecord?.engineRequestSummary).toMatchObject({
      actionContractContextIncluded: true,
      agentRuntimeContextIncluded: true,
      artifactInputCount: 0,
      artifactRefCount: 0,
      executionLimits: {
        maxOutputTokens: 1536,
        maxToolTurns: 5
      },
      inboundMessageContextIncluded: true,
      interactionPromptPartCount: 13,
      peerRouteContextIncluded: false,
      policyContextIncluded: true,
      systemPromptPartCount: 4,
      toolDefinitionCount: 0,
      workspaceBoundaryContextIncluded: true
    });
    expect(turnRecord?.engineRequestSummary?.generatedAt.localeCompare(
      turnRecord?.updatedAt ?? ""
    )).toBeLessThanOrEqual(0);
    expect(turnRecord?.engineRequestSummary?.memoryRefCount).toBeGreaterThan(0);
    expect(turnRecord?.memoryRepositorySyncOutcome?.status).toBe("committed");
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

    const wikiRepositoryRoot = runtimeContext.workspace.wikiRepositoryRoot;
    if (!wikiRepositoryRoot) {
      throw new Error("Expected a wiki repository root in runtime context.");
    }

    const wikiRepositoryTaskPage = await readFile(
      path.join(
        wikiRepositoryRoot,
        "tasks",
        "session-alpha",
        `${turnRecord?.turnId}.md`
      ),
      "utf8"
    );
    expect(wikiRepositoryTaskPage).toContain(
      `# Task Memory session-alpha / ${turnRecord?.turnId}`
    );

    const wikiRepositoryHead = spawnSync(
      "git",
      ["-C", wikiRepositoryRoot, "rev-parse", "HEAD"],
      {
        encoding: "utf8"
      }
    );
    expect(wikiRepositoryHead.status).toBe(0);
    if (turnRecord?.memoryRepositorySyncOutcome?.status !== "committed") {
      throw new Error("Expected a committed wiki repository sync outcome.");
    }
    expect(wikiRepositoryHead.stdout.trim()).toBe(
      turnRecord.memoryRepositorySyncOutcome.commit
    );

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
    expect(authorEmail.stdout.trim()).toBe("worker-it@entangle.example");

    await service.stop();
  });

  it("preserves the materialized artifact and records publication failure when the remote is unavailable", async () => {
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
    expect(artifactRecord.publication?.remoteName).toBe("entangle-gitea");
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

  it("rejects inbound envelopes whose signer does not match fromPubkey", async () => {
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
        signerPubkey: docsPublicKey
      })
    );

    expect(result).toEqual({
      handled: false,
      reason: "signer_mismatch"
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
      initiator: "self",
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
      initiator: "self",
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
      initiator: "self",
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
      initiator: "self",
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
      initiator: "self",
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
