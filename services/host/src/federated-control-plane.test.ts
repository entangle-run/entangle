import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  buildEntangleControlNostrEvent,
  buildEntangleObservationNostrEvent,
  type EntangleNostrFabricSubscription,
  type EntangleNostrPublishedEvent
} from "@entangle/nostr-fabric";
import type {
  EntangleControlEvent,
  EntangleControlEventPayload,
  EntangleObservationEvent,
  RuntimeAssignmentRecord
} from "@entangle/types";
import { runtimeAssignmentRecordSchema } from "@entangle/types";
import { generateSecretKey, getPublicKey } from "nostr-tools";
import { afterEach, describe, expect, it, vi } from "vitest";

const createdDirectories: string[] = [];

class FakeHostFederatedTransport {
  publishedControlEvents: Array<{
    payload: EntangleControlEventPayload;
    relayUrls: string[];
  }> = [];
  subscription:
    | {
        hostAuthorityPubkey: string;
        onEvent: (event: EntangleObservationEvent) => Promise<void> | void;
        relayUrls: string[];
      }
    | undefined;

  constructor(private readonly hostSecretKey: Uint8Array) {}

  close(): Promise<void> {
    return Promise.resolve();
  }

  publishControlEvent(input: {
    authRequired?: boolean;
    causationEventId?: string;
    correlationId?: string;
    payload: EntangleControlEventPayload;
    relayUrls: string[];
  }): Promise<EntangleNostrPublishedEvent<EntangleControlEvent>> {
    this.publishedControlEvents.push({
      payload: input.payload,
      relayUrls: input.relayUrls
    });
    const built = buildEntangleControlNostrEvent({
      causationEventId: input.causationEventId,
      correlationId: input.correlationId,
      payload: input.payload,
      signerSecretKey: this.hostSecretKey
    });

    return Promise.resolve({
      event: built.event,
      relayUrls: input.relayUrls,
      wrappedEvent: built.wrappedEvent,
      wrappedEventId: built.wrappedEvent.id
    });
  }

  subscribeObservationEvents(input: {
    authRequired?: boolean;
    expectedRunnerPubkey?: string;
    hostAuthorityPubkey: string;
    onEvent: (event: EntangleObservationEvent) => Promise<void> | void;
    relayUrls: string[];
  }): Promise<EntangleNostrFabricSubscription> {
    this.subscription = {
      hostAuthorityPubkey: input.hostAuthorityPubkey,
      onEvent: input.onEvent,
      relayUrls: input.relayUrls
    };

    return Promise.resolve({
      close: () => {
        this.subscription = undefined;
        return Promise.resolve();
      }
    });
  }
}

async function setupHostState() {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "entangle-host-fed-"));
  createdDirectories.push(tempRoot);
  process.env.ENTANGLE_HOME = tempRoot;
  process.env.ENTANGLE_SECRETS_HOME = path.join(tempRoot, ".entangle-secrets");
  process.env.ENTANGLE_RUNTIME_BACKEND = "memory";
  process.env.ENTANGLE_HOST_LOGGER = "false";
  vi.resetModules();
  const [stateModule, controlPlaneModule] = await Promise.all([
    import("./state.js"),
    import("./federated-control-plane.js")
  ]);
  await stateModule.initializeHostState();
  const authority = await stateModule.exportHostAuthority();
  const hostSecretKey = Uint8Array.from(Buffer.from(authority.secretKey, "hex"));

  return {
    authority,
    controlPlaneModule,
    hostSecretKey,
    stateModule
  };
}

function buildRunnerHello(input: {
  hostAuthorityPubkey: string;
  runnerPubkey: string;
  runnerSecretKey: Uint8Array;
}): EntangleObservationEvent {
  return buildEntangleObservationNostrEvent({
    payload: {
      capabilities: {
        agentEngineKinds: ["opencode_server"],
        labels: ["worker"],
        maxAssignments: 1,
        runtimeKinds: ["agent_runner"],
        supportsLocalWorkspace: true,
        supportsNip59: true
      },
      eventType: "runner.hello",
      hostAuthorityPubkey: input.hostAuthorityPubkey,
      issuedAt: "2026-04-26T12:00:00.000Z",
      nonce: "hello-nonce",
      protocol: "entangle.observe.v1",
      runnerId: "runner-alpha",
      runnerPubkey: input.runnerPubkey
    },
    signerSecretKey: input.runnerSecretKey
  }).event;
}

function buildRunnerHeartbeat(input: {
  hostAuthorityPubkey: string;
  runnerPubkey: string;
  runnerSecretKey: Uint8Array;
}): EntangleObservationEvent {
  return buildEntangleObservationNostrEvent({
    payload: {
      assignmentIds: ["assignment-alpha"],
      eventType: "runner.heartbeat",
      hostAuthorityPubkey: input.hostAuthorityPubkey,
      observedAt: "2026-04-26T12:00:30.000Z",
      operationalState: "ready",
      protocol: "entangle.observe.v1",
      runnerId: "runner-alpha",
      runnerPubkey: input.runnerPubkey
    },
    signerSecretKey: input.runnerSecretKey
  }).event;
}

function buildRuntimeStatus(input: {
  assignmentId?: string;
  clientUrl?: string;
  graphId?: string;
  graphRevisionId?: string;
  hostAuthorityPubkey: string;
  nodeId?: string;
  observedAt?: string;
  runnerPubkey: string;
  runnerSecretKey: Uint8Array;
}): EntangleObservationEvent {
  return buildEntangleObservationNostrEvent({
    payload: {
      assignmentId: input.assignmentId ?? "assignment-alpha",
      ...(input.clientUrl ? { clientUrl: input.clientUrl } : {}),
      eventType: "runtime.status",
      graphId: input.graphId ?? "graph-alpha",
      graphRevisionId: input.graphRevisionId ?? "graph-alpha-rev-1",
      hostAuthorityPubkey: input.hostAuthorityPubkey,
      nodeId: input.nodeId ?? "worker-it",
      observedAt: input.observedAt ?? "2026-04-26T12:00:03.000Z",
      observedState: "running",
      protocol: "entangle.observe.v1",
      restartGeneration: 0,
      runnerId: "runner-alpha",
      runnerPubkey: input.runnerPubkey,
      statusMessage: "Runtime is running from runner observation."
    },
    signerSecretKey: input.runnerSecretKey
  }).event;
}

function buildAssignmentReceipt(input: {
  hostAuthorityPubkey: string;
  runnerPubkey: string;
  runnerSecretKey: Uint8Array;
}): EntangleObservationEvent {
  return buildEntangleObservationNostrEvent({
    payload: {
      assignmentId: "assignment-alpha",
      eventType: "assignment.receipt",
      hostAuthorityPubkey: input.hostAuthorityPubkey,
      message: "Assignment runtime is running.",
      observedAt: "2026-04-26T12:00:02.000Z",
      protocol: "entangle.observe.v1",
      receiptKind: "started",
      runnerId: "runner-alpha",
      runnerPubkey: input.runnerPubkey
    },
    signerSecretKey: input.runnerSecretKey
  }).event;
}

function buildRuntimeCommandReceipt(input: {
  hostAuthorityPubkey: string;
  runnerPubkey: string;
  runnerSecretKey: Uint8Array;
}): EntangleObservationEvent {
  return buildEntangleObservationNostrEvent({
    payload: {
      artifactId: "artifact-alpha",
      assignmentId: "assignment-alpha",
      candidateId: "artifact-proposal-alpha",
      commandEventType: "runtime.artifact.propose_source_change",
      commandId: "cmd-artifact-proposal-alpha",
      eventType: "runtime.command.receipt",
      graphId: "graph-alpha",
      hostAuthorityPubkey: input.hostAuthorityPubkey,
      message: "Artifact produced a source-change proposal.",
      nodeId: "worker-it",
      observedAt: "2026-04-26T12:00:02.500Z",
      proposalId: "artifact-proposal-alpha",
      protocol: "entangle.observe.v1",
      runnerId: "runner-alpha",
      runnerPubkey: input.runnerPubkey,
      status: "completed",
      targetPath: "proposals/report.md"
    },
    signerSecretKey: input.runnerSecretKey
  }).event;
}

function buildSourceHistoryRef(input: {
  hostAuthorityPubkey: string;
  runnerPubkey: string;
  runnerSecretKey: Uint8Array;
}): EntangleObservationEvent {
  return buildEntangleObservationNostrEvent({
    payload: {
      eventType: "source_history.ref",
      graphId: "graph-alpha",
      history: {
        appliedAt: "2026-04-26T12:00:04.000Z",
        appliedBy: "user-main",
        baseTree: "tree-base-alpha",
        branch: "entangle-source-history",
        candidateId: "candidate-alpha",
        commit: "commit-source-history-alpha",
        graphId: "graph-alpha",
        graphRevisionId: "graph-alpha-rev-1",
        headTree: "tree-head-alpha",
        mode: "already_in_workspace",
        nodeId: "worker-it",
        sourceChangeSummary: {
          additions: 1,
          checkedAt: "2026-04-26T12:00:03.000Z",
          deletions: 0,
          fileCount: 1,
          files: [
            {
              additions: 1,
              deletions: 0,
              path: "src/index.ts",
              status: "modified"
            }
          ],
          status: "changed",
          truncated: false
        },
        sourceHistoryId: "source-history-candidate-alpha",
        turnId: "turn-alpha",
        updatedAt: "2026-04-26T12:00:04.000Z"
      },
      hostAuthorityPubkey: input.hostAuthorityPubkey,
      nodeId: "worker-it",
      observedAt: "2026-04-26T12:00:04.000Z",
      protocol: "entangle.observe.v1",
      runnerId: "runner-alpha",
      runnerPubkey: input.runnerPubkey,
      sourceHistoryId: "source-history-candidate-alpha"
    },
    signerSecretKey: input.runnerSecretKey
  }).event;
}

function buildAssignment(input: {
  hostAuthorityPubkey: string;
  runnerPubkey: string;
}): RuntimeAssignmentRecord {
  return runtimeAssignmentRecordSchema.parse({
    assignmentId: "assignment-alpha",
    assignmentRevision: 0,
    graphId: "federated-smoke-graph",
    graphRevisionId: "federated-smoke-revision",
    hostAuthorityPubkey: input.hostAuthorityPubkey,
    lease: {
      expiresAt: "2026-04-26T13:00:00.000Z",
      issuedAt: "2026-04-26T12:00:00.000Z",
      leaseId: "lease-alpha",
      renewBy: "2026-04-26T12:48:00.000Z"
    },
    nodeId: "builder",
    offeredAt: "2026-04-26T12:00:00.000Z",
    runnerId: "runner-alpha",
    runnerPubkey: input.runnerPubkey,
    runtimeKind: "agent_runner",
    schemaVersion: "1",
    status: "offered",
    updatedAt: "2026-04-26T12:00:00.000Z"
  });
}

afterEach(async () => {
  delete process.env.ENTANGLE_HOME;
  delete process.env.ENTANGLE_SECRETS_HOME;
  delete process.env.ENTANGLE_RUNTIME_BACKEND;
  delete process.env.ENTANGLE_HOST_LOGGER;
  await Promise.all(
    createdDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true })
    )
  );
  vi.resetModules();
});

describe("Host federated control plane", () => {
  it("starts observation intake from Host Authority and catalog relay defaults", async () => {
    const { authority, hostSecretKey } = await setupHostState();
    const runtimeModule = await import("./host-federated-runtime.js");
    const transport = new FakeHostFederatedTransport(hostSecretKey);

    const runtime = await runtimeModule.startHostFederatedControlPlane({
      transport
    });

    expect(runtime?.relayUrls).toEqual(["ws://strfry:7777"]);
    expect(transport.subscription).toMatchObject({
      hostAuthorityPubkey: authority.authority.publicKey,
      relayUrls: ["ws://strfry:7777"]
    });

    await runtime?.close();
    expect(transport.subscription).toBeUndefined();
  });

  it("preserves projected User Node runtime observations across Host runtime synchronization", async () => {
    const { authority, controlPlaneModule, hostSecretKey, stateModule } =
      await setupHostState();
    const graphResponse = await stateModule.applyGraph({
      edges: [],
      graphId: "graph-alpha",
      name: "Graph Alpha",
      nodes: [
        {
          displayName: "User Main",
          nodeId: "user-main",
          nodeKind: "user"
        }
      ],
      schemaVersion: "1"
    });
    expect(graphResponse.validation.ok).toBe(true);
    expect(graphResponse.activeRevisionId).toBeDefined();

    const runnerSecretKey = generateSecretKey();
    const runnerPubkey = getPublicKey(runnerSecretKey);
    const transport = new FakeHostFederatedTransport(hostSecretKey);
    const controlPlane = new controlPlaneModule.HostFederatedControlPlane({
      clock: () => "2026-04-26T12:00:05.000Z",
      transport
    });

    await controlPlane.handleObservationEvent(
      buildRunnerHello({
        hostAuthorityPubkey: authority.authority.publicKey,
        runnerPubkey,
        runnerSecretKey
      })
    );
    await controlPlane.handleObservationEvent(
      buildRuntimeStatus({
        assignmentId: "assignment-user-main",
        clientUrl: "http://127.0.0.1:4173/",
        graphId: "graph-alpha",
        graphRevisionId: graphResponse.activeRevisionId,
        hostAuthorityPubkey: authority.authority.publicKey,
        nodeId: "user-main",
        runnerPubkey,
        runnerSecretKey
      })
    );

    expect(
      (await stateModule.getHostProjectionSnapshot()).runtimes.find(
        (runtime) => runtime.nodeId === "user-main"
      )
    ).toMatchObject({
      clientUrl: "http://127.0.0.1:4173/",
      nodeId: "user-main",
      observedState: "running",
      projection: {
        source: "observation_event"
      }
    });

    await stateModule.listRuntimeInspections();

    expect(
      (await stateModule.getHostProjectionSnapshot()).runtimes.find(
        (runtime) => runtime.nodeId === "user-main"
      )
    ).toMatchObject({
      clientUrl: "http://127.0.0.1:4173/",
      nodeId: "user-main",
      observedState: "running",
      projection: {
        source: "observation_event"
      }
    });
  });

  it("records signed runner observations and publishes hello ack control events", async () => {
    const { authority, controlPlaneModule, hostSecretKey, stateModule } =
      await setupHostState();
    const runnerSecretKey = generateSecretKey();
    const runnerPubkey = getPublicKey(runnerSecretKey);
    const transport = new FakeHostFederatedTransport(hostSecretKey);
    const controlPlane = new controlPlaneModule.HostFederatedControlPlane({
      clock: () => "2026-04-26T12:00:05.000Z",
      transport
    });
    const relayUrls = ["ws://relay.example.test"];

    const helloResult = await controlPlane.handleObservationEvent(
      buildRunnerHello({
        hostAuthorityPubkey: authority.authority.publicKey,
        runnerPubkey,
        runnerSecretKey
      }),
      { relayUrls }
    );

    expect(helloResult).toMatchObject({
      action: "recorded_and_published_control",
      eventType: "runner.hello",
      runnerId: "runner-alpha"
    });
    expect(transport.publishedControlEvents[0]).toMatchObject({
      payload: {
        eventType: "runner.hello.ack",
        issuedAt: "2026-04-26T12:00:05.000Z",
        runnerId: "runner-alpha",
        runnerPubkey,
        trustState: "pending"
      },
      relayUrls
    });

    const heartbeatResult = await controlPlane.handleObservationEvent(
      buildRunnerHeartbeat({
        hostAuthorityPubkey: authority.authority.publicKey,
        runnerPubkey,
        runnerSecretKey
      })
    );
    expect(heartbeatResult).toMatchObject({
      action: "recorded",
      eventType: "runner.heartbeat"
    });

    const receiptResult = await controlPlane.handleObservationEvent(
      buildAssignmentReceipt({
        hostAuthorityPubkey: authority.authority.publicKey,
        runnerPubkey,
        runnerSecretKey
      })
    );
    expect(receiptResult).toMatchObject({
      action: "recorded",
      eventType: "assignment.receipt",
      runnerId: "runner-alpha"
    });

    const commandReceiptResult = await controlPlane.handleObservationEvent(
      buildRuntimeCommandReceipt({
        hostAuthorityPubkey: authority.authority.publicKey,
        runnerPubkey,
        runnerSecretKey
      })
    );
    expect(commandReceiptResult).toMatchObject({
      action: "recorded",
      eventType: "runtime.command.receipt",
      runnerId: "runner-alpha"
    });

    const runtimeStatusResult = await controlPlane.handleObservationEvent(
      buildRuntimeStatus({
        hostAuthorityPubkey: authority.authority.publicKey,
        runnerPubkey,
        runnerSecretKey
      })
    );
    expect(runtimeStatusResult).toMatchObject({
      action: "recorded",
      eventType: "runtime.status",
      runnerId: "runner-alpha"
    });

    const sourceHistoryResult = await controlPlane.handleObservationEvent(
      buildSourceHistoryRef({
        hostAuthorityPubkey: authority.authority.publicKey,
        runnerPubkey,
        runnerSecretKey
      })
    );
    expect(sourceHistoryResult).toMatchObject({
      action: "recorded",
      eventType: "source_history.ref",
      runnerId: "runner-alpha"
    });

    const projection = await stateModule.getHostProjectionSnapshot();
    expect(projection.runners).toHaveLength(1);
    expect(projection.sourceHistoryRefs[0]).toMatchObject({
      sourceHistoryId: "source-history-candidate-alpha"
    });
    expect(projection.assignmentReceipts[0]).toMatchObject({
      assignmentId: "assignment-alpha",
      receiptKind: "started",
      receiptMessage: "Assignment runtime is running.",
      runnerId: "runner-alpha"
    });
    expect(projection.runners[0]).toMatchObject({
      assignmentIds: ["assignment-alpha"],
      operationalState: "ready",
      publicKey: runnerPubkey,
      runnerId: "runner-alpha",
      trustState: "pending"
    });
    expect(projection.runtimes[0]).toMatchObject({
      assignmentId: "assignment-alpha",
      backendKind: "federated",
      desiredState: "running",
      nodeId: "worker-it",
      observedState: "running",
      projection: {
        source: "observation_event"
      },
      runnerId: "runner-alpha"
    });

    const hostEvents = await stateModule.listHostEvents();
    expect(
      hostEvents.events.find(
        (event) => event.type === "runtime.assignment.receipt"
      )
    ).toMatchObject({
      assignmentId: "assignment-alpha",
      receiptKind: "started",
      receiptMessage: "Assignment runtime is running.",
      runnerId: "runner-alpha",
      type: "runtime.assignment.receipt"
    });
    expect(
      hostEvents.events.find(
        (event) => event.type === "runtime.observed_state.changed"
      )
    ).toMatchObject({
      backendKind: "federated",
      graphId: "graph-alpha",
      graphRevisionId: "graph-alpha-rev-1",
      nodeId: "worker-it",
      observedState: "running",
      runtimeHandle: "federated:runner-alpha:assignment-alpha",
      type: "runtime.observed_state.changed"
    });
  });

  it("publishes assignment offers as signed Host control payloads", async () => {
    const { authority, controlPlaneModule, hostSecretKey } =
      await setupHostState();
    const runnerSecretKey = generateSecretKey();
    const runnerPubkey = getPublicKey(runnerSecretKey);
    const transport = new FakeHostFederatedTransport(hostSecretKey);
    const controlPlane = new controlPlaneModule.HostFederatedControlPlane({
      clock: () => "2026-04-26T12:00:10.000Z",
      transport
    });
    const assignment = buildAssignment({
      hostAuthorityPubkey: authority.authority.publicKey,
      runnerPubkey
    });

    const published = await controlPlane.publishRuntimeAssignmentOffer({
      assignment,
      relayUrls: ["ws://relay.example.test"]
    });

    expect(transport.publishedControlEvents[0]?.payload).toMatchObject({
      assignment,
      eventType: "runtime.assignment.offer",
      hostAuthorityPubkey: authority.authority.publicKey,
      issuedAt: "2026-04-26T12:00:10.000Z",
      runnerId: "runner-alpha",
      runnerPubkey
    });
    expect(published.event.envelope.signerPubkey).toBe(
      authority.authority.publicKey
    );
    expect(published.event.envelope.recipientPubkey).toBe(runnerPubkey);
  });

  it("publishes runtime lifecycle commands as signed Host control payloads", async () => {
    const { authority, controlPlaneModule, hostSecretKey } =
      await setupHostState();
    const runnerSecretKey = generateSecretKey();
    const runnerPubkey = getPublicKey(runnerSecretKey);
    const transport = new FakeHostFederatedTransport(hostSecretKey);
    const controlPlane = new controlPlaneModule.HostFederatedControlPlane({
      clock: () => "2026-04-26T12:00:11.000Z",
      transport
    });
    const assignment = buildAssignment({
      hostAuthorityPubkey: authority.authority.publicKey,
      runnerPubkey
    });
    const relayUrls = ["ws://relay.example.test"];

    await controlPlane.publishRuntimeStart({
      assignment,
      commandId: "cmd-start-alpha",
      relayUrls
    });
    await controlPlane.publishRuntimeStop({
      assignment,
      commandId: "cmd-stop-alpha",
      relayUrls
    });
    await controlPlane.publishRuntimeRestart({
      assignment,
      commandId: "cmd-restart-alpha",
      relayUrls
    });
    await controlPlane.publishRuntimeSessionCancel({
      assignment,
      cancellation: {
        cancellationId: "cancel-alpha",
        graphId: assignment.graphId,
        nodeId: assignment.nodeId,
        requestedAt: "2026-04-26T12:00:10.000Z",
        sessionId: "session-alpha",
        status: "requested"
      },
      commandId: "cmd-cancel-alpha",
      relayUrls
    });
    await controlPlane.publishRuntimeArtifactRestore({
      artifactRef: {
        artifactId: "artifact-alpha",
        artifactKind: "report_file",
        backend: "git",
        locator: {
          branch: "artifact-artifact-alpha",
          commit: "abc123",
          gitServiceRef: "gitea",
          namespace: "team-alpha",
          path: "reports/session-alpha/report.md",
          repositoryName: "graph-alpha"
        },
        status: "published"
      },
      assignment,
      commandId: "cmd-artifact-restore-alpha",
      reason: "Restore artifact.",
      relayUrls,
      requestedBy: "operator-main",
      restoreId: "restore-alpha"
    });
    await controlPlane.publishRuntimeArtifactSourceChangeProposal({
      artifactRef: {
        artifactId: "artifact-alpha",
        artifactKind: "report_file",
        backend: "git",
        locator: {
          branch: "artifact-artifact-alpha",
          commit: "abc123",
          gitServiceRef: "gitea",
          namespace: "team-alpha",
          path: "reports/session-alpha/report.md",
          repositoryName: "graph-alpha"
        },
        status: "published"
      },
      assignment,
      commandId: "cmd-artifact-proposal-alpha",
      proposalId: "artifact-proposal-alpha",
      reason: "Prepare artifact as source proposal.",
      relayUrls,
      requestedBy: "operator-main",
      targetPath: "proposals/report.md"
    });
    await controlPlane.publishRuntimeSourceHistoryPublish({
      approvalId: "approval-source-history-publication-alpha",
      assignment,
      commandId: "cmd-source-history-publish-alpha",
      reason: "Retry publication.",
      relayUrls,
      requestedBy: "operator-main",
      retryFailedPublication: true,
      sourceHistoryId: "source-history-alpha",
      target: {
        repositoryName: "graph-alpha-public"
      }
    });
    await controlPlane.publishRuntimeSourceHistoryReplay({
      approvalId: "approval-source-history-replay-alpha",
      assignment,
      commandId: "cmd-source-history-replay-alpha",
      reason: "Replay source history.",
      relayUrls,
      replayedBy: "operator-main",
      replayId: "replay-source-history-alpha",
      sourceHistoryId: "source-history-alpha"
    });
    await controlPlane.publishRuntimeSourceHistoryReconcile({
      approvalId: "approval-source-history-reconcile-alpha",
      assignment,
      commandId: "cmd-source-history-reconcile-alpha",
      reason: "Reconcile source history.",
      relayUrls,
      replayedBy: "operator-main",
      replayId: "reconcile-source-history-alpha",
      sourceHistoryId: "source-history-alpha"
    });
    await controlPlane.publishRuntimeWikiPublish({
      assignment,
      commandId: "cmd-wiki-publish-alpha",
      reason: "Publish wiki.",
      relayUrls,
      requestedBy: "operator-main",
      retryFailedPublication: true,
      target: {
        repositoryName: "wiki-public"
      }
    });
    await controlPlane.publishRuntimeWikiUpsertPage({
      assignment,
      commandId: "cmd-wiki-upsert-page-alpha",
      content: "# Operator Note\n\nPersist this in the runner wiki.\n",
      expectedCurrentSha256:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      mode: "replace",
      path: "operator/notes.md",
      reason: "Update wiki page.",
      relayUrls,
      requestedBy: "operator-main"
    });
    await controlPlane.publishRuntimeWikiPatchSet({
      assignment,
      commandId: "cmd-wiki-patch-set-alpha",
      pages: [
        {
          content: "# Patch Set Note\n",
          path: "operator/patch-set.md"
        },
        {
          content: "\nAppend this note.\n",
          expectedCurrentSha256:
            "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          mode: "append",
          path: "operator/patch-set-follow-up.md"
        }
      ],
      reason: "Apply wiki patch-set.",
      relayUrls,
      requestedBy: "operator-main"
    });

    expect(transport.publishedControlEvents.map((event) => event.payload)).toEqual([
      expect.objectContaining({
        assignmentId: "assignment-alpha",
        commandId: "cmd-start-alpha",
        eventType: "runtime.start",
        graphId: "federated-smoke-graph",
        hostAuthorityPubkey: authority.authority.publicKey,
        issuedAt: "2026-04-26T12:00:11.000Z",
        nodeId: "builder",
        runnerId: "runner-alpha",
        runnerPubkey
      }),
      expect.objectContaining({
        assignmentId: "assignment-alpha",
        commandId: "cmd-stop-alpha",
        eventType: "runtime.stop",
        graphId: "federated-smoke-graph",
        hostAuthorityPubkey: authority.authority.publicKey,
        issuedAt: "2026-04-26T12:00:11.000Z",
        nodeId: "builder",
        runnerId: "runner-alpha",
        runnerPubkey
      }),
      expect.objectContaining({
        assignmentId: "assignment-alpha",
        commandId: "cmd-restart-alpha",
        eventType: "runtime.restart",
        graphId: "federated-smoke-graph",
        hostAuthorityPubkey: authority.authority.publicKey,
        issuedAt: "2026-04-26T12:00:11.000Z",
        nodeId: "builder",
        runnerId: "runner-alpha",
        runnerPubkey
      }),
      expect.objectContaining({
        assignmentId: "assignment-alpha",
        commandId: "cmd-cancel-alpha",
        eventType: "runtime.session.cancel",
        graphId: "federated-smoke-graph",
        hostAuthorityPubkey: authority.authority.publicKey,
        issuedAt: "2026-04-26T12:00:11.000Z",
        nodeId: "builder",
        runnerId: "runner-alpha",
        runnerPubkey,
        sessionId: "session-alpha"
      }),
      expect.objectContaining({
        artifactId: "artifact-alpha",
        assignmentId: "assignment-alpha",
        commandId: "cmd-artifact-restore-alpha",
        eventType: "runtime.artifact.restore",
        graphId: "federated-smoke-graph",
        hostAuthorityPubkey: authority.authority.publicKey,
        issuedAt: "2026-04-26T12:00:11.000Z",
        nodeId: "builder",
        requestedBy: "operator-main",
        restoreId: "restore-alpha",
        runnerId: "runner-alpha",
        runnerPubkey
      }),
      expect.objectContaining({
        artifactId: "artifact-alpha",
        assignmentId: "assignment-alpha",
        commandId: "cmd-artifact-proposal-alpha",
        eventType: "runtime.artifact.propose_source_change",
        graphId: "federated-smoke-graph",
        hostAuthorityPubkey: authority.authority.publicKey,
        issuedAt: "2026-04-26T12:00:11.000Z",
        nodeId: "builder",
        proposalId: "artifact-proposal-alpha",
        requestedBy: "operator-main",
        runnerId: "runner-alpha",
        runnerPubkey,
        targetPath: "proposals/report.md"
      }),
      expect.objectContaining({
        approvalId: "approval-source-history-publication-alpha",
        assignmentId: "assignment-alpha",
        commandId: "cmd-source-history-publish-alpha",
        eventType: "runtime.source_history.publish",
        graphId: "federated-smoke-graph",
        hostAuthorityPubkey: authority.authority.publicKey,
        issuedAt: "2026-04-26T12:00:11.000Z",
        nodeId: "builder",
        requestedBy: "operator-main",
        retryFailedPublication: true,
        runnerId: "runner-alpha",
        runnerPubkey,
        sourceHistoryId: "source-history-alpha",
        target: {
          repositoryName: "graph-alpha-public"
        }
      }),
      expect.objectContaining({
        approvalId: "approval-source-history-replay-alpha",
        assignmentId: "assignment-alpha",
        commandId: "cmd-source-history-replay-alpha",
        eventType: "runtime.source_history.replay",
        graphId: "federated-smoke-graph",
        hostAuthorityPubkey: authority.authority.publicKey,
        issuedAt: "2026-04-26T12:00:11.000Z",
        nodeId: "builder",
        replayedBy: "operator-main",
        replayId: "replay-source-history-alpha",
        runnerId: "runner-alpha",
        runnerPubkey,
        sourceHistoryId: "source-history-alpha"
      }),
      expect.objectContaining({
        approvalId: "approval-source-history-reconcile-alpha",
        assignmentId: "assignment-alpha",
        commandId: "cmd-source-history-reconcile-alpha",
        eventType: "runtime.source_history.reconcile",
        graphId: "federated-smoke-graph",
        hostAuthorityPubkey: authority.authority.publicKey,
        issuedAt: "2026-04-26T12:00:11.000Z",
        nodeId: "builder",
        replayedBy: "operator-main",
        replayId: "reconcile-source-history-alpha",
        runnerId: "runner-alpha",
        runnerPubkey,
        sourceHistoryId: "source-history-alpha"
      }),
      expect.objectContaining({
        assignmentId: "assignment-alpha",
        commandId: "cmd-wiki-publish-alpha",
        eventType: "runtime.wiki.publish",
        graphId: "federated-smoke-graph",
        hostAuthorityPubkey: authority.authority.publicKey,
        issuedAt: "2026-04-26T12:00:11.000Z",
        nodeId: "builder",
        requestedBy: "operator-main",
        retryFailedPublication: true,
        runnerId: "runner-alpha",
        runnerPubkey,
        target: {
          repositoryName: "wiki-public"
        }
      }),
      expect.objectContaining({
        assignmentId: "assignment-alpha",
        commandId: "cmd-wiki-upsert-page-alpha",
        content: "# Operator Note\n\nPersist this in the runner wiki.\n",
        eventType: "runtime.wiki.upsert_page",
        expectedCurrentSha256:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        graphId: "federated-smoke-graph",
        hostAuthorityPubkey: authority.authority.publicKey,
        issuedAt: "2026-04-26T12:00:11.000Z",
        mode: "replace",
        nodeId: "builder",
        path: "operator/notes.md",
        requestedBy: "operator-main",
        runnerId: "runner-alpha",
        runnerPubkey
      }),
      expect.objectContaining({
        assignmentId: "assignment-alpha",
        commandId: "cmd-wiki-patch-set-alpha",
        eventType: "runtime.wiki.patch_set",
        graphId: "federated-smoke-graph",
        hostAuthorityPubkey: authority.authority.publicKey,
        issuedAt: "2026-04-26T12:00:11.000Z",
        nodeId: "builder",
        pages: [
          {
            content: "# Patch Set Note\n",
            mode: "replace",
            path: "operator/patch-set.md"
          },
          {
            content: "\nAppend this note.\n",
            expectedCurrentSha256:
              "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            mode: "append",
            path: "operator/patch-set-follow-up.md"
          }
        ],
        requestedBy: "operator-main",
        runnerId: "runner-alpha",
        runnerPubkey
      })
    ]);
    expect(transport.publishedControlEvents[3]?.payload).toMatchObject({
      cancellation: {
        cancellationId: "cancel-alpha",
        sessionId: "session-alpha"
      }
    });
    expect(transport.publishedControlEvents.map((event) => event.relayUrls)).toEqual([
      relayUrls,
      relayUrls,
      relayUrls,
      relayUrls,
      relayUrls,
      relayUrls,
      relayUrls,
      relayUrls,
      relayUrls,
      relayUrls,
      relayUrls,
      relayUrls
    ]);
  });

  it("subscribes observation intake through the same handler used by direct ingestion", async () => {
    const { authority, controlPlaneModule, hostSecretKey, stateModule } =
      await setupHostState();
    const runnerSecretKey = generateSecretKey();
    const runnerPubkey = getPublicKey(runnerSecretKey);
    const transport = new FakeHostFederatedTransport(hostSecretKey);
    const controlPlane = new controlPlaneModule.HostFederatedControlPlane({
      transport
    });

    await controlPlane.subscribeObservationEvents({
      hostAuthorityPubkey: authority.authority.publicKey,
      relayUrls: ["ws://relay.example.test"]
    });
    await transport.subscription?.onEvent(
      buildRunnerHello({
        hostAuthorityPubkey: authority.authority.publicKey,
        runnerPubkey,
        runnerSecretKey
      })
    );

    const registry = await stateModule.listRunnerRegistry();
    expect(registry.runners[0]?.registration.runnerId).toBe("runner-alpha");
    expect(transport.publishedControlEvents[0]?.payload.eventType).toBe(
      "runner.hello.ack"
    );
  });

  it("ignores runner hello identity conflicts without crashing the control plane", async () => {
    const { authority, controlPlaneModule, hostSecretKey, stateModule } =
      await setupHostState();
    const originalRunnerSecretKey = generateSecretKey();
    const originalRunnerPubkey = getPublicKey(originalRunnerSecretKey);
    const conflictingRunnerSecretKey = generateSecretKey();
    const conflictingRunnerPubkey = getPublicKey(conflictingRunnerSecretKey);
    const transport = new FakeHostFederatedTransport(hostSecretKey);
    const controlPlane = new controlPlaneModule.HostFederatedControlPlane({
      transport
    });

    const acceptedResult = await controlPlane.handleObservationEvent(
      buildRunnerHello({
        hostAuthorityPubkey: authority.authority.publicKey,
        runnerPubkey: originalRunnerPubkey,
        runnerSecretKey: originalRunnerSecretKey
      }),
      {
        relayUrls: ["ws://relay.example.test"]
      }
    );
    const conflictResult = await controlPlane.handleObservationEvent(
      buildRunnerHello({
        hostAuthorityPubkey: authority.authority.publicKey,
        runnerPubkey: conflictingRunnerPubkey,
        runnerSecretKey: conflictingRunnerSecretKey
      }),
      {
        relayUrls: ["ws://relay.example.test"]
      }
    );
    const heartbeatConflictResult = await controlPlane.handleObservationEvent(
      buildRunnerHeartbeat({
        hostAuthorityPubkey: authority.authority.publicKey,
        runnerPubkey: conflictingRunnerPubkey,
        runnerSecretKey: conflictingRunnerSecretKey
      }),
      {
        relayUrls: ["ws://relay.example.test"]
      }
    );

    const registry = await stateModule.listRunnerRegistry();

    expect(acceptedResult.action).toBe("recorded_and_published_control");
    expect(conflictResult).toMatchObject({
      action: "ignored",
      eventType: "runner.hello",
      reason: "runner_identity_conflict",
      runnerId: "runner-alpha"
    });
    expect(heartbeatConflictResult).toMatchObject({
      action: "ignored",
      eventType: "runner.heartbeat",
      reason: "runner_identity_conflict",
      runnerId: "runner-alpha"
    });
    expect(registry.runners).toHaveLength(1);
    expect(registry.runners[0]?.registration.publicKey).toBe(originalRunnerPubkey);
    expect(transport.publishedControlEvents).toHaveLength(1);
  });
});
