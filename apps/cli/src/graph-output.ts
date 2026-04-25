import {
  formatGraphEdgeDetail,
  formatGraphEdgeLabel,
  formatGraphRevisionDetail,
  formatGraphRevisionInspectionSummary,
  formatGraphRevisionLabel,
  formatManagedNodeDetail,
  formatManagedNodeLabel,
  sortGraphEdges,
  sortManagedGraphNodes
} from "@entangle/host-client";
import type {
  Edge,
  GraphInspectionResponse,
  GraphMutationResponse,
  GraphRevisionInspectionResponse,
  GraphRevisionMetadata,
  NodeInspectionResponse
} from "@entangle/types";

export type GraphCliSummary = {
  activeRevisionId?: string;
  edgeCount: number;
  graphId?: string;
  label: string;
  managedNodeCount: number;
  name?: string;
  nodeCount: number;
  runtimeProfile?: string;
};

export type GraphRevisionCliSummary = {
  appliedAt: string;
  detail: string;
  graphId: string;
  isActive: boolean;
  label: string;
  revisionId: string;
};

export type GraphRevisionInspectionCliSummary = {
  edgeCount: number;
  graph: {
    graphId: string;
    name: string;
  };
  nodeCount: number;
  revision: GraphRevisionCliSummary;
  summary: string;
};

export type GraphExportCliSummary = {
  graph: GraphCliSummary;
  outputPath: string;
};

export type GraphImportCliSummary = {
  applied: boolean;
  dryRun: boolean;
  graph: GraphCliSummary;
  validation: {
    errorCount: number;
    findingCodes: string[];
    ok: boolean;
    warningCount: number;
  };
};

export type NodeInspectionCliSummary = {
  detail: string;
  label: string;
  nodeId: string;
  nodeKind: string;
  packageSourceId?: string;
  runtime: {
    backendKind: string;
    contextAvailable: boolean;
    desiredState: string;
    findingCodes: string[];
    observedState: string;
    reconciliationState: string;
    restartGeneration: number;
  };
};

export type GraphEdgeCliSummary = {
  detail: string;
  edgeId: string;
  enabled: boolean;
  fromNodeId: string;
  label: string;
  relation: string;
  toNodeId: string;
};

export function projectGraphSummary(
  response: GraphInspectionResponse
): GraphCliSummary {
  if (!response.graph) {
    return {
      edgeCount: 0,
      label: "No active graph",
      managedNodeCount: 0,
      nodeCount: 0
    };
  }

  return {
    ...(response.activeRevisionId
      ? { activeRevisionId: response.activeRevisionId }
      : {}),
    edgeCount: response.graph.edges.length,
    graphId: response.graph.graphId,
    label: `${response.graph.name} (${response.graph.graphId})`,
    managedNodeCount: sortManagedGraphNodes(response.graph).length,
    name: response.graph.name,
    nodeCount: response.graph.nodes.length,
    runtimeProfile: response.graph.defaults.runtimeProfile
  };
}

function countValidationSeverity(
  response: GraphMutationResponse,
  severity: "error" | "warning"
): number {
  return response.validation.findings.filter(
    (finding) => finding.severity === severity
  ).length;
}

export function projectGraphExportSummary(input: {
  outputPath: string;
  response: GraphInspectionResponse;
}): GraphExportCliSummary {
  return {
    graph: projectGraphSummary(input.response),
    outputPath: input.outputPath
  };
}

export function projectGraphImportSummary(input: {
  applied: boolean;
  dryRun: boolean;
  response: GraphMutationResponse;
}): GraphImportCliSummary {
  return {
    applied: input.applied,
    dryRun: input.dryRun,
    graph: projectGraphSummary({
      ...(input.response.activeRevisionId
        ? { activeRevisionId: input.response.activeRevisionId }
        : {}),
      graph: input.response.graph
    }),
    validation: {
      errorCount: countValidationSeverity(input.response, "error"),
      findingCodes: input.response.validation.findings.map(
        (finding) => finding.code
      ),
      ok: input.response.validation.ok,
      warningCount: countValidationSeverity(input.response, "warning")
    }
  };
}

export function projectGraphRevisionSummary(
  revision: GraphRevisionMetadata
): GraphRevisionCliSummary {
  return {
    appliedAt: revision.appliedAt,
    detail: formatGraphRevisionDetail(revision),
    graphId: revision.graphId,
    isActive: revision.isActive,
    label: formatGraphRevisionLabel(revision),
    revisionId: revision.revisionId
  };
}

export function projectGraphRevisionInspectionSummary(
  inspection: GraphRevisionInspectionResponse
): GraphRevisionInspectionCliSummary {
  return {
    edgeCount: inspection.graph.edges.length,
    graph: {
      graphId: inspection.graph.graphId,
      name: inspection.graph.name
    },
    nodeCount: inspection.graph.nodes.length,
    revision: projectGraphRevisionSummary(inspection.revision),
    summary: formatGraphRevisionInspectionSummary(inspection)
  };
}

export function projectNodeInspectionSummary(
  inspection: NodeInspectionResponse
): NodeInspectionCliSummary {
  const node = inspection.binding.node;

  return {
    detail: formatManagedNodeDetail(node),
    label: formatManagedNodeLabel(node),
    nodeId: node.nodeId,
    nodeKind: node.nodeKind,
    ...(node.packageSourceRef ? { packageSourceId: node.packageSourceRef } : {}),
    runtime: {
      backendKind: inspection.runtime.backendKind,
      contextAvailable: inspection.runtime.contextAvailable,
      desiredState: inspection.runtime.desiredState,
      findingCodes: inspection.runtime.reconciliation.findingCodes,
      observedState: inspection.runtime.observedState,
      reconciliationState: inspection.runtime.reconciliation.state,
      restartGeneration: inspection.runtime.restartGeneration
    }
  };
}

export function projectGraphEdgeSummary(edge: Edge): GraphEdgeCliSummary {
  return {
    detail: formatGraphEdgeDetail(edge),
    edgeId: edge.edgeId,
    enabled: edge.enabled,
    fromNodeId: edge.fromNodeId,
    label: formatGraphEdgeLabel(edge),
    relation: edge.relation,
    toNodeId: edge.toNodeId
  };
}

export function projectSortedGraphEdgeSummaries(
  edges: Edge[]
): GraphEdgeCliSummary[] {
  return sortGraphEdges(edges).map(projectGraphEdgeSummary);
}
