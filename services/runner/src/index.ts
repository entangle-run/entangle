import { pathToFileURL } from "node:url";
import { createStubAgentEngine } from "@entangle/agent-engine";
import type { AgentEngineTurnResult } from "@entangle/types";
import { generateSecretKey, getPublicKey } from "nostr-tools";
import {
  buildAgentEngineTurnRequest,
  loadRuntimeContext,
  resolveRuntimeContextPath
} from "./runtime-context.js";

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

export async function runRunnerOnce(runtimeContextPath?: string): Promise<{
  contextPath: string;
  ephemeralIdentity: boolean;
  graphId: string;
  nodeId: string;
  packageId: string | undefined;
  publicKey: string;
  result: AgentEngineTurnResult;
}> {
  const contextPath = resolveRuntimeContextPath(runtimeContextPath);
  const runtimeContext = await loadRuntimeContext(contextPath);
  const turnRequest = await buildAgentEngineTurnRequest(runtimeContext);
  const engine = createStubAgentEngine();
  const providedSecretKey = parseNostrSecretKey(
    process.env.ENTANGLE_NOSTR_SECRET_KEY
  );
  const secretKey = providedSecretKey ?? generateSecretKey();
  const publicKey = getPublicKey(secretKey);
  const result = await engine.executeTurn(turnRequest);

  return {
    contextPath,
    ephemeralIdentity: !providedSecretKey,
    graphId: runtimeContext.binding.graphId,
    nodeId: runtimeContext.binding.node.nodeId,
    packageId: runtimeContext.packageManifest?.packageId,
    publicKey,
    result
  };
}

async function main(): Promise<void> {
  const bootstrap = await runRunnerOnce();
  console.log(JSON.stringify(bootstrap, null, 2));
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
