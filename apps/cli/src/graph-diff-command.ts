import type { Edge, GraphSpec, NodeBinding } from "@entangle/types";

export type GraphEntityChangeSummary = {
  changedFields: string[];
};

export type GraphNodeSummary = {
  displayName: string;
  nodeId: string;
  nodeKind: string;
  packageSourceRef?: string;
};

export type GraphEdgeSummary = {
  edgeId: string;
  enabled: boolean;
  fromNodeId: string;
  relation: string;
  toNodeId: string;
};

export type ChangedGraphNodeSummary = GraphEntityChangeSummary & {
  after: GraphNodeSummary;
  before: GraphNodeSummary;
  nodeId: string;
};

export type ChangedGraphEdgeSummary = GraphEntityChangeSummary & {
  after: GraphEdgeSummary;
  before: GraphEdgeSummary;
  edgeId: string;
};

export type GraphDiffSummary = {
  defaultsChanged: boolean;
  edges: {
    added: GraphEdgeSummary[];
    changed: ChangedGraphEdgeSummary[];
    removed: GraphEdgeSummary[];
  };
  from: {
    edgeCount: number;
    graphId: string;
    name: string;
    nodeCount: number;
    runtimeProfile: string;
  };
  hasChanges: boolean;
  identityChangedFields: string[];
  nodes: {
    added: GraphNodeSummary[];
    changed: ChangedGraphNodeSummary[];
    removed: GraphNodeSummary[];
  };
  to: {
    edgeCount: number;
    graphId: string;
    name: string;
    nodeCount: number;
    runtimeProfile: string;
  };
  totals: {
    edgesAdded: number;
    edgesChanged: number;
    edgesRemoved: number;
    nodesAdded: number;
    nodesChanged: number;
    nodesRemoved: number;
  };
};

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([key, entryValue]) => [key, canonicalize(entryValue)])
    );
  }

  return value;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function hasEntityChanged(left: unknown, right: unknown): boolean {
  return canonicalJson(left) !== canonicalJson(right);
}

function changedFields<T extends Record<string, unknown>>(
  left: T,
  right: T,
  fields: string[]
): string[] {
  return fields.filter(
    (field) => canonicalJson(left[field]) !== canonicalJson(right[field])
  );
}

function mapById<T>(items: T[], getId: (item: T) => string): Map<string, T> {
  return new Map(items.map((item) => [getId(item), item]));
}

function sortById<T>(items: T[], getId: (item: T) => string): T[] {
  return [...items].sort((left, right) => getId(left).localeCompare(getId(right)));
}

function projectNode(node: NodeBinding): GraphNodeSummary {
  return {
    displayName: node.displayName,
    nodeId: node.nodeId,
    nodeKind: node.nodeKind,
    ...(node.packageSourceRef ? { packageSourceRef: node.packageSourceRef } : {})
  };
}

function projectEdge(edge: Edge): GraphEdgeSummary {
  return {
    edgeId: edge.edgeId,
    enabled: edge.enabled,
    fromNodeId: edge.fromNodeId,
    relation: edge.relation,
    toNodeId: edge.toNodeId
  };
}

function graphDescriptor(graph: GraphSpec): GraphDiffSummary["from"] {
  return {
    edgeCount: graph.edges.length,
    graphId: graph.graphId,
    name: graph.name,
    nodeCount: graph.nodes.length,
    runtimeProfile: graph.defaults.runtimeProfile
  };
}

export function buildGraphDiff(
  fromGraph: GraphSpec,
  toGraph: GraphSpec
): GraphDiffSummary {
  const fromNodes = mapById(fromGraph.nodes, (node) => node.nodeId);
  const toNodes = mapById(toGraph.nodes, (node) => node.nodeId);
  const fromEdges = mapById(fromGraph.edges, (edge) => edge.edgeId);
  const toEdges = mapById(toGraph.edges, (edge) => edge.edgeId);

  const addedNodes = sortById(
    toGraph.nodes.filter((node) => !fromNodes.has(node.nodeId)),
    (node) => node.nodeId
  ).map(projectNode);
  const removedNodes = sortById(
    fromGraph.nodes.filter((node) => !toNodes.has(node.nodeId)),
    (node) => node.nodeId
  ).map(projectNode);
  const changedNodes = sortById(
    toGraph.nodes.filter((node) => {
      const fromNode = fromNodes.get(node.nodeId);
      return fromNode !== undefined && hasEntityChanged(fromNode, node);
    }),
    (node) => node.nodeId
  ).map((node) => {
    const fromNode = fromNodes.get(node.nodeId)!;

    return {
      after: projectNode(node),
      before: projectNode(fromNode),
      changedFields: changedFields(
        fromNode as unknown as Record<string, unknown>,
        node as unknown as Record<string, unknown>,
        [
          "displayName",
          "nodeKind",
          "packageSourceRef",
          "resourceBindings",
          "autonomy"
        ]
      ),
      nodeId: node.nodeId
    };
  });

  const addedEdges = sortById(
    toGraph.edges.filter((edge) => !fromEdges.has(edge.edgeId)),
    (edge) => edge.edgeId
  ).map(projectEdge);
  const removedEdges = sortById(
    fromGraph.edges.filter((edge) => !toEdges.has(edge.edgeId)),
    (edge) => edge.edgeId
  ).map(projectEdge);
  const changedEdges = sortById(
    toGraph.edges.filter((edge) => {
      const fromEdge = fromEdges.get(edge.edgeId);
      return fromEdge !== undefined && hasEntityChanged(fromEdge, edge);
    }),
    (edge) => edge.edgeId
  ).map((edge) => {
    const fromEdge = fromEdges.get(edge.edgeId)!;

    return {
      after: projectEdge(edge),
      before: projectEdge(fromEdge),
      changedFields: changedFields(
        fromEdge as unknown as Record<string, unknown>,
        edge as unknown as Record<string, unknown>,
        ["fromNodeId", "toNodeId", "relation", "enabled", "transportPolicy"]
      ),
      edgeId: edge.edgeId
    };
  });

  const defaultsChanged = hasEntityChanged(fromGraph.defaults, toGraph.defaults);
  const identityChangedFields = changedFields(
    fromGraph as unknown as Record<string, unknown>,
    toGraph as unknown as Record<string, unknown>,
    ["schemaVersion", "graphId", "name"]
  );
  const totals = {
    edgesAdded: addedEdges.length,
    edgesChanged: changedEdges.length,
    edgesRemoved: removedEdges.length,
    nodesAdded: addedNodes.length,
    nodesChanged: changedNodes.length,
    nodesRemoved: removedNodes.length
  };
  const hasChanges =
    defaultsChanged ||
    identityChangedFields.length > 0 ||
    Object.values(totals).some((count) => count > 0);

  return {
    defaultsChanged,
    edges: {
      added: addedEdges,
      changed: changedEdges,
      removed: removedEdges
    },
    from: graphDescriptor(fromGraph),
    hasChanges,
    identityChangedFields,
    nodes: {
      added: addedNodes,
      changed: changedNodes,
      removed: removedNodes
    },
    to: graphDescriptor(toGraph),
    totals
  };
}
