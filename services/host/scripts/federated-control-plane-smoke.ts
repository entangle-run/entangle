#!/usr/bin/env tsx

import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
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
  EntangleObservationEventPayload,
  RunnerJoinConfig
} from "@entangle/types";
import { runnerJoinConfigSchema } from "@entangle/types";
import { generateSecretKey, getPublicKey } from "nostr-tools";

const keepTemp = process.argv.includes("--keep-temp");
const relayUrls = ["ws://federated-smoke-relay.invalid"];

type ObservationSubscriber = {
  onEvent: (event: EntangleObservationEvent) => Promise<void> | void;
};

type ControlSubscriber = {
  onEvent: (event: EntangleControlEvent) => Promise<void> | void;
};

class InMemoryFederatedBus {
  private controlSubscriber: ControlSubscriber | undefined;
  private observationSubscriber: ObservationSubscriber | undefined;

  constructor(
    private readonly input: {
      hostSecretKey: Uint8Array;
      runnerSecretKey: Uint8Array;
    }
  ) {}

  close(): Promise<void> {
    this.controlSubscriber = undefined;
    this.observationSubscriber = undefined;
    return Promise.resolve();
  }

  async publishControlEvent(input: {
    authRequired?: boolean;
    causationEventId?: string;
    correlationId?: string;
    payload: EntangleControlEventPayload;
    relayUrls: string[];
  }): Promise<EntangleNostrPublishedEvent<EntangleControlEvent>> {
    const built = buildEntangleControlNostrEvent({
      causationEventId: input.causationEventId,
      correlationId: input.correlationId,
      payload: input.payload,
      signerSecretKey: this.input.hostSecretKey
    });
    await Promise.resolve(this.controlSubscriber?.onEvent(built.event));

    return {
      event: built.event,
      relayUrls: input.relayUrls,
      wrappedEvent: built.wrappedEvent,
      wrappedEventId: built.wrappedEvent.id
    };
  }

  async publishObservationEvent(input: {
    authRequired?: boolean;
    causationEventId?: string;
    correlationId?: string;
    payload: EntangleObservationEventPayload;
    relayUrls: string[];
  }): Promise<EntangleNostrPublishedEvent<EntangleObservationEvent>> {
    const built = buildEntangleObservationNostrEvent({
      causationEventId: input.causationEventId,
      correlationId: input.correlationId,
      payload: input.payload,
      signerSecretKey: this.input.runnerSecretKey
    });
    await Promise.resolve(this.observationSubscriber?.onEvent(built.event));

    return {
      event: built.event,
      relayUrls: input.relayUrls,
      wrappedEvent: built.wrappedEvent,
      wrappedEventId: built.wrappedEvent.id
    };
  }

  subscribeControlEvents(input: {
    authRequired?: boolean;
    expectedHostAuthorityPubkey: string;
    onEvent: (event: EntangleControlEvent) => Promise<void> | void;
    relayUrls: string[];
    runnerPubkey: string;
  }): Promise<EntangleNostrFabricSubscription> {
    this.controlSubscriber = {
      onEvent: input.onEvent
    };

    return Promise.resolve({
      close: () => {
        this.controlSubscriber = undefined;
        return Promise.resolve();
      }
    });
  }

  subscribeObservationEvents(input: {
    authRequired?: boolean;
    expectedRunnerPubkey?: string;
    hostAuthorityPubkey: string;
    onEvent: (event: EntangleObservationEvent) => Promise<void> | void;
    relayUrls: string[];
  }): Promise<EntangleNostrFabricSubscription> {
    this.observationSubscriber = {
      onEvent: input.onEvent
    };

    return Promise.resolve({
      close: () => {
        this.observationSubscriber = undefined;
        return Promise.resolve();
      }
    });
  }
}

function assertCondition(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function printPass(label: string, detail: string): void {
  console.log(`PASS ${label}: ${detail}`);
}

async function main(): Promise<void> {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "entangle-fed-smoke-"));
  const hostHome = path.join(tempRoot, "host-home");
  const hostSecrets = path.join(tempRoot, "host-secrets");
  const runnerRoot = path.join(tempRoot, "runner-root");
  const materializedRoot = path.join(runnerRoot, "materialized");
  await Promise.all([
    mkdir(hostHome, { recursive: true }),
    mkdir(hostSecrets, { recursive: true }),
    mkdir(materializedRoot, { recursive: true })
  ]);

  process.env.ENTANGLE_HOME = hostHome;
  process.env.ENTANGLE_SECRETS_HOME = hostSecrets;
  process.env.ENTANGLE_RUNTIME_BACKEND = "memory";
  process.env.ENTANGLE_HOST_LOGGER = "false";

  const [stateModule, controlPlaneModule, runnerModule] = await Promise.all([
    import("../src/state.js"),
    import("../src/federated-control-plane.js"),
    import("../../runner/src/index.js")
  ]);

  try {
    await stateModule.initializeHostState();
    const exportedAuthority = await stateModule.exportHostAuthority();
    const hostSecretKey = Uint8Array.from(
      Buffer.from(exportedAuthority.secretKey, "hex")
    );
    const runnerSecretKey = generateSecretKey();
    const runnerPubkey = getPublicKey(runnerSecretKey);
    const runnerSecretEnv = "ENTANGLE_FEDERATED_SMOKE_RUNNER_SECRET";
    process.env[runnerSecretEnv] = Buffer.from(runnerSecretKey).toString("hex");
    const bus = new InMemoryFederatedBus({
      hostSecretKey,
      runnerSecretKey
    });
    const controlPlane = new controlPlaneModule.HostFederatedControlPlane({
      clock: () => "2026-04-26T12:00:00.000Z",
      transport: bus
    });
    await controlPlane.subscribeObservationEvents({
      hostAuthorityPubkey: exportedAuthority.authority.publicKey,
      relayUrls
    });

    const graph = {
      schemaVersion: "1",
      graphId: "federated-smoke-graph",
      name: "Federated Smoke Graph",
      nodes: [
        {
          displayName: "User",
          nodeId: "user",
          nodeKind: "user"
        },
        {
          displayName: "Builder",
          nodeId: "builder",
          nodeKind: "worker"
        }
      ],
      edges: [
        {
          edgeId: "user-to-builder",
          enabled: true,
          fromNodeId: "user",
          relation: "delegates_to",
          toNodeId: "builder",
          transportPolicy: {
            channel: "federated-smoke",
            mode: "bidirectional_shared_set",
            relayProfileRefs: ["preview-relay"]
          }
        }
      ],
      defaults: {
        resourceBindings: {
          relayProfileRefs: ["preview-relay"]
        },
        runtimeProfile: "federated"
      }
    };
    const graphMutation = await stateModule.applyGraph(graph);
    assertCondition(
      graphMutation.validation.ok,
      `Graph failed validation: ${JSON.stringify(graphMutation.validation.findings)}`
    );
    printPass("graph", `revision=${graphMutation.activeRevisionId}`);

    const joinConfig: RunnerJoinConfig = runnerJoinConfigSchema.parse({
      capabilities: {
        agentEngineKinds: ["opencode_server"],
        labels: ["worker"],
        maxAssignments: 1,
        runtimeKinds: ["agent_runner"],
        supportsLocalWorkspace: true,
        supportsNip59: true
      },
      hostAuthorityPubkey: exportedAuthority.authority.publicKey,
      identity: {
        publicKey: runnerPubkey,
        secretDelivery: {
          envVar: runnerSecretEnv,
          mode: "env_var"
        }
      },
      relayUrls,
      runnerId: "runner-alpha",
      schemaVersion: "1"
    });
    const joinConfigPath = path.join(runnerRoot, "runner-join.json");
    await writeFile(joinConfigPath, `${JSON.stringify(joinConfig, null, 2)}\n`);

    const runner = await runnerModule.createConfiguredRunnerJoinService(
      joinConfigPath,
      {
        clock: () => "2026-04-26T12:00:01.000Z",
        materializer: async ({ assignment }) => {
          const assignmentRoot = path.join(
            materializedRoot,
            assignment.assignmentId
          );
          await mkdir(assignmentRoot, { recursive: true });
          await writeFile(
            path.join(assignmentRoot, "assignment.json"),
            `${JSON.stringify(assignment, null, 2)}\n`
          );
          return {
            accepted: true
          };
        },
        nonceFactory: () => "runner-hello-nonce",
        transport: bus
      }
    );
    await runner.service.start();
    printPass("runner-hello", `runner=${runner.config.runnerId}`);

    await stateModule.trustRunnerRegistration({
      runnerId: "runner-alpha"
    });
    const assignmentResponse = await stateModule.offerRuntimeAssignment({
      assignmentId: "assignment-alpha",
      leaseDurationSeconds: 3600,
      nodeId: "builder",
      runnerId: "runner-alpha"
    });
    await controlPlane.publishRuntimeAssignmentOffer({
      assignment: assignmentResponse.assignment,
      relayUrls
    });
    const assignmentInspection = await stateModule.getRuntimeAssignment(
      "assignment-alpha"
    );
    assertCondition(
      assignmentInspection?.assignment.status === "accepted",
      `Expected accepted assignment, got ${assignmentInspection?.assignment.status ?? "missing"}.`
    );
    printPass("assignment", "status=accepted");

    const projection = await stateModule.getHostProjectionSnapshot();
    assertCondition(
      projection.assignments[0]?.projection.source === "observation_event",
      "Expected assignment projection to come from observation event."
    );
    assertCondition(
      !path
        .resolve(runnerRoot)
        .startsWith(`${path.resolve(hostHome)}${path.sep}`),
      "Runner root must not be inside Host home."
    );
    assertCondition(
      !path
        .resolve(hostHome)
        .startsWith(`${path.resolve(runnerRoot)}${path.sep}`),
      "Host home must not be inside runner root."
    );
    printPass(
      "filesystem-isolation",
      `host=${hostHome}; runner=${runnerRoot}`
    );
    await runner.service.stop();

    if (keepTemp) {
      console.log(`Kept smoke temp root: ${tempRoot}`);
    }
  } finally {
    delete process.env.ENTANGLE_HOME;
    delete process.env.ENTANGLE_SECRETS_HOME;
    delete process.env.ENTANGLE_RUNTIME_BACKEND;
    delete process.env.ENTANGLE_HOST_LOGGER;
    delete process.env.ENTANGLE_FEDERATED_SMOKE_RUNNER_SECRET;

    if (!keepTemp) {
      await rm(tempRoot, { force: true, recursive: true });
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
