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
  artifactRecordSchema,
  type AgentPackageManifest,
  agentPackageManifestSchema,
  buildValidationReport,
  type CatalogInspectionResponse,
  type DeploymentResourceCatalog,
  deploymentResourceCatalogSchema,
  type EffectiveRuntimeContext,
  effectiveRuntimeContextSchema,
  effectiveNodeBindingSchema,
  type GraphInspectionResponse,
  type GraphSpec,
  type GraphMutationResponse,
  graphSpecSchema,
  intersectIdentifiers,
  type NodeBinding,
  packageSourceRecordSchema,
  type PackageSourceAdmissionRequest,
  type PackageSourceInspectionResponse,
  type PackageSourceRecord,
  type PackageSourceListResponse,
  resolveEffectiveGitServices,
  resolveEffectiveModelEndpointProfile,
  resolveEffectiveModelEndpointProfileRef,
  resolveEffectivePrimaryGitServiceRef,
  resolveEffectivePrimaryRelayProfileRef,
  resolveEffectiveRelayProfiles,
  resolveEffectiveRelayProfileRefs,
  type RuntimeDesiredState,
  runtimeIdentityContextSchema,
  type RuntimeIdentityRecord,
  runtimeIdentityRecordSchema,
  runtimeArtifactListResponseSchema,
  runtimeInspectionResponseSchema,
  type RuntimeInspectionResponse,
  runtimeIntentRecordSchema,
  type RuntimeArtifactListResponse,
  runtimeListResponseSchema,
  type RuntimeListResponse,
  type RuntimeObservedState,
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
const packageSourcesRoot = path.join(desiredRoot, "package-sources");
const graphRoot = path.join(desiredRoot, "graph");
const currentGraphPath = path.join(graphRoot, "current.json");
const activeGraphRevisionPath = path.join(graphRoot, "active-revision.json");
const graphRevisionsRoot = path.join(graphRoot, "revisions");
const nodeBindingsRoot = path.join(desiredRoot, "node-bindings");
const runtimeIntentsRoot = path.join(desiredRoot, "runtime-intents");
const observedRuntimesRoot = path.join(observedRoot, "runtimes");
const reconciliationRoot = path.join(observedRoot, "reconciliation");
const latestReconciliationPath = path.join(reconciliationRoot, "latest.json");
const reconciliationHistoryRoot = path.join(reconciliationRoot, "history");
const controlPlaneTraceRoot = path.join(tracesRoot, "control-plane");
const runtimeIdentitiesRoot = path.join(secretStateRoot, "runtime-identities");
const runtimeContextFileName = "effective-runtime-context.json";
const packageStoreMetadataFileName = ".package-store.json";

type GraphRevisionRecord = {
  activeRevisionId: string;
  appliedAt: string;
};

type LocalPathPackageSourceRecord = Extract<
  PackageSourceRecord,
  { sourceKind: "local_path" }
>;

type RuntimeResolution = {
  context: EffectiveRuntimeContext | undefined;
  inspection: RuntimeInspectionResponse;
};

const runtimeBackend = createRuntimeBackend(hostStateRoot);

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

  const modelEndpointId = process.env.ENTANGLE_DEFAULT_MODEL_ENDPOINT_ID?.trim();
  const modelBaseUrl = process.env.ENTANGLE_DEFAULT_MODEL_BASE_URL?.trim();
  const modelSecretRef = process.env.ENTANGLE_DEFAULT_MODEL_SECRET_REF?.trim();
  const modelDefaultModel =
    process.env.ENTANGLE_DEFAULT_MODEL_DEFAULT_MODEL?.trim();

  const modelEndpoints =
    modelEndpointId && modelBaseUrl && modelSecretRef
      ? [
          {
            id: sanitizeIdentifier(modelEndpointId),
            displayName:
              process.env.ENTANGLE_DEFAULT_MODEL_DISPLAY_NAME ??
              "Shared Model Endpoint",
            adapterKind:
              process.env.ENTANGLE_DEFAULT_MODEL_ADAPTER_KIND ===
              "openai_compatible"
                ? "openai_compatible"
                : "anthropic",
            baseUrl: modelBaseUrl,
            authMode:
              process.env.ENTANGLE_DEFAULT_MODEL_AUTH_MODE === "header_secret"
                ? "header_secret"
                : "api_key_bearer",
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
        transportKind:
          process.env.ENTANGLE_DEFAULT_GIT_TRANSPORT === "https"
            ? "https"
            : "ssh",
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

async function appendControlPlaneEvent(
  event: Record<string, unknown>
): Promise<void> {
  await ensureDirectory(controlPlaneTraceRoot);
  const logPath = path.join(controlPlaneTraceRoot, `${dateStamp()}.jsonl`);
  const encoded = `${JSON.stringify({
    ...event,
    timestamp: nowIsoString()
  })}\n`;
  await writeFile(logPath, encoded, { encoding: "utf8", flag: "a" });
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
  const revisionRecord = (await pathExists(activeGraphRevisionPath))
    ? await readJsonFile<GraphRevisionRecord>(activeGraphRevisionPath)
    : undefined;

  return {
    graph,
    activeRevisionId: revisionRecord?.activeRevisionId
  };
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
    root,
    runtimeRoot: path.join(root, "runtime")
  };
}

async function readRuntimeIntentRecord(
  nodeId: string
): Promise<ReturnType<typeof runtimeIntentRecordSchema.parse> | undefined> {
  const filePath = path.join(runtimeIntentsRoot, `${nodeId}.json`);

  if (!(await pathExists(filePath))) {
    return undefined;
  }

  return runtimeIntentRecordSchema.parse(await readJsonFile(filePath));
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

function buildRuntimeInspectionFromState(input: {
  backendKind: ReturnType<typeof observedRuntimeRecordSchema.parse>["backendKind"];
  context: EffectiveRuntimeContext | undefined;
  desiredState: RuntimeDesiredState;
  graphId: string;
  graphRevisionId: string;
  nodeId: string;
  observedState: RuntimeObservedState;
  packageSourceId: string | undefined;
  reason: string | undefined;
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
    reason: input.reason,
    runtimeHandle: input.runtimeHandle,
    statusMessage: input.statusMessage
  });
}

export async function initializeHostState(): Promise<void> {
  await Promise.all([
    ensureDirectory(runtimeIdentitiesRoot),
    ensureDirectory(nodeBindingsRoot),
    ensureDirectory(runtimeIntentsRoot),
    ensureDirectory(packageSourcesRoot),
    ensureDirectory(graphRevisionsRoot),
    ensureDirectory(observedRuntimesRoot),
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
    await writeJsonFile(catalogPath, buildDefaultCatalog());
    await appendControlPlaneEvent({
      category: "control_plane",
      type: "catalog_bootstrap",
      message: "Bootstrapped default deployment resource catalog."
    });
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
  await appendControlPlaneEvent({
    category: "control_plane",
    type: "catalog_apply",
    message: `Applied catalog '${inspection.catalog.catalogId}'.`,
    catalogId: inspection.catalog.catalogId
  });

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
    await appendControlPlaneEvent({
      category: "control_plane",
      type: "package_source_admit",
      message: `Admitted package source '${packageSourceId}'.`,
      packageSourceId
    });
  }

  return {
    packageSource: record,
    manifest,
    validation
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
  const revisionRecord = (await pathExists(activeGraphRevisionPath))
    ? await readJsonFile<GraphRevisionRecord>(activeGraphRevisionPath)
    : undefined;

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
  hasModelEndpoint: boolean;
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

  return `Node '${input.node.nodeId}' has no realizable runtime context.`;
}

async function buildRuntimeResolution(input: {
  activeRevisionId: string;
  catalog: DeploymentResourceCatalog;
  graph: GraphSpec;
  node: NodeBinding;
  packageSources: Map<string, PackageSourceRecord>;
}): Promise<RuntimeResolution> {
  const { activeRevisionId, catalog, graph, node, packageSources } = input;
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
  const packageSourcePathExists = sourcePackageRoot
    ? await pathExists(sourcePackageRoot)
    : false;
  const packageManifest =
    sourcePackageRoot && packageSourcePathExists
      ? await readPackageManifest(sourcePackageRoot)
      : undefined;
  const effectiveBinding = effectiveNodeBindingSchema.parse({
    bindingId: sanitizeIdentifier(`${activeRevisionId}-${node.nodeId}`),
    graphId: graph.graphId,
    graphRevisionId: activeRevisionId,
    node,
    packageSource,
    resolvedResourceBindings: {
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
    ensureDirectory(workspace.runtimeRoot)
  ]);

  let context: EffectiveRuntimeContext | undefined;

  if (
    sourcePackageRoot &&
    packageSourcePathExists &&
    packageManifest &&
    resolvedModelEndpointProfile
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
        defaultNamespace:
          resolvedGitServices.find(
            (service) => service.id === resolvedPrimaryGitServiceRef
          )?.defaultNamespace ??
          resolvedGitServices[0]?.defaultNamespace,
        gitServices: resolvedGitServices,
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
            hasModelEndpoint: Boolean(resolvedModelEndpointProfile),
            node,
            packageManifest,
            packageSource,
            packageSourcePathExists
          })
      : undefined;

  const intentRecord = runtimeIntentRecordSchema.parse({
    desiredState,
    graphId: graph.graphId,
    graphRevisionId: activeRevisionId,
    nodeId: node.nodeId,
    reason,
    schemaVersion: "1",
    updatedAt:
      existingIntent &&
      existingIntent.desiredState === desiredState &&
      existingIntent.reason === reason &&
      existingIntent.graphId === graph.graphId &&
      existingIntent.graphRevisionId === activeRevisionId
        ? existingIntent.updatedAt
        : nowIsoString()
  });
  await writeJsonFileIfChanged(
    path.join(runtimeIntentsRoot, `${node.nodeId}.json`),
    intentRecord
  );

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
    ...(context
      ? {
          secretEnvironment: {
            ENTANGLE_NOSTR_SECRET_KEY: runtimeIdentitySecret
          }
        }
      : {})
  };
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

  return {
    context,
    inspection: buildRuntimeInspectionFromState({
      context,
      desiredState: intentRecord.desiredState,
      graphId: graph.graphId,
      graphRevisionId: activeRevisionId,
      nodeId: node.nodeId,
      observedState: observedRecord.observedState,
      packageSourceId: packageSource?.packageSourceId,
      reason: intentRecord.reason,
      runtimeHandle: observedRecord.runtimeHandle,
      statusMessage: observedRecord.statusMessage,
      backendKind: observedRecord.backendKind
    })
  };
}

async function synchronizeCurrentGraphRuntimeState(): Promise<{
  runtimes: RuntimeInspectionResponse[];
  snapshot: ReturnType<typeof reconciliationSnapshotSchema.parse>;
}> {
  const { graph, activeRevisionId } = await readActiveGraphState();

  if (!graph || !activeRevisionId) {
    const emptySnapshot = reconciliationSnapshotSchema.parse({
      backendKind: runtimeBackend.kind,
      failedRuntimeCount: 0,
      graphId: undefined,
      graphRevisionId: undefined,
      lastReconciledAt: nowIsoString(),
      managedRuntimeCount: 0,
      nodes: [],
      runningRuntimeCount: 0,
      schemaVersion: "1",
      stoppedRuntimeCount: 0
    });
    await writeJsonFileIfChanged(latestReconciliationPath, emptySnapshot);

    return {
      runtimes: [],
      snapshot: emptySnapshot
    };
  }

  const catalog = await readCatalog();
  const packageSources = await listPackageSourceRecordMap();
  const runtimeNodes = graph.nodes.filter((node) => node.nodeKind !== "user");
  const activeNodeIds = new Set(runtimeNodes.map((node) => node.nodeId));
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
      packageSources
    });
    inspections.push(resolution.inspection);
  }

  inspections.sort((left, right) => left.nodeId.localeCompare(right.nodeId));
  const snapshot = reconciliationSnapshotSchema.parse({
    backendKind: runtimeBackend.kind,
    failedRuntimeCount: inspections.filter(
      (runtime) => runtime.observedState === "failed"
    ).length,
    graphId: graph.graphId,
    graphRevisionId: activeRevisionId,
    lastReconciledAt: nowIsoString(),
    managedRuntimeCount: inspections.length,
    nodes: inspections.map((runtime) => ({
      desiredState: runtime.desiredState,
      nodeId: runtime.nodeId,
      observedState: runtime.observedState,
      statusMessage: runtime.statusMessage
    })),
    runningRuntimeCount: inspections.filter(
      (runtime) => runtime.observedState === "running"
    ).length,
    schemaVersion: "1",
    stoppedRuntimeCount: inspections.filter((runtime) =>
      runtime.observedState === "stopped" || runtime.observedState === "missing"
    ).length
  });

  await writeJsonFileIfChanged(latestReconciliationPath, snapshot);

  return {
    runtimes: inspections,
    snapshot
  };
}

export async function listRuntimeInspections(): Promise<RuntimeListResponse> {
  return runtimeListResponseSchema.parse({
    runtimes: (await synchronizeCurrentGraphRuntimeState()).runtimes
  });
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

export async function setRuntimeDesiredState(
  nodeId: string,
  desiredState: RuntimeDesiredState
): Promise<RuntimeInspectionResponse | null> {
  const inspection = await getRuntimeInspection(nodeId);

  if (!inspection) {
    return null;
  }

  const intent = runtimeIntentRecordSchema.parse({
    desiredState,
    graphId: inspection.graphId,
    graphRevisionId: inspection.graphRevisionId,
    nodeId,
    reason: desiredState === "stopped" ? "stopped_by_operator" : undefined,
    schemaVersion: "1",
    updatedAt: nowIsoString()
  });
  await writeJsonFile(path.join(runtimeIntentsRoot, `${nodeId}.json`), intent);

  const { runtimes } = await synchronizeCurrentGraphRuntimeState();
  return runtimes.find((runtime) => runtime.nodeId === nodeId) ?? null;
}

export async function applyGraph(input: unknown): Promise<GraphMutationResponse> {
  const candidate = await validateGraphCandidate(input);

  if (!candidate.validation.ok || !candidate.graph) {
    return candidate;
  }

  const activeRevisionId = buildGraphRevisionId(candidate.graph.graphId);
  const revisionRecord: GraphRevisionRecord = {
    activeRevisionId,
    appliedAt: nowIsoString()
  };

  await writeJsonFile(currentGraphPath, candidate.graph);
  await writeJsonFile(
    path.join(graphRevisionsRoot, `${activeRevisionId}.json`),
    candidate.graph
  );
  await writeJsonFile(activeGraphRevisionPath, revisionRecord);
  await synchronizeCurrentGraphRuntimeState();
  await appendControlPlaneEvent({
    category: "control_plane",
    type: "graph_apply",
    message: `Applied graph '${candidate.graph.graphId}' as revision '${activeRevisionId}'.`,
    graphId: candidate.graph.graphId,
    activeRevisionId
  });

  return {
    ...candidate,
    activeRevisionId
  };
}

export async function buildHostStatus() {
  const graphInspection = await getGraphInspection();
  const runtimeInspections = await listRuntimeInspections();
  const reconciliationSnapshot =
    (await readLatestReconciliationSnapshot()) ??
    reconciliationSnapshotSchema.parse({
      backendKind: runtimeBackend.kind,
      failedRuntimeCount: 0,
      graphId: graphInspection.graph?.graphId,
      graphRevisionId: graphInspection.activeRevisionId,
      lastReconciledAt: nowIsoString(),
      managedRuntimeCount: 0,
      nodes: [],
      runningRuntimeCount: 0,
      schemaVersion: "1",
      stoppedRuntimeCount: 0
    });
  const hostStatus =
    reconciliationSnapshot.failedRuntimeCount > 0 ? "degraded" : "healthy";

  return {
    service: "entangle-host" as const,
    status: hostStatus,
    graphRevisionId: graphInspection.activeRevisionId,
    reconciliation: {
      backendKind: reconciliationSnapshot.backendKind,
      failedRuntimeCount: reconciliationSnapshot.failedRuntimeCount,
      lastReconciledAt: reconciliationSnapshot.lastReconciledAt,
      managedRuntimeCount: reconciliationSnapshot.managedRuntimeCount,
      runningRuntimeCount: reconciliationSnapshot.runningRuntimeCount,
      stoppedRuntimeCount: reconciliationSnapshot.stoppedRuntimeCount
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
