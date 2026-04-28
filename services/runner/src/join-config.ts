import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  runnerJoinConfigSchema,
  type RunnerJoinConfig,
  type RuntimeSecretDelivery
} from "@entangle/types";
import { getPublicKey } from "nostr-tools";

export const defaultRunnerJoinConfigPath = path.join(
  process.cwd(),
  "join",
  "runner-join.json"
);
export const runnerJoinConfigJsonEnvVar = "ENTANGLE_RUNNER_JOIN_CONFIG_JSON";

export function resolveRunnerJoinConfigPath(explicitPath?: string): string {
  return (
    explicitPath ??
    process.env.ENTANGLE_RUNNER_JOIN_CONFIG_PATH ??
    defaultRunnerJoinConfigPath
  );
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

export async function loadRunnerJoinConfig(
  explicitPath?: string
): Promise<RunnerJoinConfig> {
  const inlineConfig =
    explicitPath === undefined ? process.env[runnerJoinConfigJsonEnvVar] : undefined;

  if (inlineConfig?.trim()) {
    return runnerJoinConfigSchema.parse(JSON.parse(inlineConfig));
  }

  return runnerJoinConfigSchema.parse(
    await readJsonFile(resolveRunnerJoinConfigPath(explicitPath))
  );
}

export function parseNostrSecretKey(
  secretHex: string | undefined
): Uint8Array | undefined {
  if (!secretHex) {
    return undefined;
  }

  const normalized = secretHex.trim();

  if (!/^[0-9a-fA-F]{64}$/.test(normalized)) {
    return undefined;
  }

  return Uint8Array.from(Buffer.from(normalized, "hex"));
}

export async function readRunnerSecretKey(
  delivery: RuntimeSecretDelivery
): Promise<Uint8Array> {
  const secretHex =
    delivery.mode === "env_var"
      ? process.env[delivery.envVar]
      : await readFile(delivery.filePath, "utf8");
  const secretKey = parseNostrSecretKey(secretHex);

  if (!secretKey) {
    throw new Error(
      delivery.mode === "env_var"
        ? `Runner identity secret is missing or invalid in env var '${delivery.envVar}'.`
        : `Runner identity secret is missing or invalid in mounted file '${delivery.filePath}'.`
    );
  }

  return secretKey;
}

export async function resolveRunnerJoinIdentity(
  config: RunnerJoinConfig
): Promise<{
  publicKey: string;
  secretKey: Uint8Array;
}> {
  const secretKey = await readRunnerSecretKey(config.identity.secretDelivery);
  const publicKey = getPublicKey(secretKey);

  if (config.identity.publicKey && config.identity.publicKey !== publicKey) {
    throw new Error(
      `Runner join identity mismatch: config expects '${config.identity.publicKey}' but derived '${publicKey}'.`
    );
  }

  return {
    publicKey,
    secretKey
  };
}
