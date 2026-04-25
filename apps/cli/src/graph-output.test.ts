import { describe, expect, it } from "vitest";
import type {
  Edge,
  GraphInspectionResponse,
  GraphMutationResponse,
  GraphRevisionInspectionResponse,
  GraphSpec,
  NodeInspectionResponse
} from "@entangle/types";
import {
  projectGraphExportSummary,
  projectGraphEdgeSummary,
  projectGraphImportSummary,
  projectGraphRevisionInspectionSummary,
  projectGraphRevisionSummary,
  projectGraphSummary,
  projectNodeInspectionSummary,
  projectSortedGraphEdgeSummaries
} from "./graph-output.js";

function createEdge(edgeId: string, relation: Edge["relation"]): Edge {
  return {
    edgeId,
    enabled: edgeId !== "disabled-edge",
    fromNodeId: "user-main",
    relation,
    toNodeId: "worker-it",
    transportPolicy: {
      channel: "ops",
      mode: "bidirectional_shared_set",
      relayProfileRefs: ["relay-main"]
    }
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
      runtimeProfile: "hackathon_local"
    },
    edges: [createEdge("user-to-it", "delegates_to")],
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
          canInitiateSessions: true,
          canMutateGraph: false
        },
        displayName: "IT Worker",
        nodeId: "worker-it",
        nodeKind: "worker",
        packageSourceRef: "it-pack",
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

function createNodeInspection(graph: GraphSpec): NodeInspectionResponse {
  const node = graph.nodes[1]!;

  return {
    binding: {
      bindingId: "worker-it-binding",
      externalPrincipals: [],
      graphId: graph.graphId,
      graphRevisionId: "team-alpha-20260425-080000",
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
      graphRevisionId: "team-alpha-20260425-080000",
      nodeId: node.nodeId,
      observedState: "failed",
      packageSourceId: node.packageSourceRef,
      reconciliation: {
        findingCodes: ["runtime_failed"],
        state: "degraded"
      },
      restartGeneration: 2
    }
  };
}

describe("graph CLI summary projection", () => {
  it("projects active graph summaries", () => {
    const graph = createGraph();
    const response: GraphInspectionResponse = {
      activeRevisionId: "team-alpha-20260425-080000",
      graph
    };

    expect(projectGraphSummary(response)).toEqual({
      activeRevisionId: "team-alpha-20260425-080000",
      edgeCount: 1,
      graphId: "team-alpha",
      label: "Team Alpha (team-alpha)",
      managedNodeCount: 1,
      name: "Team Alpha",
      nodeCount: 2,
      runtimeProfile: "hackathon_local"
    });
    expect(projectGraphSummary({})).toEqual({
      edgeCount: 0,
      label: "No active graph",
      managedNodeCount: 0,
      nodeCount: 0
    });
  });

  it("projects graph import and export workflow summaries", () => {
    const graph = createGraph();
    const mutation: GraphMutationResponse = {
      activeRevisionId: "team-alpha-20260425-080000",
      graph,
      validation: {
        ok: false,
        findings: [
          {
            code: "missing_package_source",
            message: "Missing package source.",
            path: ["nodes", "worker-it"],
            severity: "error"
          },
          {
            code: "unused_relay",
            message: "Relay is not referenced.",
            path: [],
            severity: "warning"
          }
        ]
      }
    };

    expect(
      projectGraphExportSummary({
        outputPath: "/tmp/team-alpha.graph.json",
        response: {
          activeRevisionId: "team-alpha-20260425-080000",
          graph
        }
      })
    ).toMatchObject({
      graph: {
        graphId: "team-alpha",
        nodeCount: 2
      },
      outputPath: "/tmp/team-alpha.graph.json"
    });
    expect(
      projectGraphImportSummary({
        applied: false,
        dryRun: true,
        response: mutation
      })
    ).toMatchObject({
      applied: false,
      dryRun: true,
      graph: {
        graphId: "team-alpha"
      },
      validation: {
        errorCount: 1,
        findingCodes: ["missing_package_source", "unused_relay"],
        ok: false,
        warningCount: 1
      }
    });
  });

  it("projects graph revision summaries", () => {
    const graph = createGraph();
    const inspection: GraphRevisionInspectionResponse = {
      graph,
      revision: {
        appliedAt: "2026-04-25T08:00:00.000Z",
        graphId: graph.graphId,
        isActive: true,
        revisionId: "team-alpha-20260425-080000"
      }
    };

    expect(projectGraphRevisionSummary(inspection.revision)).toMatchObject({
      isActive: true,
      label: "team-alpha-20260425-080000 · active",
      revisionId: "team-alpha-20260425-080000"
    });
    expect(projectGraphRevisionInspectionSummary(inspection)).toMatchObject({
      edgeCount: 1,
      nodeCount: 2,
      summary: "2 nodes · 1 edges"
    });
  });

  it("projects node runtime summaries", () => {
    const summary = projectNodeInspectionSummary(createNodeInspection(createGraph()));

    expect(summary).toMatchObject({
      label: "IT Worker · worker",
      nodeId: "worker-it",
      packageSourceId: "it-pack",
      runtime: {
        findingCodes: ["runtime_failed"],
        observedState: "failed",
        reconciliationState: "degraded",
        restartGeneration: 2
      }
    });
  });

  it("projects sorted edge summaries", () => {
    expect(projectGraphEdgeSummary(createEdge("user-to-it", "delegates_to"))).toMatchObject({
      edgeId: "user-to-it",
      label: "user-to-it · delegates_to",
      relation: "delegates_to"
    });
    expect(
      projectSortedGraphEdgeSummaries([
        createEdge("z-edge", "reviews"),
        createEdge("a-edge", "delegates_to")
      ]).map((edge) => edge.edgeId)
    ).toEqual(["a-edge", "z-edge"]);
  });
});
