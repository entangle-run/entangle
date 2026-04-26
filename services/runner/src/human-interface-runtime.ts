import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import type {
  EffectiveRuntimeContext,
  RunnerJoinHostApi,
  UserNodeMessagePublishType
} from "@entangle/types";

export type HumanInterfaceRuntimeHandle = {
  clientUrl: string;
  runtimeRoot: string;
  stop(): Promise<void>;
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

async function fetchHostProjection(input: {
  hostApi?: RunnerJoinHostApi | undefined;
  userNodeId: string;
}): Promise<{
  conversations: unknown[];
  error?: string;
}> {
  if (!input.hostApi) {
    return {
      conversations: [],
      error: "Host API is not configured for this Human Interface Runtime."
    };
  }

  try {
    const response = await fetch(new URL("/v1/projection", input.hostApi.baseUrl), {
      headers: buildHostApiHeaders(input.hostApi)
    });

    if (!response.ok) {
      return {
        conversations: [],
        error: `Host projection request failed with HTTP ${response.status}.`
      };
    }

    const projection = (await response.json()) as {
      userConversations?: Array<{ userNodeId?: string }>;
    };

    return {
      conversations: (projection.userConversations ?? []).filter(
        (conversation) => conversation.userNodeId === input.userNodeId
      )
    };
  } catch (error) {
    return {
      conversations: [],
      error: error instanceof Error ? error.message : "Host projection failed."
    };
  }
}

async function publishUserNodeMessage(input: {
  hostApi?: RunnerJoinHostApi | undefined;
  messageType: UserNodeMessagePublishType;
  summary: string;
  targetNodeId: string;
  userNodeId: string;
}): Promise<unknown> {
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
        messageType: input.messageType,
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

  return body.trim() ? JSON.parse(body) : {};
}

async function renderHome(input: {
  context: EffectiveRuntimeContext;
  hostApi?: RunnerJoinHostApi | undefined;
  notice?: string;
}): Promise<string> {
  const userNodeId = input.context.binding.node.nodeId;
  const targets = [...new Set(
    input.context.relayContext.edgeRoutes.map((route) => route.peerNodeId)
  )].sort((left, right) => left.localeCompare(right));
  const projection = await fetchHostProjection({
    hostApi: input.hostApi,
    userNodeId
  });
  const targetOptions = targets
    .map((target) => `<option value="${escapeHtml(target)}">${escapeHtml(target)}</option>`)
    .join("");
  const conversations =
    projection.conversations.length > 0
      ? projection.conversations
          .map(
            (conversation) =>
              `<pre>${escapeHtml(JSON.stringify(conversation, null, 2))}</pre>`
          )
          .join("")
      : "<p>No projected conversations yet.</p>";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Entangle User Client - ${escapeHtml(userNodeId)}</title>
    <style>
      body { margin: 0; background: #101214; color: #f7f1e8; font-family: system-ui, sans-serif; }
      main { max-width: 920px; margin: 0 auto; padding: 28px; display: grid; gap: 18px; }
      section { border: 1px solid rgba(255,255,255,.1); border-radius: 10px; padding: 16px; background: rgba(255,255,255,.04); }
      label { display: grid; gap: 6px; margin: 0 0 12px; }
      input, select, textarea, button { font: inherit; border-radius: 8px; border: 1px solid rgba(255,255,255,.16); padding: 10px; }
      input, select, textarea { background: rgba(255,255,255,.06); color: #f7f1e8; }
      button { background: #d4a86d; color: #111; cursor: pointer; font-weight: 700; }
      pre { overflow: auto; background: rgba(0,0,0,.25); padding: 12px; border-radius: 8px; }
      .muted { color: rgba(247,241,232,.7); }
      .notice { border-left: 3px solid #78e0ac; padding-left: 10px; }
      .error { border-left: 3px solid #d96857; padding-left: 10px; color: #ffcbc4; }
    </style>
  </head>
  <body>
    <main>
      <section>
        <h1>Entangle User Client</h1>
        <p class="muted">Running as User Node <strong>${escapeHtml(userNodeId)}</strong>.</p>
        <p class="muted">Graph ${escapeHtml(input.context.binding.graphId)} revision ${escapeHtml(input.context.binding.graphRevisionId)}.</p>
      </section>
      ${input.notice ? `<section class="notice">${escapeHtml(input.notice)}</section>` : ""}
      ${projection.error ? `<section class="error">${escapeHtml(projection.error)}</section>` : ""}
      <section>
        <h2>Send Message</h2>
        <form method="post" action="/messages">
          <label>Target node
            <select name="targetNodeId" required>${targetOptions}</select>
          </label>
          <label>Message type
            <select name="messageType">
              <option value="task.request">task.request</option>
              <option value="question">question</option>
              <option value="answer">answer</option>
            </select>
          </label>
          <label>Summary
            <textarea name="summary" rows="5" required></textarea>
          </label>
          <button type="submit" ${targets.length === 0 ? "disabled" : ""}>Send as User Node</button>
        </form>
      </section>
      <section>
        <h2>Projected Conversations</h2>
        ${conversations}
      </section>
    </main>
  </body>
</html>`;
}

export async function startHumanInterfaceRuntime(input: {
  context: EffectiveRuntimeContext;
  hostApi?: RunnerJoinHostApi | undefined;
}): Promise<HumanInterfaceRuntimeHandle> {
  const listenHost =
    process.env.ENTANGLE_HUMAN_INTERFACE_HOST?.trim() || "127.0.0.1";
  const listenPort = normalizeListenPort();
  const server = createServer((request, response) => {
    void (async () => {
      if (request.method === "GET" && request.url === "/health") {
        writeJson(response, 200, {
          nodeId: input.context.binding.node.nodeId,
          ok: true,
          runtimeKind: "human_interface"
        });
        return;
      }

      if (request.method === "POST" && request.url === "/messages") {
        try {
          const form = new URLSearchParams(await readRequestBody(request));
          const targetNodeId = form.get("targetNodeId")?.trim() ?? "";
          const summary = form.get("summary")?.trim() ?? "";
          const messageType = (form.get("messageType")?.trim() ||
            "task.request") as UserNodeMessagePublishType;

          if (!targetNodeId || !summary) {
            writeHtml(
              response,
              400,
              await renderHome({
                context: input.context,
                hostApi: input.hostApi,
                notice: "Target node and summary are required."
              })
            );
            return;
          }

          const published = await publishUserNodeMessage({
            hostApi: input.hostApi,
            messageType,
            summary,
            targetNodeId,
            userNodeId: input.context.binding.node.nodeId
          });

          writeHtml(
            response,
            200,
            await renderHome({
              context: input.context,
              hostApi: input.hostApi,
              notice: `Published message: ${JSON.stringify(published)}`
            })
          );
        } catch (error) {
          writeHtml(
            response,
            500,
            await renderHome({
              context: input.context,
              hostApi: input.hostApi,
              notice: error instanceof Error ? error.message : "Publish failed."
            })
          );
        }
        return;
      }

      if (request.method === "GET" && (!request.url || request.url === "/")) {
        writeHtml(
          response,
          200,
          await renderHome({
            context: input.context,
            hostApi: input.hostApi
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

  return {
    clientUrl,
    runtimeRoot: input.context.workspace.runtimeRoot,
    stop: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      })
  };
}
