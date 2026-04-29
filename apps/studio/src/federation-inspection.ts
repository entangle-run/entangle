import type {
  AssignmentReceiptProjectionRecord,
  AssignmentProjectionRecord,
  HostProjectionSnapshot,
  RunnerProjectionRecord,
  RunnerRegistryEntry,
  RuntimeCommandReceiptProjectionRecord,
  RuntimeAssignmentTimelineEntry,
  RuntimeAssignmentTimelineResponse,
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
  runtimeCommandReceiptCount: number;
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

export type AssignmentOperationalDetailInput = {
  assignment: AssignmentProjectionRecord;
  projection: HostProjectionSnapshot;
  runnerRegistryEntry?: RunnerRegistryEntry;
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
    runtimeCommandReceiptCount: projection?.runtimeCommandReceipts.length ?? 0,
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

function runnerTrustPriority(runner: RunnerProjectionRecord): number {
  switch (runner.trustState) {
    case "pending":
      return 0;
    case "trusted":
      return runner.operationalState === "offline" ? 2 : 1;
    case "revoked":
      return 3;
  }
}

export function sortRunnerProjectionsForStudio(
  runners: RunnerProjectionRecord[]
): RunnerProjectionRecord[] {
  return [...runners].sort((left, right) => {
    const priorityOrder = runnerTrustPriority(left) - runnerTrustPriority(right);

    if (priorityOrder !== 0) {
      return priorityOrder;
    }

    return left.runnerId.localeCompare(right.runnerId);
  });
}

export function canTrustRunnerProjection(
  runner: RunnerProjectionRecord
): boolean {
  return runner.trustState !== "trusted";
}

export function canRevokeRunnerProjection(
  runner: RunnerProjectionRecord
): boolean {
  return runner.trustState !== "revoked";
}

export function formatRunnerProjectionLabel(
  runner: RunnerProjectionRecord
): string {
  return `${runner.runnerId} · ${runner.trustState}`;
}

export function formatRunnerProjectionDetail(
  runner: RunnerProjectionRecord,
  registryEntry?: RunnerRegistryEntry
): string {
  const heartbeat = registryEntry?.heartbeat;
  const registration = registryEntry?.registration;
  const capabilities = registration?.capabilities;
  const runtimeKinds = capabilities?.runtimeKinds.join("/") ?? undefined;
  const engineKinds = capabilities?.agentEngineKinds.join("/") ?? undefined;
  const lastSeenAt =
    heartbeat?.lastHeartbeatAt ?? runner.lastSeenAt ?? registration?.lastSeenAt;

  return [
    registryEntry ? `liveness ${registryEntry.liveness}` : undefined,
    `state ${runner.operationalState}`,
    `assignments ${runner.assignmentIds.length}`,
    runtimeKinds ? `runtimes ${runtimeKinds}` : undefined,
    engineKinds ? `engines ${engineKinds}` : undefined,
    capabilities ? `capacity ${capabilities.maxAssignments}` : undefined,
    lastSeenAt ? `last seen ${lastSeenAt}` : "not seen yet",
    `pubkey ${runner.publicKey.slice(0, 12)}...`
  ].filter((part): part is string => Boolean(part)).join(" · ");
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

export function summarizeAssignmentReceiptsForStudio(input: {
  assignment: AssignmentProjectionRecord;
  receipts: AssignmentReceiptProjectionRecord[];
}): string {
  const receipts = sortAssignmentReceiptsForStudio(
    input.receipts.filter(
      (receipt) => receipt.assignmentId === input.assignment.assignmentId
    )
  );

  if (receipts.length === 0) {
    return "no runner receipts yet";
  }

  const latest = receipts[0]!;

  return [
    `${receipts.length} receipt${receipts.length === 1 ? "" : "s"}`,
    `latest ${latest.receiptKind}`,
    `at ${latest.observedAt}`
  ].join(" · ");
}

export function sortRuntimeCommandReceiptsForStudio(
  receipts: RuntimeCommandReceiptProjectionRecord[]
): RuntimeCommandReceiptProjectionRecord[] {
  return [...receipts].sort((left, right) => {
    const timeOrder = right.observedAt.localeCompare(left.observedAt);
    return timeOrder !== 0
      ? timeOrder
      : left.commandId.localeCompare(right.commandId);
  });
}

export function formatRuntimeCommandReceiptLabel(
  receipt: RuntimeCommandReceiptProjectionRecord
): string {
  return [
    receipt.assignmentId ?? "unassigned",
    receipt.commandEventType,
    receipt.receiptStatus
  ].join(" · ");
}

export function formatRuntimeCommandReceiptDetail(
  receipt: RuntimeCommandReceiptProjectionRecord
): string {
  return [
    `command ${receipt.commandId}`,
    `runner ${receipt.runnerId}`,
    `observed ${receipt.observedAt}`,
    receipt.candidateId ? `candidate ${receipt.candidateId}` : undefined,
    receipt.sourceHistoryId ? `source ${receipt.sourceHistoryId}` : undefined,
    receipt.wikiArtifactId ? `wiki ${receipt.wikiArtifactId}` : undefined,
    receipt.artifactId ? `artifact ${receipt.artifactId}` : undefined
  ].filter((part): part is string => Boolean(part)).join(" · ");
}

export function summarizeAssignmentCommandReceiptsForStudio(input: {
  assignment: AssignmentProjectionRecord;
  receipts: RuntimeCommandReceiptProjectionRecord[];
}): string {
  const receipts = sortRuntimeCommandReceiptsForStudio(
    input.receipts.filter(
      (receipt) => receipt.assignmentId === input.assignment.assignmentId
    )
  );

  if (receipts.length === 0) {
    return "no command receipts yet";
  }

  const latest = receipts[0]!;

  return [
    `${receipts.length} command receipt${receipts.length === 1 ? "" : "s"}`,
    `latest ${latest.commandEventType}`,
    latest.receiptStatus,
    `at ${latest.observedAt}`
  ].join(" · ");
}

export function buildAssignmentOperationalDetailsForStudio(
  input: AssignmentOperationalDetailInput
): string[] {
  const runtime = input.projection.runtimes.find(
    (candidate) =>
      candidate.assignmentId === input.assignment.assignmentId ||
      (candidate.nodeId === input.assignment.nodeId &&
        candidate.runnerId === input.assignment.runnerId)
  );
  const sourceHistoryCount = input.projection.sourceHistoryRefs.filter(
    (sourceHistory) =>
      sourceHistory.nodeId === input.assignment.nodeId &&
      sourceHistory.runnerId === input.assignment.runnerId
  ).length;
  const replayCount = input.projection.sourceHistoryReplays.filter(
    (replay) =>
      replay.nodeId === input.assignment.nodeId &&
      replay.runnerId === input.assignment.runnerId
  ).length;
  const commandReceiptCount = input.projection.runtimeCommandReceipts.filter(
    (receipt) => receipt.assignmentId === input.assignment.assignmentId
  ).length;
  const runnerLiveness = input.runnerRegistryEntry?.liveness;
  const runnerHeartbeatAt = input.runnerRegistryEntry?.heartbeat?.lastHeartbeatAt;

  return [
    runtime
      ? `runtime ${runtime.observedState} / desired ${runtime.desiredState}`
      : "runtime not observed",
    runnerLiveness ? `runner liveness ${runnerLiveness}` : undefined,
    runnerHeartbeatAt ? `runner heartbeat ${runnerHeartbeatAt}` : undefined,
    `source histories ${sourceHistoryCount}`,
    `history replays ${replayCount}`,
    `command receipts ${commandReceiptCount}`
  ].filter((part): part is string => Boolean(part));
}

export function sortRuntimeAssignmentTimelineForStudio(
  entries: RuntimeAssignmentTimelineEntry[]
): RuntimeAssignmentTimelineEntry[] {
  return [...entries].sort((left, right) => {
    const timeOrder = left.timestamp.localeCompare(right.timestamp);
    return timeOrder !== 0
      ? timeOrder
      : left.entryKind.localeCompare(right.entryKind);
  });
}

export function summarizeRuntimeAssignmentTimelineForStudio(
  timeline: RuntimeAssignmentTimelineResponse
): string {
  return [
    timeline.assignment.assignmentId,
    timeline.assignment.status,
    `${timeline.receipts.length} receipt${
      timeline.receipts.length === 1 ? "" : "s"
    }`,
    `${timeline.commandReceipts.length} command receipt${
      timeline.commandReceipts.length === 1 ? "" : "s"
    }`,
    `${timeline.timeline.length} timeline entr${
      timeline.timeline.length === 1 ? "y" : "ies"
    }`
  ].join(" · ");
}

export function formatRuntimeAssignmentTimelineLabel(
  entry: RuntimeAssignmentTimelineEntry
): string {
  return [
    entry.entryKind,
    entry.status,
    entry.receiptKind,
    entry.commandEventType,
    entry.receiptStatus
  ].filter((part) => part !== undefined).join(" · ");
}

export function formatRuntimeAssignmentTimelineDetail(
  entry: RuntimeAssignmentTimelineEntry
): string {
  return [
    `at ${entry.timestamp}`,
    entry.commandId ? `command ${entry.commandId}` : undefined,
    entry.message
  ].filter((part) => part !== undefined).join(" · ");
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
