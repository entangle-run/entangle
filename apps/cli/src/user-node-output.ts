import type {
  UserConversationProjectionRecord,
  UserNodeIdentityRecord,
  UserNodeMessagePublishResponse
} from "@entangle/types";

export type UserConversationCliSummary = {
  conversationId: string;
  graphId: string;
  lastMessageAt?: string;
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
  targetNodeId: string;
  turnId: string;
};

export function sortUserNodeIdentitiesForCli(
  userNodes: UserNodeIdentityRecord[]
): UserNodeIdentityRecord[] {
  return [...userNodes].sort((left, right) =>
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
    targetNodeId: response.targetNodeId,
    turnId: response.turnId
  };
}
