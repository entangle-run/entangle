import type {
  AssignmentReceiptProjectionRecord,
  HostProjectionSnapshot,
  RuntimeProjectionRecord,
  UserConversationProjectionRecord,
  UserNodeIdentityRecord
} from "@entangle/types";

export type FederationProjectionSummary = {
  assignmentCount: number;
  assignmentReceiptCount: number;
  artifactRefCount: number;
  failedRuntimeCount: number;
  freshness: string;
  runtimeCount: number;
  runningRuntimeCount: number;
  runnerCount: number;
  sourceChangeRefCount: number;
  sourceHistoryRefCount: number;
  sourceHistoryReplayCount: number;
  userConversationCount: number;
  wikiRefCount: number;
};

export type UserNodeRuntimeSummary = {
  activeConversationCount: number;
  clientUrl?: string;
  conversationCount: number;
  gatewayCount: number;
  graphId: string;
  nodeId: string;
  pendingApprovalCount: number;
  publicKeyPrefix: string;
  runnerId?: string;
  runtimeObservedState?: string;
  status: string;
  unreadCount: number;
};

export function summarizeFederationProjection(
  projection: HostProjectionSnapshot | null
): FederationProjectionSummary {
  return {
    assignmentCount: projection?.assignments.length ?? 0,
    assignmentReceiptCount: projection?.assignmentReceipts.length ?? 0,
    artifactRefCount: projection?.artifactRefs.length ?? 0,
    failedRuntimeCount:
      projection?.runtimes.filter((runtime) => runtime.observedState === "failed")
        .length ?? 0,
    freshness: projection?.freshness ?? "unknown",
    runtimeCount: projection?.runtimes.length ?? 0,
    runningRuntimeCount:
      projection?.runtimes.filter((runtime) => runtime.observedState === "running")
        .length ?? 0,
    runnerCount: projection?.runners.length ?? 0,
    sourceChangeRefCount: projection?.sourceChangeRefs.length ?? 0,
    sourceHistoryRefCount: projection?.sourceHistoryRefs.length ?? 0,
    sourceHistoryReplayCount: projection?.sourceHistoryReplays.length ?? 0,
    userConversationCount: projection?.userConversations.length ?? 0,
    wikiRefCount: projection?.wikiRefs.length ?? 0
  };
}

export function sortRuntimeProjectionsForStudio(
  runtimes: RuntimeProjectionRecord[]
): RuntimeProjectionRecord[] {
  return [...runtimes].sort((left, right) =>
    left.nodeId.localeCompare(right.nodeId)
  );
}

export function sortAssignmentReceiptsForStudio(
  receipts: AssignmentReceiptProjectionRecord[]
): AssignmentReceiptProjectionRecord[] {
  return [...receipts].sort((left, right) => {
    const timeOrder = right.observedAt.localeCompare(left.observedAt);
    return timeOrder !== 0
      ? timeOrder
      : left.assignmentId.localeCompare(right.assignmentId);
  });
}

export function formatAssignmentReceiptLabel(
  receipt: AssignmentReceiptProjectionRecord
): string {
  return `${receipt.assignmentId} · ${receipt.receiptKind}`;
}

export function formatAssignmentReceiptDetail(
  receipt: AssignmentReceiptProjectionRecord
): string {
  return [
    `runner ${receipt.runnerId}`,
    `observed ${receipt.observedAt}`,
    receipt.receiptMessage
  ].filter((part): part is string => Boolean(part)).join(" · ");
}

export function formatRuntimeProjectionLabel(
  runtime: RuntimeProjectionRecord
): string {
  return `${runtime.nodeId} · ${runtime.observedState}`;
}

export function formatRuntimeProjectionDetail(
  runtime: RuntimeProjectionRecord
): string {
  return [
    `desired ${runtime.desiredState}`,
    `backend ${runtime.backendKind}`,
    runtime.runnerId ? `runner ${runtime.runnerId}` : "runner unassigned",
    runtime.clientUrl ? `client ${runtime.clientUrl}` : undefined,
    `source ${runtime.projection.source}`
  ].filter((part): part is string => Boolean(part)).join(" · ");
}

export function sortUserNodeIdentitiesForStudio(
  userNodes: UserNodeIdentityRecord[]
): UserNodeIdentityRecord[] {
  return [...userNodes].sort((left, right) =>
    left.nodeId.localeCompare(right.nodeId)
  );
}

function isActiveUserConversation(
  conversation: UserConversationProjectionRecord
): boolean {
  return !["closed", "expired", "rejected", "resolved"].includes(
    conversation.status
  );
}

export function buildUserNodeRuntimeSummaries(
  userNodes: UserNodeIdentityRecord[],
  projection: HostProjectionSnapshot | null
): UserNodeRuntimeSummary[] {
  const runtimesByNodeId = new Map(
    (projection?.runtimes ?? []).map((runtime) => [runtime.nodeId, runtime])
  );
  const conversationsByUserNodeId = new Map<
    string,
    UserConversationProjectionRecord[]
  >();

  for (const conversation of projection?.userConversations ?? []) {
    const conversations =
      conversationsByUserNodeId.get(conversation.userNodeId) ?? [];
    conversations.push(conversation);
    conversationsByUserNodeId.set(conversation.userNodeId, conversations);
  }

  return sortUserNodeIdentitiesForStudio(userNodes).map((userNode) => {
    const conversations = conversationsByUserNodeId.get(userNode.nodeId) ?? [];
    const runtime = runtimesByNodeId.get(userNode.nodeId);

    return {
      activeConversationCount: conversations.filter(isActiveUserConversation)
        .length,
      ...(runtime?.clientUrl ? { clientUrl: runtime.clientUrl } : {}),
      conversationCount: conversations.length,
      gatewayCount: userNode.gatewayIds.length,
      graphId: userNode.graphId,
      nodeId: userNode.nodeId,
      pendingApprovalCount: conversations.reduce(
        (total, conversation) => total + conversation.pendingApprovalIds.length,
        0
      ),
      publicKeyPrefix: `${userNode.publicKey.slice(0, 12)}...`,
      ...(runtime?.runnerId ? { runnerId: runtime.runnerId } : {}),
      ...(runtime ? { runtimeObservedState: runtime.observedState } : {}),
      status: userNode.status,
      unreadCount: conversations.reduce(
        (total, conversation) => total + conversation.unreadCount,
        0
      )
    };
  });
}

export function sortUserConversationsForStudio(
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

export function formatUserConversationLabel(
  conversation: UserConversationProjectionRecord
): string {
  return `${conversation.userNodeId} to ${conversation.peerNodeId}`;
}

export function formatUserConversationDetail(
  conversation: UserConversationProjectionRecord
): string {
  const lastMessageAt =
    conversation.lastMessageAt ?? conversation.projection.updatedAt;

  return [
    conversation.conversationId,
    `unread ${conversation.unreadCount}`,
    `approvals ${conversation.pendingApprovalIds.length}`,
    conversation.lastReadAt ? `read ${conversation.lastReadAt}` : undefined,
    `updated ${lastMessageAt}`
  ].filter((part): part is string => Boolean(part)).join(" · ");
}

export function formatUserNodeIdentityLabel(
  userNode: UserNodeIdentityRecord
): string {
  return `${userNode.nodeId} · ${userNode.status}`;
}

export function formatUserNodeIdentityDetail(
  userNode: UserNodeIdentityRecord
): string {
  return [
    `graph ${userNode.graphId}`,
    `gateways ${userNode.gatewayIds.length}`,
    `pubkey ${userNode.publicKey.slice(0, 12)}...`
  ].join(" · ");
}

export function formatUserNodeRuntimeSummaryLabel(
  summary: UserNodeRuntimeSummary
): string {
  return [
    summary.nodeId,
    summary.status,
    summary.runtimeObservedState
  ].filter((part): part is string => Boolean(part)).join(" · ");
}

export function formatUserNodeRuntimeSummaryDetail(
  summary: UserNodeRuntimeSummary
): string {
  return [
    `graph ${summary.graphId}`,
    summary.runnerId ? `runner ${summary.runnerId}` : "runner unassigned",
    `conversations ${summary.conversationCount}`,
    `active ${summary.activeConversationCount}`,
    `approvals ${summary.pendingApprovalCount}`,
    `unread ${summary.unreadCount}`,
    `gateways ${summary.gatewayCount}`,
    `pubkey ${summary.publicKeyPrefix}`
  ].join(" · ");
}
