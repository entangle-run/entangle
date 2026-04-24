import type {
  GraphSpec,
  ManagedNodeKind,
  NodeBinding,
  NodeCreateRequest,
  NodeReplacementRequest,
  PackageSourceInspectionResponse
} from "@entangle/types";

export const managedNodeKindOptions: ManagedNodeKind[] = [
  "supervisor",
  "worker",
  "reviewer",
  "service"
];

export type ManagedNodeEditorDraft = {
  autonomy: NodeBinding["autonomy"];
  displayName: string;
  nodeId: string;
  nodeKind: ManagedNodeKind;
  packageSourceRef: string;
  resourceBindings: NodeBinding["resourceBindings"];
};

export function createEmptyManagedNodeEditorDraft(): ManagedNodeEditorDraft {
  return {
    autonomy: {
      canInitiateSessions: false,
      canMutateGraph: false
    },
    displayName: "",
    nodeId: "",
    nodeKind: "worker",
    packageSourceRef: "",
    resourceBindings: {
      externalPrincipalRefs: [],
      gitServiceRefs: [],
      relayProfileRefs: []
    }
  };
}

export function createDefaultManagedNodeEditorDraft(
  packageSources: PackageSourceInspectionResponse[]
): ManagedNodeEditorDraft {
  return {
    ...createEmptyManagedNodeEditorDraft(),
    packageSourceRef: packageSources[0]?.packageSource.packageSourceId ?? ""
  };
}

export function isManagedNodeEditorDraftUninitialized(
  draft: ManagedNodeEditorDraft
): boolean {
  return draft.nodeId === "" && draft.displayName === "";
}

export function buildManagedNodeEditorDraft(
  node: NodeBinding
): ManagedNodeEditorDraft {
  if (node.nodeKind === "user") {
    throw new Error("Managed node editor cannot be built from a user node.");
  }

  return {
    autonomy: node.autonomy,
    displayName: node.displayName,
    nodeId: node.nodeId,
    nodeKind: node.nodeKind,
    packageSourceRef: node.packageSourceRef ?? "",
    resourceBindings: node.resourceBindings
  };
}

export function buildManagedNodeCreateRequest(
  draft: ManagedNodeEditorDraft
): NodeCreateRequest {
  return {
    autonomy: draft.autonomy,
    displayName: draft.displayName,
    nodeId: draft.nodeId,
    nodeKind: draft.nodeKind,
    ...(draft.packageSourceRef ? { packageSourceRef: draft.packageSourceRef } : {}),
    resourceBindings: draft.resourceBindings
  };
}

export function buildManagedNodeReplacementRequest(
  draft: ManagedNodeEditorDraft
): NodeReplacementRequest {
  return {
    autonomy: draft.autonomy,
    displayName: draft.displayName,
    nodeKind: draft.nodeKind,
    ...(draft.packageSourceRef ? { packageSourceRef: draft.packageSourceRef } : {}),
    resourceBindings: draft.resourceBindings
  };
}

export function sortManagedGraphNodes(
  graph: GraphSpec | undefined
): NodeBinding[] {
  const nodes = graph?.nodes ?? [];

  return nodes
    .filter((node) => node.nodeKind !== "user")
    .sort((left, right) => left.nodeId.localeCompare(right.nodeId));
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
