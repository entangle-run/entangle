#!/usr/bin/env tsx

import {
  spawn,
  spawnSync,
  type ChildProcessByStdio
} from "node:child_process";
import { existsSync } from "node:fs";
import {
  chmod,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Readable } from "node:stream";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  entangleA2AMessageSchema,
  entangleNostrRumorKind,
  graphMutationResponseSchema,
  hostEventListResponseSchema,
  hostProjectionSnapshotSchema,
  packageSourceInspectionResponseSchema,
  conversationRecordSchema,
  runnerJoinConfigSchema,
  runnerRegistryInspectionResponseSchema,
  runtimeAssignmentOfferResponseSchema,
  runtimeAssignmentTimelineResponseSchema,
  runtimeApprovalInspectionResponseSchema,
  runtimeApprovalListResponseSchema,
  runtimeArtifactDiffResponseSchema,
  runtimeArtifactHistoryResponseSchema,
  runtimeArtifactInspectionResponseSchema,
  runtimeArtifactListResponseSchema,
  runtimeArtifactRestoreResponseSchema,
  runtimeArtifactSourceChangeProposalResponseSchema,
  runtimeContextInspectionResponseSchema,
  runtimeIdentitySecretResponseSchema,
  runtimeInspectionResponseSchema,
  runtimeSourceChangeCandidateDiffResponseSchema,
  runtimeSourceChangeCandidateFilePreviewResponseSchema,
  runtimeSourceChangeCandidateInspectionResponseSchema,
  runtimeSourceChangeCandidateListResponseSchema,
  runtimeSourceHistoryInspectionResponseSchema,
  runtimeSourceHistoryListResponseSchema,
  runtimeSourceHistoryPublishResponseSchema,
  runtimeTurnInspectionResponseSchema,
  runtimeTurnListResponseSchema,
  runtimeWikiPublishResponseSchema,
  sessionInspectionResponseSchema,
  sessionListResponseSchema,
  sessionRecordSchema,
  userNodeConversationResponseSchema,
  userNodeMessagePublishResponseSchema,
  type EntangleA2AMessage,
  type RunnerJoinConfig
} from "@entangle/types";
import { generateSecretKey, getPublicKey, nip59, SimplePool } from "nostr-tools";
import type { HostFederatedControlPlane } from "../src/federated-control-plane.js";
import type { buildHostServer } from "../src/index.js";

const keepRunning = process.argv.includes("--keep-running");
const keepTemp = keepRunning || process.argv.includes("--keep-temp");
const relayUrl =
  readFlagValue("--relay-url") ??
  process.env.ENTANGLE_RELAY_URL ??
  process.env.ENTANGLE_STRFRY_URL ??
  "ws://localhost:7777";
const relayUrls = [relayUrl];
const timeoutMs = Number.parseInt(readFlagValue("--timeout-ms") ?? "30000", 10);
const pollIntervalMs = 150;
const runnerHeartbeatIntervalMs = 1000;
const operatorToken = "process-runner-smoke-token";
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "..", "..", "..");
const userClientStaticDir = resolveUserClientStaticDir();

function readFlagValue(name: string): string | undefined {
  const inlinePrefix = `${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(inlinePrefix));

  if (inline) {
    return inline.slice(inlinePrefix.length);
  }

  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function resolveUserClientStaticDir(): string | undefined {
  const configured =
    readFlagValue("--user-client-static-dir") ??
    process.env.ENTANGLE_USER_CLIENT_STATIC_DIR;

  if (configured?.trim()) {
    return path.resolve(configured.trim());
  }

  const builtAppDir = path.join(repoRoot, "apps", "user-client", "dist");

  return existsSync(path.join(builtAppDir, "index.html"))
    ? builtAppDir
    : undefined;
}

function assertCondition(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function assertResponseOk(
  response: Response,
  label: string
): Promise<void> {
  if (response.ok) {
    return;
  }

  throw new Error(
    `${label} failed with HTTP ${response.status}: ${await response.text()}`
  );
}

function printPass(label: string, detail: string): void {
  console.log(`PASS ${label}: ${detail}`);
}

function truncateLog(value: string, maxCharacters = 8000): string {
  return value.length <= maxCharacters
    ? value
    : `${value.slice(value.length - maxCharacters)}\n[truncated]`;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function waitForShutdownSignal(): Promise<void> {
  return new Promise((resolve) => {
    const shutdown = (signal: NodeJS.Signals) => {
      console.log(`Received ${signal}; stopping process runner smoke.`);
      resolve();
    };

    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  });
}

async function assertRelayReachable(relayUrl: string): Promise<void> {
  const WebSocketConstructor = globalThis.WebSocket;

  if (!WebSocketConstructor) {
    throw new Error(
      "Nostr relay preflight failed: this Node runtime does not expose global WebSocket."
    );
  }

  await new Promise<void>((resolve, reject) => {
    const subscriptionId = `entangle-process-runner-smoke-${Date.now()}`;
    const socket = new WebSocketConstructor(relayUrl);
    let settled = false;
    const timer = setTimeout(() => {
      settle(
        new Error(
          `Nostr relay preflight timed out at ${relayUrl}. Start the federated dev relay with ` +
            "`docker compose -f deploy/federated-dev/compose/docker-compose.federated-dev.yml up -d strfry` " +
            "or pass --relay-url to a reachable relay."
        )
      );
    }, Math.min(timeoutMs, 5000));

    function settle(error?: Error): void {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);

      try {
        socket.close(1000, "process runner smoke relay preflight complete");
      } catch {
        // Ignore close failures after the result has been decided.
      }

      if (error) {
        reject(error);
        return;
      }

      resolve();
    }

    socket.addEventListener("open", () => {
      socket.send(JSON.stringify(["REQ", subscriptionId, { limit: 1 }]));
    });

    socket.addEventListener("message", (event) => {
      if (typeof event.data !== "string") {
        settle(
          new Error(
            `Nostr relay preflight failed at ${relayUrl}: relay returned a non-string frame.`
          )
        );
        return;
      }

      try {
        const parsed = JSON.parse(event.data) as unknown;
        const messageType =
          Array.isArray(parsed) && typeof parsed[0] === "string"
            ? parsed[0]
            : undefined;

        if (messageType === "EOSE" || messageType === "EVENT") {
          socket.send(JSON.stringify(["CLOSE", subscriptionId]));
          settle();
          return;
        }

        if (Array.isArray(parsed) && parsed[0] === "NOTICE") {
          settle(
            new Error(
              `Nostr relay preflight failed at ${relayUrl}: ${String(parsed[1] ?? "relay notice")}`
            )
          );
        }
      } catch {
        settle(
          new Error(
            `Nostr relay preflight failed at ${relayUrl}: relay returned a non-JSON frame.`
          )
        );
      }
    });

    socket.addEventListener("error", () => {
      settle(
        new Error(
          `Nostr relay preflight failed: could not connect to ${relayUrl}. Start the federated dev relay with ` +
            "`docker compose -f deploy/federated-dev/compose/docker-compose.federated-dev.yml up -d strfry` " +
            "or pass --relay-url to a reachable relay."
        )
      );
    });

    socket.addEventListener("close", (event) => {
      if (!settled && event.code !== 1000) {
        settle(
          new Error(
            `Nostr relay preflight failed at ${relayUrl}: relay closed before EOSE with code ${event.code}.`
          )
        );
      }
    });
  });
}

async function waitFor<T>(
  label: string,
  resolveValue: () => Promise<T | undefined> | T | undefined,
  getFailureDetail?: () => string | undefined
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastValue: T | undefined;

  while (Date.now() <= deadline) {
    lastValue = await resolveValue();

    if (lastValue !== undefined) {
      return lastValue;
    }

    await sleep(pollIntervalMs);
  }

  throw new Error(
    `${label} did not complete within ${timeoutMs}ms. Last value: ${JSON.stringify(lastValue)}${getFailureDetail?.() ?? ""}`
  );
}

function runGit(args: string[], cwd?: string): string {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${result.stderr || result.stdout}`
    );
  }

  return result.stdout.trim();
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function createAgentPackage(packageRoot: string): Promise<void> {
  await Promise.all([
    mkdir(path.join(packageRoot, "prompts"), { recursive: true }),
    mkdir(path.join(packageRoot, "runtime"), { recursive: true }),
    mkdir(path.join(packageRoot, "memory", "schema"), { recursive: true }),
    mkdir(path.join(packageRoot, "memory", "seed", "wiki"), {
      recursive: true
    })
  ]);
  await Promise.all([
    writeJsonFile(path.join(packageRoot, "manifest.json"), {
      capabilities: [],
      defaultNodeKind: "worker",
      entryPrompts: {
        interaction: "prompts/interaction.md",
        system: "prompts/system.md"
      },
      memoryProfile: {
        schemaPath: "memory/schema/AGENTS.md",
        wikiSeedPath: "memory/seed/wiki"
      },
      metadata: {
        description: "Process runner smoke package.",
        tags: ["smoke"]
      },
      name: "Process Runner Smoke Worker",
      packageId: "process-runner-worker",
      packageKind: "template",
      runtime: {
        capabilitiesPath: "runtime/capabilities.json",
        configPath: "runtime/config.json",
        toolsPath: "runtime/tools.json"
      },
      schemaVersion: "1",
      version: "0.1.0"
    }),
    writeFile(
      path.join(packageRoot, "prompts", "system.md"),
      "You are an Entangle smoke-test worker node.\n",
      "utf8"
    ),
    writeFile(
      path.join(packageRoot, "prompts", "interaction.md"),
      "Wait for signed task messages and respond through Entangle.\n",
      "utf8"
    ),
    writeJsonFile(path.join(packageRoot, "runtime", "config.json"), {
      toolBudget: {
        maxOutputTokens: 1024,
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
      path.join(packageRoot, "memory", "schema", "AGENTS.md"),
      "# Smoke Memory Schema\n",
      "utf8"
    ),
    writeFile(
      path.join(packageRoot, "memory", "seed", "wiki", "index.md"),
      "# Smoke Wiki\n",
      "utf8"
    )
  ]);
}

async function createSmokeOpenCodeExecutable(binRoot: string): Promise<string> {
  await mkdir(binRoot, { recursive: true });
  const executablePath = path.join(binRoot, "opencode");
  await writeFile(
    executablePath,
    [
      "#!/usr/bin/env node",
      "const fs = require('node:fs');",
      "const path = require('node:path');",
      "const args = process.argv.slice(2);",
      "if (args.includes('--version')) {",
      "  console.log('1.14.20-smoke');",
      "  process.exit(0);",
      "}",
      "if (args[0] !== 'run') {",
      "  console.error(`Unsupported smoke opencode invocation: ${args.join(' ')}`);",
      "  process.exit(64);",
      "}",
      "let input = '';",
      "process.stdin.setEncoding('utf8');",
      "process.stdin.on('data', (chunk) => { input += chunk; });",
      "process.stdin.on('end', () => {",
      "  const approvalId = process.env.ENTANGLE_SMOKE_ENGINE_APPROVAL_ID || 'approval-engine-smoke';",
      "  const sourceChangeId = process.env.ENTANGLE_SMOKE_ENGINE_SOURCE_CHANGE_ID || 'source-change-engine-smoke';",
      "  const sourceRoot = process.cwd();",
      "  fs.mkdirSync(path.join(sourceRoot, 'src'), { recursive: true });",
      "  fs.writeFileSync(",
      "    path.join(sourceRoot, 'src', 'smoke-generated.ts'),",
      "    `export const smokeSourceChange = '${sourceChangeId}';\\n`,",
      "    'utf8'",
      "  );",
      "  const actionBlock = JSON.stringify({",
      "    approvalRequestDirectives: [",
      "      {",
      "        approvalId,",
      "        approverNodeIds: ['user'],",
      "        operation: 'source_application',",
      "        reason: 'Approve deterministic smoke source application.',",
      "        resource: {",
      "          id: sourceChangeId,",
      "          kind: 'source_change_candidate',",
      "          label: sourceChangeId",
      "        }",
      "      }",
      "    ]",
      "  });",
      "  console.log(JSON.stringify({",
      "    part: {",
      "      callID: 'tool-smoke-echo',",
      "      state: {",
      "        input: { command: 'echo smoke' },",
      "        output: 'smoke ok',",
      "        status: 'completed',",
      "        time: { end: 12, start: 0 },",
      "        title: 'echo smoke'",
      "      },",
      "      tool: 'bash'",
      "    },",
      "    sessionID: 'opencode-smoke-session',",
      "    type: 'tool_use'",
      "  }));",
      "  console.log(JSON.stringify({",
      "    part: {",
      "      text: [",
      "        'Smoke OpenCode adapter completed a deterministic turn.',",
      "        '```entangle-actions',",
      "        actionBlock,",
      "        '```'",
      "      ].join('\\n')",
      "    },",
      "    sessionID: 'opencode-smoke-session',",
      "    type: 'text'",
      "  }));",
      "});",
      ""
    ].join("\n"),
    "utf8"
  );
  await chmod(executablePath, 0o755);
  return executablePath;
}

async function hostRequest(input: {
  baseUrl: string;
  body?: unknown;
  method?: string;
  path: string;
}): Promise<unknown> {
  const response = await fetch(new URL(input.path, input.baseUrl), {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${operatorToken}`,
      ...(input.body ? { "content-type": "application/json" } : {})
    },
    method: input.method ?? "GET",
    ...(input.body ? { body: JSON.stringify(input.body) } : {})
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Host API ${input.method ?? "GET"} ${input.path} failed with HTTP ${response.status}: ${body}`
    );
  }

  return response.json();
}

async function waitForRunnerHeartbeat(input: {
  baseUrl: string;
  runnerId: string;
  stdout: () => string;
  stderr: () => string;
}): Promise<void> {
  const inspection = await waitFor(
    `${input.runnerId} heartbeat`,
    async () => {
      const response = runnerRegistryInspectionResponseSchema.parse(
        await hostRequest({
          baseUrl: input.baseUrl,
          path: `/v1/runners/${input.runnerId}`
        })
      );

      return response.runner.heartbeat ? response : undefined;
    },
    () => `\nstdout:\n${input.stdout()}\nstderr:\n${input.stderr()}`
  );

  printPass(
    "runner-heartbeat",
    `runner=${input.runnerId}; assignments=${inspection.runner.heartbeat?.assignmentIds.length ?? 0}`
  );
}

async function waitForRuntimeProjectionState(input: {
  assignmentId: string;
  baseUrl: string;
  label: string;
  minLastSeenAt?: string;
  nodeId: string;
  observedState: "failed" | "missing" | "running" | "starting" | "stopped";
  stderr: () => string;
  stdout: () => string;
}) {
  return waitFor(
    input.label,
    async () => {
      const projection = hostProjectionSnapshotSchema.parse(
        await hostRequest({
          baseUrl: input.baseUrl,
          path: "/v1/projection"
        })
      );
      const runtime = projection.runtimes.find(
        (candidate) =>
          candidate.assignmentId === input.assignmentId &&
          candidate.nodeId === input.nodeId &&
          candidate.observedState === input.observedState
      );

      if (
        runtime &&
        (!input.minLastSeenAt ||
          (runtime.lastSeenAt && runtime.lastSeenAt > input.minLastSeenAt))
      ) {
        return runtime;
      }

      return undefined;
    },
    () => `\nstdout:\n${input.stdout()}\nstderr:\n${input.stderr()}`
  );
}

function parseSecretKeyHex(secretKey: string): Uint8Array {
  return Uint8Array.from(Buffer.from(secretKey, "hex"));
}

async function publishSyntheticA2AMessage(input: {
  message: EntangleA2AMessage;
  relayUrls: string[];
  senderSecretKeyHex: string;
}): Promise<string> {
  const secretKey = parseSecretKeyHex(input.senderSecretKeyHex);
  const message = entangleA2AMessageSchema.parse(input.message);
  const rumor = nip59.createRumor(
    {
      content: JSON.stringify(message),
      kind: entangleNostrRumorKind,
      tags: []
    },
    secretKey
  );
  const seal = nip59.createSeal(rumor, secretKey, message.toPubkey);
  const wrappedEvent = nip59.createWrap(seal, message.toPubkey);
  const pool = new SimplePool();

  try {
    await Promise.all(pool.publish(input.relayUrls, wrappedEvent));
    return rumor.id;
  } finally {
    pool.destroy();
  }
}

function appendBounded(current: string, chunk: Buffer | string): string {
  return truncateLog(current + chunk.toString(), 12000);
}

function assertSignerMatchesFromPubkey(
  value: {
    fromPubkey: string;
    signerPubkey?: string | undefined;
  },
  label: string
): void {
  assertCondition(
    value.signerPubkey === value.fromPubkey,
    `${label} signerPubkey must match fromPubkey.`
  );
}

function readGitArtifactIdentity(
  ref: unknown,
  label: string
): { artifactId: string; commit: string; repositoryName: string } {
  if (typeof ref !== "object" || ref === null) {
    throw new Error(`${label} must be an artifact object.`);
  }

  const artifact = ref as {
    artifactId?: unknown;
    backend?: unknown;
    locator?: unknown;
  };

  if (artifact.backend !== "git") {
    throw new Error(`${label} must use a git locator.`);
  }

  if (typeof artifact.artifactId !== "string") {
    throw new Error(`${label} must include an artifact id.`);
  }

  if (typeof artifact.locator !== "object" || artifact.locator === null) {
    throw new Error(`${label} must include a git locator object.`);
  }

  const locator = artifact.locator as {
    commit?: unknown;
    repositoryName?: unknown;
  };

  if (typeof locator.commit !== "string") {
    throw new Error(`${label} must include a git commit.`);
  }

  if (typeof locator.repositoryName !== "string") {
    throw new Error(`${label} must include a git repository name.`);
  }

  return {
    artifactId: artifact.artifactId,
    commit: locator.commit,
    repositoryName: locator.repositoryName
  };
}

async function stopRunnerProcess(
  child: ChildProcessByStdio<null, Readable, Readable> | undefined
): Promise<void> {
  if (!child || child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  const closed = new Promise<void>((resolve) => {
    child.once("close", () => resolve());
  });
  child.kill("SIGTERM");
  await Promise.race([
    closed,
    sleep(5000).then(() => {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
      }
    })
  ]);
}

async function main(): Promise<void> {
  await assertRelayReachable(relayUrl);
  printPass("relay-preflight", relayUrl);
  if (userClientStaticDir) {
    printPass("user-client-static-dir", userClientStaticDir);
  }

  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), "entangle-process-runner-smoke-")
  );
  const runId = path
    .basename(tempRoot)
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(-48);
  const assignmentId = `assignment-${runId}`;
  const userAssignmentId = `assignment-user-${runId}`;
  const reviewerUserAssignmentId = `assignment-reviewer-user-${runId}`;
  const conversationId = `conversation-${runId}`;
  const reviewerConversationId = `conversation-reviewer-${runId}`;
  const graphId = `graph-${runId}`;
  const runnerId = `runner-${runId}`;
  const userRunnerId = `user-runner-${runId}`;
  const reviewerUserRunnerId = `reviewer-user-runner-${runId}`;
  const sessionId = `session-${runId}`;
  const reviewerSessionId = `session-reviewer-${runId}`;
  const turnId = `turn-${runId}`;
  const reviewerTurnId = `turn-reviewer-${runId}`;
  const engineApprovalId = `approval-engine-${runId}`;
  const engineSourceChangeId = `source-change-engine-${runId}`;
  const fakeOpenCodeBin = path.join(tempRoot, "fake-bin");
  const hostHome = path.join(tempRoot, "host-home");
  const hostSecrets = path.join(tempRoot, "host-secrets");
  const runnerRoot = path.join(tempRoot, "runner-root");
  const runnerStateRoot = path.join(runnerRoot, "state");
  const userRunnerRoot = path.join(tempRoot, "user-runner-root");
  const userRunnerStateRoot = path.join(userRunnerRoot, "state");
  const reviewerUserRunnerRoot = path.join(
    tempRoot,
    "reviewer-user-runner-root"
  );
  const reviewerUserRunnerStateRoot = path.join(
    reviewerUserRunnerRoot,
    "state"
  );
  const packageRoot = path.join(tempRoot, "package-source");
  await Promise.all([
    mkdir(hostHome, { recursive: true }),
    mkdir(hostSecrets, { recursive: true }),
    mkdir(runnerStateRoot, { recursive: true }),
    mkdir(userRunnerStateRoot, { recursive: true }),
    mkdir(reviewerUserRunnerStateRoot, { recursive: true }),
    createAgentPackage(packageRoot),
    createSmokeOpenCodeExecutable(fakeOpenCodeBin)
  ]);
  const smokePath = `${fakeOpenCodeBin}${path.delimiter}${process.env.PATH ?? ""}`;

  process.env.ENTANGLE_HOME = hostHome;
  process.env.ENTANGLE_SECRETS_HOME = hostSecrets;
  process.env.ENTANGLE_RUNTIME_BACKEND = "memory";
  process.env.ENTANGLE_HOST_LOGGER = "false";
  process.env.ENTANGLE_HOST_OPERATOR_TOKEN = operatorToken;
  process.env.ENTANGLE_DEFAULT_RELAY_READ_URL = relayUrl;
  process.env.ENTANGLE_DEFAULT_RELAY_WRITE_URL = relayUrl;
  process.env.ENTANGLE_DEFAULT_GIT_TRANSPORT = "file";
  process.env.ENTANGLE_DEFAULT_GIT_NAMESPACE = "team-alpha";
  const gitRemoteBase = pathToFileURL(path.join(tempRoot, "git")).toString();
  process.env.ENTANGLE_DEFAULT_GIT_REMOTE_BASE = gitRemoteBase;
  const primaryGitRepositoryPath = path.join(
    tempRoot,
    "git",
    "team-alpha",
    `${graphId}.git`
  );
  const nonPrimaryWikiRepositoryName = `${graphId}-wiki-public`;
  const nonPrimaryWikiRepositoryPath = path.join(
    tempRoot,
    "git",
    "team-alpha",
    `${nonPrimaryWikiRepositoryName}.git`
  );
  const userClientWikiRepositoryName = `${graphId}-wiki-user-client`;
  const userClientWikiRepositoryPath = path.join(
    tempRoot,
    "git",
    "team-alpha",
    `${userClientWikiRepositoryName}.git`
  );
  const nonPrimarySourceRepositoryName = `${graphId}-source-public`;
  const nonPrimarySourceRepositoryPath = path.join(
    tempRoot,
    "git",
    "team-alpha",
    `${nonPrimarySourceRepositoryName}.git`
  );
  const userClientSourceRepositoryName = `${graphId}-source-user-client`;
  const userClientSourceRepositoryPath = path.join(
    tempRoot,
    "git",
    "team-alpha",
    `${userClientSourceRepositoryName}.git`
  );
  await mkdir(path.dirname(primaryGitRepositoryPath), { recursive: true });
  runGit(["init", "--bare", primaryGitRepositoryPath]);
  runGit(["init", "--bare", nonPrimaryWikiRepositoryPath]);
  runGit(["init", "--bare", userClientWikiRepositoryPath]);
  runGit(["init", "--bare", nonPrimarySourceRepositoryPath]);
  runGit(["init", "--bare", userClientSourceRepositoryPath]);
  printPass("git-backend", gitRemoteBase);

  let server: Awaited<ReturnType<typeof buildHostServer>> | undefined;
  let controlPlane: HostFederatedControlPlane | undefined;
  let runnerProcess:
    | ChildProcessByStdio<null, Readable, Readable>
    | undefined;
  let userRunnerProcess:
    | ChildProcessByStdio<null, Readable, Readable>
    | undefined;
  let reviewerUserRunnerProcess:
    | ChildProcessByStdio<null, Readable, Readable>
    | undefined;
  let runnerStdout = "";
  let runnerStderr = "";
  let userRunnerStdout = "";
  let userRunnerStderr = "";
  let reviewerUserRunnerStdout = "";
  let reviewerUserRunnerStderr = "";
  let runnerExit:
    | {
        code: number | null;
        signal: NodeJS.Signals | null;
      }
    | undefined;
  let userRunnerExit:
    | {
        code: number | null;
        signal: NodeJS.Signals | null;
      }
    | undefined;
  let reviewerUserRunnerExit:
    | {
        code: number | null;
        signal: NodeJS.Signals | null;
      }
    | undefined;
  const runnerSecretEnv = "ENTANGLE_PROCESS_RUNNER_SMOKE_RUNNER_SECRET";
  const userRunnerSecretEnv =
    "ENTANGLE_PROCESS_RUNNER_SMOKE_USER_RUNNER_SECRET";
  const reviewerUserRunnerSecretEnv =
    "ENTANGLE_PROCESS_RUNNER_SMOKE_REVIEWER_USER_RUNNER_SECRET";

  try {
    const [stateModule, hostModule, controlPlaneModule, hostTransportModule] =
      await Promise.all([
        import("../src/state.js"),
        import("../src/index.js"),
        import("../src/federated-control-plane.js"),
        import("../src/federated-nostr-transport.js")
      ]);

    await stateModule.initializeHostState();
    const exportedAuthority = await stateModule.exportHostAuthority();
    const hostSecretKey = Uint8Array.from(
      Buffer.from(exportedAuthority.secretKey, "hex")
    );
    const hostTransport = new hostTransportModule.HostFederatedNostrTransport({
      secretKey: hostSecretKey
    });
    controlPlane = new controlPlaneModule.HostFederatedControlPlane({
      transport: hostTransport
    });
    await controlPlane.subscribeObservationEvents({
      hostAuthorityPubkey: exportedAuthority.authority.publicKey,
      relayUrls
    });

    server = await hostModule.buildHostServer({
      federatedControlPlane: controlPlane,
      federatedControlRelayUrls: relayUrls
    });
    await server.listen({
      host: "127.0.0.1",
      port: 0
    });
    const address = server.server.address();
    if (typeof address !== "object" || address === null) {
      throw new Error("Host server did not expose a TCP address.");
    }
    const hostBaseUrl = `http://127.0.0.1:${address.port}`;
    printPass("host-server", hostBaseUrl);

    const packageSource = packageSourceInspectionResponseSchema.parse(
      await hostRequest({
        baseUrl: hostBaseUrl,
        body: {
          absolutePath: packageRoot,
          sourceKind: "local_path"
        },
        method: "POST",
        path: "/v1/package-sources/admit"
      })
    ).packageSource;
    printPass("package", packageSource.packageSourceId);

    const graphMutation = graphMutationResponseSchema.parse(
      await hostRequest({
        baseUrl: hostBaseUrl,
        body: {
          defaults: {
            resourceBindings: {
              relayProfileRefs: ["preview-relay"]
            },
            runtimeProfile: "federated"
          },
          edges: [
            {
              edgeId: "user-to-builder",
              enabled: true,
              fromNodeId: "user",
              relation: "delegates_to",
              toNodeId: "builder",
              transportPolicy: {
                channel: "process-runner-smoke",
                mode: "bidirectional_shared_set",
                relayProfileRefs: ["preview-relay"]
              }
            },
            {
              edgeId: "reviewer-user-to-builder",
              enabled: true,
              fromNodeId: "reviewer-user",
              relation: "reviews",
              toNodeId: "builder",
              transportPolicy: {
                channel: "process-runner-smoke",
                mode: "bidirectional_shared_set",
                relayProfileRefs: ["preview-relay"]
              }
            }
          ],
          graphId,
          name: "Process Runner Smoke Graph",
          nodes: [
            {
              displayName: "User",
              nodeId: "user",
              nodeKind: "user"
            },
            {
              displayName: "Reviewer User",
              nodeId: "reviewer-user",
              nodeKind: "user"
            },
            {
              displayName: "Builder",
              nodeId: "builder",
              nodeKind: "worker",
              packageSourceRef: packageSource.packageSourceId,
              policy: {
                sourceMutation: {
                  applyRequiresApproval: false,
                  nonPrimaryPublishRequiresApproval: false,
                  publishRequiresApproval: false
                }
              },
              resourceBindings: {
                relayProfileRefs: ["preview-relay"]
              }
            }
          ],
          schemaVersion: "1"
        },
        method: "PUT",
        path: "/v1/graph"
      })
    );
    assertCondition(
      graphMutation.validation.ok,
      `Graph validation failed: ${JSON.stringify(graphMutation.validation.findings)}`
    );
    printPass("graph", `revision=${graphMutation.activeRevisionId}`);

    const runnerSecretKey = generateSecretKey();
    const runnerPubkey = getPublicKey(runnerSecretKey);
    const runnerSecretHex = Buffer.from(runnerSecretKey).toString("hex");
    const joinConfig: RunnerJoinConfig = runnerJoinConfigSchema.parse({
      capabilities: {
        agentEngineKinds: ["opencode_server"],
        labels: ["process-smoke"],
        maxAssignments: 1,
        runtimeKinds: ["agent_runner"],
        supportsLocalWorkspace: true,
        supportsNip59: true
      },
      heartbeatIntervalMs: runnerHeartbeatIntervalMs,
      hostApi: {
        auth: {
          envVar: "ENTANGLE_HOST_TOKEN",
          mode: "bearer_env"
        },
        baseUrl: hostBaseUrl,
        runtimeIdentitySecret: {
          mode: "host_api"
        }
      },
      hostAuthorityPubkey: exportedAuthority.authority.publicKey,
      identity: {
        publicKey: runnerPubkey,
        secretDelivery: {
          envVar: runnerSecretEnv,
          mode: "env_var"
        }
      },
      relayUrls,
      runnerId,
      schemaVersion: "1"
    });
    const joinConfigPath = path.join(runnerRoot, "runner-join.json");
    await writeJsonFile(joinConfigPath, joinConfig);

    const userRunnerSecretKey = generateSecretKey();
    const userRunnerPubkey = getPublicKey(userRunnerSecretKey);
    const userRunnerSecretHex = Buffer.from(userRunnerSecretKey).toString("hex");
    const userRunnerJoinConfig: RunnerJoinConfig = runnerJoinConfigSchema.parse({
      capabilities: {
        agentEngineKinds: [],
        labels: ["process-smoke", "human-interface"],
        maxAssignments: 1,
        runtimeKinds: ["human_interface"],
        supportsLocalWorkspace: true,
        supportsNip59: true
      },
      heartbeatIntervalMs: runnerHeartbeatIntervalMs,
      hostApi: {
        auth: {
          envVar: "ENTANGLE_HOST_TOKEN",
          mode: "bearer_env"
        },
        baseUrl: hostBaseUrl,
        runtimeIdentitySecret: {
          mode: "host_api"
        }
      },
      hostAuthorityPubkey: exportedAuthority.authority.publicKey,
      identity: {
        publicKey: userRunnerPubkey,
        secretDelivery: {
          envVar: userRunnerSecretEnv,
          mode: "env_var"
        }
      },
      relayUrls,
      runnerId: userRunnerId,
      schemaVersion: "1"
    });
    const userRunnerJoinConfigPath = path.join(
      userRunnerRoot,
      "runner-join.json"
    );
    await writeJsonFile(userRunnerJoinConfigPath, userRunnerJoinConfig);

    const reviewerUserRunnerSecretKey = generateSecretKey();
    const reviewerUserRunnerPubkey = getPublicKey(reviewerUserRunnerSecretKey);
    const reviewerUserRunnerSecretHex = Buffer.from(
      reviewerUserRunnerSecretKey
    ).toString("hex");
    const reviewerUserRunnerJoinConfig: RunnerJoinConfig =
      runnerJoinConfigSchema.parse({
        capabilities: {
          agentEngineKinds: [],
          labels: ["process-smoke", "human-interface", "reviewer-user"],
          maxAssignments: 1,
          runtimeKinds: ["human_interface"],
          supportsLocalWorkspace: true,
          supportsNip59: true
        },
        heartbeatIntervalMs: runnerHeartbeatIntervalMs,
        hostApi: {
          auth: {
            envVar: "ENTANGLE_HOST_TOKEN",
            mode: "bearer_env"
          },
          baseUrl: hostBaseUrl,
          runtimeIdentitySecret: {
            mode: "host_api"
          }
        },
        hostAuthorityPubkey: exportedAuthority.authority.publicKey,
        identity: {
          publicKey: reviewerUserRunnerPubkey,
          secretDelivery: {
            envVar: reviewerUserRunnerSecretEnv,
            mode: "env_var"
          }
        },
        relayUrls,
        runnerId: reviewerUserRunnerId,
        schemaVersion: "1"
      });
    const reviewerUserRunnerJoinConfigPath = path.join(
      reviewerUserRunnerRoot,
      "runner-join.json"
    );
    await writeJsonFile(
      reviewerUserRunnerJoinConfigPath,
      reviewerUserRunnerJoinConfig
    );

    const child = spawn(
      "pnpm",
      [
        "--filter",
        "@entangle/runner",
        "exec",
        "tsx",
        "src/index.ts",
        "join",
        "--config",
        joinConfigPath
      ],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          ENTANGLE_HOST_LOGGER: "false",
          ENTANGLE_HOST_TOKEN: operatorToken,
          ENTANGLE_RUNNER_STATE_ROOT: runnerStateRoot,
          ENTANGLE_SMOKE_ENGINE_APPROVAL_ID: engineApprovalId,
          ENTANGLE_SMOKE_ENGINE_SOURCE_CHANGE_ID: engineSourceChangeId,
          PATH: smokePath,
          ...(userClientStaticDir
            ? { ENTANGLE_USER_CLIENT_STATIC_DIR: userClientStaticDir }
            : {}),
          [runnerSecretEnv]: runnerSecretHex
        },
        stdio: ["ignore", "pipe", "pipe"]
      }
    );
    runnerProcess = child;
    child.stdout.on("data", (chunk: Buffer | string) => {
      runnerStdout = appendBounded(runnerStdout, chunk);
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      runnerStderr = appendBounded(runnerStderr, chunk);
    });
    child.once("close", (code, signal) => {
      runnerExit = { code, signal };
    });
    printPass("runner-process", `pid=${child.pid ?? "unknown"}`);

    const userChild = spawn(
      "pnpm",
      [
        "--filter",
        "@entangle/runner",
        "exec",
        "tsx",
        "src/index.ts",
        "join",
        "--config",
        userRunnerJoinConfigPath
      ],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          ENTANGLE_HOST_LOGGER: "false",
          ENTANGLE_HOST_TOKEN: operatorToken,
          ENTANGLE_RUNNER_STATE_ROOT: userRunnerStateRoot,
          ...(userClientStaticDir
            ? { ENTANGLE_USER_CLIENT_STATIC_DIR: userClientStaticDir }
            : {}),
          [userRunnerSecretEnv]: userRunnerSecretHex
        },
        stdio: ["ignore", "pipe", "pipe"]
      }
    );
    userRunnerProcess = userChild;
    userChild.stdout.on("data", (chunk: Buffer | string) => {
      userRunnerStdout = appendBounded(userRunnerStdout, chunk);
    });
    userChild.stderr.on("data", (chunk: Buffer | string) => {
      userRunnerStderr = appendBounded(userRunnerStderr, chunk);
    });
    userChild.once("close", (code, signal) => {
      userRunnerExit = { code, signal };
    });
    printPass("user-runner-process", `pid=${userChild.pid ?? "unknown"}`);

    const reviewerUserChild = spawn(
      "pnpm",
      [
        "--filter",
        "@entangle/runner",
        "exec",
        "tsx",
        "src/index.ts",
        "join",
        "--config",
        reviewerUserRunnerJoinConfigPath
      ],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          ENTANGLE_HOST_LOGGER: "false",
          ENTANGLE_HOST_TOKEN: operatorToken,
          ENTANGLE_RUNNER_STATE_ROOT: reviewerUserRunnerStateRoot,
          ...(userClientStaticDir
            ? { ENTANGLE_USER_CLIENT_STATIC_DIR: userClientStaticDir }
            : {}),
          [reviewerUserRunnerSecretEnv]: reviewerUserRunnerSecretHex
        },
        stdio: ["ignore", "pipe", "pipe"]
      }
    );
    reviewerUserRunnerProcess = reviewerUserChild;
    reviewerUserChild.stdout.on("data", (chunk: Buffer | string) => {
      reviewerUserRunnerStdout = appendBounded(
        reviewerUserRunnerStdout,
        chunk
      );
    });
    reviewerUserChild.stderr.on("data", (chunk: Buffer | string) => {
      reviewerUserRunnerStderr = appendBounded(
        reviewerUserRunnerStderr,
        chunk
      );
    });
    reviewerUserChild.once("close", (code, signal) => {
      reviewerUserRunnerExit = { code, signal };
    });
    printPass(
      "reviewer-user-runner-process",
      `pid=${reviewerUserChild.pid ?? "unknown"}`
    );

    await waitFor(
      "runner registration",
      async () => {
        if (runnerExit) {
          throw new Error(
            `Runner process exited early: ${JSON.stringify(runnerExit)}\nstdout:\n${runnerStdout}\nstderr:\n${runnerStderr}`
          );
        }

        try {
          return runnerRegistryInspectionResponseSchema.parse(
            await hostRequest({
              baseUrl: hostBaseUrl,
              path: `/v1/runners/${runnerId}`
            })
          );
        } catch {
          return undefined;
        }
      },
      () => `\nstdout:\n${runnerStdout}\nstderr:\n${runnerStderr}`
    );
    printPass("runner-hello", `runner=${runnerId}`);
    await waitForRunnerHeartbeat({
      baseUrl: hostBaseUrl,
      runnerId,
      stderr: () => runnerStderr,
      stdout: () => runnerStdout
    });

    await waitFor(
      "User Node runner registration",
      async () => {
        if (userRunnerExit) {
          throw new Error(
            `User Node runner process exited early: ${JSON.stringify(userRunnerExit)}\nstdout:\n${userRunnerStdout}\nstderr:\n${userRunnerStderr}`
          );
        }

        try {
          return runnerRegistryInspectionResponseSchema.parse(
            await hostRequest({
              baseUrl: hostBaseUrl,
              path: `/v1/runners/${userRunnerId}`
            })
          );
        } catch {
          return undefined;
        }
      },
      () => `\nstdout:\n${userRunnerStdout}\nstderr:\n${userRunnerStderr}`
    );
    printPass("user-runner-hello", `runner=${userRunnerId}`);
    await waitForRunnerHeartbeat({
      baseUrl: hostBaseUrl,
      runnerId: userRunnerId,
      stderr: () => userRunnerStderr,
      stdout: () => userRunnerStdout
    });

    await waitFor(
      "Reviewer User Node runner registration",
      async () => {
        if (reviewerUserRunnerExit) {
          throw new Error(
            `Reviewer User Node runner process exited early: ${JSON.stringify(reviewerUserRunnerExit)}\nstdout:\n${reviewerUserRunnerStdout}\nstderr:\n${reviewerUserRunnerStderr}`
          );
        }

        try {
          return runnerRegistryInspectionResponseSchema.parse(
            await hostRequest({
              baseUrl: hostBaseUrl,
              path: `/v1/runners/${reviewerUserRunnerId}`
            })
          );
        } catch {
          return undefined;
        }
      },
      () =>
        `\nstdout:\n${reviewerUserRunnerStdout}\nstderr:\n${reviewerUserRunnerStderr}`
    );
    printPass(
      "reviewer-user-runner-hello",
      `runner=${reviewerUserRunnerId}`
    );
    await waitForRunnerHeartbeat({
      baseUrl: hostBaseUrl,
      runnerId: reviewerUserRunnerId,
      stderr: () => reviewerUserRunnerStderr,
      stdout: () => reviewerUserRunnerStdout
    });

    await hostRequest({
      baseUrl: hostBaseUrl,
      body: {
        reason: "Federated process runner smoke.",
        trustedBy: "smoke"
      },
      method: "POST",
      path: `/v1/runners/${runnerId}/trust`
    });
    printPass("runner-trust", "trusted");

    await hostRequest({
      baseUrl: hostBaseUrl,
      body: {
        reason: "Federated process runner smoke User Node runner.",
        trustedBy: "smoke"
      },
      method: "POST",
      path: `/v1/runners/${userRunnerId}/trust`
    });
    printPass("user-runner-trust", "trusted");

    await hostRequest({
      baseUrl: hostBaseUrl,
      body: {
        reason: "Federated process runner smoke reviewer User Node runner.",
        trustedBy: "smoke"
      },
      method: "POST",
      path: `/v1/runners/${reviewerUserRunnerId}/trust`
    });
    printPass("reviewer-user-runner-trust", "trusted");

    const assignment = runtimeAssignmentOfferResponseSchema.parse(
      await hostRequest({
        baseUrl: hostBaseUrl,
        body: {
          assignmentId,
          leaseDurationSeconds: 3600,
          nodeId: "builder",
          runnerId
        },
        method: "POST",
        path: "/v1/assignments"
      })
    ).assignment;
    printPass("assignment-offer", assignment.assignmentId);

    await waitFor(
      "assignment and runtime running projection",
      async () => {
        if (runnerExit) {
          throw new Error(
            `Runner process exited before runtime projection: ${JSON.stringify(runnerExit)}\nstdout:\n${runnerStdout}\nstderr:\n${runnerStderr}`
          );
        }

        const projection = hostProjectionSnapshotSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: "/v1/projection"
          })
        );
        const acceptedAssignment = projection.assignments.find(
          (candidate) =>
            candidate.assignmentId === assignment.assignmentId &&
            candidate.status === "accepted"
        );
        const runningRuntime = projection.runtimes.find(
          (candidate) =>
            candidate.assignmentId === assignment.assignmentId &&
            candidate.nodeId === "builder" &&
            candidate.observedState === "running"
        );

        return acceptedAssignment && runningRuntime
          ? { acceptedAssignment, runningRuntime }
          : undefined;
      },
      () => `\nstdout:\n${runnerStdout}\nstderr:\n${runnerStderr}`
    );
    printPass("runtime-projection", "assignment=accepted; runtime=running");

    const stopInspection = runtimeInspectionResponseSchema.parse(
      await hostRequest({
        baseUrl: hostBaseUrl,
        method: "POST",
        path: "/v1/runtimes/builder/stop"
      })
    );
    assertCondition(
      stopInspection.backendKind === "federated" &&
        stopInspection.desiredState === "stopped",
      "Federated runtime stop must return a stopped federated intent."
    );
    const stoppedRuntimeProjection = await waitForRuntimeProjectionState({
      assignmentId: assignment.assignmentId,
      baseUrl: hostBaseUrl,
      label: "federated runtime stop projection",
      nodeId: "builder",
      observedState: "stopped",
      stderr: () => runnerStderr,
      stdout: () => runnerStdout
    });
    printPass(
      "runtime-lifecycle-stop",
      `runtime=${stoppedRuntimeProjection.observedState}`
    );

    const startInspection = runtimeInspectionResponseSchema.parse(
      await hostRequest({
        baseUrl: hostBaseUrl,
        method: "POST",
        path: "/v1/runtimes/builder/start"
      })
    );
    assertCondition(
      startInspection.backendKind === "federated" &&
        startInspection.desiredState === "running",
      "Federated runtime start must return a running federated intent."
    );
    const startedRuntimeProjection = await waitForRuntimeProjectionState({
      assignmentId: assignment.assignmentId,
      baseUrl: hostBaseUrl,
      label: "federated runtime start projection",
      nodeId: "builder",
      observedState: "running",
      stderr: () => runnerStderr,
      stdout: () => runnerStdout
    });
    printPass(
      "runtime-lifecycle-start",
      `runtime=${startedRuntimeProjection.observedState}`
    );

    const restartBaseline = startedRuntimeProjection.lastSeenAt;
    const restartInspection = runtimeInspectionResponseSchema.parse(
      await hostRequest({
        baseUrl: hostBaseUrl,
        method: "POST",
        path: "/v1/runtimes/builder/restart"
      })
    );
    assertCondition(
      restartInspection.backendKind === "federated" &&
        restartInspection.restartGeneration > startInspection.restartGeneration,
      "Federated runtime restart must increment Host restart generation."
    );
    const restartedRuntimeProjection = await waitForRuntimeProjectionState({
      assignmentId: assignment.assignmentId,
      baseUrl: hostBaseUrl,
      label: "federated runtime restart projection",
      ...(restartBaseline ? { minLastSeenAt: restartBaseline } : {}),
      nodeId: "builder",
      observedState: "running",
      stderr: () => runnerStderr,
      stdout: () => runnerStdout
    });
    printPass(
      "runtime-lifecycle-restart",
      `runtime=${restartedRuntimeProjection.observedState}; restartGeneration=${restartInspection.restartGeneration}`
    );

    const lifecycleReceipts = await waitFor(
      "federated runtime lifecycle receipt events",
      async () => {
        const events = hostEventListResponseSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: "/v1/events?limit=100"
          })
        );
        const receiptKinds = new Set<string>();

        for (const event of events.events) {
          if (
            event.type === "runtime.assignment.receipt" &&
            event.assignmentId === assignment.assignmentId
          ) {
            receiptKinds.add(event.receiptKind);
          }
        }

        return receiptKinds.has("received") &&
          receiptKinds.has("stopped") &&
          receiptKinds.has("started")
          ? receiptKinds
          : undefined;
      },
      () => `\nstdout:\n${runnerStdout}\nstderr:\n${runnerStderr}`
    );
    printPass(
      "runtime-lifecycle-receipts",
      `receipts=${[...lifecycleReceipts].sort().join(",")}`
    );

    const lifecycleCommandReceipts = await waitFor(
      "federated runtime lifecycle command receipts",
      async () => {
        const projection = hostProjectionSnapshotSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: "/v1/projection"
          })
        );
        const completedCommandTypes = new Set(
          projection.runtimeCommandReceipts
            .filter(
              (receipt) =>
                receipt.assignmentId === assignment.assignmentId &&
                receipt.receiptStatus === "completed"
            )
            .map((receipt) => receipt.commandEventType)
        );

        return completedCommandTypes.has("runtime.stop") &&
          completedCommandTypes.has("runtime.start") &&
          completedCommandTypes.has("runtime.restart")
          ? completedCommandTypes
          : undefined;
      },
      () => `\nstdout:\n${runnerStdout}\nstderr:\n${runnerStderr}`
    );
    printPass(
      "runtime-lifecycle-command-receipts",
      `commands=${[...lifecycleCommandReceipts].sort().join(",")}`
    );

    const assignmentTimeline = runtimeAssignmentTimelineResponseSchema.parse(
      await hostRequest({
        baseUrl: hostBaseUrl,
        path: `/v1/assignments/${assignment.assignmentId}/timeline`
      })
    );
    assertCondition(
      assignmentTimeline.timeline.some(
        (entry) =>
          entry.entryKind === "assignment.receipt" &&
          entry.receiptKind === "started"
      ),
      "Assignment timeline must include the runner started receipt."
    );
    assertCondition(
      assignmentTimeline.timeline.some(
        (entry) => entry.entryKind === "assignment.accepted"
      ),
      "Assignment timeline must include assignment acceptance."
    );
    assertCondition(
      assignmentTimeline.commandReceipts.some(
        (receipt) =>
          receipt.commandEventType === "runtime.start" &&
          receipt.receiptStatus === "completed"
      ),
      "Assignment timeline must expose completed runtime command receipts."
    );
    assertCondition(
      assignmentTimeline.timeline.some(
        (entry) =>
          entry.entryKind === "runtime.command.receipt" &&
          entry.commandEventType === "runtime.start" &&
          entry.receiptStatus === "completed"
      ),
      "Assignment timeline must include runtime command receipt entries."
    );
    printPass(
      "assignment-timeline",
      `entries=${assignmentTimeline.timeline.length}; receipts=${assignmentTimeline.receipts.length}; commands=${assignmentTimeline.commandReceipts.length}`
    );

    const materializedContextPath = path.join(
      runnerStateRoot,
      "assignments",
      assignment.assignmentId,
      "runtime-context.json"
    );
    const materializedContext = runtimeContextInspectionResponseSchema.parse(
      JSON.parse(await readFile(materializedContextPath, "utf8")) as unknown
    );
    assertCondition(
      path
        .resolve(materializedContext.workspace.runtimeRoot)
        .startsWith(path.resolve(runnerStateRoot)),
      "Materialized runtime root must live under the runner state root."
    );
    assertCondition(
      path
        .resolve(materializedContext.workspace.packageRoot)
        .startsWith(path.resolve(runnerStateRoot)),
      "Materialized package root must live under the runner state root."
    );
    assertCondition(
      !path
        .resolve(materializedContext.workspace.runtimeRoot)
        .startsWith(`${path.resolve(hostHome)}${path.sep}`),
      "Materialized runtime root must not live under Host state."
    );
    printPass(
      "runner-materialization",
      `context=${materializedContextPath}`
    );

    const userAssignment = runtimeAssignmentOfferResponseSchema.parse(
      await hostRequest({
        baseUrl: hostBaseUrl,
        body: {
          assignmentId: userAssignmentId,
          leaseDurationSeconds: 3600,
          nodeId: "user",
          runnerId: userRunnerId
        },
        method: "POST",
        path: "/v1/assignments"
      })
    ).assignment;
    printPass("user-assignment-offer", userAssignment.assignmentId);

    const userRuntimeProjection = await waitFor(
      "User Node runtime running projection",
      async () => {
        if (userRunnerExit) {
          throw new Error(
            `User Node runner process exited before runtime projection: ${JSON.stringify(userRunnerExit)}\nstdout:\n${userRunnerStdout}\nstderr:\n${userRunnerStderr}`
          );
        }

        const projection = hostProjectionSnapshotSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: "/v1/projection"
          })
        );
        const acceptedAssignment = projection.assignments.find(
          (candidate) =>
            candidate.assignmentId === userAssignment.assignmentId &&
            candidate.status === "accepted"
        );
        const runningRuntime = projection.runtimes.find(
          (candidate) =>
            candidate.assignmentId === userAssignment.assignmentId &&
            candidate.nodeId === "user" &&
            candidate.observedState === "running" &&
            Boolean(candidate.clientUrl)
        );

        return acceptedAssignment && runningRuntime
          ? runningRuntime
          : undefined;
      },
      () => `\nstdout:\n${userRunnerStdout}\nstderr:\n${userRunnerStderr}`
    );
    const userClientUrl = userRuntimeProjection.clientUrl;
    if (!userClientUrl) {
      throw new Error(
        "User Node runtime projection must include a User Client URL."
      );
    }
    printPass(
      "user-runtime-projection",
      `runtime=running; client=${userClientUrl}`
    );

    const userRuntimeHealthResponse = await fetch(
      new URL("/health", userClientUrl)
    );
    assertCondition(
      userRuntimeHealthResponse.ok,
      `User Client health failed with HTTP ${userRuntimeHealthResponse.status}`
    );
    printPass("user-client-health", userClientUrl);

    if (userClientStaticDir) {
      const userClientIndexResponse = await fetch(new URL("/", userClientUrl));
      assertCondition(
        userClientIndexResponse.ok,
        `User Client static index failed with HTTP ${userClientIndexResponse.status}`
      );
      assertCondition(
        (await userClientIndexResponse.text()).includes('id="root"'),
        "User Client static index did not look like the dedicated app shell."
      );
      printPass("user-client-static-assets", userClientUrl);
    }

    const userClientStateResponse = await fetch(
      new URL("/api/state", userClientUrl)
    );
    assertCondition(
      userClientStateResponse.ok,
      `User Client state failed with HTTP ${userClientStateResponse.status}`
    );
    const userClientState = (await userClientStateResponse.json()) as {
      targets?: Array<{ nodeId?: string }>;
      userNodeId?: string;
    };
    assertCondition(
      userClientState.userNodeId === "user",
      "User Client state must identify the assigned User Node."
    );
    assertCondition(
      (userClientState.targets ?? []).some(
        (target) => target.nodeId === "builder"
      ),
      "User Client state must expose the builder edge target."
    );
    printPass("user-client-state", "user=user; target=builder");

    const materializedUserContextPath = path.join(
      userRunnerStateRoot,
      "assignments",
      userAssignment.assignmentId,
      "runtime-context.json"
    );
    const materializedUserContext = runtimeContextInspectionResponseSchema.parse(
      JSON.parse(await readFile(materializedUserContextPath, "utf8")) as unknown
    );
    assertCondition(
      materializedUserContext.binding.node.nodeKind === "user",
      "Materialized Human Interface Runtime context must belong to a User Node."
    );
    assertCondition(
      path
        .resolve(materializedUserContext.workspace.runtimeRoot)
        .startsWith(path.resolve(userRunnerStateRoot)),
      "Materialized User Node runtime root must live under the User Node runner state root."
    );
    printPass(
      "user-runner-materialization",
      `context=${materializedUserContextPath}`
    );

    const reviewerUserAssignment = runtimeAssignmentOfferResponseSchema.parse(
      await hostRequest({
        baseUrl: hostBaseUrl,
        body: {
          assignmentId: reviewerUserAssignmentId,
          leaseDurationSeconds: 3600,
          nodeId: "reviewer-user",
          runnerId: reviewerUserRunnerId
        },
        method: "POST",
        path: "/v1/assignments"
      })
    ).assignment;
    printPass(
      "reviewer-user-assignment-offer",
      reviewerUserAssignment.assignmentId
    );

    const reviewerUserRuntimeProjection = await waitFor(
      "Reviewer User Node runtime running projection",
      async () => {
        if (reviewerUserRunnerExit) {
          throw new Error(
            `Reviewer User Node runner process exited before runtime projection: ${JSON.stringify(reviewerUserRunnerExit)}\nstdout:\n${reviewerUserRunnerStdout}\nstderr:\n${reviewerUserRunnerStderr}`
          );
        }

        const projection = hostProjectionSnapshotSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: "/v1/projection"
          })
        );
        const acceptedAssignment = projection.assignments.find(
          (candidate) =>
            candidate.assignmentId === reviewerUserAssignment.assignmentId &&
            candidate.status === "accepted"
        );
        const runningRuntime = projection.runtimes.find(
          (candidate) =>
            candidate.assignmentId === reviewerUserAssignment.assignmentId &&
            candidate.nodeId === "reviewer-user" &&
            candidate.observedState === "running" &&
            Boolean(candidate.clientUrl)
        );

        return acceptedAssignment && runningRuntime
          ? runningRuntime
          : undefined;
      },
      () =>
        `\nstdout:\n${reviewerUserRunnerStdout}\nstderr:\n${reviewerUserRunnerStderr}`
    );
    const reviewerUserClientUrl = reviewerUserRuntimeProjection.clientUrl;
    if (!reviewerUserClientUrl) {
      throw new Error(
        "Reviewer User Node runtime projection must include a User Client URL."
      );
    }
    printPass(
      "reviewer-user-runtime-projection",
      `runtime=running; client=${reviewerUserClientUrl}`
    );

    const reviewerUserHealthResponse = await fetch(
      new URL("/health", reviewerUserClientUrl)
    );
    assertCondition(
      reviewerUserHealthResponse.ok,
      `Reviewer User Client health failed with HTTP ${reviewerUserHealthResponse.status}`
    );
    printPass("reviewer-user-client-health", reviewerUserClientUrl);

    const reviewerUserClientStateResponse = await fetch(
      new URL("/api/state", reviewerUserClientUrl)
    );
    assertCondition(
      reviewerUserClientStateResponse.ok,
      `Reviewer User Client state failed with HTTP ${reviewerUserClientStateResponse.status}`
    );
    const reviewerUserClientState =
      (await reviewerUserClientStateResponse.json()) as {
        targets?: Array<{ nodeId?: string }>;
        userNodeId?: string;
      };
    assertCondition(
      reviewerUserClientState.userNodeId === "reviewer-user",
      "Reviewer User Client state must identify the assigned User Node."
    );
    assertCondition(
      (reviewerUserClientState.targets ?? []).some(
        (target) => target.nodeId === "builder"
      ),
      "Reviewer User Client state must expose the builder edge target."
    );
    printPass(
      "reviewer-user-client-state",
      "user=reviewer-user; target=builder"
    );

    const materializedReviewerUserContextPath = path.join(
      reviewerUserRunnerStateRoot,
      "assignments",
      reviewerUserAssignment.assignmentId,
      "runtime-context.json"
    );
    const materializedReviewerUserContext =
      runtimeContextInspectionResponseSchema.parse(
        JSON.parse(
          await readFile(materializedReviewerUserContextPath, "utf8")
        ) as unknown
      );
    assertCondition(
      materializedReviewerUserContext.binding.node.nodeKind === "user" &&
        materializedReviewerUserContext.binding.node.nodeId === "reviewer-user",
      "Materialized reviewer Human Interface Runtime context must belong to the reviewer User Node."
    );
    assertCondition(
      path
        .resolve(materializedReviewerUserContext.workspace.runtimeRoot)
        .startsWith(path.resolve(reviewerUserRunnerStateRoot)),
      "Materialized reviewer User Node runtime root must live under the reviewer User Node runner state root."
    );
    printPass(
      "reviewer-user-runner-materialization",
      `context=${materializedReviewerUserContextPath}`
    );

    const userMessageResponse = await fetch(
      new URL("/api/messages", userClientUrl),
      {
        body: JSON.stringify({
          conversationId,
          messageType: "task.request",
          responsePolicy: {
            closeOnResult: false,
            maxFollowups: 0,
            responseRequired: false
          },
          sessionId,
          summary:
            "Process runner smoke: verify signed User Node task intake.",
          targetNodeId: "builder",
          turnId
        }),
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      }
    );
    await assertResponseOk(userMessageResponse, "User Client JSON publish");
    const userMessage = userNodeMessagePublishResponseSchema.parse(
      await userMessageResponse.json()
    );
    assertSignerMatchesFromPubkey(userMessage, "User Client JSON publish");
    assertCondition(
      userMessage.signerPubkey ===
        materializedUserContext.identityContext.publicKey,
      "User Client JSON publish must be signed by the assigned User Node identity."
    );
    printPass(
      "user-client-json-publish",
      `message=${userMessage.eventId}; relays=${userMessage.publishedRelays.length}`
    );

    const userMessageIntake = await waitFor(
      "runner user message intake",
      async () => {
        if (runnerExit) {
          throw new Error(
            `Runner process exited before User Node message intake: ${JSON.stringify(runnerExit)}\nstdout:\n${runnerStdout}\nstderr:\n${runnerStderr}`
          );
        }

        try {
          const [sessionRecord, conversationRecord] = await Promise.all([
            readFile(
              path.join(
                materializedContext.workspace.runtimeRoot,
                "sessions",
                `${userMessage.sessionId}.json`
              ),
              "utf8"
            ).then((content) =>
              sessionRecordSchema.parse(JSON.parse(content) as unknown)
            ),
            readFile(
              path.join(
                materializedContext.workspace.runtimeRoot,
                "conversations",
                `${userMessage.conversationId}.json`
              ),
              "utf8"
            ).then((content) =>
              conversationRecordSchema.parse(JSON.parse(content) as unknown)
            )
          ]);

          return sessionRecord.lastMessageId === userMessage.eventId &&
            conversationRecord.lastInboundMessageId === userMessage.eventId &&
            conversationRecord.peerNodeId === "user" &&
            conversationRecord.localNodeId === "builder"
            ? { conversationRecord, sessionRecord }
            : undefined;
        } catch {
          return undefined;
        }
      },
      () => `\nstdout:\n${runnerStdout}\nstderr:\n${runnerStderr}`
    );
    printPass(
      "user-node-intake",
      `session=${userMessageIntake.sessionRecord.sessionId}; conversation=${userMessageIntake.conversationRecord.conversationId}`
    );

    const projectedBuilderTurn = await waitFor(
      "Host projected builder turn read API",
      async () => {
        const turnList = runtimeTurnListResponseSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: "/v1/runtimes/builder/turns"
          })
        );
        const turn = turnList.turns.find(
          (candidate) =>
            candidate.conversationId === userMessage.conversationId &&
            candidate.messageId === userMessage.eventId &&
            candidate.phase === "blocked" &&
            candidate.requestedApprovalIds.includes(engineApprovalId) &&
            candidate.sessionId === userMessage.sessionId
        );

        if (!turn) {
          return undefined;
        }

        const inspection = runtimeTurnInspectionResponseSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: `/v1/runtimes/builder/turns/${turn.turnId}`
          })
        );

        return inspection.turn.requestedApprovalIds.includes(engineApprovalId)
          ? inspection.turn
          : undefined;
      },
      () => `\nstdout:\n${runnerStdout}\nstderr:\n${runnerStderr}`
    );
    printPass(
      "projected-runtime-turn-read-api",
      `turn=${projectedBuilderTurn.turnId}; phase=${projectedBuilderTurn.phase}`
    );

    const projectedBuilderSourceCandidate = await waitFor(
      "Host projected builder source-change candidate read API",
      async () => {
        const candidateList =
          runtimeSourceChangeCandidateListResponseSchema.parse(
            await hostRequest({
              baseUrl: hostBaseUrl,
              path: "/v1/runtimes/builder/source-change-candidates"
            })
          );
        const candidate = candidateList.candidates.find(
          (entry) =>
            entry.turnId === projectedBuilderTurn.turnId &&
            entry.sourceChangeSummary.files.some(
              (file) => file.path === "src/smoke-generated.ts"
            )
        );

        if (!candidate) {
          return undefined;
        }

        const inspection =
          runtimeSourceChangeCandidateInspectionResponseSchema.parse(
            await hostRequest({
              baseUrl: hostBaseUrl,
              path: `/v1/runtimes/builder/source-change-candidates/${candidate.candidateId}`
            })
          );

        const diff = runtimeSourceChangeCandidateDiffResponseSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: `/v1/runtimes/builder/source-change-candidates/${candidate.candidateId}/diff`
          })
        );
        const filePreview =
          runtimeSourceChangeCandidateFilePreviewResponseSchema.parse(
            await hostRequest({
              baseUrl: hostBaseUrl,
              path:
                `/v1/runtimes/builder/source-change-candidates/${candidate.candidateId}/file` +
                `?path=${encodeURIComponent("src/smoke-generated.ts")}`
            })
          );

        return inspection.candidate.candidateId === candidate.candidateId &&
          diff.diff.available &&
          diff.diff.content.includes("smoke-generated.ts") &&
          filePreview.preview.available &&
          filePreview.preview.content.includes("smokeSourceChange")
          ? { candidate, diff, filePreview }
          : undefined;
      },
      () => `\nstdout:\n${runnerStdout}\nstderr:\n${runnerStderr}`
    );
    printPass(
      "projected-runtime-source-change-read-api",
      `candidate=${projectedBuilderSourceCandidate.candidate.candidateId}; ` +
        `diff=${
          projectedBuilderSourceCandidate.diff.diff.available
            ? "available"
            : "unavailable"
        }; file=${
          projectedBuilderSourceCandidate.filePreview.preview.available
            ? "available"
            : "unavailable"
        }`
    );

    const userClientSourceDiffParams = new URLSearchParams({
      candidateId: projectedBuilderSourceCandidate.candidate.candidateId,
      conversationId: userMessage.conversationId,
      nodeId: "builder"
    });
    const userClientSourceDiffResponse = await fetch(
      new URL(
        `/api/source-change-candidates/diff?${userClientSourceDiffParams.toString()}`,
        userClientUrl
      )
    );
    await assertResponseOk(
      userClientSourceDiffResponse,
      "User Client JSON source-change diff"
    );
    const userClientSourceDiff =
      (await userClientSourceDiffResponse.json()) as {
        diff?: {
          available?: boolean;
          content?: string;
        };
        source?: string;
      };
    assertCondition(
      userClientSourceDiff.source === "projection" &&
        userClientSourceDiff.diff?.available === true &&
        (userClientSourceDiff.diff.content ?? "").includes(
          "smoke-generated.ts"
        ),
      "User Client source-change diff must resolve the visible source-change candidate."
    );
    printPass(
      "user-client-source-change-diff",
      `candidate=${projectedBuilderSourceCandidate.candidate.candidateId}; diff=available`
    );

    const userClientSourceFileParams = new URLSearchParams({
      candidateId: projectedBuilderSourceCandidate.candidate.candidateId,
      conversationId: userMessage.conversationId,
      nodeId: "builder",
      path: "src/smoke-generated.ts"
    });
    const userClientSourceFileResponse = await fetch(
      new URL(
        `/api/source-change-candidates/file?${userClientSourceFileParams.toString()}`,
        userClientUrl
      )
    );
    await assertResponseOk(
      userClientSourceFileResponse,
      "User Client JSON source-change file preview"
    );
    const userClientSourceFile =
      (await userClientSourceFileResponse.json()) as {
        path?: string;
        preview?: {
          available?: boolean;
          content?: string;
        };
        source?: string;
      };
    assertCondition(
      userClientSourceFile.source === "projection" &&
        userClientSourceFile.path === "src/smoke-generated.ts" &&
        userClientSourceFile.preview?.available === true &&
        (userClientSourceFile.preview.content ?? "").includes(
          "smokeSourceChange"
        ),
      "User Client source-change file preview must resolve the visible source file."
    );
    printPass(
      "user-client-source-change-file-preview",
      `candidate=${projectedBuilderSourceCandidate.candidate.candidateId}; file=available`
    );

    const sourceReviewResponse = await fetch(
      new URL("/api/source-change-candidates/review", userClientUrl),
      {
        body: JSON.stringify({
          candidateId: projectedBuilderSourceCandidate.candidate.candidateId,
          conversationId: userMessage.conversationId,
          nodeId: "builder",
          parentMessageId: userMessage.eventId,
          reason: "Process runner smoke accepted projected source change.",
          sessionId: userMessage.sessionId,
          status: "accepted",
          turnId: projectedBuilderTurn.turnId
        }),
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      }
    );
    await assertResponseOk(
      sourceReviewResponse,
      "User Client JSON source-change review"
    );
    const sourceReviewMessage = userNodeMessagePublishResponseSchema.parse(
      await sourceReviewResponse.json()
    );
    assertSignerMatchesFromPubkey(
      sourceReviewMessage,
      "User Client JSON source-change review"
    );
    assertCondition(
      sourceReviewMessage.signerPubkey ===
        materializedUserContext.identityContext.publicKey,
      "User Client JSON source-change review must be signed by the assigned User Node identity."
    );
    const reviewedBuilderSourceCandidate = await waitFor(
      "Host projected builder source-change review",
      async () => {
        const inspection =
          runtimeSourceChangeCandidateInspectionResponseSchema.parse(
            await hostRequest({
              baseUrl: hostBaseUrl,
              path: `/v1/runtimes/builder/source-change-candidates/${projectedBuilderSourceCandidate.candidate.candidateId}`
            })
          );

        return inspection.candidate.status === "accepted" &&
          inspection.candidate.review?.decidedBy === "user" &&
          inspection.candidate.application?.sourceHistoryId
          ? inspection.candidate
          : undefined;
      },
      () => `\nstdout:\n${runnerStdout}\nstderr:\n${runnerStderr}`
    );
    printPass(
      "user-node-source-change-review",
      `candidate=${reviewedBuilderSourceCandidate.candidateId}; ` +
        `status=${reviewedBuilderSourceCandidate.status}; ` +
        `sourceHistory=${reviewedBuilderSourceCandidate.application?.sourceHistoryId}`
    );

    const projectedBuilderSourceHistory = await waitFor(
      "Host projected builder source-history read API",
      async () => {
        const sourceHistoryId =
          reviewedBuilderSourceCandidate.application?.sourceHistoryId;

        if (!sourceHistoryId) {
          return undefined;
        }

        const historyList = runtimeSourceHistoryListResponseSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: "/v1/runtimes/builder/source-history"
          })
        );
        const history = historyList.history.find(
          (entry) => entry.sourceHistoryId === sourceHistoryId
        );

        if (!history) {
          return undefined;
        }

        const inspection = runtimeSourceHistoryInspectionResponseSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: `/v1/runtimes/builder/source-history/${sourceHistoryId}`
          })
        );

        return inspection.entry.commit === history.commit &&
          inspection.entry.publication?.publication.state === "published"
          ? inspection.entry
          : undefined;
      },
      () => `\nstdout:\n${runnerStdout}\nstderr:\n${runnerStderr}`
    );
    printPass(
      "projected-runtime-source-history-read-api",
      `sourceHistory=${projectedBuilderSourceHistory.sourceHistoryId}; ` +
        `commit=${projectedBuilderSourceHistory.commit}; ` +
        `publication=${projectedBuilderSourceHistory.publication?.publication.state}`
    );

    const sourceHistoryArtifactId =
      projectedBuilderSourceHistory.publication?.artifactId;
    assertCondition(
      Boolean(sourceHistoryArtifactId),
      "Published source history must expose an artifact id."
    );
    const projectedSourceHistoryArtifactGitInspection = await waitFor(
      "Host backend-resolved source-history artifact git inspection",
      async () => {
        const artifact = runtimeArtifactInspectionResponseSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: `/v1/runtimes/builder/artifacts/${sourceHistoryArtifactId}`
          })
        );
        const history = runtimeArtifactHistoryResponseSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path:
              `/v1/runtimes/builder/artifacts/${sourceHistoryArtifactId}` +
              "/history?limit=3"
          })
        );
        const diff = runtimeArtifactDiffResponseSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: `/v1/runtimes/builder/artifacts/${sourceHistoryArtifactId}/diff`
          })
        );

        return history.history.available &&
          artifact.artifact.ref.backend === "git" &&
          history.history.commits.some(
            (commit) => commit.commit === artifact.artifact.ref.locator.commit
          ) &&
          diff.diff.available &&
          diff.diff.content.includes("smoke-generated.ts")
          ? { artifact, diff, history }
          : undefined;
      },
      () => `\nstdout:\n${runnerStdout}\nstderr:\n${runnerStderr}`
    );
    printPass(
      "backend-resolved-artifact-history-diff",
      `artifact=${sourceHistoryArtifactId}; ` +
        `history=${
          projectedSourceHistoryArtifactGitInspection.history.history.available
            ? "available"
            : "unavailable"
        }; diff=${
          projectedSourceHistoryArtifactGitInspection.diff.diff.available
            ? "available"
            : "unavailable"
        }`
    );
    const sourceHistoryArtifactRef =
      projectedSourceHistoryArtifactGitInspection.artifact.artifact.ref;
    if (sourceHistoryArtifactRef.backend !== "git") {
      throw new Error("Source-history artifact must use the git backend.");
    }

    const artifactRestoreRequest = runtimeArtifactRestoreResponseSchema.parse(
      await hostRequest({
        baseUrl: hostBaseUrl,
        body: {
          reason:
            "Process runner smoke requested runner-owned artifact restore.",
          requestedBy: "process-runner-smoke",
          restoreId: "restore-source-history-artifact"
        },
        method: "POST",
        path: `/v1/runtimes/builder/artifacts/${sourceHistoryArtifactId}/restore`
      })
    );
    assertCondition(
      artifactRestoreRequest.status === "requested" &&
        artifactRestoreRequest.assignmentId === assignment.assignmentId,
      "Artifact restore request must be accepted as a federated runner command."
    );
    printPass(
      "artifact-restore-request",
      `command=${artifactRestoreRequest.commandId}; artifact=${sourceHistoryArtifactId}`
    );

    const restoredSourceHistoryArtifact = await waitFor(
      "Host projected runner-owned artifact restore",
      async () => {
        const inspection = runtimeArtifactInspectionResponseSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: `/v1/runtimes/builder/artifacts/${sourceHistoryArtifactId}`
          })
        );

        return inspection.artifact.retrieval?.state
          ? inspection.artifact
          : undefined;
      },
      () => `\nstdout:\n${runnerStdout}\nstderr:\n${runnerStderr}`
    );
    assertCondition(
      restoredSourceHistoryArtifact.retrieval?.state === "retrieved",
      `Artifact restore must complete successfully; observed ${
        restoredSourceHistoryArtifact.retrieval?.state ?? "missing"
      } retrieval state: ${
        restoredSourceHistoryArtifact.retrieval?.lastError ?? "no error detail"
      }`
    );
    printPass(
      "projected-runtime-artifact-restore",
      `artifact=${restoredSourceHistoryArtifact.ref.artifactId}; ` +
        `retrieval=${restoredSourceHistoryArtifact.retrieval?.state}`
    );

    const projectedArtifactRestoreReceipt = await waitFor(
      "Host projected artifact restore command receipt",
      async () => {
        const projection = hostProjectionSnapshotSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: "/v1/projection"
          })
        );

        return projection.runtimeCommandReceipts.find(
          (receipt) =>
            receipt.commandId === artifactRestoreRequest.commandId &&
            receipt.commandEventType === "runtime.artifact.restore" &&
            receipt.receiptStatus === "completed" &&
            receipt.artifactId === sourceHistoryArtifactId &&
            receipt.restoreId === "restore-source-history-artifact"
        );
      },
      () => `\nstdout:\n${runnerStdout}\nstderr:\n${runnerStderr}`
    );
    printPass(
      "projected-artifact-restore-command-receipt",
      `command=${projectedArtifactRestoreReceipt.commandId}; ` +
        `status=${projectedArtifactRestoreReceipt.receiptStatus}; ` +
        `artifact=${projectedArtifactRestoreReceipt.artifactId}`
    );

    const projectedReportArtifact = await waitFor(
      "Host projected runner report artifact",
      async () => {
        const artifactList = runtimeArtifactListResponseSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: "/v1/runtimes/builder/artifacts"
          })
        );

        return artifactList.artifacts.find(
          (artifact) =>
            artifact.ref.artifactId === `report-${projectedBuilderTurn.turnId}` &&
            artifact.ref.backend === "git" &&
            artifact.ref.status === "published"
        );
      },
      () => `\nstdout:\n${runnerStdout}\nstderr:\n${runnerStderr}`
    );
    const artifactProposalId = "artifact-proposal-report";
    const artifactProposalTargetPath = `artifact-proposals/${projectedBuilderTurn.turnId}.md`;
    const artifactProposalRequest =
      runtimeArtifactSourceChangeProposalResponseSchema.parse(
        await hostRequest({
          baseUrl: hostBaseUrl,
          body: {
            proposalId: artifactProposalId,
            reason:
              "Process runner smoke requested artifact source-change proposal.",
            requestedBy: "process-runner-smoke",
            targetPath: artifactProposalTargetPath
          },
          method: "POST",
          path:
            `/v1/runtimes/builder/artifacts/` +
            `${projectedReportArtifact.ref.artifactId}/source-change-proposal`
        })
      );
    assertCondition(
      artifactProposalRequest.status === "requested" &&
        artifactProposalRequest.assignmentId === assignment.assignmentId,
      "Artifact source-change proposal request must be accepted as a federated runner command."
    );
    printPass(
      "artifact-source-change-proposal-request",
      `command=${artifactProposalRequest.commandId}; candidate=${artifactProposalId}`
    );

    const projectedArtifactProposalCandidate = await waitFor(
      "Host projected artifact source-change proposal",
      async () => {
        const candidateList =
          runtimeSourceChangeCandidateListResponseSchema.parse(
            await hostRequest({
              baseUrl: hostBaseUrl,
              path: "/v1/runtimes/builder/source-change-candidates"
            })
          );

        return candidateList.candidates.find(
          (candidate) =>
            candidate.candidateId === artifactProposalId &&
            candidate.status === "pending_review" &&
            candidate.sourceChangeSummary.files.some(
              (file) => file.path === artifactProposalTargetPath
            )
        );
      },
      () => `\nstdout:\n${runnerStdout}\nstderr:\n${runnerStderr}`
    );
    printPass(
      "projected-artifact-source-change-proposal",
      `candidate=${projectedArtifactProposalCandidate.candidateId}; ` +
        `files=${projectedArtifactProposalCandidate.sourceChangeSummary.fileCount}`
    );

    const projectedArtifactProposalReceipt = await waitFor(
      "Host projected artifact proposal command receipt",
      async () => {
        const projection = hostProjectionSnapshotSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: "/v1/projection"
          })
        );

        return projection.runtimeCommandReceipts.find(
          (receipt) =>
            receipt.commandId === artifactProposalRequest.commandId &&
            receipt.commandEventType ===
              "runtime.artifact.propose_source_change" &&
            receipt.receiptStatus === "completed" &&
            receipt.candidateId === artifactProposalId
        );
      },
      () => `\nstdout:\n${runnerStdout}\nstderr:\n${runnerStderr}`
    );
    printPass(
      "projected-artifact-proposal-command-receipt",
      `command=${projectedArtifactProposalReceipt.commandId}; ` +
        `status=${projectedArtifactProposalReceipt.receiptStatus}; ` +
        `candidate=${projectedArtifactProposalReceipt.candidateId}`
    );

    const targetedSourceHistoryPublicationRequest =
      runtimeSourceHistoryPublishResponseSchema.parse(
        await hostRequest({
          baseUrl: hostBaseUrl,
          body: {
            reason:
              "Process runner smoke requested source-history publication to a non-primary target.",
            requestedBy: "process-runner-smoke",
            retryFailedPublication: false,
            target: {
              repositoryName: nonPrimarySourceRepositoryName
            }
          },
          method: "POST",
          path:
            `/v1/runtimes/builder/source-history/` +
            `${projectedBuilderSourceHistory.sourceHistoryId}/publish`
        })
      );
    assertCondition(
      targetedSourceHistoryPublicationRequest.status === "requested" &&
        targetedSourceHistoryPublicationRequest.assignmentId ===
          assignment.assignmentId,
      "Targeted source-history publication request must be accepted as a federated runner command."
    );
    printPass(
      "targeted-source-history-publication-request",
      `command=${targetedSourceHistoryPublicationRequest.commandId}; ` +
        `repository=${nonPrimarySourceRepositoryName}`
    );

    const projectedTargetedSourceHistoryPublicationArtifact = await waitFor(
      "Host projected runner-owned targeted source-history publication artifact",
      async () => {
        const artifactList = runtimeArtifactListResponseSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: "/v1/runtimes/builder/artifacts"
          })
        );
        const artifact = artifactList.artifacts.find(
          (entry) =>
            entry.ref.backend === "git" &&
            entry.ref.artifactKind === "commit" &&
            entry.ref.createdByNodeId === "builder" &&
            entry.ref.locator.repositoryName === nonPrimarySourceRepositoryName &&
            entry.ref.status === "published"
        );

        if (!artifact) {
          return undefined;
        }

        const inspection = runtimeArtifactInspectionResponseSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: `/v1/runtimes/builder/artifacts/${artifact.ref.artifactId}`
          })
        );

        return inspection.artifact.ref.status === "published"
          ? inspection.artifact
          : undefined;
      },
      () => `\nstdout:\n${runnerStdout}\nstderr:\n${runnerStderr}`
    );
    const projectedTargetedSourceHistoryArtifact = readGitArtifactIdentity(
      projectedTargetedSourceHistoryPublicationArtifact.ref,
      "Targeted published source-history artifact"
    );
    const targetedSourceRemoteHead = runGit([
      "--git-dir",
      nonPrimarySourceRepositoryPath,
      "rev-parse",
      `refs/heads/${sourceHistoryArtifactRef.locator.branch}`
    ]);
    assertCondition(
      targetedSourceRemoteHead === projectedTargetedSourceHistoryArtifact.commit,
      "Targeted published source-history artifact commit must match the non-primary remote source branch head."
    );
    assertCondition(
      projectedTargetedSourceHistoryArtifact.repositoryName ===
        nonPrimarySourceRepositoryName,
      "Targeted source-history artifact must identify the requested non-primary repository."
    );
    printPass(
      "targeted-runtime-source-history-publication",
      `artifact=${projectedTargetedSourceHistoryArtifact.artifactId}; ` +
        `repository=${projectedTargetedSourceHistoryArtifact.repositoryName}; ` +
        `commit=${projectedTargetedSourceHistoryArtifact.commit.slice(0, 12)}`
    );

    const projectedSourceHistoryPublicationReceipt = await waitFor(
      "Host projected source-history publication command receipt",
      async () => {
        const projection = hostProjectionSnapshotSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: "/v1/projection"
          })
        );

        return projection.runtimeCommandReceipts.find(
          (receipt) =>
            receipt.commandId ===
              targetedSourceHistoryPublicationRequest.commandId &&
            receipt.commandEventType === "runtime.source_history.publish" &&
            receipt.receiptStatus === "completed" &&
            receipt.sourceHistoryId ===
              projectedBuilderSourceHistory.sourceHistoryId
        );
      },
      () => `\nstdout:\n${runnerStdout}\nstderr:\n${runnerStderr}`
    );
    printPass(
      "projected-source-history-publication-command-receipt",
      `command=${projectedSourceHistoryPublicationReceipt.commandId}; ` +
        `status=${projectedSourceHistoryPublicationReceipt.receiptStatus}; ` +
        `sourceHistory=${projectedSourceHistoryPublicationReceipt.sourceHistoryId}`
    );

    const wikiPublicationRequest = runtimeWikiPublishResponseSchema.parse(
      await hostRequest({
        baseUrl: hostBaseUrl,
        body: {
          reason:
            "Process runner smoke requested runner-owned wiki publication.",
          requestedBy: "process-runner-smoke",
          retryFailedPublication: false
        },
        method: "POST",
        path: "/v1/runtimes/builder/wiki-repository/publish"
      })
    );
    assertCondition(
      wikiPublicationRequest.status === "requested" &&
        wikiPublicationRequest.assignmentId === assignment.assignmentId,
      "Wiki publication request must be accepted as a federated runner command."
    );
    printPass(
      "wiki-publication-request",
      `command=${wikiPublicationRequest.commandId}; assignment=${wikiPublicationRequest.assignmentId}`
    );

    const projectedWikiPublicationArtifact = await waitFor(
      "Host projected runner-owned wiki publication artifact",
      async () => {
        const artifactList = runtimeArtifactListResponseSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: "/v1/runtimes/builder/artifacts"
          })
        );
        const artifact = artifactList.artifacts.find(
          (entry) =>
            entry.ref.backend === "git" &&
            entry.ref.artifactKind === "knowledge_summary" &&
            entry.ref.createdByNodeId === "builder" &&
            entry.ref.locator.branch === "builder/wiki-repository" &&
            entry.ref.status === "published"
        );

        if (!artifact) {
          return undefined;
        }

        const inspection = runtimeArtifactInspectionResponseSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: `/v1/runtimes/builder/artifacts/${artifact.ref.artifactId}`
          })
        );

        return inspection.artifact.ref.status === "published"
          ? inspection.artifact
          : undefined;
      },
      () => `\nstdout:\n${runnerStdout}\nstderr:\n${runnerStderr}`
    );
    const projectedWikiArtifact = readGitArtifactIdentity(
      projectedWikiPublicationArtifact.ref,
      "Published wiki artifact"
    );
    const projectedWikiCommit = projectedWikiArtifact.commit;
    const wikiRemoteHead = runGit([
      "--git-dir",
      primaryGitRepositoryPath,
      "rev-parse",
      "refs/heads/builder/wiki-repository"
    ]);
    assertCondition(
      wikiRemoteHead === projectedWikiCommit,
      "Published wiki artifact commit must match the remote wiki branch head."
    );
    printPass(
      "projected-runtime-wiki-publication",
      `artifact=${projectedWikiArtifact.artifactId}; ` +
        `commit=${projectedWikiCommit.slice(0, 12)}`
    );

    const projectedWikiPublicationReceipt = await waitFor(
      "Host projected wiki publication command receipt",
      async () => {
        const projection = hostProjectionSnapshotSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: "/v1/projection"
          })
        );

        return projection.runtimeCommandReceipts.find(
          (receipt) =>
            receipt.commandId === wikiPublicationRequest.commandId &&
            receipt.commandEventType === "runtime.wiki.publish" &&
            receipt.receiptStatus === "completed" &&
            receipt.wikiArtifactId === projectedWikiArtifact.artifactId
        );
      },
      () => `\nstdout:\n${runnerStdout}\nstderr:\n${runnerStderr}`
    );
    printPass(
      "projected-wiki-publication-command-receipt",
      `command=${projectedWikiPublicationReceipt.commandId}; ` +
        `status=${projectedWikiPublicationReceipt.receiptStatus}; ` +
        `artifact=${projectedWikiPublicationReceipt.wikiArtifactId}`
    );

    const targetedWikiPublicationRequest = runtimeWikiPublishResponseSchema.parse(
      await hostRequest({
        baseUrl: hostBaseUrl,
        body: {
          reason:
            "Process runner smoke requested runner-owned wiki publication to a non-primary target.",
          requestedBy: "process-runner-smoke",
          retryFailedPublication: false,
          target: {
            repositoryName: nonPrimaryWikiRepositoryName
          }
        },
        method: "POST",
        path: "/v1/runtimes/builder/wiki-repository/publish"
      })
    );
    assertCondition(
      targetedWikiPublicationRequest.status === "requested" &&
        targetedWikiPublicationRequest.assignmentId === assignment.assignmentId,
      "Targeted wiki publication request must be accepted as a federated runner command."
    );
    printPass(
      "targeted-wiki-publication-request",
      `command=${targetedWikiPublicationRequest.commandId}; ` +
        `repository=${nonPrimaryWikiRepositoryName}`
    );

    const projectedTargetedWikiPublicationArtifact = await waitFor(
      "Host projected runner-owned targeted wiki publication artifact",
      async () => {
        const artifactList = runtimeArtifactListResponseSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: "/v1/runtimes/builder/artifacts"
          })
        );
        const artifact = artifactList.artifacts.find(
          (entry) =>
            entry.ref.backend === "git" &&
            entry.ref.artifactKind === "knowledge_summary" &&
            entry.ref.createdByNodeId === "builder" &&
            entry.ref.locator.branch === "builder/wiki-repository" &&
            entry.ref.locator.repositoryName === nonPrimaryWikiRepositoryName &&
            entry.ref.status === "published"
        );

        if (!artifact) {
          return undefined;
        }

        const inspection = runtimeArtifactInspectionResponseSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: `/v1/runtimes/builder/artifacts/${artifact.ref.artifactId}`
          })
        );

        return inspection.artifact.ref.status === "published"
          ? inspection.artifact
          : undefined;
      },
      () => `\nstdout:\n${runnerStdout}\nstderr:\n${runnerStderr}`
    );
    const projectedTargetedWikiArtifact = readGitArtifactIdentity(
      projectedTargetedWikiPublicationArtifact.ref,
      "Targeted published wiki artifact"
    );
    const targetedWikiRemoteHead = runGit([
      "--git-dir",
      nonPrimaryWikiRepositoryPath,
      "rev-parse",
      "refs/heads/builder/wiki-repository"
    ]);
    assertCondition(
      targetedWikiRemoteHead === projectedTargetedWikiArtifact.commit,
      "Targeted published wiki artifact commit must match the non-primary remote wiki branch head."
    );
    assertCondition(
      projectedTargetedWikiArtifact.repositoryName === nonPrimaryWikiRepositoryName,
      "Targeted wiki artifact must identify the requested non-primary repository."
    );
    printPass(
      "targeted-runtime-wiki-publication",
      `artifact=${projectedTargetedWikiArtifact.artifactId}; ` +
        `repository=${projectedTargetedWikiArtifact.repositoryName}; ` +
        `commit=${projectedTargetedWikiArtifact.commit.slice(0, 12)}`
    );

    const projectedBuilderApproval = await waitFor(
      "Host projected builder approval read API",
      async () => {
        const approvalList = runtimeApprovalListResponseSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: "/v1/runtimes/builder/approvals"
          })
        );
        const approval = approvalList.approvals.find(
          (candidate) =>
            candidate.approvalId === engineApprovalId &&
            candidate.requestedByNodeId === "builder" &&
            candidate.sessionId === userMessage.sessionId &&
            candidate.status === "pending"
        );

        if (!approval) {
          return undefined;
        }

        const inspection = runtimeApprovalInspectionResponseSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: `/v1/runtimes/builder/approvals/${engineApprovalId}`
          })
        );

        return inspection.approval.status === "pending"
          ? inspection.approval
          : undefined;
      },
      () => `\nstdout:\n${runnerStdout}\nstderr:\n${runnerStderr}`
    );
    printPass(
      "projected-runtime-approval-read-api",
      `approval=${projectedBuilderApproval.approvalId}; status=${projectedBuilderApproval.status}`
    );

    const projectedBuilderSession = await waitFor(
      "Host projected builder session read API",
      async () => {
        const sessionList = sessionListResponseSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: "/v1/sessions"
          })
        );
        const summary = sessionList.sessions.find(
          (candidate) =>
            candidate.sessionId === userMessage.sessionId &&
            candidate.nodeIds.includes("builder") &&
            candidate.waitingApprovalIds.includes(engineApprovalId)
        );

        if (!summary) {
          return undefined;
        }

        const inspection = sessionInspectionResponseSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: `/v1/sessions/${userMessage.sessionId}`
          })
        );
        const node = inspection.nodes.find(
          (candidate) =>
            candidate.nodeId === "builder" &&
            candidate.session.status === "waiting_approval" &&
            candidate.session.waitingApprovalIds.includes(engineApprovalId)
        );

        return node ? { inspection, node, summary } : undefined;
      },
      () => `\nstdout:\n${runnerStdout}\nstderr:\n${runnerStderr}`
    );
    printPass(
      "projected-session-read-api",
      `session=${projectedBuilderSession.inspection.sessionId}; node=${projectedBuilderSession.node.nodeId}; status=${projectedBuilderSession.node.session.status}`
    );

    const projectedUserConversation = await waitFor(
      "Host User Node conversation projection",
      async () => {
        const projection = hostProjectionSnapshotSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: "/v1/projection"
          })
        );

        return projection.userConversations.find(
          (conversation) =>
            conversation.conversationId === userMessage.conversationId &&
            conversation.userNodeId === "user" &&
            conversation.peerNodeId === "builder"
        );
      },
      () => `\nstdout:\n${runnerStdout}\nstderr:\n${runnerStderr}`
    );
    printPass(
      "user-node-projection",
      `user=${projectedUserConversation.userNodeId}; peer=${projectedUserConversation.peerNodeId}`
    );
    const userConversationDetail = userNodeConversationResponseSchema.parse(
      await hostRequest({
        baseUrl: hostBaseUrl,
        path: `/v1/user-nodes/user/inbox/${userMessage.conversationId}`
      })
    );
    const publishedUserMessageRecord = userConversationDetail.messages.find(
      (message) => message.eventId === userMessage.eventId
    );
    if (!publishedUserMessageRecord) {
      throw new Error(
        "User Node conversation detail must include the published User Node message."
      );
    }
    assertSignerMatchesFromPubkey(
      publishedUserMessageRecord,
      "Host User Node published message record"
    );
    assertCondition(
      publishedUserMessageRecord.signerPubkey ===
        materializedUserContext.identityContext.publicKey,
      "Host User Node published message record must preserve the User Node signer."
    );
    printPass("user-node-message-history", userMessage.conversationId);

    const userClientConversationResponse = await fetch(
      new URL(
        `/api/conversations/${encodeURIComponent(userMessage.conversationId)}`,
        userClientUrl
      )
    );
    await assertResponseOk(
      userClientConversationResponse,
      "User Client conversation API"
    );
    const userClientConversation = userNodeConversationResponseSchema.parse(
      await userClientConversationResponse.json()
    );
    const userClientPublishedMessageRecord =
      userClientConversation.messages.find(
        (message) => message.eventId === userMessage.eventId
      );
    if (!userClientPublishedMessageRecord) {
      throw new Error(
        "User Client conversation API must include the JSON-published User Node message."
      );
    }
    assertSignerMatchesFromPubkey(
      userClientPublishedMessageRecord,
      "User Client conversation API published message record"
    );
    assertCondition(
      userClientPublishedMessageRecord.signerPubkey ===
        materializedUserContext.identityContext.publicKey,
      "User Client conversation API must expose the User Node signer."
    );
    printPass("user-client-conversation-api", userMessage.conversationId);
    printPass("user-node-signer-audit", userMessage.signerPubkey ?? "missing");

    const builderIdentitySecret = runtimeIdentitySecretResponseSchema.parse(
      await hostRequest({
        baseUrl: hostBaseUrl,
        path: "/v1/runtimes/builder/identity-secret"
      })
    );
    const wikiApprovalId = `approval-wiki-${runId}`;
    const syntheticWikiApprovalRequestMessageId =
      await publishSyntheticA2AMessage({
        message: {
          constraints: {
            approvalRequiredBeforeAction: false
          },
          conversationId: userMessage.conversationId,
          fromNodeId: "builder",
          fromPubkey: materializedContext.identityContext.publicKey,
          graphId: materializedContext.binding.graphId,
          intent: "Request User Node approval for wiki publication.",
          messageType: "approval.request",
          parentMessageId: userMessage.eventId,
          protocol: "entangle.a2a.v1",
          responsePolicy: {
            closeOnResult: false,
            maxFollowups: 1,
            responseRequired: true
          },
          sessionId: userMessage.sessionId,
          toNodeId: "user",
          toPubkey: materializedUserContext.identityContext.publicKey,
          turnId: `${turnId}-wiki-approval-request`,
          work: {
            artifactRefs: [projectedWikiPublicationArtifact.ref],
            metadata: {
              approval: {
                approvalId: wikiApprovalId,
                approverNodeIds: ["user"],
                operation: "wiki_update",
                resource: {
                  id: [
                    "builder",
                    "gitea",
                    "team-alpha",
                    userClientWikiRepositoryName
                  ].join("|"),
                  kind: "wiki_repository_publication",
                  label: `builder wiki -> gitea/team-alpha/${userClientWikiRepositoryName}`
                }
              }
            },
            summary:
              "Process runner smoke: approve builder wiki publication."
          }
        },
        relayUrls,
        senderSecretKeyHex: builderIdentitySecret.secretKey
      });
    const wikiApprovalConversationDetail = await waitFor(
      "Host User Node inbound wiki approval request",
      async () => {
        const detail = userNodeConversationResponseSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: `/v1/user-nodes/user/inbox/${userMessage.conversationId}`
          })
        );

        return detail.messages.some(
          (message) =>
            message.messageType === "approval.request" &&
            message.approval?.approvalId === wikiApprovalId &&
            message.approval.resource?.kind === "wiki_repository_publication"
        )
          ? detail
          : undefined;
      },
      () => `\nstdout:\n${userRunnerStdout}\nstderr:\n${userRunnerStderr}`
    );
    const wikiApprovalRecord = wikiApprovalConversationDetail.messages.find(
      (message) =>
        message.eventId === syntheticWikiApprovalRequestMessageId &&
        message.approval?.approvalId === wikiApprovalId
    );
    if (!wikiApprovalRecord) {
      throw new Error(
        "User Node conversation detail must include the inbound wiki approval request."
      );
    }
    assertSignerMatchesFromPubkey(
      wikiApprovalRecord,
      "Host User Node wiki approval request record"
    );
    assertCondition(
      wikiApprovalRecord.signerPubkey ===
        materializedContext.identityContext.publicKey,
      "Host User Node wiki approval request must preserve the builder signer."
    );
    printPass("user-node-wiki-approval-request", wikiApprovalId);

    const userClientWikiPublicationResponse = await fetch(
      new URL("/api/wiki-repository/publish", userClientUrl),
      {
        body: JSON.stringify({
          conversationId: userMessage.conversationId,
          nodeId: "builder",
          reason:
            "Process runner smoke requested wiki publication from the User Client.",
          retryFailedPublication: true,
          target: {
            gitServiceRef: "gitea",
            namespace: "team-alpha",
            repositoryName: userClientWikiRepositoryName
          }
        }),
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      }
    );
    await assertResponseOk(
      userClientWikiPublicationResponse,
      "User Client JSON wiki publication"
    );
    const userClientWikiPublicationRaw =
      (await userClientWikiPublicationResponse.json()) as {
        source?: string;
        userNodeId?: string;
        wikiRefs?: Array<{ artifactId?: string; nodeId?: string }>;
      };
    const userClientWikiPublicationRequest =
      runtimeWikiPublishResponseSchema.parse(userClientWikiPublicationRaw);
    assertCondition(
      userClientWikiPublicationRaw.source === "runtime" &&
        userClientWikiPublicationRaw.userNodeId === "user" &&
        userClientWikiPublicationRaw.wikiRefs?.some(
          (ref) => ref.nodeId === "builder"
        ),
      "User Client wiki publication response must identify runtime source, User Node, and visible wiki refs."
    );
    printPass(
      "user-client-wiki-publication-request",
      `command=${userClientWikiPublicationRequest.commandId}; ` +
        `approval=${wikiApprovalId}`
    );

    const projectedUserClientWikiPublicationReceipt = await waitFor(
      "Host projected User Client wiki publication command receipt",
      async () => {
        const projection = hostProjectionSnapshotSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: "/v1/projection"
          })
        );

        return projection.runtimeCommandReceipts.find(
          (receipt) =>
            receipt.commandId === userClientWikiPublicationRequest.commandId &&
            receipt.commandEventType === "runtime.wiki.publish" &&
            receipt.receiptStatus !== "received"
        );
      },
      () => `\nstdout:\n${runnerStdout}\nstderr:\n${runnerStderr}`
    );
    assertCondition(
      projectedUserClientWikiPublicationReceipt.receiptStatus === "completed",
      `User Client wiki publication command must complete; got ${projectedUserClientWikiPublicationReceipt.receiptStatus}: ` +
        `${projectedUserClientWikiPublicationReceipt.receiptMessage ?? "no receipt message"}`
    );
    printPass(
      "projected-user-client-wiki-publication-command-receipt",
      `command=${projectedUserClientWikiPublicationReceipt.commandId}; ` +
        `status=${projectedUserClientWikiPublicationReceipt.receiptStatus}`
    );

    const projectedUserClientWikiPublicationArtifact = await waitFor(
      "Host projected User Client targeted wiki publication artifact",
      async () => {
        const artifactList = runtimeArtifactListResponseSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: "/v1/runtimes/builder/artifacts"
          })
        );
        const artifact = artifactList.artifacts.find(
          (entry) =>
            entry.ref.backend === "git" &&
            entry.ref.artifactKind === "knowledge_summary" &&
            entry.ref.createdByNodeId === "builder" &&
            entry.ref.locator.branch === "builder/wiki-repository" &&
            entry.ref.locator.repositoryName === userClientWikiRepositoryName &&
            entry.ref.status === "published"
        );

        if (!artifact) {
          return undefined;
        }

        const inspection = runtimeArtifactInspectionResponseSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: `/v1/runtimes/builder/artifacts/${artifact.ref.artifactId}`
          })
        );

        return inspection.artifact.ref.status === "published"
          ? inspection.artifact
          : undefined;
      },
      () => `\nstdout:\n${runnerStdout}\nstderr:\n${runnerStderr}`
    );
    const projectedUserClientWikiArtifact = readGitArtifactIdentity(
      projectedUserClientWikiPublicationArtifact.ref,
      "User Client targeted published wiki artifact"
    );
    const userClientWikiRemoteHead = runGit([
      "--git-dir",
      userClientWikiRepositoryPath,
      "rev-parse",
      "refs/heads/builder/wiki-repository"
    ]);
    assertCondition(
      userClientWikiRemoteHead === projectedUserClientWikiArtifact.commit,
      "User Client targeted wiki artifact commit must match the requested remote wiki branch head."
    );
    printPass(
      "projected-user-client-wiki-publication-artifact",
      `artifact=${projectedUserClientWikiArtifact.artifactId}; ` +
        `repository=${projectedUserClientWikiArtifact.repositoryName}; ` +
        `commit=${projectedUserClientWikiArtifact.commit.slice(0, 12)}`
    );

    const syntheticAgentMessageId = await publishSyntheticA2AMessage({
      message: {
        constraints: {
          approvalRequiredBeforeAction: false
        },
        conversationId: userMessage.conversationId,
        fromNodeId: "builder",
        fromPubkey: materializedContext.identityContext.publicKey,
        graphId: materializedContext.binding.graphId,
        intent: "Send a synthetic result to the User Node.",
        messageType: "task.result",
        parentMessageId: userMessage.eventId,
        protocol: "entangle.a2a.v1",
        responsePolicy: {
          closeOnResult: true,
          maxFollowups: 0,
          responseRequired: false
        },
        sessionId: userMessage.sessionId,
        toNodeId: "user",
        toPubkey: materializedUserContext.identityContext.publicKey,
        turnId: `${turnId}-synthetic-result`,
        work: {
          artifactRefs: [
            {
              ...sourceHistoryArtifactRef,
              contentSummary:
                sourceHistoryArtifactRef.contentSummary ??
                "Published source history artifact for User Node review.",
              conversationId: userMessage.conversationId,
              createdByNodeId:
                sourceHistoryArtifactRef.createdByNodeId ?? "builder",
              preferred: true,
              sessionId: userMessage.sessionId,
              status: sourceHistoryArtifactRef.status ?? "published"
            }
          ],
          metadata: {
            synthetic: true
          },
          summary:
            "Process runner smoke: synthetic agent response reached the User Node inbox."
        }
      },
      relayUrls,
      senderSecretKeyHex: builderIdentitySecret.secretKey
    });
    const userInboundConversationDetail = await waitFor(
      "Host User Node inbound message history",
      async () => {
        const detail = userNodeConversationResponseSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: `/v1/user-nodes/user/inbox/${userMessage.conversationId}`
          })
        );

        return detail.messages.some(
          (message) =>
            message.direction === "inbound" &&
            message.eventId === syntheticAgentMessageId
        )
          ? detail
          : undefined;
      },
      () => `\nstdout:\n${userRunnerStdout}\nstderr:\n${userRunnerStderr}`
    );
    assertCondition(
      userInboundConversationDetail.messages.some(
        (message) =>
          message.direction === "inbound" &&
          message.eventId === syntheticAgentMessageId &&
          message.peerNodeId === "builder" &&
          message.artifactRefs.some(
            (artifactRef) => artifactRef.artifactId === sourceHistoryArtifactId
          )
      ),
      "User Node conversation detail must include the inbound synthetic agent message."
    );
    const syntheticAgentMessageRecord =
      userInboundConversationDetail.messages.find(
        (message) =>
          message.direction === "inbound" &&
          message.eventId === syntheticAgentMessageId
      );
    if (!syntheticAgentMessageRecord) {
      throw new Error(
        "User Node conversation detail must include the inbound synthetic agent signer record."
      );
    }
    assertSignerMatchesFromPubkey(
      syntheticAgentMessageRecord,
      "Host User Node inbound synthetic agent message record"
    );
    assertCondition(
      syntheticAgentMessageRecord.signerPubkey ===
        materializedContext.identityContext.publicKey,
      "Host User Node inbound synthetic agent message must preserve the builder signer."
    );
    printPass("user-node-inbound-message-history", userMessage.conversationId);

    const userClientArtifactParams = new URLSearchParams({
      artifactId: sourceHistoryArtifactId,
      conversationId: userMessage.conversationId,
      nodeId: "builder"
    });
    const userClientArtifactHistoryResponse = await fetch(
      new URL(
        `/api/artifacts/history?${userClientArtifactParams.toString()}`,
        userClientUrl
      )
    );
    await assertResponseOk(
      userClientArtifactHistoryResponse,
      "User Client JSON artifact history"
    );
    const userClientArtifactHistory =
      (await userClientArtifactHistoryResponse.json()) as {
        artifact?: { artifactId?: string; backend?: string };
        history?: {
          available?: boolean;
          commits?: Array<{ commit?: string }>;
        };
        source?: string;
      };
    assertCondition(
      userClientArtifactHistory.source === "runtime" &&
        userClientArtifactHistory.artifact?.artifactId === sourceHistoryArtifactId &&
        userClientArtifactHistory.artifact.backend === "git" &&
        userClientArtifactHistory.history?.available === true &&
        (userClientArtifactHistory.history.commits ?? []).some(
          (commit) => commit.commit === sourceHistoryArtifactRef.locator.commit
        ),
      "User Client artifact history must resolve the visible source-history artifact."
    );

    const userClientArtifactDiffResponse = await fetch(
      new URL(
        `/api/artifacts/diff?${userClientArtifactParams.toString()}`,
        userClientUrl
      )
    );
    await assertResponseOk(
      userClientArtifactDiffResponse,
      "User Client JSON artifact diff"
    );
    const userClientArtifactDiff =
      (await userClientArtifactDiffResponse.json()) as {
        diff?: {
          available?: boolean;
          content?: string;
        };
        source?: string;
      };
    assertCondition(
      userClientArtifactDiff.source === "runtime" &&
        userClientArtifactDiff.diff?.available === true &&
        (userClientArtifactDiff.diff.content ?? "").includes(
          "smoke-generated.ts"
        ),
      "User Client artifact diff must resolve the visible source-history artifact."
    );
    printPass(
      "user-client-artifact-history-diff",
      `artifact=${sourceHistoryArtifactId}; history=available; diff=available`
    );

    const userClientArtifactRestoreResponse = await fetch(
      new URL("/api/artifacts/restore", userClientUrl),
      {
        body: JSON.stringify({
          artifactId: sourceHistoryArtifactId,
          conversationId: userMessage.conversationId,
          nodeId: "builder",
          reason:
            "Process runner smoke requested artifact restore from the User Client.",
          restoreId: "user-client-restore-source-history-artifact"
        }),
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      }
    );
    await assertResponseOk(
      userClientArtifactRestoreResponse,
      "User Client JSON artifact restore"
    );
    const userClientArtifactRestoreRequest =
      runtimeArtifactRestoreResponseSchema.parse(
        await userClientArtifactRestoreResponse.json()
      );
    assertCondition(
      userClientArtifactRestoreRequest.status === "requested" &&
        userClientArtifactRestoreRequest.artifactId === sourceHistoryArtifactId,
      "User Client artifact restore must return a requested restore command for the visible artifact."
    );
    printPass(
      "user-client-artifact-restore-request",
      `command=${userClientArtifactRestoreRequest.commandId}; ` +
        `artifact=${sourceHistoryArtifactId}`
    );

    const projectedUserClientArtifactRestoreReceipt = await waitFor(
      "Host projected User Client artifact restore command receipt",
      async () => {
        const projection = hostProjectionSnapshotSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: "/v1/projection"
          })
        );

        return projection.runtimeCommandReceipts.find(
          (receipt) =>
            receipt.commandId === userClientArtifactRestoreRequest.commandId &&
            receipt.commandEventType === "runtime.artifact.restore" &&
            receipt.receiptStatus === "completed" &&
            receipt.restoreId === "user-client-restore-source-history-artifact"
        );
      },
      () => `\nstdout:\n${runnerStdout}\nstderr:\n${runnerStderr}`
    );
    printPass(
      "projected-user-client-artifact-restore-command-receipt",
      `command=${projectedUserClientArtifactRestoreReceipt.commandId}; ` +
        `status=${projectedUserClientArtifactRestoreReceipt.receiptStatus}`
    );

    const sourceHistoryApprovalId = `approval-source-history-${runId}`;
    const syntheticSourceHistoryApprovalRequestMessageId =
      await publishSyntheticA2AMessage({
        message: {
          constraints: {
            approvalRequiredBeforeAction: false
          },
          conversationId: userMessage.conversationId,
          fromNodeId: "builder",
          fromPubkey: materializedContext.identityContext.publicKey,
          graphId: materializedContext.binding.graphId,
          intent: "Request User Node review for source-history publication.",
          messageType: "approval.request",
          parentMessageId: userMessage.eventId,
          protocol: "entangle.a2a.v1",
          responsePolicy: {
            closeOnResult: false,
            maxFollowups: 1,
            responseRequired: true
          },
          sessionId: userMessage.sessionId,
          toNodeId: "user",
          toPubkey: materializedUserContext.identityContext.publicKey,
          turnId: `${turnId}-source-history-approval-request`,
          work: {
            artifactRefs: [sourceHistoryArtifactRef],
            metadata: {
              approval: {
                approvalId: sourceHistoryApprovalId,
                approverNodeIds: ["user"],
                operation: "source_publication",
                resource: {
                  id: [
                    projectedBuilderSourceHistory.sourceHistoryId,
                    "gitea",
                    "team-alpha",
                    userClientSourceRepositoryName
                  ].join("|"),
                  kind: "source_history_publication",
                  label: `${projectedBuilderSourceHistory.sourceHistoryId} -> gitea/team-alpha/${userClientSourceRepositoryName}`
                }
              }
            },
            summary:
              "Process runner smoke: approve builder source-history publication."
          }
        },
        relayUrls,
        senderSecretKeyHex: builderIdentitySecret.secretKey
      });
    const sourceHistoryApprovalConversationDetail = await waitFor(
      "Host User Node inbound source-history approval request",
      async () => {
        const detail = userNodeConversationResponseSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: `/v1/user-nodes/user/inbox/${userMessage.conversationId}`
          })
        );

        return detail.messages.some(
          (message) =>
            message.messageType === "approval.request" &&
            message.approval?.approvalId === sourceHistoryApprovalId &&
            message.approval.resource?.kind === "source_history_publication"
        )
          ? detail
          : undefined;
      },
      () => `\nstdout:\n${userRunnerStdout}\nstderr:\n${userRunnerStderr}`
    );
    const sourceHistoryApprovalRecord =
      sourceHistoryApprovalConversationDetail.messages.find(
        (message) =>
          message.eventId === syntheticSourceHistoryApprovalRequestMessageId &&
          message.approval?.approvalId === sourceHistoryApprovalId
      );
    if (!sourceHistoryApprovalRecord) {
      throw new Error(
        "User Node conversation detail must include the inbound source-history approval request."
      );
    }
    assertSignerMatchesFromPubkey(
      sourceHistoryApprovalRecord,
      "Host User Node source-history approval request record"
    );
    assertCondition(
      sourceHistoryApprovalRecord.signerPubkey ===
        materializedContext.identityContext.publicKey,
      "Host User Node source-history approval request must preserve the builder signer."
    );
    printPass(
      "user-node-source-history-approval-request",
      sourceHistoryApprovalId
    );

    const userClientSourceHistoryPublicationResponse = await fetch(
      new URL("/api/source-history/publish", userClientUrl),
      {
        body: JSON.stringify({
          conversationId: userMessage.conversationId,
          nodeId: "builder",
          reason:
            "Process runner smoke requested source-history publication from the User Client.",
          retryFailedPublication: true,
          sourceHistoryId: projectedBuilderSourceHistory.sourceHistoryId,
          target: {
            repositoryName: userClientSourceRepositoryName
          }
        }),
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      }
    );
    await assertResponseOk(
      userClientSourceHistoryPublicationResponse,
      "User Client JSON source-history publication"
    );
    const userClientSourceHistoryPublicationRaw =
      (await userClientSourceHistoryPublicationResponse.json()) as {
        source?: string;
        sourceHistoryRefs?: Array<{ nodeId?: string; sourceHistoryId?: string }>;
        userNodeId?: string;
      };
    const userClientSourceHistoryPublicationRequest =
      runtimeSourceHistoryPublishResponseSchema.parse(
        userClientSourceHistoryPublicationRaw
      );
    assertCondition(
      userClientSourceHistoryPublicationRaw.source === "runtime" &&
        userClientSourceHistoryPublicationRaw.userNodeId === "user" &&
        userClientSourceHistoryPublicationRaw.sourceHistoryRefs?.some(
          (ref) =>
            ref.nodeId === "builder" &&
            ref.sourceHistoryId ===
              projectedBuilderSourceHistory.sourceHistoryId
        ),
      "User Client source-history publication response must identify runtime source, User Node, and visible source-history refs."
    );
    printPass(
      "user-client-source-history-publication-request",
      `command=${userClientSourceHistoryPublicationRequest.commandId}; ` +
        `sourceHistory=${projectedBuilderSourceHistory.sourceHistoryId}`
    );

    const projectedUserClientSourceHistoryPublicationReceipt = await waitFor(
      "Host projected User Client source-history publication command receipt",
      async () => {
        const projection = hostProjectionSnapshotSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: "/v1/projection"
          })
        );

        return projection.runtimeCommandReceipts.find(
          (receipt) =>
            receipt.commandId ===
              userClientSourceHistoryPublicationRequest.commandId &&
            receipt.commandEventType === "runtime.source_history.publish" &&
            receipt.receiptStatus === "completed" &&
            receipt.sourceHistoryId ===
              projectedBuilderSourceHistory.sourceHistoryId
        );
      },
      () => `\nstdout:\n${runnerStdout}\nstderr:\n${runnerStderr}`
    );
    printPass(
      "projected-user-client-source-history-publication-command-receipt",
      `command=${projectedUserClientSourceHistoryPublicationReceipt.commandId}; ` +
        `status=${projectedUserClientSourceHistoryPublicationReceipt.receiptStatus}`
    );

    const approvalId = `approval-${runId}`;
    const syntheticApprovalRequestMessageId = await publishSyntheticA2AMessage({
      message: {
        constraints: {
          approvalRequiredBeforeAction: false
        },
        conversationId: userMessage.conversationId,
        fromNodeId: "builder",
        fromPubkey: materializedContext.identityContext.publicKey,
        graphId: materializedContext.binding.graphId,
        intent: "Request approval from the User Node.",
        messageType: "approval.request",
        parentMessageId: userMessage.eventId,
        protocol: "entangle.a2a.v1",
        responsePolicy: {
          closeOnResult: false,
          maxFollowups: 1,
          responseRequired: true
        },
        sessionId: userMessage.sessionId,
        toNodeId: "user",
        toPubkey: materializedUserContext.identityContext.publicKey,
        turnId: `${turnId}-approval-request`,
        work: {
          artifactRefs: [],
          metadata: {
            approval: {
              approvalId,
              approverNodeIds: ["user"],
              operation: "source_application"
            }
          },
          summary:
            "Process runner smoke: approve synthetic source application."
        }
      },
      relayUrls,
      senderSecretKeyHex: builderIdentitySecret.secretKey
    });
    const approvalRequestConversationDetail = await waitFor(
      "Host User Node inbound approval request",
      async () => {
        const detail = userNodeConversationResponseSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: `/v1/user-nodes/user/inbox/${userMessage.conversationId}`
          })
        );

        return detail.messages.some(
          (message) =>
            message.messageType === "approval.request" &&
            message.approval?.approvalId === approvalId
        )
          ? detail
          : undefined;
      },
      () => `\nstdout:\n${userRunnerStdout}\nstderr:\n${userRunnerStderr}`
    );
    const approvalRequestRecord =
      approvalRequestConversationDetail.messages.find(
        (message) =>
          message.messageType === "approval.request" &&
          message.approval?.approvalId === approvalId
      );
    if (!approvalRequestRecord) {
      throw new Error(
        "User Node conversation detail must preserve the approval request signer record."
      );
    }
    assertSignerMatchesFromPubkey(
      approvalRequestRecord,
      "Host User Node approval request record"
    );
    assertCondition(
      approvalRequestRecord.signerPubkey ===
        materializedContext.identityContext.publicKey,
      "Host User Node approval request record must preserve the builder signer."
    );
    printPass("user-node-approval-request", approvalId);

    const approvalResponse = await fetch(new URL("/api/messages", userClientUrl), {
      body: JSON.stringify({
        approval: {
          approvalId,
          decision: "approved"
        },
        conversationId: userMessage.conversationId,
        messageType: "approval.response",
        parentMessageId: syntheticApprovalRequestMessageId,
        sessionId: userMessage.sessionId,
        summary: `Approved ${approvalId}.`,
        targetNodeId: "builder"
      }),
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    });
    await assertResponseOk(approvalResponse, "User Client JSON approval response");
    const approvalResponseMessage = userNodeMessagePublishResponseSchema.parse(
      await approvalResponse.json()
    );
    assertSignerMatchesFromPubkey(
      approvalResponseMessage,
      "User Client JSON approval response"
    );
    assertCondition(
      approvalResponseMessage.signerPubkey ===
        materializedUserContext.identityContext.publicKey,
      "User Client JSON approval response must be signed by the assigned User Node identity."
    );
    const approvalResponseConversationDetail = await waitFor(
      "Host User Node approval response history",
      async () => {
        const detail = userNodeConversationResponseSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: `/v1/user-nodes/user/inbox/${userMessage.conversationId}`
          })
        );

        return detail.messages.some(
          (message) =>
            message.direction === "outbound" &&
            message.messageType === "approval.response" &&
            message.approval?.approvalId === approvalId &&
            message.approval.decision === "approved"
        )
          ? detail
          : undefined;
      },
      () => `\nstdout:\n${userRunnerStdout}\nstderr:\n${userRunnerStderr}`
    );
    const approvalResponseRecord =
      approvalResponseConversationDetail.messages.find(
        (message) => message.eventId === approvalResponseMessage.eventId
      );
    if (!approvalResponseRecord) {
      throw new Error(
        "User Node conversation detail must preserve the approval response signer record."
      );
    }
    assertSignerMatchesFromPubkey(
      approvalResponseRecord,
      "Host User Node approval response record"
    );
    printPass("user-node-approval-response", approvalId);

    const reviewerUserMessage = userNodeMessagePublishResponseSchema.parse(
      await hostRequest({
        baseUrl: hostBaseUrl,
        body: {
          conversationId: reviewerConversationId,
          messageType: "question",
          responsePolicy: {
            closeOnResult: false,
            maxFollowups: 0,
            responseRequired: false
          },
          sessionId: reviewerSessionId,
          summary:
            "Process runner smoke: verify second signed User Node message intake.",
          targetNodeId: "builder",
          turnId: reviewerTurnId
        },
        method: "POST",
        path: "/v1/user-nodes/reviewer-user/messages"
      })
    );
    assertSignerMatchesFromPubkey(
      reviewerUserMessage,
      "Reviewer User Node publish response"
    );
    assertCondition(
      reviewerUserMessage.fromNodeId === "reviewer-user",
      "Reviewer User Node message must be signed as reviewer-user."
    );
    assertCondition(
      reviewerUserMessage.signerPubkey ===
        materializedReviewerUserContext.identityContext.publicKey,
      "Reviewer User Node message must be signed by the reviewer User Node identity."
    );
    assertCondition(
      reviewerUserMessage.fromPubkey !== userMessage.fromPubkey,
      "Distinct User Nodes must publish with distinct stable pubkeys."
    );
    printPass(
      "reviewer-user-node-publish",
      `message=${reviewerUserMessage.eventId}; relays=${reviewerUserMessage.publishedRelays.length}`
    );

    const reviewerUserMessageIntake = await waitFor(
      "runner reviewer user message intake",
      async () => {
        if (runnerExit) {
          throw new Error(
            `Runner process exited before reviewer User Node message intake: ${JSON.stringify(runnerExit)}\nstdout:\n${runnerStdout}\nstderr:\n${runnerStderr}`
          );
        }

        try {
          const [sessionRecord, conversationRecord] = await Promise.all([
            readFile(
              path.join(
                materializedContext.workspace.runtimeRoot,
                "sessions",
                `${reviewerUserMessage.sessionId}.json`
              ),
              "utf8"
            ).then((content) =>
              sessionRecordSchema.parse(JSON.parse(content) as unknown)
            ),
            readFile(
              path.join(
                materializedContext.workspace.runtimeRoot,
                "conversations",
                `${reviewerUserMessage.conversationId}.json`
              ),
              "utf8"
            ).then((content) =>
              conversationRecordSchema.parse(JSON.parse(content) as unknown)
            )
          ]);

          return sessionRecord.lastMessageId === reviewerUserMessage.eventId &&
            conversationRecord.lastInboundMessageId ===
              reviewerUserMessage.eventId &&
            conversationRecord.peerNodeId === "reviewer-user" &&
            conversationRecord.localNodeId === "builder"
            ? { conversationRecord, sessionRecord }
            : undefined;
        } catch {
          return undefined;
        }
      },
      () => `\nstdout:\n${runnerStdout}\nstderr:\n${runnerStderr}`
    );
    printPass(
      "reviewer-user-node-intake",
      `session=${reviewerUserMessageIntake.sessionRecord.sessionId}; conversation=${reviewerUserMessageIntake.conversationRecord.conversationId}`
    );

    const projectedReviewerUserConversation = await waitFor(
      "Host reviewer User Node conversation projection",
      async () => {
        const projection = hostProjectionSnapshotSchema.parse(
          await hostRequest({
            baseUrl: hostBaseUrl,
            path: "/v1/projection"
          })
        );

        return projection.userConversations.find(
          (conversation) =>
            conversation.conversationId ===
              reviewerUserMessage.conversationId &&
            conversation.userNodeId === "reviewer-user" &&
            conversation.peerNodeId === "builder"
        );
      },
      () => `\nstdout:\n${runnerStdout}\nstderr:\n${runnerStderr}`
    );
    printPass(
      "reviewer-user-node-projection",
      `user=${projectedReviewerUserConversation.userNodeId}; peer=${projectedReviewerUserConversation.peerNodeId}`
    );
    const reviewerUserConversationDetail =
      userNodeConversationResponseSchema.parse(
        await hostRequest({
          baseUrl: hostBaseUrl,
          path: `/v1/user-nodes/reviewer-user/inbox/${reviewerUserMessage.conversationId}`
        })
      );
    const reviewerUserMessageRecord =
      reviewerUserConversationDetail.messages.find(
        (message) => message.eventId === reviewerUserMessage.eventId
      );
    if (!reviewerUserMessageRecord) {
      throw new Error(
        "Reviewer User Node conversation detail must include the published User Node message."
      );
    }
    assertSignerMatchesFromPubkey(
      reviewerUserMessageRecord,
      "Host reviewer User Node message record"
    );
    assertCondition(
      reviewerUserMessageRecord.signerPubkey ===
        materializedReviewerUserContext.identityContext.publicKey,
      "Host reviewer User Node message record must preserve the reviewer signer."
    );
    printPass(
      "reviewer-user-node-message-history",
      reviewerUserMessage.conversationId
    );

    assertCondition(
      !path
        .resolve(runnerRoot)
        .startsWith(`${path.resolve(hostHome)}${path.sep}`),
      "Runner root must not be inside Host home."
    );
    assertCondition(
      !path
        .resolve(hostHome)
        .startsWith(`${path.resolve(runnerRoot)}${path.sep}`),
      "Host home must not be inside runner root."
    );
    assertCondition(
      !path
        .resolve(userRunnerRoot)
        .startsWith(`${path.resolve(hostHome)}${path.sep}`),
      "User Node runner root must not be inside Host home."
    );
    assertCondition(
      !path
        .resolve(userRunnerRoot)
        .startsWith(`${path.resolve(runnerRoot)}${path.sep}`),
      "User Node runner root must not be inside agent runner root."
    );
    assertCondition(
      !path
        .resolve(reviewerUserRunnerRoot)
        .startsWith(`${path.resolve(hostHome)}${path.sep}`),
      "Reviewer User Node runner root must not be inside Host home."
    );
    assertCondition(
      !path
        .resolve(reviewerUserRunnerRoot)
        .startsWith(`${path.resolve(runnerRoot)}${path.sep}`),
      "Reviewer User Node runner root must not be inside agent runner root."
    );
    assertCondition(
      !path
        .resolve(reviewerUserRunnerRoot)
        .startsWith(`${path.resolve(userRunnerRoot)}${path.sep}`),
      "Reviewer User Node runner root must not be inside first User Node runner root."
    );
    printPass(
      "filesystem-isolation",
      `host=${hostHome}; runner=${runnerRoot}; userRunner=${userRunnerRoot}; reviewerUserRunner=${reviewerUserRunnerRoot}`
    );

    if (keepRunning) {
      const cliEnvironment =
        `ENTANGLE_HOST_URL=${hostBaseUrl} ` +
        `ENTANGLE_HOST_TOKEN=${operatorToken}`;
      printPass("manual-host", hostBaseUrl);
      printPass("manual-token", operatorToken);
      printPass("manual-runner-state", runnerStateRoot);
      printPass("manual-user-runner-state", userRunnerStateRoot);
      printPass("manual-user-client", userClientUrl);
      printPass(
        "manual-reviewer-user-runner-state",
        reviewerUserRunnerStateRoot
      );
      printPass("manual-reviewer-user-client", reviewerUserClientUrl);
      console.log("Manual signed task command:");
      console.log(
        `${cliEnvironment} pnpm --filter @entangle/cli dev ` +
          `user-nodes message user builder "Implement a small change and report what you changed." ` +
          `--message-type task.request --compact`
      );
      console.log("Manual projection command:");
      console.log(
        `${cliEnvironment} pnpm --filter @entangle/cli dev host projection --summary`
      );
      console.log("Manual User Node inbox command:");
      console.log(
        `${cliEnvironment} pnpm --filter @entangle/cli dev ` +
          `inbox list --user-node user --summary`
      );
      console.log("Manual User Client URL:");
      console.log(userClientUrl);
      console.log("Manual reviewer User Client URL:");
      console.log(reviewerUserClientUrl);
      console.log("Manual runner turn event command:");
      console.log(
        `${cliEnvironment} pnpm --filter @entangle/cli dev ` +
          `host events list --node-id builder --type-prefix runner.turn.updated ` +
          `--limit 20 --summary`
      );
      console.log("Press Ctrl-C to stop Host and runner processes.");
      await waitForShutdownSignal();
    }

    if (keepTemp) {
      console.log(`Kept smoke temp root: ${tempRoot}`);
    }
  } finally {
    await stopRunnerProcess(runnerProcess);
    await stopRunnerProcess(userRunnerProcess);
    await stopRunnerProcess(reviewerUserRunnerProcess);
    await server?.close();
    await controlPlane?.close();

    delete process.env.ENTANGLE_HOME;
    delete process.env.ENTANGLE_SECRETS_HOME;
    delete process.env.ENTANGLE_RUNTIME_BACKEND;
    delete process.env.ENTANGLE_HOST_LOGGER;
    delete process.env.ENTANGLE_HOST_OPERATOR_TOKEN;
    delete process.env.ENTANGLE_DEFAULT_RELAY_READ_URL;
    delete process.env.ENTANGLE_DEFAULT_RELAY_WRITE_URL;
    delete process.env.ENTANGLE_DEFAULT_GIT_TRANSPORT;
    delete process.env.ENTANGLE_DEFAULT_GIT_REMOTE_BASE;

    if (!keepTemp) {
      await rm(tempRoot, { force: true, recursive: true });
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
