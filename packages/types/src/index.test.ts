import { describe, expect, it } from "vitest";
import {
  artifactRecordSchema,
  entangleA2AMessageSchema,
  entangleNostrGiftWrapKind,
  entangleNostrRumorKind,
  engineToolExecutionRequestSchema,
  engineToolExecutionResultSchema,
  externalPrincipalRecordSchema,
  gitRepositoryProvisioningRecordSchema,
  gitServiceProfileSchema,
  isAllowedApprovalLifecycleTransition,
  isAllowedConversationLifecycleTransition,
  isAllowedSessionLifecycleTransition,
  modelEndpointProfileSchema,
  modelRuntimeContextSchema,
  packageToolCatalogSchema,
  resolvedSecretBindingSchema,
  resolveGitPrincipalBindingForService,
  resolveGitRepositoryTargetForArtifactLocator,
  resolvePrimaryGitRepositoryTarget,
  secretRefSchema
} from "./index.js";

describe("Entangle A2A machine-readable contracts", () => {
  it("accepts a valid task request payload", () => {
    const result = entangleA2AMessageSchema.parse({
      conversationId: "conv-alpha",
      fromNodeId: "worker-it",
      fromPubkey: "1111111111111111111111111111111111111111111111111111111111111111",
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
      toNodeId: "reviewer-it",
      toPubkey: "2222222222222222222222222222222222222222222222222222222222222222",
      turnId: "turn-001",
      work: {
        summary: "Review the parser patch for blocking issues."
      }
    });

    expect(result.messageType).toBe("task.request");
  });

  it("rejects invalid follow-up semantics for conversation.close", () => {
    const result = entangleA2AMessageSchema.safeParse({
      constraints: {
        approvalRequiredBeforeAction: false
      },
      conversationId: "conv-alpha",
      fromNodeId: "worker-it",
      fromPubkey: "1111111111111111111111111111111111111111111111111111111111111111",
      graphId: "graph-alpha",
      intent: "close_conversation",
      messageType: "conversation.close",
      parentMessageId:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      protocol: "entangle.a2a.v1",
      responsePolicy: {
        closeOnResult: true,
        maxFollowups: 1,
        responseRequired: true
      },
      sessionId: "session-alpha",
      toNodeId: "reviewer-it",
      toPubkey: "2222222222222222222222222222222222222222222222222222222222222222",
      turnId: "turn-002",
      work: {
        summary: "No more follow-up is required."
      }
    });

    expect(result.success).toBe(false);
  });
});

describe("artifact contracts", () => {
  it("accepts a structured git artifact record", () => {
    const result = artifactRecordSchema.parse({
      createdAt: "2026-04-22T00:00:00.000Z",
      materialization: {
        localPath: "/tmp/entangle-runner/workspace/reports/session-alpha/turn-001.md",
        repoPath: "/tmp/entangle-runner/workspace"
      },
      publication: {
        state: "not_requested"
      },
      ref: {
        artifactId: "report-turn-001",
        artifactKind: "report_file",
        backend: "git",
        contentSummary: "Turn report for the parser review.",
        conversationId: "conv-alpha",
        createdByNodeId: "worker-it",
        locator: {
          branch: "worker-it/session-alpha/review-patch",
          commit: "abc123",
          gitServiceRef: "local-gitea",
          namespace: "team-alpha",
          repositoryName: "graph-alpha",
          path: "reports/session-alpha/turn-001.md"
        },
        preferred: true,
        sessionId: "session-alpha",
        status: "materialized"
      },
      turnId: "turn-001",
      updatedAt: "2026-04-22T00:00:00.000Z"
    });

    expect(result.ref.backend).toBe("git");
    expect(result.ref.locator.path).toContain("reports/session-alpha");
    expect(result.publication?.state).toBe("not_requested");
  });

  it("rejects published artifact metadata that omits remote publication details", () => {
    expect(
      artifactRecordSchema.safeParse({
        createdAt: "2026-04-22T00:00:00.000Z",
        materialization: {
          localPath: "/tmp/entangle-runner/workspace/reports/session-alpha/turn-001.md"
        },
        publication: {
          state: "published",
          publishedAt: "2026-04-22T00:01:00.000Z"
        },
        ref: {
          artifactId: "report-turn-001",
          artifactKind: "report_file",
          backend: "git",
          locator: {
            branch: "worker-it/session-alpha/review-patch",
            commit: "abc123",
            gitServiceRef: "local-gitea",
            namespace: "team-alpha",
            repositoryName: "graph-alpha",
            path: "reports/session-alpha/turn-001.md"
          },
          preferred: true,
          status: "published"
        },
        updatedAt: "2026-04-22T00:01:00.000Z"
      }).success
    ).toBe(false);
  });

  it("accepts retrieval metadata for successfully consumed git artifacts", () => {
    const result = artifactRecordSchema.parse({
      createdAt: "2026-04-23T00:00:00.000Z",
      materialization: {
        localPath:
          "/tmp/entangle-runner/retrieval-cache/input-report/repo/reports/session-alpha/turn-001.md",
        repoPath: "/tmp/entangle-runner/retrieval-cache/input-report/repo"
      },
      ref: {
        artifactId: "input-report",
        artifactKind: "report_file",
        backend: "git",
        locator: {
          branch: "worker-it/session-alpha/review-patch",
          commit: "abc123",
          gitServiceRef: "local-gitea",
          namespace: "team-alpha",
          repositoryName: "graph-alpha",
          path: "reports/session-alpha/turn-001.md"
        },
        preferred: true,
        status: "published"
      },
      retrieval: {
        state: "retrieved",
        retrievedAt: "2026-04-23T00:00:01.000Z",
        remoteName: "entangle-local-gitea",
        remoteUrl: "ssh://git@gitea:22/team-alpha/graph-alpha.git"
      },
      updatedAt: "2026-04-23T00:00:01.000Z"
    });

    expect(result.retrieval?.state).toBe("retrieved");
  });
});

describe("external principal contracts", () => {
  it("accepts a git external principal record", () => {
    const result = externalPrincipalRecordSchema.parse({
      principalId: "worker-it-git",
      displayName: "Worker IT Git Principal",
      systemKind: "git",
      gitServiceRef: "local-gitea",
      subject: "worker-it",
      transportAuthMode: "ssh_key",
      secretRef: "secret://git/worker-it/ssh",
      attribution: {
        displayName: "Worker IT",
        email: "worker-it@entangle.local"
      },
      signing: {
        mode: "none"
      }
    });

    expect(result.systemKind).toBe("git");
    expect(result.gitServiceRef).toBe("local-gitea");
  });
});

describe("git service contracts", () => {
  it("accepts an SSH git service with an explicit remote base", () => {
    const result = gitServiceProfileSchema.parse({
      id: "local-gitea",
      displayName: "Local Gitea",
      baseUrl: "http://gitea:3000",
      remoteBase: "ssh://git@gitea:22",
      transportKind: "ssh",
      authMode: "ssh_key",
      defaultNamespace: "team-alpha",
      provisioning: {
        mode: "preexisting"
      }
    });

    expect(result.remoteBase).toBe("ssh://git@gitea:22");
    expect(result.provisioning.mode).toBe("preexisting");
  });

  it("rejects git services whose remote base does not match the transport kind", () => {
    expect(
      gitServiceProfileSchema.safeParse({
        id: "local-gitea",
        displayName: "Local Gitea",
        baseUrl: "http://gitea:3000",
        remoteBase: "http://gitea:3000",
        transportKind: "ssh",
        authMode: "ssh_key"
      }).success
    ).toBe(false);
  });

  it("derives a primary git repository target deterministically", () => {
    const target = resolvePrimaryGitRepositoryTarget({
      defaultNamespace: "team-alpha",
      gitServices: [
        gitServiceProfileSchema.parse({
          id: "local-gitea",
          displayName: "Local Gitea",
          baseUrl: "http://gitea:3000",
          remoteBase: "ssh://git@gitea:22",
          transportKind: "ssh",
          authMode: "ssh_key",
          defaultNamespace: "team-alpha",
          provisioning: {
            mode: "preexisting"
          }
        })
      ],
      graphId: "graph-alpha",
      primaryGitServiceRef: "local-gitea"
    });

    expect(target).toEqual({
      gitServiceRef: "local-gitea",
      namespace: "team-alpha",
      provisioningMode: "preexisting",
      remoteUrl: "ssh://git@gitea:22/team-alpha/graph-alpha.git",
      repositoryName: "graph-alpha",
      transportKind: "ssh"
    });
  });

  it("resolves sibling repository targets from a primary-target remote override", () => {
    const target = resolveGitRepositoryTargetForArtifactLocator({
      artifactContext: {
        backends: ["git"],
        defaultNamespace: "team-alpha",
        gitPrincipalBindings: [],
        gitServices: [
          gitServiceProfileSchema.parse({
            id: "local-gitea",
            displayName: "Local Gitea",
            baseUrl: "http://gitea:3000",
            remoteBase: "ssh://git@gitea:22",
            transportKind: "ssh",
            authMode: "ssh_key",
            defaultNamespace: "team-alpha",
            provisioning: {
              mode: "preexisting"
            }
          })
        ],
        primaryGitRepositoryTarget: {
          gitServiceRef: "local-gitea",
          namespace: "team-alpha",
          provisioningMode: "preexisting",
          remoteUrl: "/tmp/entangle-remotes/graph-alpha.git",
          repositoryName: "graph-alpha",
          transportKind: "ssh"
        },
        primaryGitServiceRef: "local-gitea"
      },
      locator: {
        branch: "worker-it/session-alpha/review",
        commit: "abc123",
        gitServiceRef: "local-gitea",
        namespace: "team-alpha",
        repositoryName: "review-artifacts",
        path: "reports/session-alpha/turn-001.md"
      }
    });

    expect(target).toEqual({
      gitServiceRef: "local-gitea",
      namespace: "team-alpha",
      provisioningMode: "preexisting",
      remoteUrl: "/tmp/entangle-remotes/review-artifacts.git",
      repositoryName: "review-artifacts",
      transportKind: "ssh"
    });
  });

  it("resolves locator-specific repository targets from bound non-primary services", () => {
    const target = resolveGitRepositoryTargetForArtifactLocator({
      artifactContext: {
        backends: ["git"],
        defaultNamespace: "team-alpha",
        gitPrincipalBindings: [],
        gitServices: [
          gitServiceProfileSchema.parse({
            id: "local-gitea",
            displayName: "Local Gitea",
            baseUrl: "http://gitea:3000",
            remoteBase: "ssh://git@gitea:22",
            transportKind: "ssh",
            authMode: "ssh_key",
            defaultNamespace: "team-alpha",
            provisioning: {
              mode: "preexisting"
            }
          }),
          gitServiceProfileSchema.parse({
            id: "backup-gitea",
            displayName: "Backup Gitea",
            baseUrl: "http://backup-gitea:3000",
            remoteBase: "ssh://git@backup-gitea:22",
            transportKind: "ssh",
            authMode: "ssh_key",
            defaultNamespace: "backup-team",
            provisioning: {
              mode: "preexisting"
            }
          })
        ],
        primaryGitRepositoryTarget: {
          gitServiceRef: "local-gitea",
          namespace: "team-alpha",
          provisioningMode: "preexisting",
          remoteUrl: "ssh://git@gitea:22/team-alpha/graph-alpha.git",
          repositoryName: "graph-alpha",
          transportKind: "ssh"
        },
        primaryGitServiceRef: "local-gitea"
      },
      locator: {
        branch: "worker-it/session-alpha/review",
        commit: "abc123",
        gitServiceRef: "backup-gitea",
        namespace: "backup-team",
        repositoryName: "review-artifacts",
        path: "reports/session-alpha/turn-001.md"
      }
    });

    expect(target?.remoteUrl).toBe(
      "ssh://git@backup-gitea:22/backup-team/review-artifacts.git"
    );
  });
});

describe("git repository provisioning contracts", () => {
  it("accepts a ready provisioning record", () => {
    const result = gitRepositoryProvisioningRecordSchema.parse({
      checkedAt: "2026-04-23T00:00:00.000Z",
      created: true,
      schemaVersion: "1",
      state: "ready",
      target: {
        gitServiceRef: "local-gitea",
        namespace: "team-alpha",
        provisioningMode: "gitea_api",
        remoteUrl: "ssh://git@gitea:22/team-alpha/graph-alpha.git",
        repositoryName: "graph-alpha",
        transportKind: "ssh"
      }
    });

    expect(result.state).toBe("ready");
    expect(result.created).toBe(true);
  });

  it("rejects failed provisioning records without an error", () => {
    expect(
      gitRepositoryProvisioningRecordSchema.safeParse({
        checkedAt: "2026-04-23T00:00:00.000Z",
        schemaVersion: "1",
        state: "failed",
        target: {
          gitServiceRef: "local-gitea",
          namespace: "team-alpha",
          provisioningMode: "gitea_api",
          remoteUrl: "ssh://git@gitea:22/team-alpha/graph-alpha.git",
          repositoryName: "graph-alpha",
          transportKind: "ssh"
        }
      }).success
    ).toBe(false);
  });
});

describe("runtime git resolution helpers", () => {
  it("prefers the primary principal binding when it matches the requested service", () => {
    const resolution = resolveGitPrincipalBindingForService({
      artifactContext: {
        backends: ["git"],
        defaultNamespace: "team-alpha",
        gitPrincipalBindings: [
          {
            principal: externalPrincipalRecordSchema.parse({
              principalId: "worker-it-git-main",
              displayName: "Worker IT Git Main",
              systemKind: "git",
              gitServiceRef: "local-gitea",
              subject: "worker-it",
              transportAuthMode: "ssh_key",
              secretRef: "secret://git/worker-it/main"
            }),
            transport: resolvedSecretBindingSchema.parse({
              secretRef: "secret://git/worker-it/main",
              status: "available",
              delivery: {
                mode: "mounted_file",
                filePath: "/tmp/git-main"
              }
            })
          },
          {
            principal: externalPrincipalRecordSchema.parse({
              principalId: "worker-it-git-backup",
              displayName: "Worker IT Git Backup",
              systemKind: "git",
              gitServiceRef: "local-gitea",
              subject: "worker-it",
              transportAuthMode: "ssh_key",
              secretRef: "secret://git/worker-it/backup"
            }),
            transport: resolvedSecretBindingSchema.parse({
              secretRef: "secret://git/worker-it/backup",
              status: "available",
              delivery: {
                mode: "mounted_file",
                filePath: "/tmp/git-backup"
              }
            })
          }
        ],
        gitServices: [],
        primaryGitPrincipalRef: "worker-it-git-backup",
        primaryGitServiceRef: "local-gitea"
      },
      gitServiceRef: "local-gitea"
    });

    expect(resolution.status).toBe("resolved");
    if (resolution.status === "resolved") {
      expect(resolution.binding.principal.principalId).toBe(
        "worker-it-git-backup"
      );
    }
  });

  it("reports ambiguity when multiple service principals exist without a deterministic selection", () => {
    const resolution = resolveGitPrincipalBindingForService({
      artifactContext: {
        backends: ["git"],
        defaultNamespace: "team-alpha",
        gitPrincipalBindings: [
          {
            principal: externalPrincipalRecordSchema.parse({
              principalId: "worker-it-git-main",
              displayName: "Worker IT Git Main",
              systemKind: "git",
              gitServiceRef: "local-gitea",
              subject: "worker-it",
              transportAuthMode: "ssh_key",
              secretRef: "secret://git/worker-it/main"
            }),
            transport: resolvedSecretBindingSchema.parse({
              secretRef: "secret://git/worker-it/main",
              status: "available",
              delivery: {
                mode: "mounted_file",
                filePath: "/tmp/git-main"
              }
            })
          },
          {
            principal: externalPrincipalRecordSchema.parse({
              principalId: "worker-it-git-backup",
              displayName: "Worker IT Git Backup",
              systemKind: "git",
              gitServiceRef: "local-gitea",
              subject: "worker-it",
              transportAuthMode: "ssh_key",
              secretRef: "secret://git/worker-it/backup"
            }),
            transport: resolvedSecretBindingSchema.parse({
              secretRef: "secret://git/worker-it/backup",
              status: "available",
              delivery: {
                mode: "mounted_file",
                filePath: "/tmp/git-backup"
              }
            })
          }
        ],
        gitServices: [],
        primaryGitServiceRef: "backup-gitea"
      },
      gitServiceRef: "local-gitea"
    });

    expect(resolution.status).toBe("ambiguous");
  });
});

describe("secret reference contracts", () => {
  it("accepts secret:// references with safe path segments", () => {
    expect(secretRefSchema.parse("secret://git/worker-it/ssh")).toBe(
      "secret://git/worker-it/ssh"
    );
  });

  it("rejects unsafe or malformed secret references", () => {
    expect(secretRefSchema.safeParse("https://example.com/secret").success).toBe(
      false
    );
    expect(secretRefSchema.safeParse("secret://git/../ssh").success).toBe(false);
    expect(secretRefSchema.safeParse("secret://git/worker it/ssh").success).toBe(
      false
    );
  });
});

describe("resolved secret bindings", () => {
  it("accepts an available mounted secret binding", () => {
    const result = resolvedSecretBindingSchema.parse({
      secretRef: "secret://git/worker-it/ssh",
      status: "available",
      delivery: {
        mode: "mounted_file",
        filePath: "/entangle-secrets/refs/git/worker-it/ssh"
      }
    });

    expect(result.status).toBe("available");
  });

  it("rejects inconsistent delivery/status combinations", () => {
    expect(
      resolvedSecretBindingSchema.safeParse({
        secretRef: "secret://git/worker-it/ssh",
        status: "missing",
        delivery: {
          mode: "mounted_file",
          filePath: "/entangle-secrets/refs/git/worker-it/ssh"
        }
      }).success
    ).toBe(false);
  });
});

describe("model runtime context contracts", () => {
  it("requires explicit authMode on model endpoint profiles", () => {
    expect(
      modelEndpointProfileSchema.safeParse({
        id: "shared-model",
        displayName: "Shared Model",
        adapterKind: "anthropic",
        baseUrl: "https://api.anthropic.com",
        secretRef: "secret://shared-model",
        defaultModel: "claude-opus-4-7"
      }).success
    ).toBe(false);
  });

  it("accepts a model profile paired with the matching resolved auth binding", () => {
    const result = modelRuntimeContextSchema.parse({
      modelEndpointProfile: {
        id: "shared-model",
        displayName: "Shared Model",
        adapterKind: "anthropic",
        baseUrl: "https://api.anthropic.com",
        authMode: "header_secret",
        secretRef: "secret://shared-model",
        defaultModel: "claude-opus-4-7"
      },
      auth: {
        secretRef: "secret://shared-model",
        status: "available",
        delivery: {
          mode: "mounted_file",
          filePath: "/entangle-secrets/refs/shared-model"
        }
      }
    });

    expect(result.auth?.status).toBe("available");
  });

  it("rejects mismatched model profile and auth binding secret refs", () => {
    expect(
      modelRuntimeContextSchema.safeParse({
        modelEndpointProfile: {
          id: "shared-model",
          displayName: "Shared Model",
          adapterKind: "anthropic",
          baseUrl: "https://api.anthropic.com",
          authMode: "header_secret",
          secretRef: "secret://shared-model",
          defaultModel: "claude-opus-4-7"
        },
        auth: {
          secretRef: "secret://different-model",
          status: "available",
          delivery: {
            mode: "mounted_file",
            filePath: "/entangle-secrets/refs/different-model"
          }
        }
      }).success
    ).toBe(false);
  });
});

describe("package tool catalog contracts", () => {
  it("accepts an explicit builtin tool catalog", () => {
    const result = packageToolCatalogSchema.parse({
      schemaVersion: "1",
      tools: [
        {
          id: "write_report_file",
          description: "Persist a markdown report artifact for the current turn.",
          inputSchema: {
            type: "object",
            properties: {
              body: {
                type: "string"
              }
            },
            required: ["body"]
          },
          execution: {
            kind: "builtin",
            builtinToolId: "write_report_file"
          }
        }
      ]
    });

    expect(result.tools).toHaveLength(1);
  });

  it("rejects duplicate tool ids in the catalog", () => {
    expect(
      packageToolCatalogSchema.safeParse({
        schemaVersion: "1",
        tools: [
          {
            id: "write_report_file",
            description: "first",
            inputSchema: {},
            execution: {
              kind: "builtin",
              builtinToolId: "write_report_file"
            }
          },
          {
            id: "write_report_file",
            description: "second",
            inputSchema: {},
            execution: {
              kind: "builtin",
              builtinToolId: "write_report_file_v2"
            }
          }
        ]
      }).success
    ).toBe(false);
  });
});

describe("engine tool execution contracts", () => {
  it("accepts structured tool execution requests and results", () => {
    const request = engineToolExecutionRequestSchema.parse({
      artifactInputs: [
        {
          artifactId: "input-report",
          backend: "git",
          localPath: "/tmp/entangle/retrieval/input.md",
          repoPath: "/tmp/entangle/retrieval/repo",
          sourceRef: {
            artifactId: "input-report",
            artifactKind: "report_file",
            backend: "git",
            locator: {
              branch: "worker-it/session-alpha/review-patch",
              commit: "abc123",
              gitServiceRef: "local-gitea",
              namespace: "team-alpha",
              repositoryName: "graph-alpha",
              path: "reports/session-alpha/input.md"
            },
            preferred: true,
            status: "published"
          }
        }
      ],
      input: {
        artifactId: "input-report"
      },
      memoryRefs: ["/tmp/entangle/memory/wiki/index.md"],
      nodeId: "worker-it",
      sessionId: "session-alpha",
      tool: {
        id: "inspect_artifact_input",
        description: "Inspect a retrieved inbound artifact.",
        inputSchema: {
          type: "object",
          properties: {
            artifactId: {
              type: "string"
            }
          },
          required: ["artifactId"]
        }
      },
      toolCallId: "toolu_01D7FLrfh4GYq7yT1ULFeyMV"
    });
    const result = engineToolExecutionResultSchema.parse({
      content: {
        artifactId: "input-report",
        localPath: "/tmp/entangle/retrieval/input.md",
        preview: "Inbound artifact content."
      },
      isError: false
    });

    expect(request.tool.id).toBe("inspect_artifact_input");
    expect(result.isError).toBe(false);
  });
});

describe("runner lifecycle transition helpers", () => {
  it("allows valid canonical transitions", () => {
    expect(isAllowedSessionLifecycleTransition("planning", "active")).toBe(true);
    expect(isAllowedConversationLifecycleTransition("resolved", "closed")).toBe(
      true
    );
    expect(isAllowedApprovalLifecycleTransition("pending", "approved")).toBe(
      true
    );
  });

  it("rejects terminal-state regressions", () => {
    expect(isAllowedSessionLifecycleTransition("completed", "active")).toBe(false);
    expect(isAllowedConversationLifecycleTransition("closed", "working")).toBe(
      false
    );
    expect(isAllowedApprovalLifecycleTransition("approved", "pending")).toBe(
      false
    );
  });
});

describe("nostr transport constants", () => {
  it("keeps the canonical wrapped-event kinds stable", () => {
    expect(entangleNostrGiftWrapKind).toBe(1059);
    expect(entangleNostrRumorKind).toBe(24159);
  });
});
