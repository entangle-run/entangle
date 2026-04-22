import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import {
  agentPackageManifestSchema,
  buildValidationReport,
  type DeploymentResourceCatalog,
  deploymentResourceCatalogSchema,
  type GraphSpec,
  graphSpecSchema,
  type NodeBinding,
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

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function effectiveRelayRefs(
  node: NodeBinding,
  graph: GraphSpec,
  catalog?: DeploymentResourceCatalog
): string[] {
  if (node.resourceBindings.relayProfileRefs.length > 0) {
    return unique(node.resourceBindings.relayProfileRefs);
  }

  if (graph.defaults.resourceBindings.relayProfileRefs.length > 0) {
    return unique(graph.defaults.resourceBindings.relayProfileRefs);
  }

  return unique(catalog?.defaults.relayProfileRefs ?? []);
}

function effectivePrimaryRelayRef(
  node: NodeBinding,
  graph: GraphSpec,
  catalog?: DeploymentResourceCatalog
): string | undefined {
  return (
    node.resourceBindings.primaryRelayProfileRef ??
    graph.defaults.resourceBindings.primaryRelayProfileRef ??
    catalog?.defaults.relayProfileRefs[0]
  );
}

function effectiveGitServiceRefs(
  node: NodeBinding,
  graph: GraphSpec,
  catalog?: DeploymentResourceCatalog
): string[] {
  if (node.resourceBindings.gitServiceRefs.length > 0) {
    return unique(node.resourceBindings.gitServiceRefs);
  }

  if (graph.defaults.resourceBindings.gitServiceRefs.length > 0) {
    return unique(graph.defaults.resourceBindings.gitServiceRefs);
  }

  return catalog?.defaults.gitServiceRef
    ? [catalog.defaults.gitServiceRef]
    : [];
}

function effectivePrimaryGitServiceRef(
  node: NodeBinding,
  graph: GraphSpec,
  catalog?: DeploymentResourceCatalog
): string | undefined {
  return (
    node.resourceBindings.primaryGitServiceRef ??
    graph.defaults.resourceBindings.primaryGitServiceRef ??
    catalog?.defaults.gitServiceRef
  );
}

function effectiveModelEndpointRef(
  node: NodeBinding,
  graph: GraphSpec,
  catalog?: DeploymentResourceCatalog
): string | undefined {
  return (
    node.resourceBindings.modelEndpointProfileRef ??
    graph.defaults.resourceBindings.modelEndpointProfileRef ??
    catalog?.defaults.modelEndpointRef
  );
}

function intersect(values: string[], otherValues: string[]): string[] {
  const lookup = new Set(otherValues);
  return values.filter((value) => lookup.has(value));
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
  options: {
    catalog?: DeploymentResourceCatalog;
    packageSourceIds?: string[];
  } = {}
): ValidationFinding[] {
  const { catalog, packageSourceIds } = options;
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

  for (const relayRef of graph.defaults.resourceBindings.relayProfileRefs) {
    if (catalog && !relayIds.includes(relayRef)) {
      findings.push(
        createFinding({
          code: "unknown_graph_default_relay_profile",
          severity: "error",
          message: `Graph defaults reference relay profile '${relayRef}' that is missing from the catalog.`,
          path: ["defaults", "resourceBindings", "relayProfileRefs"],
          details: { relayRef }
        })
      );
    }
  }

  for (const gitServiceRef of graph.defaults.resourceBindings.gitServiceRefs) {
    if (catalog && !gitServiceIds.includes(gitServiceRef)) {
      findings.push(
        createFinding({
          code: "unknown_graph_default_git_service",
          severity: "error",
          message: `Graph defaults reference git service '${gitServiceRef}' that is missing from the catalog.`,
          path: ["defaults", "resourceBindings", "gitServiceRefs"],
          details: { gitServiceRef }
        })
      );
    }
  }

  if (
    catalog &&
    graph.defaults.resourceBindings.primaryRelayProfileRef &&
    !relayIds.includes(graph.defaults.resourceBindings.primaryRelayProfileRef)
  ) {
    findings.push(
      createFinding({
        code: "unknown_graph_default_primary_relay_profile",
        severity: "error",
        message: `Graph defaults reference an unknown primary relay profile '${graph.defaults.resourceBindings.primaryRelayProfileRef}'.`,
        path: ["defaults", "resourceBindings", "primaryRelayProfileRef"],
        details: {
          relayProfileRef: graph.defaults.resourceBindings.primaryRelayProfileRef
        }
      })
    );
  }

  if (
    catalog &&
    graph.defaults.resourceBindings.primaryGitServiceRef &&
    !gitServiceIds.includes(graph.defaults.resourceBindings.primaryGitServiceRef)
  ) {
    findings.push(
      createFinding({
        code: "unknown_graph_default_primary_git_service",
        severity: "error",
        message: `Graph defaults reference an unknown primary git service '${graph.defaults.resourceBindings.primaryGitServiceRef}'.`,
        path: ["defaults", "resourceBindings", "primaryGitServiceRef"],
        details: {
          gitServiceRef: graph.defaults.resourceBindings.primaryGitServiceRef
        }
      })
    );
  }

  if (
    catalog &&
    graph.defaults.resourceBindings.modelEndpointProfileRef &&
    !modelEndpointIds.includes(graph.defaults.resourceBindings.modelEndpointProfileRef)
  ) {
    findings.push(
      createFinding({
        code: "unknown_graph_default_model_endpoint",
        severity: "error",
        message: `Graph defaults reference an unknown model endpoint '${graph.defaults.resourceBindings.modelEndpointProfileRef}'.`,
        path: ["defaults", "resourceBindings", "modelEndpointProfileRef"],
        details: {
          modelEndpointProfileRef:
            graph.defaults.resourceBindings.modelEndpointProfileRef
        }
      })
    );
  }

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

    if (
      node.packageSourceRef &&
      packageSourceIds &&
      !packageSourceIds.includes(node.packageSourceRef)
    ) {
      findings.push(
        createFinding({
          code: "unknown_package_source_ref",
          severity: "error",
          message: `Node '${node.nodeId}' references package source '${node.packageSourceRef}' that is not admitted in the current host state.`,
          path: ["nodes", node.nodeId, "packageSourceRef"],
          details: { packageSourceRef: node.packageSourceRef }
        })
      );
    }

    const resourceBindings = node.resourceBindings;
    const resolvedRelayRefs = effectiveRelayRefs(node, graph, catalog);
    const resolvedPrimaryRelayRef = effectivePrimaryRelayRef(node, graph, catalog);
    const resolvedGitServiceRefs = effectiveGitServiceRefs(node, graph, catalog);
    const resolvedPrimaryGitServiceRef = effectivePrimaryGitServiceRef(
      node,
      graph,
      catalog
    );
    const resolvedModelEndpointRef = effectiveModelEndpointRef(node, graph, catalog);

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
      resolvedPrimaryRelayRef &&
      !resolvedRelayRefs.includes(resolvedPrimaryRelayRef)
    ) {
      findings.push(
        createFinding({
          code: "primary_relay_not_in_effective_set",
          severity: "error",
          message: `Node '${node.nodeId}' resolves primary relay profile '${resolvedPrimaryRelayRef}' outside its effective relay set.`,
          path: ["nodes", node.nodeId, "resourceBindings", "primaryRelayProfileRef"],
          details: { relayProfileRef: resolvedPrimaryRelayRef }
        })
      );
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

    for (const gitServiceRef of resourceBindings.gitServiceRefs) {
      if (catalog && !gitServiceIds.includes(gitServiceRef)) {
        findings.push(
          createFinding({
            code: "unknown_git_service_ref",
            severity: "error",
            message: `Node '${node.nodeId}' references git service '${gitServiceRef}' that is missing from the catalog.`,
            path: ["nodes", node.nodeId, "resourceBindings", "gitServiceRefs"],
            details: { gitServiceRef }
          })
        );
      }
    }

    if (
      catalog &&
      resolvedPrimaryGitServiceRef &&
      !resolvedGitServiceRefs.includes(resolvedPrimaryGitServiceRef)
    ) {
      findings.push(
        createFinding({
          code: "primary_git_service_not_in_effective_set",
          severity: "error",
          message: `Node '${node.nodeId}' resolves primary git service '${resolvedPrimaryGitServiceRef}' outside its effective git service set.`,
          path: ["nodes", node.nodeId, "resourceBindings", "primaryGitServiceRef"],
          details: { gitServiceRef: resolvedPrimaryGitServiceRef }
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

    if (
      node.nodeKind !== "user" &&
      catalog &&
      !resolvedModelEndpointRef
    ) {
      findings.push(
        createFinding({
          code: "missing_effective_model_endpoint",
          severity: "warning",
          message: `Non-user node '${node.nodeId}' has no effective model endpoint binding.`,
          path: ["nodes", node.nodeId, "resourceBindings", "modelEndpointProfileRef"]
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

    const sourceNode = graph.nodes.find((node) => node.nodeId === edge.fromNodeId);
    const targetNode = graph.nodes.find((node) => node.nodeId === edge.toNodeId);

    if (!sourceNode || !targetNode) {
      continue;
    }

    const sourceRelayRefs = effectiveRelayRefs(sourceNode, graph, catalog);
    const targetRelayRefs = effectiveRelayRefs(targetNode, graph, catalog);
    const transportRelayRefs =
      edge.transportPolicy.relayProfileRefs.length > 0
        ? edge.transportPolicy.relayProfileRefs
        : intersect(sourceRelayRefs, targetRelayRefs);
    const realizableRelayRefs = intersect(
      intersect(sourceRelayRefs, targetRelayRefs),
      transportRelayRefs
    );

    if (realizableRelayRefs.length === 0) {
      findings.push(
        createFinding({
          code: "unrealizable_edge_transport",
          severity: "error",
          message: `Edge '${edge.edgeId}' has no realizable direct relay route under the current effective bindings.`,
          path: ["edges", edge.edgeId, "transportPolicy"],
          details: {
            sourceRelayRefs,
            targetRelayRefs,
            transportRelayRefs
          }
        })
      );
    }
  }

  return findings;
}

export function validateGraphDocument(
  input: unknown,
  options: {
    catalog?: DeploymentResourceCatalog;
    packageSourceIds?: string[];
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
    validateGraphSemantics(parseResult.data, options)
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

  let manifestDocument: unknown;

  try {
    manifestDocument = await readJsonFile(manifestPath);
  } catch (error: unknown) {
    return buildValidationReport([
      createFinding({
        code: "invalid_manifest_json",
        severity: "error",
        message:
          error instanceof Error
            ? `Could not parse manifest.json: ${error.message}`
            : "Could not parse manifest.json.",
        path: ["manifest.json"]
      })
    ]);
  }

  const manifestParse = agentPackageManifestSchema.safeParse(manifestDocument);

  if (!manifestParse.success) {
    return buildValidationReport(
      manifestParse.error.issues.map((issue) =>
        createFinding({
          code: "package_manifest_invalid",
          severity: "error",
          message: issue.message,
          path: issue.path.map(String)
        })
      )
    );
  }

  const manifest = manifestParse.data;
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
    packageSourceIds?: string[];
  } = {}
): Promise<ValidationReport> {
  let document: unknown;

  try {
    document = await readJsonFile(filePath);
  } catch (error: unknown) {
    return buildValidationReport([
      createFinding({
        code: "invalid_graph_json",
        severity: "error",
        message:
          error instanceof Error
            ? `Could not parse graph JSON: ${error.message}`
            : "Could not parse graph JSON.",
        path: [filePath]
      })
    ]);
  }

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
