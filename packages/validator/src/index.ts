import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import {
  agentPackageManifestSchema,
  buildValidationReport,
  type DeploymentResourceCatalog,
  deploymentResourceCatalogSchema,
  type GraphSpec,
  graphSpecSchema,
  type ValidationFinding,
  type ValidationReport
} from "@entangle/types";

function createFinding(
  finding: Omit<ValidationFinding, "path"> & { path?: string[] }
): ValidationFinding {
  return {
    ...finding,
    path: finding.path ?? []
  };
}

function collectDuplicateFindings(
  ids: string[],
  pathPrefix: string[]
): ValidationFinding[] {
  const counts = new Map<string, number>();

  for (const id of ids) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([id]) =>
      createFinding({
        code: "duplicate_identifier",
        severity: "error",
        message: `Duplicate identifier '${id}' detected.`,
        path: pathPrefix,
        details: { id }
      })
    );
}

function hasExistingId(ids: string[], id: string | undefined): boolean {
  return typeof id === "string" && ids.includes(id);
}

export function validatePackageManifestDocument(
  input: unknown
): ValidationReport {
  const parseResult = agentPackageManifestSchema.safeParse(input);

  if (!parseResult.success) {
    return buildValidationReport(
      parseResult.error.issues.map((issue) =>
        createFinding({
          code: "package_manifest_invalid",
          severity: "error",
          message: issue.message,
          path: issue.path.map(String)
        })
      )
    );
  }

  return buildValidationReport([]);
}

export function validateDeploymentResourceCatalogDocument(
  input: unknown
): ValidationReport {
  const parseResult = deploymentResourceCatalogSchema.safeParse(input);

  if (!parseResult.success) {
    return buildValidationReport(
      parseResult.error.issues.map((issue) =>
        createFinding({
          code: "resource_catalog_invalid",
          severity: "error",
          message: issue.message,
          path: issue.path.map(String)
        })
      )
    );
  }

  const catalog = parseResult.data;
  const findings: ValidationFinding[] = [];

  findings.push(
    ...collectDuplicateFindings(
      catalog.relays.map((relay) => relay.id),
      ["relays"]
    ),
    ...collectDuplicateFindings(
      catalog.gitServices.map((service) => service.id),
      ["gitServices"]
    ),
    ...collectDuplicateFindings(
      catalog.modelEndpoints.map((endpoint) => endpoint.id),
      ["modelEndpoints"]
    )
  );

  const relayIds = catalog.relays.map((relay) => relay.id);
  const gitServiceIds = catalog.gitServices.map((service) => service.id);
  const modelEndpointIds = catalog.modelEndpoints.map((endpoint) => endpoint.id);

  for (const relayRef of catalog.defaults.relayProfileRefs) {
    if (!relayIds.includes(relayRef)) {
      findings.push(
        createFinding({
          code: "unknown_default_relay_profile",
          severity: "error",
          message: `Default relay profile '${relayRef}' does not exist in the catalog.`,
          path: ["defaults", "relayProfileRefs"],
          details: { relayRef }
        })
      );
    }
  }

  if (
    catalog.defaults.gitServiceRef &&
    !gitServiceIds.includes(catalog.defaults.gitServiceRef)
  ) {
    findings.push(
      createFinding({
        code: "unknown_default_git_service",
        severity: "error",
        message: `Default git service '${catalog.defaults.gitServiceRef}' does not exist in the catalog.`,
        path: ["defaults", "gitServiceRef"],
        details: { gitServiceRef: catalog.defaults.gitServiceRef }
      })
    );
  }

  if (
    catalog.defaults.modelEndpointRef &&
    !modelEndpointIds.includes(catalog.defaults.modelEndpointRef)
  ) {
    findings.push(
      createFinding({
        code: "unknown_default_model_endpoint",
        severity: "error",
        message: `Default model endpoint '${catalog.defaults.modelEndpointRef}' does not exist in the catalog.`,
        path: ["defaults", "modelEndpointRef"],
        details: { modelEndpointRef: catalog.defaults.modelEndpointRef }
      })
    );
  }

  return buildValidationReport(findings);
}

function validateGraphSemantics(
  graph: GraphSpec,
  catalog?: DeploymentResourceCatalog
): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const nodeIds = graph.nodes.map((node) => node.nodeId);
  const edgeIds = graph.edges.map((edge) => edge.edgeId);
  const relayIds = catalog?.relays.map((relay) => relay.id) ?? [];
  const gitServiceIds = catalog?.gitServices.map((service) => service.id) ?? [];
  const modelEndpointIds =
    catalog?.modelEndpoints.map((endpoint) => endpoint.id) ?? [];

  findings.push(
    ...collectDuplicateFindings(nodeIds, ["nodes"]),
    ...collectDuplicateFindings(edgeIds, ["edges"])
  );

  if (!graph.nodes.some((node) => node.nodeKind === "user")) {
    findings.push(
      createFinding({
        code: "missing_user_node",
        severity: "warning",
        message: "Graph has no user node, which is unusual for the first serious Entangle profile.",
        path: ["nodes"]
      })
    );
  }

  for (const node of graph.nodes) {
    if (node.nodeKind !== "user" && !node.packageSourceRef) {
      findings.push(
        createFinding({
          code: "missing_package_source_ref",
          severity: "warning",
          message: `Non-user node '${node.nodeId}' has no package source binding yet.`,
          path: ["nodes", node.nodeId, "packageSourceRef"]
        })
      );
    }

    const resourceBindings = node.resourceBindings;

    if (
      catalog &&
      resourceBindings.primaryRelayProfileRef &&
      !hasExistingId(relayIds, resourceBindings.primaryRelayProfileRef)
    ) {
      findings.push(
        createFinding({
          code: "unknown_primary_relay_profile",
          severity: "error",
          message: `Node '${node.nodeId}' references an unknown primary relay profile.`,
          path: ["nodes", node.nodeId, "resourceBindings", "primaryRelayProfileRef"],
          details: { relayProfileRef: resourceBindings.primaryRelayProfileRef }
        })
      );
    }

    for (const relayRef of resourceBindings.relayProfileRefs) {
      if (catalog && !relayIds.includes(relayRef)) {
        findings.push(
          createFinding({
            code: "unknown_relay_profile_ref",
            severity: "error",
            message: `Node '${node.nodeId}' references relay profile '${relayRef}' that is missing from the catalog.`,
            path: ["nodes", node.nodeId, "resourceBindings", "relayProfileRefs"],
            details: { relayRef }
          })
        );
      }
    }

    if (
      catalog &&
      resourceBindings.primaryGitServiceRef &&
      !hasExistingId(gitServiceIds, resourceBindings.primaryGitServiceRef)
    ) {
      findings.push(
        createFinding({
          code: "unknown_primary_git_service",
          severity: "error",
          message: `Node '${node.nodeId}' references an unknown primary git service.`,
          path: ["nodes", node.nodeId, "resourceBindings", "primaryGitServiceRef"],
          details: { gitServiceRef: resourceBindings.primaryGitServiceRef }
        })
      );
    }

    if (
      catalog &&
      resourceBindings.modelEndpointProfileRef &&
      !hasExistingId(modelEndpointIds, resourceBindings.modelEndpointProfileRef)
    ) {
      findings.push(
        createFinding({
          code: "unknown_model_endpoint_profile",
          severity: "error",
          message: `Node '${node.nodeId}' references an unknown model endpoint profile.`,
          path: ["nodes", node.nodeId, "resourceBindings", "modelEndpointProfileRef"],
          details: { modelEndpointProfileRef: resourceBindings.modelEndpointProfileRef }
        })
      );
    }
  }

  for (const edge of graph.edges) {
    if (!nodeIds.includes(edge.fromNodeId)) {
      findings.push(
        createFinding({
          code: "unknown_edge_source",
          severity: "error",
          message: `Edge '${edge.edgeId}' references missing source node '${edge.fromNodeId}'.`,
          path: ["edges", edge.edgeId, "fromNodeId"]
        })
      );
    }

    if (!nodeIds.includes(edge.toNodeId)) {
      findings.push(
        createFinding({
          code: "unknown_edge_target",
          severity: "error",
          message: `Edge '${edge.edgeId}' references missing target node '${edge.toNodeId}'.`,
          path: ["edges", edge.edgeId, "toNodeId"]
        })
      );
    }

    if (edge.fromNodeId === edge.toNodeId) {
      findings.push(
        createFinding({
          code: "self_referential_edge",
          severity: "warning",
          message: `Edge '${edge.edgeId}' is self-referential.`,
          path: ["edges", edge.edgeId]
        })
      );
    }

    for (const relayRef of edge.transportPolicy.relayProfileRefs) {
      if (catalog && !relayIds.includes(relayRef)) {
        findings.push(
          createFinding({
            code: "unknown_edge_relay_profile",
            severity: "error",
            message: `Edge '${edge.edgeId}' references relay profile '${relayRef}' that is missing from the catalog.`,
            path: ["edges", edge.edgeId, "transportPolicy", "relayProfileRefs"],
            details: { relayRef }
          })
        );
      }
    }
  }

  return findings;
}

export function validateGraphDocument(
  input: unknown,
  options: {
    catalog?: DeploymentResourceCatalog;
  } = {}
): ValidationReport {
  const parseResult = graphSpecSchema.safeParse(input);

  if (!parseResult.success) {
    return buildValidationReport(
      parseResult.error.issues.map((issue) =>
        createFinding({
          code: "graph_invalid",
          severity: "error",
          message: issue.message,
          path: issue.path.map(String)
        })
      )
    );
  }

  return buildValidationReport(
    validateGraphSemantics(parseResult.data, options.catalog)
  );
}

async function readJsonFile(filePath: string): Promise<unknown> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as unknown;
}

async function expectPath(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function validatePackageDirectory(
  directoryPath: string
): Promise<ValidationReport> {
  const manifestPath = path.join(directoryPath, "manifest.json");

  if (!(await expectPath(manifestPath))) {
    return buildValidationReport([
      createFinding({
        code: "missing_manifest",
        severity: "error",
        message: `No manifest.json was found in '${directoryPath}'.`,
        path: ["manifest.json"]
      })
    ]);
  }

  const manifest = agentPackageManifestSchema.parse(await readJsonFile(manifestPath));
  const report = validatePackageManifestDocument(manifest);
  const findings = [...report.findings];

  const requiredRelativePaths = [
    manifest.entryPrompts.system,
    manifest.entryPrompts.interaction,
    manifest.runtime.configPath,
    manifest.runtime.capabilitiesPath,
    manifest.memoryProfile.schemaPath
  ];

  for (const relativePath of requiredRelativePaths) {
    const absolutePath = path.join(directoryPath, relativePath);

    if (!(await expectPath(absolutePath))) {
      findings.push(
        createFinding({
          code: "missing_package_file",
          severity: "error",
          message: `Expected package file '${relativePath}' is missing.`,
          path: [relativePath]
        })
      );
    }
  }

  return buildValidationReport(findings);
}

export async function validateGraphFile(
  filePath: string,
  options: {
    catalog?: DeploymentResourceCatalog;
  } = {}
): Promise<ValidationReport> {
  const document = await readJsonFile(filePath);
  return validateGraphDocument(document, options);
}

export function formatValidationReport(report: ValidationReport): string {
  if (report.findings.length === 0) {
    return "Validation passed with no findings.";
  }

  return report.findings
    .map((finding) => {
      const renderedPath =
        finding.path.length > 0 ? ` at ${finding.path.join(".")}` : "";
      return `[${finding.severity.toUpperCase()}] ${finding.code}${renderedPath}: ${finding.message}`;
    })
    .join("\n");
}
