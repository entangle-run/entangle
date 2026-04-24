import { describe, expect, it } from "vitest";

import {
  graphSpecSchema,
  type ExternalPrincipalInspectionResponse,
  type GraphSpec
} from "@entangle/types";

import {
  collectExternalPrincipalReferenceNodeIds,
  formatExternalPrincipalDetail,
  formatExternalPrincipalLabel,
  formatExternalPrincipalReferenceSummary,
  sortExternalPrincipalInspections
} from "./external-principal-inspection.js";

function createPrincipalInspection(
  principalId: string
): ExternalPrincipalInspectionResponse {
  return {
    principal: {
      displayName: principalId === "worker-a-git" ? "Worker A Git" : "Worker B Git",
      gitServiceRef: "local-gitea",
      principalId,
      secretRef: `secret://git/${principalId}/ssh`,
      subject: principalId,
      systemKind: "git",
      transportAuthMode: "ssh_key"
    },
    validation: {
      findings: [],
      ok: true
    }
  };
}

describe("external principal inspection helpers", () => {
  it("sorts and formats principal rows deterministically", () => {
    const inspections = [
      createPrincipalInspection("worker-b-git"),
      createPrincipalInspection("worker-a-git")
    ];

    expect(
      sortExternalPrincipalInspections(inspections).map(
        (inspection) => inspection.principal.principalId
      )
    ).toEqual(["worker-a-git", "worker-b-git"]);
    expect(formatExternalPrincipalLabel(inspections[1]!)).toBe(
      "Worker A Git (worker-a-git)"
    );
    expect(formatExternalPrincipalDetail(inspections[1]!)).toBe(
      "git - local-gitea - ssh_key - subject worker-a-git"
    );
  });

  it("collects effective graph references for principal deletion safety", () => {
    const graph: GraphSpec = graphSpecSchema.parse({
      defaults: {
        resourceBindings: {
          externalPrincipalRefs: ["worker-a-git"],
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
          displayName: "User",
          nodeId: "user-main",
          nodeKind: "user"
        },
        {
          displayName: "Worker A",
          nodeId: "worker-a",
          nodeKind: "worker",
          resourceBindings: {
            externalPrincipalRefs: ["worker-b-git"],
            gitServiceRefs: [],
            relayProfileRefs: []
          }
        },
        {
          displayName: "Worker B",
          nodeId: "worker-b",
          nodeKind: "worker"
        }
      ],
      schemaVersion: "1"
    });

    expect(collectExternalPrincipalReferenceNodeIds(graph, "worker-a-git")).toEqual([
      "user-main",
      "worker-b"
    ]);
    expect(collectExternalPrincipalReferenceNodeIds(graph, "worker-b-git")).toEqual([
      "worker-a"
    ]);
    expect(formatExternalPrincipalReferenceSummary(["worker-a"])).toBe(
      "Referenced by 1 node: worker-a"
    );
    expect(formatExternalPrincipalReferenceSummary([])).toBe(
      "No active graph references"
    );
  });
});
