import type {
  ArtifactRef,
  RuntimeArtifactDiffResponse,
  RuntimeArtifactHistoryResponse,
  RuntimeArtifactRestoreResponse,
  RuntimeArtifactSourceChangeProposalResponse,
  RuntimeSourceChangeCandidateFilePreviewResponse,
  RuntimeSourceChangeCandidateInspectionResponse,
  RuntimeWikiPublishResponse,
  SourceChangeRefProjectionRecord,
  SourceChangeSummary,
  UserConversationProjectionRecord,
  UserNodeConversationResponse,
  UserNodeConversationReadResponse,
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

export type UserClientPreviewResult =
  | {
      available: true;
      bytesRead: number;
      content: string;
      contentEncoding: "utf8";
      contentType: "text/markdown" | "text/plain" | "text/x-diff";
      truncated: boolean;
    }
  | {
      available: false;
      reason: string;
    };

export type UserClientArtifactPreviewResponse = {
  artifact?: ArtifactRef | undefined;
  artifactId: string;
  nodeId: string;
  preview: UserClientPreviewResult;
  source: "projection" | "runtime" | "unavailable";
};

export type UserClientArtifactHistoryResponse = {
  artifact?: ArtifactRef | undefined;
  artifactId: string;
  history: RuntimeArtifactHistoryResponse["history"];
  nodeId: string;
  source: "runtime" | "unavailable";
};

export type UserClientArtifactDiffResponse = {
  artifact?: ArtifactRef | undefined;
  artifactId: string;
  diff: RuntimeArtifactDiffResponse["diff"];
  nodeId: string;
  source: "runtime" | "unavailable";
};

export type UserClientArtifactSourceProposalResponse =
  RuntimeArtifactSourceChangeProposalResponse & {
    artifact?: ArtifactRef | undefined;
    source: "runtime";
    userNodeId: string;
  };

export type UserClientArtifactRestoreResponse = RuntimeArtifactRestoreResponse & {
  artifact?: ArtifactRef | undefined;
  source: "runtime";
  userNodeId: string;
};

export type UserClientWikiPublishResponse = RuntimeWikiPublishResponse & {
  source: "runtime";
  userNodeId: string;
  wikiRefs: WikiRefProjectionRecord[];
};

export type UserClientSourceChangeDiffResponse = {
  candidateId: string;
  diff: UserClientPreviewResult;
  nodeId: string;
  review?: RuntimeSourceChangeCandidateInspectionResponse["candidate"]["review"];
  source: "projection" | "runtime" | "unavailable";
  sourceChangeSummary?: SourceChangeSummary | undefined;
  status?: SourceChangeRefProjectionRecord["status"] | undefined;
};

export type UserClientSourceChangeFilePreviewResponse = {
  candidateId: string;
  nodeId: string;
  path: string;
  preview: RuntimeSourceChangeCandidateFilePreviewResponse["preview"];
  source: "projection" | "runtime" | "unavailable";
  sourceChangeSummary?: SourceChangeSummary | undefined;
  status?: SourceChangeRefProjectionRecord["status"] | undefined;
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

export function markConversationRead(input: {
  baseUrl: string;
  conversationId: string;
}): Promise<UserNodeConversationReadResponse> {
  return fetchJson<UserNodeConversationReadResponse>(
    `/api/conversations/${encodeURIComponent(input.conversationId)}/read`,
    {
      baseUrl: input.baseUrl,
      init: {
        method: "POST"
      }
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

export function fetchArtifactPreview(input: {
  artifactId: string;
  baseUrl: string;
  conversationId: string;
  nodeId: string;
}): Promise<UserClientArtifactPreviewResponse> {
  const params = new URLSearchParams({
    artifactId: input.artifactId,
    conversationId: input.conversationId,
    nodeId: input.nodeId
  });

  return fetchJson<UserClientArtifactPreviewResponse>(
    `/api/artifacts/preview?${params.toString()}`,
    {
      baseUrl: input.baseUrl
    }
  );
}

export function fetchArtifactHistory(input: {
  artifactId: string;
  baseUrl: string;
  conversationId: string;
  nodeId: string;
}): Promise<UserClientArtifactHistoryResponse> {
  const params = new URLSearchParams({
    artifactId: input.artifactId,
    conversationId: input.conversationId,
    nodeId: input.nodeId
  });

  return fetchJson<UserClientArtifactHistoryResponse>(
    `/api/artifacts/history?${params.toString()}`,
    {
      baseUrl: input.baseUrl
    }
  );
}

export function fetchArtifactDiff(input: {
  artifactId: string;
  baseUrl: string;
  conversationId: string;
  nodeId: string;
}): Promise<UserClientArtifactDiffResponse> {
  const params = new URLSearchParams({
    artifactId: input.artifactId,
    conversationId: input.conversationId,
    nodeId: input.nodeId
  });

  return fetchJson<UserClientArtifactDiffResponse>(
    `/api/artifacts/diff?${params.toString()}`,
    {
      baseUrl: input.baseUrl
    }
  );
}

export function restoreArtifact(input: {
  artifactId: string;
  baseUrl: string;
  conversationId: string;
  nodeId: string;
  reason?: string | undefined;
  restoreId?: string | undefined;
}): Promise<UserClientArtifactRestoreResponse> {
  return fetchJson<UserClientArtifactRestoreResponse>("/api/artifacts/restore", {
    baseUrl: input.baseUrl,
    init: {
      body: JSON.stringify({
        artifactId: input.artifactId,
        conversationId: input.conversationId,
        nodeId: input.nodeId,
        ...(input.reason ? { reason: input.reason } : {}),
        ...(input.restoreId ? { restoreId: input.restoreId } : {})
      }),
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    }
  });
}

export function proposeArtifactSourceChange(input: {
  artifactId: string;
  baseUrl: string;
  conversationId: string;
  nodeId: string;
  overwrite?: boolean | undefined;
  reason?: string | undefined;
  targetPath?: string | undefined;
}): Promise<UserClientArtifactSourceProposalResponse> {
  return fetchJson<UserClientArtifactSourceProposalResponse>(
    "/api/artifacts/source-change-proposal",
    {
      baseUrl: input.baseUrl,
      init: {
        body: JSON.stringify({
          artifactId: input.artifactId,
          conversationId: input.conversationId,
          nodeId: input.nodeId,
          overwrite: input.overwrite ?? false,
          ...(input.reason ? { reason: input.reason } : {}),
          ...(input.targetPath ? { targetPath: input.targetPath } : {})
        }),
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      }
    }
  );
}

export function publishWikiRepository(input: {
  baseUrl: string;
  conversationId: string;
  nodeId: string;
  reason?: string | undefined;
  retryFailedPublication?: boolean | undefined;
}): Promise<UserClientWikiPublishResponse> {
  return fetchJson<UserClientWikiPublishResponse>("/api/wiki-repository/publish", {
    baseUrl: input.baseUrl,
    init: {
      body: JSON.stringify({
        conversationId: input.conversationId,
        nodeId: input.nodeId,
        ...(input.reason ? { reason: input.reason } : {}),
        retryFailedPublication: input.retryFailedPublication ?? false
      }),
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    }
  });
}

export function fetchSourceChangeDiff(input: {
  baseUrl: string;
  candidateId: string;
  conversationId: string;
  nodeId: string;
}): Promise<UserClientSourceChangeDiffResponse> {
  const params = new URLSearchParams({
    candidateId: input.candidateId,
    conversationId: input.conversationId,
    nodeId: input.nodeId
  });

  return fetchJson<UserClientSourceChangeDiffResponse>(
    `/api/source-change-candidates/diff?${params.toString()}`,
    {
      baseUrl: input.baseUrl
    }
  );
}

export function fetchSourceChangeFilePreview(input: {
  baseUrl: string;
  candidateId: string;
  conversationId: string;
  nodeId: string;
  path: string;
}): Promise<UserClientSourceChangeFilePreviewResponse> {
  const params = new URLSearchParams({
    candidateId: input.candidateId,
    conversationId: input.conversationId,
    nodeId: input.nodeId,
    path: input.path
  });

  return fetchJson<UserClientSourceChangeFilePreviewResponse>(
    `/api/source-change-candidates/file?${params.toString()}`,
    {
      baseUrl: input.baseUrl
    }
  );
}

export function reviewSourceChangeCandidate(input: {
  baseUrl: string;
  candidateId: string;
  conversationId: string;
  nodeId: string;
  parentMessageId: string;
  reason?: string | undefined;
  sessionId: string;
  status: "accepted" | "rejected";
  turnId?: string | undefined;
}): Promise<UserNodeMessagePublishResponse> {
  return fetchJson<UserNodeMessagePublishResponse>(
    "/api/source-change-candidates/review",
    {
      baseUrl: input.baseUrl,
      init: {
        body: JSON.stringify({
          candidateId: input.candidateId,
          conversationId: input.conversationId,
          nodeId: input.nodeId,
          parentMessageId: input.parentMessageId,
          ...(input.reason ? { reason: input.reason } : {}),
          sessionId: input.sessionId,
          status: input.status,
          ...(input.turnId ? { turnId: input.turnId } : {})
        }),
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      }
    }
  );
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

export function formatSignerLabel(
  message: UserNodeMessageRecord
): string | undefined {
  if (!message.signerPubkey) {
    return undefined;
  }

  if (message.signerPubkey !== message.fromPubkey) {
    return "signer mismatch";
  }

  return `signed ${message.signerPubkey.slice(0, 8)}`;
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
