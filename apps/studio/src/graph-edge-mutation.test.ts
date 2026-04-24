import { describe, expect, it } from "vitest";
import type { Edge, GraphSpec, ValidationReport } from "@entangle/types";
import {
  buildEdgeCreateRequest,
  buildEdgeEditorDraft,
  buildEdgeReplacementRequest,
  createDefaultEdgeEditorDraft,
  formatGraphEdgeDetail,
  formatGraphEdgeLabel,
  sortGraphEdges,
  summarizeValidationReport
} from "./graph-edge-mutation.js";

const graph: GraphSpec = {
  defaults: {
    resourceBindings: {
      externalPrincipalRefs: [],
      gitServiceRefs: [],
      relayProfileRefs: []
    },
    runtimeProfile: "hackathon_local"
  },
  edges: [],
  graphId: "team-alpha",
  name: "Team Alpha",
  nodes: [
    {
      autonomy: {
        canInitiateSessions: false,
        canMutateGraph: false
      },
      displayName: "User",
      nodeId: "user",
      nodeKind: "user",
      resourceBindings: {
        externalPrincipalRefs: [],
        gitServiceRefs: [],
        relayProfileRefs: []
      }
    },
    {
      autonomy: {
        canInitiateSessions: false,
        canMutateGraph: false
      },
      displayName: "IT Lead",
      nodeId: "lead-it",
      nodeKind: "supervisor",
      packageSourceRef: "lead-it-package",
      resourceBindings: {
        externalPrincipalRefs: [],
        gitServiceRefs: [],
        relayProfileRefs: []
      }
    }
  ],
  schemaVersion: "1"
};

function createEdge(edgeId: string, relation: Edge["relation"]): Edge {
  return {
    edgeId,
    enabled: true,
    fromNodeId: "user",
    relation,
    toNodeId: "lead-it",
    transportPolicy: {
      channel: "default",
      mode: "bidirectional_shared_set",
      relayProfileRefs: ["relay-main"]
    }
  };
}

describe("graph edge mutation helpers", () => {
  it("builds deterministic default drafts from the current graph", () => {
    expect(createDefaultEdgeEditorDraft(graph)).toMatchObject({
      channel: "default",
      edgeId: "",
      enabled: true,
      fromNodeId: "user",
      relation: "delegates_to",
      toNodeId: "lead-it"
    });
  });

  it("preserves transport policy when hydrating edit drafts", () => {
    const edge = createEdge("user-to-lead", "delegates_to");

    expect(buildEdgeEditorDraft(edge)).toEqual({
      channel: "default",
      edgeId: "user-to-lead",
      enabled: true,
      fromNodeId: "user",
      relayProfileRefs: ["relay-main"],
      relation: "delegates_to",
      toNodeId: "lead-it"
    });
  });

  it("builds canonical create and replacement requests from one draft", () => {
    const draft = {
      channel: "ops",
      edgeId: "user-to-lead",
      enabled: false,
      fromNodeId: "user",
      relayProfileRefs: ["relay-main", "relay-backup"],
      relation: "consults" as const,
      toNodeId: "lead-it"
    };

    expect(buildEdgeCreateRequest(draft)).toEqual({
      edgeId: "user-to-lead",
      enabled: false,
      fromNodeId: "user",
      relation: "consults",
      toNodeId: "lead-it",
      transportPolicy: {
        channel: "ops",
        mode: "bidirectional_shared_set",
        relayProfileRefs: ["relay-main", "relay-backup"]
      }
    });
    expect(buildEdgeReplacementRequest(draft)).toEqual({
      enabled: false,
      fromNodeId: "user",
      relation: "consults",
      toNodeId: "lead-it",
      transportPolicy: {
        channel: "ops",
        mode: "bidirectional_shared_set",
        relayProfileRefs: ["relay-main", "relay-backup"]
      }
    });
  });

  it("sorts and formats edges for deterministic Studio presentation", () => {
    const sorted = sortGraphEdges([
      createEdge("user-to-reviewer", "reviews"),
      createEdge("user-to-lead", "delegates_to")
    ]);

    expect(sorted.map((edge) => edge.edgeId)).toEqual([
      "user-to-lead",
      "user-to-reviewer"
    ]);
    expect(formatGraphEdgeLabel(sorted[0]!)).toBe("user-to-lead · delegates_to");
    expect(formatGraphEdgeDetail(sorted[0]!)).toContain("user -> lead-it");
    expect(formatGraphEdgeDetail(sorted[0]!)).toContain("relay profile refs");
  });

  it("summarizes validation findings without leaking host internals", () => {
    const report: ValidationReport = {
      findings: [
        {
          code: "edge_invalid",
          message: "The edge must not target a missing node.",
          path: ["edges", "0", "toNodeId"],
          severity: "error"
        },
        {
          code: "relay_path_missing",
          message: "The edge has no realizable relay overlap.",
          path: ["edges", "0", "transportPolicy"],
          severity: "error"
        }
      ],
      ok: false
    };

    expect(summarizeValidationReport(report)).toBe(
      "The edge must not target a missing node. The edge has no realizable relay overlap."
    );
  });
});
