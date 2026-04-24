import type {
  GraphRevisionInspectionResponse,
  GraphRevisionMetadata
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
