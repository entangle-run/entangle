import type {
  HostProjectionSnapshot,
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
  wikiConflict?: RuntimeCommandReceiptWikiConflictCliSummary;
  wikiPageCount?: number;
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
