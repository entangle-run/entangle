import type { GraphSpec } from "@entangle/types";
import { describe, expect, it } from "vitest";
import { validateGraphDocument } from "./index.js";

function buildGraph(packageSourceRef?: string): GraphSpec {
  return {
    defaults: {
      resourceBindings: {
        gitServiceRefs: [],
        relayProfileRefs: []
      },
      runtimeProfile: "hackathon_local"
    },
    edges: [],
    graphId: "demo-graph",
    name: "Demo Graph",
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
          gitServiceRefs: [],
          relayProfileRefs: []
        }
      },
      {
        autonomy: {
          canInitiateSessions: false,
          canMutateGraph: false
        },
        displayName: "Worker",
        nodeId: "worker",
        nodeKind: "worker",
        packageSourceRef,
        resourceBindings: {
          gitServiceRefs: [],
          relayProfileRefs: []
        }
      }
    ],
    schemaVersion: "1"
  };
}

describe("validateGraphDocument", () => {
  it("does not invent missing host state when package-source ids were not provided", () => {
    const report = validateGraphDocument(buildGraph("worker-source"));

    expect(report.findings.some((finding) => finding.code === "unknown_package_source_ref")).toBe(
      false
    );
  });

  it("treats an explicitly empty admitted package-source set as authoritative", () => {
    const report = validateGraphDocument(buildGraph("worker-source"), {
      packageSourceIds: []
    });

    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "unknown_package_source_ref",
          severity: "error"
        })
      ])
    );
  });
});
