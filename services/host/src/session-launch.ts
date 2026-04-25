import {
  entangleA2AMessageSchema,
  entangleNostrRumorKind,
  identifierSchema,
  type EffectiveRuntimeContext,
  type EntangleA2AMessage,
  type GraphSpec,
  type ParsedSessionLaunchRequest,
  type SessionLaunchResponse
} from "@entangle/types";
import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  nip59,
  SimplePool,
  type EventTemplate,
  type NostrEvent
} from "nostr-tools";
import type { VerifiedEvent } from "nostr-tools/pure";

type HostSessionLaunchPool = {
  destroy?(): void;
  publish(
    relayUrls: string[],
    event: NostrEvent,
    params?: {
      onauth?: (event: EventTemplate) => Promise<VerifiedEvent>;
    }
  ): Promise<string>[];
};

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values)];
}

export function createSessionLaunchIdentifier(prefix: string): string {
  const suffix = Math.random().toString(36).slice(2, 10);
  return identifierSchema.parse(`${prefix}-${suffix}`);
}

export function resolveDefaultSessionLaunchUserNodeId(graph: GraphSpec): string {
  const userNode = graph.nodes.find((node) => node.nodeKind === "user");

  if (!userNode) {
    throw new Error("Cannot launch a session without a user node in the graph.");
  }

  return userNode.nodeId;
}

export function resolveSessionLaunchRelaySelection(
  context: EffectiveRuntimeContext
): {
  authRequired: boolean;
  relayUrls: string[];
} {
  const relayProfilesById = new Map(
    context.relayContext.relayProfiles.map((relayProfile) => [
      relayProfile.id,
      relayProfile
    ])
  );
  const relayRefs =
    context.relayContext.primaryRelayProfileRef !== undefined
      ? [context.relayContext.primaryRelayProfileRef]
      : context.binding.resolvedResourceBindings.relayProfileRefs;
  const selectedProfiles =
    relayRefs.length === 0
      ? context.relayContext.relayProfiles
      : relayRefs
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

export function buildSessionLaunchMessage(input: {
  conversationId: string;
  fromNodeId: string;
  fromPubkey: string;
  request: ParsedSessionLaunchRequest;
  runtimeContext: EffectiveRuntimeContext;
  sessionId: string;
  turnId: string;
}): EntangleA2AMessage {
  return entangleA2AMessageSchema.parse({
    constraints: {
      approvalRequiredBeforeAction: false
    },
    conversationId: input.conversationId,
    fromNodeId: input.fromNodeId,
    fromPubkey: input.fromPubkey,
    graphId: input.runtimeContext.binding.graphId,
    intent: input.request.intent?.trim() || input.request.summary,
    messageType: "task.request",
    protocol: "entangle.a2a.v1",
    responsePolicy: {
      closeOnResult: true,
      maxFollowups: 0,
      responseRequired: false
    },
    sessionId: input.sessionId,
    toNodeId: input.runtimeContext.binding.node.nodeId,
    toPubkey: input.runtimeContext.identityContext.publicKey,
    turnId: input.turnId,
    work: {
      artifactRefs: input.request.artifactRefs,
      metadata: {
        launchedBy: "entangle-host"
      },
      summary: input.request.summary
    }
  });
}

function buildAuthSigner(
  secretKey: Uint8Array
): (event: EventTemplate) => Promise<VerifiedEvent> {
  return (event) => Promise.resolve(finalizeEvent(event, secretKey));
}

export async function publishHostSessionLaunch(input: {
  graph: GraphSpec;
  pool?: HostSessionLaunchPool;
  request: ParsedSessionLaunchRequest;
  runtimeContext: EffectiveRuntimeContext;
}): Promise<SessionLaunchResponse> {
  const userSecretKey = generateSecretKey();
  const fromPubkey = getPublicKey(userSecretKey);
  const sessionId =
    input.request.sessionId ?? createSessionLaunchIdentifier("session");
  const conversationId =
    input.request.conversationId ??
    createSessionLaunchIdentifier("conversation");
  const turnId = input.request.turnId ?? createSessionLaunchIdentifier("turn");
  const fromNodeId =
    input.request.fromNodeId ?? resolveDefaultSessionLaunchUserNodeId(input.graph);
  const message = buildSessionLaunchMessage({
    conversationId,
    fromNodeId,
    fromPubkey,
    request: input.request,
    runtimeContext: input.runtimeContext,
    sessionId,
    turnId
  });
  const relaySelection = resolveSessionLaunchRelaySelection(input.runtimeContext);

  if (relaySelection.relayUrls.length === 0) {
    throw new Error(
      `No writable relay URLs are available for node '${message.toNodeId}'.`
    );
  }

  const rumor = nip59.createRumor(
    {
      content: JSON.stringify(message),
      kind: entangleNostrRumorKind,
      tags: []
    },
    userSecretKey
  );
  const seal = nip59.createSeal(
    rumor,
    userSecretKey,
    input.runtimeContext.identityContext.publicKey
  );
  const wrappedEvent = nip59.createWrap(
    seal,
    input.runtimeContext.identityContext.publicKey
  );
  const pool = input.pool ?? new SimplePool();

  try {
    const publishParams: {
      onauth?: (event: EventTemplate) => Promise<VerifiedEvent>;
    } = {};

    if (relaySelection.authRequired) {
      publishParams.onauth = buildAuthSigner(userSecretKey);
    }

    const publishedRelays = await Promise.all(
      pool.publish(relaySelection.relayUrls, wrappedEvent, publishParams)
    );

    return {
      conversationId,
      eventId: rumor.id,
      fromNodeId,
      publishedRelays,
      relayUrls: relaySelection.relayUrls,
      sessionId,
      targetNodeId: message.toNodeId,
      turnId
    };
  } finally {
    pool.destroy?.();
  }
}
