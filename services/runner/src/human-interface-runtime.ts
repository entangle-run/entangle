import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import path from "node:path";
import type {
  ArtifactRef,
  ArtifactRefProjectionRecord,
  EntangleA2AMessage,
  EffectiveRuntimeContext,
  GitRepositoryTargetSelector,
  HostProjectionSnapshot,
  RunnerJoinHostApi,
  RuntimeArtifactDiffResponse,
  RuntimeArtifactHistoryResponse,
  RuntimeArtifactPreviewResponse,
  RuntimeArtifactRestoreResponse,
  RuntimeArtifactSourceChangeProposalResponse,
  RuntimeSourceChangeCandidateDiffResponse,
  RuntimeSourceChangeCandidateFilePreviewResponse,
  RuntimeSourceChangeCandidateInspectionResponse,
  RuntimeSourceHistoryPublishResponse,
  RuntimeSourceHistoryReconcileResponse,
  RuntimeWikiPublishResponse,
  RuntimeWikiUpsertPageResponse,
  SourceChangeRefProjectionRecord,
  SourceHistoryPublicationTarget,
  SourceHistoryRefProjectionRecord,
  UserNodeConversationResponse,
  UserNodeConversationReadResponse,
  UserConversationProjectionRecord,
  UserNodeMessageRecord,
  UserNodeMessagePublishResponse,
  UserNodeMessagePublishType,
  WikiRefProjectionRecord
} from "@entangle/types";
import {
  hostProjectionSnapshotSchema,
  runtimeArtifactDiffResponseSchema,
  runtimeArtifactHistoryResponseSchema,
  runtimeArtifactPreviewResponseSchema,
  runtimeArtifactRestoreResponseSchema,
  runtimeArtifactSourceChangeProposalResponseSchema,
  runtimeSourceChangeCandidateDiffResponseSchema,
  runtimeSourceChangeCandidateFilePreviewResponseSchema,
  runtimeSourceHistoryPublishResponseSchema,
  runtimeSourceHistoryReconcileResponseSchema,
  runtimeWikiPublishResponseSchema,
  runtimeWikiUpsertPageResponseSchema,
  sourceHistoryPublicationTargetSchema,
  userNodeConversationResponseSchema,
  userNodeConversationReadResponseSchema,
  gitRepositoryTargetSelectorSchema,
  userNodeInboxResponseSchema,
  userNodeMessagePublishRequestSchema,
  userNodeMessagePublishResponseSchema
} from "@entangle/types";
import { getPublicKey } from "nostr-tools";
import { readRunnerSecretKey } from "./join-config.js";
import { NostrRunnerTransport } from "./nostr-transport.js";
import type {
  RunnerInboundEnvelope,
  RunnerTransport,
  RunnerTransportSubscription
} from "./transport.js";

export type HumanInterfaceRuntimeHandle = {
  clientUrl: string;
  runtimeRoot: string;
  stop(): Promise<void>;
};

type UserClientTarget = {
  channel: string;
  nodeId: string;
  relation: string;
};

type HumanInterfaceBasicAuth = {
  password: string;
  username: string;
};

type UserClientState = {
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
  sourceHistoryRefs: SourceHistoryRefProjectionRecord[];
  targets: UserClientTarget[];
  userNodeId: string;
  wikiRefs: WikiRefProjectionRecord[];
};

type UserClientArtifactPreviewResponse = {
  artifact?: ArtifactRef | undefined;
  artifactId: string;
  nodeId: string;
  preview:
    | NonNullable<ArtifactRefProjectionRecord["artifactPreview"]>
    | RuntimeArtifactPreviewResponse["preview"];
  source: "projection" | "runtime" | "unavailable";
};

type UserClientArtifactHistoryResponse = {
  artifact?: ArtifactRef | undefined;
  artifactId: string;
  history: RuntimeArtifactHistoryResponse["history"];
  nodeId: string;
  source: "runtime" | "unavailable";
};

type UserClientArtifactDiffResponse = {
  artifact?: ArtifactRef | undefined;
  artifactId: string;
  diff: RuntimeArtifactDiffResponse["diff"];
  nodeId: string;
  source: "runtime" | "unavailable";
};

type UserClientArtifactSourceProposalRequest = {
  artifactId?: unknown;
  conversationId?: unknown;
  nodeId?: unknown;
  overwrite?: unknown;
  proposalId?: unknown;
  reason?: unknown;
  targetPath?: unknown;
};

type UserClientArtifactRestoreRequest = {
  artifactId?: unknown;
  conversationId?: unknown;
  nodeId?: unknown;
  reason?: unknown;
  restoreId?: unknown;
};

type UserClientArtifactRestoreResponse = RuntimeArtifactRestoreResponse & {
  artifact?: ArtifactRef | undefined;
  source: "runtime";
  userNodeId: string;
};

type UserClientArtifactSourceProposalResponse =
  RuntimeArtifactSourceChangeProposalResponse & {
    artifact?: ArtifactRef | undefined;
    source: "runtime";
    userNodeId: string;
  };

type UserClientWikiPublishRequest = {
  conversationId?: unknown;
  nodeId?: unknown;
  reason?: unknown;
  retryFailedPublication?: unknown;
  target?: unknown;
};

type UserClientWikiPublishResponse = RuntimeWikiPublishResponse & {
  source: "runtime";
  userNodeId: string;
  wikiRefs: WikiRefProjectionRecord[];
};

type UserClientWikiPageUpsertRequest = {
  content?: unknown;
  conversationId?: unknown;
  mode?: unknown;
  nodeId?: unknown;
  path?: unknown;
  reason?: unknown;
};

type UserClientWikiPageUpsertResponse = RuntimeWikiUpsertPageResponse & {
  source: "runtime";
  userNodeId: string;
  wikiRefs: WikiRefProjectionRecord[];
};

type UserClientSourceHistoryPublishRequest = {
  conversationId?: unknown;
  nodeId?: unknown;
  reason?: unknown;
  retryFailedPublication?: unknown;
  sourceHistoryId?: unknown;
  target?: unknown;
};

type UserClientSourceHistoryPublishResponse =
  RuntimeSourceHistoryPublishResponse & {
    source: "runtime";
    sourceHistoryRefs: SourceHistoryRefProjectionRecord[];
    userNodeId: string;
  };

type UserClientSourceHistoryReconcileRequest = {
  approvalId?: unknown;
  conversationId?: unknown;
  nodeId?: unknown;
  reason?: unknown;
  replayId?: unknown;
  sourceHistoryId?: unknown;
};

type UserClientSourceHistoryReconcileResponse =
  RuntimeSourceHistoryReconcileResponse & {
    source: "runtime";
    sourceHistoryRefs: SourceHistoryRefProjectionRecord[];
    userNodeId: string;
  };

type UserClientVisibleArtifactRef =
  | {
      artifact: ArtifactRef;
    }
  | {
      error: string;
      statusCode: number;
    };

type UserClientVisibleSourceChange =
  | {
      visible: true;
    }
  | {
      error: string;
      statusCode: number;
    };

type UserClientVisibleWikiRefs =
  | {
      wikiRefs: WikiRefProjectionRecord[];
    }
  | {
      error: string;
      statusCode: number;
    };

type UserClientVisibleWikiPage =
  | {
      path: string;
      wikiRefs: WikiRefProjectionRecord[];
    }
  | {
      error: string;
      statusCode: number;
    };

type UserClientVisibleSourceHistoryRefs =
  | {
      sourceHistoryRefs: SourceHistoryRefProjectionRecord[];
    }
  | {
      error: string;
      statusCode: number;
    };

type UserClientSourceChangeDiffResponse = {
  candidateId: string;
  diff: RuntimeSourceChangeCandidateDiffResponse["diff"];
  nodeId: string;
  review?:
    | NonNullable<
        RuntimeSourceChangeCandidateInspectionResponse["candidate"]["review"]
      >
    | undefined;
  source: "projection" | "runtime" | "unavailable";
  sourceChangeSummary?: SourceChangeRefProjectionRecord["sourceChangeSummary"];
  status?: SourceChangeRefProjectionRecord["status"] | undefined;
};

type UserClientSourceChangeFilePreviewResponse = {
  candidateId: string;
  nodeId: string;
  path: string;
  preview: RuntimeSourceChangeCandidateFilePreviewResponse["preview"];
  source: "projection" | "runtime" | "unavailable";
  sourceChangeSummary?: SourceChangeRefProjectionRecord["sourceChangeSummary"];
  status?: SourceChangeRefProjectionRecord["status"] | undefined;
};

type UserClientSourceChangeReviewRequest = {
  candidateId?: unknown;
  conversationId?: unknown;
  nodeId?: unknown;
  parentMessageId?: unknown;
  reason?: unknown;
  sessionId?: unknown;
  status?: unknown;
  turnId?: unknown;
};

type ApprovalResource = NonNullable<
  NonNullable<UserNodeMessageRecord["approval"]>["resource"]
>;

type SourceChangeCandidateReviewRecord = NonNullable<
  RuntimeSourceChangeCandidateInspectionResponse["candidate"]["review"]
>;

type UserSourceCandidateReviewStatus = "accepted" | "rejected";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeListenPort(): number {
  const rawPort = process.env.ENTANGLE_HUMAN_INTERFACE_PORT?.trim();

  if (!rawPort) {
    return 0;
  }

  const port = Number(rawPort);

  return Number.isInteger(port) && port >= 0 && port <= 65535 ? port : 0;
}

function normalizePublicClientUrl(address: AddressInfo): string {
  const configuredPublicUrl =
    process.env.ENTANGLE_HUMAN_INTERFACE_PUBLIC_URL?.trim();

  if (configuredPublicUrl) {
    return new URL(configuredPublicUrl).toString();
  }

  return `http://${address.address}:${address.port}/`;
}

function normalizeUserClientStaticDir(): string | undefined {
  const configuredStaticDir = process.env.ENTANGLE_USER_CLIENT_STATIC_DIR?.trim();

  return configuredStaticDir ? path.resolve(configuredStaticDir) : undefined;
}

function normalizeHumanInterfaceBasicAuth():
  | HumanInterfaceBasicAuth
  | undefined {
  const configured = process.env.ENTANGLE_HUMAN_INTERFACE_BASIC_AUTH?.trim();

  if (!configured) {
    return undefined;
  }

  const separatorIndex = configured.indexOf(":");

  if (separatorIndex <= 0 || separatorIndex === configured.length - 1) {
    throw new Error(
      "ENTANGLE_HUMAN_INTERFACE_BASIC_AUTH must use username:password with non-empty values."
    );
  }

  const username = configured.slice(0, separatorIndex);
  const password = configured.slice(separatorIndex + 1);

  return { password, username };
}

function constantTimeStringEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function isHumanInterfaceBasicAuthAuthorized(input: {
  authorization: string | undefined;
  basicAuth: HumanInterfaceBasicAuth;
}): boolean {
  const prefix = "Basic ";

  if (!input.authorization?.startsWith(prefix)) {
    return false;
  }

  const decoded = Buffer.from(
    input.authorization.slice(prefix.length),
    "base64"
  ).toString("utf8");
  const separatorIndex = decoded.indexOf(":");

  if (separatorIndex < 0) {
    return false;
  }

  const username = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);

  return (
    constantTimeStringEquals(username, input.basicAuth.username) &&
    constantTimeStringEquals(password, input.basicAuth.password)
  );
}

function writeHumanInterfaceUnauthorized(response: ServerResponse): void {
  response.statusCode = 401;
  response.setHeader("www-authenticate", 'Basic realm="entangle-user-client"');
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(
    JSON.stringify({
      error: "unauthorized"
    })
  );
}

function isUserClientStaticRequest(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/index.html" ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/assets/")
  );
}

function resolveUserClientStaticPath(input: {
  pathname: string;
  staticRoot: string;
}): string | undefined {
  const decodedPathname = decodeURIComponent(input.pathname);
  const relativePath =
    decodedPathname === "/"
      ? "index.html"
      : decodedPathname.replace(/^\/+/u, "");
  const filePath = path.resolve(input.staticRoot, relativePath);
  const rootWithSeparator = `${input.staticRoot}${path.sep}`;

  return filePath === input.staticRoot || filePath.startsWith(rootWithSeparator)
    ? filePath
    : undefined;
}

function contentTypeForStaticPath(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

function buildHostApiHeaders(input: RunnerJoinHostApi | undefined): Record<string, string> {
  const headers: Record<string, string> = {
    accept: "application/json"
  };

  if (input?.auth?.mode === "bearer_env") {
    const token = process.env[input.auth.envVar]?.trim();

    if (token) {
      headers.authorization = `Bearer ${token}`;
    }
  }

  return headers;
}

async function resolveHumanInterfaceSecretKey(
  context: EffectiveRuntimeContext
): Promise<Uint8Array | undefined> {
  let secretKey: Uint8Array;

  try {
    secretKey = await readRunnerSecretKey(context.identityContext.secretDelivery);
  } catch {
    return undefined;
  }

  const publicKey = getPublicKey(secretKey);

  if (publicKey !== context.identityContext.publicKey) {
    throw new Error(
      `Human Interface Runtime identity mismatch: context expects '${context.identityContext.publicKey}' but derived '${publicKey}'.`
    );
  }

  return secretKey;
}

async function createHumanInterfaceTransport(
  context: EffectiveRuntimeContext
): Promise<RunnerTransport | undefined> {
  const secretKey = await resolveHumanInterfaceSecretKey(context);

  return secretKey
    ? new NostrRunnerTransport({
        context,
        secretKey
      })
    : undefined;
}

function listTargetNodes(context: EffectiveRuntimeContext): UserClientTarget[] {
  const targets = new Map<string, UserClientTarget>();

  for (const route of context.relayContext.edgeRoutes) {
    if (!targets.has(route.peerNodeId)) {
      targets.set(route.peerNodeId, {
        channel: route.channel,
        nodeId: route.peerNodeId,
        relation: route.relation
      });
    }
  }

  return [...targets.values()].sort((left, right) =>
    left.nodeId.localeCompare(right.nodeId)
  );
}

async function readRequestBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of request as AsyncIterable<Uint8Array | string>) {
    chunks.push(
      typeof chunk === "string" ? Buffer.from(chunk, "utf8") : Buffer.from(chunk)
    );
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function readRequestJson(request: IncomingMessage): Promise<unknown> {
  const body = await readRequestBody(request);

  if (!body.trim()) {
    return {};
  }

  return JSON.parse(body) as unknown;
}

function writeHtml(response: ServerResponse, statusCode: number, body: string): void {
  response.writeHead(statusCode, {
    "content-type": "text/html; charset=utf-8"
  });
  response.end(body);
}

function writeJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8"
  });
  response.end(`${JSON.stringify(body, null, 2)}\n`);
}

async function tryWriteStaticUserClient(input: {
  pathname: string;
  response: ServerResponse;
  staticRoot: string;
}): Promise<boolean> {
  const filePath = resolveUserClientStaticPath({
    pathname: input.pathname,
    staticRoot: input.staticRoot
  });

  if (!filePath) {
    return false;
  }

  try {
    const fileStat = await stat(filePath);

    if (!fileStat.isFile()) {
      return false;
    }

    input.response.writeHead(200, {
      "content-type": contentTypeForStaticPath(filePath)
    });
    input.response.end(await readFile(filePath));
    return true;
  } catch {
    return false;
  }
}

function listRelayUrls(context: EffectiveRuntimeContext): string[] {
  const relayUrls = new Set<string>();

  for (const relayProfile of context.relayContext.relayProfiles) {
    for (const relayUrl of relayProfile.readUrls) {
      relayUrls.add(relayUrl);
    }

    for (const relayUrl of relayProfile.writeUrls) {
      relayUrls.add(relayUrl);
    }
  }

  return [...relayUrls].sort((left, right) => left.localeCompare(right));
}

function buildUserClientStateFingerprint(state: UserClientState): string {
  return JSON.stringify({
    conversations: state.conversations.map((conversation) => ({
      conversationId: conversation.conversationId,
      lastMessageAt: conversation.lastMessageAt,
      pendingApprovalIds: conversation.pendingApprovalIds,
      status: conversation.status,
      unreadCount: conversation.unreadCount,
      updatedAt: conversation.projection.updatedAt
    })),
    generatedAt: state.generatedAt,
    sourceChangeRefs: state.sourceChangeRefs.map((ref) => [
      ref.nodeId,
      ref.candidateId,
      ref.status,
      ref.projection.updatedAt
    ]),
    sourceHistoryRefs: state.sourceHistoryRefs.map((ref) => [
      ref.nodeId,
      ref.sourceHistoryId,
      ref.projection.updatedAt
    ]),
    wikiRefs: state.wikiRefs.map((ref) => [
      ref.nodeId,
      ref.artifactId,
      ref.projection.updatedAt
    ])
  });
}

function toSafeScriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</gu, "\\u003c");
}

async function fetchUserNodeInbox(input: {
  hostApi?: RunnerJoinHostApi | undefined;
  userNodeId: string;
}): Promise<{
  conversations: UserConversationProjectionRecord[];
  error?: string;
  generatedAt?: string;
}> {
  if (!input.hostApi) {
    return {
      conversations: [],
      error: "Host API is not configured for this Human Interface Runtime."
    };
  }

  try {
    const response = await fetch(
      new URL(
        `/v1/user-nodes/${encodeURIComponent(input.userNodeId)}/inbox`,
        input.hostApi.baseUrl
      ),
      {
        headers: buildHostApiHeaders(input.hostApi)
      }
    );

    if (!response.ok) {
      return {
        conversations: [],
        error: `Host inbox request failed with HTTP ${response.status}.`
      };
    }

    const inbox = userNodeInboxResponseSchema.parse(await response.json());

    return {
      conversations: inbox.conversations,
      generatedAt: inbox.generatedAt
    };
  } catch (error) {
    return {
      conversations: [],
      error: error instanceof Error ? error.message : "Host inbox request failed."
    };
  }
}

async function buildUserClientState(input: {
  context: EffectiveRuntimeContext;
  hostApi?: RunnerJoinHostApi | undefined;
}): Promise<UserClientState> {
  const userNodeId = input.context.binding.node.nodeId;
  const inbox = await fetchUserNodeInbox({
    hostApi: input.hostApi,
    userNodeId
  });
  const projection = await fetchHostProjection({
    hostApi: input.hostApi
  });

  return {
    conversations: inbox.conversations,
    ...(inbox.error ?? projection.error
      ? { error: [inbox.error, projection.error].filter(Boolean).join(" ") }
      : {}),
    ...(inbox.generatedAt ? { generatedAt: inbox.generatedAt } : {}),
    graphId: input.context.binding.graphId,
    graphRevisionId: input.context.binding.graphRevisionId,
    runtime: {
      ...(input.hostApi?.baseUrl
        ? { hostApiBaseUrl: input.hostApi.baseUrl }
        : {}),
      hostApiConfigured: input.hostApi !== undefined,
      identityPublicKey: input.context.identityContext.publicKey,
      ...(input.context.relayContext.primaryRelayProfileRef
        ? {
            primaryRelayProfileRef:
              input.context.relayContext.primaryRelayProfileRef
          }
        : {}),
      relayUrls: listRelayUrls(input.context)
    },
    sourceChangeRefs: projection.detail?.sourceChangeRefs ?? [],
    sourceHistoryRefs: projection.detail?.sourceHistoryRefs ?? [],
    targets: listTargetNodes(input.context),
    userNodeId,
    wikiRefs: projection.detail?.wikiRefs ?? []
  };
}

async function fetchUserNodeConversation(input: {
  conversationId: string;
  hostApi?: RunnerJoinHostApi | undefined;
  userNodeId: string;
}): Promise<{
  detail?: UserNodeConversationResponse;
  error?: string;
}> {
  if (!input.hostApi) {
    return {
      error: "Host API is not configured for conversation history."
    };
  }

  try {
    const response = await fetch(
      new URL(
        `/v1/user-nodes/${encodeURIComponent(input.userNodeId)}/inbox/${encodeURIComponent(input.conversationId)}`,
        input.hostApi.baseUrl
      ),
      {
        headers: buildHostApiHeaders(input.hostApi)
      }
    );

    if (!response.ok) {
      return {
        error: `Host conversation request failed with HTTP ${response.status}.`
      };
    }

    return {
      detail: userNodeConversationResponseSchema.parse(await response.json())
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Host conversation request failed."
    };
  }
}

async function markUserNodeConversationRead(input: {
  conversationId: string;
  hostApi?: RunnerJoinHostApi | undefined;
  userNodeId: string;
}): Promise<{
  detail?: UserNodeConversationReadResponse;
  error?: string;
}> {
  if (!input.hostApi) {
    return {
      error: "Host API is not configured for conversation read state."
    };
  }

  try {
    const response = await fetch(
      new URL(
        `/v1/user-nodes/${encodeURIComponent(input.userNodeId)}/inbox/${encodeURIComponent(input.conversationId)}/read`,
        input.hostApi.baseUrl
      ),
      {
        headers: buildHostApiHeaders(input.hostApi),
        method: "POST"
      }
    );

    if (!response.ok) {
      return {
        error: `Host conversation read request failed with HTTP ${response.status}.`
      };
    }

    return {
      detail: userNodeConversationReadResponseSchema.parse(await response.json())
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Host conversation read request failed."
    };
  }
}

async function resolveUserClientVisibleArtifactRef(input: {
  artifactId: string;
  conversationId?: string | undefined;
  hostApi?: RunnerJoinHostApi | undefined;
  nodeId: string;
  userNodeId: string;
}): Promise<UserClientVisibleArtifactRef> {
  if (!input.conversationId) {
    return {
      error: "Conversation id is required for artifact inspection.",
      statusCode: 400
    };
  }

  const conversation = await fetchUserNodeConversation({
    conversationId: input.conversationId,
    hostApi: input.hostApi,
    userNodeId: input.userNodeId
  });

  if (conversation.error || !conversation.detail) {
    return {
      error: conversation.error ?? "Conversation detail is unavailable.",
      statusCode: 502
    };
  }

  for (const message of conversation.detail.messages) {
    for (const artifact of message.artifactRefs) {
      if (
        artifact.artifactId === input.artifactId &&
        resolveArtifactPreviewNodeId({ message, ref: artifact }) === input.nodeId
      ) {
        return { artifact };
      }
    }
  }

  return {
    error: "Artifact is not visible in the selected User Node conversation.",
    statusCode: 403
  };
}

async function resolveUserClientVisibleSourceChange(input: {
  candidateId: string;
  conversationId?: string | undefined;
  hostApi?: RunnerJoinHostApi | undefined;
  nodeId: string;
  userNodeId: string;
}): Promise<UserClientVisibleSourceChange> {
  if (!input.conversationId) {
    return {
      error: "Conversation id is required for source-change inspection.",
      statusCode: 400
    };
  }

  const conversation = await fetchUserNodeConversation({
    conversationId: input.conversationId,
    hostApi: input.hostApi,
    userNodeId: input.userNodeId
  });

  if (conversation.error || !conversation.detail) {
    return {
      error: conversation.error ?? "Conversation detail is unavailable.",
      statusCode: 502
    };
  }

  const visible = conversation.detail.messages.some(
    (message) =>
      message.direction === "inbound" &&
      message.fromNodeId === input.nodeId &&
      message.approval?.resource?.kind === "source_change_candidate" &&
      message.approval.resource.id === input.candidateId
  );

  if (visible) {
    return { visible: true };
  }

  const projection = await fetchHostProjection({ hostApi: input.hostApi });
  const projectedRef = findProjectedSourceChangeRef({
    candidateId: input.candidateId,
    nodeId: input.nodeId,
    projection: projection.detail
  });
  const candidate = projectedRef?.candidate;
  const conversationSessionId = conversation.detail.conversation?.sessionId;
  const conversationPeerNodeId = conversation.detail.conversation?.peerNodeId;

  if (
    candidate &&
    (candidate.conversationId === input.conversationId ||
      (candidate.sessionId &&
        candidate.sessionId === conversationSessionId &&
        conversationPeerNodeId === input.nodeId))
  ) {
    return { visible: true };
  }

  return {
    error:
      projection.error ??
      "Source-change candidate is not visible in the selected User Node conversation.",
    statusCode: projection.error ? 502 : 403
  };
}

async function resolveUserClientVisibleWikiRefs(input: {
  conversationId?: string | undefined;
  hostApi?: RunnerJoinHostApi | undefined;
  nodeId: string;
  target?: GitRepositoryTargetSelector | undefined;
  userNodeId: string;
}): Promise<UserClientVisibleWikiRefs> {
  if (!input.conversationId) {
    return {
      error: "Conversation id is required for wiki publication.",
      statusCode: 400
    };
  }

  const conversation = await fetchUserNodeConversation({
    conversationId: input.conversationId,
    hostApi: input.hostApi,
    userNodeId: input.userNodeId
  });

  if (conversation.error || !conversation.detail) {
    return {
      error: conversation.error ?? "Conversation detail is unavailable.",
      statusCode: 502
    };
  }

  const wikiResources = conversation.detail.messages.flatMap((message) => {
    const resource = message.approval?.resource;

    return message.direction === "inbound" &&
      message.fromNodeId === input.nodeId &&
      (resource?.kind === "wiki_repository" ||
        resource?.kind === "wiki_repository_publication" ||
        resource?.kind === "wiki_page")
      ? [resource]
      : [];
  });

  if (wikiResources.length === 0) {
    return {
      error: "Wiki resource is not visible in the selected User Node conversation.",
      statusCode: 403
    };
  }

  if (input.target) {
    const target = input.target;
    const targetVisible = wikiResources.some((resource) => {
      if (resource.kind !== "wiki_repository_publication") {
        return false;
      }

      const parts = resource.id.split("|");
      if (parts.length !== 4) {
        return false;
      }

      const parsed = gitRepositoryTargetSelectorSchema.safeParse({
        gitServiceRef: parts[1],
        namespace: parts[2],
        repositoryName: parts[3]
      });

      return parsed.success
        ? gitRepositoryTargetSelectorsMatch(parsed.data, target)
        : false;
    });

    if (!targetVisible) {
      return {
        error:
          "Wiki publication target is not visible in the selected User Node conversation.",
        statusCode: 403
      };
    }
  }

  const projection = await fetchHostProjection({ hostApi: input.hostApi });

  if (projection.error || !projection.detail) {
    return {
      error: projection.error ?? "Host projection is unavailable.",
      statusCode: 502
    };
  }

  const wikiRefs = projection.detail.wikiRefs.filter(
    (ref) =>
      ref.nodeId === input.nodeId &&
      wikiResources.some((resource) =>
        wikiResourceAllowsTarget({
          ref,
          resource,
          ...(input.target ? { target: input.target } : {})
        })
      )
  );

  if (wikiRefs.length === 0) {
    return {
      error: "Wiki resource is visible but no projected wiki refs are available.",
      statusCode: 403
    };
  }

  return { wikiRefs };
}

function normalizeUserClientWikiPagePath(pagePath: string): string | undefined {
  const trimmedPath = pagePath.trim().replace(/^\/+/u, "");

  if (
    trimmedPath.length === 0 ||
    trimmedPath.includes("\\") ||
    trimmedPath.includes("\0")
  ) {
    return undefined;
  }

  const rawSegments = trimmedPath.split("/");

  if (rawSegments.includes("..")) {
    return undefined;
  }

  const normalizedPath = path.posix.normalize(trimmedPath);
  const segments = normalizedPath.split("/");

  if (
    normalizedPath === "." ||
    normalizedPath.startsWith("../") ||
    path.posix.isAbsolute(normalizedPath) ||
    segments.includes("..") ||
    !normalizedPath.endsWith(".md")
  ) {
    return undefined;
  }

  return normalizedPath;
}

function wikiPageResourceAllowsPath(input: {
  path: string;
  resource: ApprovalResource;
}): boolean {
  if (input.resource.kind !== "wiki_page") {
    return false;
  }

  return normalizeUserClientWikiPagePath(input.resource.id) === input.path;
}

function wikiRefMatchesPagePath(input: {
  path: string;
  ref: WikiRefProjectionRecord;
}): boolean {
  return (
    normalizeUserClientWikiPagePath(input.ref.artifactRef.locator.path) ===
    input.path
  );
}

async function resolveUserClientVisibleWikiPage(input: {
  conversationId?: string | undefined;
  hostApi?: RunnerJoinHostApi | undefined;
  nodeId: string;
  path: string;
  userNodeId: string;
}): Promise<UserClientVisibleWikiPage> {
  if (!input.conversationId) {
    return {
      error: "Conversation id is required for wiki page mutation.",
      statusCode: 400
    };
  }

  const normalizedPath = normalizeUserClientWikiPagePath(input.path);

  if (!normalizedPath) {
    return {
      error: "Wiki page path must be a POSIX markdown path inside the wiki.",
      statusCode: 400
    };
  }

  const conversation = await fetchUserNodeConversation({
    conversationId: input.conversationId,
    hostApi: input.hostApi,
    userNodeId: input.userNodeId
  });

  if (conversation.error || !conversation.detail) {
    return {
      error: conversation.error ?? "Conversation detail is unavailable.",
      statusCode: 502
    };
  }

  const wikiPageResources = conversation.detail.messages.flatMap((message) => {
    const resource = message.approval?.resource;

    return message.direction === "inbound" &&
      message.fromNodeId === input.nodeId &&
      resource?.kind === "wiki_page"
      ? [resource]
      : [];
  });

  if (wikiPageResources.length === 0) {
    return {
      error: "Wiki page resource is not visible in the selected User Node conversation.",
      statusCode: 403
    };
  }

  const directResourceVisible = wikiPageResources.some((resource) =>
    wikiPageResourceAllowsPath({
      path: normalizedPath,
      resource
    })
  );
  const projection = await fetchHostProjection({ hostApi: input.hostApi });

  if (projection.error || !projection.detail) {
    if (directResourceVisible) {
      return {
        path: normalizedPath,
        wikiRefs: []
      };
    }

    return {
      error: projection.error ?? "Host projection is unavailable.",
      statusCode: 502
    };
  }

  const matchingWikiRefs = projection.detail.wikiRefs.filter(
    (ref) =>
      ref.nodeId === input.nodeId &&
      (wikiRefMatchesPagePath({
        path: normalizedPath,
        ref
      }) ||
        wikiPageResources.some((resource) => resource.id === ref.artifactId))
  );
  const refVisible = matchingWikiRefs.some((ref) =>
    wikiRefMatchesPagePath({
      path: normalizedPath,
      ref
    })
  );

  if (!directResourceVisible && !refVisible) {
    return {
      error: "Wiki page is not visible in the selected User Node conversation.",
      statusCode: 403
    };
  }

  return {
    path: normalizedPath,
    wikiRefs: matchingWikiRefs
  };
}

async function resolveUserClientVisibleSourceHistoryRefs(input: {
  allowPublicationResources?: boolean | undefined;
  conversationId?: string | undefined;
  hostApi?: RunnerJoinHostApi | undefined;
  nodeId: string;
  sourceHistoryId: string;
  target?: SourceHistoryPublicationTarget | undefined;
  userNodeId: string;
}): Promise<UserClientVisibleSourceHistoryRefs> {
  if (!input.conversationId) {
    return {
      error: "Conversation id is required for source-history operation.",
      statusCode: 400
    };
  }

  const conversation = await fetchUserNodeConversation({
    conversationId: input.conversationId,
    hostApi: input.hostApi,
    userNodeId: input.userNodeId
  });

  if (conversation.error || !conversation.detail) {
    return {
      error: conversation.error ?? "Conversation detail is unavailable.",
      statusCode: 502
    };
  }

  const sourceHistoryResources = conversation.detail.messages.flatMap((message) => {
    const resource = message.approval?.resource;

    return message.direction === "inbound" &&
      message.fromNodeId === input.nodeId &&
      (resource?.kind === "source_history" ||
        (input.allowPublicationResources !== false &&
          resource?.kind === "source_history_publication"))
      ? [resource]
      : [];
  });
  const sourceHistoryVisible = sourceHistoryResources.some((resource) =>
    sourceHistoryResourceAllowsTarget({
      resource,
      sourceHistoryId: input.sourceHistoryId,
      ...(input.target ? { target: input.target } : {})
    })
  );

  if (!sourceHistoryVisible) {
    return {
      error: input.target
        ? "Source-history publication target is not visible in the selected User Node conversation."
        : "Source-history resource is not visible in the selected User Node conversation.",
      statusCode: 403
    };
  }

  const projection = await fetchHostProjection({ hostApi: input.hostApi });

  if (projection.error || !projection.detail) {
    return {
      error: projection.error ?? "Host projection is unavailable.",
      statusCode: 502
    };
  }

  const sourceHistoryRefs = projection.detail.sourceHistoryRefs.filter(
    (ref) =>
      ref.nodeId === input.nodeId &&
      ref.sourceHistoryId === input.sourceHistoryId &&
      sourceHistoryResources.some((resource) =>
        sourceHistoryRefMatchesResource({
          ref,
          resource,
          sourceHistoryId: input.sourceHistoryId
        })
      )
  );

  if (sourceHistoryRefs.length === 0) {
    return {
      error:
        "Source-history resource is visible but no projected source-history refs are available.",
      statusCode: 403
    };
  }

  return { sourceHistoryRefs };
}

async function markUserClientConversationRead(input: {
  conversationId: string;
  context: EffectiveRuntimeContext;
  hostApi?: RunnerJoinHostApi | undefined;
}): Promise<{
  detail?: UserNodeConversationReadResponse;
  error?: string;
  readReceiptError?: string;
  statusCode?: number;
}> {
  const state = await buildUserClientState({
    context: input.context,
    hostApi: input.hostApi
  });
  const selectedConversation = state.conversations.find(
    (conversation) => conversation.conversationId === input.conversationId
  );
  const conversationHistory = selectedConversation
    ? await fetchUserNodeConversation({
        conversationId: selectedConversation.conversationId,
        hostApi: input.hostApi,
        userNodeId: state.userNodeId
      })
    : undefined;
  const readState = await markUserNodeConversationRead({
    conversationId: input.conversationId,
    hostApi: input.hostApi,
    userNodeId: input.context.binding.node.nodeId
  });

  if (readState.error) {
    return {
      error: readState.error,
      statusCode: 502
    };
  }

  if (!readState.detail) {
    return {
      error: "Conversation read state is unavailable.",
      statusCode: 502
    };
  }

  const readReceiptState = selectedConversation
    ? await publishConversationReadReceipt({
        conversation: selectedConversation,
        conversationHistory: conversationHistory?.detail,
        hostApi: input.hostApi,
        userNodeId: state.userNodeId
      })
    : undefined;

  return {
    detail: readState.detail,
    ...(conversationHistory?.error
      ? { readReceiptError: conversationHistory.error }
      : readReceiptState?.error
        ? { readReceiptError: readReceiptState.error }
        : {})
  };
}

async function publishConversationReadReceipt(input: {
  conversation: UserConversationProjectionRecord;
  conversationHistory?: UserNodeConversationResponse | undefined;
  hostApi?: RunnerJoinHostApi | undefined;
  userNodeId: string;
}): Promise<{ error?: string }> {
  const latestInboundMessage = input.conversationHistory?.messages
    .filter((message) => message.direction === "inbound")
    .at(-1);

  if (!latestInboundMessage || input.conversation.unreadCount === 0) {
    return {};
  }

  try {
    await publishUserNodeMessage({
      conversationId: input.conversation.conversationId,
      hostApi: input.hostApi,
      messageType: "read.receipt",
      parentMessageId: latestInboundMessage.eventId,
      responsePolicy: {
        closeOnResult: true,
        maxFollowups: 0,
        responseRequired: false
      },
      sessionId: latestInboundMessage.sessionId,
      summary: `Read ${input.conversation.conversationId}.`,
      targetNodeId: latestInboundMessage.fromNodeId,
      userNodeId: input.userNodeId
    });

    return {};
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Read receipt publish failed."
    };
  }
}

async function fetchHostProjection(input: {
  hostApi?: RunnerJoinHostApi | undefined;
}): Promise<{
  detail?: HostProjectionSnapshot;
  error?: string;
}> {
  if (!input.hostApi) {
    return {
      error: "Host API is not configured for projection."
    };
  }

  try {
    const response = await fetch(new URL("/v1/projection", input.hostApi.baseUrl), {
      headers: buildHostApiHeaders(input.hostApi)
    });

    if (!response.ok) {
      return {
        error: `Host projection request failed with HTTP ${response.status}.`
      };
    }

    return {
      detail: hostProjectionSnapshotSchema.parse(await response.json())
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Host projection request failed."
    };
  }
}

async function fetchRuntimeArtifactPreview(input: {
  artifactId: string;
  hostApi?: RunnerJoinHostApi | undefined;
  nodeId: string;
}): Promise<{
  detail?: RuntimeArtifactPreviewResponse;
  error?: string;
}> {
  if (!input.hostApi) {
    return {
      error: "Host API is not configured for artifact preview."
    };
  }

  try {
    const response = await fetch(
      new URL(
        `/v1/runtimes/${encodeURIComponent(input.nodeId)}/artifacts/${encodeURIComponent(input.artifactId)}/preview`,
        input.hostApi.baseUrl
      ),
      {
        headers: buildHostApiHeaders(input.hostApi)
      }
    );

    if (!response.ok) {
      return {
        error: `Host artifact preview request failed with HTTP ${response.status}.`
      };
    }

    return {
      detail: runtimeArtifactPreviewResponseSchema.parse(await response.json())
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Host artifact preview request failed."
    };
  }
}

async function fetchRuntimeArtifactHistory(input: {
  artifactId: string;
  hostApi?: RunnerJoinHostApi | undefined;
  nodeId: string;
}): Promise<{
  detail?: RuntimeArtifactHistoryResponse;
  error?: string;
}> {
  if (!input.hostApi) {
    return {
      error: "Host API is not configured for artifact history."
    };
  }

  try {
    const response = await fetch(
      new URL(
        `/v1/runtimes/${encodeURIComponent(input.nodeId)}/artifacts/${encodeURIComponent(input.artifactId)}/history`,
        input.hostApi.baseUrl
      ),
      {
        headers: buildHostApiHeaders(input.hostApi)
      }
    );

    if (!response.ok) {
      return {
        error: `Host artifact history request failed with HTTP ${response.status}.`
      };
    }

    return {
      detail: runtimeArtifactHistoryResponseSchema.parse(await response.json())
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Host artifact history request failed."
    };
  }
}

async function fetchRuntimeArtifactDiff(input: {
  artifactId: string;
  hostApi?: RunnerJoinHostApi | undefined;
  nodeId: string;
}): Promise<{
  detail?: RuntimeArtifactDiffResponse;
  error?: string;
}> {
  if (!input.hostApi) {
    return {
      error: "Host API is not configured for artifact diff."
    };
  }

  try {
    const response = await fetch(
      new URL(
        `/v1/runtimes/${encodeURIComponent(input.nodeId)}/artifacts/${encodeURIComponent(input.artifactId)}/diff`,
        input.hostApi.baseUrl
      ),
      {
        headers: buildHostApiHeaders(input.hostApi)
      }
    );

    if (!response.ok) {
      return {
        error: `Host artifact diff request failed with HTTP ${response.status}.`
      };
    }

    return {
      detail: runtimeArtifactDiffResponseSchema.parse(await response.json())
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Host artifact diff request failed."
    };
  }
}

async function fetchRuntimeSourceChangeCandidateDiff(input: {
  candidateId: string;
  hostApi?: RunnerJoinHostApi | undefined;
  nodeId: string;
}): Promise<{
  detail?: RuntimeSourceChangeCandidateDiffResponse;
  error?: string;
}> {
  if (!input.hostApi) {
    return {
      error: "Host API is not configured for source-change diff preview."
    };
  }

  try {
    const response = await fetch(
      new URL(
        `/v1/runtimes/${encodeURIComponent(input.nodeId)}/source-change-candidates/${encodeURIComponent(input.candidateId)}/diff`,
        input.hostApi.baseUrl
      ),
      {
        headers: buildHostApiHeaders(input.hostApi)
      }
    );

    if (!response.ok) {
      return {
        error: `Host source-change diff request failed with HTTP ${response.status}.`
      };
    }

    return {
      detail: runtimeSourceChangeCandidateDiffResponseSchema.parse(
        await response.json()
      )
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Host source-change diff request failed."
    };
  }
}

async function fetchRuntimeSourceChangeCandidateFilePreview(input: {
  candidateId: string;
  hostApi?: RunnerJoinHostApi | undefined;
  nodeId: string;
  path: string;
}): Promise<{
  detail?: RuntimeSourceChangeCandidateFilePreviewResponse;
  error?: string;
}> {
  if (!input.hostApi) {
    return {
      error: "Host API is not configured for source-change file preview."
    };
  }

  try {
    const url = new URL(
      `/v1/runtimes/${encodeURIComponent(input.nodeId)}/source-change-candidates/${encodeURIComponent(input.candidateId)}/file`,
      input.hostApi.baseUrl
    );
    url.searchParams.set("path", input.path);
    const response = await fetch(url, {
      headers: buildHostApiHeaders(input.hostApi)
    });

    if (!response.ok) {
      return {
        error: `Host source-change file preview request failed with HTTP ${response.status}.`
      };
    }

    return {
      detail: runtimeSourceChangeCandidateFilePreviewResponseSchema.parse(
        await response.json()
      )
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Host source-change file preview request failed."
    };
  }
}

async function buildUserClientArtifactPreview(input: {
  artifactId: string;
  hostApi?: RunnerJoinHostApi | undefined;
  nodeId: string;
  visibleArtifact?: ArtifactRef | undefined;
}): Promise<UserClientArtifactPreviewResponse> {
  const projection = await fetchHostProjection({ hostApi: input.hostApi });
  const projectedRef = findProjectedArtifactRef({
    artifactId: input.artifactId,
    nodeId: input.nodeId,
    projection: projection.detail
  });

  if (projectedRef?.artifactPreview) {
    return {
      artifact: projectedRef.artifactRef,
      artifactId: input.artifactId,
      nodeId: input.nodeId,
      preview: projectedRef.artifactPreview,
      source: "projection"
    };
  }

  const runtimePreview = await fetchRuntimeArtifactPreview({
    artifactId: input.artifactId,
    hostApi: input.hostApi,
    nodeId: input.nodeId
  });

  if (runtimePreview.detail) {
    return {
      artifact: runtimePreview.detail.artifact.ref,
      artifactId: input.artifactId,
      nodeId: input.nodeId,
      preview: runtimePreview.detail.preview,
      source: "runtime"
    };
  }

  return {
    ...(projectedRef?.artifactRef
      ? { artifact: projectedRef.artifactRef }
      : input.visibleArtifact
        ? { artifact: input.visibleArtifact }
        : {}),
    artifactId: input.artifactId,
    nodeId: input.nodeId,
    preview: {
      available: false,
      reason:
        runtimePreview.error ??
        projection.error ??
        "Artifact preview is unavailable."
    },
    source: "unavailable"
  };
}

async function buildUserClientArtifactHistory(input: {
  artifactId: string;
  hostApi?: RunnerJoinHostApi | undefined;
  nodeId: string;
  visibleArtifact?: ArtifactRef | undefined;
}): Promise<UserClientArtifactHistoryResponse> {
  const runtimeHistory = await fetchRuntimeArtifactHistory({
    artifactId: input.artifactId,
    hostApi: input.hostApi,
    nodeId: input.nodeId
  });

  if (runtimeHistory.detail) {
    return {
      artifact: runtimeHistory.detail.artifact.ref,
      artifactId: input.artifactId,
      history: runtimeHistory.detail.history,
      nodeId: input.nodeId,
      source: "runtime"
    };
  }

  return {
    ...(input.visibleArtifact ? { artifact: input.visibleArtifact } : {}),
    artifactId: input.artifactId,
    history: {
      available: false,
      reason: runtimeHistory.error ?? "Artifact history is unavailable."
    },
    nodeId: input.nodeId,
    source: "unavailable"
  };
}

async function buildUserClientArtifactDiff(input: {
  artifactId: string;
  hostApi?: RunnerJoinHostApi | undefined;
  nodeId: string;
  visibleArtifact?: ArtifactRef | undefined;
}): Promise<UserClientArtifactDiffResponse> {
  const runtimeDiff = await fetchRuntimeArtifactDiff({
    artifactId: input.artifactId,
    hostApi: input.hostApi,
    nodeId: input.nodeId
  });

  if (runtimeDiff.detail) {
    return {
      artifact: runtimeDiff.detail.artifact.ref,
      artifactId: input.artifactId,
      diff: runtimeDiff.detail.diff,
      nodeId: input.nodeId,
      source: "runtime"
    };
  }

  return {
    ...(input.visibleArtifact ? { artifact: input.visibleArtifact } : {}),
    artifactId: input.artifactId,
    diff: {
      available: false,
      reason: runtimeDiff.error ?? "Artifact diff is unavailable."
    },
    nodeId: input.nodeId,
    source: "unavailable"
  };
}

async function requestRuntimeArtifactRestore(input: {
  artifactId: string;
  hostApi?: RunnerJoinHostApi | undefined;
  nodeId: string;
  reason?: string | undefined;
  restoreId?: string | undefined;
  userNodeId: string;
  visibleArtifact?: ArtifactRef | undefined;
}): Promise<{
  detail?: UserClientArtifactRestoreResponse;
  error?: string;
  statusCode?: number;
}> {
  if (!input.hostApi) {
    return {
      error: "Host API is not configured for artifact restore requests.",
      statusCode: 409
    };
  }

  try {
    const response = await fetch(
      new URL(
        `/v1/runtimes/${encodeURIComponent(input.nodeId)}/artifacts/${encodeURIComponent(input.artifactId)}/restore`,
        input.hostApi.baseUrl
      ),
      {
        body: JSON.stringify({
          ...(input.reason ? { reason: input.reason } : {}),
          requestedBy: input.userNodeId,
          ...(input.restoreId ? { restoreId: input.restoreId } : {})
        }),
        headers: {
          ...buildHostApiHeaders(input.hostApi),
          "content-type": "application/json"
        },
        method: "POST"
      }
    );

    if (!response.ok) {
      return {
        error: `Host artifact restore request failed with HTTP ${response.status}.`,
        statusCode: response.status
      };
    }

    return {
      detail: {
        ...runtimeArtifactRestoreResponseSchema.parse(await response.json()),
        ...(input.visibleArtifact ? { artifact: input.visibleArtifact } : {}),
        source: "runtime",
        userNodeId: input.userNodeId
      }
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Host artifact restore request failed.",
      statusCode: 502
    };
  }
}

async function requestRuntimeArtifactSourceProposal(input: {
  artifactId: string;
  hostApi?: RunnerJoinHostApi | undefined;
  nodeId: string;
  overwrite: boolean;
  proposalId?: string | undefined;
  reason?: string | undefined;
  targetPath?: string | undefined;
  userNodeId: string;
  visibleArtifact?: ArtifactRef | undefined;
}): Promise<{
  detail?: UserClientArtifactSourceProposalResponse;
  error?: string;
  statusCode?: number;
}> {
  if (!input.hostApi) {
    return {
      error: "Host API is not configured for artifact source-change proposals.",
      statusCode: 409
    };
  }

  try {
    const response = await fetch(
      new URL(
        `/v1/runtimes/${encodeURIComponent(input.nodeId)}/artifacts/${encodeURIComponent(input.artifactId)}/source-change-proposal`,
        input.hostApi.baseUrl
      ),
      {
        body: JSON.stringify({
          overwrite: input.overwrite,
          ...(input.proposalId ? { proposalId: input.proposalId } : {}),
          ...(input.reason ? { reason: input.reason } : {}),
          requestedBy: input.userNodeId,
          ...(input.targetPath ? { targetPath: input.targetPath } : {})
        }),
        headers: {
          ...buildHostApiHeaders(input.hostApi),
          "content-type": "application/json"
        },
        method: "POST"
      }
    );

    if (!response.ok) {
      return {
        error: `Host artifact source-change proposal request failed with HTTP ${response.status}.`,
        statusCode: response.status
      };
    }

    return {
      detail: {
        ...runtimeArtifactSourceChangeProposalResponseSchema.parse(
          await response.json()
        ),
        ...(input.visibleArtifact ? { artifact: input.visibleArtifact } : {}),
        source: "runtime",
        userNodeId: input.userNodeId
      }
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Host artifact source-change proposal request failed.",
      statusCode: 500
    };
  }
}

async function requestRuntimeWikiPublication(input: {
  hostApi?: RunnerJoinHostApi | undefined;
  nodeId: string;
  reason?: string | undefined;
  retryFailedPublication: boolean;
  target?: GitRepositoryTargetSelector | undefined;
  userNodeId: string;
  wikiRefs: WikiRefProjectionRecord[];
}): Promise<{
  detail?: UserClientWikiPublishResponse;
  error?: string;
  statusCode?: number;
}> {
  if (!input.hostApi) {
    return {
      error: "Host API is not configured for wiki publication.",
      statusCode: 409
    };
  }

  try {
    const response = await fetch(
      new URL(
        `/v1/runtimes/${encodeURIComponent(input.nodeId)}/wiki-repository/publish`,
        input.hostApi.baseUrl
      ),
      {
        body: JSON.stringify({
          ...(input.reason ? { reason: input.reason } : {}),
          requestedBy: input.userNodeId,
          retryFailedPublication: input.retryFailedPublication,
          ...(input.target ? { target: input.target } : {})
        }),
        headers: {
          ...buildHostApiHeaders(input.hostApi),
          "content-type": "application/json"
        },
        method: "POST"
      }
    );

    if (!response.ok) {
      return {
        error: `Host wiki publication request failed with HTTP ${response.status}.`,
        statusCode: response.status
      };
    }

    return {
      detail: {
        ...runtimeWikiPublishResponseSchema.parse(await response.json()),
        source: "runtime",
        userNodeId: input.userNodeId,
        wikiRefs: input.wikiRefs
      }
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Host wiki publication request failed.",
      statusCode: 502
    };
  }
}

async function requestRuntimeWikiPageUpsert(input: {
  content: string;
  hostApi?: RunnerJoinHostApi | undefined;
  mode: "append" | "replace";
  nodeId: string;
  path: string;
  reason?: string | undefined;
  userNodeId: string;
  wikiRefs: WikiRefProjectionRecord[];
}): Promise<{
  detail?: UserClientWikiPageUpsertResponse;
  error?: string;
  statusCode?: number;
}> {
  if (!input.hostApi) {
    return {
      error: "Host API is not configured for wiki page mutation.",
      statusCode: 409
    };
  }

  try {
    const response = await fetch(
      new URL(
        `/v1/runtimes/${encodeURIComponent(input.nodeId)}/wiki/pages`,
        input.hostApi.baseUrl
      ),
      {
        body: JSON.stringify({
          content: input.content,
          mode: input.mode,
          path: input.path,
          ...(input.reason ? { reason: input.reason } : {}),
          requestedBy: input.userNodeId
        }),
        headers: {
          ...buildHostApiHeaders(input.hostApi),
          "content-type": "application/json"
        },
        method: "POST"
      }
    );

    if (!response.ok) {
      return {
        error: `Host wiki page mutation request failed with HTTP ${response.status}.`,
        statusCode: response.status
      };
    }

    return {
      detail: {
        ...runtimeWikiUpsertPageResponseSchema.parse(await response.json()),
        source: "runtime",
        userNodeId: input.userNodeId,
        wikiRefs: input.wikiRefs
      }
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Host wiki page mutation request failed.",
      statusCode: 502
    };
  }
}

async function requestRuntimeSourceHistoryPublication(input: {
  hostApi?: RunnerJoinHostApi | undefined;
  nodeId: string;
  reason?: string | undefined;
  retryFailedPublication: boolean;
  sourceHistoryId: string;
  sourceHistoryRefs: SourceHistoryRefProjectionRecord[];
  target?: SourceHistoryPublicationTarget | undefined;
  userNodeId: string;
}): Promise<{
  detail?: UserClientSourceHistoryPublishResponse;
  error?: string;
  statusCode?: number;
}> {
  if (!input.hostApi) {
    return {
      error: "Host API is not configured for source-history publication.",
      statusCode: 409
    };
  }

  try {
    const response = await fetch(
      new URL(
        `/v1/runtimes/${encodeURIComponent(input.nodeId)}/source-history/${encodeURIComponent(input.sourceHistoryId)}/publish`,
        input.hostApi.baseUrl
      ),
      {
        body: JSON.stringify({
          ...(input.reason ? { reason: input.reason } : {}),
          requestedBy: input.userNodeId,
          retryFailedPublication: input.retryFailedPublication,
          ...(input.target ? { target: input.target } : {})
        }),
        headers: {
          ...buildHostApiHeaders(input.hostApi),
          "content-type": "application/json"
        },
        method: "POST"
      }
    );

    if (!response.ok) {
      return {
        error: `Host source-history publication request failed with HTTP ${response.status}.`,
        statusCode: response.status
      };
    }

    return {
      detail: {
        ...runtimeSourceHistoryPublishResponseSchema.parse(await response.json()),
        source: "runtime",
        sourceHistoryRefs: input.sourceHistoryRefs,
        userNodeId: input.userNodeId
      }
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Host source-history publication request failed.",
      statusCode: 502
    };
  }
}

async function requestRuntimeSourceHistoryReconcile(input: {
  approvalId?: string | undefined;
  hostApi?: RunnerJoinHostApi | undefined;
  nodeId: string;
  reason?: string | undefined;
  replayId?: string | undefined;
  sourceHistoryId: string;
  sourceHistoryRefs: SourceHistoryRefProjectionRecord[];
  userNodeId: string;
}): Promise<{
  detail?: UserClientSourceHistoryReconcileResponse;
  error?: string;
  statusCode?: number;
}> {
  if (!input.hostApi) {
    return {
      error: "Host API is not configured for source-history reconcile.",
      statusCode: 409
    };
  }

  try {
    const response = await fetch(
      new URL(
        `/v1/runtimes/${encodeURIComponent(input.nodeId)}/source-history/${encodeURIComponent(input.sourceHistoryId)}/reconcile`,
        input.hostApi.baseUrl
      ),
      {
        body: JSON.stringify({
          ...(input.approvalId ? { approvalId: input.approvalId } : {}),
          ...(input.reason ? { reason: input.reason } : {}),
          ...(input.replayId ? { replayId: input.replayId } : {}),
          replayedBy: input.userNodeId
        }),
        headers: {
          ...buildHostApiHeaders(input.hostApi),
          "content-type": "application/json"
        },
        method: "POST"
      }
    );

    if (!response.ok) {
      return {
        error: `Host source-history reconcile request failed with HTTP ${response.status}.`,
        statusCode: response.status
      };
    }

    return {
      detail: {
        ...runtimeSourceHistoryReconcileResponseSchema.parse(
          await response.json()
        ),
        source: "runtime",
        sourceHistoryRefs: input.sourceHistoryRefs,
        userNodeId: input.userNodeId
      }
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Host source-history reconcile request failed.",
      statusCode: 502
    };
  }
}

async function buildUserClientSourceChangeDiff(input: {
  candidateId: string;
  hostApi?: RunnerJoinHostApi | undefined;
  nodeId: string;
}): Promise<UserClientSourceChangeDiffResponse> {
  const projection = await fetchHostProjection({ hostApi: input.hostApi });
  const projectedRef = findProjectedSourceChangeRef({
    candidateId: input.candidateId,
    nodeId: input.nodeId,
    projection: projection.detail
  });
  const projectedSummary = projectedRef?.sourceChangeSummary;

  if (projectedSummary?.diffExcerpt) {
    return {
      candidateId: input.candidateId,
      diff: {
        available: true,
        bytesRead: Buffer.byteLength(projectedSummary.diffExcerpt, "utf8"),
        content: projectedSummary.diffExcerpt,
        contentEncoding: "utf8",
        contentType: "text/x-diff",
        truncated: projectedSummary.truncated
      },
      nodeId: input.nodeId,
      source: "projection",
      sourceChangeSummary: projectedSummary,
      status: projectedRef?.status
    };
  }

  const runtimeDiff = await fetchRuntimeSourceChangeCandidateDiff({
    candidateId: input.candidateId,
    hostApi: input.hostApi,
    nodeId: input.nodeId
  });

  if (runtimeDiff.detail) {
    return {
      candidateId: input.candidateId,
      diff: runtimeDiff.detail.diff,
      nodeId: input.nodeId,
      ...(runtimeDiff.detail.candidate.review
        ? { review: runtimeDiff.detail.candidate.review }
        : {}),
      source: "runtime",
      sourceChangeSummary: runtimeDiff.detail.candidate.sourceChangeSummary,
      status: runtimeDiff.detail.candidate.status
    };
  }

  return {
    candidateId: input.candidateId,
    diff: {
      available: false,
      reason:
        runtimeDiff.error ??
        projection.error ??
        "Source-change diff is unavailable."
    },
    nodeId: input.nodeId,
    source: "unavailable",
    ...(projectedSummary ? { sourceChangeSummary: projectedSummary } : {}),
    ...(projectedRef?.status ? { status: projectedRef.status } : {})
  };
}

function projectSourceChangeFilePreview(
  preview: NonNullable<
    SourceChangeRefProjectionRecord["sourceChangeSummary"]
  >["filePreviews"][number]
): RuntimeSourceChangeCandidateFilePreviewResponse["preview"] {
  return preview.available
    ? {
        available: true,
        bytesRead: preview.bytesRead,
        content: preview.content,
        contentEncoding: preview.contentEncoding,
        contentType: preview.contentType,
        truncated: preview.truncated
      }
    : {
        available: false,
        reason: preview.reason
      };
}

async function buildUserClientSourceChangeFilePreview(input: {
  candidateId: string;
  hostApi?: RunnerJoinHostApi | undefined;
  nodeId: string;
  path: string;
}): Promise<UserClientSourceChangeFilePreviewResponse> {
  const projection = await fetchHostProjection({ hostApi: input.hostApi });
  const projectedRef = findProjectedSourceChangeRef({
    candidateId: input.candidateId,
    nodeId: input.nodeId,
    projection: projection.detail
  });
  const projectedSummary = projectedRef?.sourceChangeSummary;
  const projectedPreview = projectedSummary?.filePreviews.find(
    (preview) => preview.path === input.path
  );

  if (projectedPreview) {
    return {
      candidateId: input.candidateId,
      nodeId: input.nodeId,
      path: input.path,
      preview: projectSourceChangeFilePreview(projectedPreview),
      source: "projection",
      sourceChangeSummary: projectedSummary,
      status: projectedRef?.status
    };
  }

  const runtimePreview = await fetchRuntimeSourceChangeCandidateFilePreview({
    candidateId: input.candidateId,
    hostApi: input.hostApi,
    nodeId: input.nodeId,
    path: input.path
  });

  if (runtimePreview.detail) {
    return {
      candidateId: input.candidateId,
      nodeId: input.nodeId,
      path: input.path,
      preview: runtimePreview.detail.preview,
      source: "runtime",
      sourceChangeSummary: runtimePreview.detail.candidate.sourceChangeSummary,
      status: runtimePreview.detail.candidate.status
    };
  }

  return {
    candidateId: input.candidateId,
    nodeId: input.nodeId,
    path: input.path,
    preview: {
      available: false,
      reason:
        runtimePreview.error ??
        projection.error ??
        "Source-change file preview is unavailable."
    },
    source: "unavailable",
    ...(projectedSummary ? { sourceChangeSummary: projectedSummary } : {}),
    ...(projectedRef?.status ? { status: projectedRef.status } : {})
  };
}

async function publishSourceChangeReviewMessage(input: {
  candidateId: string;
  conversationId: string;
  hostApi?: RunnerJoinHostApi | undefined;
  nodeId: string;
  parentMessageId: string;
  reason?: string | undefined;
  sessionId: string;
  status: UserSourceCandidateReviewStatus;
  turnId?: string | undefined;
  userNodeId: string;
}): Promise<{
  detail?: UserNodeMessagePublishResponse;
  error?: string;
  statusCode?: number;
}> {
  if (!input.hostApi) {
    return {
      error: "Host API is not configured for source-change review messages.",
      statusCode: 409
    };
  }

  try {
    return {
      detail: await publishUserNodeMessage({
        conversationId: input.conversationId,
        hostApi: input.hostApi,
        messageType: "source_change.review",
        parentMessageId: input.parentMessageId,
        responsePolicy: {
          closeOnResult: false,
          maxFollowups: 0,
          responseRequired: false
        },
        sessionId: input.sessionId,
        sourceChangeReview: {
          candidateId: input.candidateId,
          decision: input.status,
          ...(input.reason ? { reason: input.reason } : {})
        },
        summary: `${input.status === "accepted" ? "Accepted" : "Rejected"} source change ${input.candidateId}.`,
        targetNodeId: input.nodeId,
        turnId: input.turnId,
        userNodeId: input.userNodeId
      })
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Source-change review message publish failed.",
      statusCode: 500
    };
  }
}

function isMessageAddressedToUserNode(input: {
  message: EntangleA2AMessage;
  publicKey: string;
  userNodeId: string;
}): boolean {
  return (
    input.message.toNodeId === input.userNodeId &&
    input.message.toPubkey === input.publicKey
  );
}

async function recordInboundUserNodeMessage(input: {
  envelope: RunnerInboundEnvelope;
  hostApi?: RunnerJoinHostApi | undefined;
  publicKey: string;
  userNodeId: string;
}): Promise<void> {
  if (!input.hostApi) {
    return;
  }

  if (
    !isMessageAddressedToUserNode({
      message: input.envelope.message,
      publicKey: input.publicKey,
      userNodeId: input.userNodeId
    })
  ) {
    return;
  }

  const response = await fetch(
    new URL(
      `/v1/user-nodes/${encodeURIComponent(input.userNodeId)}/messages/inbound`,
      input.hostApi.baseUrl
    ),
    {
      body: JSON.stringify({
        eventId: input.envelope.eventId,
        message: input.envelope.message,
        receivedAt: input.envelope.receivedAt,
        ...(input.envelope.signerPubkey
          ? { signerPubkey: input.envelope.signerPubkey }
          : {})
      }),
      headers: {
        ...buildHostApiHeaders(input.hostApi),
        "content-type": "application/json"
      },
      method: "POST"
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Host User Node inbound record failed with HTTP ${response.status}: ${body}`
    );
  }
}

async function publishUserNodeMessage(input: {
  approval?:
    | {
        approvalId: string;
        decision: "approved" | "rejected";
        operation?: string | undefined;
        reason?: string | undefined;
        resource?:
          | {
              id: string;
              kind: string;
              label?: string | undefined;
            }
          | undefined;
      }
    | undefined;
  artifactRefs?: ArtifactRef[] | undefined;
  conversationId?: string | undefined;
  hostApi?: RunnerJoinHostApi | undefined;
  intent?: string | undefined;
  messageType: UserNodeMessagePublishType;
  parentMessageId?: string | undefined;
  responsePolicy?: {
    closeOnResult: boolean;
    maxFollowups: number;
    responseRequired: boolean;
  } | undefined;
  sessionId?: string | undefined;
  sourceChangeReview?:
    | {
        candidateId: string;
        decision: "accepted" | "rejected";
        reason?: string | undefined;
      }
    | undefined;
  summary: string;
  targetNodeId: string;
  turnId?: string | undefined;
  userNodeId: string;
}): Promise<UserNodeMessagePublishResponse> {
  if (!input.hostApi) {
    throw new Error("Host API is not configured for message publishing.");
  }

  const response = await fetch(
    new URL(
      `/v1/user-nodes/${encodeURIComponent(input.userNodeId)}/messages`,
      input.hostApi.baseUrl
    ),
    {
      body: JSON.stringify({
        ...(input.approval ? { approval: input.approval } : {}),
        ...(input.artifactRefs ? { artifactRefs: input.artifactRefs } : {}),
        ...(input.conversationId ? { conversationId: input.conversationId } : {}),
        ...(input.intent ? { intent: input.intent } : {}),
        messageType: input.messageType,
        ...(input.parentMessageId ? { parentMessageId: input.parentMessageId } : {}),
        ...(input.responsePolicy ? { responsePolicy: input.responsePolicy } : {}),
        ...(input.sessionId ? { sessionId: input.sessionId } : {}),
        ...(input.sourceChangeReview
          ? { sourceChangeReview: input.sourceChangeReview }
          : {}),
        summary: input.summary,
        targetNodeId: input.targetNodeId,
        ...(input.turnId ? { turnId: input.turnId } : {})
      }),
      headers: {
        ...buildHostApiHeaders(input.hostApi),
        "content-type": "application/json"
      },
      method: "POST"
    }
  );
  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `Host User Node publish failed with HTTP ${response.status}: ${body}`
    );
  }

  return userNodeMessagePublishResponseSchema.parse(JSON.parse(body));
}

function renderApprovalControls(message: UserNodeMessageRecord): string {
  if (
    message.direction !== "inbound" ||
    message.messageType !== "approval.request" ||
    !message.approval
  ) {
    return "";
  }

  const approvalId = escapeHtml(message.approval.approvalId);
  const conversationId = escapeHtml(message.conversationId);
  const eventId = escapeHtml(message.eventId);
  const fromNodeId = escapeHtml(message.fromNodeId);
  const operation = message.approval.operation
    ? escapeHtml(message.approval.operation)
    : "";
  const reason = message.approval.reason ? escapeHtml(message.approval.reason) : "";
  const resourceId = message.approval.resource?.id
    ? escapeHtml(message.approval.resource.id)
    : "";
  const resourceKind = message.approval.resource?.kind
    ? escapeHtml(message.approval.resource.kind)
    : "";
  const resourceLabel = message.approval.resource?.label
    ? escapeHtml(message.approval.resource.label)
    : "";
  const sessionId = escapeHtml(message.sessionId);

  return `<form class="approval-actions" method="post" action="/messages">
    <input type="hidden" name="approvalId" value="${approvalId}" />
    ${operation ? `<input type="hidden" name="approvalOperation" value="${operation}" />` : ""}
    ${reason ? `<input type="hidden" name="approvalReason" value="${reason}" />` : ""}
    ${resourceId ? `<input type="hidden" name="approvalResourceId" value="${resourceId}" />` : ""}
    ${resourceKind ? `<input type="hidden" name="approvalResourceKind" value="${resourceKind}" />` : ""}
    ${resourceLabel ? `<input type="hidden" name="approvalResourceLabel" value="${resourceLabel}" />` : ""}
    <input type="hidden" name="conversationId" value="${conversationId}" />
    <input type="hidden" name="messageType" value="approval.response" />
    <input type="hidden" name="parentMessageId" value="${eventId}" />
    <input type="hidden" name="sessionId" value="${sessionId}" />
    <input type="hidden" name="targetNodeId" value="${fromNodeId}" />
    <button name="approvalDecision" value="approved" type="submit">Approve</button>
    <button name="approvalDecision" value="rejected" type="submit">Reject</button>
  </form>`;
}

function renderSourceChangeSummary(ref?: SourceChangeRefProjectionRecord): string {
  const summary = ref?.sourceChangeSummary;

  if (!summary) {
    return "";
  }

  const files =
    summary.files.length > 0
      ? `<ul>${summary.files
          .map(
            (file) =>
              `<li>${escapeHtml(file.status)} ${escapeHtml(file.path)} +${file.additions} -${file.deletions}</li>`
          )
          .join("")}</ul>`
      : "";

  return `<div class="source-summary">
    <div><strong>${summary.fileCount}</strong> files - <strong>${summary.additions}</strong> additions - <strong>${summary.deletions}</strong> deletions${summary.truncated ? " - truncated" : ""}</div>
    ${files}
  </div>`;
}

function renderSourceChangeReviewControls(input: {
  candidateId: string;
  conversationId?: string | undefined;
  nodeId: string;
  parentMessageId: string;
  review?: SourceChangeCandidateReviewRecord | undefined;
  sessionId: string;
  status?: SourceChangeRefProjectionRecord["status"] | undefined;
  turnId: string;
}): string {
  if (input.status && input.status !== "pending_review") {
    const review = input.review;
    const reviewDetail = review
      ? [
          review.decidedBy ? `by ${review.decidedBy}` : undefined,
          review.reason ? review.reason : undefined
        ]
          .filter(Boolean)
          .join(" - ")
      : "";

    return `<div class="message-meta">source review ${escapeHtml(input.status)}${reviewDetail ? ` - ${escapeHtml(reviewDetail)}` : ""}</div>`;
  }

  return `<form class="source-review-actions" method="post" action="/source-change-candidates/review">
    <input type="hidden" name="nodeId" value="${escapeHtml(input.nodeId)}" />
    <input type="hidden" name="candidateId" value="${escapeHtml(input.candidateId)}" />
    ${input.conversationId ? `<input type="hidden" name="conversationId" value="${escapeHtml(input.conversationId)}" />` : ""}
    <input type="hidden" name="parentMessageId" value="${escapeHtml(input.parentMessageId)}" />
    <input type="hidden" name="sessionId" value="${escapeHtml(input.sessionId)}" />
    <input type="hidden" name="turnId" value="${escapeHtml(input.turnId)}" />
    <label>Review reason
      <textarea name="reason" rows="2"></textarea>
    </label>
    <div class="source-review-buttons">
      <button name="status" value="accepted" type="submit">Accept candidate</button>
      <button class="danger-button" name="status" value="rejected" type="submit">Reject candidate</button>
    </div>
  </form>`;
}

function findProjectedSourceChangeRef(input: {
  candidateId: string;
  nodeId: string;
  projection?: HostProjectionSnapshot | undefined;
}): SourceChangeRefProjectionRecord | undefined {
  return input.projection?.sourceChangeRefs.find(
    (ref) => ref.nodeId === input.nodeId && ref.candidateId === input.candidateId
  );
}

function findProjectedArtifactRef(input: {
  artifactId: string;
  nodeId: string;
  projection?: HostProjectionSnapshot | undefined;
}): ArtifactRefProjectionRecord | undefined {
  return input.projection?.artifactRefs.find(
    (ref) => ref.nodeId === input.nodeId && ref.artifactId === input.artifactId
  );
}

function wikiRefMatchesResource(input: {
  ref: WikiRefProjectionRecord;
  resource: ApprovalResource;
}): boolean {
  const resourceId =
    input.resource.kind === "wiki_repository_publication"
      ? input.resource.id.split("|")[0]
      : input.resource.id;
  const locatorPath = input.ref.artifactRef.locator.path;
  const normalizedLocatorPath = locatorPath.replace(/^\/+/u, "");

  return (
    resourceId === input.ref.nodeId ||
    resourceId === input.ref.artifactId ||
    resourceId === locatorPath ||
    resourceId === normalizedLocatorPath
  );
}

function parseWikiPublicationTargetFromResource(input: {
  resource: ApprovalResource;
  wikiResourceId: string;
}): GitRepositoryTargetSelector | undefined {
  if (input.resource.kind !== "wiki_repository_publication") {
    return undefined;
  }

  const parts = input.resource.id.split("|");
  if (parts.length !== 4 || parts[0] !== input.wikiResourceId) {
    return undefined;
  }

  const parsed = gitRepositoryTargetSelectorSchema.safeParse({
    gitServiceRef: parts[1],
    namespace: parts[2],
    repositoryName: parts[3]
  });

  return parsed.success ? parsed.data : undefined;
}

function gitRepositoryTargetSelectorsMatch(
  resourceTarget: GitRepositoryTargetSelector,
  selector: GitRepositoryTargetSelector
): boolean {
  return (
    (selector.gitServiceRef === undefined ||
      resourceTarget.gitServiceRef === selector.gitServiceRef) &&
    (selector.namespace === undefined ||
      resourceTarget.namespace === selector.namespace) &&
    (selector.repositoryName === undefined ||
      resourceTarget.repositoryName === selector.repositoryName)
  );
}

function wikiResourceAllowsTarget(input: {
  ref: WikiRefProjectionRecord;
  resource: ApprovalResource;
  target?: GitRepositoryTargetSelector | undefined;
}): boolean {
  if (!wikiRefMatchesResource({ ref: input.ref, resource: input.resource })) {
    return false;
  }

  if (!input.target) {
    return true;
  }

  const target = input.target;
  const wikiResourceIds = [
    input.ref.nodeId,
    input.ref.artifactId,
    input.ref.artifactRef.locator.path,
    input.ref.artifactRef.locator.path.replace(/^\/+/u, "")
  ];

  return wikiResourceIds.some((wikiResourceId) => {
    const resourceTarget = parseWikiPublicationTargetFromResource({
      resource: input.resource,
      wikiResourceId
    });

    return resourceTarget
      ? gitRepositoryTargetSelectorsMatch(resourceTarget, target)
      : false;
  });
}

function sourceHistoryRefMatchesResource(input: {
  ref?: SourceHistoryRefProjectionRecord | undefined;
  resource: ApprovalResource;
  sourceHistoryId: string;
}): boolean {
  if (input.resource.kind === "source_history") {
    return input.resource.id === input.sourceHistoryId;
  }

  if (input.resource.kind !== "source_history_publication") {
    return false;
  }

  const historyId = input.ref?.sourceHistoryId ?? input.sourceHistoryId;

  return (
    input.resource.id === historyId ||
    input.resource.id.startsWith(`${historyId}|`)
  );
}

function parseSourceHistoryPublicationTargetFromResource(input: {
  resource: ApprovalResource;
  sourceHistoryId: string;
}): SourceHistoryPublicationTarget | undefined {
  if (input.resource.kind !== "source_history_publication") {
    return undefined;
  }

  const parts = input.resource.id.split("|");
  if (parts.length !== 4 || parts[0] !== input.sourceHistoryId) {
    return undefined;
  }

  const parsed = sourceHistoryPublicationTargetSchema.safeParse({
    gitServiceRef: parts[1],
    namespace: parts[2],
    repositoryName: parts[3]
  });

  return parsed.success ? parsed.data : undefined;
}

function sourceHistoryPublicationTargetsMatch(
  resourceTarget: SourceHistoryPublicationTarget,
  selector: SourceHistoryPublicationTarget
): boolean {
  return (
    (selector.gitServiceRef === undefined ||
      resourceTarget.gitServiceRef === selector.gitServiceRef) &&
    (selector.namespace === undefined ||
      resourceTarget.namespace === selector.namespace) &&
    (selector.repositoryName === undefined ||
      resourceTarget.repositoryName === selector.repositoryName)
  );
}

function sourceHistoryResourceAllowsTarget(input: {
  resource: ApprovalResource;
  sourceHistoryId: string;
  target?: SourceHistoryPublicationTarget | undefined;
}): boolean {
  if (!input.target) {
    return sourceHistoryRefMatchesResource({
      resource: input.resource,
      sourceHistoryId: input.sourceHistoryId
    });
  }

  const resourceTarget = parseSourceHistoryPublicationTargetFromResource({
    resource: input.resource,
    sourceHistoryId: input.sourceHistoryId
  });

  return resourceTarget
    ? sourceHistoryPublicationTargetsMatch(resourceTarget, input.target)
    : false;
}

function renderApprovalResource(
  message: UserNodeMessageRecord,
  sourceChangeRefs: SourceChangeRefProjectionRecord[],
  sourceHistoryRefs: SourceHistoryRefProjectionRecord[],
  wikiRefs: WikiRefProjectionRecord[]
): string {
  const resource = message.approval?.resource;

  if (!resource) {
    return "";
  }

  const resourceLabel = `${resource.kind}:${resource.id}`;
  const sourceChangeRef =
    resource.kind === "source_change_candidate"
      ? sourceChangeRefs.find(
          (ref) =>
            ref.nodeId === message.fromNodeId && ref.candidateId === resource.id
        )
      : undefined;
  const relatedWikiRefs =
    resource.kind === "wiki_repository" ||
    resource.kind === "wiki_repository_publication" ||
    resource.kind === "wiki_page"
      ? wikiRefs.filter(
          (ref) =>
            ref.nodeId === message.fromNodeId &&
            wikiRefMatchesResource({ ref, resource })
        )
      : [];
  const relatedSourceHistoryRefs =
    resource.kind === "source_history" ||
    resource.kind === "source_history_publication"
      ? sourceHistoryRefs.filter(
          (ref) =>
            ref.nodeId === message.fromNodeId &&
            sourceHistoryRefMatchesResource({
              ref,
              resource,
              sourceHistoryId: ref.sourceHistoryId
            })
        )
      : [];
  const sourceDiffAction =
    resource.kind === "source_change_candidate"
      ? `<a class="artifact-action" href="${escapeHtml(
          `/source-change-candidates/diff?nodeId=${encodeURIComponent(message.fromNodeId)}` +
            `&candidateId=${encodeURIComponent(resource.id)}` +
            `&conversationId=${encodeURIComponent(message.conversationId)}` +
            `&parentMessageId=${encodeURIComponent(message.eventId)}` +
            `&sessionId=${encodeURIComponent(message.sessionId)}` +
            `&turnId=${encodeURIComponent(message.turnId)}`
        )}">Review diff</a>`
      : "";
  const sourceReviewControls =
    resource.kind === "source_change_candidate"
      ? renderSourceChangeReviewControls({
          candidateId: resource.id,
          conversationId: message.conversationId,
          nodeId: message.fromNodeId,
          parentMessageId: message.eventId,
          sessionId: message.sessionId,
          status: sourceChangeRef?.status,
          turnId: message.turnId
        })
      : "";

  return `<div class="message-meta">resource ${escapeHtml(resourceLabel)}${resource.label ? ` - ${escapeHtml(resource.label)}` : ""}</div>${renderSourceChangeSummary(sourceChangeRef)}${renderSourceHistoryRefCards({
    approvalId: message.approval?.approvalId,
    conversationId: message.conversationId,
    nodeId: message.fromNodeId,
    refs: relatedSourceHistoryRefs,
    resource
  })}${renderWikiRefCards(relatedWikiRefs)}${sourceDiffAction}${sourceReviewControls}`;
}

function renderArtifactLocator(ref: ArtifactRef): string {
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

function resolveArtifactPreviewNodeId(input: {
  message: UserNodeMessageRecord;
  ref: ArtifactRef;
}): string {
  if (input.ref.backend === "wiki") {
    return input.ref.locator.nodeId;
  }

  return input.message.direction === "inbound"
    ? input.message.fromNodeId
    : input.message.toNodeId;
}

function renderArtifactRefs(message: UserNodeMessageRecord): string {
  if (message.artifactRefs.length === 0) {
    return "";
  }

  return `<div class="artifact-list">
    ${message.artifactRefs
      .map((ref) => {
        const previewNodeId = resolveArtifactPreviewNodeId({
          message,
          ref
        });
        const previewUrl =
          `/artifacts/preview?nodeId=${encodeURIComponent(previewNodeId)}` +
          `&artifactId=${encodeURIComponent(ref.artifactId)}` +
          `&conversationId=${encodeURIComponent(message.conversationId)}`;

        return (
          `<div class="artifact-ref">
            <div><strong>${escapeHtml(ref.artifactId)}</strong> ${escapeHtml(ref.backend)}${ref.artifactKind ? ` ${escapeHtml(ref.artifactKind)}` : ""}</div>
            ${ref.contentSummary ? `<div>${escapeHtml(ref.contentSummary)}</div>` : ""}
            <div class="message-meta">${escapeHtml(renderArtifactLocator(ref))}</div>
            <a class="artifact-action" href="${escapeHtml(previewUrl)}">Preview</a>
            <form class="artifact-proposal-actions" method="post" action="/artifacts/source-change-proposal">
              <input type="hidden" name="nodeId" value="${escapeHtml(previewNodeId)}" />
              <input type="hidden" name="artifactId" value="${escapeHtml(ref.artifactId)}" />
              <input type="hidden" name="conversationId" value="${escapeHtml(message.conversationId)}" />
              <label>Target path
                <input name="targetPath" placeholder="default source root" />
              </label>
              <label>Reason
                <input name="reason" placeholder="why this should become source work" />
              </label>
              <label class="inline-checkbox">
                <input name="overwrite" type="checkbox" value="true" />
                <span>Overwrite existing files</span>
              </label>
              <button type="submit">Propose source change</button>
            </form>
          </div>`
        );
      })
      .join("")}
  </div>`;
}

function renderSourceHistoryRefCards(input: {
  approvalId?: string | undefined;
  conversationId: string;
  nodeId: string;
  refs: SourceHistoryRefProjectionRecord[];
  resource: ApprovalResource;
}): string {
  if (input.refs.length === 0) {
    return "";
  }

  return `<div class="artifact-list">
    ${input.refs
      .map((ref) => {
        const publicationCount = ref.history.publications.length;
        const summary = ref.history.sourceChangeSummary;
        const target = parseSourceHistoryPublicationTargetFromResource({
          resource: input.resource,
          sourceHistoryId: ref.sourceHistoryId
        });

        return `<div class="artifact-ref">
          <div><strong>${escapeHtml(ref.sourceHistoryId)}</strong> source history</div>
          <div class="message-meta">${escapeHtml(ref.history.branch)} @ ${escapeHtml(ref.history.commit)}</div>
          ${target ? `<div class="message-meta">${escapeHtml(`publication target ${target.gitServiceRef ?? ""}/${target.namespace ?? ""}/${target.repositoryName ?? ""}`)}</div>` : ""}
          <div>${escapeHtml(`${summary.fileCount} files, +${summary.additions} -${summary.deletions}`)}</div>
          <div class="message-meta">${escapeHtml(`${publicationCount} publication${publicationCount === 1 ? "" : "s"}`)}</div>
          <form class="artifact-proposal-actions" method="post" action="/source-history/publish">
            <input type="hidden" name="nodeId" value="${escapeHtml(input.nodeId)}" />
            <input type="hidden" name="sourceHistoryId" value="${escapeHtml(ref.sourceHistoryId)}" />
            <input type="hidden" name="conversationId" value="${escapeHtml(input.conversationId)}" />
            ${target ? `<input type="hidden" name="targetGitServiceRef" value="${escapeHtml(target.gitServiceRef ?? "")}" />
            <input type="hidden" name="targetNamespace" value="${escapeHtml(target.namespace ?? "")}" />
            <input type="hidden" name="targetRepositoryName" value="${escapeHtml(target.repositoryName ?? "")}" />` : ""}
            <label>Reason
              <input name="reason" placeholder="why this source history should be published" />
            </label>
            <label class="inline-checkbox">
              <input name="retryFailedPublication" type="checkbox" value="true" />
              <span>Retry failed publication</span>
            </label>
            <button type="submit">Publish source history</button>
          </form>
          ${
            input.resource.kind === "source_history"
              ? `<form class="artifact-proposal-actions" method="post" action="/source-history/reconcile">
            <input type="hidden" name="nodeId" value="${escapeHtml(input.nodeId)}" />
            <input type="hidden" name="sourceHistoryId" value="${escapeHtml(ref.sourceHistoryId)}" />
            <input type="hidden" name="conversationId" value="${escapeHtml(input.conversationId)}" />
            ${input.approvalId ? `<input type="hidden" name="approvalId" value="${escapeHtml(input.approvalId)}" />` : ""}
            <label>Reason
              <input name="reason" placeholder="why this source history should be reconciled" />
            </label>
            <button type="submit">Reconcile source history</button>
          </form>`
              : ""
          }
        </div>`;
      })
      .join("")}
  </div>`;
}

function renderWikiRefCards(refs: WikiRefProjectionRecord[]): string {
  if (refs.length === 0) {
    return "";
  }

  return `<div class="artifact-list">
    ${refs
      .map(
        (ref) => `<div class="artifact-ref">
          <div><strong>${escapeHtml(ref.artifactId)}</strong> ${escapeHtml(ref.artifactRef.artifactKind ?? "knowledge_summary")}</div>
          ${ref.artifactRef.contentSummary ? `<div>${escapeHtml(ref.artifactRef.contentSummary)}</div>` : ""}
          ${
            ref.artifactPreview?.available
              ? `<pre class="wiki-preview">${escapeHtml(ref.artifactPreview.content)}</pre>`
              : ref.artifactPreview
                ? `<div class="message-meta">${escapeHtml(ref.artifactPreview.reason)}</div>`
                : ""
          }
          <div class="message-meta">${escapeHtml(renderArtifactLocator(ref.artifactRef))}</div>
          <div class="message-meta">observed ${escapeHtml(ref.projection.updatedAt)}</div>
        </div>`
      )
      .join("")}
  </div>`;
}

function renderWikiRefsForPeer(input: {
  peerNodeId?: string | undefined;
  wikiRefs: WikiRefProjectionRecord[];
}): string {
  const refs = input.peerNodeId
    ? input.wikiRefs.filter((ref) => ref.nodeId === input.peerNodeId)
    : [];

  return (
    renderWikiRefCards(refs) ||
    `<p class="empty">No projected wiki refs for this thread.</p>`
  );
}

function renderMessageDelivery(message: UserNodeMessageRecord): string {
  if (message.direction === "inbound") {
    return `<div class="message-meta">delivery received by User Client</div>`;
  }

  const targetRelayCount =
    message.relayUrls.length > 0
      ? message.relayUrls.length
      : message.publishedRelays.length;
  const deliveryStatus =
    message.deliveryStatus ??
    (message.publishedRelays.length > 0 ? "published" : undefined);
  const deliveryLabel =
    deliveryStatus === "failed"
      ? `failed ${message.publishedRelays.length}/${targetRelayCount} relays`
      : deliveryStatus === "partial"
        ? `partial ${message.publishedRelays.length}/${targetRelayCount} relays`
        : message.publishedRelays.length > 0
          ? `published ${message.publishedRelays.length}/${targetRelayCount} relays`
          : "publish status unknown";
  const deliveryErrors =
    message.deliveryErrors.length > 0
      ? `<ul class="delivery-errors">${message.deliveryErrors
          .map(
            (error) =>
              `<li>${escapeHtml(error.relayUrl)}: ${escapeHtml(error.message)}</li>`
          )
          .join("")}</ul>`
      : "";

  return `<div class="message-meta">delivery ${escapeHtml(deliveryLabel)}</div>${deliveryErrors}`;
}

function renderParentMessageLink(message: UserNodeMessageRecord): string {
  return message.parentMessageId
    ? `<div class="message-meta">reply to ${escapeHtml(message.parentMessageId)}</div>`
    : "";
}

function renderRetryControl(message: UserNodeMessageRecord): string {
  if (message.direction !== "outbound" || message.deliveryStatus !== "failed") {
    return "";
  }

  const approval = message.approval;

  return `<form class="retry-action" method="post" action="/messages">
    <input type="hidden" name="conversationId" value="${escapeHtml(message.conversationId)}" />
    <input type="hidden" name="sessionId" value="${escapeHtml(message.sessionId)}" />
    <input type="hidden" name="targetNodeId" value="${escapeHtml(message.toNodeId)}" />
    <input type="hidden" name="messageType" value="${escapeHtml(message.messageType)}" />
    <input type="hidden" name="summary" value="${escapeHtml(message.summary)}" />
    ${message.parentMessageId ? `<input type="hidden" name="parentMessageId" value="${escapeHtml(message.parentMessageId)}" />` : ""}
    ${approval?.approvalId ? `<input type="hidden" name="approvalId" value="${escapeHtml(approval.approvalId)}" />` : ""}
    ${approval?.decision ? `<input type="hidden" name="approvalDecision" value="${escapeHtml(approval.decision)}" />` : ""}
    ${approval?.operation ? `<input type="hidden" name="approvalOperation" value="${escapeHtml(approval.operation)}" />` : ""}
    ${approval?.reason ? `<input type="hidden" name="approvalReason" value="${escapeHtml(approval.reason)}" />` : ""}
    ${approval?.resource?.id ? `<input type="hidden" name="approvalResourceId" value="${escapeHtml(approval.resource.id)}" />` : ""}
    ${approval?.resource?.kind ? `<input type="hidden" name="approvalResourceKind" value="${escapeHtml(approval.resource.kind)}" />` : ""}
    ${approval?.resource?.label ? `<input type="hidden" name="approvalResourceLabel" value="${escapeHtml(approval.resource.label)}" />` : ""}
    <button type="submit">Retry delivery</button>
  </form>`;
}

async function renderHome(input: {
  context: EffectiveRuntimeContext;
  hostApi?: RunnerJoinHostApi | undefined;
  notice?: string;
  selectedConversationId?: string | undefined;
}): Promise<string> {
  let state = await buildUserClientState({
    context: input.context,
    hostApi: input.hostApi
  });
  let selectedConversation = input.selectedConversationId
    ? state.conversations.find(
        (conversation) =>
          conversation.conversationId === input.selectedConversationId
      )
    : undefined;
  const selectedConversationHistory = selectedConversation
    ? await fetchUserNodeConversation({
        conversationId: selectedConversation.conversationId,
        hostApi: input.hostApi,
        userNodeId: state.userNodeId
      })
    : undefined;
  const readState = selectedConversation
    ? await markUserNodeConversationRead({
        conversationId: selectedConversation.conversationId,
        hostApi: input.hostApi,
        userNodeId: input.context.binding.node.nodeId
      })
    : undefined;
  const readReceiptState = selectedConversation
    ? await publishConversationReadReceipt({
        conversation: selectedConversation,
        conversationHistory: selectedConversationHistory?.detail,
        hostApi: input.hostApi,
        userNodeId: state.userNodeId
      })
    : undefined;

  if (selectedConversation && !readState?.error) {
    const selectedConversationId = selectedConversation.conversationId;
    state = await buildUserClientState({
      context: input.context,
      hostApi: input.hostApi
    });
    selectedConversation = state.conversations.find(
      (conversation) => conversation.conversationId === selectedConversationId
    );
  }

  const selectedTargetNodeId =
    selectedConversation?.peerNodeId ?? state.targets[0]?.nodeId ?? "";
  const targetOptions = state.targets
    .map(
      (target) =>
        `<option value="${escapeHtml(target.nodeId)}" ${
          target.nodeId === selectedTargetNodeId ? "selected" : ""
        }>${escapeHtml(target.nodeId)} - ${escapeHtml(target.relation)}</option>`
    )
    .join("");
  const messageTypeDefault = selectedConversation ? "answer" : "task.request";
  const messageTypeOptions = [
    "task.request",
    "question",
    "answer",
    "conversation.close"
  ]
    .map(
      (messageType) =>
        `<option value="${messageType}" ${
          messageType === messageTypeDefault ? "selected" : ""
        }>${messageType}</option>`
    )
    .join("");
  const conversationList =
    state.conversations.length > 0
      ? state.conversations
          .map((conversation) => {
            const isSelected =
              conversation.conversationId === selectedConversation?.conversationId;
            const href = `/?conversationId=${encodeURIComponent(conversation.conversationId)}`;

            return `<a class="conversation ${isSelected ? "selected" : ""}" href="${href}">
              <span class="conversation-main">${escapeHtml(conversation.peerNodeId)}</span>
              <span>${escapeHtml(conversation.conversationId)}</span>
              <span>${escapeHtml(conversation.lastMessageAt ?? conversation.projection.updatedAt)}</span>
              <span>${escapeHtml(`${conversation.pendingApprovalIds.length} approvals - ${conversation.unreadCount} unread`)}</span>
            </a>`;
          })
          .join("")
      : `<p class="empty">No projected conversations yet.</p>`;
  const selectedConversationPanel = selectedConversation
    ? `<dl class="detail-list">
        <div><dt>Conversation</dt><dd>${escapeHtml(selectedConversation.conversationId)}</dd></div>
        <div><dt>Peer</dt><dd>${escapeHtml(selectedConversation.peerNodeId)}</dd></div>
        <div><dt>Session</dt><dd>${escapeHtml(selectedConversation.sessionId ?? "unknown")}</dd></div>
        <div><dt>Status</dt><dd>${escapeHtml(selectedConversation.status)}</dd></div>
        <div><dt>Last message</dt><dd>${escapeHtml(selectedConversation.lastMessageType ?? "unknown")}</dd></div>
      </dl>`
    : `<p class="empty">No conversation selected.</p>`;
  const messageHistory = selectedConversationHistory?.detail?.messages.length
    ? selectedConversationHistory.detail.messages
        .map(
          (message) =>
            `<article class="message">
              <div class="message-meta">${escapeHtml(message.direction)} - ${escapeHtml(message.messageType)} - ${escapeHtml(message.createdAt)}</div>
              ${renderMessageDelivery(message)}
              ${message.approval ? `<div class="message-meta">approval ${escapeHtml(message.approval.approvalId)}${message.approval.decision ? ` - ${escapeHtml(message.approval.decision)}` : ""}</div>` : ""}
              ${message.sourceChangeReview ? `<div class="message-meta">source review ${escapeHtml(message.sourceChangeReview.candidateId)} - ${escapeHtml(message.sourceChangeReview.decision)}</div>` : ""}
              ${renderApprovalResource(message, state.sourceChangeRefs, state.sourceHistoryRefs, state.wikiRefs)}
              <div>${escapeHtml(message.summary)}</div>
              ${renderArtifactRefs(message)}
              ${renderParentMessageLink(message)}
              <div class="message-meta">${escapeHtml(message.eventId)}</div>
              ${renderApprovalControls(message)}
              ${renderRetryControl(message)}
            </article>`
        )
        .join("")
    : `<p class="empty">No recorded User Node messages yet.</p>`;
  const wikiRefs = renderWikiRefsForPeer({
    peerNodeId: selectedConversation?.peerNodeId,
    wikiRefs: state.wikiRefs
  });
  const errorMessage = [state.error, readState?.error, readReceiptState?.error]
    .filter(Boolean)
    .join(" ");
  const stateFingerprint = buildUserClientStateFingerprint(state);
  const relayList =
    state.runtime.relayUrls.length > 0
      ? state.runtime.relayUrls.join(", ")
      : "no relay profiles";
  const liveRefreshScript = `<script>
      (() => {
        const indicator = document.querySelector("[data-live-status]");
        let currentFingerprint = ${toSafeScriptJson(stateFingerprint)};
        const fingerprint = (state) => JSON.stringify({
          conversations: (state.conversations || []).map((conversation) => ({
            conversationId: conversation.conversationId,
            lastMessageAt: conversation.lastMessageAt,
            pendingApprovalIds: conversation.pendingApprovalIds,
            status: conversation.status,
            unreadCount: conversation.unreadCount,
            updatedAt: conversation.projection?.updatedAt
          })),
          generatedAt: state.generatedAt,
          sourceChangeRefs: (state.sourceChangeRefs || []).map((ref) => [
            ref.nodeId,
            ref.candidateId,
            ref.status,
            ref.projection?.updatedAt
          ]),
          sourceHistoryRefs: (state.sourceHistoryRefs || []).map((ref) => [
            ref.nodeId,
            ref.sourceHistoryId,
            ref.projection?.updatedAt
          ]),
          wikiRefs: (state.wikiRefs || []).map((ref) => [
            ref.nodeId,
            ref.artifactId,
            ref.projection?.updatedAt
          ])
        });

        async function refreshState() {
          try {
            const response = await fetch("/api/state", {
              headers: { accept: "application/json" }
            });

            if (!response.ok) {
              if (indicator) indicator.textContent = "State refresh failed";
              return;
            }

            const nextFingerprint = fingerprint(await response.json());
            if (nextFingerprint !== currentFingerprint) {
              window.location.reload();
              return;
            }

            if (indicator) {
              indicator.textContent = "Live state current";
            }
          } catch {
            if (indicator) indicator.textContent = "State refresh unavailable";
          }
        }

        window.setInterval(refreshState, 5000);
      })();
    </script>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Entangle User Client - ${escapeHtml(state.userNodeId)}</title>
    <style>
      :root { color-scheme: light; --ink: #202327; --muted: #626a73; --line: #d9dee5; --panel: #ffffff; --page: #f4f6f8; --accent: #1f8a70; --accent-ink: #ffffff; --danger: #b1453d; }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--page); color: var(--ink); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      main { min-height: 100vh; display: grid; grid-template-rows: auto 1fr; }
      header { border-bottom: 1px solid var(--line); background: var(--panel); padding: 18px 24px; display: flex; align-items: center; justify-content: space-between; gap: 18px; }
      h1, h2 { margin: 0; line-height: 1.1; }
      h1 { font-size: 20px; }
      h2 { font-size: 15px; }
      .layout { display: grid; grid-template-columns: minmax(280px, 360px) 1fr; min-height: 0; }
      aside, .workspace { padding: 20px; min-width: 0; }
      aside { border-right: 1px solid var(--line); background: #fafbfc; }
      .workspace { display: grid; gap: 16px; align-content: start; }
      section { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 16px; }
      label { display: grid; gap: 6px; margin: 0 0 12px; color: var(--muted); font-size: 13px; }
      input, select, textarea, button { font: inherit; border-radius: 7px; border: 1px solid var(--line); padding: 10px; min-width: 0; }
      input, select, textarea { width: 100%; background: #fff; color: var(--ink); }
      textarea { resize: vertical; }
      button { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); cursor: pointer; font-weight: 700; }
      button:disabled { opacity: .5; cursor: not-allowed; }
      .danger-button { background: var(--danger); border-color: var(--danger); color: #fff; }
      .muted, .meta, .empty { color: var(--muted); }
      .meta { font-size: 13px; }
      .notice { border-color: rgba(31, 138, 112, .28); background: #ecf8f4; }
      .error { border-color: rgba(177, 69, 61, .35); background: #fff1f0; color: var(--danger); }
      .status-pill { border: 1px solid var(--line); border-radius: 999px; color: var(--muted); display: inline-flex; font-size: 12px; padding: 6px 10px; }
      .conversation-list { display: grid; gap: 8px; margin-top: 12px; }
      .conversation { color: inherit; display: grid; gap: 3px; text-decoration: none; border: 1px solid var(--line); background: var(--panel); border-radius: 8px; padding: 10px; font-size: 12px; }
      .conversation.selected { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
      .conversation-main { font-size: 14px; font-weight: 700; }
      .message { border-top: 1px solid var(--line); display: grid; gap: 6px; padding: 12px 0; }
      .message:first-child { border-top: 0; padding-top: 0; }
      .message-meta { color: var(--muted); font-size: 12px; overflow-wrap: anywhere; }
      .approval-actions, .retry-action, .source-review-buttons { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
      .source-review-actions { display: grid; gap: 8px; margin-top: 8px; }
      .source-review-actions label { margin: 0; }
      .artifact-proposal-actions { border-top: 1px solid var(--line); display: grid; gap: 8px; margin-top: 8px; padding-top: 8px; }
      .artifact-proposal-actions label { margin: 0; }
      .inline-checkbox { align-items: center; display: flex; flex-direction: row; gap: 8px; }
      .inline-checkbox input { width: auto; }
      .delivery-errors { color: var(--danger); font-size: 12px; margin: 4px 0 0; padding-left: 18px; }
      .artifact-list { display: grid; gap: 6px; }
      .artifact-ref { border: 1px solid var(--line); border-radius: 6px; display: grid; gap: 4px; padding: 8px; }
      .artifact-action { color: var(--accent); font-weight: 700; text-decoration: none; width: fit-content; }
      .source-summary { border: 1px solid var(--line); border-radius: 6px; display: grid; gap: 4px; padding: 8px; }
      .source-summary ul { margin: 0; padding-left: 18px; }
      .wiki-preview { background: #f4f6f8; border-radius: 6px; margin: 0; max-height: 220px; overflow: auto; padding: 8px; white-space: pre-wrap; word-break: break-word; }
      .detail-list { display: grid; gap: 10px; margin: 12px 0 0; }
      .detail-list div { display: grid; grid-template-columns: 120px 1fr; gap: 10px; }
      dt { color: var(--muted); font-size: 13px; }
      dd { margin: 0; overflow-wrap: anywhere; }
      .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .form-grid label:last-child { grid-column: 1 / -1; }
      @media (max-width: 760px) {
        header { align-items: flex-start; flex-direction: column; }
        .layout { grid-template-columns: 1fr; }
        aside { border-right: 0; border-bottom: 1px solid var(--line); }
        .form-grid { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div>
          <h1>Entangle User Client</h1>
          <div class="meta">User Node ${escapeHtml(state.userNodeId)} - Graph ${escapeHtml(state.graphId)} - ${escapeHtml(state.graphRevisionId)}</div>
        </div>
        <div class="status-pill" data-live-status>${escapeHtml(state.generatedAt ?? "projection unavailable")}</div>
      </header>
      <div class="layout">
        <aside>
          <h2>Conversations</h2>
          <div class="conversation-list">${conversationList}</div>
        </aside>
        <div class="workspace">
          ${input.notice ? `<section class="notice">${escapeHtml(input.notice)}</section>` : ""}
          ${errorMessage ? `<section class="error">${escapeHtml(errorMessage)}</section>` : ""}
          <section>
            <h2>Selected Thread</h2>
            ${selectedConversationPanel}
          </section>
          <section>
            <h2>Runtime</h2>
            <dl class="detail-list">
              <div><dt>Identity</dt><dd>${escapeHtml(state.runtime.identityPublicKey)}</dd></div>
              <div><dt>Host API</dt><dd>${escapeHtml(state.runtime.hostApiBaseUrl ?? (state.runtime.hostApiConfigured ? "configured" : "not configured"))}</dd></div>
              <div><dt>Primary relay</dt><dd>${escapeHtml(state.runtime.primaryRelayProfileRef ?? "none")}</dd></div>
              <div><dt>Relays</dt><dd>${escapeHtml(relayList)}</dd></div>
              <div><dt>Targets</dt><dd>${escapeHtml(state.targets.map((target) => target.nodeId).join(", ") || "none")}</dd></div>
            </dl>
          </section>
          <section>
            <h2>Wiki</h2>
            ${wikiRefs}
          </section>
          ${selectedConversationHistory?.error ? `<section class="error">${escapeHtml(selectedConversationHistory.error)}</section>` : ""}
          <section>
            <h2>Messages</h2>
            ${messageHistory}
          </section>
          <section>
            <h2>Message</h2>
            <form method="post" action="/messages">
              ${selectedConversation ? `<input type="hidden" name="conversationId" value="${escapeHtml(selectedConversation.conversationId)}" />${selectedConversation.sessionId ? `<input type="hidden" name="sessionId" value="${escapeHtml(selectedConversation.sessionId)}" />` : ""}` : ""}
              <div class="form-grid">
                <label>Target
                  <select name="targetNodeId" required>${targetOptions}</select>
                </label>
                <label>Type
                  <select name="messageType">${messageTypeOptions}</select>
                </label>
                <label>Summary
                  <textarea name="summary" rows="7" required></textarea>
                </label>
              </div>
              <button type="submit" ${state.targets.length === 0 ? "disabled" : ""}>Send</button>
            </form>
          </section>
        </div>
      </div>
    </main>
    ${liveRefreshScript}
  </body>
</html>`;
}

async function renderSourceChangeCandidateDiffPage(input: {
  candidateId: string;
  conversationId?: string | undefined;
  hostApi?: RunnerJoinHostApi | undefined;
  nodeId: string;
  parentMessageId?: string | undefined;
  sessionId?: string | undefined;
  turnId?: string | undefined;
}): Promise<string> {
  const projection = await fetchHostProjection({ hostApi: input.hostApi });
  const projectedRef = findProjectedSourceChangeRef({
    candidateId: input.candidateId,
    nodeId: input.nodeId,
    projection: projection.detail
  });
  const projectedSummary = projectedRef?.sourceChangeSummary;
  const diff = projectedSummary?.diffExcerpt
    ? undefined
    : await fetchRuntimeSourceChangeCandidateDiff({
        candidateId: input.candidateId,
        hostApi: input.hostApi,
        nodeId: input.nodeId
      });
  const diffDetail = diff?.detail;
  const backHref = input.conversationId
    ? `/?conversationId=${encodeURIComponent(input.conversationId)}`
    : "/";
  const diffResult = diffDetail?.diff;
  const candidate = diffDetail?.candidate;
  const diffBody = projectedSummary?.diffExcerpt
    ? `<section>
          <h2>Diff</h2>
          <div class="meta">projection excerpt${projectedSummary.truncated ? " - truncated" : ""}</div>
          <pre>${escapeHtml(projectedSummary.diffExcerpt)}</pre>
        </section>`
    : diff?.error
      ? `<section class="error">${escapeHtml(diff.error)}</section>`
      : diffResult?.available
        ? `<section>
          <h2>Diff</h2>
          <div class="meta">${escapeHtml(diffResult.contentType)} - ${diffResult.bytesRead} bytes${diffResult.truncated ? " - truncated" : ""}</div>
          <pre>${escapeHtml(diffResult.content)}</pre>
        </section>`
        : `<section class="notice">${escapeHtml(diffResult?.reason ?? projection.error ?? "Source-change diff is unavailable.")}</section>`;
  const summary = projectedSummary ?? candidate?.sourceChangeSummary;
  const candidateStatus = projectedRef?.status ?? candidate?.status;
  const reviewControls =
    input.parentMessageId && input.sessionId && input.turnId
      ? renderSourceChangeReviewControls({
          candidateId: input.candidateId,
          conversationId: input.conversationId,
          nodeId: input.nodeId,
          parentMessageId: input.parentMessageId,
          review: candidate?.review,
          sessionId: input.sessionId,
          status: candidateStatus,
          turnId: input.turnId
        })
      : "";
  const summaryBody = summary
    ? `<section>
        <h2>Summary</h2>
        <div class="meta">${summary.fileCount} files - ${summary.additions} additions - ${summary.deletions} deletions${summary.truncated ? " - truncated" : ""}</div>
        ${
          summary.files.length > 0
            ? `<ul>${summary.files
                .map(
                  (file) =>
                    `<li>${escapeHtml(file.status)} ${escapeHtml(file.path)} +${file.additions} -${file.deletions}</li>`
                )
                .join("")}</ul>`
            : ""
        }
      </section>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Entangle Source Diff - ${escapeHtml(input.candidateId)}</title>
    <style>
      :root { color-scheme: light; --ink: #202327; --muted: #626a73; --line: #d9dee5; --panel: #ffffff; --page: #f4f6f8; --accent: #1f8a70; --danger: #b1453d; }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--page); color: var(--ink); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      main { display: grid; gap: 16px; margin: 0 auto; max-width: 960px; padding: 24px; }
      header, section { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 16px; }
      h1, h2 { margin: 0; line-height: 1.1; }
      h1 { font-size: 20px; }
      h2 { font-size: 15px; margin-bottom: 10px; }
      a { color: var(--accent); font-weight: 700; text-decoration: none; }
      pre { background: #111418; border-radius: 7px; color: #eef3f7; margin: 12px 0 0; max-height: 70vh; overflow: auto; padding: 14px; white-space: pre-wrap; word-break: break-word; }
      label { display: grid; gap: 6px; margin: 0 0 12px; color: var(--muted); font-size: 13px; }
      textarea, button { font: inherit; border-radius: 7px; border: 1px solid var(--line); padding: 10px; min-width: 0; }
      textarea { width: 100%; background: #fff; color: var(--ink); resize: vertical; }
      button { background: var(--accent); border-color: var(--accent); color: #fff; cursor: pointer; font-weight: 700; }
      ul { margin: 10px 0 0; padding-left: 20px; }
      li { margin: 4px 0; overflow-wrap: anywhere; }
      .meta { color: var(--muted); font-size: 13px; overflow-wrap: anywhere; }
      .notice { border-color: rgba(31, 138, 112, .28); background: #ecf8f4; }
      .error { border-color: rgba(177, 69, 61, .35); background: #fff1f0; color: var(--danger); }
      .danger-button { background: var(--danger); border-color: var(--danger); }
      .source-review-actions { display: grid; gap: 8px; }
      .source-review-actions label { margin: 0; }
      .source-review-buttons { display: flex; flex-wrap: wrap; gap: 8px; }
    </style>
  </head>
  <body>
    <main>
      <header>
        <a href="${escapeHtml(backHref)}">Back to conversation</a>
        <h1>${escapeHtml(input.candidateId)}</h1>
        <div class="meta">Runtime ${escapeHtml(input.nodeId)}${projectedRef?.status || candidate?.status ? ` - ${escapeHtml(projectedRef?.status ?? candidate?.status ?? "")}` : ""}</div>
      </header>
      <section>
        <h2>Review</h2>
        ${reviewControls}
      </section>
      ${summaryBody}
      ${diffBody}
    </main>
  </body>
</html>`;
}

async function renderArtifactPreviewPage(input: {
  artifactId: string;
  conversationId?: string | undefined;
  hostApi?: RunnerJoinHostApi | undefined;
  nodeId: string;
  visibleArtifact?: ArtifactRef | undefined;
}): Promise<string> {
  const projection = await fetchHostProjection({ hostApi: input.hostApi });
  const projectedRef = findProjectedArtifactRef({
    artifactId: input.artifactId,
    nodeId: input.nodeId,
    projection: projection.detail
  });
  const preview = projectedRef?.artifactPreview
    ? undefined
    : await fetchRuntimeArtifactPreview({
        artifactId: input.artifactId,
        hostApi: input.hostApi,
        nodeId: input.nodeId
      });
  const previewDetail = preview?.detail;
  const backHref = input.conversationId
    ? `/?conversationId=${encodeURIComponent(input.conversationId)}`
    : "/";
  const artifact =
    projectedRef?.artifactRef ?? previewDetail?.artifact.ref ?? input.visibleArtifact;
  const previewResult = projectedRef?.artifactPreview ?? previewDetail?.preview;
  const previewBody = preview?.error
    ? `<section class="error">${escapeHtml(preview.error)}</section>`
    : previewResult?.available
      ? `<section>
          <h2>Preview</h2>
          <div class="meta">${projectedRef?.artifactPreview ? "projection excerpt - " : ""}${escapeHtml(previewResult.contentType)} - ${previewResult.bytesRead} bytes${previewResult.truncated ? " - truncated" : ""}</div>
          <pre>${escapeHtml(previewResult.content)}</pre>
        </section>`
      : `<section class="notice">${escapeHtml(previewResult?.reason ?? projection.error ?? "Artifact preview is unavailable.")}</section>`;
  const artifactDetailBody = artifact
    ? `<section>
        <h2>Reference</h2>
        <div class="meta">${escapeHtml(artifact.backend)}${artifact.artifactKind ? ` - ${escapeHtml(artifact.artifactKind)}` : ""}${artifact.status ? ` - ${escapeHtml(artifact.status)}` : ""}</div>
        ${artifact.contentSummary ? `<p>${escapeHtml(artifact.contentSummary)}</p>` : ""}
        <div class="meta">${escapeHtml(renderArtifactLocator(artifact))}</div>
      </section>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Entangle Artifact Preview - ${escapeHtml(input.artifactId)}</title>
    <style>
      :root { color-scheme: light; --ink: #202327; --muted: #626a73; --line: #d9dee5; --panel: #ffffff; --page: #f4f6f8; --accent: #1f8a70; --danger: #b1453d; }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--page); color: var(--ink); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      main { display: grid; gap: 16px; margin: 0 auto; max-width: 960px; padding: 24px; }
      header, section { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 16px; }
      h1, h2 { margin: 0; line-height: 1.1; }
      h1 { font-size: 20px; }
      h2 { font-size: 15px; margin-bottom: 10px; }
      a { color: var(--accent); font-weight: 700; text-decoration: none; }
      pre { background: #111418; border-radius: 7px; color: #eef3f7; margin: 12px 0 0; max-height: 70vh; overflow: auto; padding: 14px; white-space: pre-wrap; word-break: break-word; }
      .meta { color: var(--muted); font-size: 13px; overflow-wrap: anywhere; }
      .notice { border-color: rgba(31, 138, 112, .28); background: #ecf8f4; }
      .error { border-color: rgba(177, 69, 61, .35); background: #fff1f0; color: var(--danger); }
    </style>
  </head>
  <body>
    <main>
      <header>
        <a href="${escapeHtml(backHref)}">Back to conversation</a>
        <h1>${escapeHtml(input.artifactId)}</h1>
        <div class="meta">Runtime ${escapeHtml(input.nodeId)}${artifact?.backend ? ` - ${escapeHtml(artifact.backend)}` : ""}${artifact?.artifactKind ? ` - ${escapeHtml(artifact.artifactKind)}` : ""}</div>
      </header>
      ${artifactDetailBody}
      ${previewBody}
    </main>
  </body>
</html>`;
}

export async function startHumanInterfaceRuntime(input: {
  context: EffectiveRuntimeContext;
  hostApi?: RunnerJoinHostApi | undefined;
  transport?: RunnerTransport | undefined;
}): Promise<HumanInterfaceRuntimeHandle> {
  const listenHost =
    process.env.ENTANGLE_HUMAN_INTERFACE_HOST?.trim() || "127.0.0.1";
  const listenPort = normalizeListenPort();
  const basicAuth = normalizeHumanInterfaceBasicAuth();
  const userClientStaticRoot = normalizeUserClientStaticDir();
  const inboundTransport =
    input.transport ?? (await createHumanInterfaceTransport(input.context));
  const ownsInboundTransport = !input.transport && inboundTransport !== undefined;
  let inboundSubscription: RunnerTransportSubscription | undefined;
  const server = createServer((request, response) => {
    void (async () => {
      const requestUrl = new URL(
        request.url ?? "/",
        `http://${request.headers.host ?? "127.0.0.1"}`
      );

      if (request.method === "GET" && requestUrl.pathname === "/health") {
        writeJson(response, 200, {
          nodeId: input.context.binding.node.nodeId,
          ok: true,
          runtimeKind: "human_interface"
        });
        return;
      }

      if (
        basicAuth &&
        !isHumanInterfaceBasicAuthAuthorized({
          authorization:
            typeof request.headers.authorization === "string"
              ? request.headers.authorization
              : undefined,
          basicAuth
        })
      ) {
        writeHumanInterfaceUnauthorized(response);
        return;
      }

      if (request.method === "GET" && requestUrl.pathname === "/api/state") {
        writeJson(
          response,
          200,
          await buildUserClientState({
            context: input.context,
            hostApi: input.hostApi
          })
        );
        return;
      }

      if (
        request.method === "GET" &&
        userClientStaticRoot &&
        isUserClientStaticRequest(requestUrl.pathname) &&
        (await tryWriteStaticUserClient({
          pathname: requestUrl.pathname,
          response,
          staticRoot: userClientStaticRoot
        }))
      ) {
        return;
      }

      const apiConversationMatch = requestUrl.pathname.match(
        /^\/api\/conversations\/([^/]+)$/u
      );

      if (request.method === "GET" && apiConversationMatch) {
        const conversationId = decodeURIComponent(apiConversationMatch[1] ?? "");
        const conversation = await fetchUserNodeConversation({
          conversationId,
          hostApi: input.hostApi,
          userNodeId: input.context.binding.node.nodeId
        });

        if (conversation.error || !conversation.detail) {
          writeJson(response, 502, {
            error: conversation.error ?? "Conversation detail is unavailable."
          });
          return;
        }

        writeJson(response, 200, conversation.detail);
        return;
      }

      const apiConversationReadMatch = requestUrl.pathname.match(
        /^\/api\/conversations\/([^/]+)\/read$/u
      );

      if (request.method === "POST" && apiConversationReadMatch) {
        const conversationId = decodeURIComponent(
          apiConversationReadMatch[1] ?? ""
        );
        const readState = await markUserClientConversationRead({
          conversationId,
          context: input.context,
          hostApi: input.hostApi
        });

        if (readState.error || !readState.detail) {
          writeJson(response, readState.statusCode ?? 502, {
            error: readState.error ?? "Conversation read state is unavailable."
          });
          return;
        }

        writeJson(response, 200, {
          ...readState.detail,
          ...(readState.readReceiptError
            ? { readReceiptError: readState.readReceiptError }
            : {})
        });
        return;
      }

      if (request.method === "POST" && requestUrl.pathname === "/api/messages") {
        let publishRequest;

        try {
          publishRequest = userNodeMessagePublishRequestSchema.parse(
            await readRequestJson(request)
          );
        } catch (error) {
          writeJson(response, 400, {
            error:
              error instanceof Error
                ? error.message
                : "User Client message request is invalid."
          });
          return;
        }

        try {
          writeJson(
            response,
            200,
            await publishUserNodeMessage({
              approval: publishRequest.approval,
              artifactRefs: publishRequest.artifactRefs,
              conversationId: publishRequest.conversationId,
              hostApi: input.hostApi,
              intent: publishRequest.intent,
              messageType: publishRequest.messageType,
              parentMessageId: publishRequest.parentMessageId,
              responsePolicy: publishRequest.responsePolicy,
              sessionId: publishRequest.sessionId,
              summary: publishRequest.summary,
              targetNodeId: publishRequest.targetNodeId,
              turnId: publishRequest.turnId,
              userNodeId: input.context.binding.node.nodeId
            })
          );
        } catch (error) {
          writeJson(response, 502, {
            error:
              error instanceof Error
                ? error.message
                : "User Client message publish failed."
          });
        }
        return;
      }

      if (
        request.method === "GET" &&
        requestUrl.pathname === "/api/artifacts/preview"
      ) {
        const nodeId = requestUrl.searchParams.get("nodeId")?.trim() ?? "";
        const artifactId =
          requestUrl.searchParams.get("artifactId")?.trim() ?? "";
        const conversationId =
          requestUrl.searchParams.get("conversationId")?.trim() || undefined;

        if (!nodeId || !artifactId) {
          writeJson(response, 400, {
            error: "Runtime node and artifact id are required."
          });
          return;
        }

        const visibleArtifact = await resolveUserClientVisibleArtifactRef({
          artifactId,
          conversationId,
          hostApi: input.hostApi,
          nodeId,
          userNodeId: input.context.binding.node.nodeId
        });

        if ("error" in visibleArtifact) {
          writeJson(response, visibleArtifact.statusCode, {
            error: visibleArtifact.error
          });
          return;
        }

        writeJson(
          response,
          200,
          await buildUserClientArtifactPreview({
            artifactId,
            hostApi: input.hostApi,
            nodeId,
            visibleArtifact: visibleArtifact.artifact
          })
        );
        return;
      }

      if (
        request.method === "GET" &&
        requestUrl.pathname === "/api/artifacts/history"
      ) {
        const nodeId = requestUrl.searchParams.get("nodeId")?.trim() ?? "";
        const artifactId =
          requestUrl.searchParams.get("artifactId")?.trim() ?? "";
        const conversationId =
          requestUrl.searchParams.get("conversationId")?.trim() || undefined;

        if (!nodeId || !artifactId) {
          writeJson(response, 400, {
            error: "Runtime node and artifact id are required."
          });
          return;
        }

        const visibleArtifact = await resolveUserClientVisibleArtifactRef({
          artifactId,
          conversationId,
          hostApi: input.hostApi,
          nodeId,
          userNodeId: input.context.binding.node.nodeId
        });

        if ("error" in visibleArtifact) {
          writeJson(response, visibleArtifact.statusCode, {
            error: visibleArtifact.error
          });
          return;
        }

        writeJson(
          response,
          200,
          await buildUserClientArtifactHistory({
            artifactId,
            hostApi: input.hostApi,
            nodeId,
            visibleArtifact: visibleArtifact.artifact
          })
        );
        return;
      }

      if (
        request.method === "GET" &&
        requestUrl.pathname === "/api/artifacts/diff"
      ) {
        const nodeId = requestUrl.searchParams.get("nodeId")?.trim() ?? "";
        const artifactId =
          requestUrl.searchParams.get("artifactId")?.trim() ?? "";
        const conversationId =
          requestUrl.searchParams.get("conversationId")?.trim() || undefined;

        if (!nodeId || !artifactId) {
          writeJson(response, 400, {
            error: "Runtime node and artifact id are required."
          });
          return;
        }

        const visibleArtifact = await resolveUserClientVisibleArtifactRef({
          artifactId,
          conversationId,
          hostApi: input.hostApi,
          nodeId,
          userNodeId: input.context.binding.node.nodeId
        });

        if ("error" in visibleArtifact) {
          writeJson(response, visibleArtifact.statusCode, {
            error: visibleArtifact.error
          });
          return;
        }

        writeJson(
          response,
          200,
          await buildUserClientArtifactDiff({
            artifactId,
            hostApi: input.hostApi,
            nodeId,
            visibleArtifact: visibleArtifact.artifact
          })
        );
        return;
      }

      if (
        request.method === "POST" &&
        requestUrl.pathname === "/api/artifacts/restore"
      ) {
        let restoreRequest: UserClientArtifactRestoreRequest;

        try {
          restoreRequest =
            (await readRequestJson(request)) as UserClientArtifactRestoreRequest;
        } catch (error) {
          writeJson(response, 400, {
            error:
              error instanceof Error
                ? error.message
                : "Artifact restore request is invalid."
          });
          return;
        }

        const artifactId =
          typeof restoreRequest.artifactId === "string"
            ? restoreRequest.artifactId.trim()
            : "";
        const conversationId =
          typeof restoreRequest.conversationId === "string"
            ? restoreRequest.conversationId.trim()
            : "";
        const nodeId =
          typeof restoreRequest.nodeId === "string"
            ? restoreRequest.nodeId.trim()
            : "";
        const reason =
          typeof restoreRequest.reason === "string" &&
          restoreRequest.reason.trim().length > 0
            ? restoreRequest.reason.trim()
            : undefined;
        const restoreId =
          typeof restoreRequest.restoreId === "string" &&
          restoreRequest.restoreId.trim().length > 0
            ? restoreRequest.restoreId.trim()
            : undefined;

        if (!nodeId || !artifactId || !conversationId) {
          writeJson(response, 400, {
            error: "Runtime node, artifact id, and conversation are required."
          });
          return;
        }

        const visibleArtifact = await resolveUserClientVisibleArtifactRef({
          artifactId,
          conversationId,
          hostApi: input.hostApi,
          nodeId,
          userNodeId: input.context.binding.node.nodeId
        });

        if ("error" in visibleArtifact) {
          writeJson(response, visibleArtifact.statusCode, {
            error: visibleArtifact.error
          });
          return;
        }

        const restore = await requestRuntimeArtifactRestore({
          artifactId,
          hostApi: input.hostApi,
          nodeId,
          reason,
          restoreId,
          userNodeId: input.context.binding.node.nodeId,
          visibleArtifact: visibleArtifact.artifact
        });

        if (restore.error || !restore.detail) {
          writeJson(response, restore.statusCode ?? 502, {
            error: restore.error ?? "Artifact restore request failed."
          });
          return;
        }

        writeJson(response, 200, restore.detail);
        return;
      }

      if (
        request.method === "POST" &&
        requestUrl.pathname === "/api/artifacts/source-change-proposal"
      ) {
        let proposalRequest: UserClientArtifactSourceProposalRequest;

        try {
          proposalRequest =
            (await readRequestJson(request)) as UserClientArtifactSourceProposalRequest;
        } catch (error) {
          writeJson(response, 400, {
            error:
              error instanceof Error
                ? error.message
                : "Artifact source-change proposal request is invalid."
          });
          return;
        }

        const artifactId =
          typeof proposalRequest.artifactId === "string"
            ? proposalRequest.artifactId.trim()
            : "";
        const conversationId =
          typeof proposalRequest.conversationId === "string"
            ? proposalRequest.conversationId.trim()
            : "";
        const nodeId =
          typeof proposalRequest.nodeId === "string"
            ? proposalRequest.nodeId.trim()
            : "";
        const overwrite = proposalRequest.overwrite === true;
        const proposalId =
          typeof proposalRequest.proposalId === "string" &&
          proposalRequest.proposalId.trim().length > 0
            ? proposalRequest.proposalId.trim()
            : undefined;
        const reason =
          typeof proposalRequest.reason === "string" &&
          proposalRequest.reason.trim().length > 0
            ? proposalRequest.reason.trim()
            : undefined;
        const targetPath =
          typeof proposalRequest.targetPath === "string" &&
          proposalRequest.targetPath.trim().length > 0
            ? proposalRequest.targetPath.trim()
            : undefined;

        if (!nodeId || !artifactId || !conversationId) {
          writeJson(response, 400, {
            error: "Runtime node, artifact id, and conversation are required."
          });
          return;
        }

        const visibleArtifact = await resolveUserClientVisibleArtifactRef({
          artifactId,
          conversationId,
          hostApi: input.hostApi,
          nodeId,
          userNodeId: input.context.binding.node.nodeId
        });

        if ("error" in visibleArtifact) {
          writeJson(response, visibleArtifact.statusCode, {
            error: visibleArtifact.error
          });
          return;
        }

        const proposal = await requestRuntimeArtifactSourceProposal({
          artifactId,
          hostApi: input.hostApi,
          nodeId,
          overwrite,
          proposalId,
          reason,
          targetPath,
          userNodeId: input.context.binding.node.nodeId,
          visibleArtifact: visibleArtifact.artifact
        });

        if (proposal.error || !proposal.detail) {
          writeJson(response, proposal.statusCode ?? 502, {
            error: proposal.error ?? "Artifact source-change proposal failed."
          });
          return;
        }

        writeJson(response, 200, proposal.detail);
        return;
      }

      if (
        request.method === "POST" &&
        requestUrl.pathname === "/api/wiki/pages"
      ) {
        let upsertRequest: UserClientWikiPageUpsertRequest;

        try {
          upsertRequest =
            (await readRequestJson(request)) as UserClientWikiPageUpsertRequest;
        } catch (error) {
          writeJson(response, 400, {
            error:
              error instanceof Error
                ? error.message
                : "Wiki page mutation request is invalid."
          });
          return;
        }

        const conversationId =
          typeof upsertRequest.conversationId === "string"
            ? upsertRequest.conversationId.trim()
            : "";
        const nodeId =
          typeof upsertRequest.nodeId === "string"
            ? upsertRequest.nodeId.trim()
            : "";
        const pagePath =
          typeof upsertRequest.path === "string"
            ? upsertRequest.path.trim()
            : "";
        const content =
          typeof upsertRequest.content === "string"
            ? upsertRequest.content
            : undefined;
        const mode =
          upsertRequest.mode === undefined
            ? "replace"
            : upsertRequest.mode === "append" || upsertRequest.mode === "replace"
              ? upsertRequest.mode
              : undefined;
        const reason =
          typeof upsertRequest.reason === "string" &&
          upsertRequest.reason.trim().length > 0
            ? upsertRequest.reason.trim()
            : undefined;

        if (!nodeId || !conversationId) {
          writeJson(response, 400, {
            error: "Runtime node and conversation are required."
          });
          return;
        }

        if (content === undefined) {
          writeJson(response, 400, {
            error: "Wiki page content is required."
          });
          return;
        }

        if (!mode) {
          writeJson(response, 400, {
            error: "Wiki page mutation mode is invalid."
          });
          return;
        }

        const visibleWikiPage = await resolveUserClientVisibleWikiPage({
          conversationId,
          hostApi: input.hostApi,
          nodeId,
          path: pagePath,
          userNodeId: input.context.binding.node.nodeId
        });

        if ("error" in visibleWikiPage) {
          writeJson(response, visibleWikiPage.statusCode, {
            error: visibleWikiPage.error
          });
          return;
        }

        const mutation = await requestRuntimeWikiPageUpsert({
          content,
          hostApi: input.hostApi,
          mode,
          nodeId,
          path: visibleWikiPage.path,
          reason,
          userNodeId: input.context.binding.node.nodeId,
          wikiRefs: visibleWikiPage.wikiRefs
        });

        if (mutation.error || !mutation.detail) {
          writeJson(response, mutation.statusCode ?? 502, {
            error: mutation.error ?? "Wiki page mutation request failed."
          });
          return;
        }

        writeJson(response, 200, mutation.detail);
        return;
      }

      if (
        request.method === "POST" &&
        requestUrl.pathname === "/api/wiki-repository/publish"
      ) {
        let publishRequest: UserClientWikiPublishRequest;

        try {
          publishRequest =
            (await readRequestJson(request)) as UserClientWikiPublishRequest;
        } catch (error) {
          writeJson(response, 400, {
            error:
              error instanceof Error
                ? error.message
                : "Wiki publication request is invalid."
          });
          return;
        }

        const conversationId =
          typeof publishRequest.conversationId === "string"
            ? publishRequest.conversationId.trim()
            : "";
        const nodeId =
          typeof publishRequest.nodeId === "string"
            ? publishRequest.nodeId.trim()
            : "";
        const reason =
          typeof publishRequest.reason === "string" &&
          publishRequest.reason.trim().length > 0
            ? publishRequest.reason.trim()
            : undefined;
        const retryFailedPublication =
          publishRequest.retryFailedPublication === true;
        const target =
          publishRequest.target === undefined
            ? undefined
            : gitRepositoryTargetSelectorSchema.safeParse(publishRequest.target);

        if (!nodeId || !conversationId) {
          writeJson(response, 400, {
            error: "Runtime node and conversation are required."
          });
          return;
        }

        if (target && !target.success) {
          writeJson(response, 400, {
            error: "Wiki publication target is invalid."
          });
          return;
        }

        const visibleWikiRefs = await resolveUserClientVisibleWikiRefs({
          conversationId,
          hostApi: input.hostApi,
          nodeId,
          ...(target?.success ? { target: target.data } : {}),
          userNodeId: input.context.binding.node.nodeId
        });

        if ("error" in visibleWikiRefs) {
          writeJson(response, visibleWikiRefs.statusCode, {
            error: visibleWikiRefs.error
          });
          return;
        }

        const publication = await requestRuntimeWikiPublication({
          hostApi: input.hostApi,
          nodeId,
          reason,
          retryFailedPublication,
          ...(target?.success ? { target: target.data } : {}),
          userNodeId: input.context.binding.node.nodeId,
          wikiRefs: visibleWikiRefs.wikiRefs
        });

        if (publication.error || !publication.detail) {
          writeJson(response, publication.statusCode ?? 502, {
            error: publication.error ?? "Wiki publication request failed."
          });
          return;
        }

        writeJson(response, 200, publication.detail);
        return;
      }

      if (
        request.method === "POST" &&
        requestUrl.pathname === "/api/source-history/publish"
      ) {
        let publishRequest: UserClientSourceHistoryPublishRequest;

        try {
          publishRequest =
            (await readRequestJson(request)) as UserClientSourceHistoryPublishRequest;
        } catch (error) {
          writeJson(response, 400, {
            error:
              error instanceof Error
                ? error.message
                : "Source-history publication request is invalid."
          });
          return;
        }

        const conversationId =
          typeof publishRequest.conversationId === "string"
            ? publishRequest.conversationId.trim()
            : "";
        const nodeId =
          typeof publishRequest.nodeId === "string"
            ? publishRequest.nodeId.trim()
            : "";
        const reason =
          typeof publishRequest.reason === "string" &&
          publishRequest.reason.trim().length > 0
            ? publishRequest.reason.trim()
            : undefined;
        const retryFailedPublication =
          publishRequest.retryFailedPublication === true;
        const sourceHistoryId =
          typeof publishRequest.sourceHistoryId === "string"
            ? publishRequest.sourceHistoryId.trim()
            : "";
        const target =
          publishRequest.target === undefined
            ? undefined
            : sourceHistoryPublicationTargetSchema.safeParse(
                publishRequest.target
              );

        if (!nodeId || !sourceHistoryId || !conversationId) {
          writeJson(response, 400, {
            error:
              "Runtime node, source-history id, and conversation are required."
          });
          return;
        }

        if (target && !target.success) {
          writeJson(response, 400, {
            error: "Source-history publication target is invalid."
          });
          return;
        }

        const visibleSourceHistoryRefs =
          await resolveUserClientVisibleSourceHistoryRefs({
            conversationId,
            hostApi: input.hostApi,
            nodeId,
            sourceHistoryId,
            ...(target?.success ? { target: target.data } : {}),
            userNodeId: input.context.binding.node.nodeId
          });

        if ("error" in visibleSourceHistoryRefs) {
          writeJson(response, visibleSourceHistoryRefs.statusCode, {
            error: visibleSourceHistoryRefs.error
          });
          return;
        }

        const publication = await requestRuntimeSourceHistoryPublication({
          hostApi: input.hostApi,
          nodeId,
          reason,
          retryFailedPublication,
          sourceHistoryId,
          sourceHistoryRefs: visibleSourceHistoryRefs.sourceHistoryRefs,
          ...(target?.success ? { target: target.data } : {}),
          userNodeId: input.context.binding.node.nodeId
        });

        if (publication.error || !publication.detail) {
          writeJson(response, publication.statusCode ?? 502, {
            error:
              publication.error ?? "Source-history publication request failed."
          });
          return;
        }

        writeJson(response, 200, publication.detail);
        return;
      }

      if (
        request.method === "POST" &&
        requestUrl.pathname === "/api/source-history/reconcile"
      ) {
        let reconcileRequest: UserClientSourceHistoryReconcileRequest;

        try {
          reconcileRequest =
            (await readRequestJson(request)) as UserClientSourceHistoryReconcileRequest;
        } catch (error) {
          writeJson(response, 400, {
            error:
              error instanceof Error
                ? error.message
                : "Source-history reconcile request is invalid."
          });
          return;
        }

        const conversationId =
          typeof reconcileRequest.conversationId === "string"
            ? reconcileRequest.conversationId.trim()
            : "";
        const nodeId =
          typeof reconcileRequest.nodeId === "string"
            ? reconcileRequest.nodeId.trim()
            : "";
        const reason =
          typeof reconcileRequest.reason === "string" &&
          reconcileRequest.reason.trim().length > 0
            ? reconcileRequest.reason.trim()
            : undefined;
        const approvalId =
          typeof reconcileRequest.approvalId === "string" &&
          reconcileRequest.approvalId.trim().length > 0
            ? reconcileRequest.approvalId.trim()
            : undefined;
        const replayId =
          typeof reconcileRequest.replayId === "string" &&
          reconcileRequest.replayId.trim().length > 0
            ? reconcileRequest.replayId.trim()
            : undefined;
        const sourceHistoryId =
          typeof reconcileRequest.sourceHistoryId === "string"
            ? reconcileRequest.sourceHistoryId.trim()
            : "";

        if (!nodeId || !sourceHistoryId || !conversationId) {
          writeJson(response, 400, {
            error:
              "Runtime node, source-history id, and conversation are required."
          });
          return;
        }

        const visibleSourceHistoryRefs =
          await resolveUserClientVisibleSourceHistoryRefs({
            allowPublicationResources: false,
            conversationId,
            hostApi: input.hostApi,
            nodeId,
            sourceHistoryId,
            userNodeId: input.context.binding.node.nodeId
          });

        if ("error" in visibleSourceHistoryRefs) {
          writeJson(response, visibleSourceHistoryRefs.statusCode, {
            error: visibleSourceHistoryRefs.error
          });
          return;
        }

        const reconcile = await requestRuntimeSourceHistoryReconcile({
          ...(approvalId ? { approvalId } : {}),
          hostApi: input.hostApi,
          nodeId,
          reason,
          ...(replayId ? { replayId } : {}),
          sourceHistoryId,
          sourceHistoryRefs: visibleSourceHistoryRefs.sourceHistoryRefs,
          userNodeId: input.context.binding.node.nodeId
        });

        if (reconcile.error || !reconcile.detail) {
          writeJson(response, reconcile.statusCode ?? 502, {
            error:
              reconcile.error ?? "Source-history reconcile request failed."
          });
          return;
        }

        writeJson(response, 200, reconcile.detail);
        return;
      }

      if (
        request.method === "GET" &&
        requestUrl.pathname === "/api/source-change-candidates/diff"
      ) {
        const nodeId = requestUrl.searchParams.get("nodeId")?.trim() ?? "";
        const candidateId =
          requestUrl.searchParams.get("candidateId")?.trim() ?? "";
        const conversationId =
          requestUrl.searchParams.get("conversationId")?.trim() || undefined;

        if (!nodeId || !candidateId) {
          writeJson(response, 400, {
            error: "Runtime node and source-change candidate are required."
          });
          return;
        }

        const visibleSourceChange = await resolveUserClientVisibleSourceChange({
          candidateId,
          conversationId,
          hostApi: input.hostApi,
          nodeId,
          userNodeId: input.context.binding.node.nodeId
        });

        if ("error" in visibleSourceChange) {
          writeJson(response, visibleSourceChange.statusCode, {
            error: visibleSourceChange.error
          });
          return;
        }

        writeJson(
          response,
          200,
          await buildUserClientSourceChangeDiff({
            candidateId,
            hostApi: input.hostApi,
            nodeId
          })
        );
        return;
      }

      if (
        request.method === "GET" &&
        requestUrl.pathname === "/api/source-change-candidates/file"
      ) {
        const nodeId = requestUrl.searchParams.get("nodeId")?.trim() ?? "";
        const candidateId =
          requestUrl.searchParams.get("candidateId")?.trim() ?? "";
        const filePath = requestUrl.searchParams.get("path")?.trim() ?? "";
        const conversationId =
          requestUrl.searchParams.get("conversationId")?.trim() || undefined;

        if (!nodeId || !candidateId || !filePath) {
          writeJson(response, 400, {
            error:
              "Runtime node, source-change candidate, and source file path are required."
          });
          return;
        }

        const visibleSourceChange = await resolveUserClientVisibleSourceChange({
          candidateId,
          conversationId,
          hostApi: input.hostApi,
          nodeId,
          userNodeId: input.context.binding.node.nodeId
        });

        if ("error" in visibleSourceChange) {
          writeJson(response, visibleSourceChange.statusCode, {
            error: visibleSourceChange.error
          });
          return;
        }

        writeJson(
          response,
          200,
          await buildUserClientSourceChangeFilePreview({
            candidateId,
            hostApi: input.hostApi,
            nodeId,
            path: filePath
          })
        );
        return;
      }

      if (
        request.method === "POST" &&
        requestUrl.pathname === "/api/source-change-candidates/review"
      ) {
        let reviewRequest: UserClientSourceChangeReviewRequest;

        try {
          reviewRequest =
            (await readRequestJson(request)) as UserClientSourceChangeReviewRequest;
        } catch (error) {
          writeJson(response, 400, {
            error:
              error instanceof Error
                ? error.message
                : "Source-change review request is invalid."
          });
          return;
        }

        const candidateId =
          typeof reviewRequest.candidateId === "string"
            ? reviewRequest.candidateId.trim()
            : "";
        const conversationId =
          typeof reviewRequest.conversationId === "string"
            ? reviewRequest.conversationId.trim()
            : "";
        const nodeId =
          typeof reviewRequest.nodeId === "string"
            ? reviewRequest.nodeId.trim()
            : "";
        const parentMessageId =
          typeof reviewRequest.parentMessageId === "string"
            ? reviewRequest.parentMessageId.trim()
            : "";
        const reason =
          typeof reviewRequest.reason === "string" &&
          reviewRequest.reason.trim().length > 0
            ? reviewRequest.reason.trim()
            : undefined;
        const sessionId =
          typeof reviewRequest.sessionId === "string"
            ? reviewRequest.sessionId.trim()
            : "";
        const status = reviewRequest.status;
        const turnId =
          typeof reviewRequest.turnId === "string"
            ? reviewRequest.turnId.trim()
            : undefined;

        if (status !== "accepted" && status !== "rejected") {
          writeJson(response, 400, {
            error: "Source-change review status must be accepted or rejected."
          });
          return;
        }

        if (!nodeId || !candidateId || !conversationId || !parentMessageId || !sessionId) {
          writeJson(response, 400, {
            error:
              "Runtime node, source-change candidate, conversation, parent message, and session are required."
          });
          return;
        }

        const visibleSourceChange = await resolveUserClientVisibleSourceChange({
          candidateId,
          conversationId,
          hostApi: input.hostApi,
          nodeId,
          userNodeId: input.context.binding.node.nodeId
        });

        if ("error" in visibleSourceChange) {
          writeJson(response, visibleSourceChange.statusCode, {
            error: visibleSourceChange.error
          });
          return;
        }

        const review = await publishSourceChangeReviewMessage({
          candidateId,
          conversationId,
          hostApi: input.hostApi,
          nodeId,
          parentMessageId,
          reason,
          sessionId,
          status,
          turnId,
          userNodeId: input.context.binding.node.nodeId
        });

        if (review.error || !review.detail) {
          writeJson(response, review.statusCode ?? 502, {
            error: review.error ?? "Source-change review failed."
          });
          return;
        }

        writeJson(response, 200, review.detail);
        return;
      }

      if (
        request.method === "GET" &&
        requestUrl.pathname === "/artifacts/preview"
      ) {
        const nodeId = requestUrl.searchParams.get("nodeId")?.trim() ?? "";
        const artifactId =
          requestUrl.searchParams.get("artifactId")?.trim() ?? "";
        const conversationId =
          requestUrl.searchParams.get("conversationId")?.trim() || undefined;

        if (!nodeId || !artifactId) {
          writeHtml(
            response,
            400,
            await renderArtifactPreviewPage({
              artifactId: artifactId || "unknown-artifact",
              conversationId,
              hostApi: input.hostApi,
              nodeId: nodeId || "unknown-runtime"
            })
          );
          return;
        }

        const visibleArtifact = await resolveUserClientVisibleArtifactRef({
          artifactId,
          conversationId,
          hostApi: input.hostApi,
          nodeId,
          userNodeId: input.context.binding.node.nodeId
        });

        if ("error" in visibleArtifact) {
          writeHtml(
            response,
            visibleArtifact.statusCode,
            await renderHome({
              context: input.context,
              hostApi: input.hostApi,
              notice: visibleArtifact.error,
              selectedConversationId: conversationId
            })
          );
          return;
        }

        writeHtml(
          response,
          200,
          await renderArtifactPreviewPage({
            artifactId,
            conversationId,
            hostApi: input.hostApi,
            nodeId,
            visibleArtifact: visibleArtifact.artifact
          })
        );
        return;
      }

      if (
        request.method === "GET" &&
        requestUrl.pathname === "/source-change-candidates/diff"
      ) {
        const nodeId = requestUrl.searchParams.get("nodeId")?.trim() ?? "";
        const candidateId =
          requestUrl.searchParams.get("candidateId")?.trim() ?? "";
        const conversationId =
          requestUrl.searchParams.get("conversationId")?.trim() || undefined;
        const parentMessageId =
          requestUrl.searchParams.get("parentMessageId")?.trim() || undefined;
        const sessionId =
          requestUrl.searchParams.get("sessionId")?.trim() || undefined;
        const turnId = requestUrl.searchParams.get("turnId")?.trim() || undefined;

        if (!nodeId || !candidateId) {
          writeHtml(
            response,
            400,
            await renderSourceChangeCandidateDiffPage({
              candidateId: candidateId || "unknown-candidate",
              conversationId,
              hostApi: input.hostApi,
              nodeId: nodeId || "unknown-runtime",
              parentMessageId,
              sessionId,
              turnId
            })
          );
          return;
        }

        const visibleSourceChange = await resolveUserClientVisibleSourceChange({
          candidateId,
          conversationId,
          hostApi: input.hostApi,
          nodeId,
          userNodeId: input.context.binding.node.nodeId
        });

        if ("error" in visibleSourceChange) {
          writeHtml(
            response,
            visibleSourceChange.statusCode,
            await renderHome({
              context: input.context,
              hostApi: input.hostApi,
              notice: visibleSourceChange.error,
              selectedConversationId: conversationId
            })
          );
          return;
        }

        writeHtml(
          response,
          200,
          await renderSourceChangeCandidateDiffPage({
            candidateId,
            conversationId,
            hostApi: input.hostApi,
            nodeId,
            parentMessageId,
            sessionId,
            turnId
          })
        );
        return;
      }

      if (
        request.method === "POST" &&
        requestUrl.pathname === "/source-change-candidates/review"
      ) {
        let selectedConversationIdForError: string | undefined;

        try {
          const form = new URLSearchParams(await readRequestBody(request));
          const candidateId = form.get("candidateId")?.trim() ?? "";
          const conversationId =
            form.get("conversationId")?.trim() ?? "";
          const nodeId = form.get("nodeId")?.trim() ?? "";
          const parentMessageId = form.get("parentMessageId")?.trim() ?? "";
          const reason = form.get("reason")?.trim() || undefined;
          const sessionId = form.get("sessionId")?.trim() ?? "";
          const rawStatus = form.get("status")?.trim();
          const turnId = form.get("turnId")?.trim() || undefined;
          selectedConversationIdForError = conversationId;

          if (rawStatus !== "accepted" && rawStatus !== "rejected") {
            writeHtml(
              response,
              400,
              await renderHome({
                context: input.context,
                hostApi: input.hostApi,
                notice:
                  "Source-change review status must be accepted or rejected.",
                selectedConversationId: conversationId
              })
            );
            return;
          }

          if (!nodeId || !candidateId || !conversationId || !parentMessageId || !sessionId) {
            writeHtml(
              response,
              400,
              await renderHome({
                context: input.context,
                hostApi: input.hostApi,
                notice:
                  "Runtime node, source-change candidate, conversation, parent message, and session are required.",
                selectedConversationId: conversationId
              })
            );
            return;
          }

          const visibleSourceChange =
            await resolveUserClientVisibleSourceChange({
              candidateId,
              conversationId,
              hostApi: input.hostApi,
              nodeId,
              userNodeId: input.context.binding.node.nodeId
            });

          if ("error" in visibleSourceChange) {
            writeHtml(
              response,
              visibleSourceChange.statusCode,
              await renderHome({
                context: input.context,
                hostApi: input.hostApi,
                notice: visibleSourceChange.error,
                selectedConversationId: conversationId
              })
            );
            return;
          }

          const review = await publishSourceChangeReviewMessage({
            candidateId,
            conversationId,
            hostApi: input.hostApi,
            nodeId,
            parentMessageId,
            reason,
            sessionId,
            status: rawStatus,
            turnId,
            userNodeId: input.context.binding.node.nodeId
          });

          if (review.error) {
            writeHtml(
              response,
              review.statusCode ?? 500,
              await renderHome({
                context: input.context,
                hostApi: input.hostApi,
                notice: review.error,
                selectedConversationId: conversationId
              })
            );
            return;
          }

          writeHtml(
            response,
            200,
            await renderHome({
              context: input.context,
              hostApi: input.hostApi,
              notice:
                review.detail?.deliveryStatus === "failed"
                  ? `Recorded source review ${review.detail.eventId}, but relay delivery failed.`
                  : review.detail?.deliveryStatus === "partial"
                    ? `Published source review ${review.detail.eventId} to ${review.detail.publishedRelays.length}/${review.detail.relayUrls.length} relays.`
                    : `Published source review ${review.detail?.eventId ?? candidateId}.`,
              selectedConversationId: conversationId
            })
          );
        } catch (error) {
          writeHtml(
            response,
            500,
            await renderHome({
              context: input.context,
              hostApi: input.hostApi,
              notice:
                error instanceof Error
                  ? error.message
                  : "Source-change review failed.",
              selectedConversationId: selectedConversationIdForError
            })
          );
        }
        return;
      }

      if (
        request.method === "POST" &&
        requestUrl.pathname === "/artifacts/source-change-proposal"
      ) {
        let selectedConversationIdForError: string | undefined;

        try {
          const form = new URLSearchParams(await readRequestBody(request));
          const artifactId = form.get("artifactId")?.trim() ?? "";
          const conversationId = form.get("conversationId")?.trim() ?? "";
          const nodeId = form.get("nodeId")?.trim() ?? "";
          const overwrite = form.get("overwrite") === "true";
          const reason = form.get("reason")?.trim() || undefined;
          const targetPath = form.get("targetPath")?.trim() || undefined;
          selectedConversationIdForError = conversationId;

          if (!nodeId || !artifactId || !conversationId) {
            writeHtml(
              response,
              400,
              await renderHome({
                context: input.context,
                hostApi: input.hostApi,
                notice:
                  "Runtime node, artifact id, and conversation are required.",
                selectedConversationId: conversationId
              })
            );
            return;
          }

          const visibleArtifact = await resolveUserClientVisibleArtifactRef({
            artifactId,
            conversationId,
            hostApi: input.hostApi,
            nodeId,
            userNodeId: input.context.binding.node.nodeId
          });

          if ("error" in visibleArtifact) {
            writeHtml(
              response,
              visibleArtifact.statusCode,
              await renderHome({
                context: input.context,
                hostApi: input.hostApi,
                notice: visibleArtifact.error,
                selectedConversationId: conversationId
              })
            );
            return;
          }

          const proposal = await requestRuntimeArtifactSourceProposal({
            artifactId,
            hostApi: input.hostApi,
            nodeId,
            overwrite,
            reason,
            targetPath,
            userNodeId: input.context.binding.node.nodeId,
            visibleArtifact: visibleArtifact.artifact
          });

          if (proposal.error || !proposal.detail) {
            writeHtml(
              response,
              proposal.statusCode ?? 502,
              await renderHome({
                context: input.context,
                hostApi: input.hostApi,
                notice:
                  proposal.error ?? "Artifact source-change proposal failed.",
                selectedConversationId: conversationId
              })
            );
            return;
          }

          writeHtml(
            response,
            200,
            await renderHome({
              context: input.context,
              hostApi: input.hostApi,
              notice: `Requested source-change proposal ${proposal.detail.proposalId ?? proposal.detail.commandId} for ${proposal.detail.artifactId}.`,
              selectedConversationId: conversationId
            })
          );
        } catch (error) {
          writeHtml(
            response,
            500,
            await renderHome({
              context: input.context,
              hostApi: input.hostApi,
              notice:
                error instanceof Error
                  ? error.message
                  : "Artifact source-change proposal failed.",
              selectedConversationId: selectedConversationIdForError
            })
          );
        }
        return;
      }

      if (
        request.method === "POST" &&
        requestUrl.pathname === "/source-history/publish"
      ) {
        let selectedConversationIdForError: string | undefined;

        try {
          const form = new URLSearchParams(await readRequestBody(request));
          const conversationId = form.get("conversationId")?.trim() ?? "";
          const nodeId = form.get("nodeId")?.trim() ?? "";
          const reason = form.get("reason")?.trim() || undefined;
          const retryFailedPublication =
            form.get("retryFailedPublication") === "true";
          const sourceHistoryId = form.get("sourceHistoryId")?.trim() ?? "";
          const targetForm = {
            gitServiceRef: form.get("targetGitServiceRef")?.trim() || undefined,
            namespace: form.get("targetNamespace")?.trim() || undefined,
            repositoryName:
              form.get("targetRepositoryName")?.trim() || undefined
          };
          const hasTargetForm =
            targetForm.gitServiceRef ||
            targetForm.namespace ||
            targetForm.repositoryName;
          const target = hasTargetForm
            ? sourceHistoryPublicationTargetSchema.safeParse(targetForm)
            : undefined;
          selectedConversationIdForError = conversationId;

          if (!nodeId || !sourceHistoryId || !conversationId) {
            writeHtml(
              response,
              400,
              await renderHome({
                context: input.context,
                hostApi: input.hostApi,
                notice:
                  "Runtime node, source-history id, and conversation are required.",
                selectedConversationId: conversationId
              })
            );
            return;
          }

          if (target && !target.success) {
            writeHtml(
              response,
              400,
              await renderHome({
                context: input.context,
                hostApi: input.hostApi,
                notice: "Source-history publication target is invalid.",
                selectedConversationId: conversationId
              })
            );
            return;
          }

          const visibleSourceHistoryRefs =
            await resolveUserClientVisibleSourceHistoryRefs({
              conversationId,
              hostApi: input.hostApi,
              nodeId,
              sourceHistoryId,
              ...(target?.success ? { target: target.data } : {}),
              userNodeId: input.context.binding.node.nodeId
            });

          if ("error" in visibleSourceHistoryRefs) {
            writeHtml(
              response,
              visibleSourceHistoryRefs.statusCode,
              await renderHome({
                context: input.context,
                hostApi: input.hostApi,
                notice: visibleSourceHistoryRefs.error,
                selectedConversationId: conversationId
              })
            );
            return;
          }

          const publication = await requestRuntimeSourceHistoryPublication({
            hostApi: input.hostApi,
            nodeId,
            reason,
            retryFailedPublication,
            sourceHistoryId,
            sourceHistoryRefs: visibleSourceHistoryRefs.sourceHistoryRefs,
            ...(target?.success ? { target: target.data } : {}),
            userNodeId: input.context.binding.node.nodeId
          });

          if (publication.error || !publication.detail) {
            writeHtml(
              response,
              publication.statusCode ?? 502,
              await renderHome({
                context: input.context,
                hostApi: input.hostApi,
                notice:
                  publication.error ??
                  "Source-history publication request failed.",
                selectedConversationId: conversationId
              })
            );
            return;
          }

          writeHtml(
            response,
            200,
            await renderHome({
              context: input.context,
              hostApi: input.hostApi,
              notice: `Requested source-history publication ${publication.detail.commandId} for ${publication.detail.sourceHistoryId}.`,
              selectedConversationId: conversationId
            })
          );
        } catch (error) {
          writeHtml(
            response,
            500,
            await renderHome({
              context: input.context,
              hostApi: input.hostApi,
              notice:
                error instanceof Error
                  ? error.message
                  : "Source-history publication request failed.",
              selectedConversationId: selectedConversationIdForError
            })
          );
        }
        return;
      }

      if (
        request.method === "POST" &&
        requestUrl.pathname === "/source-history/reconcile"
      ) {
        let selectedConversationIdForError: string | undefined;

        try {
          const form = new URLSearchParams(await readRequestBody(request));
          const conversationId = form.get("conversationId")?.trim() ?? "";
          const nodeId = form.get("nodeId")?.trim() ?? "";
          const reason = form.get("reason")?.trim() || undefined;
          const approvalId = form.get("approvalId")?.trim() || undefined;
          const sourceHistoryId = form.get("sourceHistoryId")?.trim() ?? "";
          selectedConversationIdForError = conversationId;

          if (!nodeId || !sourceHistoryId || !conversationId) {
            writeHtml(
              response,
              400,
              await renderHome({
                context: input.context,
                hostApi: input.hostApi,
                notice:
                  "Runtime node, source-history id, and conversation are required.",
                selectedConversationId: conversationId
              })
            );
            return;
          }

          const visibleSourceHistoryRefs =
            await resolveUserClientVisibleSourceHistoryRefs({
              allowPublicationResources: false,
              conversationId,
              hostApi: input.hostApi,
              nodeId,
              sourceHistoryId,
              userNodeId: input.context.binding.node.nodeId
            });

          if ("error" in visibleSourceHistoryRefs) {
            writeHtml(
              response,
              visibleSourceHistoryRefs.statusCode,
              await renderHome({
                context: input.context,
                hostApi: input.hostApi,
                notice: visibleSourceHistoryRefs.error,
                selectedConversationId: conversationId
              })
            );
            return;
          }

          const reconcile = await requestRuntimeSourceHistoryReconcile({
            ...(approvalId ? { approvalId } : {}),
            hostApi: input.hostApi,
            nodeId,
            reason,
            sourceHistoryId,
            sourceHistoryRefs: visibleSourceHistoryRefs.sourceHistoryRefs,
            userNodeId: input.context.binding.node.nodeId
          });

          if (reconcile.error || !reconcile.detail) {
            writeHtml(
              response,
              reconcile.statusCode ?? 502,
              await renderHome({
                context: input.context,
                hostApi: input.hostApi,
                notice:
                  reconcile.error ??
                  "Source-history reconcile request failed.",
                selectedConversationId: conversationId
              })
            );
            return;
          }

          writeHtml(
            response,
            200,
            await renderHome({
              context: input.context,
              hostApi: input.hostApi,
              notice: `Requested source-history reconcile ${reconcile.detail.commandId} for ${reconcile.detail.sourceHistoryId}.`,
              selectedConversationId: conversationId
            })
          );
        } catch (error) {
          writeHtml(
            response,
            500,
            await renderHome({
              context: input.context,
              hostApi: input.hostApi,
              notice:
                error instanceof Error
                  ? error.message
                  : "Source-history reconcile request failed.",
              selectedConversationId: selectedConversationIdForError
            })
          );
        }
        return;
      }

      if (request.method === "POST" && requestUrl.pathname === "/messages") {
        let selectedConversationIdForError: string | undefined;

        try {
          const form = new URLSearchParams(await readRequestBody(request));
          const approvalId = form.get("approvalId")?.trim() || undefined;
          const approvalDecision = form.get("approvalDecision")?.trim();
          const approvalOperation =
            form.get("approvalOperation")?.trim() || undefined;
          const approvalReason = form.get("approvalReason")?.trim() || undefined;
          const approvalResourceId =
            form.get("approvalResourceId")?.trim() || undefined;
          const approvalResourceKind =
            form.get("approvalResourceKind")?.trim() || undefined;
          const approvalResourceLabel =
            form.get("approvalResourceLabel")?.trim() || undefined;
          const conversationId =
            form.get("conversationId")?.trim() || undefined;
          const parentMessageId =
            form.get("parentMessageId")?.trim() || undefined;
          const sessionId = form.get("sessionId")?.trim() || undefined;
          const targetNodeId = form.get("targetNodeId")?.trim() ?? "";
          const summary = form.get("summary")?.trim() ?? "";
          const messageType = (form.get("messageType")?.trim() ||
            "task.request") as UserNodeMessagePublishType;
          const effectiveSummary =
            summary ||
            (approvalId && approvalDecision === "approved"
              ? `Approved ${approvalId}.`
              : approvalId && approvalDecision === "rejected"
                ? `Rejected ${approvalId}.`
                : "");
          selectedConversationIdForError = conversationId;

          if (!targetNodeId || !effectiveSummary) {
            writeHtml(
              response,
              400,
              await renderHome({
                context: input.context,
                hostApi: input.hostApi,
                notice: "Target node and summary are required.",
                selectedConversationId: conversationId
              })
            );
            return;
          }

          const published = await publishUserNodeMessage({
            ...(approvalId &&
            (approvalDecision === "approved" || approvalDecision === "rejected")
              ? {
                approval: {
                  approvalId,
                  decision: approvalDecision,
                  ...(approvalOperation ? { operation: approvalOperation } : {}),
                  ...(approvalReason ? { reason: approvalReason } : {}),
                  ...(approvalResourceId && approvalResourceKind
                    ? {
                        resource: {
                          id: approvalResourceId,
                          kind: approvalResourceKind,
                          ...(approvalResourceLabel
                            ? { label: approvalResourceLabel }
                            : {})
                        }
                      }
                    : {})
                }
              }
              : {}),
            conversationId,
            hostApi: input.hostApi,
            messageType,
            parentMessageId,
            sessionId,
            summary: effectiveSummary,
            targetNodeId,
            userNodeId: input.context.binding.node.nodeId
          });

          writeHtml(
            response,
            200,
            await renderHome({
              context: input.context,
              hostApi: input.hostApi,
              notice:
                published.deliveryStatus === "failed"
                  ? `Recorded ${published.messageType} ${published.eventId}, but relay delivery failed.`
                  : published.deliveryStatus === "partial"
                    ? `Published ${published.messageType} ${published.eventId} to ${published.publishedRelays.length}/${published.relayUrls.length} relays.`
                    : `Published ${published.messageType} ${published.eventId}.`,
              selectedConversationId: published.conversationId
            })
          );
        } catch (error) {
          writeHtml(
            response,
            500,
            await renderHome({
              context: input.context,
              hostApi: input.hostApi,
              notice: error instanceof Error ? error.message : "Publish failed.",
              selectedConversationId: selectedConversationIdForError
            })
          );
        }
        return;
      }

      if (request.method === "GET" && requestUrl.pathname === "/") {
        writeHtml(
          response,
          200,
          await renderHome({
            context: input.context,
            hostApi: input.hostApi,
            selectedConversationId:
              requestUrl.searchParams.get("conversationId") ?? undefined
          })
        );
        return;
      }

      writeJson(response, 404, {
        error: "not_found"
      });
    })().catch((error: unknown) => {
      writeJson(response, 500, {
        error: error instanceof Error ? error.message : "Unexpected error."
      });
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(listenPort, listenHost, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address() as AddressInfo;
  const clientUrl = normalizePublicClientUrl(address);
  if (inboundTransport) {
    try {
      inboundSubscription = await inboundTransport.subscribe({
        onMessage: (envelope) =>
          recordInboundUserNodeMessage({
            envelope,
            hostApi: input.hostApi,
            publicKey: input.context.identityContext.publicKey,
            userNodeId: input.context.binding.node.nodeId
          }).catch(() => undefined),
        recipientPubkey: input.context.identityContext.publicKey
      });
    } catch {
      if (ownsInboundTransport) {
        await inboundTransport.close();
      }
    }
  }

  return {
    clientUrl,
    runtimeRoot: input.context.workspace.runtimeRoot,
    stop: async () => {
      await inboundSubscription?.close();

      if (ownsInboundTransport) {
        await inboundTransport?.close();
      }

      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }
  };
}
