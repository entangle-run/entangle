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

    const projection = await stateModule.getHostProjectionSnapshot();
    expect(projection.runners).toHaveLength(1);
    expect(projection.runners[0]).toMatchObject({
      assignmentIds: ["assignment-alpha"],
      operationalState: "ready",
      publicKey: runnerPubkey,
      runnerId: "runner-alpha",
      trustState: "pending"
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
