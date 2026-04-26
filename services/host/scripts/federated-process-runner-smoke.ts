#!/usr/bin/env tsx

import {
  spawn,
  spawnSync,
  type ChildProcessByStdio
} from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import {
  graphMutationResponseSchema,
  hostProjectionSnapshotSchema,
  packageSourceInspectionResponseSchema,
  conversationRecordSchema,
  runnerJoinConfigSchema,
  runnerRegistryInspectionResponseSchema,
  runtimeAssignmentOfferResponseSchema,
  runtimeContextInspectionResponseSchema,
  sessionRecordSchema,
  userNodeMessagePublishResponseSchema,
  type RunnerJoinConfig
} from "@entangle/types";
import { generateSecretKey, getPublicKey } from "nostr-tools";

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
const operatorToken = "process-runner-smoke-token";
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "..", "..", "..");

function readFlagValue(name: string): string | undefined {
  const inlinePrefix = `${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(inlinePrefix));

  if (inline) {
    return inline.slice(inlinePrefix.length);
  }

  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function assertCondition(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
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

function appendBounded(current: string, chunk: Buffer | string): string {
  return truncateLog(current + chunk.toString(), 12000);
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
  const conversationId = `conversation-${runId}`;
  const graphId = `graph-${runId}`;
  const runnerId = `runner-${runId}`;
  const sessionId = `session-${runId}`;
  const turnId = `turn-${runId}`;
  const hostHome = path.join(tempRoot, "host-home");
  const hostSecrets = path.join(tempRoot, "host-secrets");
  const runnerRoot = path.join(tempRoot, "runner-root");
  const runnerStateRoot = path.join(runnerRoot, "state");
  const packageRoot = path.join(tempRoot, "package-source");
  await Promise.all([
    mkdir(hostHome, { recursive: true }),
    mkdir(hostSecrets, { recursive: true }),
    mkdir(runnerStateRoot, { recursive: true }),
    createAgentPackage(packageRoot)
  ]);

  process.env.ENTANGLE_HOME = hostHome;
  process.env.ENTANGLE_SECRETS_HOME = hostSecrets;
  process.env.ENTANGLE_RUNTIME_BACKEND = "memory";
  process.env.ENTANGLE_HOST_LOGGER = "false";
  process.env.ENTANGLE_HOST_OPERATOR_TOKEN = operatorToken;
  process.env.ENTANGLE_DEFAULT_RELAY_READ_URL = relayUrl;
  process.env.ENTANGLE_DEFAULT_RELAY_WRITE_URL = relayUrl;
  process.env.ENTANGLE_DEFAULT_GIT_TRANSPORT = "file";
  process.env.ENTANGLE_DEFAULT_GIT_REMOTE_BASE = `file://${path.join(tempRoot, "git")}`;

  let server:
    | Awaited<ReturnType<typeof import("../src/index.js").buildHostServer>>
    | undefined;
  let controlPlane:
    | InstanceType<
        typeof import("../src/federated-control-plane.js").HostFederatedControlPlane
      >
    | undefined;
  let runnerProcess:
    | ChildProcessByStdio<null, Readable, Readable>
    | undefined;
  let runnerStdout = "";
  let runnerStderr = "";
  let runnerExit:
    | {
        code: number | null;
        signal: NodeJS.Signals | null;
      }
    | undefined;
  const runnerSecretEnv = "ENTANGLE_PROCESS_RUNNER_SMOKE_RUNNER_SECRET";

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
              displayName: "Builder",
              nodeId: "builder",
              nodeKind: "worker",
              packageSourceRef: packageSource.packageSourceId,
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

    const userMessage = userNodeMessagePublishResponseSchema.parse(
      await hostRequest({
        baseUrl: hostBaseUrl,
        body: {
          conversationId,
          messageType: "question",
          responsePolicy: {
            closeOnResult: false,
            maxFollowups: 0,
            responseRequired: false
          },
          sessionId,
          summary:
            "Process runner smoke: verify signed User Node message intake.",
          targetNodeId: "builder",
          turnId
        },
        method: "POST",
        path: "/v1/user-nodes/user/messages"
      })
    );
    printPass(
      "user-node-publish",
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

    runGit(["init", "--bare", path.join(tempRoot, "git", "smoke.git")]);
    printPass("git-backend", `file://${path.join(tempRoot, "git")}`);

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
    printPass(
      "filesystem-isolation",
      `host=${hostHome}; runner=${runnerRoot}`
    );

    if (keepRunning) {
      const cliEnvironment =
        `ENTANGLE_HOST_URL=${hostBaseUrl} ` +
        `ENTANGLE_HOST_TOKEN=${operatorToken}`;
      printPass("manual-host", hostBaseUrl);
      printPass("manual-token", operatorToken);
      printPass("manual-runner-state", runnerStateRoot);
      console.log("Manual signed task command:");
      console.log(
        `${cliEnvironment} pnpm --filter @entangle/cli dev -- ` +
          `user-nodes message user builder "Implement a small change and report what you changed." ` +
          `--message-type task.request --compact`
      );
      console.log("Manual projection command:");
      console.log(
        `${cliEnvironment} pnpm --filter @entangle/cli dev -- host projection --summary`
      );
      console.log("Press Ctrl-C to stop Host and runner processes.");
      await waitForShutdownSignal();
    }

    if (keepTemp) {
      console.log(`Kept smoke temp root: ${tempRoot}`);
    }
  } finally {
    await stopRunnerProcess(runnerProcess);
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
