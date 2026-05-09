import type {
  ArtifactRef,
  GitRepositoryTargetSelector,
  RuntimeArtifactDiffResponse,
  RuntimeArtifactHistoryResponse,
  RuntimeArtifactRestoreResponse,
  RuntimeArtifactSourceChangeProposalResponse,
  RuntimeCommandReceiptProjectionRecord,
  RuntimeProjectionRecord,
  RuntimeSourceChangeCandidateFilePreviewResponse,
  RuntimeSourceChangeCandidateInspectionResponse,
  RuntimeSourceHistoryPublishResponse,
  RuntimeSourceHistoryReconcileResponse,
  RuntimeWikiPublishResponse,
  RuntimeWikiPatchSetResponse,
  RuntimeWikiUpsertPageResponse,
  SourceChangeRefProjectionRecord,
  SourceChangeSummary,
  SourceHistoryPublicationTarget,
  SourceHistoryRefProjectionRecord,
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
    assignmentId?: string;
    backendKind?: RuntimeProjectionRecord["backendKind"];
    clientUrl?: string;
    desiredState?: RuntimeProjectionRecord["desiredState"];
    hostApiBaseUrl?: string;
    hostApiConfigured: boolean;
    identityPublicKey: string;
    lastSeenAt?: string;
    observedState?: RuntimeProjectionRecord["observedState"];
    primaryRelayProfileRef?: string;
    projectionUpdatedAt?: string;
    relayUrls: string[];
    restartGeneration?: RuntimeProjectionRecord["restartGeneration"];
    runnerId?: string;
    statusMessage?: string;
  };
  sourceChangeRefs: SourceChangeRefProjectionRecord[];
  sourceHistoryRefs: SourceHistoryRefProjectionRecord[];
  runtimeCommandReceipts: RuntimeCommandReceiptProjectionRecord[];
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

export type UserClientWikiPageUpsertResponse = RuntimeWikiUpsertPageResponse & {
  source: "runtime";
  userNodeId: string;
  wikiRefs: WikiRefProjectionRecord[];
};

export type UserClientWikiPatchSetResponse = RuntimeWikiPatchSetResponse & {
  source: "runtime";
  userNodeId: string;
  wikiRefs: WikiRefProjectionRecord[];
};

export type UserClientSourceHistoryPublishResponse =
  RuntimeSourceHistoryPublishResponse & {
    source: "runtime";
    sourceHistoryRefs: SourceHistoryRefProjectionRecord[];
    userNodeId: string;
  };

export type UserClientSourceHistoryReconcileResponse =
  RuntimeSourceHistoryReconcileResponse & {
    source: "runtime";
    sourceHistoryRefs: SourceHistoryRefProjectionRecord[];
    userNodeId: string;
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

export async function computeUtf8Sha256Hex(content: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(content)
  );

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeWikiContentForPreview(content: string): string {
  const normalized = content.replace(/\r\n/g, "\n").trimEnd();

  return normalized.length > 0 ? `${normalized}\n` : "";
}

function splitPreviewLines(content: string): string[] {
  const normalized = normalizeWikiContentForPreview(content);

  return normalized.length > 0 ? normalized.slice(0, -1).split("\n") : [];
}

export function buildWikiPageNextContentPreview(input: {
  baseContent: string;
  content: string;
  mode: "append" | "patch" | "replace";
}): string {
  if (input.mode === "append") {
    const parts = [
      input.baseContent.trimEnd(),
      input.content.trimEnd()
    ].filter((part) => part.length > 0);

    return parts.length > 0 ? `${parts.join("\n\n")}\n` : "";
  }

  if (input.mode === "patch") {
    return input.content;
  }

  return normalizeWikiContentForPreview(input.content);
}

export function buildWikiPageChangePreview(input: {
  currentContent: string;
  nextContent: string;
}): string {
  const currentLines = splitPreviewLines(input.currentContent);
  const nextLines = splitPreviewLines(input.nextContent);

  if (
    currentLines.length === nextLines.length &&
    currentLines.every((line, index) => line === nextLines[index])
  ) {
    return "No changes.\n";
  }

  const lengths = Array.from({ length: currentLines.length + 1 }, () =>
    Array(nextLines.length + 1).fill(0) as number[]
  );

  for (let currentIndex = currentLines.length - 1; currentIndex >= 0; currentIndex -= 1) {
    for (let nextIndex = nextLines.length - 1; nextIndex >= 0; nextIndex -= 1) {
      lengths[currentIndex]![nextIndex] =
        currentLines[currentIndex] === nextLines[nextIndex]
          ? lengths[currentIndex + 1]![nextIndex + 1]! + 1
          : Math.max(
              lengths[currentIndex + 1]![nextIndex]!,
              lengths[currentIndex]![nextIndex + 1]!
            );
    }
  }

  const output = ["--- current", "+++ draft"];
  let currentIndex = 0;
  let nextIndex = 0;

  while (currentIndex < currentLines.length || nextIndex < nextLines.length) {
    if (
      currentIndex < currentLines.length &&
      nextIndex < nextLines.length &&
      currentLines[currentIndex] === nextLines[nextIndex]
    ) {
      output.push(` ${currentLines[currentIndex]}`);
      currentIndex += 1;
      nextIndex += 1;
      continue;
    }

    if (
      nextIndex < nextLines.length &&
      (currentIndex >= currentLines.length ||
        lengths[currentIndex]![nextIndex + 1]! >
          lengths[currentIndex + 1]![nextIndex]!)
    ) {
      output.push(`+${nextLines[nextIndex]}`);
      nextIndex += 1;
      continue;
    }

    if (currentIndex < currentLines.length) {
      output.push(`-${currentLines[currentIndex]}`);
      currentIndex += 1;
    }
  }

  return `${output.join("\n")}\n`;
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
        targetNodeId: input.message.fromNodeId,
        turnId: input.message.turnId
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
  target?: GitRepositoryTargetSelector | undefined;
}): Promise<UserClientWikiPublishResponse> {
  return fetchJson<UserClientWikiPublishResponse>("/api/wiki-repository/publish", {
    baseUrl: input.baseUrl,
    init: {
      body: JSON.stringify({
        conversationId: input.conversationId,
        nodeId: input.nodeId,
        ...(input.reason ? { reason: input.reason } : {}),
        retryFailedPublication: input.retryFailedPublication ?? false,
        ...(input.target ? { target: input.target } : {})
      }),
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    }
  });
}

export function upsertWikiPage(input: {
  baseUrl: string;
  content: string;
  conversationId: string;
  expectedCurrentSha256?: string | undefined;
  mode?: "append" | "patch" | "replace" | undefined;
  nodeId: string;
  path: string;
  reason?: string | undefined;
}): Promise<UserClientWikiPageUpsertResponse> {
  return fetchJson<UserClientWikiPageUpsertResponse>("/api/wiki/pages", {
    baseUrl: input.baseUrl,
    init: {
      body: JSON.stringify({
        content: input.content,
        conversationId: input.conversationId,
        ...(input.expectedCurrentSha256
          ? { expectedCurrentSha256: input.expectedCurrentSha256 }
          : {}),
        mode: input.mode ?? "replace",
        nodeId: input.nodeId,
        path: input.path,
        ...(input.reason ? { reason: input.reason } : {})
      }),
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    }
  });
}

export function patchWikiPages(input: {
  baseUrl: string;
  conversationId: string;
  nodeId: string;
  pages: Array<{
    content: string;
    expectedCurrentSha256?: string | undefined;
    mode?: "append" | "patch" | "replace" | undefined;
    path: string;
  }>;
  reason?: string | undefined;
}): Promise<UserClientWikiPatchSetResponse> {
  return fetchJson<UserClientWikiPatchSetResponse>("/api/wiki/pages/patch-set", {
    baseUrl: input.baseUrl,
    init: {
      body: JSON.stringify({
        conversationId: input.conversationId,
        nodeId: input.nodeId,
        pages: input.pages.map((page) => ({
          content: page.content,
          ...(page.expectedCurrentSha256
            ? { expectedCurrentSha256: page.expectedCurrentSha256 }
            : {}),
          mode: page.mode ?? "replace",
          path: page.path
        })),
        ...(input.reason ? { reason: input.reason } : {})
      }),
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    }
  });
}

export function publishSourceHistory(input: {
  baseUrl: string;
  conversationId: string;
  nodeId: string;
  reason?: string | undefined;
  retryFailedPublication?: boolean | undefined;
  sourceHistoryId: string;
  target?: SourceHistoryPublicationTarget | undefined;
}): Promise<UserClientSourceHistoryPublishResponse> {
  return fetchJson<UserClientSourceHistoryPublishResponse>(
    "/api/source-history/publish",
    {
      baseUrl: input.baseUrl,
      init: {
        body: JSON.stringify({
          conversationId: input.conversationId,
          nodeId: input.nodeId,
          ...(input.reason ? { reason: input.reason } : {}),
          retryFailedPublication: input.retryFailedPublication ?? false,
          sourceHistoryId: input.sourceHistoryId,
          ...(input.target ? { target: input.target } : {})
        }),
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      }
    }
  );
}

export function reconcileSourceHistory(input: {
  approvalId?: string | undefined;
  baseUrl: string;
  conversationId: string;
  nodeId: string;
  reason?: string | undefined;
  replayId?: string | undefined;
  sourceHistoryId: string;
}): Promise<UserClientSourceHistoryReconcileResponse> {
  return fetchJson<UserClientSourceHistoryReconcileResponse>(
    "/api/source-history/reconcile",
    {
      baseUrl: input.baseUrl,
      init: {
        body: JSON.stringify({
          ...(input.approvalId ? { approvalId: input.approvalId } : {}),
          conversationId: input.conversationId,
          nodeId: input.nodeId,
          ...(input.reason ? { reason: input.reason } : {}),
          ...(input.replayId ? { replayId: input.replayId } : {}),
          sourceHistoryId: input.sourceHistoryId
        }),
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      }
    }
  );
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

export type UserClientWorkloadSummary = {
  commandReceipts: {
    completed: number;
    failed: number;
    received: number;
  };
  conversationCount: number;
  openConversationCount: number;
  pendingApprovalCount: number;
  pendingSourceChangeCount: number;
  sourceHistoryRefCount: number;
  targetCount: number;
  unreadCount: number;
  wikiRefCount: number;
};

export type UserClientReviewQueueItem =
  | {
      approvalId: string;
      conversationId: string;
      id: string;
      kind: "approval";
      peerNodeId: string;
      status: UserConversationProjectionRecord["status"];
      unreadCount: number;
      updatedAt: string;
    }
  | {
      additions?: number | undefined;
      candidateId: string;
      conversationId?: string | undefined;
      deletions?: number | undefined;
      fileCount?: number | undefined;
      id: string;
      kind: "source_change";
      nodeId: string;
      peerNodeId?: string | undefined;
      status: SourceChangeRefProjectionRecord["status"];
      updatedAt: string;
    };

const openConversationStatuses = new Set([
  "acknowledged",
  "awaiting_approval",
  "blocked",
  "opened",
  "working"
]);

export function summarizeUserClientWorkload(
  state: UserClientState
): UserClientWorkloadSummary {
  const pendingApprovalIds = new Set(
    state.conversations.flatMap((conversation) => conversation.pendingApprovalIds)
  );
  const commandReceipts = state.runtimeCommandReceipts.reduce<
    UserClientWorkloadSummary["commandReceipts"]
  >(
    (counts, receipt) => ({
      ...counts,
      [receipt.receiptStatus]: counts[receipt.receiptStatus] + 1
    }),
    {
      completed: 0,
      failed: 0,
      received: 0
    }
  );

  return {
    commandReceipts,
    conversationCount: state.conversations.length,
    openConversationCount: state.conversations.filter((conversation) =>
      openConversationStatuses.has(conversation.status)
    ).length,
    pendingApprovalCount: pendingApprovalIds.size,
    pendingSourceChangeCount: state.sourceChangeRefs.filter(
      (ref) => ref.status === "pending_review"
    ).length,
    sourceHistoryRefCount: state.sourceHistoryRefs.length,
    targetCount: state.targets.length,
    unreadCount: state.conversations.reduce(
      (total, conversation) => total + conversation.unreadCount,
      0
    ),
    wikiRefCount: state.wikiRefs.length
  };
}

export function formatUserClientWorkloadLines(
  summary: UserClientWorkloadSummary
): string[] {
  return [
    `${summary.conversationCount} conversations, ${summary.openConversationCount} open`,
    `${summary.unreadCount} unread messages`,
    `${summary.pendingApprovalCount} pending approvals`,
    `${summary.pendingSourceChangeCount} source changes awaiting review`,
    `${summary.commandReceipts.received} received, ${summary.commandReceipts.completed} completed, ${summary.commandReceipts.failed} failed commands`,
    `${summary.sourceHistoryRefCount} source histories, ${summary.wikiRefCount} wiki refs`,
    `${summary.targetCount} reachable targets`
  ];
}

function conversationUpdatedAt(
  conversation: UserConversationProjectionRecord
): string {
  return conversation.lastMessageAt ?? conversation.projection.updatedAt;
}

function sortConversationsByRecency(
  conversations: UserConversationProjectionRecord[]
): UserConversationProjectionRecord[] {
  return [...conversations].sort((left, right) => {
    const updatedOrder = conversationUpdatedAt(right).localeCompare(
      conversationUpdatedAt(left)
    );

    if (updatedOrder !== 0) {
      return updatedOrder;
    }

    return left.conversationId.localeCompare(right.conversationId);
  });
}

function sortSourceChangeReviewItems(
  items: Extract<UserClientReviewQueueItem, { kind: "source_change" }>[]
): Extract<UserClientReviewQueueItem, { kind: "source_change" }>[] {
  return items.sort((left, right) => {
    const updatedOrder = right.updatedAt.localeCompare(left.updatedAt);

    if (updatedOrder !== 0) {
      return updatedOrder;
    }

    return left.candidateId.localeCompare(right.candidateId);
  });
}

function inferSourceChangeConversation(input: {
  conversationId?: string | undefined;
  conversations: UserConversationProjectionRecord[];
  nodeId: string;
}): UserConversationProjectionRecord | undefined {
  if (input.conversationId) {
    return input.conversations.find(
      (conversation) => conversation.conversationId === input.conversationId
    );
  }

  const peerMatches = input.conversations.filter(
    (conversation) => conversation.peerNodeId === input.nodeId
  );

  return peerMatches.length === 1 ? peerMatches[0] : undefined;
}

export function buildUserClientReviewQueue(
  state: UserClientState
): UserClientReviewQueueItem[] {
  const seenApprovalIds = new Set<string>();
  const approvalItems: UserClientReviewQueueItem[] = [];

  for (const conversation of sortConversationsByRecency(state.conversations)) {
    for (const approvalId of conversation.pendingApprovalIds) {
      if (seenApprovalIds.has(approvalId)) {
        continue;
      }

      seenApprovalIds.add(approvalId);
      approvalItems.push({
        approvalId,
        conversationId: conversation.conversationId,
        id: `approval:${approvalId}`,
        kind: "approval",
        peerNodeId: conversation.peerNodeId,
        status: conversation.status,
        unreadCount: conversation.unreadCount,
        updatedAt: conversationUpdatedAt(conversation)
      });
    }
  }

  const sourceChangeItems = sortSourceChangeReviewItems(
    state.sourceChangeRefs
      .filter((ref) => ref.status === "pending_review")
      .map((ref) => {
        const summary = ref.sourceChangeSummary ?? ref.candidate?.sourceChangeSummary;
        const conversation = inferSourceChangeConversation({
          conversationId: ref.candidate?.conversationId,
          conversations: state.conversations,
          nodeId: ref.nodeId
        });

        return {
          ...(summary
            ? {
                additions: summary.additions,
                deletions: summary.deletions,
                fileCount: summary.fileCount
              }
            : {}),
          candidateId: ref.candidateId,
          ...(conversation?.conversationId
            ? { conversationId: conversation.conversationId }
            : {}),
          id: `source_change:${ref.candidateId}`,
          kind: "source_change" as const,
          nodeId: ref.nodeId,
          ...(conversation?.peerNodeId
            ? { peerNodeId: conversation.peerNodeId }
            : {}),
          status: ref.status,
          updatedAt: ref.candidate?.updatedAt ?? ref.projection.updatedAt
        };
      })
  );

  return [...approvalItems, ...sourceChangeItems];
}

function formatFileCount(fileCount: number): string {
  return `${fileCount} ${fileCount === 1 ? "file" : "files"}`;
}

export function formatUserClientReviewQueueItem(
  item: UserClientReviewQueueItem
): string {
  if (item.kind === "approval") {
    return [
      `approval ${item.approvalId}`,
      item.peerNodeId,
      `${item.unreadCount} unread`,
      item.status,
      item.conversationId
    ].join(" · ");
  }

  return [
    `source change ${item.candidateId}`,
    item.nodeId,
    item.fileCount !== undefined &&
    item.additions !== undefined &&
    item.deletions !== undefined
      ? `${formatFileCount(item.fileCount)} +${item.additions} -${item.deletions}`
      : item.status,
    item.conversationId ?? "no conversation"
  ].join(" · ");
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

function shortHash(value: string): string {
  return value.slice(0, 12);
}

export function formatRuntimeCommandReceiptDetailLines(
  receipt: RuntimeCommandReceiptProjectionRecord
): string[] {
  return [
    `node ${receipt.nodeId}`,
    `runner ${receipt.runnerId}`,
    receipt.assignmentId ? `assignment ${receipt.assignmentId}` : undefined,
    `observed ${receipt.observedAt}`,
    receipt.receiptMessage,
    receipt.artifactId ? `artifact ${receipt.artifactId}` : undefined,
    receipt.sourceHistoryId
      ? `source history ${receipt.sourceHistoryId}`
      : undefined,
    receipt.candidateId ? `candidate ${receipt.candidateId}` : undefined,
    receipt.proposalId ? `proposal ${receipt.proposalId}` : undefined,
    receipt.restoreId ? `restore ${receipt.restoreId}` : undefined,
    receipt.replayId ? `replay ${receipt.replayId}` : undefined,
    receipt.targetPath ? `target ${receipt.targetPath}` : undefined,
    receipt.wikiArtifactId ? `wiki artifact ${receipt.wikiArtifactId}` : undefined,
    receipt.wikiPageCount ? `wiki pages ${receipt.wikiPageCount}` : undefined,
    receipt.wikiPagePath ? `wiki page ${receipt.wikiPagePath}` : undefined,
    receipt.wikiPageExpectedSha256
      ? `wiki expected ${shortHash(receipt.wikiPageExpectedSha256)}`
      : undefined,
    receipt.wikiPagePreviousSha256
      ? `wiki previous ${shortHash(receipt.wikiPagePreviousSha256)}`
      : undefined,
    receipt.wikiPageNextSha256
      ? `wiki next ${shortHash(receipt.wikiPageNextSha256)}`
      : undefined,
    receipt.sessionId ? `session ${receipt.sessionId}` : undefined
  ].filter((line): line is string => Boolean(line));
}

export type WikiPageConflictSummary = {
  commandId: string;
  currentSha256: string;
  currentShort: string;
  expectedSha256: string;
  expectedShort: string;
  path: string;
};

export function buildWikiPageConflictSummary(
  receipt: RuntimeCommandReceiptProjectionRecord
): WikiPageConflictSummary | undefined {
  const isWikiPageMutation =
    receipt.commandEventType === "runtime.wiki.upsert_page" ||
    receipt.commandEventType === "runtime.wiki.patch_set";

  if (
    !isWikiPageMutation ||
    receipt.receiptStatus !== "failed" ||
    !receipt.wikiPageExpectedSha256 ||
    !receipt.wikiPagePreviousSha256 ||
    receipt.wikiPageExpectedSha256 === receipt.wikiPagePreviousSha256
  ) {
    return undefined;
  }

  return {
    commandId: receipt.commandId,
    currentSha256: receipt.wikiPagePreviousSha256,
    currentShort: shortHash(receipt.wikiPagePreviousSha256),
    expectedSha256: receipt.wikiPageExpectedSha256,
    expectedShort: shortHash(receipt.wikiPageExpectedSha256),
    path: receipt.wikiPagePath ?? receipt.targetPath ?? "unknown"
  };
}

export function formatWikiPageConflictSummaryLines(
  summary: WikiPageConflictSummary
): string[] {
  return [
    `page ${summary.path}`,
    `expected ${summary.expectedShort}`,
    `current ${summary.currentShort}`,
    `command ${summary.commandId}`
  ];
}

function normalizeWikiPathForComparison(value: string | undefined): string {
  return value?.trim().replace(/^\/+/u, "") ?? "";
}

export function findLatestWikiPageConflictSummary(input: {
  path?: string | undefined;
  receipts: RuntimeCommandReceiptProjectionRecord[];
}): WikiPageConflictSummary | undefined {
  const requestedPath = normalizeWikiPathForComparison(input.path);

  return input.receipts
    .map(buildWikiPageConflictSummary)
    .find((summary): summary is WikiPageConflictSummary => {
      if (!summary) {
        return false;
      }

      if (!requestedPath) {
        return true;
      }

      return normalizeWikiPathForComparison(summary.path) === requestedPath;
    });
}

export type WikiPageDraftFromProjection = {
  artifactId: string;
  content: string;
  path: string;
};

export function buildWikiPageDraftFromProjection(
  ref: WikiRefProjectionRecord
): WikiPageDraftFromProjection | undefined {
  const preview = ref.artifactPreview;
  if (!preview?.available || preview.truncated) {
    return undefined;
  }

  const path = ref.artifactRef.locator.path.trim().replace(/^\/+/u, "");
  if (!path) {
    return undefined;
  }

  return {
    artifactId: ref.artifactId,
    content: preview.content,
    path
  };
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
