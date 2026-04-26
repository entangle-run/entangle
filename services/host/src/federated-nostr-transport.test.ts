import { describe, expect, it } from "vitest";
import {
  EntangleNostrFabric,
  type EntangleNostrFabricPool,
  unwrapEntangleControlNostrEvent
} from "@entangle/nostr-fabric";
import {
  entangleNostrGiftWrapKind,
  type EntangleControlEventPayload,
  type EntangleObservationEvent,
  type EntangleObservationEventPayload
} from "@entangle/types";
import {
  generateSecretKey,
  getPublicKey,
  type EventTemplate,
  type NostrEvent
} from "nostr-tools";
import type { VerifiedEvent } from "nostr-tools/pure";
import { HostFederatedNostrTransport } from "./federated-nostr-transport.js";

type SubscriptionCall = {
  closed: boolean;
  filter: {
    "#p"?: string[];
    kinds?: number[];
  };
  params: {
    onauth?: (event: EventTemplate) => Promise<VerifiedEvent>;
    onevent: (event: NostrEvent) => void;
  };
  relayUrls: string[];
};

class FakeNostrPool implements EntangleNostrFabricPool {
  readonly publishCalls: NostrEvent[] = [];
  readonly subscriptionCalls: SubscriptionCall[] = [];

  ensureRelay(): Promise<void> {
    return Promise.resolve();
  }

  publish(_relayUrls: string[], event: NostrEvent): Promise<string>[] {
    this.publishCalls.push(event);
    return [Promise.resolve("ok")];
  }

  subscribeMany(
    relayUrls: string[],
    filter: {
      "#p"?: string[];
      kinds?: number[];
    },
    params: {
      onauth?: (event: EventTemplate) => Promise<VerifiedEvent>;
      onevent: (event: NostrEvent) => void;
    }
  ) {
    const record: SubscriptionCall = {
      closed: false,
      filter,
      params,
      relayUrls
    };
    this.subscriptionCalls.push(record);

    return {
      close: () => {
        record.closed = true;
      }
    };
  }

  dispatch(event: NostrEvent): void {
    for (const subscription of this.subscriptionCalls) {
      const recipients = event.tags
        .filter((tag) => tag[0] === "p")
        .map((tag) => tag[1]);

      if (
        subscription.filter.kinds?.includes(event.kind) &&
        subscription.filter["#p"]?.some((recipient) =>
          recipients.includes(recipient)
        )
      ) {
        subscription.params.onevent(event);
      }
    }
  }
}

function buildControlPayload(input: {
  hostAuthorityPubkey: string;
  runnerPubkey: string;
}): EntangleControlEventPayload {
  return {
    eventType: "runner.hello.ack",
    hostAuthorityPubkey: input.hostAuthorityPubkey,
    issuedAt: "2026-04-26T12:00:00.000Z",
    protocol: "entangle.control.v1",
    runnerId: "runner-alpha",
    runnerPubkey: input.runnerPubkey,
    trustState: "trusted"
  };
}

function buildObservationPayload(input: {
  hostAuthorityPubkey: string;
  runnerPubkey: string;
}): EntangleObservationEventPayload {
  return {
    assignmentIds: [],
    eventType: "runner.heartbeat",
    hostAuthorityPubkey: input.hostAuthorityPubkey,
    observedAt: "2026-04-26T12:00:01.000Z",
    operationalState: "ready",
    protocol: "entangle.observe.v1",
    runnerId: "runner-alpha",
    runnerPubkey: input.runnerPubkey
  };
}

describe("HostFederatedNostrTransport", () => {
  it("publishes Host Authority control events to runner recipients", async () => {
    const hostSecretKey = generateSecretKey();
    const runnerSecretKey = generateSecretKey();
    const hostPubkey = getPublicKey(hostSecretKey);
    const runnerPubkey = getPublicKey(runnerSecretKey);
    const pool = new FakeNostrPool();
    const transport = new HostFederatedNostrTransport({
      pool,
      secretKey: hostSecretKey
    });

    await transport.publishControlEvent({
      payload: buildControlPayload({
        hostAuthorityPubkey: hostPubkey,
        runnerPubkey
      }),
      relayUrls: ["wss://relay.example"]
    });

    const wrappedEvent = pool.publishCalls[0];

    if (!wrappedEvent) {
      throw new Error("Expected a control event.");
    }

    const unwrapped = unwrapEntangleControlNostrEvent({
      expectedHostAuthorityPubkey: hostPubkey,
      expectedRunnerPubkey: runnerPubkey,
      recipientPubkey: runnerPubkey,
      recipientSecretKey: runnerSecretKey,
      wrappedEvent
    });

    expect(wrappedEvent.kind).toBe(entangleNostrGiftWrapKind);
    expect(unwrapped?.payload.eventType).toBe("runner.hello.ack");
  });

  it("subscribes to runner observations for the Host Authority", async () => {
    const hostSecretKey = generateSecretKey();
    const runnerSecretKey = generateSecretKey();
    const hostPubkey = getPublicKey(hostSecretKey);
    const runnerPubkey = getPublicKey(runnerSecretKey);
    const pool = new FakeNostrPool();
    const hostTransport = new HostFederatedNostrTransport({
      pool,
      secretKey: hostSecretKey
    });
    const runnerFabric = new EntangleNostrFabric({
      pool,
      secretKey: runnerSecretKey
    });
    const received: EntangleObservationEvent[] = [];

    await hostTransport.subscribeObservationEvents({
      expectedRunnerPubkey: runnerPubkey,
      hostAuthorityPubkey: hostPubkey,
      onEvent: (event) => {
        received.push(event);
      },
      relayUrls: ["wss://relay.example"]
    });
    await runnerFabric.publishObservationEvent({
      payload: buildObservationPayload({
        hostAuthorityPubkey: hostPubkey,
        runnerPubkey
      }),
      relayUrls: ["wss://relay.example"]
    });

    const wrappedEvent = pool.publishCalls[0];

    if (!wrappedEvent) {
      throw new Error("Expected an observation event.");
    }

    pool.dispatch(wrappedEvent);

    expect(pool.subscriptionCalls[0]?.filter).toMatchObject({
      "#p": [hostPubkey],
      kinds: [entangleNostrGiftWrapKind]
    });
    expect(received).toHaveLength(1);
    expect(received[0]?.payload.eventType).toBe("runner.heartbeat");
  });
});
