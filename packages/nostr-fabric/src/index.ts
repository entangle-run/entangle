import { createHash } from "node:crypto";
import {
  entangleControlEventPayloadSchema,
  entangleControlEventSchema,
  entangleNostrGiftWrapKind,
  entangleNostrRumorKind,
  entangleObservationEventPayloadSchema,
  entangleObservationEventSchema,
  entangleSignedEnvelopeSchema,
  type EntangleControlEvent,
  type EntangleControlEventPayload,
  type EntangleObservationEvent,
  type EntangleObservationEventPayload,
  type EntangleProtocolDomain,
  type EntangleSignedEnvelope
} from "@entangle/types";
import {
  finalizeEvent,
  getPublicKey,
  nip59,
  SimplePool,
  verifyEvent,
  type EventTemplate,
  type Filter,
  type NostrEvent
} from "nostr-tools";
import type { VerifiedEvent } from "nostr-tools/pure";

type PoolCloser = {
  close(reason?: string): void | Promise<void>;
};

type ExpectedIdentity = {
  expectedHostAuthorityPubkey?: string | undefined;
  expectedRunnerPubkey?: string | undefined;
};

type ParsedJson =
  | boolean
  | null
  | number
  | string
  | ParsedJson[]
  | {
      [key: string]: ParsedJson;
    };

export interface EntangleNostrFabricPool {
  ensureRelay?(
    relayUrl: string,
    params?: {
      abort?: AbortSignal;
      connectionTimeout?: number;
    }
  ): Promise<unknown>;
  destroy?(): void;
  publish(
    relayUrls: string[],
    event: NostrEvent,
    params?: {
      onauth?: (event: EventTemplate) => Promise<VerifiedEvent>;
    }
  ): Promise<string>[];
  subscribeMany(
    relayUrls: string[],
    filter: Filter,
    params: {
      onevent: (event: NostrEvent) => void;
      onauth?: (event: EventTemplate) => Promise<VerifiedEvent>;
    }
  ): PoolCloser;
}

export interface EntangleNostrFabricSubscription {
  close(): Promise<void>;
}

export type EntangleNostrPublishedEvent<
  TEvent extends EntangleControlEvent | EntangleObservationEvent
> = {
  event: TEvent;
  relayUrls: string[];
  wrappedEvent: NostrEvent;
  wrappedEventId: string;
};

export class EntangleNostrEventDedupe {
  private readonly seenEventIds = new Set<string>();

  accept(eventId: string): boolean {
    if (this.seenEventIds.has(eventId)) {
      return false;
    }

    this.seenEventIds.add(eventId);
    return true;
  }

  clear(): void {
    this.seenEventIds.clear();
  }
}

function buildAuthSigner(
  secretKey: Uint8Array
): (event: EventTemplate) => Promise<VerifiedEvent> {
  return (event) => Promise.resolve(finalizeEvent(event, secretKey));
}

function computePayloadHash(payloadJson: string): string {
  return createHash("sha256").update(payloadJson).digest("hex");
}

function parseJsonDocument(input: string): ParsedJson | undefined {
  try {
    return JSON.parse(input) as ParsedJson;
  } catch {
    return undefined;
  }
}

function stringifyPayload(payload: unknown): string {
  const payloadJson = JSON.stringify(payload);

  if (!payloadJson) {
    throw new Error("Entangle Nostr payload must be JSON serializable.");
  }

  return payloadJson;
}

function isoFromNostrTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

function buildProtocolTags(input: {
  causationEventId?: string | undefined;
  correlationId?: string | undefined;
  payloadHash: string;
  protocol: EntangleProtocolDomain;
  recipientPubkey: string;
}): string[][] {
  const tags = [
    ["protocol", input.protocol],
    ["payload_hash", input.payloadHash],
    ["p", input.recipientPubkey]
  ];

  if (input.causationEventId) {
    tags.push(["causation", input.causationEventId]);
  }

  if (input.correlationId) {
    tags.push(["correlation", input.correlationId]);
  }

  return tags;
}

function firstTagValue(event: NostrEvent, tagName: string): string | undefined {
  return event.tags.find((tag) => tag[0] === tagName)?.[1];
}

function isNostrEvent(input: unknown): input is NostrEvent {
  if (!input || typeof input !== "object") {
    return false;
  }

  const candidate = input as Partial<NostrEvent>;

  return (
    typeof candidate.content === "string" &&
    typeof candidate.created_at === "number" &&
    typeof candidate.id === "string" &&
    typeof candidate.kind === "number" &&
    typeof candidate.pubkey === "string" &&
    typeof candidate.sig === "string" &&
    Array.isArray(candidate.tags)
  );
}

function parseDomainEvent(input: {
  envelope: EntangleSignedEnvelope;
  payload: unknown;
  protocol: EntangleProtocolDomain;
}): EntangleControlEvent | EntangleObservationEvent {
  if (input.protocol === "entangle.control.v1") {
    return entangleControlEventSchema.parse({
      envelope: input.envelope,
      payload: entangleControlEventPayloadSchema.parse(input.payload)
    });
  }

  if (input.protocol === "entangle.observe.v1") {
    return entangleObservationEventSchema.parse({
      envelope: input.envelope,
      payload: entangleObservationEventPayloadSchema.parse(input.payload)
    });
  }

  throw new Error(`Unsupported Entangle Nostr protocol '${input.protocol}'.`);
}

function assertExpectedIdentity(
  event: EntangleControlEvent | EntangleObservationEvent,
  expected: ExpectedIdentity
): boolean {
  if (
    expected.expectedHostAuthorityPubkey &&
    event.payload.hostAuthorityPubkey !== expected.expectedHostAuthorityPubkey
  ) {
    return false;
  }

  if (
    expected.expectedRunnerPubkey &&
    event.payload.runnerPubkey !== expected.expectedRunnerPubkey
  ) {
    return false;
  }

  return true;
}

function buildSignedWrappedEvent(input: {
  causationEventId?: string | undefined;
  correlationId?: string | undefined;
  payload: unknown;
  protocol: EntangleProtocolDomain;
  recipientPubkey: string;
  signerSecretKey: Uint8Array;
}): {
  event: EntangleControlEvent | EntangleObservationEvent;
  innerEvent: NostrEvent;
  wrappedEvent: NostrEvent;
} {
  const payloadJson = stringifyPayload(input.payload);
  const payloadHash = computePayloadHash(payloadJson);
  const tags = buildProtocolTags({
    causationEventId: input.causationEventId,
    correlationId: input.correlationId,
    payloadHash,
    protocol: input.protocol,
    recipientPubkey: input.recipientPubkey
  });
  const innerEvent = finalizeEvent(
    {
      content: payloadJson,
      created_at: Math.floor(Date.now() / 1000),
      kind: entangleNostrRumorKind,
      tags
    },
    input.signerSecretKey
  );
  const envelope = entangleSignedEnvelopeSchema.parse({
    ...(input.causationEventId
      ? { causationEventId: input.causationEventId }
      : {}),
    ...(input.correlationId ? { correlationId: input.correlationId } : {}),
    createdAt: isoFromNostrTimestamp(innerEvent.created_at),
    eventId: innerEvent.id,
    payloadHash,
    protocol: input.protocol,
    recipientPubkey: input.recipientPubkey,
    schemaVersion: "1",
    signature: innerEvent.sig,
    signerPubkey: innerEvent.pubkey
  });
  const event = parseDomainEvent({
    envelope,
    payload: input.payload,
    protocol: input.protocol
  });
  const deliveryRumor = nip59.createRumor(
    {
      content: JSON.stringify(innerEvent),
      kind: entangleNostrRumorKind,
      tags
    },
    input.signerSecretKey
  );
  const seal = nip59.createSeal(
    deliveryRumor,
    input.signerSecretKey,
    input.recipientPubkey
  );
  const wrappedEvent = nip59.createWrap(seal, input.recipientPubkey);

  return {
    event,
    innerEvent,
    wrappedEvent
  };
}

function unwrapSignedWrappedEvent(input: {
  expectedHostAuthorityPubkey?: string | undefined;
  expectedProtocol: EntangleProtocolDomain;
  expectedRunnerPubkey?: string | undefined;
  recipientPubkey?: string | undefined;
  recipientSecretKey: Uint8Array;
  wrappedEvent: NostrEvent;
}): EntangleControlEvent | EntangleObservationEvent | undefined {
  if (input.wrappedEvent.kind !== entangleNostrGiftWrapKind) {
    return undefined;
  }

  let deliveryRumor: ReturnType<typeof nip59.unwrapEvent>;

  try {
    deliveryRumor = nip59.unwrapEvent(
      input.wrappedEvent,
      input.recipientSecretKey
    );
  } catch {
    return undefined;
  }

  if (deliveryRumor.kind !== entangleNostrRumorKind) {
    return undefined;
  }

  const parsedInnerEvent = parseJsonDocument(deliveryRumor.content);

  if (!isNostrEvent(parsedInnerEvent)) {
    return undefined;
  }

  if (
    parsedInnerEvent.kind !== entangleNostrRumorKind ||
    !verifyEvent(parsedInnerEvent)
  ) {
    return undefined;
  }

  const protocolTag = firstTagValue(parsedInnerEvent, "protocol");

  if (protocolTag && protocolTag !== input.expectedProtocol) {
    return undefined;
  }

  const payload = parseJsonDocument(parsedInnerEvent.content);

  if (payload === undefined) {
    return undefined;
  }

  const payloadHash = computePayloadHash(parsedInnerEvent.content);
  const payloadHashTag = firstTagValue(parsedInnerEvent, "payload_hash");

  if (payloadHashTag && payloadHashTag !== payloadHash) {
    return undefined;
  }

  let envelope: EntangleSignedEnvelope;

  try {
    const causationEventId = firstTagValue(parsedInnerEvent, "causation");
    const correlationId = firstTagValue(parsedInnerEvent, "correlation");

    envelope = entangleSignedEnvelopeSchema.parse({
      ...(causationEventId ? { causationEventId } : {}),
      ...(correlationId ? { correlationId } : {}),
      createdAt: isoFromNostrTimestamp(parsedInnerEvent.created_at),
      eventId: parsedInnerEvent.id,
      payloadHash,
      protocol: input.expectedProtocol,
      recipientPubkey:
        input.recipientPubkey ?? getPublicKey(input.recipientSecretKey),
      schemaVersion: "1",
      signature: parsedInnerEvent.sig,
      signerPubkey: parsedInnerEvent.pubkey
    });
  } catch {
    return undefined;
  }

  try {
    const event = parseDomainEvent({
      envelope,
      payload,
      protocol: input.expectedProtocol
    });

    return assertExpectedIdentity(event, input) ? event : undefined;
  } catch {
    return undefined;
  }
}

async function ensureReadableRelayConnections(
  pool: EntangleNostrFabricPool,
  relayUrls: string[]
): Promise<void> {
  const ensureRelay =
    pool.ensureRelay === undefined ? undefined : pool.ensureRelay.bind(pool);

  if (!ensureRelay) {
    return;
  }

  await Promise.all(
    relayUrls.map((relayUrl) =>
      ensureRelay(relayUrl, {
        connectionTimeout: 3_000
      })
    )
  );
}

export function buildEntangleControlNostrEvent(input: {
  causationEventId?: string | undefined;
  correlationId?: string | undefined;
  payload: EntangleControlEventPayload;
  recipientPubkey?: string | undefined;
  signerSecretKey: Uint8Array;
}): {
  event: EntangleControlEvent;
  innerEvent: NostrEvent;
  wrappedEvent: NostrEvent;
} {
  const payload = entangleControlEventPayloadSchema.parse(input.payload);
  const built = buildSignedWrappedEvent({
    causationEventId: input.causationEventId,
    correlationId: input.correlationId,
    payload,
    protocol: "entangle.control.v1",
    recipientPubkey: input.recipientPubkey ?? payload.runnerPubkey,
    signerSecretKey: input.signerSecretKey
  });

  return {
    event: entangleControlEventSchema.parse(built.event),
    innerEvent: built.innerEvent,
    wrappedEvent: built.wrappedEvent
  };
}

export function buildEntangleObservationNostrEvent(input: {
  causationEventId?: string | undefined;
  correlationId?: string | undefined;
  payload: EntangleObservationEventPayload;
  recipientPubkey?: string | undefined;
  signerSecretKey: Uint8Array;
}): {
  event: EntangleObservationEvent;
  innerEvent: NostrEvent;
  wrappedEvent: NostrEvent;
} {
  const payload = entangleObservationEventPayloadSchema.parse(input.payload);
  const built = buildSignedWrappedEvent({
    causationEventId: input.causationEventId,
    correlationId: input.correlationId,
    payload,
    protocol: "entangle.observe.v1",
    recipientPubkey: input.recipientPubkey ?? payload.hostAuthorityPubkey,
    signerSecretKey: input.signerSecretKey
  });

  return {
    event: entangleObservationEventSchema.parse(built.event),
    innerEvent: built.innerEvent,
    wrappedEvent: built.wrappedEvent
  };
}

export function unwrapEntangleControlNostrEvent(input: {
  expectedHostAuthorityPubkey?: string | undefined;
  expectedRunnerPubkey?: string | undefined;
  recipientPubkey?: string | undefined;
  recipientSecretKey: Uint8Array;
  wrappedEvent: NostrEvent;
}): EntangleControlEvent | undefined {
  const event = unwrapSignedWrappedEvent({
    ...input,
    expectedProtocol: "entangle.control.v1"
  });

  return event ? entangleControlEventSchema.parse(event) : undefined;
}

export function unwrapEntangleObservationNostrEvent(input: {
  expectedHostAuthorityPubkey?: string | undefined;
  expectedRunnerPubkey?: string | undefined;
  recipientPubkey?: string | undefined;
  recipientSecretKey: Uint8Array;
  wrappedEvent: NostrEvent;
}): EntangleObservationEvent | undefined {
  const event = unwrapSignedWrappedEvent({
    ...input,
    expectedProtocol: "entangle.observe.v1"
  });

  return event ? entangleObservationEventSchema.parse(event) : undefined;
}

export class EntangleNostrFabric {
  private readonly authSigner: (event: EventTemplate) => Promise<VerifiedEvent>;
  private readonly dedupe = new EntangleNostrEventDedupe();
  private readonly ownsPool: boolean;
  private readonly pool: EntangleNostrFabricPool;
  private readonly secretKey: Uint8Array;
  private readonly subscriptions = new Set<PoolCloser>();

  constructor(input: {
    pool?: EntangleNostrFabricPool;
    secretKey: Uint8Array;
  }) {
    this.authSigner = buildAuthSigner(input.secretKey);
    this.ownsPool = !input.pool;
    this.pool = input.pool ?? new SimplePool();
    this.secretKey = input.secretKey;
  }

  async close(): Promise<void> {
    await Promise.all(
      [...this.subscriptions].map((subscription) =>
        Promise.resolve(subscription.close("entangle nostr fabric shutdown"))
      )
    );
    this.subscriptions.clear();

    if (this.ownsPool) {
      this.pool.destroy?.();
    }
  }

  async publishControlEvent(input: {
    authRequired?: boolean | undefined;
    causationEventId?: string | undefined;
    correlationId?: string | undefined;
    payload: EntangleControlEventPayload;
    relayUrls: string[];
  }): Promise<EntangleNostrPublishedEvent<EntangleControlEvent>> {
    if (input.relayUrls.length === 0) {
      throw new Error("No writable relay URLs are available for control events.");
    }

    const built = buildEntangleControlNostrEvent({
      causationEventId: input.causationEventId,
      correlationId: input.correlationId,
      payload: input.payload,
      signerSecretKey: this.secretKey
    });

    await Promise.all(
      this.pool.publish(input.relayUrls, built.wrappedEvent, {
        ...(input.authRequired ? { onauth: this.authSigner } : {})
      })
    );

    return {
      event: built.event,
      relayUrls: [...input.relayUrls],
      wrappedEvent: built.wrappedEvent,
      wrappedEventId: built.wrappedEvent.id
    };
  }

  async publishObservationEvent(input: {
    authRequired?: boolean | undefined;
    causationEventId?: string | undefined;
    correlationId?: string | undefined;
    payload: EntangleObservationEventPayload;
    relayUrls: string[];
  }): Promise<EntangleNostrPublishedEvent<EntangleObservationEvent>> {
    if (input.relayUrls.length === 0) {
      throw new Error(
        "No writable relay URLs are available for observation events."
      );
    }

    const built = buildEntangleObservationNostrEvent({
      causationEventId: input.causationEventId,
      correlationId: input.correlationId,
      payload: input.payload,
      signerSecretKey: this.secretKey
    });

    await Promise.all(
      this.pool.publish(input.relayUrls, built.wrappedEvent, {
        ...(input.authRequired ? { onauth: this.authSigner } : {})
      })
    );

    return {
      event: built.event,
      relayUrls: [...input.relayUrls],
      wrappedEvent: built.wrappedEvent,
      wrappedEventId: built.wrappedEvent.id
    };
  }

  subscribeControlEvents(input: {
    authRequired?: boolean | undefined;
    expectedHostAuthorityPubkey?: string | undefined;
    expectedRunnerPubkey?: string | undefined;
    onEvent: (event: EntangleControlEvent) => Promise<void> | void;
    recipientPubkey: string;
    relayUrls: string[];
  }): Promise<EntangleNostrFabricSubscription> {
    if (input.relayUrls.length === 0) {
      throw new Error("No readable relay URLs are available for control events.");
    }

    return ensureReadableRelayConnections(this.pool, input.relayUrls).then(() => {
      const poolCloser = this.pool.subscribeMany(
        input.relayUrls,
        {
          "#p": [input.recipientPubkey],
          kinds: [entangleNostrGiftWrapKind]
        },
        {
          ...(input.authRequired ? { onauth: this.authSigner } : {}),
          onevent: (wrappedEvent) => {
            const event = unwrapEntangleControlNostrEvent({
              expectedHostAuthorityPubkey: input.expectedHostAuthorityPubkey,
              expectedRunnerPubkey: input.expectedRunnerPubkey,
              recipientPubkey: input.recipientPubkey,
              recipientSecretKey: this.secretKey,
              wrappedEvent
            });

            if (event && this.dedupe.accept(event.envelope.eventId)) {
              void input.onEvent(event);
            }
          }
        }
      );
      this.subscriptions.add(poolCloser);

      return {
        close: async () => {
          this.subscriptions.delete(poolCloser);
          await Promise.resolve(poolCloser.close("control subscription closed"));
        }
      };
    });
  }

  subscribeObservationEvents(input: {
    authRequired?: boolean | undefined;
    expectedHostAuthorityPubkey?: string | undefined;
    expectedRunnerPubkey?: string | undefined;
    onEvent: (event: EntangleObservationEvent) => Promise<void> | void;
    recipientPubkey: string;
    relayUrls: string[];
  }): Promise<EntangleNostrFabricSubscription> {
    if (input.relayUrls.length === 0) {
      throw new Error(
        "No readable relay URLs are available for observation events."
      );
    }

    return ensureReadableRelayConnections(this.pool, input.relayUrls).then(() => {
      const poolCloser = this.pool.subscribeMany(
        input.relayUrls,
        {
          "#p": [input.recipientPubkey],
          kinds: [entangleNostrGiftWrapKind]
        },
        {
          ...(input.authRequired ? { onauth: this.authSigner } : {}),
          onevent: (wrappedEvent) => {
            const event = unwrapEntangleObservationNostrEvent({
              expectedHostAuthorityPubkey: input.expectedHostAuthorityPubkey,
              expectedRunnerPubkey: input.expectedRunnerPubkey,
              recipientPubkey: input.recipientPubkey,
              recipientSecretKey: this.secretKey,
              wrappedEvent
            });

            if (event && this.dedupe.accept(event.envelope.eventId)) {
              void input.onEvent(event);
            }
          }
        }
      );
      this.subscriptions.add(poolCloser);

      return {
        close: async () => {
          this.subscriptions.delete(poolCloser);
          await Promise.resolve(
            poolCloser.close("observation subscription closed")
          );
        }
      };
    });
  }
}
