import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  agentPackageManifestSchema,
  buildValidationReport,
  type CatalogInspectionResponse,
  type DeploymentResourceCatalog,
  deploymentResourceCatalogSchema,
  type GraphInspectionResponse,
  type GraphMutationResponse,
  graphSpecSchema,
  type PackageSourceAdmissionRequest,
  packageSourceRecordSchema,
  type PackageSourceInspectionResponse,
  type PackageSourceRecord,
  type PackageSourceListResponse,
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
const runtimeIntentsRoot = path.join(desiredRoot, "runtime-intents");
const controlPlaneTraceRoot = path.join(tracesRoot, "control-plane");

type GraphRevisionRecord = {
  activeRevisionId: string;
  appliedAt: string;
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

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await ensureDirectory(path.dirname(filePath));
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
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

export async function initializeHostState(): Promise<void> {
  await Promise.all([
    ensureDirectory(path.join(desiredRoot, "node-bindings")),
    ensureDirectory(runtimeIntentsRoot),
    ensureDirectory(packageSourcesRoot),
    ensureDirectory(graphRevisionsRoot),
    ensureDirectory(path.join(observedRoot, "runtimes")),
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
  const listing = await listPackageSources();
  return listing.packageSources.map(
    (entry: PackageSourceInspectionResponse) => entry.packageSource.packageSourceId
  );
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
  const runtimeIntentEntries = await readdir(runtimeIntentsRoot, {
    withFileTypes: true
  });
  const desiredRuntimeCount =
    runtimeIntentEntries.filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .length ||
    graphInspection.graph?.nodes.filter((node) => node.nodeKind !== "user").length ||
    0;

  return {
    service: "entangle-host" as const,
    status: "healthy" as const,
    graphRevisionId: graphInspection.activeRevisionId,
    runtimeCounts: {
      desired: desiredRuntimeCount,
      observed: 0,
      running: 0
    },
    timestamp: nowIsoString()
  };
}
