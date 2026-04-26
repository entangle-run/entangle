import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import {
  approvalRecordSchema,
  agentPackageManifestSchema,
  type ArtifactRef,
  buildValidationReport,
  conversationRecordSchema,
  type DeploymentResourceCatalog,
  deploymentResourceCatalogSchema,
  entangleA2AApprovalRequestMetadataSchema,
  entangleA2AApprovalResponseMetadataSchema,
  entangleA2AMessageSchema,
  type EntangleA2AMessage,
  entangleControlEventSchema,
  entangleObservationEventSchema,
  type EffectiveRuntimeContext,
  type ExternalPrincipalRecord,
  type GraphSpec,
  graphSpecSchema,
  hostAuthorityRecordSchema,
  intersectIdentifiers,
  isAllowedApprovalLifecycleTransition,
  isAllowedConversationLifecycleTransition,
  isAllowedSessionLifecycleTransition,
  resolveEffectiveExternalPrincipals,
  resolveEffectiveExternalPrincipalRefs,
  resolveEffectiveAgentEngineProfile,
  resolveEffectiveGitServiceRefs,
  resolveEffectiveModelEndpointProfileRef,
  resolveGitPrincipalBindingForService,
  resolveGitRepositoryTargetForArtifactLocator,
  resolveEffectivePrimaryGitServiceRef,
  resolveEffectivePrimaryRelayProfileRef,
  resolveEffectiveRelayProfileRefs,
  packageToolCatalogSchema,
  runnerRegistrationRecordSchema,
  runnerTurnRecordSchema,
  runtimeAssignmentRecordSchema,
  sessionRecordSchema,
  userNodeIdentityRecordSchema,
  type ValidationFinding,
  type ValidationReport
} from "@entangle/types";

type SchemaParseIssue = {
  message: string;
  path: Array<string | number | symbol>;
};

type SchemaParseResult =
  | { success: true }
  | { success: false; error: { issues: SchemaParseIssue[] } };

type DocumentSchema = {
  safeParse(input: unknown): SchemaParseResult;
};

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

function validateSchemaDocument(
  input: unknown,
  schema: DocumentSchema,
  code: string
): ValidationReport {
  const parseResult = schema.safeParse(input);

  if (!parseResult.success) {
    return buildValidationReport(
      parseResult.error.issues.map((issue) =>
        createFinding({
          code,
          severity: "error",
          message: issue.message,
          path: issue.path.map(String)
        })
      )
    );
  }

  return buildValidationReport([]);
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
    ),
    ...collectDuplicateFindings(
      catalog.agentEngineProfiles.map((profile) => profile.id),
      ["agentEngineProfiles"]
    )
  );

  const relayIds = catalog.relays.map((relay) => relay.id);
  const gitServiceIds = catalog.gitServices.map((service) => service.id);
  const modelEndpointIds = catalog.modelEndpoints.map((endpoint) => endpoint.id);
  const agentEngineProfileIds = catalog.agentEngineProfiles.map(
    (profile) => profile.id
  );

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

  if (
    catalog.defaults.agentEngineProfileRef &&
    !agentEngineProfileIds.includes(catalog.defaults.agentEngineProfileRef)
  ) {
    findings.push(
      createFinding({
        code: "unknown_default_agent_engine_profile",
        severity: "error",
        message: `Default agent engine profile '${catalog.defaults.agentEngineProfileRef}' does not exist in the catalog.`,
        path: ["defaults", "agentEngineProfileRef"],
        details: {
          agentEngineProfileRef: catalog.defaults.agentEngineProfileRef
        }
      })
    );
  }

  return buildValidationReport(findings);
}

export function validateHostAuthorityDocument(
  input: unknown
): ValidationReport {
  return validateSchemaDocument(
    input,
    hostAuthorityRecordSchema,
    "host_authority_invalid"
  );
}

export function validateUserNodeIdentityDocument(
  input: unknown
): ValidationReport {
  return validateSchemaDocument(
    input,
    userNodeIdentityRecordSchema,
    "user_node_identity_invalid"
  );
}

export function validateRunnerRegistrationDocument(
  input: unknown
): ValidationReport {
  return validateSchemaDocument(
    input,
    runnerRegistrationRecordSchema,
    "runner_registration_invalid"
  );
}

export function validateRuntimeAssignmentDocument(
  input: unknown
): ValidationReport {
  return validateSchemaDocument(
    input,
    runtimeAssignmentRecordSchema,
    "runtime_assignment_invalid"
  );
}

export function validateEntangleControlEventDocument(
  input: unknown
): ValidationReport {
  return validateSchemaDocument(
    input,
    entangleControlEventSchema,
    "entangle_control_event_invalid"
  );
}

export function validateEntangleObservationEventDocument(
  input: unknown
): ValidationReport {
  return validateSchemaDocument(
    input,
    entangleObservationEventSchema,
    "entangle_observation_event_invalid"
  );
}

function validateGraphSemantics(
  graph: GraphSpec,
  options: {
    catalog?: DeploymentResourceCatalog;
    externalPrincipals?: ExternalPrincipalRecord[];
    packageSourceIds?: string[];
  } = {}
): ValidationFinding[] {
  const { catalog, externalPrincipals, packageSourceIds } = options;
  const findings: ValidationFinding[] = [];
  const nodeIds = graph.nodes.map((node) => node.nodeId);
  const edgeIds = graph.edges.map((edge) => edge.edgeId);
  const externalPrincipalIds =
    externalPrincipals?.map((principal) => principal.principalId) ?? [];
  const relayIds = catalog?.relays.map((relay) => relay.id) ?? [];
  const gitServiceIds = catalog?.gitServices.map((service) => service.id) ?? [];
  const modelEndpointIds =
    catalog?.modelEndpoints.map((endpoint) => endpoint.id) ?? [];
  const agentEngineProfileIds =
    catalog?.agentEngineProfiles?.map((profile) => profile.id) ?? [];

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

  for (const externalPrincipalRef of graph.defaults.resourceBindings.externalPrincipalRefs) {
    if (externalPrincipals && !externalPrincipalIds.includes(externalPrincipalRef)) {
      findings.push(
        createFinding({
          code: "unknown_graph_default_external_principal",
          severity: "error",
          message: `Graph defaults reference external principal '${externalPrincipalRef}' that is missing from host state.`,
          path: ["defaults", "resourceBindings", "externalPrincipalRefs"],
          details: { externalPrincipalRef }
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

  if (
    catalog &&
    graph.defaults.agentRuntime.engineProfileRef &&
    !agentEngineProfileIds.includes(graph.defaults.agentRuntime.engineProfileRef)
  ) {
    findings.push(
      createFinding({
        code: "unknown_graph_default_agent_engine_profile",
        severity: "error",
        message: `Graph defaults reference an unknown agent engine profile '${graph.defaults.agentRuntime.engineProfileRef}'.`,
        path: ["defaults", "agentRuntime", "engineProfileRef"],
        details: {
          agentEngineProfileRef: graph.defaults.agentRuntime.engineProfileRef
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
    const resolvedExternalPrincipalRefs = resolveEffectiveExternalPrincipalRefs(
      node,
      graph
    );
    const resolvedExternalPrincipals = resolveEffectiveExternalPrincipals(
      node,
      graph,
      externalPrincipals ?? []
    );
    const resolvedRelayRefs = resolveEffectiveRelayProfileRefs(node, graph, catalog);
    const resolvedPrimaryRelayRef = resolveEffectivePrimaryRelayProfileRef(
      node,
      graph,
      catalog
    );
    const resolvedGitServiceRefs = resolveEffectiveGitServiceRefs(
      node,
      graph,
      catalog
    );
    const resolvedPrimaryGitServiceRef = resolveEffectivePrimaryGitServiceRef(
      node,
      graph,
      catalog
    );
    const resolvedModelEndpointRef = resolveEffectiveModelEndpointProfileRef(
      node,
      graph,
      catalog
    );
    const resolvedAgentEngineProfile = resolveEffectiveAgentEngineProfile(
      node,
      graph,
      catalog
    );

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

    for (const externalPrincipalRef of resourceBindings.externalPrincipalRefs) {
      if (externalPrincipals && !externalPrincipalIds.includes(externalPrincipalRef)) {
        findings.push(
          createFinding({
            code: "unknown_external_principal_ref",
            severity: "error",
            message: `Node '${node.nodeId}' references external principal '${externalPrincipalRef}' that is missing from host state.`,
            path: ["nodes", node.nodeId, "resourceBindings", "externalPrincipalRefs"],
            details: { externalPrincipalRef }
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
      externalPrincipals &&
      resolvedExternalPrincipalRefs.length > 0 &&
      resolvedExternalPrincipals.length !== resolvedExternalPrincipalRefs.length
    ) {
      findings.push(
        createFinding({
          code: "effective_external_principal_resolution_incomplete",
          severity: "error",
          message: `Node '${node.nodeId}' did not resolve every effective external principal reference.`,
          path: ["nodes", node.nodeId, "resourceBindings", "externalPrincipalRefs"],
          details: {
            resolvedExternalPrincipalRefs
          }
        })
      );
    }

    const resolvedGitPrincipals = resolvedExternalPrincipals.filter(
      (principal) => principal.systemKind === "git"
    );

    for (const principal of resolvedGitPrincipals) {
      if (!resolvedGitServiceRefs.includes(principal.gitServiceRef)) {
        findings.push(
          createFinding({
            code: "git_principal_outside_effective_git_services",
            severity: "error",
            message: `Node '${node.nodeId}' resolves git principal '${principal.principalId}' outside its effective git service set.`,
            path: ["nodes", node.nodeId, "resourceBindings", "externalPrincipalRefs"],
            details: {
              gitServiceRef: principal.gitServiceRef,
              principalId: principal.principalId
            }
          })
        );
      }
    }

    if (externalPrincipals && resolvedPrimaryGitServiceRef) {
      const matchingPrimaryGitPrincipals = resolvedGitPrincipals.filter(
        (principal) => principal.gitServiceRef === resolvedPrimaryGitServiceRef
      );

      if (matchingPrimaryGitPrincipals.length > 1) {
        findings.push(
          createFinding({
            code: "ambiguous_primary_git_principal",
            severity: "error",
            message: `Node '${node.nodeId}' resolves multiple git principals for primary git service '${resolvedPrimaryGitServiceRef}'.`,
            path: ["nodes", node.nodeId, "resourceBindings", "externalPrincipalRefs"],
            details: {
              gitServiceRef: resolvedPrimaryGitServiceRef,
              principalIds: matchingPrimaryGitPrincipals.map(
                (principal) => principal.principalId
              )
            }
          })
        );
      }

      if (
        node.nodeKind !== "user" &&
        matchingPrimaryGitPrincipals.length === 0
      ) {
        findings.push(
          createFinding({
            code: "missing_primary_git_principal",
            severity: "warning",
            message: `Non-user node '${node.nodeId}' has no git principal bound for primary git service '${resolvedPrimaryGitServiceRef}'.`,
            path: ["nodes", node.nodeId, "resourceBindings", "externalPrincipalRefs"],
            details: {
              gitServiceRef: resolvedPrimaryGitServiceRef
            }
          })
        );
      }
    }

    if (
      externalPrincipals &&
      !resolvedPrimaryGitServiceRef &&
      resolvedGitPrincipals.length > 1
    ) {
      findings.push(
        createFinding({
          code: "ambiguous_git_principal_without_primary_service",
          severity: "warning",
          message: `Node '${node.nodeId}' resolves multiple git principals without an effective primary git service.`,
          path: ["nodes", node.nodeId, "resourceBindings", "externalPrincipalRefs"],
          details: {
            principalIds: resolvedGitPrincipals.map((principal) => principal.principalId)
          }
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
      catalog &&
      node.agentRuntime.engineProfileRef &&
      !hasExistingId(agentEngineProfileIds, node.agentRuntime.engineProfileRef)
    ) {
      findings.push(
        createFinding({
          code: "unknown_agent_engine_profile",
          severity: "error",
          message: `Node '${node.nodeId}' references an unknown agent engine profile.`,
          path: ["nodes", node.nodeId, "agentRuntime", "engineProfileRef"],
          details: {
            agentEngineProfileRef: node.agentRuntime.engineProfileRef
          }
        })
      );
    }

    if (
      catalog &&
      !resolvedAgentEngineProfile
    ) {
      findings.push(
        createFinding({
          code: "missing_effective_agent_engine_profile",
          severity: "error",
          message: `Node '${node.nodeId}' has no effective agent engine profile.`,
          path: ["nodes", node.nodeId, "agentRuntime", "engineProfileRef"]
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

    const sourceRelayRefs = resolveEffectiveRelayProfileRefs(
      sourceNode,
      graph,
      catalog
    );
    const targetRelayRefs = resolveEffectiveRelayProfileRefs(
      targetNode,
      graph,
      catalog
    );
    const transportRelayRefs =
      edge.transportPolicy.relayProfileRefs.length > 0
        ? edge.transportPolicy.relayProfileRefs
        : intersectIdentifiers(sourceRelayRefs, targetRelayRefs);
    const realizableRelayRefs = intersectIdentifiers(
      intersectIdentifiers(sourceRelayRefs, targetRelayRefs),
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
    externalPrincipals?: ExternalPrincipalRecord[];
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

function validateA2AApprovalMetadata(
  message: EntangleA2AMessage
): ValidationFinding[] {
  if (message.messageType === "approval.request") {
    const parseResult = entangleA2AApprovalRequestMetadataSchema.safeParse(
      message.work.metadata
    );

    if (!parseResult.success) {
      return parseResult.error.issues.map((issue) =>
        createFinding({
          code: "a2a_approval_request_metadata_invalid",
          severity: "error",
          message: `Invalid approval.request metadata: ${issue.message}`,
          path: ["work", "metadata", ...issue.path.map(String)]
        })
      );
    }
  }

  if (message.messageType === "approval.response") {
    const parseResult = entangleA2AApprovalResponseMetadataSchema.safeParse(
      message.work.metadata
    );

    if (!parseResult.success) {
      return parseResult.error.issues.map((issue) =>
        createFinding({
          code: "a2a_approval_response_metadata_invalid",
          severity: "error",
          message: `Invalid approval.response metadata: ${issue.message}`,
          path: ["work", "metadata", ...issue.path.map(String)]
        })
      );
    }
  }

  return [];
}

function validateA2AApprovalResponsePolicy(
  message: EntangleA2AMessage
): ValidationFinding[] {
  const findings: ValidationFinding[] = [];

  if (
    message.messageType === "approval.request" &&
    !message.responsePolicy.responseRequired
  ) {
    findings.push(
      createFinding({
        code: "a2a_approval_request_response_policy_invalid",
        severity: "error",
        message: "approval.request messages must require an approval response.",
        path: ["responsePolicy", "responseRequired"]
      })
    );
  }

  if (message.messageType === "approval.response") {
    if (message.responsePolicy.responseRequired) {
      findings.push(
        createFinding({
          code: "a2a_approval_response_policy_invalid",
          severity: "error",
          message: "approval.response messages must not request a follow-up.",
          path: ["responsePolicy", "responseRequired"]
        })
      );
    }

    if (message.responsePolicy.maxFollowups !== 0) {
      findings.push(
        createFinding({
          code: "a2a_approval_response_policy_invalid",
          severity: "error",
          message: "approval.response messages must have maxFollowups set to 0.",
          path: ["responsePolicy", "maxFollowups"]
        })
      );
    }
  }

  return findings;
}

export function validateA2AMessageDocument(input: unknown): ValidationReport {
  const parseResult = entangleA2AMessageSchema.safeParse(input);

  if (!parseResult.success) {
    return buildValidationReport(
      parseResult.error.issues.map((issue) =>
        createFinding({
          code: "a2a_message_invalid",
          severity: "error",
          message: issue.message,
          path: issue.path.map(String)
        })
      )
    );
  }

  return buildValidationReport([
    ...validateA2AApprovalMetadata(parseResult.data),
    ...validateA2AApprovalResponsePolicy(parseResult.data)
  ]);
}

export function validateRuntimeArtifactRefs(input: {
  artifactRefs: ArtifactRef[];
  context: EffectiveRuntimeContext;
}): ValidationReport {
  const findings: ValidationFinding[] = [];
  const gitServiceIds = input.context.artifactContext.gitServices.map(
    (service) => service.id
  );

  input.artifactRefs.forEach((artifactRef, index) => {
    if (artifactRef.backend !== "git") {
      return;
    }

    const pathPrefix = ["artifactRefs", String(index), "locator"];

    if (artifactRef.status !== "published") {
      findings.push(
        createFinding({
          code: "git_artifact_not_published",
          severity: "error",
          message:
            `Git artifact '${artifactRef.artifactId}' must be published before a downstream node can retrieve it.`,
          path: ["artifactRefs", String(index), "status"],
          details: { artifactId: artifactRef.artifactId, status: artifactRef.status }
        })
      );
    }

    if (!artifactRef.locator.gitServiceRef) {
      findings.push(
        createFinding({
          code: "git_artifact_missing_service_ref",
          severity: "error",
          message:
            `Git artifact '${artifactRef.artifactId}' is missing locator.gitServiceRef, so the receiving node cannot resolve a retrieval service.`,
          path: [...pathPrefix, "gitServiceRef"],
          details: { artifactId: artifactRef.artifactId }
        })
      );
    } else if (!gitServiceIds.includes(artifactRef.locator.gitServiceRef)) {
      findings.push(
        createFinding({
          code: "git_artifact_unbound_service",
          severity: "error",
          message:
            `Git artifact '${artifactRef.artifactId}' references git service '${artifactRef.locator.gitServiceRef}', which is not bound in the receiving runtime context.`,
          path: [...pathPrefix, "gitServiceRef"],
          details: {
            artifactId: artifactRef.artifactId,
            gitServiceRef: artifactRef.locator.gitServiceRef
          }
        })
      );
    }

    if (!artifactRef.locator.namespace) {
      findings.push(
        createFinding({
          code: "git_artifact_missing_namespace",
          severity: "error",
          message:
            `Git artifact '${artifactRef.artifactId}' is missing locator.namespace, so the receiving node cannot validate repository ownership.`,
          path: [...pathPrefix, "namespace"],
          details: { artifactId: artifactRef.artifactId }
        })
      );
    }

    if (!artifactRef.locator.repositoryName) {
      findings.push(
        createFinding({
          code: "git_artifact_missing_repository_name",
          severity: "error",
          message:
            `Git artifact '${artifactRef.artifactId}' is missing locator.repositoryName, so the receiving node cannot resolve the remote repository.`,
          path: [...pathPrefix, "repositoryName"],
          details: { artifactId: artifactRef.artifactId }
        })
      );
    }

    if (!artifactRef.locator.gitServiceRef) {
      return;
    }

    const principalResolution = resolveGitPrincipalBindingForService({
      artifactContext: input.context.artifactContext,
      gitServiceRef: artifactRef.locator.gitServiceRef
    });

    if (principalResolution.status === "missing") {
      findings.push(
        createFinding({
          code: "git_handoff_missing_transport_principal",
          severity: "error",
          message:
            `Git artifact '${artifactRef.artifactId}' targets service '${artifactRef.locator.gitServiceRef}', but the receiving runtime has no git transport principal bound for that service.`,
          path: ["artifactContext", "gitPrincipalBindings"],
          details: {
            artifactId: artifactRef.artifactId,
            gitServiceRef: artifactRef.locator.gitServiceRef
          }
        })
      );
    } else if (principalResolution.status === "ambiguous") {
      findings.push(
        createFinding({
          code: "git_handoff_ambiguous_transport_principal",
          severity: "error",
          message:
            `Git artifact '${artifactRef.artifactId}' targets service '${artifactRef.locator.gitServiceRef}', but the receiving runtime resolves multiple candidate git transport principals for that service.`,
          path: ["artifactContext", "gitPrincipalBindings"],
          details: {
            artifactId: artifactRef.artifactId,
            gitServiceRef: artifactRef.locator.gitServiceRef,
            principalIds: principalResolution.candidatePrincipalIds
          }
        })
      );
    }

    if (
      artifactRef.locator.namespace &&
      artifactRef.locator.repositoryName &&
      !resolveGitRepositoryTargetForArtifactLocator({
        artifactContext: input.context.artifactContext,
        locator: artifactRef.locator
      })
    ) {
      findings.push(
        createFinding({
          code: "git_handoff_unresolvable_repository_target",
          severity: "error",
          message:
            `Git artifact '${artifactRef.artifactId}' could not be resolved into a concrete repository target from the receiving runtime context.`,
          path: [...pathPrefix, "repositoryName"],
          details: {
            artifactId: artifactRef.artifactId
          }
        })
      );
    }
  });

  return buildValidationReport(findings);
}

export function validateSessionRecordDocument(input: unknown): ValidationReport {
  const parseResult = sessionRecordSchema.safeParse(input);

  if (!parseResult.success) {
    return buildValidationReport(
      parseResult.error.issues.map((issue) =>
        createFinding({
          code: "session_record_invalid",
          severity: "error",
          message: issue.message,
          path: issue.path.map(String)
        })
      )
    );
  }

  return buildValidationReport([]);
}

export function validateConversationRecordDocument(
  input: unknown
): ValidationReport {
  const parseResult = conversationRecordSchema.safeParse(input);

  if (!parseResult.success) {
    return buildValidationReport(
      parseResult.error.issues.map((issue) =>
        createFinding({
          code: "conversation_record_invalid",
          severity: "error",
          message: issue.message,
          path: issue.path.map(String)
        })
      )
    );
  }

  return buildValidationReport([]);
}

export function validateApprovalRecordDocument(input: unknown): ValidationReport {
  const parseResult = approvalRecordSchema.safeParse(input);

  if (!parseResult.success) {
    return buildValidationReport(
      parseResult.error.issues.map((issue) =>
        createFinding({
          code: "approval_record_invalid",
          severity: "error",
          message: issue.message,
          path: issue.path.map(String)
        })
      )
    );
  }

  return buildValidationReport([]);
}

export function validateRunnerTurnRecordDocument(input: unknown): ValidationReport {
  const parseResult = runnerTurnRecordSchema.safeParse(input);

  if (!parseResult.success) {
    return buildValidationReport(
      parseResult.error.issues.map((issue) =>
        createFinding({
          code: "runner_turn_record_invalid",
          severity: "error",
          message: issue.message,
          path: issue.path.map(String)
        })
      )
    );
  }

  return buildValidationReport([]);
}

function buildTransitionValidationReport(input: {
  kind: "approval" | "conversation" | "session";
  fromState: string;
  toState: string;
  allowed: boolean;
}): ValidationReport {
  if (input.allowed) {
    return buildValidationReport([]);
  }

  return buildValidationReport([
    createFinding({
      code: `${input.kind}_transition_invalid`,
      severity: "error",
      message: `Transition '${input.fromState} -> ${input.toState}' is not allowed for ${input.kind} state.`,
      path: ["status"],
      details: {
        fromState: input.fromState,
        toState: input.toState
      }
    })
  ]);
}

export function validateSessionLifecycleTransition(
  fromState: Parameters<typeof isAllowedSessionLifecycleTransition>[0],
  toState: Parameters<typeof isAllowedSessionLifecycleTransition>[1]
): ValidationReport {
  return buildTransitionValidationReport({
    allowed: isAllowedSessionLifecycleTransition(fromState, toState),
    fromState,
    kind: "session",
    toState
  });
}

export function validateConversationLifecycleTransition(
  fromState: Parameters<typeof isAllowedConversationLifecycleTransition>[0],
  toState: Parameters<typeof isAllowedConversationLifecycleTransition>[1]
): ValidationReport {
  return buildTransitionValidationReport({
    allowed: isAllowedConversationLifecycleTransition(fromState, toState),
    fromState,
    kind: "conversation",
    toState
  });
}

export function validateApprovalLifecycleTransition(
  fromState: Parameters<typeof isAllowedApprovalLifecycleTransition>[0],
  toState: Parameters<typeof isAllowedApprovalLifecycleTransition>[1]
): ValidationReport {
  return buildTransitionValidationReport({
    allowed: isAllowedApprovalLifecycleTransition(fromState, toState),
    fromState,
    kind: "approval",
    toState
  });
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
    manifest.runtime.toolsPath,
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

  const toolsPath = path.join(directoryPath, manifest.runtime.toolsPath);

  if (await expectPath(toolsPath)) {
    try {
      const toolCatalogDocument = await readJsonFile(toolsPath);
      const toolCatalogParse = packageToolCatalogSchema.safeParse(
        toolCatalogDocument
      );

      if (!toolCatalogParse.success) {
        findings.push(
          ...toolCatalogParse.error.issues.map((issue) =>
            createFinding({
              code: "package_tool_catalog_invalid",
              severity: "error",
              message: issue.message,
              path: [manifest.runtime.toolsPath, ...issue.path.map(String)]
            })
          )
        );
      }
    } catch (error: unknown) {
      findings.push(
        createFinding({
          code: "invalid_package_tool_catalog_json",
          severity: "error",
          message:
            error instanceof Error
              ? `Could not parse package tool catalog: ${error.message}`
              : "Could not parse package tool catalog.",
          path: [manifest.runtime.toolsPath]
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
