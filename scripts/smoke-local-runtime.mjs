#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  rm,
  writeFile
} from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { localProfileComposeFile } from "./local-profile-paths.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const composeFile = localProfileComposeFile;
const defaultHostUrl = "http://localhost:7071";
const defaultRelayUrl = "ws://localhost:7777";
const defaultTimeoutMs = 120_000;
const defaultPollIntervalMs = 2_000;
const entangleNostrRumorKind = 24159;

const args = process.argv.slice(2);
const previewDemo = args.includes("--preview-demo");
const keepState = previewDemo || args.includes("--keep-state");
const runSuffix = Date.now().toString(36);
const outputPrefix = previewDemo ? "local-preview" : "runtime-smoke";
const packageId = previewDemo
  ? "local-preview-agent-package"
  : `runtime-smoke-package-${runSuffix}`;
const packageSourceId = previewDemo
  ? "local-preview-package-source"
  : `runtime-smoke-source-${runSuffix}`;
const graphId = previewDemo
  ? "local-preview-graph"
  : `runtime-smoke-graph-${runSuffix}`;
const userNodeId = previewDemo
  ? "local-preview-user"
  : `runtime-smoke-user-${runSuffix}`;
const workerNodeId = previewDemo
  ? "local-preview-planner"
  : `runtime-smoke-worker-${runSuffix}`;
const downstreamNodeId = previewDemo
  ? "local-preview-builder"
  : `runtime-smoke-downstream-${runSuffix}`;
const edgeId = previewDemo
  ? "local-preview-user-to-planner"
  : `runtime-smoke-edge-${runSuffix}`;
const downstreamEdgeId = previewDemo
  ? "local-preview-user-to-builder"
  : `runtime-smoke-downstream-edge-${runSuffix}`;
const modelEndpointId = previewDemo
  ? "local-preview-model"
  : `runtime-smoke-model-${runSuffix}`;
const modelStubContainerName = previewDemo
  ? "entangle-local-preview-model"
  : `entangle-runtime-smoke-model-${runSuffix}`;
const secretRef = `secret://local/${modelEndpointId}`;
const gitPrincipalId = previewDemo
  ? "local-preview-git"
  : `runtime-smoke-git-${runSuffix}`;
const gitProvisioningSecretRef = previewDemo
  ? "secret://git-services/local-preview/provisioning"
  : `secret://git-services/runtime-smoke-${runSuffix}/provisioning`;
const gitPrincipalSecretRef = previewDemo
  ? "secret://git/local-preview/https-token"
  : `secret://git/runtime-smoke-${runSuffix}/https-token`;
const giteaUsername = previewDemo
  ? `local-preview-${runSuffix}`
  : `runtime-smoke-${runSuffix}`;
const giteaPassword = `${giteaUsername}-password`;
const hostPackagePath = previewDemo
  ? "/tmp/entangle-local-preview-package"
  : `/tmp/${packageSourceId}`;
const smokeSecret = `${outputPrefix}-secret-${runSuffix}`;
const smokeSessionId = `${outputPrefix}-session-${runSuffix}`;
const smokeConversationId = `${outputPrefix}-conversation-${runSuffix}`;
const downstreamConversationId = `${outputPrefix}-downstream-conversation-${runSuffix}`;
const smokeTurnId = `${outputPrefix}-turn-${runSuffix}`;
const downstreamTurnId = `${outputPrefix}-downstream-turn-${runSuffix}`;
const previewPackageRoot = path.join(
  repositoryRoot,
  "examples",
  "local-preview",
  "agent-package"
);

function readFlagValue(name) {
  const inlinePrefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(inlinePrefix));

  if (inline) {
    return inline.slice(inlinePrefix.length);
  }

  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function readPositiveInteger(name, fallback) {
  const rawValue = readFlagValue(name);
  const value = rawValue ? Number.parseInt(rawValue, 10) : fallback;

  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function normalizeHttpUrl(value, fallback) {
  const rawUrl = value && value.trim().length > 0 ? value.trim() : fallback;
  return rawUrl.endsWith("/") ? rawUrl.slice(0, -1) : rawUrl;
}

function normalizeWebsocketUrl(value, fallback) {
  const rawUrl = value && value.trim().length > 0 ? value.trim() : fallback;
  return rawUrl.endsWith("/") ? rawUrl.slice(0, -1) : rawUrl;
}

const timeoutMs = readPositiveInteger("--timeout-ms", defaultTimeoutMs);
const pollIntervalMs = readPositiveInteger(
  "--poll-interval-ms",
  defaultPollIntervalMs
);
const hostUrl = normalizeHttpUrl(
  process.env.ENTANGLE_HOST_URL ?? process.env.ENTANGLE_LOCAL_HOST_URL,
  defaultHostUrl
);
const relayUrl = normalizeWebsocketUrl(
  process.env.ENTANGLE_STRFRY_URL ?? process.env.ENTANGLE_LOCAL_RELAY_URL,
  defaultRelayUrl
);
const hostToken =
  process.env.ENTANGLE_HOST_TOKEN ?? process.env.ENTANGLE_HOST_OPERATOR_TOKEN;

function run(command, commandArgs, options = {}) {
  return spawnSync(command, commandArgs, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit"
  });
}

function formatCapturedOutput(result) {
  return `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
}

function requireSuccess(step, command, commandArgs) {
  const result = run(command, commandArgs, { capture: true });

  if (result.status !== 0) {
    throw new Error(
      [
        `${step} failed with exit code ${result.status ?? "unknown"}.`,
        formatCapturedOutput(result)
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  const output = formatCapturedOutput(result);

  if (output) {
    console.log(output);
  }
}

function requireCapturedSuccess(step, command, commandArgs) {
  const result = run(command, commandArgs, { capture: true });

  if (result.status !== 0) {
    throw new Error(
      [
        `${step} failed with exit code ${result.status ?? "unknown"}.`,
        formatCapturedOutput(result)
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  return formatCapturedOutput(result);
}

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function secretRefStoragePath(ref) {
  const parsed = new URL(ref);
  const segments = [
    parsed.hostname,
    ...parsed.pathname.split("/").filter((segment) => segment.length > 0)
  ];

  return `/entangle-secrets/refs/${segments.join("/")}`;
}

function runnerContainerNameFor(nodeId) {
  return `entangle-runner-${nodeId}`;
}

async function writeJsonFile(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function buildModelStubServerSource() {
  const expectedToken = JSON.stringify(smokeSecret);
  const runLabel = previewDemo ? "Local preview" : "Runtime smoke";
  const focus = previewDemo
    ? "Validate the Local Preview operator path."
    : "Validate the local Entangle runtime message path.";
  const stableFact = previewDemo
    ? "The Local Preview demo uses canonical package assets with a local model stub."
    : "The local runtime smoke uses a disposable model endpoint and package source.";
  const summary = `The ${previewDemo ? "Local Preview demo" : "local runtime smoke"} exercised message intake, model execution, artifact materialization, and memory synthesis.`;

  return `
const http = require("node:http");
const expectedToken = ${expectedToken};

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json"
  });
  response.end(JSON.stringify(payload));
}

function buildMemorySummaryArguments() {
  return {
    artifactInsights: [${JSON.stringify(`${runLabel} produced a git-backed report artifact.`)}],
    closedOpenQuestions: [],
    completedNextActions: [],
    consolidatedNextActions: [],
    consolidatedOpenQuestions: [],
    decisions: [${JSON.stringify(`${runLabel} completed through the OpenAI-compatible adapter.`)}],
    executionInsights: ["Provider-backed execution and memory synthesis completed against the local model stub."],
    focus: ${JSON.stringify(focus)},
    nextActions: [],
    openQuestions: [],
    replacedNextActions: [],
    replacedOpenQuestions: [],
    resolutions: [${JSON.stringify(`The ${previewDemo ? "local preview" : "local smoke"} task completed successfully.`)}],
    sessionInsights: ["The runner processed a NIP-59 task request for the session."],
    stableFacts: [${JSON.stringify(stableFact)}],
    summary: ${JSON.stringify(summary)}
  };
}

function buildCompletionResponse(request) {
  const toolChoice = request.tool_choice;
  const forcedToolName =
    toolChoice &&
    toolChoice.type === "function" &&
    toolChoice.function &&
    toolChoice.function.name;
  const hasToolResult = Array.isArray(request.messages)
    ? request.messages.some((message) => message && message.role === "tool")
    : false;

  if (forcedToolName === "write_memory_summary" && !hasToolResult) {
    return {
      choices: [
        {
          finish_reason: "tool_calls",
          index: 0,
          message: {
            content: null,
            role: "assistant",
            tool_calls: [
              {
                function: {
                  arguments: JSON.stringify(buildMemorySummaryArguments()),
                  name: "write_memory_summary"
                },
                id: "call_runtime_smoke_memory",
                type: "function"
              }
            ]
          }
        }
      ],
      created: Math.floor(Date.now() / 1000),
      id: "chatcmpl-runtime-smoke-memory",
      model: request.model || "runtime-smoke-model",
      object: "chat.completion",
      usage: {
        completion_tokens: 12,
        prompt_tokens: 24,
        total_tokens: 36
      }
    };
  }

  return {
    choices: [
      {
        finish_reason: "stop",
        index: 0,
        message: {
          content: ${JSON.stringify(`${runLabel} model completed the requested Entangle task.`)},
          role: "assistant"
        }
      }
    ],
    created: Math.floor(Date.now() / 1000),
    id: "chatcmpl-runtime-smoke",
    model: request.model || "runtime-smoke-model",
    object: "chat.completion",
    usage: {
      completion_tokens: 8,
      prompt_tokens: 16,
      total_tokens: 24
    }
  };
}

http
  .createServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/health") {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method !== "POST" || !request.url.endsWith("/chat/completions")) {
      sendJson(response, 404, { error: "not_found" });
      return;
    }

    if (request.headers.authorization !== "Bearer " + expectedToken) {
      sendJson(response, 401, { error: "missing_or_invalid_authorization" });
      return;
    }

    try {
      const requestBody = JSON.parse(await readBody(request));
      sendJson(response, 200, buildCompletionResponse(requestBody));
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  })
  .listen(8080, "0.0.0.0");
`;
}

async function waitForModelStub() {
  const deadline = Date.now() + timeoutMs;
  let lastOutput = "";

  while (Date.now() <= deadline) {
    const result = run(
      "docker",
      [
        "exec",
        modelStubContainerName,
        "node",
        "-e",
        "fetch('http://127.0.0.1:8080/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1));"
      ],
      { capture: true }
    );

    if (result.status === 0) {
      printPass("runtime-smoke:model-stub", modelStubContainerName);
      return;
    }

    lastOutput = formatCapturedOutput(result);
    await sleep(500);
  }

  throw new Error(
    `Runtime smoke model stub did not become ready within ${timeoutMs}ms. ${lastOutput}`
  );
}

async function startModelStubContainer() {
  run("docker", ["rm", "-f", modelStubContainerName], { capture: true });

  requireSuccess("Start runtime smoke model stub", "docker", [
    "run",
    "--rm",
    "-d",
    "--name",
    modelStubContainerName,
    "--network",
    "entangle-local",
    "node:22-bookworm-slim",
    "node",
    "-e",
    buildModelStubServerSource()
  ]);

  await waitForModelStub();
}

async function waitForGiteaHealth() {
  const deadline = Date.now() + timeoutMs;
  let lastOutput = "";

  while (Date.now() <= deadline) {
    const result = run(
      "docker",
      [
        "compose",
        "-f",
        composeFile,
        "exec",
        "-T",
        "gitea",
        "bash",
        "-lc",
        "curl -fsS http://127.0.0.1:3000/api/healthz >/dev/null"
      ],
      { capture: true }
    );

    if (result.status === 0) {
      printPass("runtime-smoke:gitea-health", "api=ready");
      return;
    }

    lastOutput = formatCapturedOutput(result);
    await sleep(500);
  }

  throw new Error(
    `Gitea API did not become ready within ${timeoutMs}ms. ${lastOutput}`
  );
}

async function bootstrapGiteaCollaboration() {
  await waitForGiteaHealth();

  const output = requireCapturedSuccess("Create runtime smoke Gitea user", "docker", [
    "compose",
    "-f",
    composeFile,
    "exec",
    "-T",
    "-u",
    "git",
    "gitea",
    "bash",
    "-lc",
    [
      "gitea admin user create",
      `--username ${shellQuote(giteaUsername)}`,
      `--email ${shellQuote(`${giteaUsername}@entangle.invalid`)}`,
      `--password ${shellQuote(giteaPassword)}`,
      "--admin",
      "--must-change-password=false",
      "--access-token",
      `--access-token-name ${shellQuote(`entangle-${runSuffix}`)}`,
      "--access-token-scopes all"
    ].join(" ")
  ]);
  const tokenMatch = output.match(/Access token.*\s([a-f0-9]{40,})\s*$/i);
  const token = tokenMatch?.[1];

  if (!token) {
    throw new Error(
      `Gitea user creation did not return a parseable access token. Output: ${output}`
    );
  }

  requireSuccess("Verify runtime smoke Gitea token", "docker", [
    "compose",
    "-f",
    composeFile,
    "exec",
    "-T",
    "gitea",
    "bash",
    "-lc",
    [
      "curl -fsS",
      `-H ${shellQuote(`Authorization: token ${token}`)}`,
      "http://127.0.0.1:3000/api/v1/user >/dev/null"
    ].join(" ")
  ]);

  printPass(
    "runtime-smoke:gitea-bootstrap",
    `user=${giteaUsername}; token=${token.slice(0, 8)}...`
  );

  return token;
}

async function writeSmokePackage(packageRoot) {
  await Promise.all([
    mkdir(path.join(packageRoot, "prompts"), { recursive: true }),
    mkdir(path.join(packageRoot, "runtime"), { recursive: true }),
    mkdir(path.join(packageRoot, "memory", "seed", "wiki"), { recursive: true }),
    mkdir(path.join(packageRoot, "memory", "schema"), { recursive: true })
  ]);

  await Promise.all([
    writeJsonFile(path.join(packageRoot, "manifest.json"), {
      schemaVersion: "1",
      packageId,
      name: "Runtime Smoke Package",
      version: "0.1.0",
      packageKind: "template",
      defaultNodeKind: "worker",
      capabilities: [],
      entryPrompts: {
        system: "prompts/system.md",
        interaction: "prompts/interaction.md"
      },
      memoryProfile: {
        wikiSeedPath: "memory/seed/wiki",
        schemaPath: "memory/schema/AGENTS.md"
      },
      runtime: {
        configPath: "runtime/config.json",
        capabilitiesPath: "runtime/capabilities.json",
        toolsPath: "runtime/tools.json"
      },
      metadata: {
        description: "Disposable package used by the local runtime lifecycle smoke.",
        tags: ["smoke"]
      }
    }),
    writeFile(
      path.join(packageRoot, "prompts", "system.md"),
      "# Runtime Smoke System\n",
      "utf8"
    ),
    writeFile(
      path.join(packageRoot, "prompts", "interaction.md"),
      "# Runtime Smoke Interaction\n",
      "utf8"
    ),
    writeJsonFile(path.join(packageRoot, "runtime", "config.json"), {
      runtimeProfile: "local",
      toolBudget: {
        maxOutputTokens: 256,
        maxToolTurns: 2
      }
    }),
    writeJsonFile(path.join(packageRoot, "runtime", "capabilities.json"), {
      capabilities: []
    }),
    writeJsonFile(path.join(packageRoot, "runtime", "tools.json"), {
      schemaVersion: "1",
      tools: []
    }),
    writeFile(
      path.join(packageRoot, "memory", "seed", "wiki", "index.md"),
      "# Runtime Smoke Wiki\n",
      "utf8"
    ),
    writeFile(
      path.join(packageRoot, "memory", "schema", "AGENTS.md"),
      "# Runtime Smoke Memory Rules\n",
      "utf8"
    )
  ]);
}

async function hostRequest(method, route, body) {
  const headers = {};

  if (body !== undefined) {
    headers["content-type"] = "application/json";
  }

  if (hostToken?.trim()) {
    headers.authorization = `Bearer ${hostToken.trim()}`;
  }

  const response = await fetch(`${hostUrl}${route}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const responseBody = await response.text();
  const parsedBody =
    responseBody.trim().length === 0 ? undefined : JSON.parse(responseBody);

  if (!response.ok) {
    throw new Error(
      `${method} ${route} returned ${response.status}: ${responseBody}`
    );
  }

  return parsedBody;
}

function assertValidationOk(label, response) {
  if (!response?.validation?.ok) {
    throw new Error(`${label} validation failed: ${JSON.stringify(response)}`);
  }
}

function buildSmokeCatalog(catalog) {
  const gitServiceRef = catalog.defaults.gitServiceRef ?? "local-gitea";
  const smokeGitService = {
    authMode: "https_token",
    baseUrl: "http://gitea:3000",
    defaultNamespace: giteaUsername,
    displayName: previewDemo ? "Local Preview Gitea" : "Runtime Smoke Gitea",
    id: gitServiceRef,
    provisioning: {
      apiBaseUrl: "http://gitea:3000/api/v1",
      mode: "gitea_api",
      secretRef: gitProvisioningSecretRef
    },
    remoteBase: "http://gitea:3000",
    transportKind: "https"
  };
  const gitServicesWithoutSmokeService = catalog.gitServices.filter(
    (service) => service.id !== gitServiceRef
  );

  return {
    ...catalog,
    gitServices: [...gitServicesWithoutSmokeService, smokeGitService],
    modelEndpoints: [
      ...catalog.modelEndpoints.filter(
        (endpoint) => endpoint.id !== modelEndpointId
      ),
      {
        id: modelEndpointId,
        displayName: previewDemo
          ? "Local Preview Model Stub"
          : "Runtime Smoke Model Endpoint",
        adapterKind: "openai_compatible",
        baseUrl: `http://${modelStubContainerName}:8080/v1`,
        authMode: "api_key_bearer",
        secretRef,
        defaultModel: previewDemo ? "local-preview-model" : "runtime-smoke-model"
      }
    ],
    defaults: {
      ...catalog.defaults,
      gitServiceRef,
      modelEndpointRef: modelEndpointId
    }
  };
}

function buildSmokeGraph(catalog) {
  const relayProfileRefs = catalog.defaults.relayProfileRefs;
  const primaryRelayProfileRef = relayProfileRefs[0];
  const gitServiceRef = catalog.defaults.gitServiceRef;
  const sharedResourceBindings = {
    relayProfileRefs,
    ...(primaryRelayProfileRef ? { primaryRelayProfileRef } : {}),
    gitServiceRefs: gitServiceRef ? [gitServiceRef] : [],
    ...(gitServiceRef ? { primaryGitServiceRef: gitServiceRef } : {}),
    modelEndpointProfileRef: modelEndpointId,
    externalPrincipalRefs: [gitPrincipalId]
  };

  const edges = [
    {
      edgeId,
      fromNodeId: userNodeId,
      toNodeId: workerNodeId,
      relation: "delegates_to",
      enabled: true,
      transportPolicy: {
        mode: "bidirectional_shared_set",
        relayProfileRefs,
        channel: previewDemo ? "local-preview" : "runtime-smoke"
      }
    },
    {
      edgeId: downstreamEdgeId,
      fromNodeId: userNodeId,
      toNodeId: downstreamNodeId,
      relation: "delegates_to",
      enabled: true,
      transportPolicy: {
        mode: "bidirectional_shared_set",
        relayProfileRefs,
        channel: previewDemo
          ? "local-preview-handoff"
          : "runtime-smoke-handoff"
      }
    }
  ];

  if (previewDemo) {
    edges.push(
      {
        edgeId: "local-preview-planner-to-builder",
        fromNodeId: workerNodeId,
        toNodeId: downstreamNodeId,
        relation: "routes_to",
        enabled: true,
        transportPolicy: {
          mode: "bidirectional_shared_set",
          relayProfileRefs,
          channel: "local-preview-artifact-handoff"
        }
      },
      {
        edgeId: "local-preview-builder-review",
        fromNodeId: downstreamNodeId,
        toNodeId: workerNodeId,
        relation: "reviews",
        enabled: true,
        transportPolicy: {
          mode: "bidirectional_shared_set",
          relayProfileRefs,
          channel: "local-preview-review"
        }
      }
    );
  }

  return {
    schemaVersion: "1",
    graphId,
    name: previewDemo ? "Local Preview Graph" : "Runtime Smoke Graph",
    nodes: [
      {
        nodeId: userNodeId,
        displayName: previewDemo ? "Local Preview User" : "Runtime Smoke User",
        nodeKind: "user"
      },
      {
        nodeId: workerNodeId,
        displayName: previewDemo
          ? "Local Preview Planner"
          : "Runtime Smoke Worker",
        nodeKind: "worker",
        packageSourceRef: packageSourceId,
        resourceBindings: sharedResourceBindings
      },
      {
        nodeId: downstreamNodeId,
        displayName: previewDemo
          ? "Local Preview Builder"
          : "Runtime Smoke Downstream Worker",
        nodeKind: "worker",
        packageSourceRef: packageSourceId,
        resourceBindings: sharedResourceBindings
      }
    ],
    edges,
    defaults: {
      resourceBindings: sharedResourceBindings,
      runtimeProfile: "local"
    }
  };
}

async function upsertSmokeGitPrincipal(gitServiceRef) {
  const response = await hostRequest(
    "PUT",
    `/v1/external-principals/${gitPrincipalId}`,
    {
      principalId: gitPrincipalId,
      displayName: previewDemo ? "Local Preview Git Principal" : "Runtime Smoke Git Principal",
      systemKind: "git",
      gitServiceRef,
      subject: giteaUsername,
      transportAuthMode: "https_token",
      secretRef: gitPrincipalSecretRef,
      attribution: {
        displayName: previewDemo ? "Local Preview Git Principal" : "Runtime Smoke Git Principal",
        email: `${giteaUsername}@entangle.invalid`
      },
      signing: {
        mode: "none"
      }
    }
  );

  printPass(
    "runtime-smoke:git-principal",
    response.principal?.principalId ?? gitPrincipalId
  );
}

async function waitForRuntime(nodeId, predicate, label) {
  const deadline = Date.now() + timeoutMs;
  let lastInspection;

  while (Date.now() <= deadline) {
    const inspection = await hostRequest("GET", `/v1/runtimes/${nodeId}`);
    lastInspection = inspection;

    if (predicate(inspection)) {
      return inspection;
    }

    await sleep(pollIntervalMs);
  }

  throw new Error(
    `${label} did not complete within ${timeoutMs}ms. Last inspection: ${JSON.stringify(lastInspection)}`
  );
}

async function tryHostRequest(method, route, body) {
  try {
    return await hostRequest(method, route, body);
  } catch {
    return undefined;
  }
}

async function loadNostrTools() {
  const runnerRequire = createRequire(
    path.join(repositoryRoot, "services", "runner", "package.json")
  );
  const nostrTools = await import(runnerRequire.resolve("nostr-tools"));
  return nostrTools.default ?? nostrTools["module.exports"] ?? nostrTools;
}

async function publishSmokeTask(input) {
  const nostrTools = await loadNostrTools();
  const userSecretKey = nostrTools.generateSecretKey();
  const userPubkey = nostrTools.getPublicKey(userSecretKey);
  const targetPubkey = input.runtimeContext.identityContext.publicKey;
  const taskMessage = {
    constraints: {
      approvalRequiredBeforeAction: false
    },
    conversationId: input.conversationId,
    fromNodeId: userNodeId,
    fromPubkey: userPubkey,
    graphId,
    intent: input.intent,
    messageType: "task.request",
    protocol: "entangle.a2a.v1",
    responsePolicy: {
      closeOnResult: true,
      maxFollowups: 0,
      responseRequired: false
    },
    sessionId: smokeSessionId,
    toNodeId: input.nodeId,
    toPubkey: targetPubkey,
    turnId: input.turnId,
    work: {
      artifactRefs: input.artifactRefs ?? [],
      metadata: {
        smoke: true
      },
      summary: input.summary
    }
  };
  const rumor = nostrTools.nip59.createRumor(
    {
      content: JSON.stringify(taskMessage),
      kind: entangleNostrRumorKind,
      tags: []
    },
    userSecretKey
  );
  const seal = nostrTools.nip59.createSeal(rumor, userSecretKey, targetPubkey);
  const wrappedEvent = nostrTools.nip59.createWrap(seal, targetPubkey);
  const pool = new nostrTools.SimplePool();

  try {
    await Promise.all(pool.publish([relayUrl], wrappedEvent));
  } finally {
    pool.destroy?.();
  }

  printPass(
    "runtime-smoke:task-published",
    `node=${input.nodeId}; session=${smokeSessionId}; event=${rumor.id}`
  );

  return {
    eventId: rumor.id,
    nodeId: input.nodeId,
    sessionId: smokeSessionId
  };
}

async function waitForMessageCompletion(input) {
  const deadline = Date.now() + timeoutMs;
  let lastObservation;

  while (Date.now() <= deadline) {
    const [sessionInspection, turnList, artifactList] = await Promise.all([
      tryHostRequest("GET", `/v1/sessions/${input.sessionId}`),
      tryHostRequest("GET", `/v1/runtimes/${input.nodeId}/turns`),
      tryHostRequest("GET", `/v1/runtimes/${input.nodeId}/artifacts`)
    ]);
    const sessionNode = sessionInspection?.nodes?.find(
      (node) => node.nodeId === input.nodeId
    );
    const turn = turnList?.turns?.find(
      (candidate) => candidate.messageId === input.eventId
    );
    const erroredTurn = turnList?.turns?.find(
      (candidate) =>
        candidate.messageId === input.eventId && candidate.phase === "errored"
    );
    const producedArtifactId = turn?.producedArtifactIds?.[0];
    const producedArtifact = producedArtifactId
      ? artifactList?.artifacts?.find(
          (artifact) => artifact.ref.artifactId === producedArtifactId
        )
      : undefined;

    lastObservation = {
      artifacts: artifactList?.artifacts?.length ?? 0,
      sessionStatus: sessionNode?.session?.status,
      turn: turn
        ? {
            engineOutcome: turn.engineOutcome,
            phase: turn.phase,
            consumedArtifactIds: turn.consumedArtifactIds,
            producedArtifactIds: turn.producedArtifactIds
          }
        : undefined
    };

    if (erroredTurn) {
      throw new Error(
        `Runtime smoke message path failed: runner turn '${erroredTurn.turnId}' entered phase 'errored'. Observation: ${JSON.stringify(lastObservation)}`
      );
    }

    const consumedArtifactReady =
      !input.expectedConsumedArtifactId ||
      turn?.consumedArtifactIds?.includes(input.expectedConsumedArtifactId);
    const producedArtifactReady =
      producedArtifact &&
      (!input.expectedArtifactStatus ||
        producedArtifact.ref.status === input.expectedArtifactStatus);

    if (
      sessionNode?.session?.status === "completed" &&
      turn?.engineOutcome?.stopReason === "completed" &&
      turn.engineOutcome.providerMetadata?.adapterKind === "openai_compatible" &&
      turn.engineOutcome.providerMetadata?.profileId === modelEndpointId &&
      consumedArtifactReady &&
      producedArtifactReady
    ) {
      printPass(
        "runtime-smoke:message-turn",
        `node=${input.nodeId}; turn=${turn.turnId}; artifact=${producedArtifact.ref.artifactId}`
      );
      return {
        artifact: producedArtifact,
        session: sessionNode.session,
        turn
      };
    }

    await sleep(pollIntervalMs);
  }

  throw new Error(
    `Runtime smoke message path did not complete within ${timeoutMs}ms. Last observation: ${JSON.stringify(lastObservation)}`
  );
}

function printPass(name, detail) {
  console.log(`PASS ${name.replace("runtime-smoke", outputPrefix)}: ${detail}`);
}

async function assertRestartEvent(nodeId, restartGeneration) {
  const response = await hostRequest("GET", "/v1/events?limit=100");
  const matchingEvent = response.events?.find(
    (event) =>
      event.type === "runtime.restart.requested" &&
      event.nodeId === nodeId &&
      event.restartGeneration === restartGeneration
  );

  if (!matchingEvent) {
    throw new Error(
      `No runtime.restart.requested host event was found for '${nodeId}' generation '${restartGeneration}'.`
    );
  }

  printPass(
    "runtime-smoke:restart-event",
    `event=${matchingEvent.eventId}; generation=${restartGeneration}`
  );
}

async function main() {
  let tempRoot;

  try {
    let packageRoot = previewPackageRoot;

    if (!previewDemo) {
      tempRoot = await mkdtemp(path.join(os.tmpdir(), "entangle-runtime-smoke-"));
      packageRoot = path.join(tempRoot, packageId);
      await writeSmokePackage(packageRoot);
    }
    await startModelStubContainer();
    const giteaToken = await bootstrapGiteaCollaboration();

    requireSuccess("Remove stale host smoke package", "docker", [
      "compose",
      "-f",
      composeFile,
      "exec",
      "-T",
      "host",
      "sh",
      "-lc",
      `rm -rf ${hostPackagePath}`
    ]);
    requireSuccess("Copy smoke package into host container", "docker", [
      "compose",
      "-f",
      composeFile,
      "cp",
      packageRoot,
      `host:${hostPackagePath}`
    ]);
    requireSuccess("Write smoke secrets", "docker", [
      "compose",
      "-f",
      composeFile,
      "exec",
      "-T",
      "host",
      "sh",
      "-lc",
      [
        {
          ref: secretRef,
          value: smokeSecret
        },
        {
          ref: gitProvisioningSecretRef,
          value: giteaToken
        },
        {
          ref: gitPrincipalSecretRef,
          value: giteaToken
        }
      ]
        .flatMap((secret) => {
          const storagePath = secretRefStoragePath(secret.ref);

          return [
            `mkdir -p ${path.posix.dirname(storagePath)}`,
            `printf '%s\\n' ${shellQuote(secret.value)} > ${storagePath}`,
            `chmod 600 ${storagePath}`
          ];
        })
        .join(" && ")
    ]);
    printPass("runtime-smoke:host-fixtures", hostPackagePath);

    const catalogInspection = await hostRequest("GET", "/v1/catalog");

    if (!catalogInspection.catalog) {
      throw new Error("Host did not return an active deployment resource catalog.");
    }

    const catalogResponse = await hostRequest(
      "PUT",
      "/v1/catalog",
      buildSmokeCatalog(catalogInspection.catalog)
    );
    assertValidationOk("Runtime smoke catalog", catalogResponse);
    printPass("runtime-smoke:catalog", modelEndpointId);
    await upsertSmokeGitPrincipal(catalogResponse.catalog.defaults.gitServiceRef);

    const packageResponse = await hostRequest("POST", "/v1/package-sources/admit", {
      sourceKind: "local_path",
      packageSourceId,
      absolutePath: hostPackagePath
    });
    assertValidationOk("Runtime smoke package source", packageResponse);
    printPass("runtime-smoke:package-source", packageSourceId);

    const graphResponse = await hostRequest(
      "PUT",
      "/v1/graph",
      buildSmokeGraph(catalogResponse.catalog)
    );
    assertValidationOk("Runtime smoke graph", graphResponse);
    printPass("runtime-smoke:graph", graphId);

    const startInspection = await hostRequest(
      "POST",
      `/v1/runtimes/${workerNodeId}/start`
    );
    if (!startInspection.contextAvailable) {
      throw new Error(`Runtime context was unavailable: ${JSON.stringify(startInspection)}`);
    }
    const downstreamStartInspection = await hostRequest(
      "POST",
      `/v1/runtimes/${downstreamNodeId}/start`
    );
    if (!downstreamStartInspection.contextAvailable) {
      throw new Error(
        `Downstream runtime context was unavailable: ${JSON.stringify(downstreamStartInspection)}`
      );
    }

    const runningInspection = await waitForRuntime(
      workerNodeId,
      (inspection) =>
        inspection.desiredState === "running" &&
        inspection.observedState === "running" &&
        inspection.contextAvailable,
      "Runtime start"
    );
    printPass(
      "runtime-smoke:start",
      `node=${workerNodeId}; observed=${runningInspection.observedState}; generation=${runningInspection.restartGeneration}`
    );
    const downstreamRunningInspection = await waitForRuntime(
      downstreamNodeId,
      (inspection) =>
        inspection.desiredState === "running" &&
        inspection.observedState === "running" &&
        inspection.contextAvailable,
      "Downstream runtime start"
    );
    printPass(
      "runtime-smoke:start",
      `node=${downstreamNodeId}; observed=${downstreamRunningInspection.observedState}; generation=${downstreamRunningInspection.restartGeneration}`
    );

    const restartResponse = await hostRequest(
      "POST",
      `/v1/runtimes/${workerNodeId}/restart`
    );
    const expectedRestartGeneration = restartResponse.restartGeneration;
    const restartedInspection = await waitForRuntime(
      workerNodeId,
      (inspection) =>
        inspection.desiredState === "running" &&
        inspection.observedState === "running" &&
        inspection.restartGeneration === expectedRestartGeneration,
      "Runtime restart"
    );
    printPass(
      "runtime-smoke:restart",
      `node=${workerNodeId}; observed=${restartedInspection.observedState}; generation=${restartedInspection.restartGeneration}`
    );
    await assertRestartEvent(workerNodeId, expectedRestartGeneration);

    const runtimeContext = await hostRequest(
      "GET",
      `/v1/runtimes/${workerNodeId}/context`
    );
    const downstreamRuntimeContext = await hostRequest(
      "GET",
      `/v1/runtimes/${downstreamNodeId}/context`
    );
    const publishedTask = await publishSmokeTask({
      artifactRefs: [],
      conversationId: smokeConversationId,
      intent: "Validate the local runtime message path.",
      nodeId: workerNodeId,
      runtimeContext,
      summary:
        "Run a provider-backed smoke turn and publish a git-backed report artifact.",
      turnId: smokeTurnId
    });
    const messageRun = await waitForMessageCompletion({
      ...publishedTask,
      expectedArtifactStatus: "published"
    });
    printPass(
      "runtime-smoke:message-session",
      `node=${workerNodeId}; status=${messageRun.session.status}; stop=${messageRun.turn.engineOutcome.stopReason}`
    );

    const downstreamTask = await publishSmokeTask({
      artifactRefs: [messageRun.artifact.ref],
      conversationId: downstreamConversationId,
      intent: "Validate the local runtime artifact handoff path.",
      nodeId: downstreamNodeId,
      runtimeContext: downstreamRuntimeContext,
      summary:
        "Retrieve the upstream published artifact and produce a downstream report.",
      turnId: downstreamTurnId
    });
    const downstreamMessageRun = await waitForMessageCompletion({
      ...downstreamTask,
      expectedArtifactStatus: "published",
      expectedConsumedArtifactId: messageRun.artifact.ref.artifactId
    });
    printPass(
      "runtime-smoke:handoff-session",
      `node=${downstreamNodeId}; consumed=${messageRun.artifact.ref.artifactId}; produced=${downstreamMessageRun.artifact.ref.artifactId}`
    );

    await hostRequest("POST", `/v1/runtimes/${downstreamNodeId}/stop`);
    await hostRequest("POST", `/v1/runtimes/${workerNodeId}/stop`);
    const downstreamStoppedInspection = await waitForRuntime(
      downstreamNodeId,
      (inspection) =>
        inspection.desiredState === "stopped" &&
        inspection.observedState === "stopped",
      "Downstream runtime stop"
    );
    printPass(
      "runtime-smoke:stop",
      `node=${downstreamNodeId}; observed=${downstreamStoppedInspection.observedState}; generation=${downstreamStoppedInspection.restartGeneration}`
    );
    const stoppedInspection = await waitForRuntime(
      workerNodeId,
      (inspection) =>
        inspection.desiredState === "stopped" &&
        inspection.observedState === "stopped",
      "Runtime stop"
    );
    printPass(
      "runtime-smoke:stop",
      `node=${workerNodeId}; observed=${stoppedInspection.observedState}; generation=${stoppedInspection.restartGeneration}`
    );

    if (previewDemo) {
      console.log(
        [
          "Local Preview demo completed.",
          `Session: ${smokeSessionId}`,
          `Planner node: ${workerNodeId}`,
          `Builder node: ${downstreamNodeId}`,
          "Studio: http://localhost:3000",
          "CLI examples:",
          "  pnpm --filter @entangle/cli dev host sessions list --summary",
          `  pnpm --filter @entangle/cli dev host sessions get ${smokeSessionId} --summary`,
          `  pnpm --filter @entangle/cli dev host runtimes artifacts ${workerNodeId} --summary`,
          `  pnpm --filter @entangle/cli dev host runtimes artifacts ${downstreamNodeId} --summary`,
          "Reset when finished:",
          "  pnpm ops:demo-local-preview:reset"
        ].join("\n")
      );
    } else {
      console.log("Local runtime lifecycle, message, and git handoff smoke passed.");
    }
  } finally {
    if (tempRoot) {
      await rm(tempRoot, { force: true, recursive: true });
    }

    if (keepState) {
      return;
    }

    await tryHostRequest("POST", `/v1/runtimes/${downstreamNodeId}/stop`);
    await tryHostRequest("POST", `/v1/runtimes/${workerNodeId}/stop`);
    run("docker", ["rm", "-f", runnerContainerNameFor(downstreamNodeId)], {
      capture: true
    });
    run("docker", ["rm", "-f", runnerContainerNameFor(workerNodeId)], {
      capture: true
    });
    run(
      "docker",
      [
        "compose",
        "-f",
        composeFile,
        "exec",
        "-T",
        "host",
        "sh",
        "-lc",
        `rm -rf ${hostPackagePath}`
      ],
      { capture: true }
    );
    run("docker", ["rm", "-f", modelStubContainerName], { capture: true });
  }
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
