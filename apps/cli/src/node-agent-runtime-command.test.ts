import { describe, expect, it } from "vitest";
import type { NodeInspectionResponse } from "@entangle/types";
import { buildNodeAgentRuntimeReplacementRequest } from "./node-agent-runtime-command.js";

function createNodeInspection(): NodeInspectionResponse {
  return {
    binding: {
      bindingId: "revision-worker",
      externalPrincipals: [],
      graphId: "local-team",
      graphRevisionId: "revision",
      node: {
        agentRuntime: {
          defaultAgent: "build",
          engineProfileRef: "local-opencode",
          mode: "coding_agent"
        },
        autonomy: {
          canInitiateSessions: true,
          canMutateGraph: false
        },
        displayName: "Builder",
        nodeId: "builder",
        nodeKind: "worker",
        packageSourceRef: "builder-package",
        resourceBindings: {
          externalPrincipalRefs: ["builder-git"],
          gitServiceRefs: ["local-gitea"],
          primaryGitServiceRef: "local-gitea",
          relayProfileRefs: ["local-relay"]
        }
      },
      packageSource: {
        absolutePath: "/tmp/builder-package",
        packageSourceId: "builder-package",
        sourceKind: "local_path"
      },
      resolvedResourceBindings: {
        externalPrincipalRefs: ["builder-git"],
        gitServiceRefs: ["local-gitea"],
        primaryGitServiceRef: "local-gitea",
        relayProfileRefs: ["local-relay"]
      },
      runtimeProfile: "local",
      schemaVersion: "1"
    },
    runtime: {
      desiredState: "stopped",
      nodeId: "builder",
      observedState: "stopped"
    }
  };
}

describe("node agent runtime CLI helpers", () => {
  it("builds a managed-node replacement request from runtime options", () => {
    expect(
      buildNodeAgentRuntimeReplacementRequest(createNodeInspection(), {
        defaultAgent: "review",
        engineProfileRef: "local-opencode-fast",
        mode: "coding_agent"
      })
    ).toMatchObject({
      agentRuntime: {
        defaultAgent: "review",
        engineProfileRef: "local-opencode-fast",
        mode: "coding_agent"
      },
      autonomy: {
        canInitiateSessions: true,
        canMutateGraph: false
      },
      displayName: "Builder",
      nodeKind: "worker",
      packageSourceRef: "builder-package",
      resourceBindings: {
        externalPrincipalRefs: ["builder-git"],
        gitServiceRefs: ["local-gitea"],
        primaryGitServiceRef: "local-gitea",
        relayProfileRefs: ["local-relay"]
      }
    });
  });

  it("clears node-level overrides without dropping unrelated bindings", () => {
    expect(
      buildNodeAgentRuntimeReplacementRequest(createNodeInspection(), {
        clearDefaultAgent: true,
        clearEngineProfileRef: true,
        inheritMode: true
      })
    ).toMatchObject({
      agentRuntime: {},
      autonomy: {
        canInitiateSessions: true,
        canMutateGraph: false
      },
      resourceBindings: {
        externalPrincipalRefs: ["builder-git"],
        gitServiceRefs: ["local-gitea"],
        primaryGitServiceRef: "local-gitea",
        relayProfileRefs: ["local-relay"]
      }
    });
  });

  it("rejects ambiguous or empty configuration requests", () => {
    expect(() =>
      buildNodeAgentRuntimeReplacementRequest(createNodeInspection(), {})
    ).toThrow("At least one agent-runtime configuration option is required.");

    expect(() =>
      buildNodeAgentRuntimeReplacementRequest(createNodeInspection(), {
        inheritMode: true,
        mode: "disabled"
      })
    ).toThrow("Use either --mode or --inherit-mode, not both.");
  });
});
