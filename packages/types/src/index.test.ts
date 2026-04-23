import { describe, expect, it } from "vitest";
import {
  artifactRecordSchema,
  entangleA2AMessageSchema,
  entangleNostrGiftWrapKind,
  entangleNostrRumorKind,
  externalPrincipalRecordSchema,
  gitServiceProfileSchema,
  isAllowedApprovalLifecycleTransition,
  isAllowedConversationLifecycleTransition,
  isAllowedSessionLifecycleTransition,
  resolvedSecretBindingSchema,
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
            path: "reports/session-alpha/turn-001.md"
          },
          preferred: true,
          status: "published"
        },
        updatedAt: "2026-04-22T00:01:00.000Z"
      }).success
    ).toBe(false);
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
