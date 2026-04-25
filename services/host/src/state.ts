import {
  cp,
  lstat,
  mkdir,
  open,
  readFile,
  readlink,
  readdir,
  rm,
  stat,
  symlink,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { gunzip } from "node:zlib";
import { promisify } from "node:util";
import {
  activeGraphRevisionRecordSchema,
  artifactRecordSchema,
  approvalLifecycleStateSchema,
  approvalRecordSchema,
  approvalStatusCountsSchema,
  conversationLifecycleStateSchema,
  conversationRecordSchema,
  conversationStatusCountsSchema,
  edgeDeletionResponseSchema,
  edgeListResponseSchema,
  edgeMutationResponseSchema,
  graphRevisionInspectionResponseSchema,
  graphRevisionListResponseSchema,
  graphRevisionRecordSchema,
  hostEventListResponseSchema,
  hostEventRecordSchema,
  hostSessionConsistencyFindingSchema,
  hostSessionSummarySchema,
  observedApprovalActivityRecordSchema,
  observedArtifactActivityRecordSchema,
  observedConversationActivityRecordSchema,
  observedRunnerTurnActivityRecordSchema,
  observedSessionActivityRecordSchema,
  nodeDeletionResponseSchema,
  nodeInspectionResponseSchema,
  nodeListResponseSchema,
  nodeMutationResponseSchema,
  type ActiveGraphRevisionRecord,
  type EffectiveNodeBinding,
  type HostEventListResponse,
  type HostEventRecord,
  gitRepositoryProvisioningRecordSchema,
  type AgentPackageManifest,
  agentPackageManifestSchema,
  buildValidationReport,
  type CatalogInspectionResponse,
  type DeploymentResourceCatalog,
  deploymentResourceCatalogSchema,
  type EffectiveRuntimeContext,
  effectiveRuntimeContextSchema,
  effectiveNodeBindingSchema,
  externalPrincipalInspectionResponseSchema,
  externalPrincipalDeletionResponseSchema,
  externalPrincipalListResponseSchema,
  type ExternalPrincipalDeletionResponse,
  type ExternalPrincipalInspectionResponse,
  type ExternalPrincipalListResponse,
  type ExternalPrincipalRecord,
  externalPrincipalRecordSchema,
  type Edge,
  type EdgeCreateRequest,
  type EdgeDeletionResponse,
  type EdgeListResponse,
  type EdgeMutationResponse,
  type EdgeReplacementRequest,
  type GraphInspectionResponse,
  type GraphRevisionInspectionResponse,
  type GraphRevisionListResponse,
  type GraphSpec,
  type GraphMutationResponse,
  graphSpecSchema,
  intersectIdentifiers,
  type NodeBinding,
  type NodeCreateRequest,
  type NodeDeletionResponse,
  type NodeInspectionResponse,
  type NodeListResponse,
  type NodeMutationResponse,
  type NodeReplacementRequest,
  packageSourceRecordSchema,
  type PackageSourceAdmissionRequest,
  type PackageSourceDeletionResponse,
  type PackageSourceInspectionResponse,
  type PackageSourceRecord,
  type PackageSourceListResponse,
  resolveEffectiveAgentEngineProfile,
  resolveEffectiveAgentRuntime,
  resolveEffectiveGitDefaultNamespace,
  resolveEffectiveExternalPrincipals,
  resolveEffectiveExternalPrincipalRefs,
  resolveEffectiveGitServices,
  resolveEffectivePrimaryGitPrincipalRef,
  resolveEffectiveModelEndpointProfile,
  resolveEffectiveModelEndpointProfileRef,
  resolveEffectivePrimaryGitServiceRef,
  resolvePrimaryGitRepositoryTarget,
  resolveEffectivePrimaryRelayProfileRef,
  resolveEffectiveRelayProfiles,
  resolveEffectiveRelayProfileRefs,
  type GitRepositoryProvisioningRecord,
  type RuntimeDesiredState,
  runtimeIdentityContextSchema,
  secretRefSchema,
  sessionInspectionResponseSchema,
  sessionListResponseSchema,
  sessionRecordSchema,
  runtimeAgentRuntimeInspectionSchema,
  runtimeApprovalInspectionResponseSchema,
  runtimeApprovalListResponseSchema,
  type RuntimeIdentityRecord,
  runtimeIdentityRecordSchema,
  runtimeArtifactListResponseSchema,
  runtimeInspectionResponseSchema,
  runtimeRecoveryInspectionResponseSchema,
  runtimeRecoveryRecordSchema,
  runtimeRecoveryControllerRecordSchema,
  runtimeRecoveryPolicyRecordSchema,
  type RuntimeRecoveryControllerRecord,
  type RuntimeRecoveryPolicy,
  type RuntimeRecoveryPolicyRecord,
  type RuntimeAgentRuntimeInspection,
  type RuntimeInspectionResponse,
  runtimeArtifactInspectionResponseSchema,
  runtimeArtifactPreviewResponseSchema,
  runtimeIntentRecordSchema,
  type RuntimeApprovalInspectionResponse,
  type RuntimeApprovalListResponse,
  type RuntimeArtifactInspectionResponse,
  type RuntimeArtifactListResponse,
  type RuntimeArtifactPreviewResponse,
  runtimeMemoryInspectionResponseSchema,
  runtimeMemoryPageInspectionResponseSchema,
  type RuntimeMemoryInspectionResponse,
  type RuntimeMemoryPageInspectionResponse,
  type RuntimeMemoryPageKind,
  type RuntimeMemoryPageSummary,
  type RuntimeTurnInspectionResponse,
  type RuntimeTurnListResponse,
  runtimeTurnInspectionResponseSchema,
  runtimeTurnListResponseSchema,
  runtimeListResponseSchema,
  runnerTurnRecordSchema,
  type ApprovalRecord,
  type ApprovalStatusCounts,
  type ArtifactRecord,
  type ConversationRecord,
  type ConversationStatusCounts,
  type HostSessionConsistencyFinding,
  type HostSessionConsistencyFindingCode,
  type SessionInspectionResponse,
  type SessionListResponse,
  type SessionRecord,
  type RunnerTurnRecord,
  type RuntimeListResponse,
  type RuntimeRecoveryInspectionResponse,
  type RuntimeRecoveryRecord,
  type RuntimeObservedState,
  type RuntimeIntentRecord,
  type ObservedRunnerTurnActivityRecord,
  type ObservedApprovalActivityRecord,
  type ObservedArtifactActivityRecord,
  type ObservedConversationActivityRecord,
  type ObservedSessionActivityRecord,
  type ObservedRuntimeRecord,
  observedRuntimeRecordSchema,
  reconciliationSnapshotSchema,
  type ReconciliationSnapshot,
  type ValidationReport,
} from "@entangle/types";
import {
  validateDeploymentResourceCatalogDocument,
  validateGraphDocument,
  validatePackageDirectory
} from "@entangle/validator";
import { generateSecretKey, getPublicKey } from "nostr-tools";
import { GiteaApiClient } from "./gitea-api-client.js";
import {
  createRuntimeBackend,
  type RuntimeBackend
} from "./runtime-backend.js";

const hostStateRoot = path.join(
  path.resolve(process.env.ENTANGLE_HOME ?? path.resolve(process.cwd(), ".entangle")),
  "host"
);
const secretStateRoot = path.resolve(
  process.env.ENTANGLE_SECRETS_HOME ??
    path.join(path.dirname(path.dirname(hostStateRoot)), ".entangle-secrets")
);

const desiredRoot = path.join(hostStateRoot, "desired");
const observedRoot = path.join(hostStateRoot, "observed");
const tracesRoot = path.join(hostStateRoot, "traces");
const importsRoot = path.join(hostStateRoot, "imports");
const workspacesRoot = path.join(hostStateRoot, "workspaces");
const cacheRoot = path.join(hostStateRoot, "cache");
const packageStoreRoot = path.join(importsRoot, "packages", "store");
const reservedPackageSourceIds = new Set(["store"]);

const catalogPath = path.join(desiredRoot, "catalog.json");
const externalPrincipalsRoot = path.join(desiredRoot, "external-principals");
const packageSourcesRoot = path.join(desiredRoot, "package-sources");
const graphRoot = path.join(desiredRoot, "graph");
const currentGraphPath = path.join(graphRoot, "current.json");
const activeGraphRevisionPath = path.join(graphRoot, "active-revision.json");
const graphRevisionsRoot = path.join(graphRoot, "revisions");
const nodeBindingsRoot = path.join(desiredRoot, "node-bindings");
const runtimeIntentsRoot = path.join(desiredRoot, "runtime-intents");
const observedRuntimesRoot = path.join(observedRoot, "runtimes");
const runtimeRecoveryPoliciesRoot = path.join(
  desiredRoot,
  "runtime-recovery-policies"
);
const runtimeRecoveryHistoryRoot = path.join(observedRoot, "runtime-recovery");
const runtimeRecoveryControllersRoot = path.join(
  observedRoot,
  "runtime-recovery-controllers"
);
const gitRepositoryTargetsRoot = path.join(observedRoot, "git-repository-targets");
const observedApprovalActivityRoot = path.join(observedRoot, "approval-activity");
const observedArtifactActivityRoot = path.join(observedRoot, "artifact-activity");
const observedConversationActivityRoot = path.join(
  observedRoot,
  "conversation-activity"
);
const observedRunnerTurnActivityRoot = path.join(
  observedRoot,
  "runner-turn-activity"
);
const observedSessionActivityRoot = path.join(observedRoot, "session-activity");
const reconciliationRoot = path.join(observedRoot, "reconciliation");
const latestReconciliationPath = path.join(reconciliationRoot, "latest.json");
const reconciliationHistoryRoot = path.join(reconciliationRoot, "history");
const controlPlaneTraceRoot = path.join(tracesRoot, "control-plane");
const runtimeIdentitiesRoot = path.join(secretStateRoot, "runtime-identities");
const secretRefsRoot = path.join(secretStateRoot, "refs");
const runtimeContextFileName = "effective-runtime-context.json";
const artifactPreviewMaxBytes = 16 * 1024;
const memoryPreviewMaxBytes = 16 * 1024;
const focusedMemoryRegisterPaths = new Set([
  "wiki/summaries/working-context.md",
  "wiki/summaries/decisions.md",
  "wiki/summaries/stable-facts.md",
  "wiki/summaries/open-questions.md",
  "wiki/summaries/next-actions.md",
  "wiki/summaries/resolutions.md",
  "wiki/summaries/recent-work.md"
]);
const packageStoreMetadataFileName = ".package-store.json";
const gunzipAsync = promisify(gunzip);

type LocalPathPackageSourceRecord = Extract<
  PackageSourceRecord,
  { sourceKind: "local_path" }
>;

type RuntimeResolution = {
  binding: EffectiveNodeBinding;
  context: EffectiveRuntimeContext | undefined;
  primaryGitRepositoryProvisioning: GitRepositoryProvisioningRecord | undefined;
  inspection: RuntimeInspectionResponse;
};

let runtimeBackendOverride:
  | (() => RuntimeBackend)
  | undefined;
let runtimeBackendSingleton: RuntimeBackend | undefined;
const hostEventSubscribers = new Set<(event: HostEventRecord) => void>();

type CurrentGraphRuntimeSynchronizationResult = {
  nodes: NodeInspectionResponse[];
  runtimes: RuntimeInspectionResponse[];
  snapshot: ReturnType<typeof reconciliationSnapshotSchema.parse>;
};

let currentGraphRuntimeSynchronizationPromise:
  | Promise<CurrentGraphRuntimeSynchronizationResult>
  | undefined;

function getRuntimeBackend(): RuntimeBackend {
  if (!runtimeBackendSingleton) {
    runtimeBackendSingleton = runtimeBackendOverride
      ? runtimeBackendOverride()
      : createRuntimeBackend(hostStateRoot, secretStateRoot);
  }

  return runtimeBackendSingleton;
}

export function configureRuntimeBackendForProcess(
  factory: (() => RuntimeBackend) | undefined
): void {
  runtimeBackendOverride = factory;
  runtimeBackendSingleton = undefined;
}

type CatalogUpdatedEventInput = Omit<
  Extract<HostEventRecord, { type: "catalog.updated" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type PackageSourceAdmittedEventInput = Omit<
  Extract<HostEventRecord, { type: "package_source.admitted" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type PackageSourceDeletedEventInput = Omit<
  Extract<HostEventRecord, { type: "package_source.deleted" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type ExternalPrincipalUpdatedEventInput = Omit<
  Extract<HostEventRecord, { type: "external_principal.updated" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type ExternalPrincipalDeletedEventInput = Omit<
  Extract<HostEventRecord, { type: "external_principal.deleted" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type GraphRevisionAppliedEventInput = Omit<
  Extract<HostEventRecord, { type: "graph.revision.applied" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type NodeBindingUpdatedEventInput = Omit<
  Extract<HostEventRecord, { type: "node.binding.updated" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type EdgeUpdatedEventInput = Omit<
  Extract<HostEventRecord, { type: "edge.updated" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type RuntimeDesiredStateChangedEventInput = Omit<
  Extract<HostEventRecord, { type: "runtime.desired_state.changed" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type RuntimeRestartRequestedEventInput = Omit<
  Extract<HostEventRecord, { type: "runtime.restart.requested" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type RuntimeRecoveryPolicyUpdatedEventInput = Omit<
  Extract<HostEventRecord, { type: "runtime.recovery_policy.updated" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type RuntimeRecoveryAttemptedEventInput = Omit<
  Extract<HostEventRecord, { type: "runtime.recovery.attempted" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type RuntimeRecoveryExhaustedEventInput = Omit<
  Extract<HostEventRecord, { type: "runtime.recovery.exhausted" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type RuntimeRecoveryRecordedEventInput = Omit<
  Extract<HostEventRecord, { type: "runtime.recovery.recorded" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type RuntimeRecoveryControllerUpdatedEventInput = Omit<
  Extract<HostEventRecord, { type: "runtime.recovery_controller.updated" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type RuntimeObservedStateChangedEventInput = Omit<
  Extract<HostEventRecord, { type: "runtime.observed_state.changed" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type SessionUpdatedEventInput = Omit<
  Extract<HostEventRecord, { type: "session.updated" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type RunnerTurnUpdatedEventInput = Omit<
  Extract<HostEventRecord, { type: "runner.turn.updated" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type ConversationTraceEventInput = Omit<
  Extract<HostEventRecord, { type: "conversation.trace.event" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type ApprovalTraceEventInput = Omit<
  Extract<HostEventRecord, { type: "approval.trace.event" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type ArtifactTraceEventInput = Omit<
  Extract<HostEventRecord, { type: "artifact.trace.event" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type HostReconciliationCompletedEventInput = Omit<
  Extract<HostEventRecord, { type: "host.reconciliation.completed" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type HostOperatorRequestCompletedEventInput = Omit<
  Extract<HostEventRecord, { type: "host.operator_request.completed" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;

type ManagedNodeMutationConflict =
  | {
      kind: "graph_missing";
      message: string;
    }
  | {
      kind: "node_exists";
      nodeId: string;
    }
  | {
      kind: "node_has_edges";
      edgeIds: string[];
      nodeId: string;
    }
  | {
      kind: "node_not_found";
      nodeId: string;
    };

type ManagedNodeMutationResult<T> =
  | {
      ok: true;
      response: T;
    }
  | {
      conflict: ManagedNodeMutationConflict;
      ok: false;
    };

type EdgeMutationConflict =
  | {
      kind: "graph_missing";
      message: string;
    }
  | {
      edgeId: string;
      kind: "edge_exists";
    }
  | {
      edgeId: string;
      kind: "edge_not_found";
    };

type EdgeMutationResult<T> =
  | {
      ok: true;
      response: T;
    }
  | {
      conflict: EdgeMutationConflict;
      ok: false;
    };

type PackageSourceDeletionConflict =
  | {
      kind: "package_source_in_use";
      nodeIds: string[];
      packageSourceId: string;
    }
  | {
      kind: "package_source_not_found";
      packageSourceId: string;
    };

type PackageSourceDeletionResult =
  | {
      ok: true;
      response: PackageSourceDeletionResponse;
    }
  | {
      conflict: PackageSourceDeletionConflict;
      ok: false;
    };

type ExternalPrincipalDeletionConflict =
  | {
      kind: "external_principal_in_use";
      nodeIds: string[];
      principalId: string;
    }
  | {
      kind: "external_principal_not_found";
      principalId: string;
    };

type ExternalPrincipalDeletionResult =
  | {
      ok: true;
      response: ExternalPrincipalDeletionResponse;
    }
  | {
      conflict: ExternalPrincipalDeletionConflict;
      ok: false;
    };

function nowIsoString(): string {
  return new Date().toISOString();
}

function dateStamp(): string {
  return nowIsoString().slice(0, 10);
}

function formatUnknownError(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Unknown host runtime error.";
}

function sanitizeIdentifier(input: string): string {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized.length > 0 ? normalized : `id-${randomUUID()}`;
}

async function ensureDirectory(directoryPath: string): Promise<void> {
  await mkdir(directoryPath, { recursive: true });
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function encodeJsonFile(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await ensureDirectory(path.dirname(filePath));
  await writeFile(filePath, encodeJsonFile(value), "utf8");
}

async function writeSecretFile(filePath: string, value: string): Promise<void> {
  await ensureDirectory(path.dirname(filePath));
  await writeFile(filePath, value, {
    encoding: "utf8",
    mode: 0o600
  });
}

async function writeJsonFileIfChanged(
  filePath: string,
  value: unknown
): Promise<boolean> {
  const encoded = encodeJsonFile(value);

  if ((await pathExists(filePath)) && (await readFile(filePath, "utf8")) === encoded) {
    return false;
  }

  await ensureDirectory(path.dirname(filePath));
  await writeFile(filePath, encoded, "utf8");
  return true;
}

function buildDefaultCatalog(): DeploymentResourceCatalog {
  const relayId = sanitizeIdentifier(
    process.env.ENTANGLE_DEFAULT_RELAY_ID ?? "local-relay"
  );
  const gitServiceId = sanitizeIdentifier(
    process.env.ENTANGLE_DEFAULT_GIT_SERVICE_ID ?? "local-gitea"
  );
  const catalogId = sanitizeIdentifier(
    process.env.ENTANGLE_CATALOG_ID ?? "local-catalog"
  );
  const relayReadUrl =
    process.env.ENTANGLE_DEFAULT_RELAY_READ_URL ?? "ws://strfry:7777";
  const relayWriteUrl =
    process.env.ENTANGLE_DEFAULT_RELAY_WRITE_URL ?? relayReadUrl;
  const gitBaseUrl =
    process.env.ENTANGLE_DEFAULT_GIT_SERVICE_BASE_URL ?? "http://gitea:3000";
  const gitTransport =
    process.env.ENTANGLE_DEFAULT_GIT_TRANSPORT === "https" ? "https" : "ssh";
  const gitRemoteBase =
    process.env.ENTANGLE_DEFAULT_GIT_REMOTE_BASE ??
    (gitTransport === "https" ? gitBaseUrl : "ssh://git@gitea:22");
  const agentEngineBaseUrl =
    process.env.ENTANGLE_DEFAULT_AGENT_ENGINE_BASE_URL?.trim();
  const requestedAgentEngineKind =
    process.env.ENTANGLE_DEFAULT_AGENT_ENGINE_KIND?.trim();
  const agentEngineKind =
    requestedAgentEngineKind === "opencode_server" ||
    requestedAgentEngineKind === "claude_agent_sdk" ||
    requestedAgentEngineKind === "external_process" ||
    (requestedAgentEngineKind === "external_http" && agentEngineBaseUrl)
      ? requestedAgentEngineKind
      : "opencode_server";
  const agentEngineId = sanitizeIdentifier(
    process.env.ENTANGLE_DEFAULT_AGENT_ENGINE_ID ??
      (agentEngineKind === "opencode_server"
        ? "local-opencode"
        : `local-${agentEngineKind}`)
  );
  const configuredAgentEngineExecutable =
    process.env.ENTANGLE_DEFAULT_AGENT_ENGINE_EXECUTABLE?.trim();
  const agentEngineExecutable =
    configuredAgentEngineExecutable ||
    (agentEngineKind === "opencode_server"
      ? "opencode"
      : agentEngineKind === "external_process"
        ? "agent-engine"
        : undefined);

  const modelEndpointId = process.env.ENTANGLE_DEFAULT_MODEL_ENDPOINT_ID?.trim();
  const modelBaseUrl = process.env.ENTANGLE_DEFAULT_MODEL_BASE_URL?.trim();
  const modelSecretRef = process.env.ENTANGLE_DEFAULT_MODEL_SECRET_REF?.trim();
  const modelDefaultModel =
    process.env.ENTANGLE_DEFAULT_MODEL_DEFAULT_MODEL?.trim();
  const modelAdapterKind =
    process.env.ENTANGLE_DEFAULT_MODEL_ADAPTER_KIND === "openai_compatible"
      ? "openai_compatible"
      : "anthropic";
  const modelAuthMode =
    process.env.ENTANGLE_DEFAULT_MODEL_AUTH_MODE === "api_key_bearer"
      ? "api_key_bearer"
      : process.env.ENTANGLE_DEFAULT_MODEL_AUTH_MODE === "header_secret"
        ? "header_secret"
        : modelAdapterKind === "anthropic"
          ? "header_secret"
          : "api_key_bearer";

  const modelEndpoints =
    modelEndpointId && modelBaseUrl && modelSecretRef
      ? [
          {
            id: sanitizeIdentifier(modelEndpointId),
            displayName:
              process.env.ENTANGLE_DEFAULT_MODEL_DISPLAY_NAME ??
              "Shared Model Endpoint",
            adapterKind: modelAdapterKind,
            baseUrl: modelBaseUrl,
            authMode: modelAuthMode,
            secretRef: modelSecretRef,
            defaultModel: modelDefaultModel || undefined
          }
        ]
      : [];

  return deploymentResourceCatalogSchema.parse({
    schemaVersion: "1",
    catalogId,
    relays: [
      {
        id: relayId,
        displayName: process.env.ENTANGLE_DEFAULT_RELAY_DISPLAY_NAME ?? "Local Relay",
        readUrls: [relayReadUrl],
        writeUrls: [relayWriteUrl],
        authMode: "none"
      }
    ],
    gitServices: [
      {
        id: gitServiceId,
        displayName:
          process.env.ENTANGLE_DEFAULT_GIT_SERVICE_DISPLAY_NAME ?? "Local Gitea",
        baseUrl: gitBaseUrl,
        remoteBase: gitRemoteBase,
        transportKind: gitTransport,
        authMode:
          process.env.ENTANGLE_DEFAULT_GIT_AUTH_MODE === "https_token"
            ? "https_token"
            : process.env.ENTANGLE_DEFAULT_GIT_AUTH_MODE === "http_signature"
              ? "http_signature"
              : "ssh_key",
        defaultNamespace:
          process.env.ENTANGLE_DEFAULT_GIT_NAMESPACE?.trim() || undefined
      }
    ],
    modelEndpoints,
    agentEngineProfiles: [
      {
        id: agentEngineId,
        displayName:
          process.env.ENTANGLE_DEFAULT_AGENT_ENGINE_DISPLAY_NAME ??
          (agentEngineKind === "opencode_server"
            ? "Local OpenCode"
            : "Local Agent Engine"),
        kind: agentEngineKind,
        executable: agentEngineExecutable,
        baseUrl: agentEngineBaseUrl || undefined,
        defaultAgent:
          process.env.ENTANGLE_DEFAULT_AGENT_ENGINE_AGENT?.trim() || undefined,
        version:
          process.env.ENTANGLE_DEFAULT_AGENT_ENGINE_VERSION?.trim() || undefined
      }
    ],
    defaults: {
      relayProfileRefs: [relayId],
      gitServiceRef: gitServiceId,
      modelEndpointRef: modelEndpoints[0]?.id,
      agentEngineProfileRef: agentEngineId
    }
  });
}

function buildPackageSourceId(
  requestedId: string | undefined,
  manifestPackageId: string,
  existingIds: string[]
): string {
  const unavailableIds = new Set([
    ...existingIds,
    ...reservedPackageSourceIds
  ]);
  const preferredId = sanitizeIdentifier(
    requestedId ?? `${manifestPackageId}-source`
  );

  if (!unavailableIds.has(preferredId)) {
    return preferredId;
  }

  let suffix = 2;

  while (unavailableIds.has(`${preferredId}-${suffix}`)) {
    suffix += 1;
  }

  return `${preferredId}-${suffix}`;
}

function packageSourceRecordPath(packageSourceId: string): string {
  return path.join(packageSourcesRoot, `${packageSourceId}.json`);
}

function packageSourceImportRoot(packageSourceId: string): string {
  return path.join(importsRoot, "packages", packageSourceId);
}

function buildGraphRevisionId(graphId: string): string {
  const timestamp = nowIsoString()
    .toLowerCase()
    .replace(/[-:.]/g, "")
    .replace("z", "z");

  return sanitizeIdentifier(`${graphId}-${timestamp}`);
}

function buildPackageStoreKey(contentDigest: string): string {
  return sanitizeIdentifier(contentDigest.replace(":", "-"));
}

function buildPackageStoreLayout(contentDigest: string) {
  const packageStoreKey = buildPackageStoreKey(contentDigest);
  const root = path.join(packageStoreRoot, packageStoreKey);

  return {
    metadataPath: path.join(root, packageStoreMetadataFileName),
    packageRoot: path.join(root, "package"),
    packageStoreKey,
    root
  };
}

function buildRuntimeIdentityRecordId(graphId: string, nodeId: string): string {
  return sanitizeIdentifier(`${graphId}-${nodeId}`);
}

function buildRuntimeIdentityRecordPath(graphId: string, nodeId: string): string {
  return path.join(
    runtimeIdentitiesRoot,
    `${buildRuntimeIdentityRecordId(graphId, nodeId)}.json`
  );
}

async function ensureRuntimeIdentity(input: {
  graphId: string;
  nodeId: string;
}): Promise<RuntimeIdentityRecord> {
  const recordPath = buildRuntimeIdentityRecordPath(input.graphId, input.nodeId);

  if (await pathExists(recordPath)) {
    const record = runtimeIdentityRecordSchema.parse(
      await readJsonFile<RuntimeIdentityRecord>(recordPath)
    );

    if (await pathExists(record.secretStoragePath)) {
      return record;
    }
  }

  const secretKey = generateSecretKey();
  const secretHex = Buffer.from(secretKey).toString("hex");
  const publicKey = getPublicKey(secretKey);
  const secretStoragePath = path.join(
    runtimeIdentitiesRoot,
    `${buildRuntimeIdentityRecordId(input.graphId, input.nodeId)}.nostr-secret`
  );
  const now = nowIsoString();
  const record = runtimeIdentityRecordSchema.parse({
    algorithm: "nostr_secp256k1",
    createdAt: now,
    graphId: input.graphId,
    nodeId: input.nodeId,
    publicKey,
    schemaVersion: "1",
    secretStoragePath,
    updatedAt: now
  });

  await writeSecretFile(secretStoragePath, `${secretHex}\n`);
  await writeJsonFile(recordPath, record);
  return record;
}

function resolveSecretRefStoragePath(secretRef: string): string | undefined {
  const parsedSecretRef = secretRefSchema.safeParse(secretRef);

  if (!parsedSecretRef.success) {
    return undefined;
  }

  const parsed = new URL(parsedSecretRef.data);

  const segments = [parsed.hostname, ...parsed.pathname.split("/").filter(Boolean)];

  if (segments.length === 0) {
    return undefined;
  }

  return path.join(secretRefsRoot, ...segments);
}

async function resolveSecretBinding(secretRef: string): Promise<{
  delivery?: {
    filePath: string;
    mode: "mounted_file";
  };
  secretRef: string;
  status: "available" | "missing";
}> {
  const storagePath = resolveSecretRefStoragePath(secretRef);

  if (!storagePath || !(await pathExists(storagePath))) {
    return {
      secretRef,
      status: "missing"
    };
  }

  return {
    delivery: {
      filePath: storagePath,
      mode: "mounted_file"
    },
    secretRef,
    status: "available"
  };
}

async function readSecretRefValue(secretRef: string): Promise<string | undefined> {
  const storagePath = resolveSecretRefStoragePath(secretRef);

  if (!storagePath || !(await pathExists(storagePath))) {
    return undefined;
  }

  const secretValue = (await readFile(storagePath, "utf8")).trim();
  return secretValue.length > 0 ? secretValue : undefined;
}

async function resolveGitPrincipalRuntimeBindings(
  principals: ExternalPrincipalRecord[]
): Promise<
  Array<{
    principal: ExternalPrincipalRecord;
    signing?: {
      delivery?: {
        filePath: string;
        mode: "mounted_file";
      };
      secretRef: string;
      status: "available" | "missing";
    };
    transport: {
      delivery?: {
        filePath: string;
        mode: "mounted_file";
      };
      secretRef: string;
      status: "available" | "missing";
    };
  }>
> {
  return Promise.all(
    principals.map(async (principal) => {
      const transport = await resolveSecretBinding(principal.secretRef);
      const signing =
        principal.signing?.mode === "ssh_key"
          ? await resolveSecretBinding(principal.signing.secretRef)
          : undefined;

      return {
        principal,
        ...(signing ? { signing } : {}),
        transport
      };
    })
  );
}

async function appendDirectoryDigest(
  directoryPath: string,
  relativeRoot: string,
  hash: ReturnType<typeof createHash>
): Promise<void> {
  const entries = (await readdir(directoryPath, { withFileTypes: true })).sort((left, right) =>
    left.name.localeCompare(right.name)
  );

  for (const entry of entries) {
    const sourcePath = path.join(directoryPath, entry.name);
    const relativePath =
      relativeRoot.length > 0 ? `${relativeRoot}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      hash.update(`dir:${relativePath}\n`);
      await appendDirectoryDigest(sourcePath, relativePath, hash);
      continue;
    }

    if (entry.isSymbolicLink()) {
      hash.update(`symlink:${relativePath}\n`);
      hash.update(await readlink(sourcePath));
      hash.update("\n");
      continue;
    }

    hash.update(`file:${relativePath}\n`);
    hash.update(await readFile(sourcePath));
    hash.update("\n");
  }
}

async function computeDirectoryContentDigest(directoryPath: string): Promise<string> {
  const hash = createHash("sha256");
  await appendDirectoryDigest(directoryPath, "", hash);
  return `sha256:${hash.digest("hex")}`;
}

async function materializePackageStore(
  packageSourceId: string,
  packageRoot: string
): Promise<LocalPathPackageSourceRecord["materialization"]> {
  const contentDigest = await computeDirectoryContentDigest(packageRoot);
  const storeLayout = buildPackageStoreLayout(contentDigest);

  if (!(await pathExists(storeLayout.packageRoot))) {
    await syncDirectoryContents(packageRoot, storeLayout.packageRoot);
  }

  const materialization = {
    contentDigest,
    materializationKind: "immutable_store" as const,
    packageRoot: storeLayout.packageRoot,
    synchronizedAt: nowIsoString()
  };

  await writeJsonFile(storeLayout.metadataPath, {
    contentDigest,
    packageRoot: storeLayout.packageRoot,
    packageSourceId,
    synchronizedAt: materialization.synchronizedAt
  });

  return materialization;
}

function stripSupportedPackageArchiveExtension(archivePath: string): string {
  return path
    .basename(archivePath)
    .replace(/\.tar\.gz$/iu, "")
    .replace(/\.tgz$/iu, "")
    .replace(/\.tar$/iu, "");
}

function parseTarHeaderString(input: Buffer): string {
  const nulIndex = input.indexOf(0);
  const bytes = nulIndex === -1 ? input : input.subarray(0, nulIndex);
  return bytes.toString("utf8").trim();
}

function parseTarHeaderOctal(input: Buffer, fieldName: string): number {
  const value = parseTarHeaderString(input).replace(/\s+/gu, "");

  if (value.length === 0) {
    return 0;
  }

  if (!/^[0-7]+$/u.test(value)) {
    throw new Error(`Archive entry has an invalid ${fieldName} field.`);
  }

  return Number.parseInt(value, 8);
}

function isTarZeroBlock(input: Buffer, offset: number): boolean {
  for (let index = offset; index < offset + 512; index += 1) {
    if (input[index] !== 0) {
      return false;
    }
  }

  return true;
}

function computeTarHeaderChecksum(header: Buffer): number {
  let checksum = 0;

  for (let index = 0; index < 512; index += 1) {
    checksum += index >= 148 && index < 156 ? 0x20 : header[index] ?? 0;
  }

  return checksum;
}

function resolveArchiveOutputPath(input: {
  extractionRoot: string;
  relativePath: string;
}): string {
  if (input.relativePath.includes("\0")) {
    throw new Error("Archive entry paths may not contain NUL bytes.");
  }

  const normalizedRelativePath = path.posix.normalize(
    input.relativePath.replace(/\\/gu, "/")
  );

  if (
    normalizedRelativePath.length === 0 ||
    normalizedRelativePath === "." ||
    normalizedRelativePath === ".." ||
    normalizedRelativePath.startsWith("../") ||
    path.posix.isAbsolute(normalizedRelativePath)
  ) {
    throw new Error(
      `Archive entry path '${input.relativePath}' is not a safe relative path.`
    );
  }

  const extractionRoot = path.resolve(input.extractionRoot);
  const outputPath = path.resolve(
    extractionRoot,
    ...normalizedRelativePath.split("/")
  );

  if (
    outputPath !== extractionRoot &&
    !outputPath.startsWith(`${extractionRoot}${path.sep}`)
  ) {
    throw new Error(
      `Archive entry path '${input.relativePath}' would escape the extraction root.`
    );
  }

  return outputPath;
}

async function readTarArchivePayload(archivePath: string): Promise<Buffer> {
  const archive = await readFile(archivePath);
  const isGzipArchive =
    (archive[0] === 0x1f && archive[1] === 0x8b) ||
    /\.t(?:ar\.)?gz$/iu.test(archivePath);

  return isGzipArchive ? await gunzipAsync(archive) : archive;
}

async function extractPackageTarArchive(input: {
  archivePath: string;
  extractionRoot: string;
}): Promise<void> {
  const archiveStats = await stat(input.archivePath);

  if (!archiveStats.isFile()) {
    throw new Error(`Archive path '${input.archivePath}' is not a regular file.`);
  }

  const archive = await readTarArchivePayload(input.archivePath);
  let offset = 0;
  let extractedEntryCount = 0;

  while (offset + 512 <= archive.length) {
    if (isTarZeroBlock(archive, offset)) {
      break;
    }

    const header = archive.subarray(offset, offset + 512);
    const storedChecksum = parseTarHeaderOctal(
      header.subarray(148, 156),
      "checksum"
    );

    if (
      storedChecksum > 0 &&
      storedChecksum !== computeTarHeaderChecksum(header)
    ) {
      throw new Error("Archive entry checksum validation failed.");
    }

    const name = parseTarHeaderString(header.subarray(0, 100));
    const prefix = parseTarHeaderString(header.subarray(345, 500));
    const relativePath = prefix.length > 0 ? `${prefix}/${name}` : name;

    if (relativePath.length === 0) {
      throw new Error("Archive entry is missing a path.");
    }

    const typeFlagByte = header[156] ?? 0;
    const typeFlag =
      typeFlagByte === 0 ? "0" : String.fromCharCode(typeFlagByte);
    const size = parseTarHeaderOctal(header.subarray(124, 136), "size");
    const dataOffset = offset + 512;
    const nextOffset = dataOffset + Math.ceil(size / 512) * 512;

    if (nextOffset > archive.length) {
      throw new Error("Archive entry is truncated.");
    }

    if (typeFlag === "x" || typeFlag === "g") {
      offset = nextOffset;
      continue;
    }

    const outputPath = resolveArchiveOutputPath({
      extractionRoot: input.extractionRoot,
      relativePath
    });

    if (typeFlag === "5") {
      await ensureDirectory(outputPath);
      extractedEntryCount += 1;
      offset = nextOffset;
      continue;
    }

    if (typeFlag === "0") {
      await ensureDirectory(path.dirname(outputPath));
      await writeFile(outputPath, archive.subarray(dataOffset, dataOffset + size));
      extractedEntryCount += 1;
      offset = nextOffset;
      continue;
    }

    if (typeFlag === "1" || typeFlag === "2") {
      throw new Error("Package archives may not contain hard links or symlinks.");
    }

    throw new Error(`Package archive entry type '${typeFlag}' is not supported.`);
  }

  if (extractedEntryCount === 0) {
    throw new Error("Package archive did not contain any extractable entries.");
  }
}

async function resolveExtractedPackageRoot(
  extractionRoot: string
): Promise<string> {
  if (await pathExists(path.join(extractionRoot, "manifest.json"))) {
    return extractionRoot;
  }

  const topLevelDirectories = (await readdir(extractionRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  if (topLevelDirectories.length === 1) {
    const nestedPackageRoot = path.join(extractionRoot, topLevelDirectories[0]!);

    if (await pathExists(path.join(nestedPackageRoot, "manifest.json"))) {
      return nestedPackageRoot;
    }
  }

  return extractionRoot;
}

async function readPackageManifestFromRoot(
  packageRoot: string
): Promise<AgentPackageManifest | undefined> {
  const manifestPath = path.join(packageRoot, "manifest.json");

  if (!(await pathExists(manifestPath))) {
    return undefined;
  }

  try {
    const manifestDocument = await readJsonFile(manifestPath);
    const manifestParse = agentPackageManifestSchema.safeParse(manifestDocument);
    return manifestParse.success ? manifestParse.data : undefined;
  } catch {
    return undefined;
  }
}

async function validatePersistedPackageSource(
  record: PackageSourceRecord
): Promise<ValidationReport> {
  return record.sourceKind === "local_path"
    ? await validatePackageDirectory(record.absolutePath)
    : await validatePackageDirectory(packageSourcePackageRoot(record));
}

async function reconcileMaterializedPackageSourceRecord(
  record: PackageSourceRecord
): Promise<PackageSourceRecord> {
  if (record.sourceKind !== "local_path") {
    return record;
  }

  if (!(await pathExists(record.absolutePath))) {
    return record;
  }

  const materialization = await materializePackageStore(
    record.packageSourceId,
    record.absolutePath
  );
  const nextRecord = packageSourceRecordSchema.parse({
    ...record,
    materialization
  });

  if (JSON.stringify(nextRecord) !== JSON.stringify(record)) {
    await writeJsonFile(
      packageSourceRecordPath(record.packageSourceId),
      nextRecord
    );
  }

  return nextRecord;
}

function packageSourcePackageRoot(record: PackageSourceRecord): string {
  return (
    record.materialization?.packageRoot ??
    (record.sourceKind === "local_path"
      ? record.absolutePath
      : path.join(importsRoot, "packages", record.packageSourceId, "package"))
  );
}

async function resolveManifestForPackageSource(
  record: PackageSourceRecord
): Promise<PackageSourceInspectionResponse["manifest"]> {
  const manifestPath = path.join(packageSourcePackageRoot(record), "manifest.json");

  if (!(await pathExists(manifestPath))) {
    return undefined;
  }

  let manifestDocument: unknown;

  try {
    manifestDocument = await readJsonFile(manifestPath);
  } catch {
    return undefined;
  }

  const manifestParse = agentPackageManifestSchema.safeParse(manifestDocument);
  return manifestParse.success ? manifestParse.data : undefined;
}

function emitHostEvent(event: HostEventRecord): void {
  for (const subscriber of hostEventSubscribers) {
    subscriber(event);
  }
}

async function appendHostEvent(
  event: Record<string, unknown>
): Promise<HostEventRecord> {
  await ensureDirectory(controlPlaneTraceRoot);
  const logPath = path.join(controlPlaneTraceRoot, `${dateStamp()}.jsonl`);
  const record = hostEventRecordSchema.parse({
    ...event,
    eventId: sanitizeIdentifier(`evt-${randomUUID()}`),
    schemaVersion: "1",
    timestamp: nowIsoString()
  });
  const encoded = `${JSON.stringify(record)}\n`;
  await writeFile(logPath, encoded, { encoding: "utf8", flag: "a" });
  emitHostEvent(record);
  return record;
}

export async function recordHostOperatorRequestCompleted(
  event: HostOperatorRequestCompletedEventInput
): Promise<HostEventRecord> {
  return appendHostEvent(event);
}

function parsePersistedHostEvent(input: unknown): HostEventRecord {
  const parsedRecord = hostEventRecordSchema.safeParse(input);

  if (parsedRecord.success) {
    return parsedRecord.data;
  }

  if (!input || typeof input !== "object") {
    throw parsedRecord.error;
  }

  const legacyEvent = input as Record<string, unknown>;
  const legacyType =
    typeof legacyEvent.type === "string" ? legacyEvent.type : undefined;
  const legacyMessage =
    typeof legacyEvent.message === "string"
      ? legacyEvent.message
      : "Recovered legacy host event.";
  const legacyTimestamp =
    typeof legacyEvent.timestamp === "string"
      ? legacyEvent.timestamp
      : nowIsoString();
  const legacyEventId = sanitizeIdentifier(
    `evt-${createHash("sha1").update(JSON.stringify(input)).digest("hex").slice(0, 20)}`
  );

  switch (legacyType) {
    case "catalog_bootstrap":
      return hostEventRecordSchema.parse({
        eventId: legacyEventId,
        message: legacyMessage,
        schemaVersion: "1",
        timestamp: legacyTimestamp,
        catalogId:
          typeof legacyEvent.catalogId === "string"
            ? legacyEvent.catalogId
            : "bootstrap-catalog",
        category: "control_plane",
        type: "catalog.updated",
        updateKind: "bootstrap"
      });
    case "catalog_apply":
      return hostEventRecordSchema.parse({
        eventId: legacyEventId,
        message: legacyMessage,
        schemaVersion: "1",
        timestamp: legacyTimestamp,
        catalogId:
          typeof legacyEvent.catalogId === "string"
            ? legacyEvent.catalogId
            : "applied-catalog",
        category: "control_plane",
        type: "catalog.updated",
        updateKind: "apply"
      });
    case "package_source_admit":
      return hostEventRecordSchema.parse({
        eventId: legacyEventId,
        message: legacyMessage,
        schemaVersion: "1",
        timestamp: legacyTimestamp,
        category: "control_plane",
        packageSourceId:
          typeof legacyEvent.packageSourceId === "string"
            ? legacyEvent.packageSourceId
            : "legacy-package-source",
        type: "package_source.admitted"
      });
    case "external_principal_upsert":
      return hostEventRecordSchema.parse({
        eventId: legacyEventId,
        message: legacyMessage,
        schemaVersion: "1",
        timestamp: legacyTimestamp,
        category: "control_plane",
        principalId:
          typeof legacyEvent.principalId === "string"
            ? legacyEvent.principalId
            : "legacy-principal",
        type: "external_principal.updated"
      });
    case "graph_apply":
      return hostEventRecordSchema.parse({
        eventId: legacyEventId,
        message: legacyMessage,
        schemaVersion: "1",
        timestamp: legacyTimestamp,
        activeRevisionId:
          typeof legacyEvent.activeRevisionId === "string"
            ? legacyEvent.activeRevisionId
            : "legacy-graph-revision",
        category: "control_plane",
        graphId:
          typeof legacyEvent.graphId === "string"
            ? legacyEvent.graphId
            : "legacy-graph",
        type: "graph.revision.applied"
      });
    default:
      throw parsedRecord.error;
  }
}

export function subscribeToHostEvents(
  listener: (event: HostEventRecord) => void
): () => void {
  hostEventSubscribers.add(listener);
  return () => {
    hostEventSubscribers.delete(listener);
  };
}

export async function listHostEvents(limit = 100): Promise<HostEventListResponse> {
  await initializeHostState();

  if (!(await pathExists(controlPlaneTraceRoot))) {
    return hostEventListResponseSchema.parse({
      events: []
    });
  }

  const fileNames = (await readdir(controlPlaneTraceRoot))
    .filter((fileName) => fileName.endsWith(".jsonl"))
    .sort();
  const events: HostEventRecord[] = [];

  for (const fileName of fileNames) {
    const fileContent = await readFile(
      path.join(controlPlaneTraceRoot, fileName),
      "utf8"
    );
    const entries = fileContent
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => parsePersistedHostEvent(JSON.parse(line) as unknown));

    events.push(...entries);
  }

  return hostEventListResponseSchema.parse({
    events: events.slice(-limit)
  });
}

async function removeJsonFilesExcept(
  directoryPath: string,
  allowedBaseNames: Set<string>
): Promise<void> {
  if (!(await pathExists(directoryPath))) {
    return;
  }

  const entries = await readdir(directoryPath, { withFileTypes: true });

  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .filter((entry) => !allowedBaseNames.has(entry.name.slice(0, -".json".length)))
      .map((entry) => rm(path.join(directoryPath, entry.name), { force: true }))
  );
}

function buildGitRepositoryTargetRecordId(input: {
  gitServiceRef: string;
  namespace: string;
  repositoryName: string;
}): string {
  return sanitizeIdentifier(
    `${input.gitServiceRef}-${input.namespace}-${input.repositoryName}`
  );
}

function gitRepositoryProvisioningRecordPath(
  record: Pick<
    GitRepositoryProvisioningRecord["target"],
    "gitServiceRef" | "namespace" | "repositoryName"
  >
): string {
  return path.join(
    gitRepositoryTargetsRoot,
    `${buildGitRepositoryTargetRecordId(record)}.json`
  );
}

async function readGitRepositoryProvisioningRecord(input: {
  gitServiceRef: string;
  namespace: string;
  repositoryName: string;
}): Promise<GitRepositoryProvisioningRecord | undefined> {
  const filePath = gitRepositoryProvisioningRecordPath(input);

  if (!(await pathExists(filePath))) {
    return undefined;
  }

  return gitRepositoryProvisioningRecordSchema.parse(await readJsonFile(filePath));
}

function buildGitRepositoryProvisioningRecord(input: {
  checkedAt?: string;
  created?: boolean;
  lastError?: string;
  state: GitRepositoryProvisioningRecord["state"];
  target: GitRepositoryProvisioningRecord["target"];
}): GitRepositoryProvisioningRecord {
  return gitRepositoryProvisioningRecordSchema.parse({
    checkedAt: input.checkedAt ?? nowIsoString(),
    ...(input.created !== undefined ? { created: input.created } : {}),
    ...(input.lastError ? { lastError: input.lastError } : {}),
    schemaVersion: "1",
    state: input.state,
    target: input.target
  });
}

async function ensureGitRepositoryTargetProvisioning(input: {
  target: NonNullable<EffectiveRuntimeContext["artifactContext"]["primaryGitRepositoryTarget"]>;
  gitServices: DeploymentResourceCatalog["gitServices"];
}): Promise<GitRepositoryProvisioningRecord> {
  const existingRecord = await readGitRepositoryProvisioningRecord(
    input.target
  );
  const service = input.gitServices.find(
    (candidate) => candidate.id === input.target.gitServiceRef
  );

  if (!service) {
    return buildGitRepositoryProvisioningRecord({
      lastError: `Git service '${input.target.gitServiceRef}' is not available in the effective runtime context.`,
      state: "failed",
      target: input.target
    });
  }

  if (service.provisioning.mode === "preexisting") {
    return buildGitRepositoryProvisioningRecord({
      state: "not_requested",
      target: input.target
    });
  }

  const provisioningToken = await readSecretRefValue(service.provisioning.secretRef);

  if (!provisioningToken) {
    return buildGitRepositoryProvisioningRecord({
      lastError:
        `Git service '${service.id}' requires provisioning secret '${service.provisioning.secretRef}', ` +
        "but no secret material is available in the host secret store.",
      state: "failed",
      target: input.target
    });
  }

  try {
    const client = new GiteaApiClient({
      apiBaseUrl: service.provisioning.apiBaseUrl,
      token: provisioningToken
    });
    const repositoryAlreadyExists = await client.repositoryExists({
      owner: input.target.namespace,
      repositoryName: input.target.repositoryName
    });

    if (repositoryAlreadyExists) {
      return buildGitRepositoryProvisioningRecord({
        created: existingRecord?.state === "ready" ? existingRecord.created ?? false : false,
        state: "ready",
        target: input.target
      });
    }

    const authenticatedUserLogin = await client.getAuthenticatedUserLogin();
    const creationResult =
      authenticatedUserLogin === input.target.namespace
        ? await client.createCurrentUserRepository({
            repositoryName: input.target.repositoryName
          })
        : await client.createOrganizationRepository({
            organization: input.target.namespace,
            repositoryName: input.target.repositoryName
          });

    if (creationResult === "conflict") {
      const repositoryExistsAfterConflict = await client.repositoryExists({
        owner: input.target.namespace,
        repositoryName: input.target.repositoryName
      });

      if (!repositoryExistsAfterConflict) {
        throw new Error(
          `Gitea reported a repository conflict for '${input.target.namespace}/${input.target.repositoryName}', ` +
          "but the repository is still not observable through the repository API."
        );
      }

      return buildGitRepositoryProvisioningRecord({
        created: existingRecord?.state === "ready" ? existingRecord.created ?? false : false,
        state: "ready",
        target: input.target
      });
    }

    return buildGitRepositoryProvisioningRecord({
      created: true,
      state: "ready",
      target: input.target
    });
  } catch (error) {
    return buildGitRepositoryProvisioningRecord({
      lastError: formatUnknownError(error),
      state: "failed",
      target: input.target
    });
  }
}

async function readCatalog(): Promise<DeploymentResourceCatalog> {
  await initializeHostState();
  return deploymentResourceCatalogSchema.parse(await readJsonFile(catalogPath));
}

async function readActiveGraphState(): Promise<{
  activeRevisionId: string | undefined;
  graph: GraphSpec | undefined;
}> {
  await initializeHostState();

  if (!(await pathExists(currentGraphPath))) {
    return {
      activeRevisionId: undefined,
      graph: undefined
    };
  }

  const graph = graphSpecSchema.parse(await readJsonFile(currentGraphPath));
  const revisionRecord = await readActiveGraphRevisionRecord();

  return {
    graph,
    activeRevisionId: revisionRecord?.activeRevisionId
  };
}

async function readActiveGraphRevisionRecord(): Promise<
  ActiveGraphRevisionRecord | undefined
> {
  await initializeHostState();

  if (!(await pathExists(activeGraphRevisionPath))) {
    return undefined;
  }

  return activeGraphRevisionRecordSchema.parse(
    await readJsonFile(activeGraphRevisionPath)
  );
}

async function readGraphRevisionInspection(
  revisionId: string,
  activeRevisionRecord?: ActiveGraphRevisionRecord
): Promise<GraphRevisionInspectionResponse | undefined> {
  const filePath = path.join(graphRevisionsRoot, `${revisionId}.json`);

  if (!(await pathExists(filePath))) {
    return undefined;
  }

  const persisted = await readJsonFile(filePath);
  const parsedRecord = graphRevisionRecordSchema.safeParse(persisted);
  const resolvedRecord = parsedRecord.success
    ? parsedRecord.data
    : graphRevisionRecordSchema.parse({
        appliedAt:
          activeRevisionRecord?.activeRevisionId === revisionId
            ? activeRevisionRecord.appliedAt
            : (await stat(filePath)).mtime.toISOString(),
        graph: graphSpecSchema.parse(persisted),
        revisionId
      });

  return graphRevisionInspectionResponseSchema.parse({
    graph: resolvedRecord.graph,
    revision: {
      appliedAt: resolvedRecord.appliedAt,
      graphId: resolvedRecord.graph.graphId,
      isActive: activeRevisionRecord?.activeRevisionId === revisionId,
      revisionId: resolvedRecord.revisionId
    }
  });
}

export async function listGraphRevisions(): Promise<GraphRevisionListResponse> {
  await initializeHostState();

  if (!(await pathExists(graphRevisionsRoot))) {
    return graphRevisionListResponseSchema.parse({
      revisions: []
    });
  }

  const activeRevisionRecord = await readActiveGraphRevisionRecord();
  const revisionIds = (await readdir(graphRevisionsRoot))
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => entry.slice(0, -".json".length));
  const revisions = (
    await Promise.all(
      revisionIds.map((revisionId) =>
        readGraphRevisionInspection(revisionId, activeRevisionRecord)
      )
    )
  )
    .filter((revision): revision is GraphRevisionInspectionResponse =>
      revision !== undefined
    )
    .map((revision) => revision.revision)
    .sort((left, right) => {
      const appliedAtOrdering = right.appliedAt.localeCompare(left.appliedAt);

      if (appliedAtOrdering !== 0) {
        return appliedAtOrdering;
      }

      return right.revisionId.localeCompare(left.revisionId);
    });

  return graphRevisionListResponseSchema.parse({
    revisions
  });
}

export async function getGraphRevision(
  revisionId: string
): Promise<GraphRevisionInspectionResponse | undefined> {
  await initializeHostState();
  return readGraphRevisionInspection(
    revisionId,
    await readActiveGraphRevisionRecord()
  );
}

async function listPackageSourceRecords(): Promise<PackageSourceRecord[]> {
  await initializeHostState();
  const entries = (await readdir(packageSourcesRoot)).filter((entry) =>
    entry.endsWith(".json")
  );
  const records: PackageSourceRecord[] = [];

  for (const entry of entries) {
    const parsedRecord = packageSourceRecordSchema.parse(
      await readJsonFile(path.join(packageSourcesRoot, entry))
    );
    records.push(await reconcileMaterializedPackageSourceRecord(parsedRecord));
  }

  records.sort((left, right) =>
    left.packageSourceId.localeCompare(right.packageSourceId)
  );

  return records;
}

async function listPackageSourceRecordMap(): Promise<
  Map<string, PackageSourceRecord>
> {
  const records = await listPackageSourceRecords();
  return new Map(records.map((record) => [record.packageSourceId, record]));
}

async function syncFileIfChanged(
  sourcePath: string,
  targetPath: string
): Promise<void> {
  const sourceContents = await readFile(sourcePath);

  if (await pathExists(targetPath)) {
    const targetContents = await readFile(targetPath);

    if (sourceContents.equals(targetContents)) {
      return;
    }
  }

  await ensureDirectory(path.dirname(targetPath));
  await writeFile(targetPath, sourceContents);
}

async function syncDirectoryContents(
  sourceDirectory: string,
  targetDirectory: string
): Promise<void> {
  await ensureDirectory(targetDirectory);

  const [sourceEntries, targetEntries] = await Promise.all([
    readdir(sourceDirectory, { withFileTypes: true }),
    readdir(targetDirectory, { withFileTypes: true })
  ]);
  const sourceEntryNames = new Set(sourceEntries.map((entry) => entry.name));

  await Promise.all(
    targetEntries
      .filter((entry) => !sourceEntryNames.has(entry.name))
      .map((entry) =>
        rm(path.join(targetDirectory, entry.name), {
          force: true,
          recursive: true
        })
      )
  );

  for (const entry of sourceEntries) {
    const sourcePath = path.join(sourceDirectory, entry.name);
    const targetPath = path.join(targetDirectory, entry.name);
    const sourceStats = await stat(sourcePath);

    if (sourceStats.isDirectory()) {
      if ((await pathExists(targetPath)) && !(await stat(targetPath)).isDirectory()) {
        await rm(targetPath, { force: true, recursive: true });
      }

      await syncDirectoryContents(sourcePath, targetPath);
      continue;
    }

    if (await pathExists(targetPath)) {
      const targetStats = await stat(targetPath);

      if (targetStats.isDirectory()) {
        await rm(targetPath, { force: true, recursive: true });
      }
    }

    await syncFileIfChanged(sourcePath, targetPath);
  }
}

async function syncWorkspacePackageLink(
  sourcePackageRoot: string,
  workspacePackageRoot: string
): Promise<void> {
  const expectedTarget = path.relative(
    path.dirname(workspacePackageRoot),
    sourcePackageRoot
  );

  if (await pathExists(workspacePackageRoot)) {
    const workspaceEntry = await lstat(workspacePackageRoot);

    if (workspaceEntry.isSymbolicLink()) {
      const currentTarget = await readlink(workspacePackageRoot);

      if (currentTarget === expectedTarget) {
        return;
      }
    }

    await rm(workspacePackageRoot, { force: true, recursive: true });
  }

  await ensureDirectory(path.dirname(workspacePackageRoot));
  await symlink(expectedTarget, workspacePackageRoot, "dir");
}

async function readPackageManifest(
  packageRoot: string
): Promise<AgentPackageManifest | undefined> {
  const manifestPath = path.join(packageRoot, "manifest.json");

  if (!(await pathExists(manifestPath))) {
    return undefined;
  }

  try {
    return agentPackageManifestSchema.parse(await readJsonFile(manifestPath));
  } catch {
    return undefined;
  }
}

async function copyFileIfMissing(
  sourcePath: string,
  targetPath: string
): Promise<void> {
  if (!(await pathExists(sourcePath)) || (await pathExists(targetPath))) {
    return;
  }

  await ensureDirectory(path.dirname(targetPath));
  await writeFile(targetPath, await readFile(sourcePath, "utf8"), "utf8");
}

async function initializeWorkspaceMemory(
  memoryRoot: string,
  packageRoot: string,
  manifest: AgentPackageManifest
): Promise<void> {
  const wikiSeedSource = path.join(packageRoot, manifest.memoryProfile.wikiSeedPath);
  const wikiTarget = path.join(memoryRoot, "wiki");
  const schemaSource = path.join(packageRoot, manifest.memoryProfile.schemaPath);
  const schemaTarget = path.join(memoryRoot, "schema", path.basename(schemaSource));

  if ((await pathExists(wikiSeedSource)) && !(await pathExists(wikiTarget))) {
    await ensureDirectory(path.dirname(wikiTarget));
    await cp(wikiSeedSource, wikiTarget, { recursive: true });
  }

  await copyFileIfMissing(schemaSource, schemaTarget);
}

function buildWorkspaceLayout(nodeId: string) {
  const root = path.join(workspacesRoot, nodeId);
  return {
    artifactWorkspaceRoot: path.join(root, "workspace"),
    engineStateRoot: path.join(root, "engine-state"),
    injectedRoot: path.join(root, "injected"),
    memoryRoot: path.join(root, "memory"),
    packageRoot: path.join(root, "package"),
    retrievalRoot: path.join(root, "retrieval"),
    root,
    runtimeRoot: path.join(root, "runtime"),
    sourceWorkspaceRoot: path.join(root, "source"),
    wikiRepositoryRoot: path.join(root, "wiki-repository")
  };
}

async function readRuntimeIntentRecord(
  nodeId: string
): Promise<RuntimeIntentRecord | undefined> {
  const filePath = path.join(runtimeIntentsRoot, `${nodeId}.json`);

  if (!(await pathExists(filePath))) {
    return undefined;
  }

  return runtimeIntentRecordSchema.parse(await readJsonFile(filePath));
}

async function readRuntimeRecoveryPolicyRecord(
  nodeId: string
): Promise<RuntimeRecoveryPolicyRecord | undefined> {
  const filePath = runtimeRecoveryPolicyRecordPath(nodeId);

  if (!(await pathExists(filePath))) {
    return undefined;
  }

  return runtimeRecoveryPolicyRecordSchema.parse(await readJsonFile(filePath));
}

async function ensureRuntimeRecoveryPolicyRecord(
  nodeId: string
): Promise<RuntimeRecoveryPolicyRecord> {
  const existingRecord = await readRuntimeRecoveryPolicyRecord(nodeId);

  if (existingRecord) {
    return existingRecord;
  }

  const defaultRecord = buildDefaultRuntimeRecoveryPolicy(nodeId);
  await writeJsonFile(runtimeRecoveryPolicyRecordPath(nodeId), defaultRecord);
  return defaultRecord;
}

async function readObservedRuntimeRecord(
  nodeId: string
): Promise<ObservedRuntimeRecord | undefined> {
  const filePath = path.join(observedRuntimesRoot, `${nodeId}.json`);

  if (!(await pathExists(filePath))) {
    return undefined;
  }

  return observedRuntimeRecordSchema.parse(await readJsonFile(filePath));
}

async function readRuntimeRecoveryControllerRecord(
  nodeId: string
): Promise<RuntimeRecoveryControllerRecord | undefined> {
  const filePath = runtimeRecoveryControllerRecordPath(nodeId);

  if (!(await pathExists(filePath))) {
    return undefined;
  }

  return runtimeRecoveryControllerRecordSchema.parse(await readJsonFile(filePath));
}

async function listRuntimeRecoveryRecords(input: {
  limit?: number;
  nodeId: string;
}): Promise<RuntimeRecoveryRecord[]> {
  const directoryPath = runtimeRecoveryHistoryNodeRoot(input.nodeId);

  if (!(await pathExists(directoryPath))) {
    return [];
  }

  const records = await Promise.all(
    (await readdir(directoryPath))
      .filter((entry) => entry.endsWith(".json"))
      .map(async (entry) =>
        runtimeRecoveryRecordSchema.parse(
          await readJsonFile(path.join(directoryPath, entry))
        )
      )
  );

  records.sort((left, right) => {
    const recordedAtOrdering = right.recordedAt.localeCompare(left.recordedAt);

    if (recordedAtOrdering !== 0) {
      return recordedAtOrdering;
    }

    return right.recoveryId.localeCompare(left.recoveryId);
  });

  return records.slice(0, input.limit ?? records.length);
}

async function readLatestRuntimeRecoveryRecord(
  nodeId: string
): Promise<RuntimeRecoveryRecord | undefined> {
  const [latestRecord] = await listRuntimeRecoveryRecords({
    limit: 1,
    nodeId
  });

  return latestRecord;
}

async function readObservedSessionActivityRecord(
  nodeId: string,
  sessionId: string
): Promise<ObservedSessionActivityRecord | undefined> {
  const filePath = path.join(
    observedSessionActivityRoot,
    `${nodeId}--${sessionId}.json`
  );

  if (!(await pathExists(filePath))) {
    return undefined;
  }

  return observedSessionActivityRecordSchema.parse(await readJsonFile(filePath));
}

async function readObservedRunnerTurnActivityRecord(
  nodeId: string,
  turnId: string
): Promise<ObservedRunnerTurnActivityRecord | undefined> {
  const filePath = path.join(observedRunnerTurnActivityRoot, `${nodeId}--${turnId}.json`);

  if (!(await pathExists(filePath))) {
    return undefined;
  }

  return observedRunnerTurnActivityRecordSchema.parse(await readJsonFile(filePath));
}

async function readObservedConversationActivityRecord(
  nodeId: string,
  conversationId: string
): Promise<ObservedConversationActivityRecord | undefined> {
  const filePath = path.join(
    observedConversationActivityRoot,
    `${nodeId}--${conversationId}.json`
  );

  if (!(await pathExists(filePath))) {
    return undefined;
  }

  return observedConversationActivityRecordSchema.parse(
    await readJsonFile(filePath)
  );
}

async function readObservedApprovalActivityRecord(
  nodeId: string,
  approvalId: string
): Promise<ObservedApprovalActivityRecord | undefined> {
  const filePath = path.join(
    observedApprovalActivityRoot,
    `${nodeId}--${approvalId}.json`
  );

  if (!(await pathExists(filePath))) {
    return undefined;
  }

  return observedApprovalActivityRecordSchema.parse(await readJsonFile(filePath));
}

async function readObservedArtifactActivityRecord(
  nodeId: string,
  artifactId: string
): Promise<ObservedArtifactActivityRecord | undefined> {
  const filePath = path.join(
    observedArtifactActivityRoot,
    `${nodeId}--${artifactId}.json`
  );

  if (!(await pathExists(filePath))) {
    return undefined;
  }

  return observedArtifactActivityRecordSchema.parse(await readJsonFile(filePath));
}

async function listObservedRuntimeNodeIds(): Promise<string[]> {
  if (!(await pathExists(observedRuntimesRoot))) {
    return [];
  }

  return (await readdir(observedRuntimesRoot))
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => entry.slice(0, -".json".length))
    .sort((left, right) => left.localeCompare(right));
}

async function readLatestReconciliationSnapshot(): Promise<
  ReconciliationSnapshot | undefined
> {
  if (!(await pathExists(latestReconciliationPath))) {
    return undefined;
  }

  return reconciliationSnapshotSchema.parse(
    await readJsonFile(latestReconciliationPath)
  );
}

function didRuntimeIntentChange(
  previous: RuntimeIntentRecord | undefined,
  next: RuntimeIntentRecord
): boolean {
  return (
    !previous ||
    previous.desiredState !== next.desiredState ||
    previous.reason !== next.reason ||
    previous.graphId !== next.graphId ||
    previous.graphRevisionId !== next.graphRevisionId
  );
}

function createRuntimeIntentRecord(input: {
  desiredState: RuntimeDesiredState;
  existingIntent: RuntimeIntentRecord | undefined;
  graphId: string;
  graphRevisionId: string;
  nodeId: string;
  reason: string | undefined;
  restartGeneration: number;
}): RuntimeIntentRecord {
  const isEquivalentToExisting =
    input.existingIntent &&
    input.existingIntent.desiredState === input.desiredState &&
    input.existingIntent.reason === input.reason &&
    input.existingIntent.graphId === input.graphId &&
    input.existingIntent.graphRevisionId === input.graphRevisionId &&
    input.existingIntent.restartGeneration === input.restartGeneration;
  const preservedUpdatedAt = input.existingIntent?.updatedAt;

  return runtimeIntentRecordSchema.parse({
    desiredState: input.desiredState,
    graphId: input.graphId,
    graphRevisionId: input.graphRevisionId,
    nodeId: input.nodeId,
    reason: input.reason,
    restartGeneration: input.restartGeneration,
    schemaVersion: "1",
    updatedAt: isEquivalentToExisting && preservedUpdatedAt ? preservedUpdatedAt : nowIsoString()
  });
}

function didObservedRuntimeChange(
  previous: ObservedRuntimeRecord | undefined,
  next: ObservedRuntimeRecord
): boolean {
  return (
    !previous ||
    previous.observedState !== next.observedState ||
    previous.statusMessage !== next.statusMessage ||
    previous.runtimeHandle !== next.runtimeHandle ||
    previous.graphId !== next.graphId ||
    previous.graphRevisionId !== next.graphRevisionId
  );
}

function normalizeFingerprintValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeFingerprintValue(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([entryKey, entryValue]) => [
          entryKey,
          normalizeFingerprintValue(entryValue)
        ])
    );
  }

  return value;
}

function buildObservationFingerprint(value: unknown): string {
  return createHash("sha1")
    .update(JSON.stringify(normalizeFingerprintValue(value)))
    .digest("hex");
}

function runtimeRecoveryHistoryNodeRoot(nodeId: string): string {
  return path.join(runtimeRecoveryHistoryRoot, nodeId);
}

function runtimeRecoveryPolicyRecordPath(nodeId: string): string {
  return path.join(runtimeRecoveryPoliciesRoot, `${nodeId}.json`);
}

function runtimeRecoveryControllerRecordPath(nodeId: string): string {
  return path.join(runtimeRecoveryControllersRoot, `${nodeId}.json`);
}

function buildDefaultRuntimeRecoveryPolicy(nodeId: string): RuntimeRecoveryPolicyRecord {
  return runtimeRecoveryPolicyRecordSchema.parse({
    nodeId,
    policy: {
      mode: "manual"
    },
    schemaVersion: "1",
    updatedAt: nowIsoString()
  });
}

function buildIdleRuntimeRecoveryController(input: {
  graphId?: string;
  graphRevisionId?: string;
  nodeId: string;
}): RuntimeRecoveryControllerRecord {
  return runtimeRecoveryControllerRecordSchema.parse({
    attemptsUsed: 0,
    ...(input.graphId ? { graphId: input.graphId } : {}),
    ...(input.graphRevisionId ? { graphRevisionId: input.graphRevisionId } : {}),
    nodeId: input.nodeId,
    schemaVersion: "1",
    state: "idle",
    updatedAt: nowIsoString()
  });
}

function addSecondsToIsoString(isoString: string, seconds: number): string {
  return new Date(Date.parse(isoString) + seconds * 1000).toISOString();
}

function buildRuntimeRecoveryRecordId(input: {
  fingerprint: string;
  nodeId: string;
  recordedAt: string;
}): string {
  return sanitizeIdentifier(
    `${input.nodeId}-${input.recordedAt}-${input.fingerprint.slice(0, 12)}`
  );
}

function buildRuntimeRecoveryFailureFingerprint(input: {
  inspection: RuntimeInspectionResponse;
  lastError: string | undefined;
}): string {
  return buildObservationFingerprint({
    ...(input.lastError ? { lastError: input.lastError } : {}),
    runtime: {
      backendKind: input.inspection.backendKind,
      contextAvailable: input.inspection.contextAvailable,
      desiredState: input.inspection.desiredState,
      graphId: input.inspection.graphId,
      graphRevisionId: input.inspection.graphRevisionId,
      nodeId: input.inspection.nodeId,
      observedState: input.inspection.observedState,
      reason: input.inspection.reason,
      statusMessage: input.inspection.statusMessage
    }
  });
}

function buildRuntimeRecoveryComparable(input: {
  inspection: RuntimeInspectionResponse;
  lastError: string | undefined;
}) {
  const provisioning = input.inspection.primaryGitRepositoryProvisioning;

  return {
    ...(input.lastError ? { lastError: input.lastError } : {}),
    runtime: {
      ...input.inspection,
      primaryGitRepositoryProvisioning: provisioning
        ? {
            ...(provisioning.created === undefined
              ? {}
              : { created: provisioning.created }),
            ...(provisioning.lastError === undefined
              ? {}
              : { lastError: provisioning.lastError }),
            state: provisioning.state,
            target: provisioning.target
          }
        : undefined
    }
  };
}

function didReconciliationSnapshotChange(
  previous: ReconciliationSnapshot | undefined,
  next: ReconciliationSnapshot
): boolean {
  return (
    !previous ||
    previous.graphId !== next.graphId ||
    previous.graphRevisionId !== next.graphRevisionId ||
    previous.managedRuntimeCount !== next.managedRuntimeCount ||
    previous.runningRuntimeCount !== next.runningRuntimeCount ||
    previous.stoppedRuntimeCount !== next.stoppedRuntimeCount ||
    previous.transitioningRuntimeCount !== next.transitioningRuntimeCount ||
    previous.degradedRuntimeCount !== next.degradedRuntimeCount ||
    previous.blockedRuntimeCount !== next.blockedRuntimeCount ||
    previous.failedRuntimeCount !== next.failedRuntimeCount ||
    previous.issueCount !== next.issueCount ||
    JSON.stringify(previous.findingCodes) !== JSON.stringify(next.findingCodes) ||
    JSON.stringify(previous.nodes) !== JSON.stringify(next.nodes)
  );
}

function buildRuntimeInspectionFromState(input: {
  agentRuntime: RuntimeAgentRuntimeInspection | undefined;
  backendKind: ReturnType<typeof observedRuntimeRecordSchema.parse>["backendKind"];
  context: EffectiveRuntimeContext | undefined;
  desiredState: RuntimeDesiredState;
  graphId: string;
  graphRevisionId: string;
  nodeId: string;
  observedState: RuntimeObservedState;
  packageSourceId: string | undefined;
  primaryGitRepositoryProvisioning: GitRepositoryProvisioningRecord | undefined;
  reason: string | undefined;
  restartGeneration: number;
  runtimeHandle: string | undefined;
  statusMessage: string | undefined;
}): RuntimeInspectionResponse {
  return runtimeInspectionResponseSchema.parse({
    agentRuntime: input.agentRuntime,
    backendKind: input.backendKind,
    contextAvailable: Boolean(input.context),
    contextPath: input.context ? path.join(input.context.workspace.injectedRoot, runtimeContextFileName) : undefined,
    desiredState: input.desiredState,
    graphId: input.graphId,
    graphRevisionId: input.graphRevisionId,
    nodeId: input.nodeId,
    observedState: input.observedState,
    packageSourceId: input.packageSourceId,
    primaryGitRepositoryProvisioning: input.primaryGitRepositoryProvisioning,
    reason: input.reason,
    restartGeneration: input.restartGeneration,
    runtimeHandle: input.runtimeHandle,
    statusMessage: input.statusMessage
  });
}

async function buildRuntimeAgentRuntimeInspection(
  context: EffectiveRuntimeContext
): Promise<RuntimeAgentRuntimeInspection> {
  const turns = await listRuntimeTurnRecords(context.workspace.runtimeRoot);
  const latestEngineTurn = turns
    .filter((turn) => Boolean(turn.engineOutcome))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
  const outcome = latestEngineTurn?.engineOutcome;
  const defaultAgent =
    context.agentRuntimeContext.defaultAgent ??
    context.agentRuntimeContext.engineProfile.defaultAgent;

  return runtimeAgentRuntimeInspectionSchema.parse({
    ...(defaultAgent ? { defaultAgent } : {}),
    engineKind: context.agentRuntimeContext.engineProfile.kind,
    engineProfileDisplayName:
      context.agentRuntimeContext.engineProfile.displayName,
    engineProfileRef: context.agentRuntimeContext.engineProfileRef,
    ...(outcome?.failure?.classification
      ? { lastEngineFailureClassification: outcome.failure.classification }
      : {}),
    ...(outcome?.failure?.message
      ? { lastEngineFailureMessage: outcome.failure.message }
      : {}),
    ...(outcome?.engineSessionId
      ? { lastEngineSessionId: outcome.engineSessionId }
      : {}),
    ...(outcome?.stopReason
      ? { lastEngineStopReason: outcome.stopReason }
      : {}),
    ...(latestEngineTurn
      ? {
          lastTurnId: latestEngineTurn.turnId,
          lastTurnUpdatedAt: latestEngineTurn.updatedAt
        }
      : {}),
    mode: context.agentRuntimeContext.mode,
    stateScope: context.agentRuntimeContext.engineProfile.stateScope
  });
}

async function reconcileObservedRuntimeState(input: {
  context: EffectiveRuntimeContext | undefined;
  desiredState: RuntimeDesiredState;
  existingObservedRecord: ObservedRuntimeRecord | undefined;
  graphId: string;
  graphRevisionId: string;
  nodeId: string;
  packageSourceId: string | undefined;
  primaryGitRepositoryProvisioning: GitRepositoryProvisioningRecord | undefined;
  reason: string | undefined;
  restartGeneration: number;
  runtimeIdentitySecret: string | undefined;
}): Promise<{
  inspection: RuntimeInspectionResponse;
  observedRecord: ObservedRuntimeRecord;
}> {
  const runtimeBackend = getRuntimeBackend();
  const contextPath = input.context
    ? path.join(input.context.workspace.injectedRoot, runtimeContextFileName)
    : undefined;
  let observedRuntime: Awaited<ReturnType<RuntimeBackend["reconcileRuntime"]>>;

  try {
    observedRuntime = await runtimeBackend.reconcileRuntime({
      context: input.context,
      contextPath,
      desiredState: input.desiredState,
      graphId: input.graphId,
      graphRevisionId: input.graphRevisionId,
      nodeId: input.nodeId,
      reason: input.reason,
      restartGeneration: input.restartGeneration,
      ...(input.context && input.runtimeIdentitySecret
        ? {
            secretEnvironment: {
              ENTANGLE_NOSTR_SECRET_KEY: input.runtimeIdentitySecret
            }
          }
        : {})
    });
  } catch (error: unknown) {
    observedRuntime = {
      backendKind: runtimeBackend.kind,
      lastError: formatUnknownError(error),
      observedState: "failed",
      runtimeHandle: undefined,
      statusMessage: `Runtime reconciliation failed: ${formatUnknownError(error)}`
    };
  }
  const observedRecord = observedRuntimeRecordSchema.parse({
    backendKind: observedRuntime.backendKind,
    graphId: input.graphId,
    graphRevisionId: input.graphRevisionId,
    lastError: observedRuntime.lastError,
    lastSeenAt: nowIsoString(),
    nodeId: input.nodeId,
    observedState: observedRuntime.observedState,
    runtimeContextPath: contextPath,
    runtimeHandle: observedRuntime.runtimeHandle,
    schemaVersion: "1",
    statusMessage: observedRuntime.statusMessage
  });
  await writeJsonFileIfChanged(
    path.join(observedRuntimesRoot, `${input.nodeId}.json`),
    observedRecord
  );

  if (didObservedRuntimeChange(input.existingObservedRecord, observedRecord)) {
    await appendHostEvent({
      backendKind: observedRecord.backendKind,
      category: "runtime",
      desiredState: input.desiredState,
      graphId: input.graphId,
      graphRevisionId: input.graphRevisionId,
      message: `Runtime '${input.nodeId}' observed state is now '${observedRecord.observedState}'.`,
      nodeId: input.nodeId,
      observedState: observedRecord.observedState,
      previousObservedState: input.existingObservedRecord?.observedState,
      runtimeHandle: observedRecord.runtimeHandle,
      statusMessage: observedRecord.statusMessage,
      type: "runtime.observed_state.changed"
    } satisfies RuntimeObservedStateChangedEventInput);
  }

  const agentRuntime = input.context
    ? await buildRuntimeAgentRuntimeInspection(input.context)
    : undefined;

  return {
    inspection: buildRuntimeInspectionFromState({
      agentRuntime,
      backendKind: observedRecord.backendKind,
      context: input.context,
      desiredState: input.desiredState,
      graphId: input.graphId,
      graphRevisionId: input.graphRevisionId,
      nodeId: input.nodeId,
      observedState: observedRecord.observedState,
      packageSourceId: input.packageSourceId,
      primaryGitRepositoryProvisioning: input.primaryGitRepositoryProvisioning,
      reason: input.reason,
      restartGeneration: input.restartGeneration,
      runtimeHandle: observedRecord.runtimeHandle,
      statusMessage: observedRecord.statusMessage
    }),
    observedRecord
  };
}

function buildReconciliationSnapshot(input: {
  backendKind: ReconciliationSnapshot["backendKind"];
  graphId: string | undefined;
  graphRevisionId: string | undefined;
  lastReconciledAt: string;
  runtimes: RuntimeInspectionResponse[];
}): ReconciliationSnapshot {
  const findingCodes = new Set<
    ReconciliationSnapshot["findingCodes"][number]
  >();
  const nodes = input.runtimes.map((runtime) => {
    for (const findingCode of runtime.reconciliation.findingCodes) {
      findingCodes.add(findingCode);
    }

    return {
      desiredState: runtime.desiredState,
      nodeId: runtime.nodeId,
      observedState: runtime.observedState,
      reconciliation: runtime.reconciliation,
      statusMessage: runtime.statusMessage
    };
  });

  return reconciliationSnapshotSchema.parse({
    backendKind: input.backendKind,
    blockedRuntimeCount: input.runtimes.filter((runtime) =>
      runtime.reconciliation.findingCodes.includes("context_unavailable")
    ).length,
    degradedRuntimeCount: input.runtimes.filter(
      (runtime) => runtime.reconciliation.state === "degraded"
    ).length,
    failedRuntimeCount: input.runtimes.filter(
      (runtime) => runtime.observedState === "failed"
    ).length,
    findingCodes: Array.from(findingCodes).sort(),
    graphId: input.graphId,
    graphRevisionId: input.graphRevisionId,
    issueCount: input.runtimes.reduce(
      (total, runtime) => total + runtime.reconciliation.findingCodes.length,
      0
    ),
    lastReconciledAt: input.lastReconciledAt,
    managedRuntimeCount: input.runtimes.length,
    nodes,
    runningRuntimeCount: input.runtimes.filter(
      (runtime) => runtime.observedState === "running"
    ).length,
    schemaVersion: "1",
    stoppedRuntimeCount: input.runtimes.filter(
      (runtime) =>
        runtime.observedState === "stopped" ||
        runtime.observedState === "missing"
    ).length,
    transitioningRuntimeCount: input.runtimes.filter(
      (runtime) => runtime.reconciliation.state === "transitioning"
    ).length
  });
}

function externalPrincipalRecordPath(principalId: string): string {
  return path.join(externalPrincipalsRoot, `${principalId}.json`);
}

export async function initializeHostState(): Promise<void> {
  await Promise.all([
    ensureDirectory(runtimeIdentitiesRoot),
    ensureDirectory(secretRefsRoot),
    ensureDirectory(externalPrincipalsRoot),
    ensureDirectory(nodeBindingsRoot),
    ensureDirectory(runtimeIntentsRoot),
    ensureDirectory(runtimeRecoveryPoliciesRoot),
    ensureDirectory(packageSourcesRoot),
    ensureDirectory(graphRevisionsRoot),
    ensureDirectory(observedRuntimesRoot),
    ensureDirectory(runtimeRecoveryHistoryRoot),
    ensureDirectory(runtimeRecoveryControllersRoot),
    ensureDirectory(gitRepositoryTargetsRoot),
    ensureDirectory(observedRunnerTurnActivityRoot),
    ensureDirectory(observedSessionActivityRoot),
    ensureDirectory(reconciliationHistoryRoot),
    ensureDirectory(path.join(observedRoot, "health")),
    ensureDirectory(controlPlaneTraceRoot),
    ensureDirectory(path.join(tracesRoot, "sessions")),
    ensureDirectory(path.join(importsRoot, "packages")),
    ensureDirectory(packageStoreRoot),
    ensureDirectory(workspacesRoot),
    ensureDirectory(path.join(cacheRoot, "validator")),
    ensureDirectory(path.join(cacheRoot, "projections")),
    ensureDirectory(path.join(cacheRoot, "temp"))
  ]);

  if (!(await pathExists(catalogPath))) {
    const defaultCatalog = buildDefaultCatalog();

    await writeJsonFile(catalogPath, defaultCatalog);
    await appendHostEvent({
      catalogId: defaultCatalog.catalogId,
      category: "control_plane",
      message: "Bootstrapped default deployment resource catalog.",
      type: "catalog.updated",
      updateKind: "bootstrap"
    } satisfies CatalogUpdatedEventInput);
  }
}

export async function getCatalogInspection(): Promise<CatalogInspectionResponse> {
  await initializeHostState();
  const catalog = deploymentResourceCatalogSchema.parse(
    await readJsonFile(catalogPath)
  );
  const validation = validateDeploymentResourceCatalogDocument(catalog);

  return {
    catalog,
    validation
  };
}

export function validateCatalogCandidate(input: unknown): CatalogInspectionResponse {
  const parseResult = deploymentResourceCatalogSchema.safeParse(input);

  if (!parseResult.success) {
    return {
      catalog: undefined,
      validation: buildValidationReport(
        parseResult.error.issues.map((issue) => ({
          code: "resource_catalog_invalid",
          severity: "error",
          message: issue.message,
          path: issue.path.map(String)
        }))
      )
    };
  }

  return {
    catalog: parseResult.data,
    validation: validateDeploymentResourceCatalogDocument(parseResult.data)
  };
}

export async function applyCatalog(
  input: unknown
): Promise<CatalogInspectionResponse> {
  const inspection = validateCatalogCandidate(input);

  if (!inspection.validation.ok || !inspection.catalog) {
    return inspection;
  }

  await writeJsonFile(catalogPath, inspection.catalog);
  await synchronizeCurrentGraphRuntimeState();
  await appendHostEvent({
    catalogId: inspection.catalog.catalogId,
    category: "control_plane",
    message: `Applied catalog '${inspection.catalog.catalogId}'.`,
    type: "catalog.updated",
    updateKind: "apply"
  } satisfies CatalogUpdatedEventInput);

  return inspection;
}

export async function listPackageSources(): Promise<PackageSourceListResponse> {
  await initializeHostState();
  const records = await listPackageSourceRecords();
  const packageSources: PackageSourceInspectionResponse[] = [];

  for (const record of records) {
    packageSources.push({
      packageSource: record,
      manifest: await resolveManifestForPackageSource(record),
      validation: await validatePersistedPackageSource(record)
    });
  }

  packageSources.sort((left, right) =>
    left.packageSource.packageSourceId.localeCompare(
      right.packageSource.packageSourceId
    )
  );

  return { packageSources };
}

export async function getPackageSourceInspection(
  packageSourceId: string
): Promise<PackageSourceInspectionResponse | null> {
  await initializeHostState();
  const packageSourcePath = packageSourceRecordPath(packageSourceId);

  if (!(await pathExists(packageSourcePath))) {
    return null;
  }

  const record = await reconcileMaterializedPackageSourceRecord(
    packageSourceRecordSchema.parse(await readJsonFile(packageSourcePath))
  );

  return {
    packageSource: record,
    manifest: await resolveManifestForPackageSource(record),
    validation: await validatePersistedPackageSource(record)
  };
}

export async function admitPackageSource(
  request: PackageSourceAdmissionRequest
): Promise<PackageSourceInspectionResponse> {
  await initializeHostState();

  if (request.sourceKind === "local_archive") {
    const existing = await listPackageSources();
    const fallbackPackageSourceId = buildPackageSourceId(
      request.packageSourceId,
      stripSupportedPackageArchiveExtension(request.archivePath),
      existing.packageSources.map(
        (entry: PackageSourceInspectionResponse) =>
          entry.packageSource.packageSourceId
      )
    );
    const extractionRoot = path.join(
      cacheRoot,
      "temp",
      sanitizeIdentifier(`package-archive-${randomUUID()}`)
    );
    let packageSourceId = fallbackPackageSourceId;
    let manifest: AgentPackageManifest | undefined;

    try {
      await ensureDirectory(extractionRoot);
      await extractPackageTarArchive({
        archivePath: request.archivePath,
        extractionRoot
      });

      const extractedPackageRoot = await resolveExtractedPackageRoot(extractionRoot);
      manifest = await readPackageManifestFromRoot(extractedPackageRoot);
      packageSourceId = buildPackageSourceId(
        request.packageSourceId,
        manifest?.packageId ?? stripSupportedPackageArchiveExtension(request.archivePath),
        existing.packageSources.map(
          (entry: PackageSourceInspectionResponse) =>
            entry.packageSource.packageSourceId
        )
      );

      const validation = await validatePackageDirectory(extractedPackageRoot);
      const importedPackageRoot = path.join(
        importsRoot,
        "packages",
        packageSourceId,
        "package"
      );
      const recordBase = {
        sourceKind: request.sourceKind,
        packageSourceId,
        archivePath: request.archivePath,
        admittedAt: nowIsoString()
      } as const;

      if (!validation.ok) {
        return {
          packageSource: packageSourceRecordSchema.parse(recordBase),
          manifest,
          validation
        };
      }

      await rm(packageSourceImportRoot(packageSourceId), {
        force: true,
        recursive: true
      });
      await syncDirectoryContents(extractedPackageRoot, importedPackageRoot);

      const record = packageSourceRecordSchema.parse({
        ...recordBase,
        materialization: await materializePackageStore(
          packageSourceId,
          importedPackageRoot
        )
      });

      await writeJsonFile(
        packageSourceRecordPath(packageSourceId),
        record
      );
      await appendHostEvent({
        category: "control_plane",
        message: `Admitted package source '${packageSourceId}'.`,
        packageSourceId,
        type: "package_source.admitted"
      } satisfies PackageSourceAdmittedEventInput);

      return {
        packageSource: record,
        manifest,
        validation
      };
    } catch (error) {
      return {
        packageSource: packageSourceRecordSchema.parse({
          sourceKind: request.sourceKind,
          packageSourceId,
          archivePath: request.archivePath,
          admittedAt: nowIsoString()
        }),
        manifest,
        validation: buildValidationReport([
          {
            code: "archive_package_extract_failed",
            severity: "error",
            message:
              error instanceof Error
                ? `Could not extract package archive: ${error.message}`
                : "Could not extract package archive.",
            path: ["archivePath"]
          }
        ])
      };
    } finally {
      await rm(extractionRoot, {
        force: true,
        recursive: true
      });
    }
  }

  if (request.sourceKind === "local_path") {
    const validation = await validatePackageDirectory(request.absolutePath);
    const manifest = await resolveManifestForPackageSource({
      sourceKind: "local_path",
      packageSourceId: sanitizeIdentifier(request.packageSourceId ?? "candidate"),
      absolutePath: request.absolutePath
    });
    const existing = await listPackageSources();
    const packageSourceId = buildPackageSourceId(
      request.packageSourceId,
      manifest?.packageId ?? path.basename(request.absolutePath),
      existing.packageSources.map(
        (entry: PackageSourceInspectionResponse) =>
          entry.packageSource.packageSourceId
      )
    );

    const record = packageSourceRecordSchema.parse({
      sourceKind: "local_path",
      packageSourceId,
      absolutePath: request.absolutePath,
      materialization: validation.ok
        ? await materializePackageStore(packageSourceId, request.absolutePath)
        : undefined,
      admittedAt: nowIsoString()
    });

    if (validation.ok) {
      await writeJsonFile(packageSourceRecordPath(packageSourceId), record);
      await appendHostEvent({
        category: "control_plane",
        message: `Admitted package source '${packageSourceId}'.`,
        packageSourceId,
        type: "package_source.admitted"
      } satisfies PackageSourceAdmittedEventInput);
    }

    return {
      packageSource: record,
      manifest,
      validation
    };
  }

  throw new Error("Unsupported package source admission request.");
}

export async function deletePackageSource(
  packageSourceId: string
): Promise<PackageSourceDeletionResult> {
  await initializeHostState();

  const recordPath = packageSourceRecordPath(packageSourceId);

  if (!(await pathExists(recordPath))) {
    return {
      conflict: {
        kind: "package_source_not_found",
        packageSourceId
      },
      ok: false
    };
  }

  const { graph } = await readActiveGraphState();
  const referencingNodeIds =
    graph?.nodes
      .filter((node) => node.packageSourceRef === packageSourceId)
      .map((node) => node.nodeId)
      .sort() ?? [];

  if (referencingNodeIds.length > 0) {
    return {
      conflict: {
        kind: "package_source_in_use",
        nodeIds: referencingNodeIds,
        packageSourceId
      },
      ok: false
    };
  }

  const record = packageSourceRecordSchema.parse(await readJsonFile(recordPath));

  await rm(recordPath, { force: true });

  if (record.sourceKind === "local_archive") {
    await rm(packageSourceImportRoot(packageSourceId), {
      force: true,
      recursive: true
    });
  }

  await appendHostEvent({
    category: "control_plane",
    message: `Deleted package source '${packageSourceId}'.`,
    packageSourceId,
    type: "package_source.deleted"
  } satisfies PackageSourceDeletedEventInput);

  return {
    ok: true,
    response: {
      deletedPackageSourceId: packageSourceId
    }
  };
}

async function readExternalPrincipalRecords(): Promise<ExternalPrincipalRecord[]> {
  if (!(await pathExists(externalPrincipalsRoot))) {
    return [];
  }

  const fileNames = (await readdir(externalPrincipalsRoot))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();

  return Promise.all(
    fileNames.map(async (fileName) =>
      externalPrincipalRecordSchema.parse(
        await readJsonFile(path.join(externalPrincipalsRoot, fileName))
      )
    )
  );
}

async function currentExternalPrincipals(): Promise<ExternalPrincipalRecord[]> {
  return readExternalPrincipalRecords();
}

export async function listExternalPrincipals(): Promise<ExternalPrincipalListResponse> {
  await initializeHostState();

  const principals = (await readExternalPrincipalRecords()).map((principal) =>
    externalPrincipalInspectionResponseSchema.parse({
      principal,
      validation: buildValidationReport([])
    })
  );

  return externalPrincipalListResponseSchema.parse({
    principals
  });
}

export async function getExternalPrincipalInspection(
  principalId: string
): Promise<ExternalPrincipalInspectionResponse | null> {
  await initializeHostState();
  const recordPath = externalPrincipalRecordPath(principalId);

  if (!(await pathExists(recordPath))) {
    return null;
  }

  return externalPrincipalInspectionResponseSchema.parse({
    principal: externalPrincipalRecordSchema.parse(await readJsonFile(recordPath)),
    validation: buildValidationReport([])
  });
}

export async function upsertExternalPrincipal(
  principal: ExternalPrincipalRecord
): Promise<ExternalPrincipalInspectionResponse> {
  await initializeHostState();

  const canonicalPrincipal = externalPrincipalRecordSchema.parse(principal);

  await writeJsonFile(
    externalPrincipalRecordPath(canonicalPrincipal.principalId),
    canonicalPrincipal
  );
  await appendHostEvent({
    category: "control_plane",
    message: `Upserted external principal '${canonicalPrincipal.principalId}'.`,
    principalId: canonicalPrincipal.principalId,
    type: "external_principal.updated"
  } satisfies ExternalPrincipalUpdatedEventInput);

  return externalPrincipalInspectionResponseSchema.parse({
    principal: canonicalPrincipal,
    validation: buildValidationReport([])
  });
}

export async function deleteExternalPrincipal(
  principalId: string
): Promise<ExternalPrincipalDeletionResult> {
  await initializeHostState();

  const recordPath = externalPrincipalRecordPath(principalId);

  if (!(await pathExists(recordPath))) {
    return {
      conflict: {
        kind: "external_principal_not_found",
        principalId
      },
      ok: false
    };
  }

  const { graph } = await readActiveGraphState();
  const referencingNodeIds =
    graph?.nodes
      .filter((node) =>
        resolveEffectiveExternalPrincipalRefs(node, graph).includes(principalId)
      )
      .map((node) => node.nodeId)
      .sort() ?? [];

  if (referencingNodeIds.length > 0) {
    return {
      conflict: {
        kind: "external_principal_in_use",
        nodeIds: referencingNodeIds,
        principalId
      },
      ok: false
    };
  }

  await rm(recordPath, { force: true });
  await appendHostEvent({
    category: "control_plane",
    message: `Deleted external principal '${principalId}'.`,
    principalId,
    type: "external_principal.deleted"
  } satisfies ExternalPrincipalDeletedEventInput);

  return {
    ok: true,
    response: externalPrincipalDeletionResponseSchema.parse({
      deletedPrincipalId: principalId
    })
  };
}

export async function getGraphInspection(): Promise<GraphInspectionResponse> {
  await initializeHostState();

  if (!(await pathExists(currentGraphPath))) {
    return {
      graph: undefined,
      activeRevisionId: undefined
    };
  }

  const graph = graphSpecSchema.parse(await readJsonFile(currentGraphPath));
  const revisionRecord = await readActiveGraphRevisionRecord();

  return {
    graph,
    activeRevisionId: revisionRecord?.activeRevisionId
  };
}

async function currentPackageSourceIds(): Promise<string[]> {
  const records = await listPackageSourceRecords();
  return records.map((record) => record.packageSourceId);
}

export async function validateGraphCandidate(
  input: unknown
): Promise<GraphMutationResponse> {
  const parseResult = graphSpecSchema.safeParse(input);

  if (!parseResult.success) {
    return {
      graph: undefined,
      activeRevisionId: undefined,
      validation: buildValidationReport(
        parseResult.error.issues.map((issue) => ({
          code: "graph_invalid",
          severity: "error",
          message: issue.message,
          path: issue.path.map(String)
        }))
      )
    };
  }

  const catalogInspection = await getCatalogInspection();
  const validationOptions = {
    externalPrincipals: await currentExternalPrincipals(),
    packageSourceIds: await currentPackageSourceIds(),
    ...(catalogInspection.catalog ? { catalog: catalogInspection.catalog } : {})
  };
  const validation = validateGraphDocument(parseResult.data, validationOptions);

  return {
    graph: parseResult.data,
    activeRevisionId: undefined,
    validation
  };
}

function buildRuntimeIntentReasonForUnavailableContext(input: {
  hasAgentEngineProfile: boolean;
  gitRepositoryProvisioning: GitRepositoryProvisioningRecord | undefined;
  node: NodeBinding;
  packageManifest: AgentPackageManifest | undefined;
  packageSource: PackageSourceRecord | undefined;
  packageSourcePathExists: boolean;
}): string {
  if (!input.node.packageSourceRef) {
    return `Node '${input.node.nodeId}' cannot start because it has no package source binding.`;
  }

  if (!input.packageSource) {
    return `Node '${input.node.nodeId}' cannot start because package source '${input.node.packageSourceRef}' is not admitted.`;
  }

  if (!input.packageSourcePathExists) {
    return `Node '${input.node.nodeId}' cannot start because package source '${input.packageSource.packageSourceId}' is unavailable on disk.`;
  }

  if (!input.packageManifest) {
    return `Node '${input.node.nodeId}' cannot start because its package manifest could not be resolved.`;
  }

  if (!input.hasAgentEngineProfile) {
    return `Node '${input.node.nodeId}' cannot start because it has no effective agent engine profile.`;
  }

  if (input.gitRepositoryProvisioning?.state === "failed") {
    return (
      `Node '${input.node.nodeId}' cannot start because primary git repository target ` +
      `'${input.gitRepositoryProvisioning.target.namespace}/${input.gitRepositoryProvisioning.target.repositoryName}' ` +
      `could not be provisioned. ${input.gitRepositoryProvisioning.lastError ?? "Unknown provisioning error."}`
    );
  }

  return `Node '${input.node.nodeId}' has no realizable runtime context.`;
}

async function buildRuntimeResolution(input: {
  activeRevisionId: string;
  catalog: DeploymentResourceCatalog;
  graph: GraphSpec;
  node: NodeBinding;
  packageSources: Map<string, PackageSourceRecord>;
  repositoryProvisioningCache: Map<string, GitRepositoryProvisioningRecord>;
}): Promise<RuntimeResolution> {
  const {
    activeRevisionId,
    catalog,
    graph,
    node,
    packageSources,
    repositoryProvisioningCache
  } = input;
  const workspace = buildWorkspaceLayout(node.nodeId);
  const packageSource = node.packageSourceRef
    ? packageSources.get(node.packageSourceRef)
    : undefined;
  const resolvedRelayProfiles = resolveEffectiveRelayProfiles(node, graph, catalog);
  const resolvedRelayProfileRefs = resolveEffectiveRelayProfileRefs(
    node,
    graph,
    catalog
  );
  const resolvedPrimaryRelayProfileRef = resolveEffectivePrimaryRelayProfileRef(
    node,
    graph,
    catalog
  );
  const resolvedGitServices = resolveEffectiveGitServices(node, graph, catalog);
  const resolvedPrimaryGitServiceRef = resolveEffectivePrimaryGitServiceRef(
    node,
    graph,
    catalog
  );
  const resolvedModelEndpointProfile = resolveEffectiveModelEndpointProfile(
    node,
    graph,
    catalog
  );
  const resolvedModelEndpointProfileRef = resolveEffectiveModelEndpointProfileRef(
    node,
    graph,
    catalog
  );
  const resolvedAgentRuntime = resolveEffectiveAgentRuntime(
    node,
    graph,
    catalog
  );
  const resolvedAgentEngineProfile = resolveEffectiveAgentEngineProfile(
    node,
    graph,
    catalog
  );
  const resolvedModelAuthBinding = resolvedModelEndpointProfile
    ? await resolveSecretBinding(resolvedModelEndpointProfile.secretRef)
    : undefined;
  const sourcePackageRoot = packageSource
    ? packageSourcePackageRoot(packageSource)
    : undefined;
  const runtimeIdentity = await ensureRuntimeIdentity({
    graphId: graph.graphId,
    nodeId: node.nodeId
  });
  const runtimeContextPath = path.join(
    workspace.injectedRoot,
    runtimeContextFileName
  );
  const runtimeIdentitySecret = (await readFile(
    runtimeIdentity.secretStoragePath,
    "utf8"
  )).trim();
  const resolvedExternalPrincipals = resolveEffectiveExternalPrincipals(
    node,
    graph,
    await currentExternalPrincipals()
  );
  const resolvedGitPrincipals = resolvedExternalPrincipals.filter(
    (principal) => principal.systemKind === "git"
  );
  const resolvedGitPrincipalBindings = await resolveGitPrincipalRuntimeBindings(
    resolvedGitPrincipals
  );
  const resolvedPrimaryGitPrincipalRef = resolveEffectivePrimaryGitPrincipalRef(
    resolvedGitPrincipals,
    resolvedPrimaryGitServiceRef
  );
  const resolvedDefaultNamespace = resolveEffectiveGitDefaultNamespace(
    resolvedGitServices,
    resolvedGitPrincipals,
    resolvedPrimaryGitServiceRef
  );
  const resolvedPrimaryGitRepositoryTarget = resolvePrimaryGitRepositoryTarget({
    defaultNamespace: resolvedDefaultNamespace,
    gitServices: resolvedGitServices,
    graphId: graph.graphId,
    primaryGitServiceRef: resolvedPrimaryGitServiceRef
  });
  const packageSourcePathExists = sourcePackageRoot
    ? await pathExists(sourcePackageRoot)
    : false;
  const packageManifest =
    sourcePackageRoot && packageSourcePathExists
      ? await readPackageManifest(sourcePackageRoot)
      : undefined;
  const canAttemptContext =
    Boolean(sourcePackageRoot) &&
    packageSourcePathExists &&
    Boolean(packageManifest) &&
    Boolean(resolvedAgentEngineProfile);
  const gitRepositoryProvisioningRecordId = resolvedPrimaryGitRepositoryTarget
    ? buildGitRepositoryTargetRecordId(resolvedPrimaryGitRepositoryTarget)
    : undefined;
  let gitRepositoryProvisioning: GitRepositoryProvisioningRecord | undefined;

  if (canAttemptContext && resolvedPrimaryGitRepositoryTarget) {
    gitRepositoryProvisioning = repositoryProvisioningCache.get(
      gitRepositoryProvisioningRecordId!
    );

    if (!gitRepositoryProvisioning) {
      gitRepositoryProvisioning = await ensureGitRepositoryTargetProvisioning({
        target: resolvedPrimaryGitRepositoryTarget,
        gitServices: resolvedGitServices
      });
      repositoryProvisioningCache.set(
        gitRepositoryProvisioningRecordId!,
        gitRepositoryProvisioning
      );
    }

    await writeJsonFileIfChanged(
      gitRepositoryProvisioningRecordPath(resolvedPrimaryGitRepositoryTarget),
      gitRepositoryProvisioning
    );
  }
  const effectiveBinding = effectiveNodeBindingSchema.parse({
    bindingId: sanitizeIdentifier(`${activeRevisionId}-${node.nodeId}`),
    externalPrincipals: resolvedExternalPrincipals,
    graphId: graph.graphId,
    graphRevisionId: activeRevisionId,
    node,
    packageSource,
    resolvedResourceBindings: {
      externalPrincipalRefs: resolveEffectiveExternalPrincipalRefs(node, graph),
      relayProfileRefs: resolvedRelayProfileRefs,
      primaryRelayProfileRef: resolvedPrimaryRelayProfileRef,
      gitServiceRefs: resolvedGitServices.map((service) => service.id),
      primaryGitServiceRef: resolvedPrimaryGitServiceRef,
      modelEndpointProfileRef: resolvedModelEndpointProfileRef
    },
    runtimeProfile: graph.defaults.runtimeProfile,
    schemaVersion: "1"
  });

  await Promise.all([
    ensureDirectory(workspace.root),
    ensureDirectory(workspace.injectedRoot),
    ensureDirectory(workspace.memoryRoot),
    ensureDirectory(workspace.artifactWorkspaceRoot),
    ensureDirectory(workspace.engineStateRoot),
    ensureDirectory(workspace.retrievalRoot),
    ensureDirectory(workspace.runtimeRoot),
    ensureDirectory(workspace.sourceWorkspaceRoot),
    ensureDirectory(workspace.wikiRepositoryRoot)
  ]);

  let context: EffectiveRuntimeContext | undefined;

  if (
    sourcePackageRoot &&
    packageManifest &&
    canAttemptContext &&
    gitRepositoryProvisioning?.state !== "failed"
  ) {
    await syncWorkspacePackageLink(sourcePackageRoot, workspace.packageRoot);
    await initializeWorkspaceMemory(
      workspace.memoryRoot,
      sourcePackageRoot,
      packageManifest
    );
    let existingContext: EffectiveRuntimeContext | undefined;

    if (await pathExists(runtimeContextPath)) {
      const parsedExistingContext = effectiveRuntimeContextSchema.safeParse(
        await readJsonFile(runtimeContextPath)
      );

      if (parsedExistingContext.success) {
        existingContext = parsedExistingContext.data;
      }
    }

    const edgeRoutes: EffectiveRuntimeContext["relayContext"]["edgeRoutes"] = [];

    for (const edge of graph.edges) {
      if (
        !edge.enabled ||
        (edge.fromNodeId !== node.nodeId && edge.toNodeId !== node.nodeId)
      ) {
        continue;
      }

      const peerNodeId =
        edge.fromNodeId === node.nodeId ? edge.toNodeId : edge.fromNodeId;
      const peerNode = graph.nodes.find((candidate) => candidate.nodeId === peerNodeId);

      if (!peerNode) {
        continue;
      }

      const peerRelayRefs = resolveEffectiveRelayProfileRefs(
        peerNode,
        graph,
        catalog
      );
      const transportRelayRefs =
        edge.transportPolicy.relayProfileRefs.length > 0
          ? edge.transportPolicy.relayProfileRefs
          : intersectIdentifiers(resolvedRelayProfileRefs, peerRelayRefs);
      const realizableRelayRefs = intersectIdentifiers(
        intersectIdentifiers(resolvedRelayProfileRefs, peerRelayRefs),
        transportRelayRefs
      );

      if (realizableRelayRefs.length === 0) {
        continue;
      }

      const peerRuntimeIdentity =
        peerNode.nodeKind === "user"
          ? undefined
          : await ensureRuntimeIdentity({
              graphId: graph.graphId,
              nodeId: peerNode.nodeId
            });

      edgeRoutes.push({
        channel: edge.transportPolicy.channel,
        edgeId: edge.edgeId,
        peerNodeId,
        ...(peerRuntimeIdentity ? { peerPubkey: peerRuntimeIdentity.publicKey } : {}),
        relation: edge.relation,
        relayProfileRefs: realizableRelayRefs
      });
    }

    const contextDraft = {
      agentRuntimeContext: {
        mode: resolvedAgentRuntime.mode,
        defaultAgent: resolvedAgentRuntime.defaultAgent,
        engineProfile: resolvedAgentEngineProfile,
        engineProfileRef: resolvedAgentRuntime.engineProfileRef
      },
      artifactContext: {
        backends: ["git"],
        defaultNamespace: resolvedDefaultNamespace,
        gitPrincipalBindings: resolvedGitPrincipalBindings,
        gitServices: resolvedGitServices,
        primaryGitPrincipalRef: resolvedPrimaryGitPrincipalRef,
        primaryGitRepositoryTarget: resolvedPrimaryGitRepositoryTarget,
        primaryGitServiceRef: resolvedPrimaryGitServiceRef
      },
      binding: {
        ...effectiveBinding
      },
      generatedAt: nowIsoString(),
      identityContext: runtimeIdentityContextSchema.parse({
        algorithm: runtimeIdentity.algorithm,
        publicKey: runtimeIdentity.publicKey,
        secretDelivery: {
          envVar: "ENTANGLE_NOSTR_SECRET_KEY",
          mode: "env_var"
        }
      }),
      modelContext: {
        auth: resolvedModelAuthBinding,
        modelEndpointProfile: resolvedModelEndpointProfile
      },
      packageManifest,
      policyContext: {
        autonomy: node.autonomy,
        notes: [],
        runtimeProfile: graph.defaults.runtimeProfile
      },
      relayContext: {
        edgeRoutes,
        primaryRelayProfileRef: resolvedPrimaryRelayProfileRef,
        relayProfiles: resolvedRelayProfiles
      },
      schemaVersion: "1",
      workspace
    };
    const comparableDraft = JSON.stringify({
      ...contextDraft,
      generatedAt: ""
    });
    const comparableExisting = existingContext
      ? JSON.stringify({
          ...existingContext,
          generatedAt: ""
        })
      : undefined;

    context = effectiveRuntimeContextSchema.parse({
      ...contextDraft,
      generatedAt:
        comparableExisting === comparableDraft
          ? existingContext?.generatedAt ?? contextDraft.generatedAt
          : nowIsoString()
    });

    await writeJsonFileIfChanged(runtimeContextPath, context);
  } else {
    await rm(workspace.packageRoot, { force: true, recursive: true });
    await rm(runtimeContextPath, { force: true });
  }

  await writeJsonFileIfChanged(
    path.join(nodeBindingsRoot, `${node.nodeId}.json`),
    effectiveBinding
  );

  const existingIntent = await readRuntimeIntentRecord(node.nodeId);
  const recoveryPolicyRecord = await ensureRuntimeRecoveryPolicyRecord(node.nodeId);
  const operatorStopped =
    existingIntent?.desiredState === "stopped" &&
    existingIntent.reason === "stopped_by_operator";
  const desiredState: RuntimeDesiredState = context
    ? operatorStopped
      ? "stopped"
      : "running"
    : "stopped";
  const reason =
    desiredState === "stopped"
      ? context
        ? "stopped_by_operator"
        : buildRuntimeIntentReasonForUnavailableContext({
            hasAgentEngineProfile: Boolean(resolvedAgentEngineProfile),
            gitRepositoryProvisioning,
            node,
            packageManifest,
            packageSource,
            packageSourcePathExists
          })
      : undefined;

  const intentRecord = runtimeIntentRecordSchema.parse({
    ...createRuntimeIntentRecord({
      desiredState,
      existingIntent,
      graphId: graph.graphId,
      graphRevisionId: activeRevisionId,
      nodeId: node.nodeId,
      reason,
      restartGeneration: existingIntent?.restartGeneration ?? 0
    })
  });
  await writeJsonFileIfChanged(
    path.join(runtimeIntentsRoot, `${node.nodeId}.json`),
    intentRecord
  );
  if (didRuntimeIntentChange(existingIntent, intentRecord)) {
    await appendHostEvent({
      category: "runtime",
      desiredState: intentRecord.desiredState,
      graphId: graph.graphId,
      graphRevisionId: activeRevisionId,
      message: `Runtime '${node.nodeId}' desired state is now '${intentRecord.desiredState}'.`,
      nodeId: node.nodeId,
      previousDesiredState: existingIntent?.desiredState,
      previousReason: existingIntent?.reason,
      reason: intentRecord.reason,
      type: "runtime.desired_state.changed"
    } satisfies RuntimeDesiredStateChangedEventInput);
  }

  const existingObservedRecord = await readObservedRuntimeRecord(node.nodeId);
  let currentIntentRecord = intentRecord;
  let { inspection, observedRecord } = await reconcileObservedRuntimeState({
    context,
    desiredState: currentIntentRecord.desiredState,
    existingObservedRecord,
    graphId: graph.graphId,
    graphRevisionId: activeRevisionId,
    nodeId: node.nodeId,
    packageSourceId: packageSource?.packageSourceId,
    primaryGitRepositoryProvisioning: gitRepositoryProvisioning,
    reason: currentIntentRecord.reason,
    restartGeneration: currentIntentRecord.restartGeneration,
    runtimeIdentitySecret
  });
  await synchronizeRuntimeRecoveryHistory({
    inspection,
    lastError: observedRecord.lastError
  });

  const existingRecoveryController = await readRuntimeRecoveryControllerRecord(
    node.nodeId
  );
  let nextRecoveryController = buildIdleRuntimeRecoveryController({
    graphId: graph.graphId,
    graphRevisionId: activeRevisionId,
    nodeId: node.nodeId
  });

  if (
    inspection.desiredState === "running" &&
    inspection.contextAvailable &&
    inspection.observedState === "failed"
  ) {
    const failureFingerprint = buildRuntimeRecoveryFailureFingerprint({
      inspection,
      lastError: observedRecord.lastError
    });
    const previousControllerForFailure =
      existingRecoveryController?.activeFailureFingerprint === failureFingerprint
        ? existingRecoveryController
        : undefined;
    const lastFailureAt = nowIsoString();

    if (recoveryPolicyRecord.policy.mode === "manual") {
      nextRecoveryController = createRuntimeRecoveryControllerRecord({
        activeFailureFingerprint: failureFingerprint,
        attemptsUsed: 0,
        existingRecord: existingRecoveryController,
        graphId: graph.graphId,
        graphRevisionId: activeRevisionId,
        lastFailureAt,
        nodeId: node.nodeId,
        state: "manual_required"
      });
    } else {
      const attemptsUsed = previousControllerForFailure?.attemptsUsed ?? 0;
      const nextEligibleAt = previousControllerForFailure?.nextEligibleAt;
      const now = nowIsoString();

      if (nextEligibleAt && nextEligibleAt > now) {
        nextRecoveryController = createRuntimeRecoveryControllerRecord({
          activeFailureFingerprint: failureFingerprint,
          attemptsUsed,
          existingRecord: existingRecoveryController,
          graphId: graph.graphId,
          graphRevisionId: activeRevisionId,
          ...(previousControllerForFailure?.lastAttemptedAt
            ? { lastAttemptedAt: previousControllerForFailure.lastAttemptedAt }
            : {}),
          lastFailureAt,
          nextEligibleAt,
          nodeId: node.nodeId,
          state: "cooldown"
        });
      } else if (attemptsUsed >= recoveryPolicyRecord.policy.maxAttempts) {
        nextRecoveryController = createRuntimeRecoveryControllerRecord({
          activeFailureFingerprint: failureFingerprint,
          attemptsUsed,
          existingRecord: existingRecoveryController,
          graphId: graph.graphId,
          graphRevisionId: activeRevisionId,
          ...(previousControllerForFailure?.lastAttemptedAt
            ? { lastAttemptedAt: previousControllerForFailure.lastAttemptedAt }
            : {}),
          lastFailureAt,
          nodeId: node.nodeId,
          state: "exhausted"
        });
      } else {
        const attemptedAt = nowIsoString();
        const nextRestartGeneration =
          Math.max(
            currentIntentRecord.restartGeneration,
            existingIntent?.restartGeneration ?? 0
          ) + 1;
        const attemptedIntentRecord = createRuntimeIntentRecord({
          desiredState: "running",
          existingIntent: currentIntentRecord,
          graphId: graph.graphId,
          graphRevisionId: activeRevisionId,
          nodeId: node.nodeId,
          reason: undefined,
          restartGeneration: nextRestartGeneration
        });
        await writeJsonFile(
          path.join(runtimeIntentsRoot, `${node.nodeId}.json`),
          attemptedIntentRecord
        );
        await appendHostEvent({
          category: "runtime",
          graphId: graph.graphId,
          graphRevisionId: activeRevisionId,
          message:
            `Runtime '${node.nodeId}' restart was requested with generation '${nextRestartGeneration}'.`,
          nodeId: node.nodeId,
          previousRestartGeneration: currentIntentRecord.restartGeneration,
          restartGeneration: nextRestartGeneration,
          type: "runtime.restart.requested"
        } satisfies RuntimeRestartRequestedEventInput);

        currentIntentRecord = attemptedIntentRecord;
        const retryResult = await reconcileObservedRuntimeState({
          context,
          desiredState: currentIntentRecord.desiredState,
          existingObservedRecord: observedRecord,
          graphId: graph.graphId,
          graphRevisionId: activeRevisionId,
          nodeId: node.nodeId,
          packageSourceId: packageSource?.packageSourceId,
          primaryGitRepositoryProvisioning: gitRepositoryProvisioning,
          reason: currentIntentRecord.reason,
          restartGeneration: currentIntentRecord.restartGeneration,
          runtimeIdentitySecret
        });
        inspection = retryResult.inspection;
        observedRecord = retryResult.observedRecord;
        await synchronizeRuntimeRecoveryHistory({
          inspection,
          lastError: observedRecord.lastError
        });

        const attemptsAfterAttempt = attemptsUsed + 1;
        const cooldownUntil =
          recoveryPolicyRecord.policy.cooldownSeconds > 0
            ? addSecondsToIsoString(
                attemptedAt,
                recoveryPolicyRecord.policy.cooldownSeconds
              )
            : undefined;
        await appendHostEvent({
          attemptNumber: attemptsAfterAttempt,
          category: "runtime",
          cooldownSeconds: recoveryPolicyRecord.policy.cooldownSeconds,
          failureFingerprint,
          graphId: graph.graphId,
          graphRevisionId: activeRevisionId,
          maxAttempts: recoveryPolicyRecord.policy.maxAttempts,
          message:
            `Runtime '${node.nodeId}' automatic recovery attempted restart generation '${currentIntentRecord.restartGeneration}'.`,
          ...(cooldownUntil ? { nextEligibleAt: cooldownUntil } : {}),
          nodeId: node.nodeId,
          restartGeneration: currentIntentRecord.restartGeneration,
          type: "runtime.recovery.attempted"
        } satisfies RuntimeRecoveryAttemptedEventInput);

        if (inspection.observedState === "failed") {
          const nextControllerState =
            attemptsAfterAttempt >= recoveryPolicyRecord.policy.maxAttempts
              ? "exhausted"
              : "cooldown";
          nextRecoveryController = createRuntimeRecoveryControllerRecord({
            activeFailureFingerprint: failureFingerprint,
            attemptsUsed: attemptsAfterAttempt,
            existingRecord: existingRecoveryController,
            graphId: graph.graphId,
            graphRevisionId: activeRevisionId,
            lastAttemptedAt: attemptedAt,
            lastFailureAt,
            ...(attemptsAfterAttempt < recoveryPolicyRecord.policy.maxAttempts &&
            cooldownUntil
              ? { nextEligibleAt: cooldownUntil }
              : {}),
            nodeId: node.nodeId,
            state: nextControllerState
          });

          if (
            nextControllerState === "exhausted" &&
            (existingRecoveryController?.state !== "exhausted" ||
              existingRecoveryController.activeFailureFingerprint !==
                failureFingerprint ||
              existingRecoveryController.attemptsUsed !== attemptsAfterAttempt)
          ) {
            await appendHostEvent({
              attemptsUsed: attemptsAfterAttempt,
              category: "runtime",
              failureFingerprint,
              graphId: graph.graphId,
              graphRevisionId: activeRevisionId,
              maxAttempts: recoveryPolicyRecord.policy.maxAttempts,
              message:
                `Runtime '${node.nodeId}' exhausted automatic recovery after '${attemptsAfterAttempt}' attempts.`,
              nodeId: node.nodeId,
              type: "runtime.recovery.exhausted"
            } satisfies RuntimeRecoveryExhaustedEventInput);
          }
        } else {
          nextRecoveryController = buildIdleRuntimeRecoveryController({
            graphId: graph.graphId,
            graphRevisionId: activeRevisionId,
            nodeId: node.nodeId
          });
        }
      }
    }
  }

  await writeJsonFileIfChanged(
    runtimeRecoveryControllerRecordPath(node.nodeId),
    nextRecoveryController
  );
  if (didRuntimeRecoveryControllerChange(existingRecoveryController, nextRecoveryController)) {
    await appendHostEvent({
      category: "runtime",
      controller: nextRecoveryController,
      graphId: graph.graphId,
      graphRevisionId: activeRevisionId,
      message:
        `Runtime '${node.nodeId}' recovery controller is now ` +
        `'${nextRecoveryController.state}'.`,
      nodeId: node.nodeId,
      ...(existingRecoveryController
        ? {
            previousAttemptsUsed: existingRecoveryController.attemptsUsed,
            previousState: existingRecoveryController.state
          }
        : {}),
      type: "runtime.recovery_controller.updated"
    } satisfies RuntimeRecoveryControllerUpdatedEventInput);
  }

  return {
    binding: effectiveBinding,
    context,
    primaryGitRepositoryProvisioning: gitRepositoryProvisioning,
    inspection
  };
}

async function performCurrentGraphRuntimeStateSynchronization(): Promise<CurrentGraphRuntimeSynchronizationResult> {
  const { graph, activeRevisionId } = await readActiveGraphState();
  const previousSnapshot = await readLatestReconciliationSnapshot();
  const runtimeBackend = getRuntimeBackend();

  if (!graph || !activeRevisionId) {
    const emptySnapshot = reconciliationSnapshotSchema.parse({
      backendKind: runtimeBackend.kind,
      blockedRuntimeCount: 0,
      degradedRuntimeCount: 0,
      failedRuntimeCount: 0,
      findingCodes: [],
      graphId: undefined,
      graphRevisionId: undefined,
      issueCount: 0,
      lastReconciledAt: nowIsoString(),
      managedRuntimeCount: 0,
      nodes: [],
      runningRuntimeCount: 0,
      schemaVersion: "1",
      stoppedRuntimeCount: 0,
      transitioningRuntimeCount: 0
    });
    await writeJsonFileIfChanged(latestReconciliationPath, emptySnapshot);
    await removeJsonFilesExcept(gitRepositoryTargetsRoot, new Set());
    await removeJsonFilesExcept(runtimeRecoveryControllersRoot, new Set());
    await removeJsonFilesExcept(observedSessionActivityRoot, new Set());
    await removeJsonFilesExcept(observedRunnerTurnActivityRoot, new Set());
    if (didReconciliationSnapshotChange(previousSnapshot, emptySnapshot)) {
      await appendHostEvent({
        backendKind: emptySnapshot.backendKind,
        blockedRuntimeCount: emptySnapshot.blockedRuntimeCount,
        category: "reconciliation",
        degradedRuntimeCount: emptySnapshot.degradedRuntimeCount,
        failedRuntimeCount: emptySnapshot.failedRuntimeCount,
        findingCodes: emptySnapshot.findingCodes,
        graphId: emptySnapshot.graphId,
        graphRevisionId: emptySnapshot.graphRevisionId,
        issueCount: emptySnapshot.issueCount,
        managedRuntimeCount: emptySnapshot.managedRuntimeCount,
        message: "Host reconciliation completed with no active graph.",
        runningRuntimeCount: emptySnapshot.runningRuntimeCount,
        stoppedRuntimeCount: emptySnapshot.stoppedRuntimeCount,
        transitioningRuntimeCount: emptySnapshot.transitioningRuntimeCount,
        type: "host.reconciliation.completed"
      } satisfies HostReconciliationCompletedEventInput);
    }

    return {
      nodes: [],
      runtimes: [],
      snapshot: emptySnapshot
    };
  }

  const catalog = await readCatalog();
  const packageSources = await listPackageSourceRecordMap();
  const runtimeNodes = graph.nodes.filter((node) => node.nodeKind !== "user");
  const activeNodeIds = new Set(runtimeNodes.map((node) => node.nodeId));
  const repositoryProvisioningCache = new Map<
    string,
    GitRepositoryProvisioningRecord
  >();
  const nodeInspections: NodeInspectionResponse[] = [];
  const inspections: RuntimeInspectionResponse[] = [];

  for (const nodeId of await listObservedRuntimeNodeIds()) {
    if (!activeNodeIds.has(nodeId)) {
      await runtimeBackend.removeInactiveRuntime(nodeId);
    }
  }

  await removeJsonFilesExcept(nodeBindingsRoot, activeNodeIds);
  await removeJsonFilesExcept(runtimeIntentsRoot, activeNodeIds);
  await removeJsonFilesExcept(runtimeRecoveryControllersRoot, activeNodeIds);
  await removeJsonFilesExcept(observedRuntimesRoot, activeNodeIds);

  for (const node of runtimeNodes) {
    const resolution = await buildRuntimeResolution({
      activeRevisionId,
      catalog,
      graph,
      node,
      packageSources,
      repositoryProvisioningCache
    });
    nodeInspections.push(
      nodeInspectionResponseSchema.parse({
        binding: resolution.binding,
        runtime: resolution.inspection
      })
    );
    inspections.push(resolution.inspection);
  }

  await removeJsonFilesExcept(
    gitRepositoryTargetsRoot,
    new Set(repositoryProvisioningCache.keys())
  );
  await synchronizeRuntimeActivityEvents({
    runtimes: inspections
  });

  inspections.sort((left, right) => left.nodeId.localeCompare(right.nodeId));
  nodeInspections.sort((left, right) =>
    left.binding.node.nodeId.localeCompare(right.binding.node.nodeId)
  );
  const snapshot = buildReconciliationSnapshot({
    backendKind: runtimeBackend.kind,
    graphId: graph.graphId,
    graphRevisionId: activeRevisionId,
    lastReconciledAt: nowIsoString(),
    runtimes: inspections
  });

  await writeJsonFileIfChanged(latestReconciliationPath, snapshot);
  if (didReconciliationSnapshotChange(previousSnapshot, snapshot)) {
    await appendHostEvent({
      backendKind: snapshot.backendKind,
      blockedRuntimeCount: snapshot.blockedRuntimeCount,
      category: "reconciliation",
      degradedRuntimeCount: snapshot.degradedRuntimeCount,
      failedRuntimeCount: snapshot.failedRuntimeCount,
      findingCodes: snapshot.findingCodes,
      graphId: snapshot.graphId,
      graphRevisionId: snapshot.graphRevisionId,
      issueCount: snapshot.issueCount,
      managedRuntimeCount: snapshot.managedRuntimeCount,
      message: `Host reconciliation completed for graph '${snapshot.graphId}'.`,
      runningRuntimeCount: snapshot.runningRuntimeCount,
      stoppedRuntimeCount: snapshot.stoppedRuntimeCount,
      transitioningRuntimeCount: snapshot.transitioningRuntimeCount,
      type: "host.reconciliation.completed"
    } satisfies HostReconciliationCompletedEventInput);
  }

  return {
    nodes: nodeInspections,
    runtimes: inspections,
    snapshot
  };
}

async function synchronizeCurrentGraphRuntimeState(): Promise<CurrentGraphRuntimeSynchronizationResult> {
  if (currentGraphRuntimeSynchronizationPromise) {
    return currentGraphRuntimeSynchronizationPromise;
  }

  const synchronizationPromise = performCurrentGraphRuntimeStateSynchronization().finally(
    () => {
      if (currentGraphRuntimeSynchronizationPromise === synchronizationPromise) {
        currentGraphRuntimeSynchronizationPromise = undefined;
      }
    }
  );

  currentGraphRuntimeSynchronizationPromise = synchronizationPromise;
  return synchronizationPromise;
}

export async function listRuntimeInspections(): Promise<RuntimeListResponse> {
  return runtimeListResponseSchema.parse({
    runtimes: (await synchronizeCurrentGraphRuntimeState()).runtimes
  });
}

export async function listNodeInspections(): Promise<NodeListResponse> {
  return nodeListResponseSchema.parse({
    nodes: (await synchronizeCurrentGraphRuntimeState()).nodes
  });
}

export async function listEdges(): Promise<EdgeListResponse> {
  const { graph } = await readActiveGraphState();

  return edgeListResponseSchema.parse({
    edges: graph?.edges ?? []
  });
}

export async function getNodeInspection(
  nodeId: string
): Promise<NodeInspectionResponse | null> {
  const { nodes } = await synchronizeCurrentGraphRuntimeState();
  return nodes.find((node) => node.binding.node.nodeId === nodeId) ?? null;
}

export async function createManagedNode(
  input: NodeCreateRequest
): Promise<ManagedNodeMutationResult<NodeMutationResponse>> {
  const { graph } = await readActiveGraphState();

  if (!graph) {
    return {
      conflict: buildManagedNodeMissingGraphConflict(),
      ok: false
    };
  }

  if (graph.nodes.some((node) => node.nodeId === input.nodeId)) {
    return {
      conflict: {
        kind: "node_exists",
        nodeId: input.nodeId
      },
      ok: false
    };
  }

  const applied = await applyNodeGraphCandidate({
    candidateGraph: graphSpecSchema.parse({
      ...graph,
      nodes: [...graph.nodes, input]
    }),
    mutationKind: "created",
    nodeId: input.nodeId
  });

  return {
    ok: true,
    response: buildManagedNodeMutationSuccessResponse({
      applied
    })
  };
}

export async function createEdge(
  input: EdgeCreateRequest
): Promise<EdgeMutationResult<EdgeMutationResponse>> {
  const { graph } = await readActiveGraphState();

  if (!graph) {
    return {
      conflict: buildEdgeMissingGraphConflict(),
      ok: false
    };
  }

  if (graph.edges.some((edge) => edge.edgeId === input.edgeId)) {
    return {
      conflict: {
        edgeId: input.edgeId,
        kind: "edge_exists"
      },
      ok: false
    };
  }

  const applied = await applyEdgeGraphCandidate({
    candidateGraph: graphSpecSchema.parse({
      ...graph,
      edges: [...graph.edges, input]
    }),
    edgeId: input.edgeId,
    mutationKind: "created"
  });

  return {
    ok: true,
    response: buildEdgeMutationSuccessResponse({
      applied
    })
  };
}

export async function replaceManagedNode(
  nodeId: string,
  replacement: NodeReplacementRequest
): Promise<ManagedNodeMutationResult<NodeMutationResponse>> {
  const { graph } = await readActiveGraphState();

  if (!graph) {
    return {
      conflict: buildManagedNodeMissingGraphConflict(),
      ok: false
    };
  }

  if (!findManagedNode(graph, nodeId)) {
    return {
      conflict: {
        kind: "node_not_found",
        nodeId
      },
      ok: false
    };
  }

  const nextNode: NodeBinding = {
    ...replacement,
    nodeId
  };
  const applied = await applyNodeGraphCandidate({
    candidateGraph: graphSpecSchema.parse({
      ...graph,
      nodes: graph.nodes.map((node) => (node.nodeId === nodeId ? nextNode : node))
    }),
    mutationKind: "replaced",
    nodeId
  });

  return {
    ok: true,
    response: buildManagedNodeMutationSuccessResponse({
      applied
    })
  };
}

export async function replaceEdge(
  edgeId: string,
  replacement: EdgeReplacementRequest
): Promise<EdgeMutationResult<EdgeMutationResponse>> {
  const { graph } = await readActiveGraphState();

  if (!graph) {
    return {
      conflict: buildEdgeMissingGraphConflict(),
      ok: false
    };
  }

  if (!findEdge(graph, edgeId)) {
    return {
      conflict: {
        edgeId,
        kind: "edge_not_found"
      },
      ok: false
    };
  }

  const nextEdge: Edge = {
    ...replacement,
    edgeId
  };
  const applied = await applyEdgeGraphCandidate({
    candidateGraph: graphSpecSchema.parse({
      ...graph,
      edges: graph.edges.map((edge) => (edge.edgeId === edgeId ? nextEdge : edge))
    }),
    edgeId,
    mutationKind: "replaced"
  });

  return {
    ok: true,
    response: buildEdgeMutationSuccessResponse({
      applied
    })
  };
}

export async function deleteManagedNode(
  nodeId: string
): Promise<ManagedNodeMutationResult<NodeDeletionResponse>> {
  const { graph } = await readActiveGraphState();

  if (!graph) {
    return {
      conflict: buildManagedNodeMissingGraphConflict(),
      ok: false
    };
  }

  if (!findManagedNode(graph, nodeId)) {
    return {
      conflict: {
        kind: "node_not_found",
        nodeId
      },
      ok: false
    };
  }

  const connectedEdgeIds = graph.edges
    .filter((edge) => edge.fromNodeId === nodeId || edge.toNodeId === nodeId)
    .map((edge) => edge.edgeId)
    .sort();

  if (connectedEdgeIds.length > 0) {
    return {
      conflict: {
        edgeIds: connectedEdgeIds,
        kind: "node_has_edges",
        nodeId
      },
      ok: false
    };
  }

  const applied = await applyNodeGraphCandidate({
    candidateGraph: graphSpecSchema.parse({
      ...graph,
      nodes: graph.nodes.filter((node) => node.nodeId !== nodeId)
    }),
    mutationKind: "deleted",
    nodeId
  });

  return {
    ok: true,
    response: buildManagedNodeDeletionSuccessResponse({
      applied,
      nodeId
    })
  };
}

export async function deleteEdge(
  edgeId: string
): Promise<EdgeMutationResult<EdgeDeletionResponse>> {
  const { graph } = await readActiveGraphState();

  if (!graph) {
    return {
      conflict: buildEdgeMissingGraphConflict(),
      ok: false
    };
  }

  if (!findEdge(graph, edgeId)) {
    return {
      conflict: {
        edgeId,
        kind: "edge_not_found"
      },
      ok: false
    };
  }

  const applied = await applyEdgeGraphCandidate({
    candidateGraph: graphSpecSchema.parse({
      ...graph,
      edges: graph.edges.filter((edge) => edge.edgeId !== edgeId)
    }),
    edgeId,
    mutationKind: "deleted"
  });

  return {
    ok: true,
    response: buildEdgeDeletionSuccessResponse({
      applied,
      edgeId
    })
  };
}

export async function getRuntimeInspection(
  nodeId: string
): Promise<RuntimeInspectionResponse | null> {
  const { runtimes } = await synchronizeCurrentGraphRuntimeState();
  return runtimes.find((runtime) => runtime.nodeId === nodeId) ?? null;
}

export async function getRuntimeContext(
  nodeId: string
): Promise<EffectiveRuntimeContext | null> {
  const inspection = await getRuntimeInspection(nodeId);

  if (!inspection?.contextPath || !inspection.contextAvailable) {
    return null;
  }

  return effectiveRuntimeContextSchema.parse(
    await readJsonFile(inspection.contextPath)
  );
}

export async function listRuntimeArtifacts(
  nodeId: string
): Promise<RuntimeArtifactListResponse | null> {
  const context = await getRuntimeContext(nodeId);

  if (!context) {
    return null;
  }

  return runtimeArtifactListResponseSchema.parse({
    artifacts: await listRuntimeArtifactRecords(context.workspace.runtimeRoot)
  });
}

export async function getRuntimeArtifactInspection(input: {
  artifactId: string;
  nodeId: string;
}): Promise<RuntimeArtifactInspectionResponse | null> {
  const artifacts = await listRuntimeArtifacts(input.nodeId);

  if (!artifacts) {
    return null;
  }

  const artifact = artifacts.artifacts.find(
    (candidate) => candidate.ref.artifactId === input.artifactId
  );

  return artifact
    ? runtimeArtifactInspectionResponseSchema.parse({ artifact })
    : null;
}

function isPathInsideRoot(input: {
  candidatePath: string;
  rootPath: string;
}): boolean {
  const candidatePath = path.resolve(input.candidatePath);
  const rootPath = path.resolve(input.rootPath);
  const relativePath = path.relative(rootPath, candidatePath);

  return (
    relativePath.length === 0 ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
}

function toRuntimeMemoryRelativePath(input: {
  filePath: string;
  memoryRoot: string;
}): string {
  return path
    .relative(input.memoryRoot, input.filePath)
    .split(path.sep)
    .join(path.posix.sep);
}

function classifyRuntimeMemoryPage(
  relativePath: string
): RuntimeMemoryPageKind {
  if (relativePath.startsWith("schema/")) {
    return "schema";
  }

  if (relativePath === "wiki/index.md") {
    return "wiki_index";
  }

  if (relativePath === "wiki/log.md") {
    return "wiki_log";
  }

  if (relativePath.startsWith("wiki/summaries/")) {
    return "summary";
  }

  if (relativePath.startsWith("wiki/tasks/")) {
    return "task";
  }

  return "wiki_page";
}

async function collectRuntimeMemoryFilePaths(rootPath: string): Promise<string[]> {
  if (!(await pathExists(rootPath))) {
    return [];
  }

  const entries = await readdir(rootPath, { withFileTypes: true });
  const childPaths = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(rootPath, entry.name);

      if (entry.isDirectory()) {
        return collectRuntimeMemoryFilePaths(entryPath);
      }

      return entry.isFile() ? [entryPath] : [];
    })
  );

  return childPaths.flat();
}

async function buildRuntimeMemoryPageSummary(input: {
  filePath: string;
  memoryRoot: string;
}): Promise<RuntimeMemoryPageSummary | null> {
  if (!isPathInsideRoot({ candidatePath: input.filePath, rootPath: input.memoryRoot })) {
    return null;
  }

  const fileStat = await stat(input.filePath);

  if (!fileStat.isFile()) {
    return null;
  }

  const relativePath = toRuntimeMemoryRelativePath(input);

  return {
    kind: classifyRuntimeMemoryPage(relativePath),
    path: relativePath,
    sizeBytes: fileStat.size,
    updatedAt: fileStat.mtime.toISOString()
  };
}

async function collectRuntimeMemoryPageSummaries(
  memoryRoot: string
): Promise<RuntimeMemoryPageSummary[]> {
  const filePaths = await collectRuntimeMemoryFilePaths(memoryRoot);
  const pages = (
    await Promise.all(
      filePaths.map((filePath) =>
        buildRuntimeMemoryPageSummary({ filePath, memoryRoot })
      )
    )
  ).filter((page): page is RuntimeMemoryPageSummary => page !== null);

  return pages.sort((left, right) => left.path.localeCompare(right.path));
}

export async function getRuntimeMemoryInspection(
  nodeId: string
): Promise<RuntimeMemoryInspectionResponse | null> {
  const context = await getRuntimeContext(nodeId);

  if (!context) {
    return null;
  }

  const pages = await collectRuntimeMemoryPageSummaries(context.workspace.memoryRoot);

  return runtimeMemoryInspectionResponseSchema.parse({
    focusedRegisters: pages.filter((page) =>
      focusedMemoryRegisterPaths.has(page.path)
    ),
    memoryRoot: context.workspace.memoryRoot,
    nodeId,
    pages,
    taskPages: pages.filter((page) => page.kind === "task")
  });
}

function resolveRuntimeMemoryPagePath(input: {
  memoryRoot: string;
  pagePath: string;
}): { filePath: string } | { reason: string } {
  const normalizedPath = path.posix.normalize(
    input.pagePath.replace(/\\/g, "/")
  );

  if (
    normalizedPath === "." ||
    normalizedPath === ".." ||
    normalizedPath.startsWith("../") ||
    path.posix.isAbsolute(normalizedPath)
  ) {
    return {
      reason:
        "Memory page preview is unavailable because the requested path is outside the runtime memory workspace."
    };
  }

  const filePath = path.resolve(
    input.memoryRoot,
    ...normalizedPath.split(path.posix.sep)
  );

  if (!isPathInsideRoot({ candidatePath: filePath, rootPath: input.memoryRoot })) {
    return {
      reason:
        "Memory page preview is unavailable because the requested path is outside the runtime memory workspace."
    };
  }

  return { filePath };
}

function inferRuntimeMemoryContentType(
  filePath: string
): "text/markdown" | "text/plain" {
  const extension = path.extname(filePath).toLowerCase();

  return extension === ".md" || extension === ".markdown"
    ? "text/markdown"
    : "text/plain";
}

async function readRuntimeMemoryPreview(
  filePath: string
): Promise<RuntimeMemoryPageInspectionResponse["preview"]> {
  if (!(await pathExists(filePath))) {
    return {
      available: false,
      reason: "Memory page preview is unavailable because the page is missing."
    };
  }

  if (!(await stat(filePath)).isFile()) {
    return {
      available: false,
      reason: "Memory page preview is unavailable because the path is not a file."
    };
  }

  const file = await open(filePath, "r");

  try {
    const buffer = Buffer.alloc(memoryPreviewMaxBytes + 1);
    const { bytesRead } = await file.read(
      buffer,
      0,
      memoryPreviewMaxBytes + 1,
      0
    );
    const truncated = bytesRead > memoryPreviewMaxBytes;
    const previewBuffer = buffer.subarray(
      0,
      Math.min(bytesRead, memoryPreviewMaxBytes)
    );

    if (previewBuffer.includes(0)) {
      return {
        available: false,
        reason:
          "Memory page preview is unavailable because the page is not text."
      };
    }

    return {
      available: true,
      bytesRead: previewBuffer.length,
      content: previewBuffer.toString("utf8"),
      contentEncoding: "utf8",
      contentType: inferRuntimeMemoryContentType(filePath),
      sourcePath: filePath,
      truncated
    };
  } finally {
    await file.close();
  }
}

export async function getRuntimeMemoryPageInspection(input: {
  nodeId: string;
  path: string;
}): Promise<RuntimeMemoryPageInspectionResponse | null> {
  const context = await getRuntimeContext(input.nodeId);

  if (!context) {
    return null;
  }

  const resolvedPath = resolveRuntimeMemoryPagePath({
    memoryRoot: context.workspace.memoryRoot,
    pagePath: input.path
  });

  if ("reason" in resolvedPath) {
    return null;
  }

  const page = await buildRuntimeMemoryPageSummary({
    filePath: resolvedPath.filePath,
    memoryRoot: context.workspace.memoryRoot
  });

  if (!page) {
    return null;
  }

  return runtimeMemoryPageInspectionResponseSchema.parse({
    nodeId: input.nodeId,
    page,
    preview: await readRuntimeMemoryPreview(resolvedPath.filePath)
  });
}

function resolveArtifactPreviewPath(input: {
  artifact: ArtifactRecord;
  context: EffectiveRuntimeContext;
}): { filePath: string } | { reason: string } {
  const candidatePaths = [
    input.artifact.materialization?.localPath,
    input.artifact.materialization?.repoPath && input.artifact.ref.backend === "git"
      ? path.join(input.artifact.materialization.repoPath, input.artifact.ref.locator.path)
      : undefined,
    input.artifact.ref.backend === "local_file"
      ? input.artifact.ref.locator.path
      : undefined
  ].filter((candidatePath): candidatePath is string => Boolean(candidatePath));

  if (candidatePaths.length === 0) {
    return {
      reason:
        "Artifact preview is unavailable because the artifact has no local materialized file path."
    };
  }

  const allowedRoots = [
    input.context.workspace.artifactWorkspaceRoot,
    input.context.workspace.retrievalRoot
  ];

  for (const candidatePath of candidatePaths) {
    if (
      allowedRoots.some((rootPath) =>
        isPathInsideRoot({ candidatePath, rootPath })
      )
    ) {
      return { filePath: path.resolve(candidatePath) };
    }
  }

  return {
    reason:
      "Artifact preview is unavailable because the artifact file is outside the runtime artifact workspace."
  };
}

function inferArtifactPreviewContentType(input: {
  artifact: ArtifactRecord;
  filePath: string;
}): "text/markdown" | "text/plain" {
  const extension = path.extname(input.filePath).toLowerCase();

  if (
    extension === ".md" ||
    extension === ".markdown" ||
    input.artifact.ref.artifactKind === "report_file" ||
    input.artifact.ref.artifactKind === "wiki_page"
  ) {
    return "text/markdown";
  }

  return "text/plain";
}

async function readArtifactPreview(input: {
  artifact: ArtifactRecord;
  filePath: string;
}): Promise<RuntimeArtifactPreviewResponse["preview"]> {
  if (!(await pathExists(input.filePath))) {
    return {
      available: false,
      reason: "Artifact preview is unavailable because the artifact file is missing."
    };
  }

  if (!(await stat(input.filePath)).isFile()) {
    return {
      available: false,
      reason: "Artifact preview is unavailable because the artifact path is not a file."
    };
  }

  const file = await open(input.filePath, "r");

  try {
    const buffer = Buffer.alloc(artifactPreviewMaxBytes + 1);
    const { bytesRead } = await file.read(
      buffer,
      0,
      artifactPreviewMaxBytes + 1,
      0
    );
    const truncated = bytesRead > artifactPreviewMaxBytes;
    const previewBuffer = buffer.subarray(
      0,
      Math.min(bytesRead, artifactPreviewMaxBytes)
    );

    if (previewBuffer.includes(0)) {
      return {
        available: false,
        reason:
          "Artifact preview is unavailable because the artifact file is not text."
      };
    }

    return {
      available: true,
      bytesRead: previewBuffer.length,
      content: previewBuffer.toString("utf8"),
      contentEncoding: "utf8",
      contentType: inferArtifactPreviewContentType(input),
      sourcePath: input.filePath,
      truncated
    };
  } finally {
    await file.close();
  }
}

export async function getRuntimeArtifactPreview(input: {
  artifactId: string;
  nodeId: string;
}): Promise<RuntimeArtifactPreviewResponse | null> {
  const context = await getRuntimeContext(input.nodeId);

  if (!context) {
    return null;
  }

  const artifacts = await listRuntimeArtifactRecords(context.workspace.runtimeRoot);
  const artifact = artifacts.find(
    (candidate) => candidate.ref.artifactId === input.artifactId
  );

  if (!artifact) {
    return null;
  }

  const resolvedPath = resolveArtifactPreviewPath({ artifact, context });

  if ("reason" in resolvedPath) {
    return runtimeArtifactPreviewResponseSchema.parse({
      artifact,
      preview: {
        available: false,
        reason: resolvedPath.reason
      }
    });
  }

  return runtimeArtifactPreviewResponseSchema.parse({
    artifact,
    preview: await readArtifactPreview({
      artifact,
      filePath: resolvedPath.filePath
    })
  });
}

export async function listRuntimeApprovals(
  nodeId: string
): Promise<RuntimeApprovalListResponse | null> {
  const context = await getRuntimeContext(nodeId);

  if (!context) {
    return null;
  }

  return runtimeApprovalListResponseSchema.parse({
    approvals: await listRuntimeApprovalRecords(context.workspace.runtimeRoot)
  });
}

export async function getRuntimeApprovalInspection(input: {
  approvalId: string;
  nodeId: string;
}): Promise<RuntimeApprovalInspectionResponse | null> {
  const approvals = await listRuntimeApprovals(input.nodeId);

  if (!approvals) {
    return null;
  }

  const approval = approvals.approvals.find(
    (candidate) => candidate.approvalId === input.approvalId
  );

  return approval
    ? runtimeApprovalInspectionResponseSchema.parse({ approval })
    : null;
}

export async function listRuntimeTurns(
  nodeId: string
): Promise<RuntimeTurnListResponse | null> {
  const context = await getRuntimeContext(nodeId);

  if (!context) {
    return null;
  }

  return runtimeTurnListResponseSchema.parse({
    turns: await listRuntimeTurnRecords(context.workspace.runtimeRoot)
  });
}

export async function getRuntimeTurnInspection(input: {
  nodeId: string;
  turnId: string;
}): Promise<RuntimeTurnInspectionResponse | null> {
  const turns = await listRuntimeTurns(input.nodeId);

  if (!turns) {
    return null;
  }

  const turn = turns.turns.find((candidate) => candidate.turnId === input.turnId);

  return turn ? runtimeTurnInspectionResponseSchema.parse({ turn }) : null;
}

export async function getRuntimeRecoveryInspection(input: {
  limit?: number;
  nodeId: string;
}): Promise<RuntimeRecoveryInspectionResponse | null> {
  const inspection = await getRuntimeInspection(input.nodeId);
  const existingPolicy = await readRuntimeRecoveryPolicyRecord(input.nodeId);
  const controller =
    (await readRuntimeRecoveryControllerRecord(input.nodeId)) ??
    buildIdleRuntimeRecoveryController({
      ...(inspection ? { graphId: inspection.graphId } : {}),
      ...(inspection ? { graphRevisionId: inspection.graphRevisionId } : {}),
      nodeId: input.nodeId
    });
  const entries = await listRuntimeRecoveryRecords({
    limit: input.limit ?? 50,
    nodeId: input.nodeId
  });

  if (!inspection && entries.length === 0 && !existingPolicy) {
    return null;
  }

  const policy =
    existingPolicy ??
    (inspection
      ? await ensureRuntimeRecoveryPolicyRecord(input.nodeId)
      : buildDefaultRuntimeRecoveryPolicy(input.nodeId));

  return runtimeRecoveryInspectionResponseSchema.parse({
    controller,
    ...(inspection ? { currentRuntime: inspection } : {}),
    entries,
    nodeId: input.nodeId,
    policy
  });
}

async function listRuntimeSessionRecords(
  runtimeRoot: string
): Promise<SessionRecord[]> {
  const sessionsRoot = path.join(runtimeRoot, "sessions");

  if (!(await pathExists(sessionsRoot))) {
    return [];
  }

  const fileNames = (await readdir(sessionsRoot))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();

  return Promise.all(
    fileNames.map(async (fileName) =>
      sessionRecordSchema.parse(
        await readJsonFile(path.join(sessionsRoot, fileName))
      )
    )
  );
}

async function listRuntimeConversationRecords(
  runtimeRoot: string
): Promise<ConversationRecord[]> {
  const conversationsRoot = path.join(runtimeRoot, "conversations");

  if (!(await pathExists(conversationsRoot))) {
    return [];
  }

  const fileNames = (await readdir(conversationsRoot))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();

  return Promise.all(
    fileNames.map(async (fileName) =>
      conversationRecordSchema.parse(
        await readJsonFile(path.join(conversationsRoot, fileName))
      )
    )
  );
}

async function listRuntimeApprovalRecords(
  runtimeRoot: string
): Promise<ApprovalRecord[]> {
  const approvalsRoot = path.join(runtimeRoot, "approvals");

  if (!(await pathExists(approvalsRoot))) {
    return [];
  }

  const fileNames = (await readdir(approvalsRoot))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();

  return Promise.all(
    fileNames.map(async (fileName) =>
      approvalRecordSchema.parse(
        await readJsonFile(path.join(approvalsRoot, fileName))
      )
    )
  );
}

async function listRuntimeTurnRecords(
  runtimeRoot: string
): Promise<RunnerTurnRecord[]> {
  const turnsRoot = path.join(runtimeRoot, "turns");

  if (!(await pathExists(turnsRoot))) {
    return [];
  }

  const fileNames = (await readdir(turnsRoot))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();

  return Promise.all(
    fileNames.map(async (fileName) =>
      runnerTurnRecordSchema.parse(
        await readJsonFile(path.join(turnsRoot, fileName))
      )
    )
  );
}

async function listRuntimeArtifactRecords(
  runtimeRoot: string
): Promise<ArtifactRecord[]> {
  const artifactsRoot = path.join(runtimeRoot, "artifacts");

  if (!(await pathExists(artifactsRoot))) {
    return [];
  }

  const fileNames = (await readdir(artifactsRoot))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();

  return Promise.all(
    fileNames.map(async (fileName) =>
      artifactRecordSchema.parse(
        await readJsonFile(path.join(artifactsRoot, fileName))
      )
    )
  );
}

async function synchronizeSessionActivityObservation(input: {
  approvalRecords: ApprovalRecord[];
  conversationRecords: ConversationRecord[];
  runtime: RuntimeInspectionResponse;
  sessionRecord: SessionRecord;
}): Promise<void> {
  const { runtime, sessionRecord } = input;
  const approvalStatusCounts = countApprovalStatuses(input.approvalRecords);
  const conversationStatusCounts = countConversationStatuses(
    input.conversationRecords
  );
  const sessionConsistencyFindings = inspectSessionConsistency({
    approvalRecords: input.approvalRecords,
    conversationRecords: input.conversationRecords,
    nodeId: runtime.nodeId,
    sessionRecord
  });
  const sessionConsistencyFindingCodes: HostSessionConsistencyFindingCode[] =
    Array.from(
      new Set(sessionConsistencyFindings.map((finding) => finding.code))
    ).sort();
  const fingerprint = buildObservationFingerprint({
    approvalStatusCounts,
    conversationStatusCounts,
    sessionConsistencyFindingCodes,
    sessionConsistencyFindingCount: sessionConsistencyFindings.length,
    sessionRecord
  });
  const existingRecord = await readObservedSessionActivityRecord(
    runtime.nodeId,
    sessionRecord.sessionId
  );
  const nextRecord = observedSessionActivityRecordSchema.parse({
    activeConversationIds: sessionRecord.activeConversationIds,
    fingerprint,
    graphId: sessionRecord.graphId,
    ...(sessionRecord.lastMessageType
      ? { lastMessageType: sessionRecord.lastMessageType }
      : {}),
    nodeId: runtime.nodeId,
    ownerNodeId: sessionRecord.ownerNodeId,
    rootArtifactIds: sessionRecord.rootArtifactIds,
    schemaVersion: "1",
    sessionId: sessionRecord.sessionId,
    status: sessionRecord.status,
    traceId: sessionRecord.traceId,
    updatedAt: sessionRecord.updatedAt
  });
  await writeJsonFileIfChanged(
    path.join(
      observedSessionActivityRoot,
      `${runtime.nodeId}--${sessionRecord.sessionId}.json`
    ),
    nextRecord
  );

  if (existingRecord?.fingerprint === nextRecord.fingerprint) {
    return;
  }

  await appendHostEvent({
    category: "session",
    graphId: sessionRecord.graphId,
    activeConversationIds: sessionRecord.activeConversationIds,
    approvalStatusCounts,
    conversationStatusCounts,
    ...(sessionRecord.lastMessageType
      ? { lastMessageType: sessionRecord.lastMessageType }
      : {}),
    message:
      `Session '${sessionRecord.sessionId}' on node '${runtime.nodeId}' is now ` +
      `'${sessionRecord.status}' with ${sessionRecord.activeConversationIds.length} ` +
      `active conversation(s).`,
    nodeId: runtime.nodeId,
    ownerNodeId: sessionRecord.ownerNodeId,
    rootArtifactIds: sessionRecord.rootArtifactIds,
    sessionConsistencyFindingCodes,
    sessionConsistencyFindingCount: sessionConsistencyFindings.length,
    sessionId: sessionRecord.sessionId,
    status: sessionRecord.status,
    traceId: sessionRecord.traceId,
    updatedAt: sessionRecord.updatedAt,
    type: "session.updated"
  } satisfies SessionUpdatedEventInput);
}

async function synchronizeRunnerTurnActivityObservation(input: {
  runtime: RuntimeInspectionResponse;
  turnRecord: RunnerTurnRecord;
}): Promise<void> {
  const { runtime, turnRecord } = input;
  const fingerprint = buildObservationFingerprint(turnRecord);
  const existingRecord = await readObservedRunnerTurnActivityRecord(
    runtime.nodeId,
    turnRecord.turnId
  );
  const nextRecord = observedRunnerTurnActivityRecordSchema.parse({
    consumedArtifactIds: turnRecord.consumedArtifactIds,
    conversationId: turnRecord.conversationId,
    ...(turnRecord.engineOutcome ? { engineOutcome: turnRecord.engineOutcome } : {}),
    emittedHandoffMessageIds: turnRecord.emittedHandoffMessageIds,
    ...(turnRecord.memorySynthesisOutcome
      ? { memorySynthesisOutcome: turnRecord.memorySynthesisOutcome }
      : {}),
    fingerprint,
    graphId: turnRecord.graphId,
    nodeId: runtime.nodeId,
    phase: turnRecord.phase,
    producedArtifactIds: turnRecord.producedArtifactIds,
    schemaVersion: "1",
    sessionId: turnRecord.sessionId,
    startedAt: turnRecord.startedAt,
    triggerKind: turnRecord.triggerKind,
    turnId: turnRecord.turnId,
    updatedAt: turnRecord.updatedAt
  });
  await writeJsonFileIfChanged(
    path.join(
      observedRunnerTurnActivityRoot,
      `${runtime.nodeId}--${turnRecord.turnId}.json`
    ),
    nextRecord
  );

  if (existingRecord?.fingerprint === nextRecord.fingerprint) {
    return;
  }

  await appendHostEvent({
    category: "runner",
    consumedArtifactIds: turnRecord.consumedArtifactIds,
    conversationId: turnRecord.conversationId,
    ...(turnRecord.engineOutcome ? { engineOutcome: turnRecord.engineOutcome } : {}),
    emittedHandoffMessageIds: turnRecord.emittedHandoffMessageIds,
    ...(turnRecord.memorySynthesisOutcome
      ? { memorySynthesisOutcome: turnRecord.memorySynthesisOutcome }
      : {}),
    graphId: turnRecord.graphId,
    message:
      `Runner turn '${turnRecord.turnId}' on node '${runtime.nodeId}' is now in phase ` +
      `'${turnRecord.phase}'.`,
    nodeId: runtime.nodeId,
    phase: turnRecord.phase,
    producedArtifactIds: turnRecord.producedArtifactIds,
    sessionId: turnRecord.sessionId,
    startedAt: turnRecord.startedAt,
    triggerKind: turnRecord.triggerKind,
    turnId: turnRecord.turnId,
    updatedAt: turnRecord.updatedAt,
    type: "runner.turn.updated"
  } satisfies RunnerTurnUpdatedEventInput);
}

async function synchronizeConversationActivityObservation(input: {
  conversationRecord: ConversationRecord;
  runtime: RuntimeInspectionResponse;
}): Promise<void> {
  const { conversationRecord, runtime } = input;
  const fingerprint = buildObservationFingerprint(conversationRecord);
  const existingRecord = await readObservedConversationActivityRecord(
    runtime.nodeId,
    conversationRecord.conversationId
  );
  const nextRecord = observedConversationActivityRecordSchema.parse({
    artifactIds: conversationRecord.artifactIds,
    conversationId: conversationRecord.conversationId,
    fingerprint,
    followupCount: conversationRecord.followupCount,
    graphId: conversationRecord.graphId,
    initiator: conversationRecord.initiator,
    lastMessageType: conversationRecord.lastMessageType,
    nodeId: runtime.nodeId,
    peerNodeId: conversationRecord.peerNodeId,
    schemaVersion: "1",
    sessionId: conversationRecord.sessionId,
    status: conversationRecord.status,
    updatedAt: conversationRecord.updatedAt
  });
  await writeJsonFileIfChanged(
    path.join(
      observedConversationActivityRoot,
      `${runtime.nodeId}--${conversationRecord.conversationId}.json`
    ),
    nextRecord
  );

  if (existingRecord?.fingerprint === nextRecord.fingerprint) {
    return;
  }

  await appendHostEvent({
    artifactIds: conversationRecord.artifactIds,
    category: "session",
    conversationId: conversationRecord.conversationId,
    followupCount: conversationRecord.followupCount,
    graphId: conversationRecord.graphId,
    initiator: conversationRecord.initiator,
    lastMessageType: conversationRecord.lastMessageType,
    message:
      `Conversation '${conversationRecord.conversationId}' on node '${runtime.nodeId}' ` +
      `is now '${conversationRecord.status}'.`,
    nodeId: runtime.nodeId,
    peerNodeId: conversationRecord.peerNodeId,
    sessionId: conversationRecord.sessionId,
    status: conversationRecord.status,
    type: "conversation.trace.event",
    updatedAt: conversationRecord.updatedAt
  } satisfies ConversationTraceEventInput);
}

async function synchronizeApprovalActivityObservation(input: {
  approvalRecord: ApprovalRecord;
  runtime: RuntimeInspectionResponse;
}): Promise<void> {
  const { approvalRecord, runtime } = input;
  const fingerprint = buildObservationFingerprint(approvalRecord);
  const existingRecord = await readObservedApprovalActivityRecord(
    runtime.nodeId,
    approvalRecord.approvalId
  );
  const nextRecord = observedApprovalActivityRecordSchema.parse({
    approvalId: approvalRecord.approvalId,
    approverNodeIds: approvalRecord.approverNodeIds,
    conversationId: approvalRecord.conversationId,
    fingerprint,
    graphId: approvalRecord.graphId,
    nodeId: runtime.nodeId,
    requestedAt: approvalRecord.requestedAt,
    requestedByNodeId: approvalRecord.requestedByNodeId,
    schemaVersion: "1",
    sessionId: approvalRecord.sessionId,
    status: approvalRecord.status,
    updatedAt: approvalRecord.updatedAt
  });
  await writeJsonFileIfChanged(
    path.join(
      observedApprovalActivityRoot,
      `${runtime.nodeId}--${approvalRecord.approvalId}.json`
    ),
    nextRecord
  );

  if (existingRecord?.fingerprint === nextRecord.fingerprint) {
    return;
  }

  await appendHostEvent({
    approvalId: approvalRecord.approvalId,
    approverNodeIds: approvalRecord.approverNodeIds,
    category: "session",
    conversationId: approvalRecord.conversationId,
    graphId: approvalRecord.graphId,
    message:
      `Approval '${approvalRecord.approvalId}' on node '${runtime.nodeId}' ` +
      `is now '${approvalRecord.status}'.`,
    nodeId: runtime.nodeId,
    requestedAt: approvalRecord.requestedAt,
    requestedByNodeId: approvalRecord.requestedByNodeId,
    sessionId: approvalRecord.sessionId,
    status: approvalRecord.status,
    type: "approval.trace.event",
    updatedAt: approvalRecord.updatedAt
  } satisfies ApprovalTraceEventInput);
}

function resolveArtifactObservationGraphId(input: {
  artifactRecord: ArtifactRecord;
  conversationsById: Map<string, ConversationRecord>;
  sessionsById: Map<string, SessionRecord>;
  turnsById: Map<string, RunnerTurnRecord>;
}): string | undefined {
  const artifactSessionId = input.artifactRecord.ref.sessionId;
  const artifactConversationId = input.artifactRecord.ref.conversationId;
  const turnRecord = input.artifactRecord.turnId
    ? input.turnsById.get(input.artifactRecord.turnId)
    : undefined;
  const conversationRecord = artifactConversationId
    ? input.conversationsById.get(artifactConversationId)
    : undefined;
  const sessionRecord = artifactSessionId
    ? input.sessionsById.get(artifactSessionId)
    : undefined;

  return (
    turnRecord?.graphId ??
    conversationRecord?.graphId ??
    sessionRecord?.graphId
  );
}

function buildArtifactTraceMessage(input: {
  artifactRecord: ArtifactRecord;
  runtime: RuntimeInspectionResponse;
}): string {
  const summary = [
    `lifecycle '${input.artifactRecord.ref.status ?? "unknown"}'`,
    `publication '${input.artifactRecord.publication?.state ?? "not_requested"}'`,
    ...(input.artifactRecord.retrieval
      ? [`retrieval '${input.artifactRecord.retrieval.state}'`]
      : [])
  ].join(", ");

  return (
    `Artifact '${input.artifactRecord.ref.artifactId}' on node '${input.runtime.nodeId}' ` +
    `changed trace state (${summary}).`
  );
}

async function synchronizeArtifactActivityObservation(input: {
  artifactRecord: ArtifactRecord;
  conversationsById: Map<string, ConversationRecord>;
  runtime: RuntimeInspectionResponse;
  sessionsById: Map<string, SessionRecord>;
  turnsById: Map<string, RunnerTurnRecord>;
}): Promise<void> {
  const { artifactRecord, runtime } = input;
  const fingerprint = buildObservationFingerprint({
    artifactRecord,
    graphId: resolveArtifactObservationGraphId(input)
  });
  const existingRecord = await readObservedArtifactActivityRecord(
    runtime.nodeId,
    artifactRecord.ref.artifactId
  );
  const turnRecord = artifactRecord.turnId
    ? input.turnsById.get(artifactRecord.turnId)
    : undefined;
  const nextRecord = observedArtifactActivityRecordSchema.parse({
    artifactId: artifactRecord.ref.artifactId,
    artifactKind: artifactRecord.ref.artifactKind,
    backend: artifactRecord.ref.backend,
    conversationId:
      artifactRecord.ref.conversationId ?? turnRecord?.conversationId,
    fingerprint,
    graphId: resolveArtifactObservationGraphId(input),
    lifecycleState: artifactRecord.ref.status,
    nodeId: runtime.nodeId,
    publicationState: artifactRecord.publication?.state,
    retrievalState: artifactRecord.retrieval?.state,
    schemaVersion: "1",
    sessionId: artifactRecord.ref.sessionId ?? turnRecord?.sessionId,
    turnId: artifactRecord.turnId,
    updatedAt: artifactRecord.updatedAt
  });
  await writeJsonFileIfChanged(
    path.join(
      observedArtifactActivityRoot,
      `${runtime.nodeId}--${artifactRecord.ref.artifactId}.json`
    ),
    nextRecord
  );

  if (existingRecord?.fingerprint === nextRecord.fingerprint) {
    return;
  }

  await appendHostEvent({
    artifactId: artifactRecord.ref.artifactId,
    artifactKind: artifactRecord.ref.artifactKind,
    backend: artifactRecord.ref.backend,
    category: "session",
    conversationId:
      artifactRecord.ref.conversationId ?? turnRecord?.conversationId,
    graphId: nextRecord.graphId,
    lifecycleState: artifactRecord.ref.status,
    message: buildArtifactTraceMessage({
      artifactRecord,
      runtime
    }),
    nodeId: runtime.nodeId,
    publicationState: artifactRecord.publication?.state,
    retrievalState: artifactRecord.retrieval?.state,
    sessionId: artifactRecord.ref.sessionId ?? turnRecord?.sessionId,
    turnId: artifactRecord.turnId,
    type: "artifact.trace.event",
    updatedAt: artifactRecord.updatedAt
  } satisfies ArtifactTraceEventInput);
}

async function synchronizeRuntimeActivityEvents(input: {
  runtimes: RuntimeInspectionResponse[];
}): Promise<void> {
  const activeApprovalActivityIds = new Set<string>();
  const activeArtifactActivityIds = new Set<string>();
  const activeConversationActivityIds = new Set<string>();
  const activeSessionActivityIds = new Set<string>();
  const activeTurnActivityIds = new Set<string>();

  for (const runtime of input.runtimes) {
    if (!runtime.contextAvailable || !runtime.contextPath) {
      continue;
    }

    const context = effectiveRuntimeContextSchema.parse(
      await readJsonFile(runtime.contextPath)
    );
    const [
      approvalRecords,
      artifactRecords,
      conversationRecords,
      sessionRecords,
      turnRecords
    ] = await Promise.all([
      listRuntimeApprovalRecords(context.workspace.runtimeRoot),
      listRuntimeArtifactRecords(context.workspace.runtimeRoot),
      listRuntimeConversationRecords(context.workspace.runtimeRoot),
      listRuntimeSessionRecords(context.workspace.runtimeRoot),
      listRuntimeTurnRecords(context.workspace.runtimeRoot)
    ]);
    const sessionsById = new Map(
      sessionRecords.map((sessionRecord) => [
        sessionRecord.sessionId,
        sessionRecord
      ])
    );
    const conversationsById = new Map(
      conversationRecords.map((conversationRecord) => [
        conversationRecord.conversationId,
        conversationRecord
      ])
    );
    const turnsById = new Map(
      turnRecords.map((turnRecord) => [turnRecord.turnId, turnRecord])
    );

    for (const sessionRecord of sessionRecords) {
      activeSessionActivityIds.add(`${runtime.nodeId}--${sessionRecord.sessionId}`);
      await synchronizeSessionActivityObservation({
        approvalRecords: approvalRecords.filter(
          (approvalRecord) => approvalRecord.sessionId === sessionRecord.sessionId
        ),
        conversationRecords: conversationRecords.filter(
          (conversationRecord) =>
            conversationRecord.sessionId === sessionRecord.sessionId
        ),
        runtime,
        sessionRecord
      });
    }

    for (const conversationRecord of conversationRecords) {
      activeConversationActivityIds.add(
        `${runtime.nodeId}--${conversationRecord.conversationId}`
      );
      await synchronizeConversationActivityObservation({
        conversationRecord,
        runtime
      });
    }

    for (const approvalRecord of approvalRecords) {
      activeApprovalActivityIds.add(`${runtime.nodeId}--${approvalRecord.approvalId}`);
      await synchronizeApprovalActivityObservation({
        approvalRecord,
        runtime
      });
    }

    for (const turnRecord of turnRecords) {
      activeTurnActivityIds.add(`${runtime.nodeId}--${turnRecord.turnId}`);
      await synchronizeRunnerTurnActivityObservation({
        runtime,
        turnRecord
      });
    }

    for (const artifactRecord of artifactRecords) {
      activeArtifactActivityIds.add(
        `${runtime.nodeId}--${artifactRecord.ref.artifactId}`
      );
      await synchronizeArtifactActivityObservation({
        artifactRecord,
        conversationsById,
        runtime,
        sessionsById,
        turnsById
      });
    }
  }

  await removeJsonFilesExcept(observedApprovalActivityRoot, activeApprovalActivityIds);
  await removeJsonFilesExcept(observedArtifactActivityRoot, activeArtifactActivityIds);
  await removeJsonFilesExcept(
    observedConversationActivityRoot,
    activeConversationActivityIds
  );
  await removeJsonFilesExcept(observedSessionActivityRoot, activeSessionActivityIds);
  await removeJsonFilesExcept(observedRunnerTurnActivityRoot, activeTurnActivityIds);
}

async function pruneRuntimeRecoveryHistory(
  nodeId: string,
  maxEntries = 50
): Promise<void> {
  const records = await listRuntimeRecoveryRecords({
    nodeId
  });

  if (records.length <= maxEntries) {
    return;
  }

  await Promise.all(
    records.slice(maxEntries).map((record) =>
      rm(
        path.join(runtimeRecoveryHistoryNodeRoot(nodeId), `${record.recoveryId}.json`),
        { force: true }
      )
    )
  );
}

async function synchronizeRuntimeRecoveryHistory(input: {
  inspection: RuntimeInspectionResponse;
  lastError: string | undefined;
}): Promise<void> {
  const comparable = buildRuntimeRecoveryComparable(input);
  const fingerprint = buildObservationFingerprint(comparable);
  const latestRecord = await readLatestRuntimeRecoveryRecord(input.inspection.nodeId);
  const latestFingerprint = latestRecord
    ? buildObservationFingerprint(
        buildRuntimeRecoveryComparable({
          inspection: latestRecord.runtime,
          lastError: latestRecord.lastError
        })
      )
    : undefined;

  if (latestFingerprint === fingerprint) {
    return;
  }

  const recordedAt = nowIsoString();
  const record = runtimeRecoveryRecordSchema.parse({
    ...(input.lastError ? { lastError: input.lastError } : {}),
    recordedAt,
    recoveryId: buildRuntimeRecoveryRecordId({
      fingerprint,
      nodeId: input.inspection.nodeId,
      recordedAt
    }),
    runtime: input.inspection
  });

  await writeJsonFile(
    path.join(
      runtimeRecoveryHistoryNodeRoot(input.inspection.nodeId),
      `${record.recoveryId}.json`
    ),
    record
  );
  await pruneRuntimeRecoveryHistory(input.inspection.nodeId);
  await appendHostEvent({
    category: "runtime",
    desiredState: record.runtime.desiredState,
    graphId: record.runtime.graphId,
    graphRevisionId: record.runtime.graphRevisionId,
    ...(record.lastError ? { lastError: record.lastError } : {}),
    message:
      `Runtime '${record.runtime.nodeId}' recorded a recovery snapshot in observed state ` +
      `'${record.runtime.observedState}'.`,
    nodeId: record.runtime.nodeId,
    observedState: record.runtime.observedState,
    recordedAt: record.recordedAt,
    recoveryId: record.recoveryId,
    restartGeneration: record.runtime.restartGeneration,
    type: "runtime.recovery.recorded"
  } satisfies RuntimeRecoveryRecordedEventInput);
}

function didRuntimeRecoveryPolicyChange(
  previous: RuntimeRecoveryPolicyRecord | undefined,
  next: RuntimeRecoveryPolicyRecord
): boolean {
  return !previous || JSON.stringify(previous.policy) !== JSON.stringify(next.policy);
}

function createRuntimeRecoveryPolicyRecord(input: {
  existingRecord: RuntimeRecoveryPolicyRecord | undefined;
  nodeId: string;
  policy: RuntimeRecoveryPolicy;
}): RuntimeRecoveryPolicyRecord {
  const isEquivalentToExisting =
    input.existingRecord &&
    JSON.stringify(input.existingRecord.policy) === JSON.stringify(input.policy);

  return runtimeRecoveryPolicyRecordSchema.parse({
    nodeId: input.nodeId,
    policy: input.policy,
    schemaVersion: "1",
    updatedAt:
      isEquivalentToExisting && input.existingRecord
        ? input.existingRecord.updatedAt
        : nowIsoString()
  });
}

function createRuntimeRecoveryControllerRecord(input: {
  activeFailureFingerprint?: string;
  attemptsUsed: number;
  existingRecord: RuntimeRecoveryControllerRecord | undefined;
  graphId?: string;
  graphRevisionId?: string;
  lastAttemptedAt?: string;
  lastFailureAt?: string;
  nextEligibleAt?: string;
  nodeId: string;
  state: RuntimeRecoveryControllerRecord["state"];
}): RuntimeRecoveryControllerRecord {
  const nextRecord = runtimeRecoveryControllerRecordSchema.parse({
    ...(input.activeFailureFingerprint
      ? { activeFailureFingerprint: input.activeFailureFingerprint }
      : {}),
    attemptsUsed: input.attemptsUsed,
    ...(input.graphId ? { graphId: input.graphId } : {}),
    ...(input.graphRevisionId ? { graphRevisionId: input.graphRevisionId } : {}),
    ...(input.lastAttemptedAt ? { lastAttemptedAt: input.lastAttemptedAt } : {}),
    ...(input.lastFailureAt ? { lastFailureAt: input.lastFailureAt } : {}),
    ...(input.nextEligibleAt ? { nextEligibleAt: input.nextEligibleAt } : {}),
    nodeId: input.nodeId,
    schemaVersion: "1",
    state: input.state,
    updatedAt: nowIsoString()
  });

  if (!input.existingRecord) {
    return nextRecord;
  }

  const comparableNext = {
    ...nextRecord,
    updatedAt: ""
  };
  const comparableExisting = {
    ...input.existingRecord,
    updatedAt: ""
  };

  if (JSON.stringify(comparableExisting) === JSON.stringify(comparableNext)) {
    return runtimeRecoveryControllerRecordSchema.parse({
      ...nextRecord,
      updatedAt: input.existingRecord.updatedAt
    });
  }

  return nextRecord;
}

function isTrivialIdleRuntimeRecoveryControllerRecord(
  record: RuntimeRecoveryControllerRecord | undefined
): boolean {
  if (!record) {
    return true;
  }

  return (
    record.state === "idle" &&
    record.attemptsUsed === 0 &&
    record.activeFailureFingerprint === undefined &&
    record.lastAttemptedAt === undefined &&
    record.lastFailureAt === undefined &&
    record.nextEligibleAt === undefined
  );
}

function didRuntimeRecoveryControllerChange(
  previous: RuntimeRecoveryControllerRecord | undefined,
  next: RuntimeRecoveryControllerRecord
): boolean {
  if (!previous) {
    return !isTrivialIdleRuntimeRecoveryControllerRecord(next);
  }

  const comparablePrevious = {
    ...previous,
    updatedAt: ""
  };
  const comparableNext = {
    ...next,
    updatedAt: ""
  };

  return JSON.stringify(comparablePrevious) !== JSON.stringify(comparableNext);
}

function buildEmptyConversationStatusCounts(): ConversationStatusCounts {
  return conversationStatusCountsSchema.parse(
    Object.fromEntries(
      conversationLifecycleStateSchema.options.map((status) => [status, 0])
    )
  );
}

function countConversationStatuses(
  conversationRecords: ConversationRecord[]
): ConversationStatusCounts {
  const counts = buildEmptyConversationStatusCounts();

  for (const conversationRecord of conversationRecords) {
    counts[conversationRecord.status] += 1;
  }

  return conversationStatusCountsSchema.parse(counts);
}

function mergeConversationStatusCounts(
  statusCounts: Array<ConversationStatusCounts | undefined>
): ConversationStatusCounts {
  const mergedCounts = buildEmptyConversationStatusCounts();

  for (const counts of statusCounts) {
    if (!counts) {
      continue;
    }

    for (const status of conversationLifecycleStateSchema.options) {
      mergedCounts[status] += counts[status];
    }
  }

  return conversationStatusCountsSchema.parse(mergedCounts);
}

function buildEmptyApprovalStatusCounts(): ApprovalStatusCounts {
  return approvalStatusCountsSchema.parse({});
}

function countApprovalStatuses(
  approvalRecords: ApprovalRecord[]
): ApprovalStatusCounts {
  const counts = buildEmptyApprovalStatusCounts();

  for (const approvalRecord of approvalRecords) {
    counts[approvalRecord.status] += 1;
  }

  return approvalStatusCountsSchema.parse(counts);
}

function mergeApprovalStatusCounts(
  statusCounts: Array<ApprovalStatusCounts | undefined>
): ApprovalStatusCounts {
  const mergedCounts = buildEmptyApprovalStatusCounts();

  for (const counts of statusCounts) {
    if (!counts) {
      continue;
    }

    for (const status of approvalLifecycleStateSchema.options) {
      mergedCounts[status] += counts[status];
    }
  }

  return approvalStatusCountsSchema.parse(mergedCounts);
}

function groupConversationRecordsBySessionId(
  conversationRecords: ConversationRecord[]
): Map<string, ConversationRecord[]> {
  const recordsBySessionId = new Map<string, ConversationRecord[]>();

  for (const conversationRecord of conversationRecords) {
    const records = recordsBySessionId.get(conversationRecord.sessionId) ?? [];
    records.push(conversationRecord);
    recordsBySessionId.set(conversationRecord.sessionId, records);
  }

  return recordsBySessionId;
}

function groupApprovalRecordsBySessionId(
  approvalRecords: ApprovalRecord[]
): Map<string, ApprovalRecord[]> {
  const recordsBySessionId = new Map<string, ApprovalRecord[]>();

  for (const approvalRecord of approvalRecords) {
    const records = recordsBySessionId.get(approvalRecord.sessionId) ?? [];
    records.push(approvalRecord);
    recordsBySessionId.set(approvalRecord.sessionId, records);
  }

  return recordsBySessionId;
}

function hasOpenConversationStatusForHostDiagnostics(
  conversationRecord: ConversationRecord
): boolean {
  return !["closed", "expired", "rejected", "resolved"].includes(
    conversationRecord.status
  );
}

function buildSessionConsistencyFinding(
  input: HostSessionConsistencyFinding
): HostSessionConsistencyFinding {
  return hostSessionConsistencyFindingSchema.parse(input);
}

function sortSessionConsistencyFindings(
  findings: HostSessionConsistencyFinding[]
): HostSessionConsistencyFinding[] {
  return [...findings].sort((left, right) => {
    const nodeOrdering = left.nodeId.localeCompare(right.nodeId);

    if (nodeOrdering !== 0) {
      return nodeOrdering;
    }

    const conversationOrdering = (left.conversationId ?? "").localeCompare(
      right.conversationId ?? ""
    );

    if (conversationOrdering !== 0) {
      return conversationOrdering;
    }

    const approvalOrdering = (left.approvalId ?? "").localeCompare(
      right.approvalId ?? ""
    );

    if (approvalOrdering !== 0) {
      return approvalOrdering;
    }

    return left.code.localeCompare(right.code);
  });
}

function inspectSessionConsistency(input: {
  approvalRecords: ApprovalRecord[];
  conversationRecords: ConversationRecord[];
  nodeId: string;
  sessionRecord: SessionRecord;
}): HostSessionConsistencyFinding[] {
  const conversationRecordsById = new Map(
    input.conversationRecords.map((conversationRecord) => [
      conversationRecord.conversationId,
      conversationRecord
    ])
  );
  const activeConversationIds = new Set(
    input.sessionRecord.activeConversationIds
  );
  const openConversationRecords = input.conversationRecords.filter(
    hasOpenConversationStatusForHostDiagnostics
  );
  const approvalRecordsById = new Map(
    input.approvalRecords.map((approvalRecord) => [
      approvalRecord.approvalId,
      approvalRecord
    ])
  );
  const waitingApprovalIds = new Set(input.sessionRecord.waitingApprovalIds);
  const pendingApprovalRecords = input.approvalRecords.filter(
    (approvalRecord) => approvalRecord.status === "pending"
  );
  const findings: HostSessionConsistencyFinding[] = [];

  if (
    input.sessionRecord.status === "active" &&
    activeConversationIds.size === 0 &&
    openConversationRecords.length === 0
  ) {
    findings.push(
      buildSessionConsistencyFinding({
        code: "active_session_without_open_conversations",
        message:
          `Session '${input.sessionRecord.sessionId}' on node '${input.nodeId}' ` +
          "is active but has no active conversation ids and no open " +
          "conversation records.",
        nodeId: input.nodeId,
        severity: "warning"
      })
    );
  }

  for (const conversationId of input.sessionRecord.activeConversationIds) {
    const conversationRecord = conversationRecordsById.get(conversationId);

    if (!conversationRecord) {
      findings.push(
        buildSessionConsistencyFinding({
          code: "active_conversation_missing_record",
          conversationId,
          message:
            `Session '${input.sessionRecord.sessionId}' on node '${input.nodeId}' ` +
            `references active conversation '${conversationId}', but no ` +
            "conversation record exists.",
          nodeId: input.nodeId,
          severity: "error"
        })
      );
      continue;
    }

    if (!hasOpenConversationStatusForHostDiagnostics(conversationRecord)) {
      findings.push(
        buildSessionConsistencyFinding({
          code: "terminal_conversation_still_active",
          conversationId,
          message:
            `Session '${input.sessionRecord.sessionId}' on node '${input.nodeId}' ` +
            `still references conversation '${conversationId}' as active ` +
            `after it reached '${conversationRecord.status}'.`,
          nodeId: input.nodeId,
          severity: "error"
        })
      );
    }
  }

  for (const conversationRecord of openConversationRecords) {
    if (
      !activeConversationIds.has(conversationRecord.conversationId)
    ) {
      findings.push(
        buildSessionConsistencyFinding({
          code: "open_conversation_missing_active_reference",
          conversationId: conversationRecord.conversationId,
          message:
            `Session '${input.sessionRecord.sessionId}' on node '${input.nodeId}' ` +
            `has open conversation '${conversationRecord.conversationId}' in ` +
            `'${conversationRecord.status}' but it is missing from ` +
            "activeConversationIds.",
          nodeId: input.nodeId,
          severity: "warning"
        })
      );
    }
  }

  for (const approvalId of input.sessionRecord.waitingApprovalIds) {
    const approvalRecord = approvalRecordsById.get(approvalId);

    if (!approvalRecord) {
      findings.push(
        buildSessionConsistencyFinding({
          approvalId,
          code: "waiting_approval_missing_record",
          message:
            `Session '${input.sessionRecord.sessionId}' on node '${input.nodeId}' ` +
            `references waiting approval '${approvalId}', but no approval ` +
            "record exists.",
          nodeId: input.nodeId,
          severity: "error"
        })
      );
      continue;
    }

    if (approvalRecord.status !== "pending") {
      findings.push(
        buildSessionConsistencyFinding({
          approvalId,
          code: "waiting_approval_not_pending",
          message:
            `Session '${input.sessionRecord.sessionId}' on node '${input.nodeId}' ` +
            `is still waiting on approval '${approvalId}', but that approval ` +
            `record is '${approvalRecord.status}'.`,
          nodeId: input.nodeId,
          severity: "warning"
        })
      );
    }
  }

  for (const approvalRecord of pendingApprovalRecords) {
    if (!waitingApprovalIds.has(approvalRecord.approvalId)) {
      findings.push(
        buildSessionConsistencyFinding({
          approvalId: approvalRecord.approvalId,
          code: "pending_approval_missing_waiting_reference",
          message:
            `Session '${input.sessionRecord.sessionId}' on node '${input.nodeId}' ` +
            `has pending approval '${approvalRecord.approvalId}', but it is ` +
            "missing from waitingApprovalIds.",
          nodeId: input.nodeId,
          severity: "warning"
        })
      );
    }
  }

  if (
    input.sessionRecord.status === "waiting_approval" &&
    !input.sessionRecord.waitingApprovalIds.some(
      (approvalId) => approvalRecordsById.get(approvalId)?.status === "pending"
    )
  ) {
    findings.push(
      buildSessionConsistencyFinding({
        code: "waiting_approval_session_without_pending_approval",
        message:
          `Session '${input.sessionRecord.sessionId}' on node '${input.nodeId}' ` +
          "is waiting for approval but has no pending approval record in its " +
          "waitingApprovalIds set.",
        nodeId: input.nodeId,
        severity: "error"
      })
    );
  }

  return sortSessionConsistencyFindings(findings);
}

async function collectSessionInspectionNodes(): Promise<
  Map<string, SessionInspectionResponse["nodes"]>
> {
  const { runtimes } = await synchronizeCurrentGraphRuntimeState();
  const sessions = new Map<string, SessionInspectionResponse["nodes"]>();

  for (const runtime of runtimes) {
    if (!runtime.contextAvailable || !runtime.contextPath) {
      continue;
    }

    const context = effectiveRuntimeContextSchema.parse(
      await readJsonFile(runtime.contextPath)
    );
    const sessionRecords = await listRuntimeSessionRecords(
      context.workspace.runtimeRoot
    );
    const approvalRecordsBySessionId = groupApprovalRecordsBySessionId(
      await listRuntimeApprovalRecords(context.workspace.runtimeRoot)
    );
    const conversationRecordsBySessionId = groupConversationRecordsBySessionId(
      await listRuntimeConversationRecords(context.workspace.runtimeRoot)
    );

    for (const sessionRecord of sessionRecords) {
      const entries = sessions.get(sessionRecord.sessionId) ?? [];
      const approvalRecords =
        approvalRecordsBySessionId.get(sessionRecord.sessionId) ?? [];
      const conversationRecords =
        conversationRecordsBySessionId.get(sessionRecord.sessionId) ?? [];
      const sessionConsistencyFindings =
        inspectSessionConsistency({
          approvalRecords,
          conversationRecords,
          nodeId: runtime.nodeId,
          sessionRecord
        });
      entries.push({
        approvalStatusCounts: countApprovalStatuses(approvalRecords),
        conversationStatusCounts: countConversationStatuses(conversationRecords),
        nodeId: runtime.nodeId,
        runtime,
        ...(sessionConsistencyFindings.length > 0
          ? { sessionConsistencyFindings }
          : {}),
        session: sessionRecord
      });
      sessions.set(sessionRecord.sessionId, entries);
    }
  }

  for (const entries of sessions.values()) {
    entries.sort((left, right) => left.nodeId.localeCompare(right.nodeId));
  }

  return sessions;
}

function buildSessionSummary(
  sessionId: string,
  nodes: SessionInspectionResponse["nodes"]
) {
  const [firstNode] = nodes;

  if (!firstNode) {
    throw new Error(
      `Cannot build a host session summary for session '${sessionId}' without any node records.`
    );
  }

  const graphIds = new Set(nodes.map((entry) => entry.session.graphId));

  if (graphIds.size !== 1) {
    throw new Error(
      `Session '${sessionId}' contains inconsistent graph ids across node-owned session records.`
    );
  }

  const activeConversationIds = uniqueSortedIdentifiers(
    nodes.flatMap((entry) => entry.session.activeConversationIds)
  );
  const rootArtifactIds = uniqueSortedIdentifiers(
    nodes.flatMap((entry) => entry.session.rootArtifactIds)
  );
  const traceIds = uniqueSortedIdentifiers(
    nodes.map((entry) => entry.session.traceId)
  );
  const waitingApprovalIds = uniqueSortedIdentifiers(
    nodes.flatMap((entry) => entry.session.waitingApprovalIds)
  );
  const latestMessageType = resolveLatestSessionMessageType(nodes);
  const approvalStatusCounts = mergeApprovalStatusCounts(
    nodes.map((entry) => entry.approvalStatusCounts)
  );
  const conversationStatusCounts = mergeConversationStatusCounts(
    nodes.map((entry) => entry.conversationStatusCounts)
  );
  const sessionConsistencyFindings = sortSessionConsistencyFindings(
    nodes.flatMap((entry) => entry.sessionConsistencyFindings ?? [])
  );

  const summaryInput = {
    activeConversationIds,
    approvalStatusCounts,
    conversationStatusCounts,
    graphId: firstNode.session.graphId,
    nodeIds: nodes.map((entry) => entry.nodeId),
    nodeStatuses: nodes.map((entry) => ({
      nodeId: entry.nodeId,
      status: entry.session.status
    })),
    rootArtifactIds,
    ...(sessionConsistencyFindings.length > 0
      ? { sessionConsistencyFindings }
      : {}),
    sessionId,
    traceIds,
    waitingApprovalIds,
    updatedAt: nodes
      .map((entry) => entry.session.updatedAt)
      .sort((left, right) => right.localeCompare(left))[0]
  };

  return hostSessionSummarySchema.parse(
    latestMessageType
      ? {
          ...summaryInput,
          latestMessageType
        }
      : summaryInput
  );
}

function uniqueSortedIdentifiers(values: string[]): string[] {
  return Array.from(new Set(values)).sort();
}

function resolveLatestSessionMessageType(
  nodes: SessionInspectionResponse["nodes"]
): SessionRecord["lastMessageType"] {
  return [...nodes]
    .filter((entry) => entry.session.lastMessageType)
    .sort((left, right) =>
      right.session.updatedAt.localeCompare(left.session.updatedAt)
    )[0]?.session.lastMessageType;
}

export async function listSessions(): Promise<SessionListResponse> {
  const sessions = await collectSessionInspectionNodes();
  const summaries = Array.from(sessions.entries())
    .map(([sessionId, nodes]) => buildSessionSummary(sessionId, nodes))
    .sort((left, right) => {
      const updatedAtOrdering = right.updatedAt.localeCompare(left.updatedAt);

      if (updatedAtOrdering !== 0) {
        return updatedAtOrdering;
      }

      return left.sessionId.localeCompare(right.sessionId);
    });

  return sessionListResponseSchema.parse({
    sessions: summaries
  });
}

export async function getSessionInspection(
  sessionId: string
): Promise<SessionInspectionResponse | null> {
  const sessions = await collectSessionInspectionNodes();
  const nodes = sessions.get(sessionId);

  if (!nodes || nodes.length === 0) {
    return null;
  }

  const [firstNode] = nodes;

  if (!firstNode) {
    return null;
  }

  const graphIds = new Set(nodes.map((entry) => entry.session.graphId));

  if (graphIds.size !== 1) {
    throw new Error(
      `Session '${sessionId}' contains inconsistent graph ids across node-owned session records.`
    );
  }

  return sessionInspectionResponseSchema.parse({
    graphId: firstNode.session.graphId,
    nodes,
    sessionId
  });
}

async function applyValidatedGraphDocument(graph: GraphSpec): Promise<{
  activeRevisionId: string;
  graph: GraphSpec;
  nodes: NodeInspectionResponse[];
  runtimes: RuntimeInspectionResponse[];
}> {
  const activeRevisionId = buildGraphRevisionId(graph.graphId);
  const revisionRecord = activeGraphRevisionRecordSchema.parse({
    activeRevisionId,
    appliedAt: nowIsoString()
  });

  await writeJsonFile(currentGraphPath, graph);
  await writeJsonFile(
    path.join(graphRevisionsRoot, `${activeRevisionId}.json`),
    graphRevisionRecordSchema.parse({
      appliedAt: revisionRecord.appliedAt,
      graph,
      revisionId: activeRevisionId
    })
  );
  await writeJsonFile(activeGraphRevisionPath, revisionRecord);
  const synchronizedState = await synchronizeCurrentGraphRuntimeState();
  await appendHostEvent({
    activeRevisionId,
    category: "control_plane",
    graphId: graph.graphId,
    message: `Applied graph '${graph.graphId}' as revision '${activeRevisionId}'.`,
    type: "graph.revision.applied"
  } satisfies GraphRevisionAppliedEventInput);

  return {
    activeRevisionId,
    graph,
    nodes: synchronizedState.nodes,
    runtimes: synchronizedState.runtimes
  };
}

function buildManagedNodeMissingGraphConflict(): ManagedNodeMutationConflict {
  return {
    kind: "graph_missing",
    message: "Managed node mutation requires an active graph revision."
  };
}

function findManagedNode(graph: GraphSpec, nodeId: string): NodeBinding | undefined {
  return graph.nodes.find(
    (candidate) => candidate.nodeId === nodeId && candidate.nodeKind !== "user"
  );
}

function buildEdgeMissingGraphConflict(): EdgeMutationConflict {
  return {
    kind: "graph_missing",
    message: "Edge mutation requires an active graph revision."
  };
}

function findEdge(graph: GraphSpec, edgeId: string): Edge | undefined {
  return graph.edges.find((candidate) => candidate.edgeId === edgeId);
}

async function applyNodeGraphCandidate(input: {
  candidateGraph: GraphSpec;
  nodeId: string;
  mutationKind: "created" | "deleted" | "replaced";
}): Promise<
  | {
      activeRevisionId: string;
      graph: GraphSpec;
      node: NodeInspectionResponse | undefined;
      validation: GraphMutationResponse["validation"];
    }
  | {
      validation: GraphMutationResponse["validation"];
    }
> {
  const candidate = await validateGraphCandidate(input.candidateGraph);

  if (!candidate.validation.ok || !candidate.graph) {
    return {
      validation: candidate.validation
    };
  }

  const applied = await applyValidatedGraphDocument(candidate.graph);
  const node = applied.nodes.find(
    (inspection) => inspection.binding.node.nodeId === input.nodeId
  );

  if (input.mutationKind !== "deleted" && !node) {
    throw new Error(
      `Managed node '${input.nodeId}' was not materialized after a successful '${input.mutationKind}' mutation.`
    );
  }

  await appendHostEvent({
    activeRevisionId: applied.activeRevisionId,
    category: "control_plane",
    graphId: applied.graph.graphId,
    message:
      input.mutationKind === "deleted"
        ? `Deleted managed node '${input.nodeId}' in graph '${applied.graph.graphId}'.`
        : `${input.mutationKind === "created" ? "Created" : "Replaced"} managed node '${input.nodeId}' in graph '${applied.graph.graphId}'.`,
    mutationKind: input.mutationKind,
    nodeId: input.nodeId,
    type: "node.binding.updated"
  } satisfies NodeBindingUpdatedEventInput);

  return {
    activeRevisionId: applied.activeRevisionId,
    graph: applied.graph,
    node,
    validation: candidate.validation
  };
}

async function applyEdgeGraphCandidate(input: {
  candidateGraph: GraphSpec;
  edgeId: string;
  mutationKind: "created" | "deleted" | "replaced";
}): Promise<
  | {
      activeRevisionId: string;
      edge: Edge | undefined;
      graph: GraphSpec;
      validation: GraphMutationResponse["validation"];
    }
  | {
      validation: GraphMutationResponse["validation"];
    }
> {
  const candidate = await validateGraphCandidate(input.candidateGraph);

  if (!candidate.validation.ok || !candidate.graph) {
    return {
      validation: candidate.validation
    };
  }

  const applied = await applyValidatedGraphDocument(candidate.graph);
  const edge = applied.graph.edges.find(
    (inspection) => inspection.edgeId === input.edgeId
  );

  if (input.mutationKind !== "deleted" && !edge) {
    throw new Error(
      `Edge '${input.edgeId}' was not materialized after a successful '${input.mutationKind}' mutation.`
    );
  }

  await appendHostEvent({
    activeRevisionId: applied.activeRevisionId,
    category: "control_plane",
    edgeId: input.edgeId,
    graphId: applied.graph.graphId,
    message:
      input.mutationKind === "deleted"
        ? `Deleted edge '${input.edgeId}' in graph '${applied.graph.graphId}'.`
        : `${input.mutationKind === "created" ? "Created" : "Replaced"} edge '${input.edgeId}' in graph '${applied.graph.graphId}'.`,
    mutationKind: input.mutationKind,
    type: "edge.updated"
  } satisfies EdgeUpdatedEventInput);

  return {
    activeRevisionId: applied.activeRevisionId,
    edge,
    graph: applied.graph,
    validation: candidate.validation
  };
}

function buildManagedNodeMutationSuccessResponse(input: {
  applied:
    | {
        activeRevisionId: string;
        graph: GraphSpec;
        node: NodeInspectionResponse | undefined;
        validation: GraphMutationResponse["validation"];
      }
    | {
        validation: GraphMutationResponse["validation"];
      };
}): NodeMutationResponse {
  return nodeMutationResponseSchema.parse({
    activeRevisionId:
      "activeRevisionId" in input.applied ? input.applied.activeRevisionId : undefined,
    node: "node" in input.applied ? input.applied.node : undefined,
    validation: input.applied.validation
  });
}

function buildEdgeMutationSuccessResponse(input: {
  applied:
    | {
        activeRevisionId: string;
        edge: Edge | undefined;
        graph: GraphSpec;
        validation: GraphMutationResponse["validation"];
      }
    | {
        validation: GraphMutationResponse["validation"];
      };
}): EdgeMutationResponse {
  return edgeMutationResponseSchema.parse({
    activeRevisionId:
      "activeRevisionId" in input.applied ? input.applied.activeRevisionId : undefined,
    edge: "edge" in input.applied ? input.applied.edge : undefined,
    validation: input.applied.validation
  });
}

function buildManagedNodeDeletionSuccessResponse(input: {
  applied:
    | {
        activeRevisionId: string;
        graph: GraphSpec;
        node: NodeInspectionResponse | undefined;
        validation: GraphMutationResponse["validation"];
      }
    | {
        validation: GraphMutationResponse["validation"];
      };
  nodeId: string;
}): NodeDeletionResponse {
  return nodeDeletionResponseSchema.parse({
    activeRevisionId:
      "activeRevisionId" in input.applied ? input.applied.activeRevisionId : undefined,
    deletedNodeId: "activeRevisionId" in input.applied ? input.nodeId : undefined,
    validation: input.applied.validation
  });
}

function buildEdgeDeletionSuccessResponse(input: {
  applied:
    | {
        activeRevisionId: string;
        edge: Edge | undefined;
        graph: GraphSpec;
        validation: GraphMutationResponse["validation"];
      }
    | {
        validation: GraphMutationResponse["validation"];
      };
  edgeId: string;
}): EdgeDeletionResponse {
  return edgeDeletionResponseSchema.parse({
    activeRevisionId:
      "activeRevisionId" in input.applied ? input.applied.activeRevisionId : undefined,
    deletedEdgeId: "activeRevisionId" in input.applied ? input.edgeId : undefined,
    validation: input.applied.validation
  });
}

export async function setRuntimeDesiredState(
  nodeId: string,
  desiredState: RuntimeDesiredState
): Promise<RuntimeInspectionResponse | null> {
  const inspection = await getRuntimeInspection(nodeId);

  if (!inspection) {
    return null;
  }

  const existingIntent = await readRuntimeIntentRecord(nodeId);
  const intent = createRuntimeIntentRecord({
    desiredState,
    existingIntent,
    graphId: inspection.graphId,
    graphRevisionId: inspection.graphRevisionId,
    nodeId,
    reason: desiredState === "stopped" ? "stopped_by_operator" : undefined,
    restartGeneration: existingIntent?.restartGeneration ?? inspection.restartGeneration
  });
  await writeJsonFile(path.join(runtimeIntentsRoot, `${nodeId}.json`), intent);

  const { runtimes } = await synchronizeCurrentGraphRuntimeState();
  return runtimes.find((runtime) => runtime.nodeId === nodeId) ?? null;
}

export async function restartRuntime(
  nodeId: string
): Promise<RuntimeInspectionResponse | null> {
  const inspection = await getRuntimeInspection(nodeId);

  if (!inspection) {
    return null;
  }

  const existingIntent = await readRuntimeIntentRecord(nodeId);
  const nextRestartGeneration =
    Math.max(
      existingIntent?.restartGeneration ?? 0,
      inspection.restartGeneration
    ) + 1;
  const intent = createRuntimeIntentRecord({
    desiredState: "running",
    existingIntent,
    graphId: inspection.graphId,
    graphRevisionId: inspection.graphRevisionId,
    nodeId,
    reason: undefined,
    restartGeneration: nextRestartGeneration
  });
  await writeJsonFile(path.join(runtimeIntentsRoot, `${nodeId}.json`), intent);
  await appendHostEvent({
    category: "runtime",
    graphId: inspection.graphId,
    graphRevisionId: inspection.graphRevisionId,
    message:
      `Runtime '${nodeId}' restart was requested with generation '${nextRestartGeneration}'.`,
    nodeId,
    previousRestartGeneration: existingIntent?.restartGeneration ?? inspection.restartGeneration,
    restartGeneration: nextRestartGeneration,
    type: "runtime.restart.requested"
  } satisfies RuntimeRestartRequestedEventInput);

  const { runtimes } = await synchronizeCurrentGraphRuntimeState();
  return runtimes.find((runtime) => runtime.nodeId === nodeId) ?? null;
}

export async function setRuntimeRecoveryPolicy(input: {
  nodeId: string;
  policy: RuntimeRecoveryPolicy;
}): Promise<RuntimeRecoveryInspectionResponse | null> {
  const inspection = await getRuntimeInspection(input.nodeId);

  if (!inspection) {
    return null;
  }

  const existingPolicyRecord = await readRuntimeRecoveryPolicyRecord(input.nodeId);
  const nextPolicyRecord = createRuntimeRecoveryPolicyRecord({
    existingRecord: existingPolicyRecord,
    nodeId: input.nodeId,
    policy: input.policy
  });
  await writeJsonFile(
    runtimeRecoveryPolicyRecordPath(input.nodeId),
    nextPolicyRecord
  );

  if (didRuntimeRecoveryPolicyChange(existingPolicyRecord, nextPolicyRecord)) {
    await appendHostEvent({
      category: "runtime",
      graphId: inspection.graphId,
      graphRevisionId: inspection.graphRevisionId,
      message:
        `Runtime '${input.nodeId}' recovery policy is now '${nextPolicyRecord.policy.mode}'.`,
      nodeId: input.nodeId,
      policy: nextPolicyRecord.policy,
      previousPolicy: existingPolicyRecord?.policy,
      type: "runtime.recovery_policy.updated"
    } satisfies RuntimeRecoveryPolicyUpdatedEventInput);
  }

  return getRuntimeRecoveryInspection({
    nodeId: input.nodeId
  });
}

export async function applyGraph(input: unknown): Promise<GraphMutationResponse> {
  const candidate = await validateGraphCandidate(input);

  if (!candidate.validation.ok || !candidate.graph) {
    return candidate;
  }
  const applied = await applyValidatedGraphDocument(candidate.graph);

  return {
    ...candidate,
    activeRevisionId: applied.activeRevisionId
  };
}

export async function buildHostStatus() {
  const graphInspection = await getGraphInspection();
  const runtimeInspections = await listRuntimeInspections();
  const sessionList = await listSessions();
  const sessionDiagnostics = {
    consistencyFindingCount: sessionList.sessions.reduce(
      (total, session) =>
        total + (session.sessionConsistencyFindings?.length ?? 0),
      0
    ),
    inspectedSessionCount: sessionList.sessions.length,
    sessionsWithConsistencyFindings: sessionList.sessions.filter(
      (session) => (session.sessionConsistencyFindings?.length ?? 0) > 0
    ).length
  };
  const runtimeBackend = getRuntimeBackend();
  const reconciliationSnapshot =
    (await readLatestReconciliationSnapshot()) ??
    reconciliationSnapshotSchema.parse({
      backendKind: runtimeBackend.kind,
      blockedRuntimeCount: 0,
      degradedRuntimeCount: 0,
      failedRuntimeCount: 0,
      findingCodes: [],
      graphId: graphInspection.graph?.graphId,
      graphRevisionId: graphInspection.activeRevisionId,
      issueCount: 0,
      lastReconciledAt: nowIsoString(),
      managedRuntimeCount: 0,
      nodes: [],
      runningRuntimeCount: 0,
      schemaVersion: "1",
      stoppedRuntimeCount: 0,
      transitioningRuntimeCount: 0
    });
  const hostStatus =
    reconciliationSnapshot.degradedRuntimeCount > 0 ||
    sessionDiagnostics.consistencyFindingCount > 0
      ? "degraded"
      : reconciliationSnapshot.transitioningRuntimeCount > 0
        ? "starting"
        : "healthy";

  return {
    service: "entangle-host" as const,
    status: hostStatus,
    graphRevisionId: graphInspection.activeRevisionId,
    reconciliation: {
      backendKind: reconciliationSnapshot.backendKind,
      blockedRuntimeCount: reconciliationSnapshot.blockedRuntimeCount,
      degradedRuntimeCount: reconciliationSnapshot.degradedRuntimeCount,
      failedRuntimeCount: reconciliationSnapshot.failedRuntimeCount,
      findingCodes: reconciliationSnapshot.findingCodes,
      issueCount: reconciliationSnapshot.issueCount,
      lastReconciledAt: reconciliationSnapshot.lastReconciledAt,
      managedRuntimeCount: reconciliationSnapshot.managedRuntimeCount,
      runningRuntimeCount: reconciliationSnapshot.runningRuntimeCount,
      stoppedRuntimeCount: reconciliationSnapshot.stoppedRuntimeCount,
      transitioningRuntimeCount:
        reconciliationSnapshot.transitioningRuntimeCount
    },
    runtimeCounts: {
      desired: runtimeInspections.runtimes.filter(
        (runtime) => runtime.desiredState === "running"
      ).length,
      observed: runtimeInspections.runtimes.filter(
        (runtime) => runtime.observedState !== "missing"
      ).length,
      running: runtimeInspections.runtimes.filter(
        (runtime) => runtime.observedState === "running"
      ).length
    },
    sessionDiagnostics,
    timestamp: nowIsoString()
  };
}
