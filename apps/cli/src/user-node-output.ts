import type {
  HostProjectionSnapshot,
  RuntimeProjectionRecord,
  UserConversationProjectionRecord,
  UserNodeIdentityRecord,
  UserNodeMessageRecord,
  UserNodeMessagePublishResponse
} from "@entangle/types";

export type UserNodeClientCliSummary = {
  assignmentId?: string;
  clientUrl?: string;
  desiredState?: string;
  graphId: string;
  identityStatus: string;
  lastSeenAt?: string;
  nodeId: string;
  observedState: string;
  publicKey: string;
  runnerId?: string;
  statusMessage?: string;
  updatedAt?: string;
};

export type UserConversationCliSummary = {
  conversationId: string;
  graphId: string;
  lastMessageAt?: string;
  lastReadAt?: string;
  peerNodeId: string;
  pendingApprovalCount: number;
  unreadCount: number;
  updatedAt: string;
  userNodeId: string;
};

export type UserNodeIdentityCliSummary = {
  gatewayCount: number;
  graphId: string;
  nodeId: string;
  publicKey: string;
  status: string;
  updatedAt: string;
};

export type UserNodeMessagePublishCliSummary = {
  conversationId: string;
  eventId: string;
  fromNodeId: string;
  messageType: string;
  publishedRelayCount: number;
  sessionId: string;
  signerMatchesFromPubkey?: boolean;
  signerPubkey?: string;
  targetNodeId: string;
  turnId: string;
};

export type UserNodeMessageCliSummary = {
  conversationId: string;
  createdAt: string;
  direction: string;
  eventId: string;
  fromNodeId: string;
  messageType: string;
  peerNodeId: string;
  sessionId: string;
  signerMatchesFromPubkey?: boolean;
  signerPubkey?: string;
  toNodeId: string;
  turnId: string;
};

function projectSignerAudit(input: {
  fromPubkey: string;
  signerPubkey?: string | undefined;
}): {
  signerMatchesFromPubkey?: boolean;
  signerPubkey?: string;
} {
  if (!input.signerPubkey) {
    return {};
  }

  return {
    signerMatchesFromPubkey: input.signerPubkey === input.fromPubkey,
    signerPubkey: input.signerPubkey
  };
}

export function sortUserNodeIdentitiesForCli(
  userNodes: UserNodeIdentityRecord[]
): UserNodeIdentityRecord[] {
  return [...userNodes].sort((left, right) =>
    left.nodeId.localeCompare(right.nodeId)
  );
}

export function sortUserNodeClientSummariesForCli(
  summaries: UserNodeClientCliSummary[]
): UserNodeClientCliSummary[] {
  return [...summaries].sort((left, right) =>
    left.nodeId.localeCompare(right.nodeId)
  );
}

export function sortUserConversationsForCli(
  conversations: UserConversationProjectionRecord[]
): UserConversationProjectionRecord[] {
  return [...conversations].sort((left, right) => {
    const leftTime = left.lastMessageAt ?? left.projection.updatedAt;
    const rightTime = right.lastMessageAt ?? right.projection.updatedAt;
    const timeOrder = rightTime.localeCompare(leftTime);

    if (timeOrder !== 0) {
      return timeOrder;
    }

    return left.conversationId.localeCompare(right.conversationId);
  });
}

export function projectUserConversationSummary(
  conversation: UserConversationProjectionRecord
): UserConversationCliSummary {
  return {
    conversationId: conversation.conversationId,
    graphId: conversation.graphId,
    ...(conversation.lastMessageAt
      ? { lastMessageAt: conversation.lastMessageAt }
      : {}),
    ...(conversation.lastReadAt ? { lastReadAt: conversation.lastReadAt } : {}),
    peerNodeId: conversation.peerNodeId,
    pendingApprovalCount: conversation.pendingApprovalIds.length,
    unreadCount: conversation.unreadCount,
    updatedAt: conversation.projection.updatedAt,
    userNodeId: conversation.userNodeId
  };
}

export function projectUserNodeIdentitySummary(
  userNode: UserNodeIdentityRecord
): UserNodeIdentityCliSummary {
  return {
    gatewayCount: userNode.gatewayIds.length,
    graphId: userNode.graphId,
    nodeId: userNode.nodeId,
    publicKey: userNode.publicKey,
    status: userNode.status,
    updatedAt: userNode.updatedAt
  };
}

function projectUserNodeClientSummary(input: {
  runtime?: RuntimeProjectionRecord | undefined;
  userNode: UserNodeIdentityRecord;
}): UserNodeClientCliSummary {
  const runtime = input.runtime;

  return {
    ...(runtime?.assignmentId ? { assignmentId: runtime.assignmentId } : {}),
    ...(runtime?.clientUrl ? { clientUrl: runtime.clientUrl } : {}),
    ...(runtime?.desiredState ? { desiredState: runtime.desiredState } : {}),
    graphId: input.userNode.graphId,
    identityStatus: input.userNode.status,
    ...(runtime?.lastSeenAt ? { lastSeenAt: runtime.lastSeenAt } : {}),
    nodeId: input.userNode.nodeId,
    observedState: runtime?.observedState ?? "unassigned",
    publicKey: input.userNode.publicKey,
    ...(runtime?.runnerId ? { runnerId: runtime.runnerId } : {}),
    ...(runtime?.statusMessage ? { statusMessage: runtime.statusMessage } : {}),
    ...(runtime?.projection.updatedAt
      ? { updatedAt: runtime.projection.updatedAt }
      : {})
  };
}

export function buildUserNodeClientSummariesForCli(input: {
  projection: HostProjectionSnapshot;
  userNodes: UserNodeIdentityRecord[];
}): UserNodeClientCliSummary[] {
  const runtimesByNodeId = new Map(
    input.projection.runtimes.map((runtime) => [runtime.nodeId, runtime])
  );

  return sortUserNodeClientSummariesForCli(
    input.userNodes.map((userNode) =>
      projectUserNodeClientSummary({
        runtime: runtimesByNodeId.get(userNode.nodeId),
        userNode
      })
    )
  );
}

export function projectUserNodeMessagePublishSummary(
  response: UserNodeMessagePublishResponse
): UserNodeMessagePublishCliSummary {
  return {
    conversationId: response.conversationId,
    eventId: response.eventId,
    fromNodeId: response.fromNodeId,
    messageType: response.messageType,
    publishedRelayCount: response.publishedRelays.length,
    sessionId: response.sessionId,
    ...projectSignerAudit({
      fromPubkey: response.fromPubkey,
      signerPubkey: response.signerPubkey
    }),
    targetNodeId: response.targetNodeId,
    turnId: response.turnId
  };
}

export function projectUserNodeMessageSummary(
  message: UserNodeMessageRecord
): UserNodeMessageCliSummary {
  return {
    conversationId: message.conversationId,
    createdAt: message.createdAt,
    direction: message.direction,
    eventId: message.eventId,
    fromNodeId: message.fromNodeId,
    messageType: message.messageType,
    peerNodeId: message.peerNodeId,
    sessionId: message.sessionId,
    ...projectSignerAudit({
      fromPubkey: message.fromPubkey,
      signerPubkey: message.signerPubkey
    }),
    toNodeId: message.toNodeId,
    turnId: message.turnId
  };
}
