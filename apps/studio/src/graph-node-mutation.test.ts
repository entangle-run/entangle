import { describe, expect, it } from "vitest";
import type {
  GraphSpec,
  NodeBinding,
  PackageSourceInspectionResponse
} from "@entangle/types";
import {
  buildManagedNodeCreateRequest,
  buildManagedNodeEditorDraft,
  buildManagedNodeReplacementRequest,
  createDefaultManagedNodeEditorDraft,
  formatManagedNodeDetail,
  formatManagedNodeLabel,
  sortManagedGraphNodes
} from "./graph-node-mutation.js";
import {
  formatPackageSourceOptionLabel,
  sortPackageSourceInspections
} from "./package-source-admission.js";

function createManagedNode(nodeId: string, displayName: string): NodeBinding {
  return {
    agentRuntime: {},
    autonomy: {
      canInitiateSessions: false,
      canMutateGraph: false
    },
    displayName,
    nodeId,
    nodeKind: "worker",
    packageSourceRef: `${nodeId}-package`,
    resourceBindings: {
      externalPrincipalRefs: [],
      gitServiceRefs: [],
      relayProfileRefs: []
    }
  };
}

const graph: GraphSpec = {
  defaults: {
    resourceBindings: {
      externalPrincipalRefs: [],
      gitServiceRefs: [],
      relayProfileRefs: []
    },
    agentRuntime: {
      mode: "coding_agent"
    },
    runtimeProfile: "federated"
  },
  edges: [],
  graphId: "team-alpha",
  name: "Team Alpha",
  nodes: [
    {
      agentRuntime: {},
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
    createManagedNode("worker-it", "IT Worker"),
    createManagedNode("reviewer-it", "IT Reviewer")
  ],
  schemaVersion: "1"
};

function createPackageSource(
  packageSourceId: string,
  manifestName: string
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
      name: manifestName,
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
    packageSource: {
      absolutePath: `/tmp/${packageSourceId}`,
      packageSourceId,
      sourceKind: "local_path"
    },
    validation: {
      findings: [],
      ok: true
    }
  };
}

describe("graph node mutation helpers", () => {
  it("sorts only managed nodes from the active graph", () => {
    expect(sortManagedGraphNodes(graph).map((node) => node.nodeId)).toEqual([
      "reviewer-it",
      "worker-it"
    ]);
  });

  it("builds default drafts from admitted package sources", () => {
    expect(
      createDefaultManagedNodeEditorDraft([
        createPackageSource("it-worker", "IT Worker Package")
      ])
    ).toMatchObject({
      displayName: "",
      nodeId: "",
      nodeKind: "worker",
      packageSourceRef: "it-worker"
    });
  });

  it("hydrates drafts from managed nodes and preserves hidden bindings", () => {
    const node = createManagedNode("worker-it", "IT Worker");
    node.agentRuntime = {
      defaultAgent: "build",
      engineProfileRef: "local-opencode",
      mode: "coding_agent"
    };
    node.autonomy.canInitiateSessions = true;
    node.resourceBindings.relayProfileRefs = ["relay-main"];

    expect(buildManagedNodeEditorDraft(node)).toEqual({
      agentRuntime: {
        defaultAgent: "build",
        engineProfileRef: "local-opencode",
        mode: "coding_agent"
      },
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
    });
  });

  it("builds canonical create and replacement requests", () => {
    const draft = buildManagedNodeEditorDraft(createManagedNode("worker-it", "IT Worker"));
    draft.agentRuntime = {
      engineProfileRef: "local-opencode",
      mode: "disabled"
    };

    expect(buildManagedNodeCreateRequest(draft)).toMatchObject({
      agentRuntime: {
        engineProfileRef: "local-opencode",
        mode: "disabled"
      },
      displayName: "IT Worker",
      nodeId: "worker-it",
      nodeKind: "worker",
      packageSourceRef: "worker-it-package"
    });
    expect(buildManagedNodeReplacementRequest(draft)).toMatchObject({
      agentRuntime: {
        engineProfileRef: "local-opencode",
        mode: "disabled"
      },
      displayName: "IT Worker",
      nodeKind: "worker",
      packageSourceRef: "worker-it-package"
    });
  });

  it("formats managed nodes and package sources for deterministic Studio lists", () => {
    const node = createManagedNode("worker-it", "IT Worker");
    const sources = sortPackageSourceInspections([
      createPackageSource("marketing-pack", "Marketing Pack"),
      createPackageSource("it-pack", "IT Pack")
    ]);

    expect(formatManagedNodeLabel(node)).toBe("IT Worker · worker");
    expect(formatManagedNodeDetail(node)).toContain("package worker-it-package");
    expect(sources.map((source) => source.packageSource.packageSourceId)).toEqual([
      "it-pack",
      "marketing-pack"
    ]);
    expect(formatPackageSourceOptionLabel(sources[0]!)).toBe("IT Pack (it-pack)");
  });
});
