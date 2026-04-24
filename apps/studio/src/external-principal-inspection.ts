import {
  resolveEffectiveExternalPrincipalRefs,
  type ExternalPrincipalInspectionResponse,
  type GraphSpec
} from "@entangle/types";

export function sortExternalPrincipalInspections(
  principals: ExternalPrincipalInspectionResponse[]
): ExternalPrincipalInspectionResponse[] {
  return [...principals].sort((left, right) =>
    left.principal.principalId.localeCompare(right.principal.principalId)
  );
}

export function formatExternalPrincipalLabel(
  inspection: ExternalPrincipalInspectionResponse
): string {
  return `${inspection.principal.displayName} (${inspection.principal.principalId})`;
}

export function formatExternalPrincipalDetail(
  inspection: ExternalPrincipalInspectionResponse
): string {
  return [
    inspection.principal.systemKind,
    inspection.principal.gitServiceRef,
    inspection.principal.transportAuthMode,
    `subject ${inspection.principal.subject}`
  ].join(" - ");
}

export function collectExternalPrincipalReferenceNodeIds(
  graph: GraphSpec | undefined,
  principalId: string
): string[] {
  return (graph?.nodes ?? [])
    .filter((node) =>
      graph
        ? resolveEffectiveExternalPrincipalRefs(node, graph).includes(principalId)
        : false
    )
    .map((node) => node.nodeId)
    .sort((left, right) => left.localeCompare(right));
}

export function formatExternalPrincipalReferenceSummary(
  nodeIds: string[]
): string {
  if (nodeIds.length === 0) {
    return "No active graph references";
  }

  const visibleNodeIds = nodeIds.slice(0, 3);
  const hiddenCount = nodeIds.length - visibleNodeIds.length;
  const suffix = hiddenCount > 0 ? `, +${hiddenCount} more` : "";
  const noun = nodeIds.length === 1 ? "node" : "nodes";

  return `Referenced by ${nodeIds.length} ${noun}: ${visibleNodeIds.join(", ")}${suffix}`;
}

