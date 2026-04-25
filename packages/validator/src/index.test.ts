import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { EffectiveRuntimeContext, GraphSpec } from "@entangle/types";
import { afterEach, describe, expect, it } from "vitest";
import {
  validateA2AMessageDocument,
  validateConversationLifecycleTransition,
  validateGraphDocument,
  validatePackageDirectory,
  validateRuntimeArtifactRefs,
  validateSessionLifecycleTransition
} from "./index.js";

let temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots.map((root) => rm(root, { force: true, recursive: true }))
  );
  temporaryRoots = [];
});

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

function buildRuntimeContext(): EffectiveRuntimeContext {
  return {
    artifactContext: {
      backends: ["git"],
      defaultNamespace: "team-alpha",
      gitPrincipalBindings: [
        {
          principal: {
            principalId: "worker-it-git",
            displayName: "Worker IT Git Principal",
            systemKind: "git",
            gitServiceRef: "local-gitea",
            subject: "worker-it",
            transportAuthMode: "ssh_key",
            secretRef: "secret://git/worker-it/ssh"
          },
          transport: {
            secretRef: "secret://git/worker-it/ssh",
            status: "available",
            delivery: {
              mode: "mounted_file",
              filePath: "/tmp/worker-it-git"
            }
          }
        }
      ],
      gitServices: [
        {
          id: "local-gitea",
          displayName: "Local Gitea",
          baseUrl: "https://gitea.local",
          remoteBase: "ssh://git@gitea.local:22",
          transportKind: "ssh",
          authMode: "ssh_key",
          defaultNamespace: "team-alpha",
          provisioning: {
            mode: "preexisting"
          }
        }
      ],
      primaryGitPrincipalRef: "worker-it-git",
      primaryGitRepositoryTarget: {
        gitServiceRef: "local-gitea",
        namespace: "team-alpha",
        provisioningMode: "preexisting",
        remoteUrl: "ssh://git@gitea.local:22/team-alpha/graph-alpha.git",
        repositoryName: "graph-alpha",
        transportKind: "ssh"
      },
      primaryGitServiceRef: "local-gitea"
    },
    binding: {
      bindingId: "graph-alpha.worker-it",
      externalPrincipals: [],
      graphId: "graph-alpha",
      graphRevisionId: "graph-alpha-rev-1",
      node: {
        autonomy: {
          canInitiateSessions: false,
          canMutateGraph: false
        },
        displayName: "Worker",
        nodeId: "worker-it",
        nodeKind: "worker",
        resourceBindings: {
          externalPrincipalRefs: [],
          gitServiceRefs: ["local-gitea"],
          primaryGitServiceRef: "local-gitea",
          relayProfileRefs: []
        }
      },
      resolvedResourceBindings: {
        externalPrincipalRefs: [],
        gitServiceRefs: ["local-gitea"],
        primaryGitServiceRef: "local-gitea",
        relayProfileRefs: []
      },
      runtimeProfile: "hackathon_local",
      schemaVersion: "1"
    },
    generatedAt: "2026-04-23T00:00:00.000Z",
    identityContext: {
      algorithm: "nostr_secp256k1",
      publicKey:
        "1111111111111111111111111111111111111111111111111111111111111111",
      secretDelivery: {
        envVar: "ENTANGLE_NOSTR_SECRET_KEY",
        mode: "env_var"
      }
    },
    modelContext: {},
    policyContext: {
      autonomy: {
        canInitiateSessions: false,
        canMutateGraph: false
      },
      notes: [],
      runtimeProfile: "hackathon_local"
    },
    relayContext: {
      edgeRoutes: [],
      relayProfiles: []
    },
    schemaVersion: "1",
    workspace: {
      artifactWorkspaceRoot: "/tmp/entangle/workspace",
      injectedRoot: "/tmp/entangle/injected",
      memoryRoot: "/tmp/entangle/memory",
      packageRoot: "/tmp/entangle/package",
      retrievalRoot: "/tmp/entangle/retrieval",
      root: "/tmp/entangle",
      runtimeRoot: "/tmp/entangle/runtime"
    }
  };
}

function buildA2AMessageDocument(
  overrides: Record<string, unknown> & { work?: Record<string, unknown> } = {}
): Record<string, unknown> {
  const { work, ...messageOverrides } = overrides;

  return {
    constraints: {
      approvalRequiredBeforeAction: false
    },
    conversationId: "conv-alpha",
    fromNodeId: "reviewer-it",
    fromPubkey:
      "1111111111111111111111111111111111111111111111111111111111111111",
    graphId: "graph-alpha",
    intent: "Review the patch.",
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
      "2222222222222222222222222222222222222222222222222222222222222222",
    turnId: "turn-001",
    work: {
      artifactRefs: [],
      metadata: {},
      summary: "Review the patch.",
      ...work
    },
    ...messageOverrides
  };
}

async function createPackageDirectory(input: {
  toolsJson: string;
}): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "entangle-validator-"));
  temporaryRoots.push(root);

  await mkdir(path.join(root, "prompts"), { recursive: true });
  await mkdir(path.join(root, "runtime"), { recursive: true });
  await mkdir(path.join(root, "memory", "schema"), { recursive: true });
  await writeFile(
    path.join(root, "manifest.json"),
    `${JSON.stringify(
      {
        schemaVersion: "1",
        packageId: "local-builder",
        name: "Local Builder",
        version: "0.1.0",
        packageKind: "template",
        defaultNodeKind: "worker",
        entryPrompts: {
          system: "prompts/system.md",
          interaction: "prompts/interaction.md"
        },
        memoryProfile: {
          wikiSeedPath: "memory/seed/wiki",
          schemaPath: "memory/schema/AGENTS.md"
        },
        runtime: {
          configPath: "runtime/config.json",
          capabilitiesPath: "runtime/capabilities.json",
          toolsPath: "runtime/tools.json"
        }
      },
      null,
      2
    )}\n`
  );
  await writeFile(path.join(root, "prompts", "system.md"), "System\n");
  await writeFile(path.join(root, "prompts", "interaction.md"), "Interaction\n");
  await writeFile(path.join(root, "runtime", "config.json"), "{}\n");
  await writeFile(path.join(root, "runtime", "capabilities.json"), "{}\n");
  await writeFile(path.join(root, "runtime", "tools.json"), input.toolsJson);
  await writeFile(path.join(root, "memory", "schema", "AGENTS.md"), "Rules\n");

  return root;
}

describe("validatePackageDirectory", () => {
  it("accepts a package with a valid explicit tool catalog", async () => {
    const root = await createPackageDirectory({
      toolsJson: `${JSON.stringify({ schemaVersion: "1", tools: [] }, null, 2)}\n`
    });

    expect(await validatePackageDirectory(root)).toMatchObject({
      ok: true,
      findings: []
    });
  });

  it("rejects invalid package tool catalog JSON", async () => {
    const root = await createPackageDirectory({
      toolsJson: "{not-json"
    });
    const report = await validatePackageDirectory(root);

    expect(report.ok).toBe(false);
    expect(report.findings).toEqual([
      expect.objectContaining({
        code: "invalid_package_tool_catalog_json",
        path: ["runtime/tools.json"],
        severity: "error"
      })
    ]);
  });

  it("rejects tool catalogs that do not match the package tool schema", async () => {
    const root = await createPackageDirectory({
      toolsJson: `${JSON.stringify({ schemaVersion: "1", tools: [{}] })}\n`
    });
    const report = await validatePackageDirectory(root);

    expect(report.ok).toBe(false);
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "package_tool_catalog_invalid",
          severity: "error"
        })
      ])
    );
  });
});

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

  it("accepts approval request metadata that matches the contract", () => {
    const report = validateA2AMessageDocument(
      buildA2AMessageDocument({
        messageType: "approval.request",
        parentMessageId:
          "abababababababababababababababababababababababababababababababab",
        work: {
          metadata: {
            approval: {
              approvalId: "approval-alpha",
              approverNodeIds: ["worker-lead"],
              reason: "Approve publication before the session can complete."
            }
          },
          summary: "Approval is required before publication."
        }
      })
    );

    expect(report.ok).toBe(true);
  });

  it("rejects approval request messages without approval metadata", () => {
    const report = validateA2AMessageDocument(
      buildA2AMessageDocument({
        messageType: "approval.request",
        parentMessageId:
          "abababababababababababababababababababababababababababababababab",
        work: {
          metadata: {},
          summary: "Approval is required before publication."
        }
      })
    );

    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "a2a_approval_request_metadata_invalid",
          path: ["work", "metadata", "approval"],
          severity: "error"
        })
      ])
    );
  });

  it("rejects approval request messages that do not require a response", () => {
    const report = validateA2AMessageDocument(
      buildA2AMessageDocument({
        messageType: "approval.request",
        parentMessageId:
          "abababababababababababababababababababababababababababababababab",
        responsePolicy: {
          closeOnResult: false,
          maxFollowups: 0,
          responseRequired: false
        },
        work: {
          metadata: {
            approval: {
              approvalId: "approval-alpha"
            }
          },
          summary: "Approval is required before publication."
        }
      })
    );

    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "a2a_approval_request_response_policy_invalid",
          path: ["responsePolicy", "responseRequired"],
          severity: "error"
        })
      ])
    );
  });

  it("accepts approval response metadata that matches the contract", () => {
    const report = validateA2AMessageDocument(
      buildA2AMessageDocument({
        messageType: "approval.response",
        parentMessageId:
          "cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd",
        responsePolicy: {
          closeOnResult: true,
          maxFollowups: 0,
          responseRequired: false
        },
        work: {
          metadata: {
            approval: {
              approvalId: "approval-alpha",
              decision: "approved"
            }
          },
          summary: "Approval is granted."
        }
      })
    );

    expect(report.ok).toBe(true);
  });

  it("rejects approval response messages with invalid decisions", () => {
    const report = validateA2AMessageDocument(
      buildA2AMessageDocument({
        messageType: "approval.response",
        parentMessageId:
          "cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd",
        responsePolicy: {
          closeOnResult: true,
          maxFollowups: 0,
          responseRequired: false
        },
        work: {
          metadata: {
            approval: {
              approvalId: "approval-alpha",
              decision: "queued"
            }
          },
          summary: "Approval is queued."
        }
      })
    );

    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "a2a_approval_response_metadata_invalid",
          path: ["work", "metadata", "approval", "decision"],
          severity: "error"
        })
      ])
    );
  });

  it("rejects approval response messages that request follow-ups", () => {
    const report = validateA2AMessageDocument(
      buildA2AMessageDocument({
        messageType: "approval.response",
        parentMessageId:
          "cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd",
        responsePolicy: {
          closeOnResult: true,
          maxFollowups: 1,
          responseRequired: true
        },
        work: {
          metadata: {
            approval: {
              approvalId: "approval-alpha",
              decision: "approved"
            }
          },
          summary: "Approval is granted."
        }
      })
    );

    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "a2a_approval_response_policy_invalid",
          path: ["responsePolicy", "responseRequired"],
          severity: "error"
        }),
        expect.objectContaining({
          code: "a2a_approval_response_policy_invalid",
          path: ["responsePolicy", "maxFollowups"],
          severity: "error"
        })
      ])
    );
  });
});

describe("validateRuntimeArtifactRefs", () => {
  it("accepts a published git artifact aligned with the primary repository target", () => {
    const report = validateRuntimeArtifactRefs({
      context: buildRuntimeContext(),
      artifactRefs: [
        {
          artifactId: "report-1",
          backend: "git",
          locator: {
            branch: "worker-it/session-alpha/review",
            commit: "abc123",
            gitServiceRef: "local-gitea",
            namespace: "team-alpha",
            repositoryName: "graph-alpha",
            path: "reports/session-alpha/turn-001.md"
          },
          preferred: true,
          status: "published"
        }
      ]
    });

    expect(report.ok).toBe(true);
  });

  it("rejects git handoff refs that cannot be resolved by the receiving runtime", () => {
    const report = validateRuntimeArtifactRefs({
      context: buildRuntimeContext(),
      artifactRefs: [
        {
          artifactId: "report-1",
          backend: "git",
          locator: {
            branch: "worker-it/session-alpha/review",
            commit: "abc123",
            gitServiceRef: "backup-gitea",
            namespace: "other-team",
            path: "reports/session-alpha/turn-001.md"
          },
          preferred: true,
          status: "materialized"
        }
      ]
    });

    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "git_artifact_not_published",
          severity: "error"
        }),
        expect.objectContaining({
          code: "git_artifact_unbound_service",
          severity: "error"
        }),
        expect.objectContaining({
          code: "git_artifact_missing_repository_name",
          severity: "error"
        })
      ])
    );
  });

  it("rejects git handoff refs when the target service lacks a transport principal", () => {
    const context = buildRuntimeContext();
    context.artifactContext.gitServices.push({
      id: "backup-gitea",
      displayName: "Backup Gitea",
      baseUrl: "https://backup.gitea.local",
      remoteBase: "ssh://git@backup.gitea.local:22",
      transportKind: "ssh",
      authMode: "ssh_key",
      provisioning: {
        mode: "preexisting"
      }
    });

    const report = validateRuntimeArtifactRefs({
      context,
      artifactRefs: [
        {
          artifactId: "report-2",
          backend: "git",
          locator: {
            branch: "worker-it/session-alpha/review",
            commit: "abc123",
            gitServiceRef: "backup-gitea",
            namespace: "backup-team",
            repositoryName: "graph-beta",
            path: "reports/session-alpha/turn-001.md"
          },
          preferred: true,
          status: "published"
        }
      ]
    });

    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "git_handoff_missing_transport_principal",
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
