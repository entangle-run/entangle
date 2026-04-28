import {
  runnerJoinConfigSchema,
  type RunnerJoinConfig
} from "@entangle/types";

export type RunnerJoinConfigBuildInput = {
  agentEngineKinds?: string[];
  authRequired?: boolean;
  hostApiAuthEnvVar?: string;
  hostApiBaseUrl?: string;
  hostAuthorityPubkey: string;
  includeHostApi?: boolean;
  includeRuntimeIdentitySecret?: boolean;
  labels?: string[];
  maxAssignments?: number;
  relayUrls: string[];
  runnerId: string;
  runnerPublicKey?: string;
  runtimeKinds?: string[];
  secretEnvVar: string;
};

export type RunnerJoinConfigSummary = {
  agentEngineKinds: string[];
  hostApiAuthEnvVar?: string;
  hostApiBaseUrl?: string;
  hostAuthorityPubkey: string;
  relayUrls: string[];
  runnerId: string;
  runnerPublicKeyConfigured: boolean;
  runtimeIdentitySecretFromHost: boolean;
  runtimeKinds: string[];
  secretDelivery: string;
};

export function splitRepeatedCsvOptions(values: string[] | undefined): string[] {
  return [
    ...new Set(
      (values ?? [])
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    )
  ];
}

function normalizeOptionalEnvVar(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  return normalized && normalized.length > 0 ? normalized : undefined;
}

export function buildRunnerJoinConfig(
  input: RunnerJoinConfigBuildInput
): RunnerJoinConfig {
  const runtimeKinds = splitRepeatedCsvOptions(input.runtimeKinds);
  const normalizedRuntimeKinds =
    runtimeKinds.length > 0 ? runtimeKinds : ["agent_runner", "human_interface"];
  const agentEngineKinds = splitRepeatedCsvOptions(input.agentEngineKinds);
  const normalizedAgentEngineKinds =
    agentEngineKinds.length > 0
      ? agentEngineKinds
      : normalizedRuntimeKinds.includes("agent_runner")
        ? ["opencode_server"]
        : [];
  const labels = splitRepeatedCsvOptions(input.labels);
  const hostApiAuthEnvVar = normalizeOptionalEnvVar(input.hostApiAuthEnvVar);
  const includeHostApi = input.includeHostApi ?? true;
  const includeRuntimeIdentitySecret =
    input.includeRuntimeIdentitySecret ?? includeHostApi;

  return runnerJoinConfigSchema.parse({
    authRequired: input.authRequired ?? false,
    capabilities: {
      agentEngineKinds: normalizedAgentEngineKinds,
      labels,
      maxAssignments: input.maxAssignments ?? 1,
      runtimeKinds: normalizedRuntimeKinds,
      supportsLocalWorkspace: true,
      supportsNip59: true
    },
    ...(includeHostApi && input.hostApiBaseUrl
      ? {
          hostApi: {
            ...(hostApiAuthEnvVar
              ? {
                  auth: {
                    envVar: hostApiAuthEnvVar,
                    mode: "bearer_env"
                  }
                }
              : {}),
            baseUrl: input.hostApiBaseUrl,
            ...(includeRuntimeIdentitySecret
              ? {
                  runtimeIdentitySecret: {
                    mode: "host_api"
                  }
                }
              : {})
          }
        }
      : {}),
    hostAuthorityPubkey: input.hostAuthorityPubkey,
    identity: {
      ...(input.runnerPublicKey ? { publicKey: input.runnerPublicKey } : {}),
      secretDelivery: {
        envVar: input.secretEnvVar,
        mode: "env_var"
      }
    },
    relayUrls: splitRepeatedCsvOptions(input.relayUrls),
    runnerId: input.runnerId,
    schemaVersion: "1"
  });
}

export function projectRunnerJoinConfigSummary(
  config: RunnerJoinConfig
): RunnerJoinConfigSummary {
  return {
    agentEngineKinds: config.capabilities.agentEngineKinds,
    ...(config.hostApi?.auth?.mode === "bearer_env"
      ? { hostApiAuthEnvVar: config.hostApi.auth.envVar }
      : {}),
    ...(config.hostApi?.baseUrl ? { hostApiBaseUrl: config.hostApi.baseUrl } : {}),
    hostAuthorityPubkey: config.hostAuthorityPubkey,
    relayUrls: config.relayUrls,
    runnerId: config.runnerId,
    runnerPublicKeyConfigured: config.identity.publicKey !== undefined,
    runtimeIdentitySecretFromHost:
      config.hostApi?.runtimeIdentitySecret?.mode === "host_api",
    runtimeKinds: config.capabilities.runtimeKinds,
    secretDelivery:
      config.identity.secretDelivery.mode === "env_var"
        ? `env:${config.identity.secretDelivery.envVar}`
        : `file:${config.identity.secretDelivery.filePath}`
  };
}
