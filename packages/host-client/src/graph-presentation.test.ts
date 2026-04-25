import { describe, expect, it } from "vitest";
import type {
  Edge,
  GraphRevisionInspectionResponse,
  GraphRevisionMetadata,
  GraphSpec,
  NodeInspectionResponse
} from "@entangle/types";
import {
  formatGraphEdgeDetail,
  formatGraphEdgeLabel,
  formatGraphRevisionDetail,
  formatGraphRevisionInspectionSummary,
  formatGraphRevisionLabel,
  formatManagedNodeDetail,
  formatManagedNodeLabel,
  sortGraphEdges,
  sortGraphRevisions,
  sortManagedGraphNodes,
  sortNodeInspectionsForPresentation
} from "./graph-presentation.js";

function createRevision(
  revisionId: string,
  appliedAt: string,
  isActive = false
): GraphRevisionMetadata {
  return {
    appliedAt,
    graphId: "team-alpha",
    isActive,
    revisionId
  };
}

function createGraph(): GraphSpec {
  return {
    defaults: {
      resourceBindings: {
        externalPrincipalRefs: [],
        gitServiceRefs: [],
        relayProfileRefs: []
      },
      runtimeProfile: "local"
    },
    edges: [
      createEdge("user-to-reviewer", "reviews"),
      createEdge("user-to-lead", "delegates_to")
    ],
    graphId: "team-alpha",
    name: "Team Alpha",
    nodes: [
      {
        displayName: "User",
        nodeId: "user-main",
        nodeKind: "user"
      },
      {
        autonomy: {
          canInitiateSessions: false,
          canMutateGraph: false
        },
        displayName: "Marketing Worker",
        nodeId: "worker-marketing",
        nodeKind: "worker",
        packageSourceRef: "worker-marketing-package",
        resourceBindings: {
          externalPrincipalRefs: [],
          gitServiceRefs: [],
          relayProfileRefs: []
        }
      },
      {
        autonomy: {
          canInitiateSessions: true,
          canMutateGraph: false
        },
        displayName: "IT Worker",
        nodeId: "worker-it",
        nodeKind: "worker",
        packageSourceRef: "worker-it-package",
        resourceBindings: {
          externalPrincipalRefs: [],
          gitServiceRefs: [],
          relayProfileRefs: ["relay-main"]
        }
      }
    ],
    schemaVersion: "1"
  };
}

function createEdge(edgeId: string, relation: Edge["relation"]): Edge {
  return {
    edgeId,
    enabled: true,
    fromNodeId: "user-main",
    relation,
    toNodeId: edgeId === "user-to-lead" ? "worker-it" : "worker-marketing",
    transportPolicy: {
      channel: "ops",
      mode: "bidirectional_shared_set",
      relayProfileRefs: ["relay-main", "relay-backup"]
    }
  };
}

function createNodeInspection(
  graph: GraphSpec,
  nodeId: string
): NodeInspectionResponse {
  const node = graph.nodes.find((entry) => entry.nodeId === nodeId);

  if (!node) {
    throw new Error(`Missing fixture node ${nodeId}.`);
  }

  return {
    binding: {
      bindingId: `${nodeId}-binding`,
      externalPrincipals: [],
      graphId: graph.graphId,
      graphRevisionId: "team-alpha-20260424-110000",
      node,
      resolvedResourceBindings: node.resourceBindings,
      runtimeProfile: graph.defaults.runtimeProfile,
      schemaVersion: "1"
    },
    runtime: {
      backendKind: "docker",
      contextAvailable: true,
      desiredState: "running",
      graphId: graph.graphId,
      graphRevisionId: "team-alpha-20260424-110000",
      nodeId,
      observedState: "running",
      packageSourceId: node.packageSourceRef,
      reconciliation: {
        findingCodes: [],
        state: "aligned"
      },
      restartGeneration: 0
    }
  };
}

describe("graph presentation helpers", () => {
  it("sorts and formats graph revisions", () => {
    const older = createRevision(
      "team-alpha-20260424-100000",
      "2026-04-24T10:00:00.000Z"
    );
    const newer = createRevision(
      "team-alpha-20260424-110000",
      "2026-04-24T11:00:00.000Z",
      true
    );

    expect(sortGraphRevisions([older, newer]).map((revision) => revision.revisionId)).toEqual([
      "team-alpha-20260424-110000",
      "team-alpha-20260424-100000"
    ]);
    expect(formatGraphRevisionLabel(newer)).toBe(
      "team-alpha-20260424-110000 · active"
    );
    expect(formatGraphRevisionDetail(newer)).toBe(
      "team-alpha · applied 2026-04-24T11:00:00.000Z"
    );
  });

  it("formats graph revision inspection summaries", () => {
    const graph = createGraph();
    const inspection: GraphRevisionInspectionResponse = {
      graph,
      revision: createRevision(
        "team-alpha-20260424-110000",
        "2026-04-24T11:00:00.000Z",
        true
      )
    };

    expect(formatGraphRevisionInspectionSummary(inspection)).toBe(
      "3 nodes · 2 edges"
    );
  });

  it("sorts and formats managed graph nodes", () => {
    const graph = createGraph();
    const managedNodes = sortManagedGraphNodes(graph);

    expect(managedNodes.map((node) => node.nodeId)).toEqual([
      "worker-it",
      "worker-marketing"
    ]);
    expect(formatManagedNodeLabel(managedNodes[0]!)).toBe("IT Worker · worker");
    expect(formatManagedNodeDetail(managedNodes[0]!)).toContain(
      "package worker-it-package"
    );
    expect(formatManagedNodeDetail(managedNodes[0]!)).toContain("relay refs");
  });

  it("sorts node inspections by applied node id", () => {
    const graph = createGraph();

    expect(
      sortNodeInspectionsForPresentation([
        createNodeInspection(graph, "worker-marketing"),
        createNodeInspection(graph, "worker-it")
      ]).map((inspection) => inspection.binding.node.nodeId)
    ).toEqual(["worker-it", "worker-marketing"]);
  });

  it("sorts and formats graph edges", () => {
    const sorted = sortGraphEdges([
      createEdge("user-to-reviewer", "reviews"),
      createEdge("user-to-lead", "delegates_to")
    ]);

    expect(sorted.map((edge) => edge.edgeId)).toEqual([
      "user-to-lead",
      "user-to-reviewer"
    ]);
    expect(formatGraphEdgeLabel(sorted[0]!)).toBe("user-to-lead · delegates_to");
    expect(formatGraphEdgeDetail(sorted[0]!)).toContain("user-main -> worker-it");
    expect(formatGraphEdgeDetail(sorted[0]!)).toContain("relay profile refs");
  });
});
