import type { GraphSpec } from "@entangle/types";
import { describe, expect, it } from "vitest";
import {
  validateA2AMessageDocument,
  validateConversationLifecycleTransition,
  validateGraphDocument,
  validateSessionLifecycleTransition
} from "./index.js";

function buildGraph(
  packageSourceRef?: string,
  workerResourceBindings: GraphSpec["nodes"][number]["resourceBindings"] = {
    externalPrincipalRefs: [],
    gitServiceRefs: [],
    relayProfileRefs: []
  }
): GraphSpec {
  return {
    defaults: {
      resourceBindings: {
        externalPrincipalRefs: [],
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
        displayName: "Worker",
        nodeId: "worker",
        nodeKind: "worker",
        packageSourceRef,
        resourceBindings: workerResourceBindings
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

  it("rejects missing external principal refs when host principal state was provided", () => {
    const report = validateGraphDocument(
      buildGraph("worker-source", {
        externalPrincipalRefs: ["worker-git"],
        gitServiceRefs: ["local-gitea"],
        primaryGitServiceRef: "local-gitea",
        relayProfileRefs: []
      }),
      {
        catalog: {
          schemaVersion: "1",
          catalogId: "local",
          relays: [],
          gitServices: [
            {
              id: "local-gitea",
              displayName: "Local Gitea",
              baseUrl: "https://gitea.local",
              remoteBase: "ssh://git@gitea.local:22",
              transportKind: "ssh",
              authMode: "ssh_key",
              provisioning: {
                mode: "preexisting"
              }
            }
          ],
          modelEndpoints: [],
          defaults: {
            relayProfileRefs: []
          }
        },
        externalPrincipals: [],
        packageSourceIds: ["worker-source"]
      }
    );

    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "unknown_external_principal_ref",
          severity: "error"
        })
      ])
    );
  });

  it("warns when a non-user node resolves a primary git service without a matching git principal", () => {
    const report = validateGraphDocument(
      buildGraph("worker-source", {
        externalPrincipalRefs: [],
        gitServiceRefs: ["local-gitea"],
        primaryGitServiceRef: "local-gitea",
        relayProfileRefs: []
      }),
      {
        catalog: {
          schemaVersion: "1",
          catalogId: "local",
          relays: [],
          gitServices: [
            {
              id: "local-gitea",
              displayName: "Local Gitea",
              baseUrl: "https://gitea.local",
              remoteBase: "ssh://git@gitea.local:22",
              transportKind: "ssh",
              authMode: "ssh_key",
              provisioning: {
                mode: "preexisting"
              }
            }
          ],
          modelEndpoints: [],
          defaults: {
            relayProfileRefs: []
          }
        },
        externalPrincipals: [],
        packageSourceIds: ["worker-source"]
      }
    );

    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing_primary_git_principal",
          severity: "warning"
        })
      ])
    );
  });

  it("warns when multiple git principals resolve without a primary git service", () => {
    const report = validateGraphDocument(
      buildGraph("worker-source", {
        externalPrincipalRefs: ["worker-git-main", "worker-git-backup"],
        gitServiceRefs: ["local-gitea", "backup-gitea"],
        relayProfileRefs: []
      }),
      {
        catalog: {
          schemaVersion: "1",
          catalogId: "local",
          relays: [],
          gitServices: [
            {
              id: "local-gitea",
              displayName: "Local Gitea",
              baseUrl: "https://gitea.local",
              remoteBase: "ssh://git@gitea.local:22",
              transportKind: "ssh",
              authMode: "ssh_key",
              provisioning: {
                mode: "preexisting"
              }
            },
            {
              id: "backup-gitea",
              displayName: "Backup Gitea",
              baseUrl: "https://backup.gitea.local",
              remoteBase: "ssh://git@backup.gitea.local:22",
              transportKind: "ssh",
              authMode: "ssh_key",
              provisioning: {
                mode: "preexisting"
              }
            }
          ],
          modelEndpoints: [],
          defaults: {
            relayProfileRefs: []
          }
        },
        externalPrincipals: [
          {
            principalId: "worker-git-main",
            displayName: "Worker Git Main",
            systemKind: "git",
            gitServiceRef: "local-gitea",
            subject: "worker",
            transportAuthMode: "ssh_key",
            secretRef: "secret://git/worker/main"
          },
          {
            principalId: "worker-git-backup",
            displayName: "Worker Git Backup",
            systemKind: "git",
            gitServiceRef: "backup-gitea",
            subject: "worker",
            transportAuthMode: "ssh_key",
            secretRef: "secret://git/worker/backup"
          }
        ],
        packageSourceIds: ["worker-source"]
      }
    );

    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "ambiguous_git_principal_without_primary_service",
          severity: "warning"
        })
      ])
    );
  });
});

describe("validateA2AMessageDocument", () => {
  it("rejects self-addressed protocol messages", () => {
    const report = validateA2AMessageDocument({
      conversationId: "conv-alpha",
      fromNodeId: "worker-it",
      fromPubkey:
        "1111111111111111111111111111111111111111111111111111111111111111",
      graphId: "graph-alpha",
      intent: "review_patch",
      messageType: "task.request",
      protocol: "entangle.a2a.v1",
      responsePolicy: {
        closeOnResult: true,
        maxFollowups: 1,
        responseRequired: true
      },
      sessionId: "session-alpha",
      toNodeId: "worker-it",
      toPubkey:
        "1111111111111111111111111111111111111111111111111111111111111111",
      turnId: "turn-001",
      work: {
        summary: "Review the patch."
      }
    });

    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "a2a_message_invalid",
          severity: "error"
        })
      ])
    );
  });
});

describe("lifecycle transition validation", () => {
  it("rejects invalid session regressions", () => {
    const report = validateSessionLifecycleTransition("completed", "active");

    expect(report.ok).toBe(false);
    expect(report.findings[0]?.code).toBe("session_transition_invalid");
  });

  it("accepts valid conversation progress transitions", () => {
    const report = validateConversationLifecycleTransition("working", "resolved");

    expect(report.ok).toBe(true);
    expect(report.findings).toHaveLength(0);
  });
});
