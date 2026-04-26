import { describe, expect, it } from "vitest";
import type { GraphSpec } from "@entangle/types";
import { buildGraphDiff } from "./graph-diff.js";

function buildGraph(): GraphSpec {
  return {
    defaults: {
      resourceBindings: {
        externalPrincipalRefs: [],
        gitServiceRefs: [],
        relayProfileRefs: ["relay-main"]
      },
      runtimeProfile: "federated"
    },
    edges: [
      {
        edgeId: "user-to-planner",
        enabled: true,
        fromNodeId: "user-main",
        relation: "delegates_to",
        toNodeId: "planner",
        transportPolicy: {
          channel: "default",
          mode: "bidirectional_shared_set",
          relayProfileRefs: ["relay-main"]
        }
      }
    ],
    graphId: "federated-preview",
    name: "Federated Preview",
    nodes: [
      {
        displayName: "User",
        nodeId: "user-main",
        nodeKind: "user",
        resourceBindings: {
          externalPrincipalRefs: [],
          gitServiceRefs: [],
          relayProfileRefs: ["relay-main"]
        }
      },
      {
        displayName: "Planner",
        nodeId: "planner",
        nodeKind: "planner",
        packageSourceRef: "federated-preview-agent",
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

describe("buildGraphDiff", () => {
  it("reports added, removed, changed, and default graph changes", () => {
    const fromGraph = buildGraph();
    const toGraph: GraphSpec = {
      ...fromGraph,
      defaults: {
        ...fromGraph.defaults,
        resourceBindings: {
          ...fromGraph.defaults.resourceBindings,
          gitServiceRefs: ["gitea"]
        }
      },
      edges: [
        {
          ...fromGraph.edges[0]!,
          relation: "reviews"
        },
        {
          edgeId: "planner-to-builder",
          enabled: true,
          fromNodeId: "planner",
          relation: "delegates_to",
          toNodeId: "builder",
          transportPolicy: {
            channel: "default",
            mode: "bidirectional_shared_set",
            relayProfileRefs: ["relay-main"]
          }
        }
      ],
      name: "Local Workbench",
      nodes: [
        {
          ...fromGraph.nodes[0]!,
          displayName: "Operator"
        },
        {
          displayName: "Builder",
          nodeId: "builder",
          nodeKind: "worker",
          packageSourceRef: "federated-preview-agent",
          resourceBindings: {
            externalPrincipalRefs: [],
            gitServiceRefs: ["gitea"],
            relayProfileRefs: ["relay-main"]
          }
        }
      ]
    };

    const diff = buildGraphDiff(fromGraph, toGraph);

    expect(diff.hasChanges).toBe(true);
    expect(diff.identityChangedFields).toEqual(["name"]);
    expect(diff.defaultsChanged).toBe(true);
    expect(diff.nodes.added.map((node) => node.nodeId)).toEqual(["builder"]);
    expect(diff.nodes.removed.map((node) => node.nodeId)).toEqual(["planner"]);
    expect(diff.nodes.changed).toEqual([
      expect.objectContaining({
        changedFields: ["displayName"],
        nodeId: "user-main"
      })
    ]);
    expect(diff.edges.added.map((edge) => edge.edgeId)).toEqual([
      "planner-to-builder"
    ]);
    expect(diff.edges.changed).toEqual([
      expect.objectContaining({
        changedFields: ["relation"],
        edgeId: "user-to-planner"
      })
    ]);
  });

  it("returns an empty change set for identical graphs", () => {
    const graph = buildGraph();
    const diff = buildGraphDiff(graph, graph);

    expect(diff.hasChanges).toBe(false);
    expect(diff.totals).toEqual({
      edgesAdded: 0,
      edgesChanged: 0,
      edgesRemoved: 0,
      nodesAdded: 0,
      nodesChanged: 0,
      nodesRemoved: 0
    });
  });
});
