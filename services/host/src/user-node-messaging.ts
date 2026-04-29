import {
  entangleA2AMessageSchema,
  entangleNostrRumorKind,
  identifierSchema,
  type EffectiveRuntimeContext,
  type EntangleA2AMessage,
  type ParsedUserNodeMessagePublishRequest,
  type UserNodeMessagePublishResponse
} from "@entangle/types";
import {
  finalizeEvent,
  nip59,
  SimplePool,
  type EventTemplate,
  type NostrEvent
} from "nostr-tools";
import type { VerifiedEvent } from "nostr-tools/pure";
import { resolveSessionLaunchRelaySelection } from "./session-launch.js";

type UserNodeMessagePool = {
  destroy?(): void;
  publish(
    relayUrls: string[],
    event: NostrEvent,
    params?: {
      onauth?: (event: EventTemplate) => Promise<VerifiedEvent>;
    }
  ): Promise<string>[];
};

export type UserNodeMessageSigner = {
  nodeId: string;
  publicKey: string;
  secretKey: Uint8Array;
};

function createUserNodeMessageIdentifier(prefix: string): string {
  const suffix = Math.random().toString(36).slice(2, 10);
  return identifierSchema.parse(`${prefix}-${suffix}`);
}

function buildAuthSigner(
  secretKey: Uint8Array
): (event: EventTemplate) => Promise<VerifiedEvent> {
  return (event) => Promise.resolve(finalizeEvent(event, secretKey));
}

function formatPublishFailure(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function buildUserNodeA2AMessage(input: {
  request: ParsedUserNodeMessagePublishRequest;
  runtimeContext: EffectiveRuntimeContext;
  userNode: UserNodeMessageSigner;
}): EntangleA2AMessage {
  const messageType = input.request.messageType;
  const sessionId =
    input.request.sessionId ?? createUserNodeMessageIdentifier("session");
  const conversationId =
    input.request.conversationId ??
    createUserNodeMessageIdentifier("conversation");
  const turnId = input.request.turnId ?? createUserNodeMessageIdentifier("turn");
  const metadata = {
    ...(messageType === "approval.response" && input.request.approval
      ? { approval: input.request.approval }
      : {}),
    ...(messageType === "source_change.review" &&
    input.request.sourceChangeReview
      ? { sourceChangeReview: input.request.sourceChangeReview }
      : {}),
    sentBy: "user-node-gateway"
  };
  const defaultResponsePolicy =
    messageType === "source_change.review"
      ? {
          closeOnResult: false,
          maxFollowups: 0,
          responseRequired: false
        }
      : {
          closeOnResult: true,
          maxFollowups: 0,
          responseRequired: false
        };

  return entangleA2AMessageSchema.parse({
    constraints: {
      approvalRequiredBeforeAction: false
    },
    conversationId,
    fromNodeId: input.userNode.nodeId,
    fromPubkey: input.userNode.publicKey,
    graphId: input.runtimeContext.binding.graphId,
    intent: input.request.intent?.trim() || input.request.summary,
    messageType,
    ...(input.request.parentMessageId
      ? { parentMessageId: input.request.parentMessageId }
      : {}),
    protocol: "entangle.a2a.v1",
    responsePolicy:
      input.request.responsePolicy ??
      defaultResponsePolicy,
    sessionId,
    toNodeId: input.runtimeContext.binding.node.nodeId,
    toPubkey: input.runtimeContext.identityContext.publicKey,
    turnId,
    work: {
      artifactRefs: input.request.artifactRefs,
      metadata,
      summary: input.request.summary
    }
  });
}

export async function publishUserNodeA2AMessage(input: {
  pool?: UserNodeMessagePool;
  request: ParsedUserNodeMessagePublishRequest;
  runtimeContext: EffectiveRuntimeContext;
  userNode: UserNodeMessageSigner;
}): Promise<UserNodeMessagePublishResponse> {
  const message = buildUserNodeA2AMessage({
    request: input.request,
    runtimeContext: input.runtimeContext,
    userNode: input.userNode
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
    input.userNode.secretKey
  );
  const seal = nip59.createSeal(
    rumor,
    input.userNode.secretKey,
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
      publishParams.onauth = buildAuthSigner(input.userNode.secretKey);
    }

    const publishResults = await Promise.allSettled(
      pool.publish(relaySelection.relayUrls, wrappedEvent, publishParams)
    );
    const publishedRelays = publishResults.flatMap((result, index) => {
      if (result.status === "rejected") {
        return [];
      }

      return [
        result.value.trim() ? result.value : relaySelection.relayUrls[index]!
      ];
    });
    const deliveryErrors = publishResults.flatMap((result, index) =>
      result.status === "rejected"
        ? [
            {
              message: formatPublishFailure(result.reason),
              relayUrl: relaySelection.relayUrls[index]!
            }
          ]
        : []
    );
    const deliveryStatus =
      publishedRelays.length === relaySelection.relayUrls.length
        ? "published"
        : publishedRelays.length > 0
          ? "partial"
          : "failed";

    return {
      conversationId: message.conversationId,
      deliveryErrors,
      deliveryStatus,
      eventId: rumor.id,
      fromNodeId: message.fromNodeId,
      fromPubkey: message.fromPubkey,
      messageType: input.request.messageType,
      publishedRelays,
      relayUrls: relaySelection.relayUrls,
      sessionId: message.sessionId,
      signerPubkey: rumor.pubkey,
      targetNodeId: message.toNodeId,
      toPubkey: message.toPubkey,
      turnId: message.turnId
    };
  } finally {
    pool.destroy?.();
  }
}
