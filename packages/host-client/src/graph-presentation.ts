import type {
  Edge,
  GraphRevisionInspectionResponse,
  GraphRevisionMetadata,
  GraphSpec,
  NodeBinding,
  NodeInspectionResponse
} from "@entangle/types";

export function sortGraphRevisions(
  revisions: GraphRevisionMetadata[]
): GraphRevisionMetadata[] {
  return [...revisions].sort((left, right) =>
    right.appliedAt.localeCompare(left.appliedAt)
  );
}

export function formatGraphRevisionLabel(
  revision: GraphRevisionMetadata
): string {
  return `${revision.revisionId}${revision.isActive ? " · active" : ""}`;
}

export function formatGraphRevisionDetail(
  revision: GraphRevisionMetadata
): string {
  return `${revision.graphId} · applied ${revision.appliedAt}`;
}

export function formatGraphRevisionInspectionSummary(
  inspection: GraphRevisionInspectionResponse
): string {
  return `${inspection.graph.nodes.length} nodes · ${inspection.graph.edges.length} edges`;
}

export function sortManagedGraphNodes(
  graph: GraphSpec | undefined
): NodeBinding[] {
  const nodes = graph?.nodes ?? [];

  return nodes
    .filter((node) => node.nodeKind !== "user")
    .sort((left, right) => left.nodeId.localeCompare(right.nodeId));
}

export function sortNodeInspectionsForPresentation(
  nodes: NodeInspectionResponse[]
): NodeInspectionResponse[] {
  return [...nodes].sort((left, right) =>
    left.binding.node.nodeId.localeCompare(right.binding.node.nodeId)
  );
}

export function formatManagedNodeLabel(node: NodeBinding): string {
  return `${node.displayName} · ${node.nodeKind}`;
}

export function formatManagedNodeDetail(node: NodeBinding): string {
  const relaySummary =
    node.resourceBindings.relayProfileRefs.length > 0
      ? `${node.resourceBindings.relayProfileRefs.length} relay refs`
      : "graph relay defaults";

  return `package ${node.packageSourceRef ?? "unbound"} · ${relaySummary} · initiate ${node.autonomy.canInitiateSessions ? "yes" : "no"}`;
}

export function sortGraphEdges(edges: Edge[]): Edge[] {
  return [...edges].sort((left, right) => left.edgeId.localeCompare(right.edgeId));
}

export function formatGraphEdgeLabel(edge: Edge): string {
  return `${edge.edgeId} · ${edge.relation}`;
}

export function formatGraphEdgeDetail(edge: Edge): string {
  const state = edge.enabled ? "enabled" : "disabled";
  const relaySummary =
    edge.transportPolicy.relayProfileRefs.length > 0
      ? `${edge.transportPolicy.relayProfileRefs.length} relay profile refs`
      : "shared graph relay set";

  return `${edge.fromNodeId} -> ${edge.toNodeId} · ${state} · channel ${edge.transportPolicy.channel} · ${relaySummary}`;
}
