#!/usr/bin/env tsx

import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { RunnerJoinConfig } from "@entangle/types";
import {
  artifactRefObservationPayloadSchema,
  runnerJoinConfigSchema
} from "@entangle/types";
import { generateSecretKey, getPublicKey } from "nostr-tools";

const keepTemp = process.argv.includes("--keep-temp");
const relayUrl =
  readFlagValue("--relay-url") ??
  process.env.ENTANGLE_RELAY_URL ??
  process.env.ENTANGLE_STRFRY_URL ??
  "ws://localhost:7777";
const relayUrls = [relayUrl];
const timeoutMs = Number.parseInt(readFlagValue("--timeout-ms") ?? "15000", 10);
const pollIntervalMs = 100;

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

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function waitFor<T>(
  label: string,
  resolveValue: () => Promise<T | undefined> | T | undefined
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
    `${label} did not complete within ${timeoutMs}ms. Last value: ${JSON.stringify(lastValue)}`
  );
}

async function createGitArtifact(tempRoot: string): Promise<{
  branch: string;
  commit: string;
  repositoryName: string;
}> {
  const bareRoot = path.join(tempRoot, "git", "artifact.git");
  const workRoot = path.join(tempRoot, "git", "worktree");
  const branch = "artifact-live-relay-smoke";

  await mkdir(path.dirname(bareRoot), { recursive: true });
  runGit(["init", "--bare", bareRoot]);
  await mkdir(workRoot, { recursive: true });
  runGit(["init"], workRoot);
  runGit(["config", "user.name", "Entangle Smoke Runner"], workRoot);
  runGit(["config", "user.email", "runner@entangle.invalid"], workRoot);
  await writeFile(
    path.join(workRoot, "report.md"),
    "# Federated Live Relay Smoke\n\nArtifact published through git.\n",
    "utf8"
  );
  runGit(["add", "report.md"], workRoot);
  runGit(["commit", "-m", "Add federated live relay smoke artifact"], workRoot);
  runGit(["branch", "-M", branch], workRoot);
  runGit(["remote", "add", "origin", bareRoot], workRoot);
  runGit(["push", "origin", `${branch}:${branch}`], workRoot);

  return {
    branch,
    commit: runGit(["rev-parse", "HEAD"], workRoot),
    repositoryName: "artifact"
  };
}

async function main(): Promise<void> {
  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), "entangle-live-relay-smoke-")
  );
  const hostHome = path.join(tempRoot, "host-home");
  const hostSecrets = path.join(tempRoot, "host-secrets");
  const runnerRoot = path.join(tempRoot, "runner-root");
  const materializedRoot = path.join(runnerRoot, "materialized");
  await Promise.all([
    mkdir(hostHome, { recursive: true }),
    mkdir(hostSecrets, { recursive: true }),
    mkdir(materializedRoot, { recursive: true })
  ]);

  process.env.ENTANGLE_HOME = hostHome;
  process.env.ENTANGLE_SECRETS_HOME = hostSecrets;
  process.env.ENTANGLE_RUNTIME_BACKEND = "memory";
  process.env.ENTANGLE_HOST_LOGGER = "false";

  const runnerSecretEnv = "ENTANGLE_LIVE_RELAY_SMOKE_RUNNER_SECRET";

  try {
    const [
      stateModule,
      controlPlaneModule,
      hostTransportModule,
      runnerModule,
      runnerTransportModule
    ] = await Promise.all([
      import("../src/state.js"),
      import("../src/federated-control-plane.js"),
      import("../src/federated-nostr-transport.js"),
      import("../../runner/src/index.js"),
      import("../../runner/src/federated-nostr-transport.js")
    ]);

    await stateModule.initializeHostState();
    const exportedAuthority = await stateModule.exportHostAuthority();
    const hostSecretKey = Uint8Array.from(
      Buffer.from(exportedAuthority.secretKey, "hex")
    );
    const hostTransport = new hostTransportModule.HostFederatedNostrTransport({
      secretKey: hostSecretKey
    });
    const controlPlane = new controlPlaneModule.HostFederatedControlPlane({
      transport: hostTransport
    });
    await controlPlane.subscribeObservationEvents({
      hostAuthorityPubkey: exportedAuthority.authority.publicKey,
      relayUrls
    });
    printPass("relay-subscribe", relayUrl);

    const runnerSecretKey = generateSecretKey();
    const runnerPubkey = getPublicKey(runnerSecretKey);
    process.env[runnerSecretEnv] = Buffer.from(runnerSecretKey).toString("hex");

    const graph = {
      schemaVersion: "1",
      graphId: "live-relay-smoke-graph",
      name: "Live Relay Smoke Graph",
      nodes: [
        {
          displayName: "User",
          nodeId: "user",
          nodeKind: "user"
        },
        {
          displayName: "Builder",
          nodeId: "builder",
          nodeKind: "worker"
        }
      ],
      edges: [
        {
          edgeId: "user-to-builder",
          enabled: true,
          fromNodeId: "user",
          relation: "delegates_to",
          toNodeId: "builder",
          transportPolicy: {
            channel: "live-relay-smoke",
            mode: "bidirectional_shared_set",
            relayProfileRefs: ["preview-relay"]
          }
        }
      ],
      defaults: {
        resourceBindings: {
          relayProfileRefs: ["preview-relay"]
        },
        runtimeProfile: "federated"
      }
    };
    const graphMutation = await stateModule.applyGraph(graph);
    assertCondition(
      graphMutation.validation.ok,
      `Graph failed validation: ${JSON.stringify(graphMutation.validation.findings)}`
    );
    printPass("graph", `revision=${graphMutation.activeRevisionId}`);

    const joinConfig: RunnerJoinConfig = runnerJoinConfigSchema.parse({
      capabilities: {
        agentEngineKinds: ["opencode_server"],
        labels: ["worker"],
        maxAssignments: 1,
        runtimeKinds: ["agent_runner"],
        supportsLocalWorkspace: true,
        supportsNip59: true
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
      runnerId: "runner-alpha",
      schemaVersion: "1"
    });
    const joinConfigPath = path.join(runnerRoot, "runner-join.json");
    await writeFile(joinConfigPath, `${JSON.stringify(joinConfig, null, 2)}\n`);

    const runner = await runnerModule.createConfiguredRunnerJoinService(
      joinConfigPath,
      {
        clock: () => new Date().toISOString(),
        materializer: async ({ assignment }) => {
          const assignmentRoot = path.join(
            materializedRoot,
            assignment.assignmentId
          );
          const runtimeContextPath = path.join(
            assignmentRoot,
            "runtime-context.json"
          );

          await mkdir(assignmentRoot, { recursive: true });
          await writeFile(
            path.join(assignmentRoot, "assignment.json"),
            `${JSON.stringify(assignment, null, 2)}\n`,
            "utf8"
          );
          await writeFile(runtimeContextPath, "{}\n", "utf8");

          return {
            accepted: true,
            runtimeContextPath
          };
        },
        nonceFactory: () => "live-relay-smoke-runner-hello",
        runtimeStarter: ({ runtimeContextPath }) =>
          Promise.resolve({
            runtimeContextPath,
            stop: () => Promise.resolve()
          })
      }
    );
    await runner.service.start();
    printPass("runner-start", `runner=${runner.config.runnerId}`);

    await waitFor("runner hello observation", async () => {
      const inspection = await stateModule.getRunnerRegistryEntry("runner-alpha");
      return inspection?.runner.registration.publicKey === runnerPubkey
        ? inspection
        : undefined;
    });
    await waitFor("runner hello ack", () => runner.service.getLastHelloAck());
    printPass("runner-hello", `runner=${runner.config.runnerId}`);

    await stateModule.trustRunnerRegistration({
      runnerId: "runner-alpha"
    });
    const assignmentResponse = await stateModule.offerRuntimeAssignment({
      assignmentId: "assignment-alpha",
      leaseDurationSeconds: 3600,
      nodeId: "builder",
      runnerId: "runner-alpha"
    });
    await controlPlane.publishRuntimeAssignmentOffer({
      assignment: assignmentResponse.assignment,
      relayUrls
    });
    await waitFor("assignment accepted observation", async () => {
      const inspection = await stateModule.getRuntimeAssignment(
        "assignment-alpha"
      );
      return inspection?.assignment.status === "accepted"
        ? inspection
        : undefined;
    });
    await waitFor("runtime status observation", async () => {
      const projection = await stateModule.getHostProjectionSnapshot();
      return projection.runtimes.find(
        (runtime) =>
          runtime.nodeId === "builder" && runtime.observedState === "running"
      );
    });
    printPass("assignment-runtime", "status=accepted; runtime=running");

    const gitArtifact = await createGitArtifact(tempRoot);
    const artifactTransport =
      new runnerTransportModule.RunnerFederatedNostrTransport({
        secretKey: runnerSecretKey
      });
    const artifactPayload = artifactRefObservationPayloadSchema.parse({
      artifactRef: {
        artifactId: "artifact-alpha",
        artifactKind: "report_file",
        backend: "git",
        contentSummary: "Live relay smoke git-backed report.",
        createdByNodeId: "builder",
        locator: {
          branch: gitArtifact.branch,
          commit: gitArtifact.commit,
          gitServiceRef: "smoke-git",
          namespace: "live-relay-smoke",
          path: "report.md",
          repositoryName: gitArtifact.repositoryName
        },
        status: "published"
      },
      eventType: "artifact.ref",
      graphId: "live-relay-smoke-graph",
      hostAuthorityPubkey: exportedAuthority.authority.publicKey,
      nodeId: "builder",
      observedAt: new Date().toISOString(),
      protocol: "entangle.observe.v1",
      runnerId: "runner-alpha",
      runnerPubkey
    });
    await artifactTransport.publishObservationEvent({
      payload: artifactPayload,
      relayUrls
    });
    await artifactTransport.close();
    await waitFor("artifact ref observation", async () => {
      const projection = await stateModule.getHostProjectionSnapshot();
      return projection.artifactRefs.find(
        (artifact) => artifact.artifactId === "artifact-alpha"
      );
    });
    printPass("artifact-ref", `commit=${gitArtifact.commit.slice(0, 12)}`);

    const projection = await stateModule.getHostProjectionSnapshot();
    assertCondition(
      projection.assignments[0]?.projection.source === "observation_event",
      "Expected assignment projection to come from observation event."
    );
    assertCondition(
      projection.runtimes.some(
        (runtime) =>
          runtime.nodeId === "builder" &&
          runtime.runnerId === "runner-alpha" &&
          runtime.observedState === "running"
      ),
      "Expected runtime projection from runner observation."
    );
    assertCondition(
      projection.artifactRefs.some(
        (artifact) =>
          artifact.artifactId === "artifact-alpha" &&
          artifact.artifactRef.backend === "git"
      ),
      "Expected git artifact projection from runner observation."
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
    printPass(
      "filesystem-isolation",
      `host=${hostHome}; runner=${runnerRoot}`
    );

    await runner.service.stop();
    await controlPlane.close();

    if (keepTemp) {
      console.log(`Kept smoke temp root: ${tempRoot}`);
    }
  } finally {
    delete process.env.ENTANGLE_HOME;
    delete process.env.ENTANGLE_SECRETS_HOME;
    delete process.env.ENTANGLE_RUNTIME_BACKEND;
    delete process.env.ENTANGLE_HOST_LOGGER;
    delete process.env[runnerSecretEnv];

    if (!keepTemp) {
      await rm(tempRoot, { force: true, recursive: true });
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
