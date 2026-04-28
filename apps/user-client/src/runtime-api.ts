import type {
  ArtifactRef,
  SourceChangeRefProjectionRecord,
  UserConversationProjectionRecord,
  UserNodeConversationResponse,
  UserNodeMessagePublishResponse,
  UserNodeMessagePublishType,
  UserNodeMessageRecord,
  WikiRefProjectionRecord
} from "@entangle/types";

export type UserClientTarget = {
  channel: string;
  nodeId: string;
  relation: string;
};

export type UserClientState = {
  conversations: UserConversationProjectionRecord[];
  error?: string;
  generatedAt?: string;
  graphId: string;
  graphRevisionId: string;
  runtime: {
    hostApiBaseUrl?: string;
    hostApiConfigured: boolean;
    identityPublicKey: string;
    primaryRelayProfileRef?: string;
    relayUrls: string[];
  };
  sourceChangeRefs: SourceChangeRefProjectionRecord[];
  targets: UserClientTarget[];
  userNodeId: string;
  wikiRefs: WikiRefProjectionRecord[];
};

export type MessageDraft = {
  conversationId?: string | undefined;
  messageType: UserNodeMessagePublishType;
  parentMessageId?: string | undefined;
  sessionId?: string | undefined;
  summary: string;
  targetNodeId: string;
};

export function normalizeApiBaseUrl(value: string | undefined): string {
  const trimmed = value?.trim() ?? "";

  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

export function buildRuntimeApiUrl(pathname: string, baseUrl = ""): string {
  if (!baseUrl) {
    return pathname;
  }

  return new URL(pathname, `${baseUrl}/`).toString();
}

async function fetchJson<T>(
  pathname: string,
  input: {
    baseUrl: string;
    init?: RequestInit;
  }
): Promise<T> {
  const response = await fetch(buildRuntimeApiUrl(pathname, input.baseUrl), {
    headers: {
      accept: "application/json",
      ...(input.init?.headers ?? {})
    },
    ...input.init
  });

  if (!response.ok) {
    throw new Error(
      `Runtime API ${pathname} failed with HTTP ${response.status}: ${await response.text()}`
    );
  }

  return (await response.json()) as T;
}

export function fetchUserClientState(
  baseUrl: string
): Promise<UserClientState> {
  return fetchJson<UserClientState>("/api/state", { baseUrl });
}

export function fetchConversationDetail(input: {
  baseUrl: string;
  conversationId: string;
}): Promise<UserNodeConversationResponse> {
  return fetchJson<UserNodeConversationResponse>(
    `/api/conversations/${encodeURIComponent(input.conversationId)}`,
    {
      baseUrl: input.baseUrl
    }
  );
}

export function publishUserMessage(input: {
  baseUrl: string;
  draft: MessageDraft;
}): Promise<UserNodeMessagePublishResponse> {
  return fetchJson<UserNodeMessagePublishResponse>("/api/messages", {
    baseUrl: input.baseUrl,
    init: {
      body: JSON.stringify(input.draft),
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    }
  });
}

export function publishApprovalResponse(input: {
  baseUrl: string;
  decision: "approved" | "rejected";
  message: UserNodeMessageRecord;
}): Promise<UserNodeMessagePublishResponse> {
  if (!input.message.approval) {
    throw new Error("Selected message does not carry approval metadata.");
  }

  return fetchJson<UserNodeMessagePublishResponse>("/api/messages", {
    baseUrl: input.baseUrl,
    init: {
      body: JSON.stringify({
        approval: {
          approvalId: input.message.approval.approvalId,
          decision: input.decision,
          ...(input.message.approval.operation
            ? { operation: input.message.approval.operation }
            : {}),
          ...(input.message.approval.reason
            ? { reason: input.message.approval.reason }
            : {}),
          ...(input.message.approval.resource
            ? { resource: input.message.approval.resource }
            : {})
        },
        conversationId: input.message.conversationId,
        messageType: "approval.response",
        parentMessageId: input.message.eventId,
        sessionId: input.message.sessionId,
        summary: `${input.decision === "approved" ? "Approved" : "Rejected"} ${input.message.approval.approvalId}.`,
        targetNodeId: input.message.fromNodeId
      }),
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    }
  });
}

export function chooseConversationId(input: {
  conversations: UserConversationProjectionRecord[];
  currentConversationId?: string | undefined;
}): string | undefined {
  if (
    input.currentConversationId &&
    input.conversations.some(
      (conversation) =>
        conversation.conversationId === input.currentConversationId
    )
  ) {
    return input.currentConversationId;
  }

  return input.conversations[0]?.conversationId;
}

export function formatConversationTimestamp(
  conversation: UserConversationProjectionRecord
): string {
  return conversation.lastMessageAt ?? conversation.projection.updatedAt;
}

export function formatDeliveryLabel(message: UserNodeMessageRecord): string {
  if (message.direction === "inbound") {
    return "received";
  }

  const targetRelayCount =
    message.relayUrls.length > 0
      ? message.relayUrls.length
      : message.publishedRelays.length;
  const deliveryStatus =
    message.deliveryStatus ??
    (message.publishedRelays.length > 0 ? "published" : undefined);

  if (deliveryStatus === "failed") {
    return `failed ${message.publishedRelays.length}/${targetRelayCount}`;
  }

  if (deliveryStatus === "partial") {
    return `partial ${message.publishedRelays.length}/${targetRelayCount}`;
  }

  if (message.publishedRelays.length > 0) {
    return `published ${message.publishedRelays.length}/${targetRelayCount}`;
  }

  return "pending";
}

export function renderArtifactLocator(ref: ArtifactRef): string {
  switch (ref.backend) {
    case "git":
      return [
        ref.locator.repositoryName,
        ref.locator.branch,
        ref.locator.commit,
        ref.locator.path
      ]
        .filter((value) => value !== undefined)
        .join(" / ");
    case "wiki":
      return `${ref.locator.nodeId} / ${ref.locator.path}`;
    case "local_file":
      return ref.locator.path;
  }
}
