import {
  buildGraphDiff,
  type ChangedGraphEdgeSummary,
  type ChangedGraphNodeSummary,
  type GraphDiffSummary,
  type GraphEdgeSummary,
  type GraphNodeSummary
} from "@entangle/host-client";

export { buildGraphDiff };

export function formatGraphDiffTotals(diff: GraphDiffSummary): string {
  return [
    `nodes +${diff.totals.nodesAdded} ~${diff.totals.nodesChanged} -${diff.totals.nodesRemoved}`,
    `edges +${diff.totals.edgesAdded} ~${diff.totals.edgesChanged} -${diff.totals.edgesRemoved}`
  ].join(" · ");
}

export function formatGraphDiffIdentitySummary(diff: GraphDiffSummary): string {
  const changedParts = [
    ...diff.identityChangedFields,
    ...(diff.defaultsChanged ? ["defaults"] : [])
  ];

  return changedParts.length > 0
    ? `changed ${changedParts.join(", ")}`
    : "identity and defaults unchanged";
}

export function formatGraphNodeDiffLine(node: GraphNodeSummary): string {
  return [
    node.nodeId,
    node.nodeKind,
    node.displayName,
    node.packageSourceRef ? `package ${node.packageSourceRef}` : undefined
  ]
    .filter(Boolean)
    .join(" · ");
}

export function formatChangedGraphNodeDiffLine(
  change: ChangedGraphNodeSummary
): string {
  return `${formatGraphNodeDiffLine(change.after)} · changed ${formatGraphDiffChangedFields(change.changedFields)}`;
}

export function formatGraphEdgeDiffLine(edge: GraphEdgeSummary): string {
  return [
    edge.edgeId,
    `${edge.fromNodeId} -> ${edge.toNodeId}`,
    edge.relation,
    edge.enabled ? "enabled" : "disabled"
  ].join(" · ");
}

export function formatChangedGraphEdgeDiffLine(
  change: ChangedGraphEdgeSummary
): string {
  return `${formatGraphEdgeDiffLine(change.after)} · changed ${formatGraphDiffChangedFields(change.changedFields)}`;
}

export function formatGraphDiffChangedFields(fields: string[]): string {
  return fields.length > 0 ? fields.join(", ") : "unclassified fields";
}
