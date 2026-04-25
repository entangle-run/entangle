import {
  artifactRefSchema,
  entangleA2AMessageSchema,
  entangleNostrRumorKind,
  identifierSchema,
  type ArtifactRef,
  type EffectiveRuntimeContext,
  type EntangleA2AMessage,
  type GraphSpec
} from "@entangle/types";
import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  nip59,
  SimplePool,
  type EventTemplate
} from "nostr-tools";
import type { VerifiedEvent } from "nostr-tools/pure";

export type SessionLaunchRelaySelection = {
  authRequired: boolean;
  relayUrls: string[];
};

export type SessionLaunchMessageInput = {
  artifactRefs?: ArtifactRef[];
  conversationId: string;
  fromNodeId: string;
  fromPubkey: string;
  intent?: string;
  runtimeContext: EffectiveRuntimeContext;
  sessionId: string;
  summary: string;
  turnId: string;
};

export type SessionLaunchPublishInput = Omit<
  SessionLaunchMessageInput,
  "conversationId" | "fromPubkey" | "sessionId" | "turnId"
> & {
  conversationId?: string;
  sessionId?: string;
  turnId?: string;
};

export type SessionLaunchPublishResult = {
  conversationId: string;
  eventId: string;
  fromNodeId: string;
  publishedRelays: string[];
  relayUrls: string[];
  sessionId: string;
  targetNodeId: string;
  turnId: string;
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
): SessionLaunchRelaySelection {
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

export function parseSessionLaunchArtifactRef(input: unknown): ArtifactRef {
  return artifactRefSchema.parse(input);
}

export function buildSessionLaunchMessage(
  input: SessionLaunchMessageInput
): EntangleA2AMessage {
  return entangleA2AMessageSchema.parse({
    constraints: {
      approvalRequiredBeforeAction: false
    },
    conversationId: identifierSchema.parse(input.conversationId),
    fromNodeId: identifierSchema.parse(input.fromNodeId),
    fromPubkey: input.fromPubkey,
    graphId: input.runtimeContext.binding.graphId,
    intent: input.intent?.trim() || input.summary,
    messageType: "task.request",
    protocol: "entangle.a2a.v1",
    responsePolicy: {
      closeOnResult: true,
      maxFollowups: 0,
      responseRequired: false
    },
    sessionId: identifierSchema.parse(input.sessionId),
    toNodeId: input.runtimeContext.binding.node.nodeId,
    toPubkey: input.runtimeContext.identityContext.publicKey,
    turnId: identifierSchema.parse(input.turnId),
    work: {
      artifactRefs: input.artifactRefs ?? [],
      metadata: {
        launchedBy: "entangle-cli"
      },
      summary: input.summary
    }
  });
}

function buildAuthSigner(
  secretKey: Uint8Array
): (event: EventTemplate) => Promise<VerifiedEvent> {
  return (event) => Promise.resolve(finalizeEvent(event, secretKey));
}

export async function publishSessionLaunch(
  input: SessionLaunchPublishInput
): Promise<SessionLaunchPublishResult> {
  const userSecretKey = generateSecretKey();
  const fromPubkey = getPublicKey(userSecretKey);
  const sessionId = input.sessionId ?? createSessionLaunchIdentifier("session");
  const conversationId =
    input.conversationId ?? createSessionLaunchIdentifier("conversation");
  const turnId = input.turnId ?? createSessionLaunchIdentifier("turn");
  const message = buildSessionLaunchMessage({
    ...input,
    conversationId,
    fromPubkey,
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
  const pool = new SimplePool();

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
      fromNodeId: input.fromNodeId,
      publishedRelays,
      relayUrls: relaySelection.relayUrls,
      sessionId,
      targetNodeId: message.toNodeId,
      turnId
    };
  } finally {
    pool.destroy();
  }
}
