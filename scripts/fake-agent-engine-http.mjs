#!/usr/bin/env node
import { createServer } from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const defaultOptions = {
  approvalApprover: "user",
  approvalId: undefined,
  approvalReason: "Approve deterministic fake external HTTP source application.",
  approvalResourceId: undefined,
  content: "Deterministic Entangle fake external HTTP engine response.",
  engineSessionId: undefined,
  engineVersion: "fake-agent-engine-http-1.0.0",
  host: "127.0.0.1",
  jsonLog: false,
  port: 18082,
  writeContent: "export const fakeExternalHttpEngineGenerated = true;\n",
  writeFile: undefined
};

let options;

try {
  options = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(
    `[fake-agent-engine-http] ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(1);
}

if (options.help) {
  printHelp();
  process.exit(0);
}

const requests = [];
const server = createServer((request, response) => {
  void handleRequest({ request, response });
});

server.on("error", (error) => {
  console.error(
    `[fake-agent-engine-http] ${error instanceof Error ? error.message : String(error)}`
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
    healthUrl: `${baseUrl}/health`,
    turnUrl: `${baseUrl}/turn`,
    version: options.engineVersion
  };

  if (options.jsonLog) {
    console.log(JSON.stringify({ event: "listening", ...payload }));
    return;
  }

  console.log("Entangle deterministic fake external HTTP engine");
  console.log(`health: ${payload.healthUrl}`);
  console.log(`turn: ${payload.turnUrl}`);
  console.log(`version: ${payload.version}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => {
      process.exit(0);
    });
  });
}

async function handleRequest(input) {
  try {
    const url = new URL(input.request.url ?? "/", "http://127.0.0.1");

    if (input.request.method === "GET" && url.pathname === "/health") {
      sendJson(input.response, 200, {
        healthy: true,
        version: options.engineVersion
      });
      return;
    }

    if (input.request.method === "GET" && url.pathname === "/debug/state") {
      sendJson(input.response, 200, { requests });
      return;
    }

    if (input.request.method === "POST" && url.pathname === "/turn") {
      const body = parseJsonObject(await readIncomingBody(input.request));
      const nodeId = readNestedString(body, ["request", "nodeId"]) ?? "unknown";
      const runtimeNodeId =
        readNestedString(body, ["runtime", "nodeId"]) ?? "unknown";
      const sourceWorkspaceRoot = readNestedString(body, [
        "runtime",
        "workspace",
        "sourceWorkspaceRoot"
      ]);
      const writtenFile = maybeWriteWorkspaceFile(sourceWorkspaceRoot);

      requests.push({
        nodeId,
        runtimeNodeId,
        schemaVersion: body.schemaVersion,
        writtenFile
      });

      const approvalDirective = buildApprovalDirective();
      sendJson(input.response, 200, {
        ...(approvalDirective
          ? { approvalRequestDirectives: [approvalDirective] }
          : {}),
        assistantMessages: [
          `${options.content} request=${nodeId} runtime=${runtimeNodeId}`
        ],
        ...(options.engineSessionId
          ? { engineSessionId: options.engineSessionId }
          : {}),
        engineVersion: options.engineVersion,
        stopReason: "completed",
        ...(writtenFile
          ? {
              toolExecutions: [
                {
                  durationMs: 1,
                  inputSummary: writtenFile,
                  outcome: "success",
                  outputSummary: `wrote ${writtenFile}`,
                  sequence: 1,
                  title: "Fake workspace write",
                  toolCallId: `fake-workspace-write-${requests.length}`,
                  toolId: "fake_workspace_write"
                }
              ]
            }
          : {})
      });
      return;
    }

    sendJson(input.response, 404, {
      error: {
        message: `Unsupported fake agent-engine route '${input.request.method ?? "GET"} ${url.pathname}'.`
      }
    });
  } catch (error) {
    sendJson(input.response, 500, {
      error: {
        message:
          error instanceof Error ? error.message : "fake_agent_engine_http_error"
      }
    });
  }
}

function parseArgs(args) {
  const parsed = { ...defaultOptions };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    switch (arg) {
      case "--approval-approver":
        parsed.approvalApprover = readRequiredValue(args, ++index, arg);
        break;
      case "--approval-id":
        parsed.approvalId = readRequiredValue(args, ++index, arg);
        break;
      case "--approval-reason":
        parsed.approvalReason = readRequiredValue(args, ++index, arg);
        break;
      case "--approval-resource-id":
        parsed.approvalResourceId = readRequiredValue(args, ++index, arg);
        break;
      case "--content":
        parsed.content = readRequiredValue(args, ++index, arg);
        break;
      case "--engine-session-id":
        parsed.engineSessionId = readRequiredValue(args, ++index, arg);
        break;
      case "--engine-version":
        parsed.engineVersion = readRequiredValue(args, ++index, arg);
        break;
      case "--host":
        parsed.host = readRequiredValue(args, ++index, arg);
        break;
      case "--json-log":
        parsed.jsonLog = true;
        break;
      case "--port":
        parsed.port = Number.parseInt(readRequiredValue(args, ++index, arg), 10);
        if (!Number.isInteger(parsed.port) || parsed.port < 0) {
          throw new Error("--port must be a non-negative integer.");
        }
        break;
      case "--write-content":
        parsed.writeContent = readRequiredValue(args, ++index, arg);
        break;
      case "--write-file":
        parsed.writeFile = readRequiredValue(args, ++index, arg);
        break;
      case "-h":
      case "--help":
        parsed.help = true;
        break;
      default:
        throw new Error(`Unknown option '${arg}'.`);
    }
  }

  if (
    (parsed.approvalId && !parsed.approvalResourceId) ||
    (!parsed.approvalId && parsed.approvalResourceId)
  ) {
    throw new Error(
      "--approval-id and --approval-resource-id must be supplied together."
    );
  }

  return parsed;
}

function readRequiredValue(args, index, flag) {
  const value = args[index];

  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }

  return value;
}

function printHelp() {
  console.log(`Usage: pnpm ops:fake-agent-engine-http [options]

Start a deterministic Entangle external_http agent engine fixture.

Options:
  --host <host>             Bind host. Default: 127.0.0.1
  --port <port>             Bind port. Use 0 for ephemeral. Default: 18082
  --content <text>          Assistant message prefix.
  --engine-session-id <id>  Optional engine session id reported in turn results.
  --engine-version <value>  Engine version reported in turn results.
  --approval-id <id>        Optional approval directive id.
  --approval-resource-id <id>
                            Optional source-change approval resource id.
  --approval-approver <id>  Approval approver node id. Default: user
  --approval-reason <text>  Approval reason.
  --write-file <path>       Optional source-workspace relative file to write on each turn.
  --write-content <text>    Content for --write-file.
  --json-log                Print startup metadata as JSON.
  -h, --help                Show this help.
`);
}

async function readIncomingBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }

  return Buffer.concat(chunks).toString("utf8");
}

function parseJsonObject(raw) {
  const parsed = JSON.parse(raw);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Expected a JSON object request body.");
  }

  return parsed;
}

function readNestedString(value, keys) {
  let current = value;

  for (const key of keys) {
    if (!current || typeof current !== "object" || !(key in current)) {
      return undefined;
    }

    current = current[key];
  }

  return typeof current === "string" ? current : undefined;
}

function maybeWriteWorkspaceFile(sourceWorkspaceRoot) {
  if (!options.writeFile) {
    return undefined;
  }

  if (!sourceWorkspaceRoot) {
    throw new Error("--write-file requires runtime.workspace.sourceWorkspaceRoot.");
  }

  const target = path.resolve(sourceWorkspaceRoot, options.writeFile);
  const root = path.resolve(sourceWorkspaceRoot);

  if (!target.startsWith(`${root}${path.sep}`)) {
    throw new Error("--write-file must stay inside sourceWorkspaceRoot.");
  }

  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, options.writeContent, "utf8");
  return path.relative(root, target);
}

function buildApprovalDirective() {
  if (!options.approvalId || !options.approvalResourceId) {
    return undefined;
  }

  return {
    approvalId: options.approvalId,
    approverNodeIds: [options.approvalApprover],
    operation: "source_application",
    reason: options.approvalReason,
    resource: {
      id: options.approvalResourceId,
      kind: "source_change_candidate",
      label: options.approvalResourceId
    }
  };
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "content-type": "application/json"
  });
  response.end(`${JSON.stringify(body)}\n`);
}
