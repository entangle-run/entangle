import { describe, expect, it } from "vitest";
import type {
  ExternalPrincipalInspectionResponse,
  GraphSpec,
  PackageSourceInspectionResponse
} from "@entangle/types";
import {
  projectExternalPrincipalSummary,
  projectPackageSourceSummary
} from "./resource-inventory-output.js";

function createGraph(): GraphSpec {
  return {
    defaults: {
      resourceBindings: {
        externalPrincipalRefs: ["worker-it-git"],
        gitServiceRefs: [],
        relayProfileRefs: []
      },
      runtimeProfile: "local"
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
        nodeId: "user-main",
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
        displayName: "IT Worker",
        nodeId: "worker-it",
        nodeKind: "worker",
        packageSourceRef: "it-pack",
        resourceBindings: {
          externalPrincipalRefs: [],
          gitServiceRefs: [],
          relayProfileRefs: []
        }
      }
    ],
    schemaVersion: "1"
  };
}

function createPackageSource(): PackageSourceInspectionResponse {
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
      name: "IT Pack",
      packageId: "it-template",
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
      absolutePath: "/tmp/it-pack",
      materialization: {
        contentDigest:
          "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        materializationKind: "immutable_store",
        packageRoot: "/store/it-pack",
        synchronizedAt: "2026-04-25T08:00:00.000Z"
      },
      packageSourceId: "it-pack",
      sourceKind: "local_path"
    },
    validation: {
      findings: [],
      ok: true
    }
  };
}

function createExternalPrincipal(): ExternalPrincipalInspectionResponse {
  return {
    principal: {
      displayName: "IT Git",
      gitServiceRef: "local-gitea",
      principalId: "worker-it-git",
      secretRef: "secret://git/worker-it/ssh",
      subject: "worker-it",
      systemKind: "git",
      transportAuthMode: "ssh_key"
    },
    validation: {
      findings: [],
      ok: true
    }
  };
}

describe("resource inventory CLI summary projection", () => {
  it("projects package-source summaries with active graph references", () => {
    expect(
      projectPackageSourceSummary(createPackageSource(), createGraph())
    ).toMatchObject({
      label: "IT Pack (it-pack)",
      manifest: {
        packageId: "it-template"
      },
      packageSourceId: "it-pack",
      referenceNodeIds: ["worker-it"],
      referenceSummary: "Referenced by 1 node: worker-it",
      sourceKind: "local_path",
      validationOk: true
    });
  });

  it("projects external-principal summaries with effective graph references", () => {
    expect(
      projectExternalPrincipalSummary(createExternalPrincipal(), createGraph())
    ).toMatchObject({
      gitServiceRef: "local-gitea",
      label: "IT Git (worker-it-git)",
      principalId: "worker-it-git",
      referenceNodeIds: ["user-main", "worker-it"],
      referenceSummary: "Referenced by 2 nodes: user-main, worker-it",
      transportAuthMode: "ssh_key",
      validationOk: true
    });
  });
});
