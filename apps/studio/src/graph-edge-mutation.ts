import type {
  Edge,
  EdgeCreateRequest,
  EdgeRelation,
  EdgeReplacementRequest,
  GraphSpec
} from "@entangle/types";

export const edgeRelationOptions: EdgeRelation[] = [
  "delegates_to",
  "reviews",
  "consults",
  "reports_to",
  "peer_collaborates_with",
  "routes_to",
  "escalates_to"
];

export type EdgeEditorDraft = {
  channel: string;
  edgeId: string;
  enabled: boolean;
  fromNodeId: string;
  relayProfileRefs: string[];
  relation: EdgeRelation;
  toNodeId: string;
};

export function createEmptyEdgeEditorDraft(): EdgeEditorDraft {
  return {
    channel: "default",
    edgeId: "",
    enabled: true,
    fromNodeId: "",
    relayProfileRefs: [],
    relation: "delegates_to",
    toNodeId: ""
  };
}

export function createDefaultEdgeEditorDraft(
  graph: GraphSpec | undefined
): EdgeEditorDraft {
  const draft = createEmptyEdgeEditorDraft();
  const nodeIds = graph?.nodes.map((node) => node.nodeId) ?? [];

  if (nodeIds.length > 0) {
    const firstNodeId = nodeIds[0];

    if (!firstNodeId) {
      return draft;
    }

    draft.fromNodeId = firstNodeId;
    draft.toNodeId = nodeIds[1] ?? firstNodeId;
  }

  return draft;
}

export function isEdgeEditorDraftUninitialized(
  draft: EdgeEditorDraft
): boolean {
  return draft.edgeId === "" && draft.fromNodeId === "" && draft.toNodeId === "";
}

export function buildEdgeEditorDraft(edge: Edge): EdgeEditorDraft {
  return {
    channel: edge.transportPolicy.channel,
    edgeId: edge.edgeId,
    enabled: edge.enabled,
    fromNodeId: edge.fromNodeId,
    relayProfileRefs: edge.transportPolicy.relayProfileRefs,
    relation: edge.relation,
    toNodeId: edge.toNodeId
  };
}

export function buildEdgeCreateRequest(
  draft: EdgeEditorDraft
): EdgeCreateRequest {
  return {
    edgeId: draft.edgeId,
    enabled: draft.enabled,
    fromNodeId: draft.fromNodeId,
    relation: draft.relation,
    toNodeId: draft.toNodeId,
    transportPolicy: {
      channel: draft.channel || "default",
      mode: "bidirectional_shared_set",
      relayProfileRefs: draft.relayProfileRefs
    }
  };
}

export function buildEdgeReplacementRequest(
  draft: EdgeEditorDraft
): EdgeReplacementRequest {
  return {
    enabled: draft.enabled,
    fromNodeId: draft.fromNodeId,
    relation: draft.relation,
    toNodeId: draft.toNodeId,
    transportPolicy: {
      channel: draft.channel || "default",
      mode: "bidirectional_shared_set",
      relayProfileRefs: draft.relayProfileRefs
    }
  };
}

export {
  formatGraphEdgeDetail,
  formatGraphEdgeLabel,
  sortGraphEdges
} from "@entangle/host-client";
