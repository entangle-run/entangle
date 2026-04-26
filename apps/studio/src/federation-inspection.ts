import type {
  HostProjectionSnapshot,
  RuntimeProjectionRecord,
  UserConversationProjectionRecord,
  UserNodeIdentityRecord
} from "@entangle/types";

export type FederationProjectionSummary = {
  assignmentCount: number;
  artifactRefCount: number;
  failedRuntimeCount: number;
  freshness: string;
  runtimeCount: number;
  runningRuntimeCount: number;
  runnerCount: number;
  sourceChangeRefCount: number;
  userConversationCount: number;
  wikiRefCount: number;
};

export function summarizeFederationProjection(
  projection: HostProjectionSnapshot | null
): FederationProjectionSummary {
  return {
    assignmentCount: projection?.assignments.length ?? 0,
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
    `source ${runtime.projection.source}`
  ].join(" · ");
}

export function sortUserNodeIdentitiesForStudio(
  userNodes: UserNodeIdentityRecord[]
): UserNodeIdentityRecord[] {
  return [...userNodes].sort((left, right) =>
    left.nodeId.localeCompare(right.nodeId)
  );
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
    `updated ${lastMessageAt}`
  ].join(" · ");
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
