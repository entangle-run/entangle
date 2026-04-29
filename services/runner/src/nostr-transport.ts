import {
  entangleA2AMessageSchema,
  entangleNostrGiftWrapKind,
  entangleNostrRumorKind,
  type EffectiveRuntimeContext,
  type EntangleA2AMessage
} from "@entangle/types";
import {
  finalizeEvent,
  getEventHash,
  nip44,
  SimplePool,
  verifyEvent,
  type EventTemplate,
  type Filter,
  type NostrEvent,
  nip59
} from "nostr-tools";
import type { VerifiedEvent } from "nostr-tools/pure";
import type {
  RunnerInboundEnvelope,
  RunnerPublishedEnvelope,
  RunnerTransport,
  RunnerTransportSubscription
} from "./transport.js";

type PoolCloser = {
  close(reason?: string): void | Promise<void>;
};

const nostrSealKind = 13;

type NostrRumor = Omit<NostrEvent, "sig">;

export interface RunnerNostrPool {
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

function nowIsoString(): string {
  return new Date().toISOString();
}

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function buildRumorTemplate(message: EntangleA2AMessage): Partial<NostrEvent> {
  return {
    content: JSON.stringify(message),
    kind: entangleNostrRumorKind,
    tags: []
  };
}

function buildAuthSigner(secretKey: Uint8Array): (event: EventTemplate) => Promise<VerifiedEvent> {
  return (event) => Promise.resolve(finalizeEvent(event, secretKey));
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
    Array.isArray(candidate.tags) &&
    candidate.tags.every((tag) =>
      Array.isArray(tag) && tag.every((value) => typeof value === "string")
    )
  );
}

function isNostrRumor(input: unknown): input is NostrRumor {
  if (!input || typeof input !== "object") {
    return false;
  }

  const candidate = input as Partial<NostrRumor>;

  return (
    typeof candidate.content === "string" &&
    typeof candidate.created_at === "number" &&
    typeof candidate.id === "string" &&
    typeof candidate.kind === "number" &&
    typeof candidate.pubkey === "string" &&
    Array.isArray(candidate.tags) &&
    candidate.tags.every((tag) =>
      Array.isArray(tag) && tag.every((value) => typeof value === "string")
    )
  );
}

function decryptNip44Json(input: {
  encryptedEvent: NostrEvent;
  secretKey: Uint8Array;
}): unknown {
  const conversationKey = nip44.getConversationKey(
    input.secretKey,
    input.encryptedEvent.pubkey
  );

  return JSON.parse(nip44.decrypt(input.encryptedEvent.content, conversationKey));
}

function resolveRelayProfilesById(
  context: EffectiveRuntimeContext
): Map<string, EffectiveRuntimeContext["relayContext"]["relayProfiles"][number]> {
  return new Map(
    context.relayContext.relayProfiles.map((relayProfile) => [
      relayProfile.id,
      relayProfile
    ])
  );
}

function resolvePublishRelayUrls(
  context: EffectiveRuntimeContext,
  peerNodeId: string
): {
  authRequired: boolean;
  relayUrls: string[];
} {
  const relayProfilesById = resolveRelayProfilesById(context);
  const routeRelayRefs =
    context.relayContext.edgeRoutes.find((route) => route.peerNodeId === peerNodeId)
      ?.relayProfileRefs ?? [];
  const fallbackRelayRefs =
    routeRelayRefs.length > 0
      ? routeRelayRefs
      : context.relayContext.primaryRelayProfileRef
        ? [context.relayContext.primaryRelayProfileRef]
        : context.binding.resolvedResourceBindings.relayProfileRefs;
  const selectedProfiles = fallbackRelayRefs
    .map((relayRef) => relayProfilesById.get(relayRef))
    .filter((relayProfile) => relayProfile !== undefined);

  return {
    authRequired: selectedProfiles.some(
      (relayProfile) => relayProfile.authMode === "nip42"
    ),
    relayUrls: dedupeStrings(
      selectedProfiles.flatMap((relayProfile) => relayProfile.writeUrls)
    )
  };
}

function resolveSubscribeRelayUrls(context: EffectiveRuntimeContext): {
  authRequired: boolean;
  relayUrls: string[];
} {
  const selectedProfiles = context.relayContext.relayProfiles;

  return {
    authRequired: selectedProfiles.some(
      (relayProfile) => relayProfile.authMode === "nip42"
    ),
    relayUrls: dedupeStrings(
      selectedProfiles.flatMap((relayProfile) => relayProfile.readUrls)
    )
  };
}

async function ensureReadableRelayConnections(
  pool: RunnerNostrPool,
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

function unwrapMessageEvent(input: {
  receivedAt: string;
  secretKey: Uint8Array;
  wrappedEvent: NostrEvent;
}): RunnerInboundEnvelope | undefined {
  if (input.wrappedEvent.kind !== entangleNostrGiftWrapKind) {
    return undefined;
  }

  let seal: NostrEvent;
  let rumor: NostrRumor;

  try {
    const decryptedSeal = decryptNip44Json({
      encryptedEvent: input.wrappedEvent,
      secretKey: input.secretKey
    });

    if (
      !isNostrEvent(decryptedSeal) ||
      decryptedSeal.kind !== nostrSealKind ||
      !verifyEvent(decryptedSeal)
    ) {
      return undefined;
    }

    seal = decryptedSeal;

    const decryptedRumor = decryptNip44Json({
      encryptedEvent: seal,
      secretKey: input.secretKey
    });

    if (
      !isNostrRumor(decryptedRumor) ||
      decryptedRumor.pubkey !== seal.pubkey ||
      getEventHash(decryptedRumor) !== decryptedRumor.id
    ) {
      return undefined;
    }

    rumor = decryptedRumor;
  } catch {
    return undefined;
  }

  if (rumor.kind !== entangleNostrRumorKind) {
    return undefined;
  }

  let parsedContent: unknown;

  try {
    parsedContent = JSON.parse(rumor.content);
  } catch {
    return undefined;
  }

  const parseResult = entangleA2AMessageSchema.safeParse(parsedContent);

  if (!parseResult.success) {
    return undefined;
  }

  if (parseResult.data.fromPubkey !== rumor.pubkey) {
    return undefined;
  }

  return {
    eventId: rumor.id,
    message: parseResult.data,
    receivedAt: input.receivedAt,
    signerPubkey: rumor.pubkey
  };
}

export class NostrRunnerTransport implements RunnerTransport {
  private readonly authSigner: (event: EventTemplate) => Promise<VerifiedEvent>;
  private readonly context: EffectiveRuntimeContext;
  private readonly ownsPool: boolean;
  private readonly pool: RunnerNostrPool;
  private readonly secretKey: Uint8Array;
  private readonly subscriptions = new Set<PoolCloser>();

  constructor(input: {
    context: EffectiveRuntimeContext;
    pool?: RunnerNostrPool;
    secretKey: Uint8Array;
  }) {
    this.authSigner = buildAuthSigner(input.secretKey);
    this.context = input.context;
    this.ownsPool = !input.pool;
    this.pool = input.pool ?? new SimplePool();
    this.secretKey = input.secretKey;
  }

  async close(): Promise<void> {
    await Promise.all(
      [...this.subscriptions].map((subscription) =>
        Promise.resolve(subscription.close("runner transport shutdown"))
      )
    );
    this.subscriptions.clear();

    if (this.ownsPool) {
      this.pool.destroy?.();
    }
  }

  async publish(message: EntangleA2AMessage): Promise<RunnerPublishedEnvelope> {
    const relaySelection = resolvePublishRelayUrls(this.context, message.toNodeId);

    if (relaySelection.relayUrls.length === 0) {
      throw new Error(
        `No writable relay URLs are available for peer node '${message.toNodeId}'.`
      );
    }

    const rumor = nip59.createRumor(buildRumorTemplate(message), this.secretKey);
    const seal = nip59.createSeal(rumor, this.secretKey, message.toPubkey);
    const wrappedEvent = nip59.createWrap(seal, message.toPubkey);
    const publishParams: {
      onauth?: (event: EventTemplate) => Promise<VerifiedEvent>;
    } = {};

    if (relaySelection.authRequired) {
      publishParams.onauth = this.authSigner;
    }

    await Promise.all(
      this.pool.publish(relaySelection.relayUrls, wrappedEvent, publishParams)
    );

    return {
      eventId: rumor.id,
      message,
      receivedAt: nowIsoString(),
      signerPubkey: rumor.pubkey
    };
  }

  subscribe(input: {
    onMessage: (envelope: RunnerInboundEnvelope) => Promise<void> | void;
    recipientPubkey: string;
  }): Promise<RunnerTransportSubscription> {
    const relaySelection = resolveSubscribeRelayUrls(this.context);

    if (relaySelection.relayUrls.length === 0) {
      throw new Error("No readable relay URLs are available for the current node.");
    }

    return ensureReadableRelayConnections(this.pool, relaySelection.relayUrls).then(
      () => {
        const poolCloser = this.pool.subscribeMany(
          relaySelection.relayUrls,
          {
            "#p": [input.recipientPubkey],
            kinds: [entangleNostrGiftWrapKind]
          },
          (() => {
            const subscribeParams: {
              onauth?: (event: EventTemplate) => Promise<VerifiedEvent>;
              onevent: (event: NostrEvent) => void;
            } = {
              onevent: (wrappedEvent) => {
                const envelope = unwrapMessageEvent({
                  receivedAt: nowIsoString(),
                  secretKey: this.secretKey,
                  wrappedEvent
                });

                if (envelope) {
                  void input.onMessage(envelope);
                }
              }
            };

            if (relaySelection.authRequired) {
              subscribeParams.onauth = this.authSigner;
            }

            return subscribeParams;
          })()
        );
        this.subscriptions.add(poolCloser);

        return {
          close: async () => {
            this.subscriptions.delete(poolCloser);
            await Promise.resolve(poolCloser.close("runner subscription closed"));
          }
        };
      }
    );
  }
}
