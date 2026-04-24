import {
  cp,
  lstat,
  mkdir,
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
import {
  activeGraphRevisionRecordSchema,
  artifactRecordSchema,
  edgeDeletionResponseSchema,
  edgeListResponseSchema,
  edgeMutationResponseSchema,
  graphRevisionInspectionResponseSchema,
  graphRevisionListResponseSchema,
  graphRevisionRecordSchema,
  hostEventListResponseSchema,
  hostEventRecordSchema,
  hostSessionSummarySchema,
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
  externalPrincipalListResponseSchema,
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
  type PackageSourceInspectionResponse,
  type PackageSourceRecord,
  type PackageSourceListResponse,
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
  type RuntimeIdentityRecord,
  runtimeIdentityRecordSchema,
  runtimeArtifactListResponseSchema,
  runtimeInspectionResponseSchema,
  type RuntimeInspectionResponse,
  runtimeIntentRecordSchema,
  type RuntimeArtifactListResponse,
  runtimeListResponseSchema,
  runnerTurnRecordSchema,
  type SessionInspectionResponse,
  type SessionListResponse,
  type SessionRecord,
  type RunnerTurnRecord,
  type RuntimeListResponse,
  type RuntimeObservedState,
  type RuntimeIntentRecord,
  type ObservedRunnerTurnActivityRecord,
  type ObservedSessionActivityRecord,
  type ObservedRuntimeRecord,
  observedRuntimeRecordSchema,
  reconciliationSnapshotSchema,
  type ReconciliationSnapshot,
} from "@entangle/types";
import {
  validateDeploymentResourceCatalogDocument,
  validateGraphDocument,
  validatePackageDirectory
} from "@entangle/validator";
import { generateSecretKey, getPublicKey } from "nostr-tools";
import { GiteaApiClient } from "./gitea-api-client.js";
import { createRuntimeBackend } from "./runtime-backend.js";

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
const gitRepositoryTargetsRoot = path.join(observedRoot, "git-repository-targets");
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
const packageStoreMetadataFileName = ".package-store.json";

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

const runtimeBackend = createRuntimeBackend(hostStateRoot, secretStateRoot);
const hostEventSubscribers = new Set<(event: HostEventRecord) => void>();

type CatalogUpdatedEventInput = Omit<
  Extract<HostEventRecord, { type: "catalog.updated" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type PackageSourceAdmittedEventInput = Omit<
  Extract<HostEventRecord, { type: "package_source.admitted" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type ExternalPrincipalUpdatedEventInput = Omit<
  Extract<HostEventRecord, { type: "external_principal.updated" }>,
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
type HostReconciliationCompletedEventInput = Omit<
  Extract<HostEventRecord, { type: "host.reconciliation.completed" }>,
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
    defaults: {
      relayProfileRefs: [relayId],
      gitServiceRef: gitServiceId,
      modelEndpointRef: modelEndpoints[0]?.id
    }
  });
}

function buildPackageSourceId(
  requestedId: string | undefined,
  manifestPackageId: string,
  existingIds: string[]
): string {
  const preferredId = sanitizeIdentifier(
    requestedId ?? `${manifestPackageId}-source`
  );

  if (!existingIds.includes(preferredId)) {
    return preferredId;
  }

  let suffix = 2;

  while (existingIds.includes(`${preferredId}-${suffix}`)) {
    suffix += 1;
  }

  return `${preferredId}-${suffix}`;
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
      path.join(packageSourcesRoot, `${record.packageSourceId}.json`),
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
    injectedRoot: path.join(root, "injected"),
    memoryRoot: path.join(root, "memory"),
    packageRoot: path.join(root, "package"),
    retrievalRoot: path.join(root, "retrieval"),
    root,
    runtimeRoot: path.join(root, "runtime")
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

async function readObservedRuntimeRecord(
  nodeId: string
): Promise<ObservedRuntimeRecord | undefined> {
  const filePath = path.join(observedRuntimesRoot, `${nodeId}.json`);

  if (!(await pathExists(filePath))) {
    return undefined;
  }

  return observedRuntimeRecordSchema.parse(await readJsonFile(filePath));
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

function buildObservedActivityFingerprint(value: unknown): string {
  return createHash("sha1")
    .update(JSON.stringify(value))
    .digest("hex");
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
    ensureDirectory(packageSourcesRoot),
    ensureDirectory(graphRevisionsRoot),
    ensureDirectory(observedRuntimesRoot),
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
      validation:
        record.sourceKind === "local_path"
          ? await validatePackageDirectory(record.absolutePath)
          : buildValidationReport([
              {
                code: "archive_admission_not_implemented",
                severity: "warning",
                message:
                  "Archive-backed package materialization is not implemented in the first host scaffold.",
                path: ["archivePath"]
              }
            ])
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
  const packageSourcePath = path.join(packageSourcesRoot, `${packageSourceId}.json`);

  if (!(await pathExists(packageSourcePath))) {
    return null;
  }

  const record = await reconcileMaterializedPackageSourceRecord(
    packageSourceRecordSchema.parse(await readJsonFile(packageSourcePath))
  );

  return {
    packageSource: record,
    manifest: await resolveManifestForPackageSource(record),
    validation:
      record.sourceKind === "local_path"
        ? await validatePackageDirectory(record.absolutePath)
        : buildValidationReport([
            {
              code: "archive_admission_not_implemented",
              severity: "warning",
              message:
                "Archive-backed package materialization is not implemented in the first host scaffold.",
              path: ["archivePath"]
            }
          ])
  };
}

export async function admitPackageSource(
  request: PackageSourceAdmissionRequest
): Promise<PackageSourceInspectionResponse> {
  await initializeHostState();

  if (request.sourceKind === "local_archive") {
    return {
      packageSource: packageSourceRecordSchema.parse({
        sourceKind: request.sourceKind,
        packageSourceId: sanitizeIdentifier(
          request.packageSourceId ?? "archive-admission"
        ),
        archivePath: request.archivePath,
        admittedAt: nowIsoString()
      }),
      validation: buildValidationReport([
        {
          code: "archive_admission_not_implemented",
          severity: "error",
          message:
            "Archive-backed package admission is not implemented in the first host scaffold.",
          path: ["archivePath"]
        }
      ])
    };
  }

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
      (entry: PackageSourceInspectionResponse) => entry.packageSource.packageSourceId
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
    await writeJsonFile(path.join(packageSourcesRoot, `${packageSourceId}.json`), record);
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
  gitRepositoryProvisioning: GitRepositoryProvisioningRecord | undefined;
  hasModelEndpoint: boolean;
  hasModelEndpointAuth: boolean;
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

  if (!input.hasModelEndpoint) {
    return `Node '${input.node.nodeId}' cannot start because it has no effective model endpoint binding.`;
  }

  if (!input.hasModelEndpointAuth) {
    return (
      `Node '${input.node.nodeId}' cannot start because its effective model endpoint ` +
      `credential is unavailable.`
    );
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
    Boolean(resolvedModelEndpointProfile) &&
    resolvedModelAuthBinding?.status === "available";
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
    ensureDirectory(workspace.retrievalRoot),
    ensureDirectory(workspace.runtimeRoot)
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

    const edgeRoutes = graph.edges
      .filter(
        (edge) =>
          edge.enabled &&
          (edge.fromNodeId === node.nodeId || edge.toNodeId === node.nodeId)
      )
      .flatMap((edge) => {
        const peerNodeId =
          edge.fromNodeId === node.nodeId ? edge.toNodeId : edge.fromNodeId;
        const peerNode = graph.nodes.find((candidate) => candidate.nodeId === peerNodeId);

        if (!peerNode) {
          return [];
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
          return [];
        }

        return [
          {
            channel: edge.transportPolicy.channel,
            edgeId: edge.edgeId,
            peerNodeId,
            relation: edge.relation,
            relayProfileRefs: realizableRelayRefs
          }
        ];
      });

    const contextDraft = {
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
            gitRepositoryProvisioning,
            hasModelEndpoint: Boolean(resolvedModelEndpointProfile),
            hasModelEndpointAuth:
              resolvedModelAuthBinding?.status === "available",
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

  const reconcileInput = {
    context,
    contextPath: context
      ? path.join(context.workspace.injectedRoot, runtimeContextFileName)
      : undefined,
    desiredState: intentRecord.desiredState,
    graphId: graph.graphId,
    graphRevisionId: activeRevisionId,
    nodeId: node.nodeId,
    reason: intentRecord.reason,
    restartGeneration: intentRecord.restartGeneration,
    ...(context
      ? {
          secretEnvironment: {
            ENTANGLE_NOSTR_SECRET_KEY: runtimeIdentitySecret
          }
        }
      : {})
  };
  const existingObservedRecord = await readObservedRuntimeRecord(node.nodeId);
  const observedRuntime = await runtimeBackend
    .reconcileRuntime(reconcileInput)
    .catch((error: unknown) => ({
      backendKind: runtimeBackend.kind,
      lastError: formatUnknownError(error),
      observedState: "failed" as const,
      runtimeHandle: undefined,
      statusMessage: `Runtime reconciliation failed: ${formatUnknownError(error)}`
    }));
  const observedRecord = observedRuntimeRecordSchema.parse({
    backendKind: observedRuntime.backendKind,
    graphId: graph.graphId,
    graphRevisionId: activeRevisionId,
    lastError: observedRuntime.lastError,
    lastSeenAt: nowIsoString(),
    nodeId: node.nodeId,
    observedState: observedRuntime.observedState,
    runtimeContextPath: context
      ? path.join(context.workspace.injectedRoot, runtimeContextFileName)
      : undefined,
    runtimeHandle: observedRuntime.runtimeHandle,
    schemaVersion: "1",
    statusMessage: observedRuntime.statusMessage
  });
  await writeJsonFileIfChanged(
    path.join(observedRuntimesRoot, `${node.nodeId}.json`),
    observedRecord
  );
  if (didObservedRuntimeChange(existingObservedRecord, observedRecord)) {
    await appendHostEvent({
      backendKind: observedRecord.backendKind,
      category: "runtime",
      desiredState: intentRecord.desiredState,
      graphId: graph.graphId,
      graphRevisionId: activeRevisionId,
      message: `Runtime '${node.nodeId}' observed state is now '${observedRecord.observedState}'.`,
      nodeId: node.nodeId,
      observedState: observedRecord.observedState,
      previousObservedState: existingObservedRecord?.observedState,
      runtimeHandle: observedRecord.runtimeHandle,
      statusMessage: observedRecord.statusMessage,
      type: "runtime.observed_state.changed"
    } satisfies RuntimeObservedStateChangedEventInput);
  }

  return {
    binding: effectiveBinding,
    context,
    primaryGitRepositoryProvisioning: gitRepositoryProvisioning,
    inspection: buildRuntimeInspectionFromState({
      context,
      desiredState: intentRecord.desiredState,
      graphId: graph.graphId,
      graphRevisionId: activeRevisionId,
      nodeId: node.nodeId,
      observedState: observedRecord.observedState,
      packageSourceId: packageSource?.packageSourceId,
      primaryGitRepositoryProvisioning: gitRepositoryProvisioning,
      reason: intentRecord.reason,
      restartGeneration: intentRecord.restartGeneration,
      runtimeHandle: observedRecord.runtimeHandle,
      statusMessage: observedRecord.statusMessage,
      backendKind: observedRecord.backendKind
    })
  };
}

async function synchronizeCurrentGraphRuntimeState(): Promise<{
  nodes: NodeInspectionResponse[];
  runtimes: RuntimeInspectionResponse[];
  snapshot: ReturnType<typeof reconciliationSnapshotSchema.parse>;
}> {
  const { graph, activeRevisionId } = await readActiveGraphState();
  const previousSnapshot = await readLatestReconciliationSnapshot();

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

  const artifactsRoot = path.join(context.workspace.runtimeRoot, "artifacts");

  if (!(await pathExists(artifactsRoot))) {
    return runtimeArtifactListResponseSchema.parse({
      artifacts: []
    });
  }

  const artifacts = await Promise.all(
    (await readdir(artifactsRoot))
      .filter((fileName) => fileName.endsWith(".json"))
      .sort()
      .map(async (fileName) =>
        artifactRecordSchema.parse(
          await readJsonFile(path.join(artifactsRoot, fileName))
        )
      )
  );

  return runtimeArtifactListResponseSchema.parse({
    artifacts
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

async function synchronizeSessionActivityObservation(input: {
  runtime: RuntimeInspectionResponse;
  sessionRecord: SessionRecord;
}): Promise<void> {
  const { runtime, sessionRecord } = input;
  const fingerprint = buildObservedActivityFingerprint(sessionRecord);
  const existingRecord = await readObservedSessionActivityRecord(
    runtime.nodeId,
    sessionRecord.sessionId
  );
  const nextRecord = observedSessionActivityRecordSchema.parse({
    fingerprint,
    graphId: sessionRecord.graphId,
    nodeId: runtime.nodeId,
    ownerNodeId: sessionRecord.ownerNodeId,
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
    message:
      `Session '${sessionRecord.sessionId}' on node '${runtime.nodeId}' is now ` +
      `'${sessionRecord.status}'.`,
    nodeId: runtime.nodeId,
    ownerNodeId: sessionRecord.ownerNodeId,
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
  const fingerprint = buildObservedActivityFingerprint(turnRecord);
  const existingRecord = await readObservedRunnerTurnActivityRecord(
    runtime.nodeId,
    turnRecord.turnId
  );
  const nextRecord = observedRunnerTurnActivityRecordSchema.parse({
    consumedArtifactIds: turnRecord.consumedArtifactIds,
    conversationId: turnRecord.conversationId,
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

async function synchronizeRuntimeActivityEvents(input: {
  runtimes: RuntimeInspectionResponse[];
}): Promise<void> {
  const activeSessionActivityIds = new Set<string>();
  const activeTurnActivityIds = new Set<string>();

  for (const runtime of input.runtimes) {
    if (!runtime.contextAvailable || !runtime.contextPath) {
      continue;
    }

    const context = effectiveRuntimeContextSchema.parse(
      await readJsonFile(runtime.contextPath)
    );
    const [sessionRecords, turnRecords] = await Promise.all([
      listRuntimeSessionRecords(context.workspace.runtimeRoot),
      listRuntimeTurnRecords(context.workspace.runtimeRoot)
    ]);

    for (const sessionRecord of sessionRecords) {
      activeSessionActivityIds.add(`${runtime.nodeId}--${sessionRecord.sessionId}`);
      await synchronizeSessionActivityObservation({
        runtime,
        sessionRecord
      });
    }

    for (const turnRecord of turnRecords) {
      activeTurnActivityIds.add(`${runtime.nodeId}--${turnRecord.turnId}`);
      await synchronizeRunnerTurnActivityObservation({
        runtime,
        turnRecord
      });
    }
  }

  await removeJsonFilesExcept(observedSessionActivityRoot, activeSessionActivityIds);
  await removeJsonFilesExcept(observedRunnerTurnActivityRoot, activeTurnActivityIds);
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

    for (const sessionRecord of sessionRecords) {
      const entries = sessions.get(sessionRecord.sessionId) ?? [];
      entries.push({
        nodeId: runtime.nodeId,
        runtime,
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

  const traceIds = new Set<string>();

  for (const entry of nodes) {
    traceIds.add(entry.session.traceId);
  }

  return hostSessionSummarySchema.parse({
    graphId: firstNode.session.graphId,
    nodeIds: nodes.map((entry) => entry.nodeId),
    nodeStatuses: nodes.map((entry) => ({
      nodeId: entry.nodeId,
      status: entry.session.status
    })),
    sessionId,
    traceIds: Array.from(traceIds).sort(),
    updatedAt: nodes
      .map((entry) => entry.session.updatedAt)
      .sort((left, right) => right.localeCompare(left))[0]
  });
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
    reconciliationSnapshot.degradedRuntimeCount > 0
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
    timestamp: nowIsoString()
  };
}
