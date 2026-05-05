import type {
  HostProjectionSnapshot,
  RuntimeCommandReceiptProjectionRecord,
  RuntimeProjectionRecord,
  UserConversationProjectionRecord,
  UserNodeIdentityRecord,
  UserNodeMessageRecord,
  UserNodeMessagePublishResponse
} from "@entangle/types";

export type UserNodeClientCliSummary = {
  assignmentId?: string;
  clientUrl?: string;
  commandReceiptCount: number;
  conversationCount: number;
  desiredState?: string;
  failedCommandReceiptCount: number;
  graphId: string;
  identityStatus: string;
  lastMessageAt?: string;
  lastSeenAt?: string;
  nodeId: string;
  observedState: string;
  pendingApprovalCount: number;
  publicKey: string;
  runnerId?: string;
  statusMessage?: string;
  unreadCount: number;
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

export type UserNodeCommandReceiptCliSummary = {
  artifactId?: string;
  commandEventType: string;
  commandId: string;
  nodeId: string;
  observedAt: string;
  receiptStatus: string;
  runnerId: string;
  sourceHistoryId?: string;
  wikiArtifactId?: string;
  wikiPagePath?: string;
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

export function sortUserNodeCommandReceiptsForCli(
  receipts: RuntimeCommandReceiptProjectionRecord[]
): RuntimeCommandReceiptProjectionRecord[] {
  return [...receipts].sort((left, right) => {
    const timeOrder = right.observedAt.localeCompare(left.observedAt);
    return timeOrder !== 0
      ? timeOrder
      : left.commandId.localeCompare(right.commandId);
  });
}

export function filterUserNodeCommandReceiptsForCli(input: {
  commandEventType?: string;
  nodeId?: string;
  receipts: RuntimeCommandReceiptProjectionRecord[];
  receiptStatus?: RuntimeCommandReceiptProjectionRecord["receiptStatus"];
  userNodeId: string;
}): RuntimeCommandReceiptProjectionRecord[] {
  return sortUserNodeCommandReceiptsForCli(
    input.receipts.filter((receipt) => {
      if (receipt.requestedBy !== input.userNodeId) {
        return false;
      }

      if (input.nodeId !== undefined && receipt.nodeId !== input.nodeId) {
        return false;
      }

      if (
        input.commandEventType !== undefined &&
        receipt.commandEventType !== input.commandEventType
      ) {
        return false;
      }

      if (
        input.receiptStatus !== undefined &&
        receipt.receiptStatus !== input.receiptStatus
      ) {
        return false;
      }

      return true;
    })
  );
}

export function projectUserNodeCommandReceiptSummary(
  receipt: RuntimeCommandReceiptProjectionRecord
): UserNodeCommandReceiptCliSummary {
  return {
    ...(receipt.artifactId ? { artifactId: receipt.artifactId } : {}),
    commandEventType: receipt.commandEventType,
    commandId: receipt.commandId,
    nodeId: receipt.nodeId,
    observedAt: receipt.observedAt,
    receiptStatus: receipt.receiptStatus,
    runnerId: receipt.runnerId,
    ...(receipt.sourceHistoryId
      ? { sourceHistoryId: receipt.sourceHistoryId }
      : {}),
    ...(receipt.wikiArtifactId ? { wikiArtifactId: receipt.wikiArtifactId } : {}),
    ...(receipt.wikiPagePath ? { wikiPagePath: receipt.wikiPagePath } : {})
  };
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
  commandReceipts: RuntimeCommandReceiptProjectionRecord[];
  conversations: UserConversationProjectionRecord[];
  runtime?: RuntimeProjectionRecord | undefined;
  userNode: UserNodeIdentityRecord;
}): UserNodeClientCliSummary {
  const runtime = input.runtime;
  const lastMessageAt = input.conversations
    .map((conversation) => conversation.lastMessageAt)
    .filter((value): value is string => value !== undefined)
    .sort((left, right) => right.localeCompare(left))[0];

  return {
    ...(runtime?.assignmentId ? { assignmentId: runtime.assignmentId } : {}),
    ...(runtime?.clientUrl ? { clientUrl: runtime.clientUrl } : {}),
    commandReceiptCount: input.commandReceipts.length,
    conversationCount: input.conversations.length,
    ...(runtime?.desiredState ? { desiredState: runtime.desiredState } : {}),
    failedCommandReceiptCount: input.commandReceipts.filter(
      (receipt) => receipt.receiptStatus === "failed"
    ).length,
    graphId: input.userNode.graphId,
    identityStatus: input.userNode.status,
    ...(lastMessageAt ? { lastMessageAt } : {}),
    ...(runtime?.lastSeenAt ? { lastSeenAt: runtime.lastSeenAt } : {}),
    nodeId: input.userNode.nodeId,
    observedState: runtime?.observedState ?? "unassigned",
    pendingApprovalCount: input.conversations.reduce(
      (total, conversation) => total + conversation.pendingApprovalIds.length,
      0
    ),
    publicKey: input.userNode.publicKey,
    ...(runtime?.runnerId ? { runnerId: runtime.runnerId } : {}),
    ...(runtime?.statusMessage ? { statusMessage: runtime.statusMessage } : {}),
    unreadCount: input.conversations.reduce(
      (total, conversation) => total + conversation.unreadCount,
      0
    ),
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
  const conversationsByUserNodeId = new Map<
    string,
    UserConversationProjectionRecord[]
  >();
  for (const conversation of input.projection.userConversations) {
    conversationsByUserNodeId.set(conversation.userNodeId, [
      ...(conversationsByUserNodeId.get(conversation.userNodeId) ?? []),
      conversation
    ]);
  }
  const commandReceiptsByRequester = new Map<
    string,
    RuntimeCommandReceiptProjectionRecord[]
  >();
  for (const receipt of input.projection.runtimeCommandReceipts) {
    if (!receipt.requestedBy) {
      continue;
    }
    commandReceiptsByRequester.set(receipt.requestedBy, [
      ...(commandReceiptsByRequester.get(receipt.requestedBy) ?? []),
      receipt
    ]);
  }

  return sortUserNodeClientSummariesForCli(
    input.userNodes.map((userNode) =>
      projectUserNodeClientSummary({
        commandReceipts: commandReceiptsByRequester.get(userNode.nodeId) ?? [],
        conversations: conversationsByUserNodeId.get(userNode.nodeId) ?? [],
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
