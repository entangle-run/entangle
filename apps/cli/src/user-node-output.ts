import type {
  HostProjectionSnapshot,
  RunnerRegistryEntry,
  RuntimeAssignmentRecord,
  RuntimeCommandReceiptProjectionRecord,
  RuntimeProjectionRecord,
  UserConversationProjectionRecord,
  UserNodeIdentityRecord,
  UserNodeMessageRecord,
  UserNodeMessagePublishResponse
} from "@entangle/types";
import type { RuntimeCommandReceiptWikiConflictCliSummary } from "./runtime-command-receipt-output.js";
import { projectRuntimeCommandReceiptWikiConflictSummary } from "./runtime-command-receipt-output.js";

export type UserNodeClientCliSummary = {
  assignmentId?: string;
  clientUrl?: string;
  clientHealth?: UserNodeClientHealthCliSummary;
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

export type UserNodeClientHealthCliSummary = {
  checkedAt: string;
  error?: string;
  ok: boolean;
  statusCode?: number;
  statusText?: string;
  url?: string;
};

type UserNodeClientHealthFetchResponse = {
  ok: boolean;
  status: number;
  statusText?: string | undefined;
};

type UserNodeClientHealthFetchInit = {
  signal?: AbortSignal | undefined;
};

type UserNodeClientHealthFetch = (
  url: string,
  init?: UserNodeClientHealthFetchInit
) => Promise<UserNodeClientHealthFetchResponse>;

const defaultUserNodeClientHealthTimeoutMs = 3000;

class UserNodeClientHealthTimeoutError extends Error {
  constructor(readonly timeoutMs: number) {
    super(`User Client health check timed out after ${timeoutMs}ms.`);
  }
}

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
  approvalDecision?: string;
  approvalId?: string;
  approvalOperation?: string;
  approvalResourceId?: string;
  approvalResourceKind?: string;
  approvalResourceLabel?: string;
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

export type UserNodeReviewQueueCliItem = {
  approvalId: string;
  approvalOperation?: string;
  approvalResourceId?: string;
  approvalResourceKind?: string;
  approvalResourceLabel?: string;
  conversationId: string;
  createdAt: string;
  eventId: string;
  id: string;
  kind: "approval" | "source_change";
  peerNodeId: string;
  sessionId: string;
  summary: string;
  turnId: string;
};

export type UserNodeReviewQueueCliGroup = {
  approvalCount: number;
  conversationIds: string[];
  groupId: string;
  itemCount: number;
  items: UserNodeReviewQueueCliItem[];
  label: string;
  newestCreatedAt: string;
  sourceChangeCount: number;
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
  wikiConflict?: RuntimeCommandReceiptWikiConflictCliSummary;
  wikiPageCount?: number;
  wikiPagePath?: string;
};

export type UserNodeRunnerCandidateCliSummary = {
  activeAssignmentIds: string[];
  availableCapacity: number;
  availableCapacityAfterUserNodeRevocation: number;
  currentUserAssignmentIds: string[];
  exclusionReasons: string[];
  isCurrentRunner: boolean;
  lastSeenAt?: string;
  liveness: string;
  maxAssignments: number;
  operationalState: string;
  recommended: boolean;
  runnerId: string;
  trustState: string;
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

export function sortUserNodeRuntimeAssignmentsForCli(
  assignments: RuntimeAssignmentRecord[]
): RuntimeAssignmentRecord[] {
  return [...assignments].sort((left, right) => {
    const statusOrder =
      userNodeAssignmentStatusPriority(left.status) -
      userNodeAssignmentStatusPriority(right.status);

    if (statusOrder !== 0) {
      return statusOrder;
    }

    return left.assignmentId.localeCompare(right.assignmentId);
  });
}

function userNodeAssignmentStatusPriority(
  status: RuntimeAssignmentRecord["status"]
): number {
  switch (status) {
    case "active":
      return 0;
    case "accepted":
      return 1;
    case "offered":
      return 2;
    case "revoking":
      return 3;
    case "rejected":
      return 4;
    case "expired":
      return 5;
    case "revoked":
      return 6;
  }
}

export function listCurrentUserNodeAssignmentsForCli(input: {
  assignments: RuntimeAssignmentRecord[];
  nodeId: string;
}): RuntimeAssignmentRecord[] {
  return sortUserNodeRuntimeAssignmentsForCli(
    input.assignments.filter(
      (assignment) =>
        assignment.nodeId === input.nodeId &&
        ["active", "accepted", "offered"].includes(assignment.status)
    )
  );
}

export function filterUserNodeAssignmentsForCli(input: {
  assignments: RuntimeAssignmentRecord[];
  currentOnly?: boolean | undefined;
  nodeId: string;
}): RuntimeAssignmentRecord[] {
  return sortUserNodeRuntimeAssignmentsForCli(
    input.assignments.filter((assignment) => {
      if (assignment.nodeId !== input.nodeId) {
        return false;
      }

      if (
        input.currentOnly === true &&
        !["active", "accepted", "offered"].includes(assignment.status)
      ) {
        return false;
      }

      return true;
    })
  );
}

function computeRunnerCandidateExclusionReasons(input: {
  availableCapacityAfterUserNodeRevocation: number;
  liveness: RunnerRegistryEntry["liveness"];
  operationalState: string;
  trustState: RunnerRegistryEntry["registration"]["trustState"];
}): string[] {
  const reasons: string[] = [];

  if (input.trustState !== "trusted") {
    reasons.push(`runner_trust_${input.trustState}`);
  }

  if (input.liveness !== "online") {
    reasons.push(`runner_liveness_${input.liveness}`);
  }

  if (
    input.operationalState !== "ready" &&
    input.operationalState !== "busy"
  ) {
    reasons.push(`runner_operational_${input.operationalState}`);
  }

  if (input.availableCapacityAfterUserNodeRevocation <= 0) {
    reasons.push("no_capacity_after_user_node_revocation");
  }

  return reasons;
}

function userNodeRunnerCandidateSortPriority(
  candidate: UserNodeRunnerCandidateCliSummary
): number {
  if (candidate.recommended && candidate.isCurrentRunner) {
    return 0;
  }

  if (candidate.recommended) {
    return 1;
  }

  if (candidate.isCurrentRunner) {
    return 2;
  }

  return 3;
}

function userNodeRunnerCandidateLivenessPriority(
  candidate: UserNodeRunnerCandidateCliSummary
): number {
  switch (candidate.liveness) {
    case "online":
      return 0;
    case "stale":
      return 1;
    case "offline":
      return 2;
    case "unknown":
      return 3;
    default:
      return 4;
  }
}

export function buildUserNodeRunnerCandidateSummariesForCli(input: {
  assignments: RuntimeAssignmentRecord[];
  nodeId: string;
  recommendedOnly?: boolean | undefined;
  runners: RunnerRegistryEntry[];
}): UserNodeRunnerCandidateCliSummary[] {
  const currentAssignments = listCurrentUserNodeAssignmentsForCli({
    assignments: input.assignments,
    nodeId: input.nodeId
  });
  const currentAssignmentIds = new Set(
    currentAssignments.map((assignment) => assignment.assignmentId)
  );

  const candidates = input.runners
    .filter((runner) =>
      runner.registration.capabilities.runtimeKinds.includes("human_interface")
    )
    .map((runner) => {
      const activeAssignmentIds = runner.heartbeat?.assignmentIds ?? [];
      const currentUserAssignmentIds = activeAssignmentIds.filter(
        (assignmentId) => currentAssignmentIds.has(assignmentId)
      );
      const maxAssignments = runner.registration.capabilities.maxAssignments;
      const activeAssignmentCount = activeAssignmentIds.length;
      const activeAssignmentCountAfterUserNodeRevocation =
        activeAssignmentCount - currentUserAssignmentIds.length;
      const availableCapacity = Math.max(
        0,
        maxAssignments - activeAssignmentCount
      );
      const availableCapacityAfterUserNodeRevocation = Math.max(
        0,
        maxAssignments - activeAssignmentCountAfterUserNodeRevocation
      );
      const operationalState =
        runner.heartbeat?.operationalState ?? "unknown";
      const lastSeenAt =
        runner.heartbeat?.lastHeartbeatAt ?? runner.registration.lastSeenAt;
      const exclusionReasons = computeRunnerCandidateExclusionReasons({
        availableCapacityAfterUserNodeRevocation,
        liveness: runner.liveness,
        operationalState,
        trustState: runner.registration.trustState
      });

      return {
        activeAssignmentIds,
        availableCapacity,
        availableCapacityAfterUserNodeRevocation,
        currentUserAssignmentIds,
        exclusionReasons,
        isCurrentRunner: currentUserAssignmentIds.length > 0,
        ...(lastSeenAt ? { lastSeenAt } : {}),
        liveness: runner.liveness,
        maxAssignments,
        operationalState,
        recommended: exclusionReasons.length === 0,
        runnerId: runner.registration.runnerId,
        trustState: runner.registration.trustState
      };
    })
    .filter((candidate) =>
      input.recommendedOnly === true ? candidate.recommended : true
    );

  return [...candidates].sort((left, right) => {
    const priority =
      userNodeRunnerCandidateSortPriority(left) -
      userNodeRunnerCandidateSortPriority(right);

    if (priority !== 0) {
      return priority;
    }

    const livenessOrder =
      userNodeRunnerCandidateLivenessPriority(left) -
      userNodeRunnerCandidateLivenessPriority(right);

    if (livenessOrder !== 0) {
      return livenessOrder;
    }

    const capacityOrder =
      right.availableCapacityAfterUserNodeRevocation -
      left.availableCapacityAfterUserNodeRevocation;

    if (capacityOrder !== 0) {
      return capacityOrder;
    }

    return left.runnerId.localeCompare(right.runnerId);
  });
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

export function filterUserConversationsForCli(input: {
  conversations: UserConversationProjectionRecord[];
  peerNodeId?: string | undefined;
  unreadOnly?: boolean | undefined;
}): UserConversationProjectionRecord[] {
  return sortUserConversationsForCli(
    input.conversations.filter((conversation) => {
      if (
        input.peerNodeId !== undefined &&
        conversation.peerNodeId !== input.peerNodeId
      ) {
        return false;
      }

      if (input.unreadOnly === true && conversation.unreadCount <= 0) {
        return false;
      }

      return true;
    })
  );
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

export function sortUserNodeMessagesForCli(
  messages: UserNodeMessageRecord[]
): UserNodeMessageRecord[] {
  return [...messages].sort((left, right) => {
    const timeOrder = right.createdAt.localeCompare(left.createdAt);
    return timeOrder !== 0
      ? timeOrder
      : left.eventId.localeCompare(right.eventId);
  });
}

export function filterUserNodeMessagesForCli(input: {
  direction?: UserNodeMessageRecord["direction"] | undefined;
  limit?: number | undefined;
  messages: UserNodeMessageRecord[];
  messageType?: string | undefined;
}): UserNodeMessageRecord[] {
  const messages = sortUserNodeMessagesForCli(
    input.messages.filter((message) => {
      if (input.direction !== undefined && message.direction !== input.direction) {
        return false;
      }

      if (
        input.messageType !== undefined &&
        message.messageType !== input.messageType
      ) {
        return false;
      }

      return true;
    })
  );

  return input.limit === undefined ? messages : messages.slice(0, input.limit);
}

export function filterUserNodeApprovalMessagesForCli(input: {
  limit?: number | undefined;
  messages: UserNodeMessageRecord[];
}): UserNodeMessageRecord[] {
  const messages = filterUserNodeMessagesForCli({
    direction: "inbound",
    messages: input.messages,
    messageType: "approval.request"
  }).filter((message) => message.approval !== undefined);

  return input.limit === undefined ? messages : messages.slice(0, input.limit);
}

export function filterUserNodeSourceReviewMessagesForCli(input: {
  limit?: number | undefined;
  messages: UserNodeMessageRecord[];
}): UserNodeMessageRecord[] {
  const messages = filterUserNodeApprovalMessagesForCli({
    messages: input.messages
  }).filter(
    (message) => message.approval?.resource?.kind === "source_change_candidate"
  );

  return input.limit === undefined ? messages : messages.slice(0, input.limit);
}

function projectUserNodeReviewQueueItem(
  message: UserNodeMessageRecord
): UserNodeReviewQueueCliItem | undefined {
  const approval = message.approval;

  if (
    message.direction !== "inbound" ||
    message.messageType !== "approval.request" ||
    approval === undefined
  ) {
    return undefined;
  }

  const resource = approval.resource;
  const kind =
    resource?.kind === "source_change_candidate" ? "source_change" : "approval";

  return {
    approvalId: approval.approvalId,
    ...(approval.operation ? { approvalOperation: approval.operation } : {}),
    ...(resource?.id ? { approvalResourceId: resource.id } : {}),
    ...(resource?.kind ? { approvalResourceKind: resource.kind } : {}),
    ...(resource?.label ? { approvalResourceLabel: resource.label } : {}),
    conversationId: message.conversationId,
    createdAt: message.createdAt,
    eventId: message.eventId,
    id: `${kind}:${approval.approvalId}`,
    kind,
    peerNodeId: message.peerNodeId,
    sessionId: message.sessionId,
    summary: message.summary,
    turnId: message.turnId
  };
}

export function buildUserNodeReviewQueueForCli(input: {
  limit?: number | undefined;
  messages: UserNodeMessageRecord[];
}): UserNodeReviewQueueCliItem[] {
  const items = filterUserNodeApprovalMessagesForCli({
    messages: input.messages
  })
    .map(projectUserNodeReviewQueueItem)
    .filter((item): item is UserNodeReviewQueueCliItem => item !== undefined);

  return input.limit === undefined ? items : items.slice(0, input.limit);
}

export function buildUserNodeReviewQueueGroupsForCli(
  items: UserNodeReviewQueueCliItem[]
): UserNodeReviewQueueCliGroup[] {
  const groupsById = new Map<string, UserNodeReviewQueueCliGroup>();

  for (const item of items) {
    const groupId = `peer:${item.peerNodeId}`;
    const existing = groupsById.get(groupId);
    const group =
      existing ??
      ({
        approvalCount: 0,
        conversationIds: [],
        groupId,
        itemCount: 0,
        items: [],
        label: item.peerNodeId,
        newestCreatedAt: item.createdAt,
        sourceChangeCount: 0
      } satisfies UserNodeReviewQueueCliGroup);

    group.items.push(item);
    group.itemCount += 1;
    group.newestCreatedAt =
      item.createdAt > group.newestCreatedAt ? item.createdAt : group.newestCreatedAt;

    if (!group.conversationIds.includes(item.conversationId)) {
      group.conversationIds.push(item.conversationId);
    }

    if (item.kind === "source_change") {
      group.sourceChangeCount += 1;
    } else {
      group.approvalCount += 1;
    }

    groupsById.set(groupId, group);
  }

  return [...groupsById.values()].sort((left, right) => {
    const createdOrder = right.newestCreatedAt.localeCompare(left.newestCreatedAt);

    if (createdOrder !== 0) {
      return createdOrder;
    }

    return left.groupId.localeCompare(right.groupId);
  });
}

function formatReviewQueueCount(
  count: number,
  singular: string,
  plural = `${singular}s`
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatUserNodeReviewQueueGroupForCli(
  group: UserNodeReviewQueueCliGroup
): string {
  return [
    group.label,
    formatReviewQueueCount(group.itemCount, "review"),
    formatReviewQueueCount(group.approvalCount, "approval", "approvals"),
    formatReviewQueueCount(group.sourceChangeCount, "source change")
  ].join(" · ");
}

export function projectUserNodeReviewQueueItemSummary(
  item: UserNodeReviewQueueCliItem
): UserNodeReviewQueueCliItem {
  return item;
}

export function projectUserNodeReviewQueueGroupSummary(
  group: UserNodeReviewQueueCliGroup
): UserNodeReviewQueueCliGroup & { labelSummary: string } {
  return {
    ...group,
    items: group.items.map(projectUserNodeReviewQueueItemSummary),
    labelSummary: formatUserNodeReviewQueueGroupForCli(group)
  };
}

export function projectUserNodeCommandReceiptSummary(
  receipt: RuntimeCommandReceiptProjectionRecord
): UserNodeCommandReceiptCliSummary {
  const wikiConflict = projectRuntimeCommandReceiptWikiConflictSummary(receipt);

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
    ...(wikiConflict ? { wikiConflict } : {}),
    ...(receipt.wikiPageCount ? { wikiPageCount: receipt.wikiPageCount } : {}),
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

export function filterUserNodeClientSummariesForCli(input: {
  nodeId?: string | undefined;
  summaries: UserNodeClientCliSummary[];
}): UserNodeClientCliSummary[] {
  if (!input.nodeId) {
    return input.summaries;
  }

  return input.summaries.filter((summary) => summary.nodeId === input.nodeId);
}

function buildUserClientHealthUrl(clientUrl: string): string {
  return new URL("/health", clientUrl).toString();
}

function resolveUserNodeClientHealthTimeoutMs(
  timeoutMs: number | undefined
): number {
  const resolved = timeoutMs ?? defaultUserNodeClientHealthTimeoutMs;

  if (!Number.isSafeInteger(resolved) || resolved <= 0) {
    throw new Error("User Client health timeout must be a positive integer.");
  }

  return resolved;
}

async function fetchUserNodeClientHealthWithTimeout(input: {
  fetchImpl: UserNodeClientHealthFetch;
  timeoutMs: number;
  url: string;
}): Promise<UserNodeClientHealthFetchResponse> {
  const controller = new AbortController();
  let timedOut = false;
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      input.fetchImpl(input.url, { signal: controller.signal }),
      new Promise<never>((_resolve, reject) => {
        timeoutHandle = setTimeout(() => {
          timedOut = true;
          controller.abort();
          reject(new UserNodeClientHealthTimeoutError(input.timeoutMs));
        }, input.timeoutMs);
      })
    ]);
  } catch (error) {
    if (timedOut) {
      throw new UserNodeClientHealthTimeoutError(input.timeoutMs);
    }

    throw error;
  } finally {
    if (timeoutHandle !== undefined) {
      clearTimeout(timeoutHandle);
    }
  }
}

export async function attachUserNodeClientHealthForCli(input: {
  fetchImpl?: UserNodeClientHealthFetch | undefined;
  now?: (() => string) | undefined;
  summaries: UserNodeClientCliSummary[];
  timeoutMs?: number | undefined;
}): Promise<UserNodeClientCliSummary[]> {
  const checkedAt = input.now?.() ?? new Date().toISOString();
  const timeoutMs = resolveUserNodeClientHealthTimeoutMs(input.timeoutMs);
  const fetchImpl =
    input.fetchImpl ??
    (async (
      url: string,
      init?: UserNodeClientHealthFetchInit
    ): Promise<UserNodeClientHealthFetchResponse> => {
      const response = await fetch(
        url,
        init?.signal ? { signal: init.signal } : undefined
      );

      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText
      };
    });

  return Promise.all(
    input.summaries.map(async (summary) => {
      if (!summary.clientUrl) {
        return {
          ...summary,
          clientHealth: {
            checkedAt,
            error: "missing clientUrl",
            ok: false
          }
        };
      }

      let url: string;

      try {
        url = buildUserClientHealthUrl(summary.clientUrl);
      } catch (error) {
        return {
          ...summary,
          clientHealth: {
            checkedAt,
            error:
              error instanceof Error
                ? `invalid clientUrl: ${error.message}`
                : "invalid clientUrl",
            ok: false
          }
        };
      }

      try {
        const response = await fetchUserNodeClientHealthWithTimeout({
          fetchImpl,
          timeoutMs,
          url
        });

        return {
          ...summary,
          clientHealth: {
            checkedAt,
            ok: response.ok,
            statusCode: response.status,
            ...(response.statusText ? { statusText: response.statusText } : {}),
            url,
            ...(response.ok ? {} : { error: `HTTP ${response.status}` })
          }
        };
      } catch (error) {
        return {
          ...summary,
          clientHealth: {
            checkedAt,
            error:
              error instanceof UserNodeClientHealthTimeoutError
                ? error.message
                : error instanceof Error
                  ? error.message
                  : "User Client health check failed.",
            ok: false,
            url
          }
        };
      }
    })
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
  const approval = message.approval;
  const approvalResource = approval?.resource;

  return {
    ...(approval?.decision ? { approvalDecision: approval.decision } : {}),
    ...(approval?.approvalId ? { approvalId: approval.approvalId } : {}),
    ...(approval?.operation ? { approvalOperation: approval.operation } : {}),
    ...(approvalResource?.id ? { approvalResourceId: approvalResource.id } : {}),
    ...(approvalResource?.kind
      ? { approvalResourceKind: approvalResource.kind }
      : {}),
    ...(approvalResource?.label
      ? { approvalResourceLabel: approvalResource.label }
      : {}),
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
