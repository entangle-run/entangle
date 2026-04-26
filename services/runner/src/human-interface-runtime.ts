import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import type {
  EntangleA2AMessage,
  EffectiveRuntimeContext,
  RunnerJoinHostApi,
  UserNodeConversationResponse,
  UserConversationProjectionRecord,
  UserNodeMessageRecord,
  UserNodeMessagePublishResponse,
  UserNodeMessagePublishType
} from "@entangle/types";
import {
  userNodeConversationResponseSchema,
  userNodeInboxResponseSchema,
  userNodeMessagePublishResponseSchema
} from "@entangle/types";
import { getPublicKey } from "nostr-tools";
import { parseNostrSecretKey } from "./join-config.js";
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

type UserClientState = {
  conversations: UserConversationProjectionRecord[];
  error?: string;
  generatedAt?: string;
  graphId: string;
  graphRevisionId: string;
  targets: UserClientTarget[];
  userNodeId: string;
};

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

function resolveHumanInterfaceSecretKey(
  context: EffectiveRuntimeContext
): Uint8Array | undefined {
  const secretEnvVar =
    context.identityContext.secretDelivery.mode === "env_var"
      ? context.identityContext.secretDelivery.envVar
      : undefined;
  const secretKey = secretEnvVar
    ? parseNostrSecretKey(process.env[secretEnvVar])
    : undefined;

  if (!secretKey) {
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

function createHumanInterfaceTransport(
  context: EffectiveRuntimeContext
): RunnerTransport | undefined {
  const secretKey = resolveHumanInterfaceSecretKey(context);

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

  return {
    conversations: inbox.conversations,
    ...(inbox.error ? { error: inbox.error } : {}),
    ...(inbox.generatedAt ? { generatedAt: inbox.generatedAt } : {}),
    graphId: input.context.binding.graphId,
    graphRevisionId: input.context.binding.graphRevisionId,
    targets: listTargetNodes(input.context),
    userNodeId
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
        receivedAt: input.envelope.receivedAt
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
      }
    | undefined;
  conversationId?: string | undefined;
  hostApi?: RunnerJoinHostApi | undefined;
  messageType: UserNodeMessagePublishType;
  parentMessageId?: string | undefined;
  sessionId?: string | undefined;
  summary: string;
  targetNodeId: string;
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
        ...(input.conversationId ? { conversationId: input.conversationId } : {}),
        messageType: input.messageType,
        ...(input.parentMessageId ? { parentMessageId: input.parentMessageId } : {}),
        ...(input.sessionId ? { sessionId: input.sessionId } : {}),
        summary: input.summary,
        targetNodeId: input.targetNodeId
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
  const sessionId = escapeHtml(message.sessionId);

  return `<form class="approval-actions" method="post" action="/messages">
    <input type="hidden" name="approvalId" value="${approvalId}" />
    <input type="hidden" name="conversationId" value="${conversationId}" />
    <input type="hidden" name="messageType" value="approval.response" />
    <input type="hidden" name="parentMessageId" value="${eventId}" />
    <input type="hidden" name="sessionId" value="${sessionId}" />
    <input type="hidden" name="targetNodeId" value="${fromNodeId}" />
    <button name="approvalDecision" value="approved" type="submit">Approve</button>
    <button name="approvalDecision" value="rejected" type="submit">Reject</button>
  </form>`;
}

async function renderHome(input: {
  context: EffectiveRuntimeContext;
  hostApi?: RunnerJoinHostApi | undefined;
  notice?: string;
  selectedConversationId?: string | undefined;
}): Promise<string> {
  const state = await buildUserClientState({
    context: input.context,
    hostApi: input.hostApi
  });
  const selectedConversation = input.selectedConversationId
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
              ${message.approval ? `<div class="message-meta">approval ${escapeHtml(message.approval.approvalId)}${message.approval.decision ? ` - ${escapeHtml(message.approval.decision)}` : ""}</div>` : ""}
              <div>${escapeHtml(message.summary)}</div>
              <div class="message-meta">${escapeHtml(message.eventId)}</div>
              ${renderApprovalControls(message)}
            </article>`
        )
        .join("")
    : `<p class="empty">No recorded User Node messages yet.</p>`;

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
      .muted, .meta, .empty { color: var(--muted); }
      .meta { font-size: 13px; }
      .notice { border-color: rgba(31, 138, 112, .28); background: #ecf8f4; }
      .error { border-color: rgba(177, 69, 61, .35); background: #fff1f0; color: var(--danger); }
      .conversation-list { display: grid; gap: 8px; margin-top: 12px; }
      .conversation { color: inherit; display: grid; gap: 3px; text-decoration: none; border: 1px solid var(--line); background: var(--panel); border-radius: 8px; padding: 10px; font-size: 12px; }
      .conversation.selected { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
      .conversation-main { font-size: 14px; font-weight: 700; }
      .message { border-top: 1px solid var(--line); display: grid; gap: 6px; padding: 12px 0; }
      .message:first-child { border-top: 0; padding-top: 0; }
      .message-meta { color: var(--muted); font-size: 12px; overflow-wrap: anywhere; }
      .approval-actions { display: flex; gap: 8px; margin-top: 4px; }
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
        <div class="meta">${escapeHtml(state.generatedAt ?? "projection unavailable")}</div>
      </header>
      <div class="layout">
        <aside>
          <h2>Conversations</h2>
          <div class="conversation-list">${conversationList}</div>
        </aside>
        <div class="workspace">
          ${input.notice ? `<section class="notice">${escapeHtml(input.notice)}</section>` : ""}
          ${state.error ? `<section class="error">${escapeHtml(state.error)}</section>` : ""}
          <section>
            <h2>Selected Thread</h2>
            ${selectedConversationPanel}
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
  const inboundTransport = input.transport ?? createHumanInterfaceTransport(input.context);
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

      if (request.method === "POST" && requestUrl.pathname === "/messages") {
        let selectedConversationIdForError: string | undefined;

        try {
          const form = new URLSearchParams(await readRequestBody(request));
          const approvalId = form.get("approvalId")?.trim() || undefined;
          const approvalDecision = form.get("approvalDecision")?.trim();
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
                    decision: approvalDecision
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
              notice: `Published ${published.messageType} ${published.eventId}.`,
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
