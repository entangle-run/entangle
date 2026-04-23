import { pathToFileURL } from "node:url";
import {
  type AgentEngine,
  createAgentEngineForModelContext
} from "@entangle/agent-engine";
import type {
  AgentEngineTurnResult,
  EffectiveRuntimeContext
} from "@entangle/types";
import { getPublicKey } from "nostr-tools";
import { NostrRunnerTransport } from "./nostr-transport.js";
import {
  buildAgentEngineTurnRequest,
  loadRuntimeContext,
  resolveRuntimeContextPath
} from "./runtime-context.js";
import { RunnerService } from "./service.js";
import type { RunnerTransport } from "./transport.js";

function parseNostrSecretKey(secretHex: string | undefined): Uint8Array | undefined {
  if (!secretHex) {
    return undefined;
  }

  const normalized = secretHex.trim();

  if (!/^[0-9a-fA-F]{64}$/.test(normalized)) {
    return undefined;
  }

  return Uint8Array.from(Buffer.from(normalized, "hex"));
}

function resolveRunnerIdentity(
  runtimeContext: EffectiveRuntimeContext
): {
  publicKey: string;
  secretKey: Uint8Array;
} {
  const secretEnvVar =
    runtimeContext.identityContext.secretDelivery.mode === "env_var"
      ? runtimeContext.identityContext.secretDelivery.envVar
      : undefined;
  const configuredSecretKey = secretEnvVar
    ? parseNostrSecretKey(process.env[secretEnvVar])
    : undefined;

  if (!configuredSecretKey) {
    throw new Error(
      secretEnvVar
        ? `Runner identity secret is missing from env var '${secretEnvVar}'.`
        : "Runner identity secret delivery mode is not yet supported."
    );
  }

  const publicKey = getPublicKey(configuredSecretKey);

  if (publicKey !== runtimeContext.identityContext.publicKey) {
    throw new Error(
      `Runner identity mismatch: runtime context expects '${runtimeContext.identityContext.publicKey}' but derived '${publicKey}'.`
    );
  }

  return {
    publicKey,
    secretKey: configuredSecretKey
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

export async function createConfiguredRunnerService(
  runtimeContextPath?: string,
  input: {
    engine?: AgentEngine;
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
  const { publicKey, secretKey } = resolveRunnerIdentity(runtimeContext);
  const transport =
    input.transport ??
    new NostrRunnerTransport({
      context: runtimeContext,
      secretKey
    });
  const service = new RunnerService({
    context: runtimeContext,
    engine:
      input.engine ?? createAgentEngineForModelContext({
        modelContext: runtimeContext.modelContext
      }),
    transport
  });

  return {
    contextPath,
    publicKey,
    runtimeContext,
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
  const turnRequest = await buildAgentEngineTurnRequest(runtimeContext);
  const engine =
    input.engine ??
    createAgentEngineForModelContext({
      modelContext: runtimeContext.modelContext
    });
  const { publicKey } = resolveRunnerIdentity(runtimeContext);

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

async function main(): Promise<void> {
  const abortController = createProcessAbortController();
  const runner = await runRunnerServiceUntilSignal({
    abortSignal: abortController.signal
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
