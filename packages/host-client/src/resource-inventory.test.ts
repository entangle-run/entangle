import { describe, expect, it } from "vitest";
import {
  graphSpecSchema,
  type ExternalPrincipalInspectionResponse,
  type GraphSpec,
  type PackageSourceInspectionResponse
} from "@entangle/types";
import {
  collectExternalPrincipalReferenceNodeIds,
  collectPackageSourceReferenceNodeIds,
  formatExternalPrincipalDetail,
  formatExternalPrincipalLabel,
  formatExternalPrincipalReferenceSummary,
  formatPackageSourceDetail,
  formatPackageSourceOptionLabel,
  formatPackageSourceReferenceSummary,
  sortExternalPrincipalInspections,
  sortPackageSourceInspections
} from "./resource-inventory.js";

function createPackageSource(
  packageSourceId: string,
  sourceKind: "local_archive" | "local_path"
): PackageSourceInspectionResponse {
  return {
    manifest: {
      capabilities: [],
      defaultNodeKind: "worker",
      entryPrompts: {
        interaction: "prompts/interaction.md",
        system: "prompts/system.md"
      },
      memoryProfile: {
        schemaPath: "memory/schema/AGENTS.md",
        wikiSeedPath: "memory/seed/wiki"
      },
      metadata: {
        tags: []
      },
      name: `${packageSourceId}-name`,
      packageId: `${packageSourceId}-template`,
      packageKind: "template",
      runtime: {
        capabilitiesPath: "runtime/capabilities.json",
        configPath: "runtime/config.json",
        toolsPath: "runtime/tools.json"
      },
      schemaVersion: "1",
      version: "0.1.0"
    },
    packageSource:
      sourceKind === "local_path"
        ? {
            absolutePath: `/tmp/${packageSourceId}`,
            materialization: {
              contentDigest:
                "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
              materializationKind: "immutable_store",
              packageRoot: `/store/${packageSourceId}`,
              synchronizedAt: "2026-04-24T10:00:00.000Z"
            },
            packageSourceId,
            sourceKind: "local_path"
          }
        : {
            archivePath: `/tmp/${packageSourceId}.tar.gz`,
            packageSourceId,
            sourceKind: "local_archive"
          },
    validation: {
      findings: [],
      ok: true
    }
  };
}

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

describe("resource inventory presentation helpers", () => {
  it("sorts and formats package source inspections", () => {
    const inspections = sortPackageSourceInspections([
      createPackageSource("marketing", "local_archive"),
      createPackageSource("it", "local_path")
    ]);

    expect(inspections.map((inspection) => inspection.packageSource.packageSourceId)).toEqual([
      "it",
      "marketing"
    ]);
    expect(formatPackageSourceOptionLabel(inspections[0]!)).toBe("it-name (it)");
    expect(formatPackageSourceDetail(inspections[0]!)).toContain("local_path");
    expect(formatPackageSourceDetail(inspections[0]!)).toContain(
      "materialized immutable_store"
    );
    expect(formatPackageSourceDetail(inspections[1]!)).toContain(
      "/tmp/marketing.tar.gz"
    );
  });

  it("collects and summarizes package-source graph references", () => {
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
      graphId: "demo",
      name: "Demo",
      nodes: [
        {
          autonomy: {
            canInitiateSessions: false,
            canMutateGraph: false
          },
          displayName: "Worker B",
          nodeId: "worker-b",
          nodeKind: "worker",
          packageSourceRef: "shared-source",
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
          displayName: "Worker A",
          nodeId: "worker-a",
          nodeKind: "worker",
          packageSourceRef: "shared-source",
          resourceBindings: {
            externalPrincipalRefs: [],
            gitServiceRefs: [],
            relayProfileRefs: []
          }
        }
      ],
      schemaVersion: "1"
    };

    const nodeIds = collectPackageSourceReferenceNodeIds(graph, "shared-source");

    expect(nodeIds).toEqual(["worker-a", "worker-b"]);
    expect(formatPackageSourceReferenceSummary(nodeIds)).toBe(
      "Referenced by 2 nodes: worker-a, worker-b"
    );
    expect(formatPackageSourceReferenceSummary([])).toBe(
      "No active graph references"
    );
  });

  it("sorts and formats external principal inspections", () => {
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

  it("collects and summarizes external-principal graph references", () => {
    const graph = graphSpecSchema.parse({
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
