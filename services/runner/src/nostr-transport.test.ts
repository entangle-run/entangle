import { afterEach, describe, expect, it } from "vitest";
import {
  entangleNostrGiftWrapKind,
  entangleNostrRumorKind,
  type EffectiveRuntimeContext
} from "@entangle/types";
import { nip59 } from "nostr-tools";
import type { EventTemplate, NostrEvent } from "nostr-tools";
import { loadRuntimeContext } from "./runtime-context.js";
import { NostrRunnerTransport, type RunnerNostrPool } from "./nostr-transport.js";
import {
  buildInboundTaskRequest,
  cleanupRuntimeFixtures,
  createRuntimeFixture,
  remotePublicKey,
  remoteSecretHex,
  runnerPublicKey,
  runnerSecretHex
} from "./test-fixtures.js";
import type { RunnerInboundEnvelope } from "./transport.js";

const mismatchedSenderPublicKey =
  "3333333333333333333333333333333333333333333333333333333333333333";

function parseHexSecret(secretHex: string): Uint8Array {
  return Uint8Array.from(Buffer.from(secretHex, "hex"));
}

type PublishCall = {
  event: NostrEvent;
  params:
    | {
        onauth?: (event: EventTemplate) => Promise<NostrEvent>;
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
    onauth?: (event: EventTemplate) => Promise<NostrEvent>;
    onevent: (event: NostrEvent) => void;
  };
  relayUrls: string[];
};

class FakeNostrPool implements RunnerNostrPool {
  ensureRelayHook:
    | ((relayUrl: string) => Promise<void> | void)
    | undefined;
  readonly ensuredRelayUrls: string[] = [];
  readonly publishCalls: PublishCall[] = [];
  readonly subscriptionCalls: SubscriptionCall[] = [];
  destroyCalls = 0;

  ensureRelay(relayUrl: string): Promise<void> {
    this.ensuredRelayUrls.push(relayUrl);
    return Promise.resolve(this.ensureRelayHook?.(relayUrl));
  }

  destroy(): void {
    this.destroyCalls += 1;
  }

  publish(
    relayUrls: string[],
    event: NostrEvent,
    params?: {
      onauth?: (event: EventTemplate) => Promise<NostrEvent>;
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
      onauth?: (event: EventTemplate) => Promise<NostrEvent>;
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

function buildWrappedEntangleEvent(input: {
  message: ReturnType<typeof buildInboundTaskRequest>["message"];
  recipientPublicKey: string;
  senderSecretHex: string;
}): {
  rumor: ReturnType<typeof nip59.createRumor>;
  wrappedEvent: NostrEvent;
} {
  const senderSecretKey = parseHexSecret(input.senderSecretHex);
  const rumor = nip59.createRumor(
    {
      content: JSON.stringify(input.message),
      kind: entangleNostrRumorKind,
      tags: []
    },
    senderSecretKey
  );
  const seal = nip59.createSeal(rumor, senderSecretKey, input.recipientPublicKey);
  const wrappedEvent = nip59.createWrap(seal, input.recipientPublicKey);

  return {
    rumor,
    wrappedEvent
  };
}

function withRelayAuthMode(
  context: EffectiveRuntimeContext,
  authMode: "none" | "nip42"
): EffectiveRuntimeContext {
  return {
    ...context,
    relayContext: {
      ...context.relayContext,
      relayProfiles: context.relayContext.relayProfiles.map((relayProfile) => ({
        ...relayProfile,
        authMode
      }))
    }
  };
}

afterEach(async () => {
  await cleanupRuntimeFixtures();
});

describe("NostrRunnerTransport", () => {
  it("publishes gift-wrapped Entangle messages to resolved write relays", async () => {
    const fixture = await createRuntimeFixture();
    const context = await loadRuntimeContext(fixture.contextPath);
    const pool = new FakeNostrPool();
    const transport = new NostrRunnerTransport({
      context,
      pool,
      secretKey: parseHexSecret(runnerSecretHex)
    });

    const envelope = await transport.publish(
      buildInboundTaskRequest({
        fromNodeId: "worker-it",
        fromPubkey: runnerPublicKey,
        toNodeId: "reviewer-it",
        toPubkey: remotePublicKey
      }).message
    );

    expect(pool.publishCalls).toHaveLength(1);
    expect(pool.publishCalls[0]?.relayUrls).toEqual(["ws://strfry:7777"]);
    expect(pool.publishCalls[0]?.event.kind).toBe(entangleNostrGiftWrapKind);
    expect(pool.publishCalls[0]?.event.tags).toContainEqual(["p", remotePublicKey]);
    expect(envelope.eventId).toMatch(/^[0-9a-f]{64}$/);
    expect(envelope.message.fromNodeId).toBe("worker-it");
    expect(envelope.signerPubkey).toBe(runnerPublicKey);
  });

  it("subscribes on gift wraps and unwraps inbound Entangle rumor events", async () => {
    const fixture = await createRuntimeFixture();
    const context = await loadRuntimeContext(fixture.contextPath);
    const pool = new FakeNostrPool();
    const transport = new NostrRunnerTransport({
      context,
      pool,
      secretKey: parseHexSecret(runnerSecretHex)
    });
    const received: RunnerInboundEnvelope[] = [];

    await transport.subscribe({
      onMessage: (envelope) => {
        received.push(envelope);
      },
      recipientPubkey: runnerPublicKey
    });

    const message = buildInboundTaskRequest().message;
    const wrapped = buildWrappedEntangleEvent({
      message,
      recipientPublicKey: runnerPublicKey,
      senderSecretHex: remoteSecretHex
    });
    pool.dispatch(wrapped.wrappedEvent);

    expect(pool.subscriptionCalls).toHaveLength(1);
    expect(pool.ensuredRelayUrls).toEqual(["ws://strfry:7777"]);
    expect(pool.subscriptionCalls[0]?.filter.kinds).toEqual([entangleNostrGiftWrapKind]);
    expect(pool.subscriptionCalls[0]?.filter["#p"]).toEqual([runnerPublicKey]);
    expect(received).toHaveLength(1);
    expect(received[0]?.eventId).toBe(wrapped.rumor.id);
    expect(received[0]?.message).toEqual(message);
    expect(received[0]?.signerPubkey).toBe(remotePublicKey);
  });

  it("waits for readable relay preconnect before declaring the subscription ready", async () => {
    const fixture = await createRuntimeFixture();
    const context = await loadRuntimeContext(fixture.contextPath);
    const pool = new FakeNostrPool();
    let releaseEnsureRelay: (() => void) | undefined;
    pool.ensureRelayHook = () =>
      new Promise<void>((resolve) => {
        releaseEnsureRelay = resolve;
      });
    const transport = new NostrRunnerTransport({
      context,
      pool,
      secretKey: parseHexSecret(runnerSecretHex)
    });

    const subscribePromise = transport.subscribe({
      onMessage: () => undefined,
      recipientPubkey: runnerPublicKey
    });

    await Promise.resolve();
    expect(pool.ensuredRelayUrls).toEqual(["ws://strfry:7777"]);
    expect(pool.subscriptionCalls).toHaveLength(0);

    releaseEnsureRelay?.();
    await subscribePromise;

    expect(pool.subscriptionCalls).toHaveLength(1);
  });

  it("ignores wrapped events that do not contain Entangle rumor payloads", async () => {
    const fixture = await createRuntimeFixture();
    const context = await loadRuntimeContext(fixture.contextPath);
    const pool = new FakeNostrPool();
    const transport = new NostrRunnerTransport({
      context,
      pool,
      secretKey: parseHexSecret(runnerSecretHex)
    });
    const received: RunnerInboundEnvelope[] = [];

    await transport.subscribe({
      onMessage: (envelope) => {
        received.push(envelope);
      },
      recipientPubkey: runnerPublicKey
    });

    const senderSecretKey = parseHexSecret(remoteSecretHex);
    const nonEntangleRumor = nip59.createRumor(
      {
        content: JSON.stringify({ unrelated: true }),
        kind: 1,
        tags: []
      },
      senderSecretKey
    );
    const nonEntangleSeal = nip59.createSeal(
      nonEntangleRumor,
      senderSecretKey,
      runnerPublicKey
    );
    const nonEntangleWrap = nip59.createWrap(nonEntangleSeal, runnerPublicKey);

    pool.dispatch(nonEntangleWrap);

    expect(received).toHaveLength(0);
  });

  it("ignores wrapped Entangle messages when the rumor signer does not match fromPubkey", async () => {
    const fixture = await createRuntimeFixture();
    const context = await loadRuntimeContext(fixture.contextPath);
    const pool = new FakeNostrPool();
    const transport = new NostrRunnerTransport({
      context,
      pool,
      secretKey: parseHexSecret(runnerSecretHex)
    });
    const received: RunnerInboundEnvelope[] = [];

    await transport.subscribe({
      onMessage: (envelope) => {
        received.push(envelope);
      },
      recipientPubkey: runnerPublicKey
    });

    const message = buildInboundTaskRequest({
      fromPubkey: mismatchedSenderPublicKey
    }).message;
    const wrapped = buildWrappedEntangleEvent({
      message,
      recipientPublicKey: runnerPublicKey,
      senderSecretHex: remoteSecretHex
    });
    pool.dispatch(wrapped.wrappedEvent);

    expect(received).toHaveLength(0);
  });

  it("enables nip42 signing callbacks when the relay profile requires auth", async () => {
    const fixture = await createRuntimeFixture();
    const baseContext = await loadRuntimeContext(fixture.contextPath);
    const context = withRelayAuthMode(baseContext, "nip42");
    const pool = new FakeNostrPool();
    const transport = new NostrRunnerTransport({
      context,
      pool,
      secretKey: parseHexSecret(runnerSecretHex)
    });

    await transport.subscribe({
      onMessage: () => undefined,
      recipientPubkey: runnerPublicKey
    });
    await transport.publish(
      buildInboundTaskRequest({
        fromNodeId: "worker-it",
        fromPubkey: runnerPublicKey,
        toNodeId: "reviewer-it",
        toPubkey: remotePublicKey
      }).message
    );

    const authTemplate: EventTemplate = {
      content: "",
      created_at: Math.round(Date.now() / 1000),
      kind: 22242,
      tags: [
        ["challenge", "auth-challenge"],
        ["relay", "ws://strfry:7777"]
      ]
    };

    const subscribeAuthEvent = await pool.subscriptionCalls[0]?.params.onauth?.(
      authTemplate
    );
    const publishAuthEvent = await pool.publishCalls[0]?.params?.onauth?.(authTemplate);

    expect(pool.subscriptionCalls[0]?.params.onauth).toBeTypeOf("function");
    expect(pool.publishCalls[0]?.params?.onauth).toBeTypeOf("function");
    expect(subscribeAuthEvent?.pubkey).toBe(runnerPublicKey);
    expect(publishAuthEvent?.pubkey).toBe(runnerPublicKey);
  });
});
