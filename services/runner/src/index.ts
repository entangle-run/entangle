#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { type AgentEngine } from "@entangle/agent-engine";
import type {
  AgentEngineTurnResult,
  EffectiveRuntimeContext,
  EntangleObservationEventPayload,
  RunnerJoinConfig,
  RunnerJoinStatus
} from "@entangle/types";
import { getPublicKey } from "nostr-tools";
import {
  loadRunnerJoinConfig,
  readRunnerSecretKey,
  resolveRunnerJoinConfigPath,
  resolveRunnerJoinIdentity,
  runnerJoinConfigJsonEnvVar
} from "./join-config.js";
import {
  createRunnerJoinTransport,
  RunnerJoinService,
  type RunnerAssignmentMaterializer,
  type RunnerAssignmentRuntimeStarter,
  type RunnerJoinTransport
} from "./join-service.js";
import { NostrRunnerTransport } from "./nostr-transport.js";
import {
  buildAgentEngineTurnRequest,
  loadPackageToolCatalog,
  loadRuntimeContext,
  mapPackageToolCatalogToEngineToolDefinitions,
  resolveRuntimeContextPath
} from "./runtime-context.js";
import type { RunnerMemorySynthesizer } from "./memory-synthesizer.js";
import {
  RunnerService,
  type RunnerServiceObservationPublisher
} from "./service.js";
import type { RunnerTransport } from "./transport.js";
import { createOpenCodeAgentEngine } from "./opencode-engine.js";
import { createFileSystemAssignmentMaterializer } from "./assignment-materializer.js";
import { startHumanInterfaceRuntime } from "./human-interface-runtime.js";

async function resolveRunnerIdentity(
  runtimeContext: EffectiveRuntimeContext
): Promise<{
  publicKey: string;
  secretKey: Uint8Array;
}> {
  const secretKey = await readRunnerSecretKey(
    runtimeContext.identityContext.secretDelivery
  );
  const publicKey = getPublicKey(secretKey);

  if (publicKey !== runtimeContext.identityContext.publicKey) {
    throw new Error(
      `Runner identity mismatch: runtime context expects '${runtimeContext.identityContext.publicKey}' but derived '${publicKey}'.`
    );
  }

  return {
    publicKey,
    secretKey
  };
}

export type RunnerCliMode =
  | {
      joinConfigPath?: string;
      mode: "join";
    }
  | {
      mode: "runtime-context";
      runtimeContextPath?: string;
    };

export function parseRunnerCliMode(
  argv: string[] = process.argv.slice(2),
  env: NodeJS.ProcessEnv = process.env
): RunnerCliMode {
  const [command, ...args] = argv;

  if (command === "join") {
    const configFlagIndex = args.indexOf("--config");

    return {
      ...(configFlagIndex >= 0 && args[configFlagIndex + 1]
        ? { joinConfigPath: args[configFlagIndex + 1] }
        : args[0] && args[0] !== "--config"
          ? { joinConfigPath: args[0] }
          : {}),
      mode: "join"
    };
  }

  if (command === "run" || command === "runtime-context") {
    const contextFlagIndex = args.indexOf("--context");

    return {
      mode: "runtime-context",
      ...(contextFlagIndex >= 0 && args[contextFlagIndex + 1]
        ? { runtimeContextPath: args[contextFlagIndex + 1] }
        : args[0] && args[0] !== "--context"
          ? { runtimeContextPath: args[0] }
          : {})
    };
  }

  if (env.ENTANGLE_RUNNER_JOIN_CONFIG_PATH || env[runnerJoinConfigJsonEnvVar]) {
    return {
      ...(env.ENTANGLE_RUNNER_JOIN_CONFIG_PATH
        ? { joinConfigPath: env.ENTANGLE_RUNNER_JOIN_CONFIG_PATH }
        : {}),
      mode: "join"
    };
  }

  return {
    mode: "runtime-context",
    ...(env.ENTANGLE_RUNTIME_CONTEXT_PATH
      ? { runtimeContextPath: env.ENTANGLE_RUNTIME_CONTEXT_PATH }
      : {})
  };
}

function waitForAbortSignal(abortSignal: AbortSignal | undefined): Promise<void> {
  if (!abortSignal) {
    return new Promise(() => {
      /* Intentionally never resolves without an external stop signal. */
    });
  }

  if (abortSignal.aborted) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    abortSignal.addEventListener("abort", () => resolve(), { once: true });
  });
}

function createProcessAbortController(): AbortController {
  const controller = new AbortController();
  const abort = () => controller.abort();

  process.once("SIGINT", abort);
  process.once("SIGTERM", abort);

  return controller;
}

function createAgentEngineForRuntimeContext(input: {
  injectedEngine: AgentEngine | undefined;
  runtimeContext: EffectiveRuntimeContext;
}): AgentEngine {
  const { runtimeContext } = input;
  const agentRuntime = runtimeContext.agentRuntimeContext;

  if (agentRuntime.mode === "disabled") {
    throw new Error(
      `Runner for node '${runtimeContext.binding.node.nodeId}' cannot start because its agent runtime is disabled.`
    );
  }

  if (input.injectedEngine) {
    return input.injectedEngine;
  }

  if (agentRuntime.engineProfile.kind === "opencode_server") {
    return createOpenCodeAgentEngine({
      runtimeContext
    });
  }

  throw new Error(
    `Runner for node '${runtimeContext.binding.node.nodeId}' is configured for agent engine '${agentRuntime.engineProfileRef}' (${agentRuntime.engineProfile.kind}), but this runner build only has an OpenCode adapter wired.`
  );
}

export async function createConfiguredRunnerService(
  runtimeContextPath?: string,
  input: {
    engine?: AgentEngine;
    memorySynthesizer?: RunnerMemorySynthesizer;
    observationPublisher?: RunnerServiceObservationPublisher;
    transport?: RunnerTransport;
  } = {}
): Promise<{
  contextPath: string;
  publicKey: string;
  runtimeContext: EffectiveRuntimeContext;
  service: RunnerService;
}> {
  const contextPath = resolveRuntimeContextPath(runtimeContextPath);
  const runtimeContext = await loadRuntimeContext(contextPath);
  const packageToolCatalog = await loadPackageToolCatalog(runtimeContext);
  const toolDefinitions =
    mapPackageToolCatalogToEngineToolDefinitions(packageToolCatalog);
  const { publicKey, secretKey } = await resolveRunnerIdentity(runtimeContext);
  const transport =
    input.transport ??
    new NostrRunnerTransport({
      context: runtimeContext,
      secretKey
    });
  const engine = createAgentEngineForRuntimeContext({
    injectedEngine: input.engine,
    runtimeContext
  });
  const service = new RunnerService({
    context: runtimeContext,
    engine,
    ...(input.memorySynthesizer
      ? { memorySynthesizer: input.memorySynthesizer }
      : {}),
    ...(input.observationPublisher
      ? { observationPublisher: input.observationPublisher }
      : {}),
    toolDefinitions,
    transport
  });

  return {
    contextPath,
    publicKey,
    runtimeContext,
    service
  };
}

function createRuntimeObservationPublisher(input: {
  config: RunnerJoinConfig;
  runnerPubkey: string;
  transport: RunnerJoinTransport;
}): RunnerServiceObservationPublisher {
  const publish = async (payload: EntangleObservationEventPayload) => {
    await input.transport.publishObservationEvent({
      ...(input.config.authRequired !== undefined
        ? { authRequired: input.config.authRequired }
        : {}),
      payload,
      relayUrls: input.config.relayUrls
    });
  };

  return {
    publishArtifactRefObserved: (record) =>
      publish({
        ...(record.artifactPreview
          ? { artifactPreview: record.artifactPreview }
          : {}),
        artifactRecord: record.artifactRecord,
        artifactRef: record.artifactRecord.ref,
        eventType: "artifact.ref",
        graphId: record.graphId,
        hostAuthorityPubkey: input.config.hostAuthorityPubkey,
        nodeId: record.nodeId,
        observedAt: record.observedAt,
        protocol: "entangle.observe.v1",
        runnerId: input.config.runnerId,
        runnerPubkey: input.runnerPubkey
      }),
    publishApprovalUpdated: (record) =>
      publish({
        approval: record,
        approvalId: record.approvalId,
        eventType: "approval.updated",
        graphId: record.graphId,
        hostAuthorityPubkey: input.config.hostAuthorityPubkey,
        nodeId: record.requestedByNodeId,
        observedAt: record.updatedAt,
        protocol: "entangle.observe.v1",
        runnerId: input.config.runnerId,
        runnerPubkey: input.runnerPubkey,
        sessionId: record.sessionId,
        status: record.status,
        updatedAt: record.updatedAt
      }),
    publishConversationUpdated: (record) =>
      publish({
        conversation: record,
        conversationId: record.conversationId,
        eventType: "conversation.updated",
        graphId: record.graphId,
        hostAuthorityPubkey: input.config.hostAuthorityPubkey,
        nodeId: record.localNodeId,
        observedAt: record.updatedAt,
        protocol: "entangle.observe.v1",
        runnerId: input.config.runnerId,
        runnerPubkey: input.runnerPubkey,
        status: record.status,
        updatedAt: record.updatedAt
      }),
    publishSessionUpdated: (record) =>
      publish({
        eventType: "session.updated",
        graphId: record.graphId,
        hostAuthorityPubkey: input.config.hostAuthorityPubkey,
        nodeId: record.ownerNodeId,
        observedAt: record.updatedAt,
        protocol: "entangle.observe.v1",
        runnerId: input.config.runnerId,
        runnerPubkey: input.runnerPubkey,
        session: record,
        sessionId: record.sessionId,
        status: record.status,
        updatedAt: record.updatedAt
      }),
    publishSourceChangeRefObserved: (record) =>
      publish({
        artifactRefs: record.artifactRefs,
        candidate: record.candidate,
        candidateId: record.candidate.candidateId,
        eventType: "source_change.ref",
        graphId: record.candidate.graphId,
        hostAuthorityPubkey: input.config.hostAuthorityPubkey,
        nodeId: record.candidate.nodeId,
        observedAt: record.observedAt,
        protocol: "entangle.observe.v1",
        runnerId: input.config.runnerId,
        runnerPubkey: input.runnerPubkey,
        sourceChangeSummary: record.candidate.sourceChangeSummary,
        status: record.candidate.status
      }),
    publishSourceHistoryRefObserved: (record) =>
      publish({
        eventType: "source_history.ref",
        graphId: record.history.graphId,
        history: record.history,
        hostAuthorityPubkey: input.config.hostAuthorityPubkey,
        nodeId: record.history.nodeId,
        observedAt: record.observedAt,
        protocol: "entangle.observe.v1",
        runnerId: input.config.runnerId,
        runnerPubkey: input.runnerPubkey,
        sourceHistoryId: record.history.sourceHistoryId
      }),
    publishSourceHistoryReplayedObserved: (record) =>
      publish({
        eventType: "source_history.replayed",
        graphId: record.replay.graphId,
        hostAuthorityPubkey: input.config.hostAuthorityPubkey,
        nodeId: record.replay.nodeId,
        observedAt: record.observedAt,
        protocol: "entangle.observe.v1",
        replay: record.replay,
        replayId: record.replay.replayId,
        runnerId: input.config.runnerId,
        runnerPubkey: input.runnerPubkey,
        sourceHistoryId: record.replay.sourceHistoryId,
        status: record.replay.status
      }),
    publishTurnUpdated: (record) =>
      publish({
        eventType: "turn.updated",
        graphId: record.graphId,
        hostAuthorityPubkey: input.config.hostAuthorityPubkey,
        nodeId: record.nodeId,
        observedAt: record.updatedAt,
        phase: record.phase,
        protocol: "entangle.observe.v1",
        runnerId: input.config.runnerId,
        runnerPubkey: input.runnerPubkey,
        sessionId: record.sessionId,
        turn: record,
        turnId: record.turnId,
        updatedAt: record.updatedAt
      }),
    publishWikiRefObserved: (record) =>
      publish({
        ...(record.artifactPreview
          ? { artifactPreview: record.artifactPreview }
          : {}),
        artifactRef: record.artifactRef,
        eventType: "wiki.ref",
        graphId: record.graphId,
        hostAuthorityPubkey: input.config.hostAuthorityPubkey,
        nodeId: record.nodeId,
        observedAt: record.observedAt,
        protocol: "entangle.observe.v1",
        runnerId: input.config.runnerId,
        runnerPubkey: input.runnerPubkey
      })
  };
}

export async function createConfiguredRunnerJoinService(
  joinConfigPath?: string,
  input: {
    clock?: () => string;
    heartbeatIntervalMs?: number;
    materializer?: RunnerAssignmentMaterializer;
    nonceFactory?: () => string;
    runtimeStarter?: RunnerAssignmentRuntimeStarter;
    transport?: RunnerJoinTransport;
  } = {}
): Promise<{
  config: RunnerJoinConfig;
  configPath: string;
  publicKey: string;
  service: RunnerJoinService;
}> {
  const configPath =
    !joinConfigPath && process.env[runnerJoinConfigJsonEnvVar]?.trim()
      ? runnerJoinConfigJsonEnvVar
      : resolveRunnerJoinConfigPath(joinConfigPath);
  const config = await loadRunnerJoinConfig(joinConfigPath);
  const { publicKey, secretKey } = await resolveRunnerJoinIdentity(config);
  const transport =
    input.transport ??
    createRunnerJoinTransport({
      secretKey
    });
  const service = new RunnerJoinService({
    ...(input.clock ? { clock: input.clock } : {}),
    config,
    ...(input.heartbeatIntervalMs !== undefined
      ? { heartbeatIntervalMs: input.heartbeatIntervalMs }
      : {}),
    materializer:
      input.materializer ??
      createFileSystemAssignmentMaterializer({
        ...(config.hostApi ? { hostApi: config.hostApi } : {})
      }),
    ...(input.nonceFactory ? { nonceFactory: input.nonceFactory } : {}),
    runnerPubkey: publicKey,
    runtimeStarter:
      input.runtimeStarter ??
      (async ({ assignment, runtimeContextPath }) => {
        if (assignment.runtimeKind === "human_interface") {
          const runtimeContext = await loadRuntimeContext(runtimeContextPath);
          const handle = await startHumanInterfaceRuntime({
            ...(config.hostApi ? { hostApi: config.hostApi } : {}),
            context: runtimeContext
          });

          return {
            clientUrl: handle.clientUrl,
            runtimeContextPath,
            runtimeRoot: handle.runtimeRoot,
            stop: () => handle.stop()
          };
        }

        const configured = await createConfiguredRunnerService(runtimeContextPath, {
          observationPublisher: createRuntimeObservationPublisher({
            config,
            runnerPubkey: publicKey,
            transport
          })
        });
        const startResult = await configured.service.start();

        return {
          cancelSession: async (request) => {
            await configured.service.requestSessionCancellation(request);
          },
          publishSourceHistory: (request) =>
            configured.service.requestSourceHistoryPublication(request),
          publishWikiRepository: (request) =>
            configured.service.requestWikiRepositoryPublication(request),
          replaySourceHistory: (request) =>
            configured.service.requestSourceHistoryReplay(request),
          restoreArtifact: (request) =>
            configured.service.requestArtifactRestore(request),
          runtimeContextPath,
          runtimeRoot: startResult.runtimeRoot,
          stop: () => configured.service.stop()
        };
      }),
    transport
  });

  return {
    config,
    configPath,
    publicKey,
    service
  };
}

export async function runRunnerOnce(input: {
  engine?: AgentEngine;
  runtimeContextPath?: string;
} = {}): Promise<{
  contextPath: string;
  graphId: string;
  nodeId: string;
  packageId: string | undefined;
  publicKey: string;
  result: AgentEngineTurnResult;
}> {
  const contextPath = resolveRuntimeContextPath(input.runtimeContextPath);
  const runtimeContext = await loadRuntimeContext(contextPath);
  const packageToolCatalog = await loadPackageToolCatalog(runtimeContext);
  const toolDefinitions =
    mapPackageToolCatalogToEngineToolDefinitions(packageToolCatalog);
  const turnRequest = await buildAgentEngineTurnRequest(runtimeContext, {
    toolDefinitions
  });
  const engine = createAgentEngineForRuntimeContext({
    injectedEngine: input.engine,
    runtimeContext
  });
  const { publicKey } = await resolveRunnerIdentity(runtimeContext);

  const result = await engine.executeTurn(turnRequest);

  return {
    contextPath,
    graphId: runtimeContext.binding.graphId,
    nodeId: runtimeContext.binding.node.nodeId,
    packageId: runtimeContext.packageManifest?.packageId,
    publicKey,
    result
  };
}

export async function runRunnerServiceUntilSignal(input: {
  abortSignal?: AbortSignal;
  engine?: AgentEngine;
  memorySynthesizer?: RunnerMemorySynthesizer;
  runtimeContextPath?: string;
  transport?: RunnerTransport;
} = {}): Promise<{
  contextPath: string;
  graphId: string;
  nodeId: string;
  publicKey: string;
  runtimeRoot: string;
}> {
  const configured = await createConfiguredRunnerService(
    input.runtimeContextPath,
    {
      ...(input.engine ? { engine: input.engine } : {}),
      ...(input.memorySynthesizer
        ? { memorySynthesizer: input.memorySynthesizer }
        : {}),
      ...(input.transport ? { transport: input.transport } : {})
    }
  );
  const startResult = await configured.service.start();

  try {
    await waitForAbortSignal(input.abortSignal);
  } finally {
    await configured.service.stop();
  }

  return {
    contextPath: configured.contextPath,
    graphId: configured.runtimeContext.binding.graphId,
    nodeId: configured.runtimeContext.binding.node.nodeId,
    publicKey: configured.publicKey,
    runtimeRoot: startResult.runtimeRoot
  };
}

export async function runGenericRunnerUntilSignal(input: {
  abortSignal?: AbortSignal;
  clock?: () => string;
  heartbeatIntervalMs?: number;
  joinConfigPath?: string;
  materializer?: RunnerAssignmentMaterializer;
  nonceFactory?: () => string;
  runtimeStarter?: RunnerAssignmentRuntimeStarter;
  transport?: RunnerJoinTransport;
} = {}): Promise<
  RunnerJoinStatus & {
    configPath: string;
  }
> {
  const configured = await createConfiguredRunnerJoinService(
    input.joinConfigPath,
    {
      ...(input.clock ? { clock: input.clock } : {}),
      ...(input.heartbeatIntervalMs !== undefined
        ? { heartbeatIntervalMs: input.heartbeatIntervalMs }
        : {}),
      ...(input.materializer ? { materializer: input.materializer } : {}),
      ...(input.nonceFactory ? { nonceFactory: input.nonceFactory } : {}),
      ...(input.runtimeStarter ? { runtimeStarter: input.runtimeStarter } : {}),
      ...(input.transport ? { transport: input.transport } : {})
    }
  );
  const status = await configured.service.start();

  try {
    await waitForAbortSignal(input.abortSignal);
  } finally {
    await configured.service.stop();
  }

  return {
    ...status,
    configPath: configured.configPath
  };
}

async function main(): Promise<void> {
  const abortController = createProcessAbortController();
  const mode = parseRunnerCliMode();
  const runner =
    mode.mode === "join"
      ? await runGenericRunnerUntilSignal({
          abortSignal: abortController.signal,
          ...(mode.joinConfigPath
            ? { joinConfigPath: mode.joinConfigPath }
            : {})
        })
      : await runRunnerServiceUntilSignal({
          abortSignal: abortController.signal,
          ...(mode.runtimeContextPath
            ? { runtimeContextPath: mode.runtimeContextPath }
            : {})
        });
  console.log(JSON.stringify(runner, null, 2));
}

function isDirectExecution(): boolean {
  const entrypoint = process.argv[1];
  return (
    typeof entrypoint === "string" &&
    import.meta.url === pathToFileURL(entrypoint).href
  );
}

if (isDirectExecution()) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
