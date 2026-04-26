import { describe, expect, it } from "vitest";
import type { GraphDiffSummary } from "@entangle/host-client";
import {
  formatChangedGraphEdgeDiffLine,
  formatChangedGraphNodeDiffLine,
  formatGraphDiffIdentitySummary,
  formatGraphDiffTotals
} from "./graph-diff-inspection.js";

function createDiff(): GraphDiffSummary {
  return {
    defaultsChanged: true,
    edges: {
      added: [],
      changed: [
        {
          after: {
            edgeId: "user-to-planner",
            enabled: true,
            fromNodeId: "user-main",
            relation: "delegates_to",
            toNodeId: "planner"
          },
          before: {
            edgeId: "user-to-planner",
            enabled: true,
            fromNodeId: "user-main",
            relation: "reviews",
            toNodeId: "planner"
          },
          changedFields: ["relation"],
          edgeId: "user-to-planner"
        }
      ],
      removed: []
    },
    from: {
      edgeCount: 1,
      graphId: "federated-preview",
      name: "Federated Preview",
      nodeCount: 1,
      runtimeProfile: "federated"
    },
    hasChanges: true,
    identityChangedFields: ["name"],
    nodes: {
      added: [],
      changed: [
        {
          after: {
            displayName: "Operator",
            nodeId: "user-main",
            nodeKind: "user"
          },
          before: {
            displayName: "User",
            nodeId: "user-main",
            nodeKind: "user"
          },
          changedFields: ["displayName"],
          nodeId: "user-main"
        }
      ],
      removed: []
    },
    to: {
      edgeCount: 1,
      graphId: "federated-preview",
      name: "Federated Workbench",
      nodeCount: 1,
      runtimeProfile: "federated"
    },
    totals: {
      edgesAdded: 0,
      edgesChanged: 1,
      edgesRemoved: 0,
      nodesAdded: 0,
      nodesChanged: 1,
      nodesRemoved: 0
    }
  };
}

describe("studio graph diff inspection helpers", () => {
  it("formats diff totals and identity changes compactly", () => {
    const diff = createDiff();

    expect(formatGraphDiffTotals(diff)).toBe("nodes +0 ~1 -0 · edges +0 ~1 -0");
    expect(formatGraphDiffIdentitySummary(diff)).toBe("changed name, defaults");
  });

  it("formats changed node and edge rows", () => {
    const diff = createDiff();

    expect(formatChangedGraphNodeDiffLine(diff.nodes.changed[0]!)).toBe(
      "user-main · user · Operator · changed displayName"
    );
    expect(formatChangedGraphEdgeDiffLine(diff.edges.changed[0]!)).toBe(
      "user-to-planner · user-main -> planner · delegates_to · enabled · changed relation"
    );
  });
});
