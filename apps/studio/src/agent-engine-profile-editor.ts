import {
  agentEnginePermissionModeSchema,
  agentEngineProfileKindSchema,
  deploymentResourceCatalogSchema,
  type AgentEngineProfile,
  type DeploymentResourceCatalog
} from "@entangle/types";

export const agentEngineProfileKindOptions = agentEngineProfileKindSchema.options;
export const agentEnginePermissionModeOptions =
  agentEnginePermissionModeSchema.options;
export const agentEngineStateScopeOptions = ["node", "shared"] as const;

export type AgentEngineStateScopeOption =
  (typeof agentEngineStateScopeOptions)[number];

export type AgentEngineProfileEditorDraft = {
  baseUrl: string;
  defaultAgent: string;
  displayName: string;
  executable: string;
  kind: AgentEngineProfile["kind"];
  permissionMode: "" | AgentEngineProfile["permissionMode"];
  profileId: string;
  setDefault: boolean;
  stateScope: AgentEngineStateScopeOption;
  version: string;
};

export function createEmptyAgentEngineProfileEditorDraft(): AgentEngineProfileEditorDraft {
  return {
    baseUrl: "",
    defaultAgent: "",
    displayName: "",
    executable: "opencode",
    kind: "opencode_server",
    permissionMode: "auto_reject",
    profileId: "",
    setDefault: false,
    stateScope: "node",
    version: ""
  };
}

export function buildAgentEngineProfileEditorDraft(input: {
  catalog: DeploymentResourceCatalog;
  profile: AgentEngineProfile;
}): AgentEngineProfileEditorDraft {
  return {
    baseUrl: input.profile.baseUrl ?? "",
    defaultAgent: input.profile.defaultAgent ?? "",
    displayName: input.profile.displayName,
    executable: input.profile.executable ?? "",
    kind: input.profile.kind,
    permissionMode: input.profile.permissionMode ?? "",
    profileId: input.profile.id,
    setDefault: input.catalog.defaults.agentEngineProfileRef === input.profile.id,
    stateScope: input.profile.stateScope,
    version: input.profile.version ?? ""
  };
}

export function buildAgentEngineProfileFromDraft(
  draft: AgentEngineProfileEditorDraft
): AgentEngineProfile {
  const profileId = draft.profileId.trim();
  const kind = agentEngineProfileKindSchema.parse(draft.kind);
  const profile = {
    displayName: draft.displayName.trim() || profileId,
    id: profileId,
    kind,
    stateScope: draft.stateScope
  } satisfies AgentEngineProfile;

  return {
    ...profile,
    ...(draft.baseUrl.trim() ? { baseUrl: draft.baseUrl.trim() } : {}),
    ...(draft.defaultAgent.trim()
      ? { defaultAgent: draft.defaultAgent.trim() }
      : {}),
    ...(draft.executable.trim() ? { executable: draft.executable.trim() } : {}),
    ...(draft.permissionMode
      ? {
          permissionMode: agentEnginePermissionModeSchema.parse(
            draft.permissionMode
          )
        }
      : {}),
    ...(draft.version.trim() ? { version: draft.version.trim() } : {})
  };
}

export function buildAgentEngineProfileCatalogMutation(
  catalog: DeploymentResourceCatalog,
  draft: AgentEngineProfileEditorDraft
): DeploymentResourceCatalog {
  const parsedCatalog = deploymentResourceCatalogSchema.parse(catalog);
  const profile = buildAgentEngineProfileFromDraft(draft);

  return deploymentResourceCatalogSchema.parse({
    ...parsedCatalog,
    agentEngineProfiles: [
      ...parsedCatalog.agentEngineProfiles.filter(
        (candidate) => candidate.id !== profile.id
      ),
      profile
    ].sort((left, right) => left.id.localeCompare(right.id)),
    defaults: {
      ...parsedCatalog.defaults,
      ...(draft.setDefault
        ? {
            agentEngineProfileRef: profile.id
          }
        : {})
    }
  });
}

export function isAgentEngineProfileDraftSaveDisabled(
  draft: AgentEngineProfileEditorDraft
): boolean {
  return draft.profileId.trim() === "";
}
