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
import { randomUUID } from "node:crypto";
import {
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
  runtimeInspectionResponseSchema,
  type RuntimeInspectionResponse,
  runtimeIntentRecordSchema,
  runtimeListResponseSchema,
  type RuntimeListResponse,
  type RuntimeObservedState,
  observedRuntimeRecordSchema,
} from "@entangle/types";
import {
  validateDeploymentResourceCatalogDocument,
  validateGraphDocument,
  validatePackageDirectory
} from "@entangle/validator";

const hostStateRoot = path.join(
  path.resolve(process.env.ENTANGLE_HOME ?? path.resolve(process.cwd(), ".entangle")),
  "host"
);

const desiredRoot = path.join(hostStateRoot, "desired");
const observedRoot = path.join(hostStateRoot, "observed");
const tracesRoot = path.join(hostStateRoot, "traces");
const importsRoot = path.join(hostStateRoot, "imports");
const workspacesRoot = path.join(hostStateRoot, "workspaces");
const cacheRoot = path.join(hostStateRoot, "cache");

const catalogPath = path.join(desiredRoot, "catalog.json");
const packageSourcesRoot = path.join(desiredRoot, "package-sources");
const graphRoot = path.join(desiredRoot, "graph");
const currentGraphPath = path.join(graphRoot, "current.json");
const activeGraphRevisionPath = path.join(graphRoot, "active-revision.json");
const graphRevisionsRoot = path.join(graphRoot, "revisions");
const nodeBindingsRoot = path.join(desiredRoot, "node-bindings");
const runtimeIntentsRoot = path.join(desiredRoot, "runtime-intents");
const observedRuntimesRoot = path.join(observedRoot, "runtimes");
const controlPlaneTraceRoot = path.join(tracesRoot, "control-plane");
const runtimeContextFileName = "effective-runtime-context.json";

type GraphRevisionRecord = {
  activeRevisionId: string;
  appliedAt: string;
};

type RuntimeResolution = {
  context: EffectiveRuntimeContext | undefined;
  inspection: RuntimeInspectionResponse;
};

function nowIsoString(): string {
  return new Date().toISOString();
}

function dateStamp(): string {
  return nowIsoString().slice(0, 10);
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

async function resolveManifestForPackageSource(
  record: PackageSourceRecord
): Promise<PackageSourceInspectionResponse["manifest"]> {
  if (record.sourceKind !== "local_path") {
    return undefined;
  }

  const manifestPath = path.join(record.absolutePath, "manifest.json");

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
    records.push(
      packageSourceRecordSchema.parse(
        await readJsonFile(path.join(packageSourcesRoot, entry))
      )
    );
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

function packageSourcePackageRoot(record: PackageSourceRecord): string {
  return record.sourceKind === "local_path"
    ? record.absolutePath
    : path.join(importsRoot, "packages", record.packageSourceId, "package");
}

async function ensureDirectoryLink(
  linkPath: string,
  targetPath: string
): Promise<void> {
  await ensureDirectory(path.dirname(linkPath));

  if (await pathExists(linkPath)) {
    const existingStats = await lstat(linkPath);

    if (existingStats.isSymbolicLink()) {
      const linkedTarget = await readlink(linkPath).catch(() => "");

      if (
        typeof linkedTarget === "string" &&
        path.resolve(path.dirname(linkPath), linkedTarget) === path.resolve(targetPath)
      ) {
        return;
      }
    }

    await rm(linkPath, { force: true, recursive: true });
  }

  await symlink(targetPath, linkPath);
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

async function readObservedRuntimeRecord(
  nodeId: string
): Promise<ReturnType<typeof observedRuntimeRecordSchema.parse> | undefined> {
  const filePath = path.join(observedRuntimesRoot, `${nodeId}.json`);

  if (!(await pathExists(filePath))) {
    return undefined;
  }

  return observedRuntimeRecordSchema.parse(await readJsonFile(filePath));
}

function buildRuntimeInspectionFromState(input: {
  context: EffectiveRuntimeContext | undefined;
  desiredState: RuntimeDesiredState;
  graphId: string;
  graphRevisionId: string;
  nodeId: string;
  observedState: RuntimeObservedState;
  packageSourceId: string | undefined;
  reason: string | undefined;
}): RuntimeInspectionResponse {
  return runtimeInspectionResponseSchema.parse({
    contextAvailable: Boolean(input.context),
    contextPath: input.context ? path.join(input.context.workspace.injectedRoot, runtimeContextFileName) : undefined,
    desiredState: input.desiredState,
    graphId: input.graphId,
    graphRevisionId: input.graphRevisionId,
    nodeId: input.nodeId,
    observedState: input.observedState,
    packageSourceId: input.packageSourceId,
    reason: input.reason
  });
}

export async function initializeHostState(): Promise<void> {
  await Promise.all([
    ensureDirectory(nodeBindingsRoot),
    ensureDirectory(runtimeIntentsRoot),
    ensureDirectory(packageSourcesRoot),
    ensureDirectory(graphRevisionsRoot),
    ensureDirectory(observedRuntimesRoot),
    ensureDirectory(path.join(observedRoot, "reconciliation", "history")),
    ensureDirectory(path.join(observedRoot, "health")),
    ensureDirectory(controlPlaneTraceRoot),
    ensureDirectory(path.join(tracesRoot, "sessions")),
    ensureDirectory(path.join(importsRoot, "packages")),
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
  const entries = (await readdir(packageSourcesRoot)).filter((entry) =>
    entry.endsWith(".json")
  );
  const packageSources: PackageSourceInspectionResponse[] = [];

  for (const entry of entries) {
    const record = packageSourceRecordSchema.parse(
      await readJsonFile(path.join(packageSourcesRoot, entry))
    );

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

  const record = packageSourceRecordSchema.parse(await readJsonFile(packageSourcePath));

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
  const packageRoot = packageSource
    ? packageSourcePackageRoot(packageSource)
    : undefined;
  const runtimeContextPath = path.join(
    workspace.injectedRoot,
    runtimeContextFileName
  );
  const packageSourcePathExists = packageRoot
    ? await pathExists(packageRoot)
    : false;
  const packageManifest =
    packageRoot && packageSourcePathExists
      ? await readPackageManifest(packageRoot)
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
    packageRoot &&
    packageSourcePathExists &&
    packageManifest &&
    resolvedModelEndpointProfile
  ) {
    await ensureDirectoryLink(workspace.packageRoot, packageRoot);
    await initializeWorkspaceMemory(
      workspace.memoryRoot,
      packageRoot,
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

  const existingObserved = await readObservedRuntimeRecord(node.nodeId);
  const observedRecord = observedRuntimeRecordSchema.parse({
    graphId: graph.graphId,
    graphRevisionId: activeRevisionId,
    lastError: existingObserved?.lastError,
    lastSeenAt: existingObserved?.lastSeenAt ?? nowIsoString(),
    nodeId: node.nodeId,
    observedState: existingObserved?.observedState ?? "missing",
    runtimeContextPath: context
      ? path.join(context.workspace.injectedRoot, runtimeContextFileName)
      : undefined,
    schemaVersion: "1"
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
      reason: intentRecord.reason
    })
  };
}

async function synchronizeCurrentGraphRuntimeState(): Promise<
  RuntimeInspectionResponse[]
> {
  const { graph, activeRevisionId } = await readActiveGraphState();

  if (!graph || !activeRevisionId) {
    return [];
  }

  const catalog = await readCatalog();
  const packageSources = await listPackageSourceRecordMap();
  const runtimeNodes = graph.nodes.filter((node) => node.nodeKind !== "user");
  const activeNodeIds = new Set(runtimeNodes.map((node) => node.nodeId));
  const inspections: RuntimeInspectionResponse[] = [];

  await removeJsonFilesExcept(nodeBindingsRoot, activeNodeIds);
  await removeJsonFilesExcept(runtimeIntentsRoot, activeNodeIds);

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
  return inspections;
}

export async function listRuntimeInspections(): Promise<RuntimeListResponse> {
  return runtimeListResponseSchema.parse({
    runtimes: await synchronizeCurrentGraphRuntimeState()
  });
}

export async function getRuntimeInspection(
  nodeId: string
): Promise<RuntimeInspectionResponse | null> {
  const runtimes = await synchronizeCurrentGraphRuntimeState();
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

  return runtimeInspectionResponseSchema.parse({
    ...inspection,
    desiredState,
    reason: intent.reason
  });
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

  return {
    service: "entangle-host" as const,
    status: "healthy" as const,
    graphRevisionId: graphInspection.activeRevisionId,
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
