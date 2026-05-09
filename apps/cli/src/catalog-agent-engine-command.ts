import {
  agentEnginePermissionModeSchema,
  agentEngineProfileKindSchema,
  agentEngineProfileUpsertRequestSchema,
  deploymentResourceCatalogSchema,
  type AgentEngineProfileUpsertRequest,
  type AgentEngineProfile,
  type DeploymentResourceCatalog
} from "@entangle/types";

export type CatalogAgentEngineUpsertOptions = {
  baseUrl?: string;
  clearBaseUrl?: boolean;
  clearDefaultAgent?: boolean;
  clearExecutable?: boolean;
  clearHealthUrl?: boolean;
  clearHttpAuth?: boolean;
  clearPermissionMode?: boolean;
  clearVersion?: boolean;
  defaultAgent?: string;
  displayName?: string;
  executable?: string;
  healthUrl?: string;
  httpBearerTokenEnvVar?: string;
  kind?: string;
  permissionMode?: string;
  setDefault?: boolean;
  stateScope?: string;
  version?: string;
};

export type AgentEngineProfileSummary = {
  baseUrl?: string;
  defaultAgent?: string;
  displayName: string;
  executable?: string;
  healthUrl?: string;
  httpAuth?: AgentEngineProfile["httpAuth"];
  id: string;
  isDefault: boolean;
  kind: AgentEngineProfile["kind"];
  permissionMode?: AgentEngineProfile["permissionMode"];
  stateScope: AgentEngineProfile["stateScope"];
  version?: string;
};

function parseAgentEngineStateScope(
  value: string | undefined
): "node" | "shared" | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === "node" || value === "shared") {
    return value;
  }

  throw new Error("Agent engine state scope must be 'node' or 'shared'.");
}

function assertAgentEngineUpsertOptionsAreNotConflicting(
  options: CatalogAgentEngineUpsertOptions
) {
  if (options.executable && options.clearExecutable) {
    throw new Error("Use either --executable or --clear-executable, not both.");
  }

  if (options.baseUrl && options.clearBaseUrl) {
    throw new Error("Use either --base-url or --clear-base-url, not both.");
  }

  if (options.healthUrl && options.clearHealthUrl) {
    throw new Error("Use either --health-url or --clear-health-url, not both.");
  }

  if (options.defaultAgent && options.clearDefaultAgent) {
    throw new Error(
      "Use either --default-agent or --clear-default-agent, not both."
    );
  }

  if (options.httpBearerTokenEnvVar && options.clearHttpAuth) {
    throw new Error(
      "Use either --http-bearer-token-env-var or --clear-http-auth, not both."
    );
  }

  if (options.permissionMode && options.clearPermissionMode) {
    throw new Error(
      "Use either --permission-mode or --clear-permission-mode, not both."
    );
  }

  if (options.version && options.clearVersion) {
    throw new Error("Use either --version or --clear-version, not both.");
  }
}

export function buildAgentEngineProfileUpsertRequest(
  options: CatalogAgentEngineUpsertOptions
): AgentEngineProfileUpsertRequest {
  assertAgentEngineUpsertOptionsAreNotConflicting(options);

  return agentEngineProfileUpsertRequestSchema.parse({
    ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
    ...(options.clearBaseUrl ? { clearBaseUrl: true } : {}),
    ...(options.clearDefaultAgent ? { clearDefaultAgent: true } : {}),
    ...(options.clearExecutable ? { clearExecutable: true } : {}),
    ...(options.clearHealthUrl ? { clearHealthUrl: true } : {}),
    ...(options.clearHttpAuth ? { clearHttpAuth: true } : {}),
    ...(options.clearPermissionMode ? { clearPermissionMode: true } : {}),
    ...(options.clearVersion ? { clearVersion: true } : {}),
    ...(options.defaultAgent ? { defaultAgent: options.defaultAgent } : {}),
    ...(options.displayName ? { displayName: options.displayName } : {}),
    ...(options.executable ? { executable: options.executable } : {}),
    ...(options.healthUrl ? { healthUrl: options.healthUrl } : {}),
    ...(options.httpBearerTokenEnvVar
      ? {
          httpAuth: {
            mode: "bearer_env",
            tokenEnvVar: options.httpBearerTokenEnvVar
          }
        }
      : {}),
    ...(options.kind
      ? { kind: agentEngineProfileKindSchema.parse(options.kind) }
      : {}),
    ...(options.permissionMode
      ? {
          permissionMode: agentEnginePermissionModeSchema.parse(
            options.permissionMode
          )
        }
      : {}),
    ...(options.setDefault ? { setDefault: true } : {}),
    ...(options.stateScope
      ? { stateScope: parseAgentEngineStateScope(options.stateScope) }
      : {}),
    ...(options.version ? { version: options.version } : {})
  });
}

export function projectAgentEngineProfileUpsertSummary(input: {
  catalog: DeploymentResourceCatalog;
  profile: AgentEngineProfile;
}): {
  defaultAgentEngineProfileRef?: string;
  profile: AgentEngineProfile;
} {
  return {
    ...(input.catalog.defaults.agentEngineProfileRef
      ? {
          defaultAgentEngineProfileRef:
            input.catalog.defaults.agentEngineProfileRef
        }
      : {}),
    profile: input.profile
  };
}

export function sortAgentEngineProfilesForCli(
  profiles: AgentEngineProfile[]
): AgentEngineProfile[] {
  return [...profiles].sort((left, right) => left.id.localeCompare(right.id));
}

export function projectAgentEngineProfileSummary(input: {
  catalog: DeploymentResourceCatalog;
  profile: AgentEngineProfile;
}): AgentEngineProfileSummary {
  return {
    ...(input.profile.baseUrl ? { baseUrl: input.profile.baseUrl } : {}),
    ...(input.profile.defaultAgent
      ? { defaultAgent: input.profile.defaultAgent }
      : {}),
    displayName: input.profile.displayName,
    ...(input.profile.executable
      ? { executable: input.profile.executable }
      : {}),
    ...(input.profile.healthUrl ? { healthUrl: input.profile.healthUrl } : {}),
    ...(input.profile.httpAuth ? { httpAuth: input.profile.httpAuth } : {}),
    id: input.profile.id,
    isDefault: input.catalog.defaults.agentEngineProfileRef === input.profile.id,
    kind: input.profile.kind,
    ...(input.profile.permissionMode
      ? { permissionMode: input.profile.permissionMode }
      : {}),
    stateScope: input.profile.stateScope,
    ...(input.profile.version ? { version: input.profile.version } : {})
  };
}

export function buildAgentEngineProfileUpsertCatalog(
  catalog: DeploymentResourceCatalog,
  profileId: string,
  options: CatalogAgentEngineUpsertOptions
): {
  catalog: DeploymentResourceCatalog;
  profile: AgentEngineProfile;
} {
  assertAgentEngineUpsertOptionsAreNotConflicting(options);

  const parsedCatalog = deploymentResourceCatalogSchema.parse(catalog);
  const existingProfile = parsedCatalog.agentEngineProfiles.find(
    (candidate) => candidate.id === profileId
  );
  const kind = options.kind
    ? agentEngineProfileKindSchema.parse(options.kind)
    : existingProfile?.kind ?? "opencode_server";
  const stateScope = parseAgentEngineStateScope(options.stateScope);
  const profile: AgentEngineProfile = {
    ...(existingProfile ?? {
      displayName: options.displayName ?? profileId,
      id: profileId,
      kind,
      stateScope: "node" as const
    }),
    ...(options.displayName ? { displayName: options.displayName } : {}),
    id: profileId,
    kind,
    stateScope: stateScope ?? existingProfile?.stateScope ?? "node"
  };

  if (!existingProfile && kind === "opencode_server" && !options.baseUrl) {
    profile.executable = "opencode";
  }

  if (options.executable) {
    profile.executable = options.executable;
  } else if (options.clearExecutable) {
    delete profile.executable;
  }

  if (options.baseUrl) {
    profile.baseUrl = options.baseUrl;
  } else if (options.clearBaseUrl) {
    delete profile.baseUrl;
  }

  if (options.defaultAgent) {
    profile.defaultAgent = options.defaultAgent;
  } else if (options.clearDefaultAgent) {
    delete profile.defaultAgent;
  }

  if (options.healthUrl) {
    profile.healthUrl = options.healthUrl;
  } else if (options.clearHealthUrl) {
    delete profile.healthUrl;
  }

  if (options.httpBearerTokenEnvVar) {
    profile.httpAuth = {
      mode: "bearer_env",
      tokenEnvVar: options.httpBearerTokenEnvVar
    };
  } else if (options.clearHttpAuth) {
    delete profile.httpAuth;
  }

  if (options.permissionMode) {
    profile.permissionMode = agentEnginePermissionModeSchema.parse(
      options.permissionMode
    );
  } else if (options.clearPermissionMode) {
    delete profile.permissionMode;
  }

  if (options.version) {
    profile.version = options.version;
  } else if (options.clearVersion) {
    delete profile.version;
  }

  const nextProfiles = [
    ...parsedCatalog.agentEngineProfiles.filter(
      (candidate) => candidate.id !== profileId
    ),
    profile
  ].sort((left, right) => left.id.localeCompare(right.id));
  const nextCatalog = deploymentResourceCatalogSchema.parse({
    ...parsedCatalog,
    agentEngineProfiles: nextProfiles,
    defaults: {
      ...parsedCatalog.defaults,
      ...(options.setDefault
        ? {
            agentEngineProfileRef: profileId
          }
        : {})
    }
  });
  const parsedProfile = nextCatalog.agentEngineProfiles.find(
    (candidate) => candidate.id === profileId
  );

  if (!parsedProfile) {
    throw new Error(`Agent engine profile '${profileId}' was not upserted.`);
  }

  return {
    catalog: nextCatalog,
    profile: parsedProfile
  };
}
