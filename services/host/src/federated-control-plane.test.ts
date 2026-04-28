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
  hostAuthorityPubkey: string;
  runnerPubkey: string;
  runnerSecretKey: Uint8Array;
}): EntangleObservationEvent {
  return buildEntangleObservationNostrEvent({
    payload: {
      assignmentId: "assignment-alpha",
      eventType: "runtime.status",
      graphId: "graph-alpha",
      graphRevisionId: "graph-alpha-rev-1",
      hostAuthorityPubkey: input.hostAuthorityPubkey,
      nodeId: "worker-it",
      observedAt: "2026-04-26T12:00:03.000Z",
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
      })
    ]);
    expect(transport.publishedControlEvents.map((event) => event.relayUrls)).toEqual([
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
});
