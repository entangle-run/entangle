import { describe, expect, it } from "vitest";
import {
  entangleNostrGiftWrapKind,
  type EntangleControlEvent,
  type EntangleControlEventPayload,
  type EntangleObservationEventPayload
} from "@entangle/types";
import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  type EventTemplate,
  type NostrEvent
} from "nostr-tools";
import type { VerifiedEvent } from "nostr-tools/pure";
import {
  buildEntangleControlNostrEvent,
  buildEntangleObservationNostrEvent,
  EntangleNostrFabric,
  type EntangleNostrFabricPool,
  unwrapEntangleControlNostrEvent,
  unwrapEntangleObservationNostrEvent
} from "./index.js";

type PublishCall = {
  event: NostrEvent;
  params:
    | {
        onauth?: (event: EventTemplate) => Promise<VerifiedEvent>;
      }
    | undefined;
  relayUrls: string[];
};

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
  readonly ensuredRelayUrls: string[] = [];
  readonly publishCalls: PublishCall[] = [];
  readonly subscriptionCalls: SubscriptionCall[] = [];

  ensureRelay(relayUrl: string): Promise<void> {
    this.ensuredRelayUrls.push(relayUrl);
    return Promise.resolve();
  }

  publish(
    relayUrls: string[],
    event: NostrEvent,
    params?: {
      onauth?: (event: EventTemplate) => Promise<VerifiedEvent>;
    }
  ): Promise<string>[] {
    this.publishCalls.push({
      event,
      params,
      relayUrls: [...relayUrls]
    });
    return relayUrls.map(() => Promise.resolve("ok"));
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
      relayUrls: [...relayUrls]
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
      if (subscription.closed) {
        continue;
      }

      const expectedKinds = subscription.filter.kinds;
      const expectedRecipients = subscription.filter["#p"];
      const recipientTags = event.tags
        .filter((tag) => tag[0] === "p")
        .map((tag) => tag[1])
        .filter((recipient): recipient is string => typeof recipient === "string");

      if (
        (expectedKinds && !expectedKinds.includes(event.kind)) ||
        (expectedRecipients &&
          !recipientTags.some((recipient) => expectedRecipients.includes(recipient)))
      ) {
        continue;
      }

      subscription.params.onevent(event);
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

describe("Entangle Nostr fabric", () => {
  it("builds signed private control events and unwraps them for the runner", () => {
    const hostSecretKey = generateSecretKey();
    const runnerSecretKey = generateSecretKey();
    const hostPubkey = getPublicKey(hostSecretKey);
    const runnerPubkey = getPublicKey(runnerSecretKey);
    const built = buildEntangleControlNostrEvent({
      payload: buildControlPayload({
        hostAuthorityPubkey: hostPubkey,
        runnerPubkey
      }),
      signerSecretKey: hostSecretKey
    });

    const unwrapped = unwrapEntangleControlNostrEvent({
      expectedHostAuthorityPubkey: hostPubkey,
      expectedRunnerPubkey: runnerPubkey,
      recipientPubkey: runnerPubkey,
      recipientSecretKey: runnerSecretKey,
      wrappedEvent: built.wrappedEvent
    });

    expect(built.wrappedEvent.kind).toBe(entangleNostrGiftWrapKind);
    expect(unwrapped?.envelope.signerPubkey).toBe(hostPubkey);
    expect(unwrapped?.envelope.signature).toMatch(/^[0-9a-f]{128}$/);
    expect(unwrapped?.payload.eventType).toBe("runner.hello.ack");
  });

  it("rejects control events from an unexpected Host Authority", () => {
    const hostSecretKey = generateSecretKey();
    const unexpectedHostSecretKey = generateSecretKey();
    const runnerSecretKey = generateSecretKey();
    const runnerPubkey = getPublicKey(runnerSecretKey);
    const built = buildEntangleControlNostrEvent({
      payload: buildControlPayload({
        hostAuthorityPubkey: getPublicKey(unexpectedHostSecretKey),
        runnerPubkey
      }),
      signerSecretKey: unexpectedHostSecretKey
    });

    const unwrapped = unwrapEntangleControlNostrEvent({
      expectedHostAuthorityPubkey: getPublicKey(hostSecretKey),
      expectedRunnerPubkey: runnerPubkey,
      recipientPubkey: runnerPubkey,
      recipientSecretKey: runnerSecretKey,
      wrappedEvent: built.wrappedEvent
    });

    expect(unwrapped).toBeUndefined();
  });

  it("rejects wrong-domain wrapped events", () => {
    const hostSecretKey = generateSecretKey();
    const runnerSecretKey = generateSecretKey();
    const hostPubkey = getPublicKey(hostSecretKey);
    const runnerPubkey = getPublicKey(runnerSecretKey);
    const observation = buildEntangleObservationNostrEvent({
      payload: buildObservationPayload({
        hostAuthorityPubkey: hostPubkey,
        runnerPubkey
      }),
      signerSecretKey: runnerSecretKey
    });

    const unwrapped = unwrapEntangleControlNostrEvent({
      expectedHostAuthorityPubkey: hostPubkey,
      expectedRunnerPubkey: runnerPubkey,
      recipientPubkey: runnerPubkey,
      recipientSecretKey: runnerSecretKey,
      wrappedEvent: observation.wrappedEvent
    });

    expect(unwrapped).toBeUndefined();
  });

  it("publishes, subscribes, and deduplicates control events", async () => {
    const hostSecretKey = generateSecretKey();
    const runnerSecretKey = generateSecretKey();
    const hostPubkey = getPublicKey(hostSecretKey);
    const runnerPubkey = getPublicKey(runnerSecretKey);
    const pool = new FakeNostrPool();
    const hostFabric = new EntangleNostrFabric({
      pool,
      secretKey: hostSecretKey
    });
    const runnerFabric = new EntangleNostrFabric({
      pool,
      secretKey: runnerSecretKey
    });
    const received: EntangleControlEvent[] = [];

    await runnerFabric.subscribeControlEvents({
      expectedHostAuthorityPubkey: hostPubkey,
      expectedRunnerPubkey: runnerPubkey,
      onEvent: (event) => {
        received.push(event);
      },
      recipientPubkey: runnerPubkey,
      relayUrls: ["wss://relay.example"]
    });

    await hostFabric.publishControlEvent({
      payload: buildControlPayload({
        hostAuthorityPubkey: hostPubkey,
        runnerPubkey
      }),
      relayUrls: ["wss://relay.example"]
    });

    const wrappedEvent = pool.publishCalls[0]?.event;

    if (!wrappedEvent) {
      throw new Error("Expected a published control event.");
    }

    pool.dispatch(wrappedEvent);
    pool.dispatch(wrappedEvent);

    expect(pool.ensuredRelayUrls).toEqual(["wss://relay.example"]);
    expect(pool.subscriptionCalls[0]?.filter).toMatchObject({
      "#p": [runnerPubkey],
      kinds: [entangleNostrGiftWrapKind]
    });
    expect(received).toHaveLength(1);
    expect(received[0]?.payload.eventType).toBe("runner.hello.ack");
  });

  it("publishes and unwraps runner observations for the Host Authority", async () => {
    const hostSecretKey = generateSecretKey();
    const runnerSecretKey = generateSecretKey();
    const hostPubkey = getPublicKey(hostSecretKey);
    const runnerPubkey = getPublicKey(runnerSecretKey);
    const pool = new FakeNostrPool();
    const runnerFabric = new EntangleNostrFabric({
      pool,
      secretKey: runnerSecretKey
    });

    await runnerFabric.publishObservationEvent({
      payload: buildObservationPayload({
        hostAuthorityPubkey: hostPubkey,
        runnerPubkey
      }),
      relayUrls: ["wss://relay.example"]
    });

    const wrappedEvent = pool.publishCalls[0]?.event;

    if (!wrappedEvent) {
      throw new Error("Expected a published observation event.");
    }

    const unwrapped = unwrapEntangleObservationNostrEvent({
      expectedHostAuthorityPubkey: hostPubkey,
      expectedRunnerPubkey: runnerPubkey,
      recipientPubkey: hostPubkey,
      recipientSecretKey: hostSecretKey,
      wrappedEvent
    });

    expect(unwrapped?.envelope.signerPubkey).toBe(runnerPubkey);
    expect(unwrapped?.payload.eventType).toBe("runner.heartbeat");
  });

  it("passes nip42 auth events through the local signer", async () => {
    const hostSecretKey = generateSecretKey();
    const runnerSecretKey = generateSecretKey();
    const hostPubkey = getPublicKey(hostSecretKey);
    const runnerPubkey = getPublicKey(runnerSecretKey);
    const pool = new FakeNostrPool();
    const hostFabric = new EntangleNostrFabric({
      pool,
      secretKey: hostSecretKey
    });

    await hostFabric.publishControlEvent({
      authRequired: true,
      payload: buildControlPayload({
        hostAuthorityPubkey: hostPubkey,
        runnerPubkey
      }),
      relayUrls: ["wss://relay.example"]
    });

    const authTemplate: EventTemplate = {
      content: "",
      created_at: Math.round(Date.now() / 1000),
      kind: 22242,
      tags: [
        ["challenge", "auth-challenge"],
        ["relay", "wss://relay.example"]
      ]
    };
    const signedAuth = await pool.publishCalls[0]?.params?.onauth?.(
      authTemplate
    );

    expect(signedAuth?.pubkey).toBe(hostPubkey);
    expect(signedAuth).toEqual(finalizeEvent(authTemplate, hostSecretKey));
  });
});
