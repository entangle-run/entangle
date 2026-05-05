#!/usr/bin/env node
import { createServer } from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const defaultOptions = {
  content: "Deterministic Entangle fake OpenCode response.",
  host: "127.0.0.1",
  jsonLog: false,
  pattern: "git commit -m smoke",
  permission: "bash",
  permissionId: "permission-alpha",
  port: 18081,
  sessionId: "opencode-session-alpha",
  username: undefined,
  password: undefined,
  version: "fake-opencode-1.0.0",
  writeContent: "export const fakeOpenCodeWorkspaceWrite = true;\n",
  writeFile: undefined
};

let options;

try {
  options = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(
    `[fake-opencode-server] ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(1);
}

if (options.help) {
  printHelp();
  process.exit(0);
}

const eventClients = new Set();
const requests = [];
const sessions = new Map();
const permissionReplies = new Map();
const permissionSessions = new Map();

const server = createServer((request, response) => {
  void handleRequest({ request, response });
});

server.on("error", (error) => {
  console.error(
    `[fake-opencode-server] ${error instanceof Error ? error.message : String(error)}`
  );
  process.exitCode = 1;
});

server.listen(options.port, options.host, () => {
  const address = server.address();
  const port =
    typeof address === "object" && address ? address.port : options.port;
  const baseUrl = `http://${options.host}:${port}`;
  const payload = {
    baseUrl,
    eventUrl: `${baseUrl}/event`,
    healthUrl: `${baseUrl}/global/health`,
    permissionId: options.permissionId,
    sessionId: options.sessionId,
    version: options.version
  };

  if (options.jsonLog) {
    console.log(JSON.stringify({ event: "listening", ...payload }));
    return;
  }

  console.log("Entangle deterministic fake OpenCode server");
  console.log(`health: ${payload.healthUrl}`);
  console.log(`baseUrl: ${payload.baseUrl}`);
  console.log(`event: ${payload.eventUrl}`);
  console.log(`sessionId: ${payload.sessionId}`);
  console.log(`permissionId: ${payload.permissionId}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    closeEventClients();
    server.close(() => {
      process.exit(0);
    });
  });
}

async function handleRequest(input) {
  try {
    const url = new URL(input.request.url ?? "/", "http://127.0.0.1");

    if (!isAuthorized(input.request)) {
      sendJson(input.response, 401, {
        error: {
          message: "invalid_basic_auth"
        }
      });
      return;
    }

    if (
      input.request.method === "GET" &&
      url.pathname === "/global/health"
    ) {
      sendJson(input.response, 200, {
        healthy: true,
        version: options.version
      });
      return;
    }

    if (input.request.method === "GET" && url.pathname === "/event") {
      openEventStream(input.request, input.response);
      return;
    }

    if (input.request.method === "POST" && url.pathname === "/session") {
      const body = parseJsonObject(await readIncomingBody(input.request));
      const sessionId =
        typeof body.id === "string" && body.id.trim().length > 0
          ? body.id
          : options.sessionId;
      sessions.set(sessionId, {
        body,
        completed: false,
        permissionAsked: false,
        promptBody: undefined,
        workspace: readWorkspaceHeader(input.request)
      });
      requests.push({
        body,
        method: "POST",
        path: "/session"
      });
      sendJson(input.response, 200, {
        id: sessionId
      });
      return;
    }

    const promptMatch = url.pathname.match(
      /^\/session\/([^/]+)\/prompt_async$/
    );
    if (input.request.method === "POST" && promptMatch) {
      const sessionId = decodeURIComponent(promptMatch[1]);
      const session = getOrCreateSession(sessionId);
      const body = parseJsonObject(await readIncomingBody(input.request));
      session.completed = false;
      session.permissionAsked = false;
      session.promptBody = body;
      session.workspace = readWorkspaceHeader(input.request) ?? session.workspace;
      requests.push({
        body,
        method: "POST",
        path: `/session/${sessionId}/prompt_async`
      });
      sendJson(input.response, 200, {
        ok: true
      });
      askPermission(sessionId);
      return;
    }

    const permissionMatch = url.pathname.match(
      /^\/permission\/([^/]+)\/reply$/
    );
    if (input.request.method === "POST" && permissionMatch) {
      const permissionId = decodeURIComponent(permissionMatch[1]);
      const body = parseJsonObject(await readIncomingBody(input.request));
      permissionReplies.set(permissionId, body);
      requests.push({
        body,
        method: "POST",
        path: `/permission/${permissionId}/reply`
      });
      completeSessionAfterPermission(permissionId, body);
      sendJson(input.response, 200, {
        ok: true
      });
      return;
    }

    if (input.request.method === "GET" && url.pathname === "/debug/state") {
      sendJson(input.response, 200, {
        eventClientCount: eventClients.size,
        permissionReplies: Object.fromEntries(permissionReplies),
        requests,
        sessions: Object.fromEntries(sessions)
      });
      return;
    }

    sendJson(input.response, 404, {
      error: {
        message: `Unsupported fake OpenCode route '${input.request.method ?? "GET"} ${url.pathname}'.`
      }
    });
  } catch (error) {
    sendJson(input.response, 500, {
      error: {
        message:
          error instanceof Error ? error.message : "fake_opencode_server_error"
      }
    });
  }
}

function getOrCreateSession(sessionId) {
  const existing = sessions.get(sessionId);

  if (existing) {
    return existing;
  }

  const created = {
    body: {},
    completed: false,
    permissionAsked: false,
    promptBody: undefined,
    workspace: undefined
  };
  sessions.set(sessionId, created);
  return created;
}

function askPermission(sessionId) {
  const session = getOrCreateSession(sessionId);

  if (session.permissionAsked) {
    return;
  }

  session.permissionAsked = true;
  permissionSessions.set(options.permissionId, sessionId);
  writeEvent({
    properties: {
      always: false,
      id: options.permissionId,
      metadata: {
        command: options.pattern
      },
      patterns: [options.pattern],
      permission: options.permission,
      sessionID: sessionId,
      tool: {
        callID: `tool-${options.permissionId}`
      }
    },
    type: "permission.asked"
  });
}

function completeSessionAfterPermission(permissionId, body) {
  const reply = typeof body.reply === "string" ? body.reply : "reject";
  const sessionId = permissionSessions.get(permissionId) ?? options.sessionId;
  const session = getOrCreateSession(sessionId);

  if (permissionId !== options.permissionId || session.completed) {
    return;
  }

  if (reply === "once" || reply === "always") {
    writeWorkspaceMutation(session);
    writeEvent({
      properties: {
        part: {
          sessionID: sessionId,
          text: options.content,
          type: "text"
        }
      },
      type: "message.part.updated"
    });
  } else {
    writeEvent({
      properties: {
        error: {
          message: "Permission rejected by fake OpenCode smoke."
        },
        sessionID: sessionId
      },
      type: "session.error"
    });
  }

  session.completed = true;
  writeEvent({
    properties: {
      sessionID: sessionId,
      status: {
        type: "idle"
      }
    },
    type: "session.status"
  });
  closeEventClients();
}

function openEventStream(request, response) {
  response.writeHead(200, {
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "content-type": "text/event-stream"
  });
  response.write(": connected\n\n");
  eventClients.add(response);
  writeEvent(
    {
      properties: {},
      type: "server.connected"
    },
    response
  );

  request.on("close", () => {
    eventClients.delete(response);
  });
}

function writeEvent(event, response) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;

  if (response) {
    response.write(payload);
    return;
  }

  for (const client of eventClients) {
    client.write(payload);
  }
}

function closeEventClients() {
  for (const client of eventClients) {
    client.end();
  }
  eventClients.clear();
}

function readWorkspaceHeader(request) {
  const rawHeader = request.headers["x-opencode-directory"];
  const rawValue = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

  if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
    return undefined;
  }

  return decodeURIComponent(rawValue);
}

function resolveWorkspaceWritePath(workspace, relativePath) {
  if (path.isAbsolute(relativePath)) {
    throw new Error("Fake OpenCode write path must be relative.");
  }

  const root = path.resolve(workspace);
  const target = path.resolve(root, relativePath);
  const relative = path.relative(root, target);

  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Fake OpenCode write path must stay inside the workspace.");
  }

  return target;
}

function writeWorkspaceMutation(session) {
  if (!options.writeFile) {
    return;
  }

  if (!session.workspace) {
    throw new Error("Fake OpenCode workspace write requested without workspace header.");
  }

  const target = resolveWorkspaceWritePath(session.workspace, options.writeFile);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, options.writeContent, "utf8");
}

async function readIncomingBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

function parseJsonObject(rawBody) {
  if (!rawBody.trim()) {
    return {};
  }

  const parsed = JSON.parse(rawBody);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Expected a JSON object body.");
  }

  return parsed;
}

function isAuthorized(request) {
  if (!options.username && !options.password) {
    return true;
  }

  const expected = `Basic ${Buffer.from(
    `${options.username ?? ""}:${options.password ?? ""}`
  ).toString("base64")}`;

  return request.headers.authorization === expected;
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json"
  });
  response.end(JSON.stringify(body));
}

function parseArgs(args) {
  const parsed = { ...defaultOptions };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      return { ...parsed, help: true };
    }

    if (arg === "--json-log") {
      parsed.jsonLog = true;
      continue;
    }

    if (
      arg === "--content" ||
      arg === "--host" ||
      arg === "--password" ||
      arg === "--pattern" ||
      arg === "--permission" ||
      arg === "--permission-id" ||
      arg === "--port" ||
      arg === "--session-id" ||
      arg === "--username" ||
      arg === "--version" ||
      arg === "--write-content" ||
      arg === "--write-file"
    ) {
      const value = args[index + 1];
      if (!value) {
        throw new Error(`Missing value for ${arg}.`);
      }
      index += 1;

      if (arg === "--content") {
        parsed.content = value;
      } else if (arg === "--host") {
        parsed.host = value;
      } else if (arg === "--password") {
        parsed.password = value;
      } else if (arg === "--pattern") {
        parsed.pattern = value;
      } else if (arg === "--permission") {
        parsed.permission = value;
      } else if (arg === "--permission-id") {
        parsed.permissionId = value;
      } else if (arg === "--port") {
        const port = Number(value);
        if (!Number.isInteger(port) || port < 0 || port > 65535) {
          throw new Error(`Invalid port '${value}'.`);
        }
        parsed.port = port;
      } else if (arg === "--session-id") {
        parsed.sessionId = value;
      } else if (arg === "--username") {
        parsed.username = value;
      } else if (arg === "--version") {
        parsed.version = value;
      } else if (arg === "--write-content") {
        parsed.writeContent = value;
      } else if (arg === "--write-file") {
        parsed.writeFile = value;
      }
      continue;
    }

    throw new Error(`Unknown option '${arg}'.`);
  }

  return parsed;
}

function printHelp() {
  console.log(`Usage: node scripts/fake-opencode-server.mjs [options]

Options:
  --host <host>              Listen host. Default: 127.0.0.1
  --port <port>              Listen port. Default: 18081
  --version <text>           Version exposed by /global/health.
  --session-id <id>          Deterministic session id.
  --permission-id <id>       Deterministic permission request id.
  --permission <name>        Permission name. Default: bash
  --pattern <text>           Permission pattern/command.
  --content <text>           Deterministic assistant response content.
  --username <name>          Require Basic auth username.
  --password <password>      Require Basic auth password.
  --write-file <path>        Write deterministic content into the OpenCode workspace after permission approval.
  --write-content <text>     Content for --write-file.
  --json-log                 Print startup metadata as JSON.
  -h, --help                 Show this help.

Routes:
  GET  /global/health
  GET  /event
  POST /session
  POST /session/:sessionID/prompt_async
  POST /permission/:requestID/reply
  GET  /debug/state
`);
}
