import { describe, expect, it } from "vitest";
import {
  artifactRecordSchema,
  classifyRuntimeReconciliation,
  edgeCreateRequestSchema,
  entangleA2AMessageSchema,
  entangleNostrGiftWrapKind,
  entangleNostrRumorKind,
  engineToolExecutionRequestSchema,
  engineToolExecutionResultSchema,
  externalPrincipalRecordSchema,
  graphRevisionInspectionResponseSchema,
  gitRepositoryProvisioningRecordSchema,
  gitServiceProfileSchema,
  hostEventRecordSchema,
  hostStatusResponseSchema,
  isAllowedApprovalLifecycleTransition,
  isAllowedConversationLifecycleTransition,
  isAllowedSessionLifecycleTransition,
  modelEndpointProfileSchema,
  modelRuntimeContextSchema,
  nodeCreateRequestSchema,
  nodeInspectionResponseSchema,
  packageToolCatalogSchema,
  reconciliationSnapshotSchema,
  resolvedSecretBindingSchema,
  runtimeRecoveryInspectionResponseSchema,
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

describe("host event contracts", () => {
  it("accepts a typed runtime observed-state event", () => {
    const result = hostEventRecordSchema.parse({
      eventId: "runtime-worker-it-evt-001",
      message: "Runtime 'worker-it' entered the running state.",
      schemaVersion: "1",
      timestamp: "2026-04-23T00:00:00.000Z",
      backendKind: "docker",
      category: "runtime",
      desiredState: "running",
      graphId: "graph-alpha",
      graphRevisionId: "graph-alpha-20260423-000000",
      nodeId: "worker-it",
      observedState: "running",
      previousObservedState: "starting",
      statusMessage: "Runtime is healthy.",
      type: "runtime.observed_state.changed"
    });

    expect(result.type).toBe("runtime.observed_state.changed");
    expect(result.category).toBe("runtime");
  });

  it("accepts a typed runtime restart-requested event", () => {
    const result = hostEventRecordSchema.parse({
      category: "runtime",
      eventId: "runtime-worker-it-restart-001",
      graphId: "graph-alpha",
      graphRevisionId: "graph-alpha-20260423-000000",
      message: "Runtime 'worker-it' restart was requested with generation '1'.",
      nodeId: "worker-it",
      previousRestartGeneration: 0,
      restartGeneration: 1,
      schemaVersion: "1",
      timestamp: "2026-04-23T00:00:00.000Z",
      type: "runtime.restart.requested"
    });

    expect(result.type).toBe("runtime.restart.requested");
    expect(result.restartGeneration).toBe(1);
  });

  it("accepts a typed runtime recovery-policy-updated event", () => {
    const result = hostEventRecordSchema.parse({
      category: "runtime",
      eventId: "runtime-worker-it-recovery-policy-001",
      graphId: "graph-alpha",
      graphRevisionId: "graph-alpha-20260423-000000",
      message: "Runtime 'worker-it' recovery policy is now 'restart_on_failure'.",
      nodeId: "worker-it",
      policy: {
        cooldownSeconds: 30,
        maxAttempts: 3,
        mode: "restart_on_failure"
      },
      previousPolicy: {
        mode: "manual"
      },
      schemaVersion: "1",
      timestamp: "2026-04-23T00:00:00.000Z",
      type: "runtime.recovery_policy.updated"
    });

    expect(result.type).toBe("runtime.recovery_policy.updated");
    expect(result).toMatchObject({
      policy: {
        mode: "restart_on_failure"
      }
    });
  });

  it("accepts typed runtime recovery-recorded and controller-updated events", () => {
    const recordedEvent = hostEventRecordSchema.parse({
      category: "runtime",
      desiredState: "running",
      eventId: "runtime-worker-it-recovery-recorded-001",
      graphId: "graph-alpha",
      graphRevisionId: "graph-alpha-20260423-000000",
      lastError: "Injected runtime failure.",
      message: "Runtime 'worker-it' recorded a recovery snapshot in observed state 'failed'.",
      nodeId: "worker-it",
      observedState: "failed",
      recordedAt: "2026-04-23T00:01:00.000Z",
      recoveryId: "worker-it-20260423t000100-abcdef123456",
      restartGeneration: 1,
      schemaVersion: "1",
      timestamp: "2026-04-23T00:01:00.000Z",
      type: "runtime.recovery.recorded"
    });
    const controllerEvent = hostEventRecordSchema.parse({
      category: "runtime",
      controller: {
        activeFailureFingerprint: "fp-worker-it",
        attemptsUsed: 1,
        graphId: "graph-alpha",
        graphRevisionId: "graph-alpha-20260423-000000",
        lastAttemptedAt: "2026-04-23T00:02:00.000Z",
        lastFailureAt: "2026-04-23T00:02:00.000Z",
        nodeId: "worker-it",
        schemaVersion: "1",
        state: "cooldown",
        updatedAt: "2026-04-23T00:02:00.000Z"
      },
      eventId: "runtime-worker-it-recovery-controller-001",
      graphId: "graph-alpha",
      graphRevisionId: "graph-alpha-20260423-000000",
      message: "Runtime 'worker-it' recovery controller is now 'cooldown'.",
      nodeId: "worker-it",
      previousAttemptsUsed: 0,
      previousState: "manual_required",
      schemaVersion: "1",
      timestamp: "2026-04-23T00:02:00.000Z",
      type: "runtime.recovery_controller.updated"
    });

    expect(recordedEvent.type).toBe("runtime.recovery.recorded");
    expect(recordedEvent.observedState).toBe("failed");
    if (controllerEvent.type !== "runtime.recovery_controller.updated") {
      throw new Error("Expected runtime.recovery_controller.updated event");
    }

    expect(controllerEvent.controller.state).toBe("cooldown");
  });

  it("accepts typed session and runner-turn activity events", () => {
    const sessionEvent = hostEventRecordSchema.parse({
      category: "session",
      eventId: "session-worker-it-001",
      graphId: "graph-alpha",
      message: "Session 'session-alpha' on node 'worker-it' is now 'active'.",
      nodeId: "worker-it",
      ownerNodeId: "worker-it",
      schemaVersion: "1",
      sessionId: "session-alpha",
      status: "active",
      timestamp: "2026-04-24T00:00:00.000Z",
      traceId: "trace-alpha",
      type: "session.updated",
      updatedAt: "2026-04-24T00:00:00.000Z"
    });
    const runnerTurnEvent = hostEventRecordSchema.parse({
      category: "runner",
      consumedArtifactIds: ["artifact-inbound-001"],
      conversationId: "conv-alpha",
      eventId: "turn-worker-it-001",
      graphId: "graph-alpha",
      message: "Runner turn 'turn-alpha' on node 'worker-it' is now in phase 'persisting'.",
      nodeId: "worker-it",
      phase: "persisting",
      producedArtifactIds: ["artifact-report-001"],
      schemaVersion: "1",
      sessionId: "session-alpha",
      startedAt: "2026-04-24T00:00:00.000Z",
      timestamp: "2026-04-24T00:00:01.000Z",
      triggerKind: "message",
      turnId: "turn-alpha",
      type: "runner.turn.updated",
      updatedAt: "2026-04-24T00:00:01.000Z"
    });

    expect(sessionEvent.type).toBe("session.updated");
    expect(sessionEvent.category).toBe("session");
    expect(runnerTurnEvent.type).toBe("runner.turn.updated");
    expect(runnerTurnEvent.category).toBe("runner");
  });

  it("accepts typed conversation, approval, and artifact trace events", () => {
    const conversationEvent = hostEventRecordSchema.parse({
      artifactIds: ["report-turn-001"],
      category: "session",
      conversationId: "conv-alpha",
      eventId: "conversation-worker-it-001",
      followupCount: 1,
      graphId: "graph-alpha",
      initiator: "remote",
      lastMessageType: "task.request",
      message: "Conversation 'conv-alpha' on node 'worker-it' is now 'working'.",
      nodeId: "worker-it",
      peerNodeId: "supervisor-it",
      schemaVersion: "1",
      sessionId: "session-alpha",
      status: "working",
      timestamp: "2026-04-24T00:00:02.000Z",
      type: "conversation.trace.event",
      updatedAt: "2026-04-24T00:00:02.000Z"
    });
    const approvalEvent = hostEventRecordSchema.parse({
      approvalId: "approval-alpha",
      approverNodeIds: ["supervisor-it"],
      category: "session",
      conversationId: "conv-alpha",
      eventId: "approval-worker-it-001",
      graphId: "graph-alpha",
      message: "Approval 'approval-alpha' on node 'worker-it' is now 'pending'.",
      nodeId: "worker-it",
      requestedAt: "2026-04-24T00:00:03.000Z",
      requestedByNodeId: "worker-it",
      schemaVersion: "1",
      sessionId: "session-alpha",
      status: "pending",
      timestamp: "2026-04-24T00:00:03.000Z",
      type: "approval.trace.event",
      updatedAt: "2026-04-24T00:00:03.000Z"
    });
    const artifactEvent = hostEventRecordSchema.parse({
      artifactId: "report-turn-001",
      artifactKind: "report_file",
      backend: "git",
      category: "session",
      conversationId: "conv-alpha",
      eventId: "artifact-worker-it-001",
      graphId: "graph-alpha",
      lifecycleState: "published",
      message:
        "Artifact 'report-turn-001' on node 'worker-it' changed trace state.",
      nodeId: "worker-it",
      publicationState: "published",
      schemaVersion: "1",
      sessionId: "session-alpha",
      timestamp: "2026-04-24T00:00:04.000Z",
      turnId: "turn-alpha",
      type: "artifact.trace.event",
      updatedAt: "2026-04-24T00:00:04.000Z"
    });

    expect(conversationEvent.type).toBe("conversation.trace.event");
    expect(approvalEvent.type).toBe("approval.trace.event");
    expect(artifactEvent.type).toBe("artifact.trace.event");
  });

  it("accepts a typed node-binding mutation event", () => {
    const result = hostEventRecordSchema.parse({
      activeRevisionId: "graph-alpha-20260423-000001",
      category: "control_plane",
      eventId: "evt-node-binding-001",
      graphId: "graph-alpha",
      message: "Created managed node 'reviewer-it' in graph 'graph-alpha'.",
      mutationKind: "created",
      nodeId: "reviewer-it",
      schemaVersion: "1",
      timestamp: "2026-04-23T00:00:00.000Z",
      type: "node.binding.updated"
    });

    expect(result.type).toBe("node.binding.updated");
    expect(result.mutationKind).toBe("created");
  });

  it("accepts a typed edge mutation event", () => {
    const result = hostEventRecordSchema.parse({
      activeRevisionId: "graph-alpha-20260423-000001",
      category: "control_plane",
      edgeId: "user-to-reviewer",
      eventId: "evt-edge-001",
      graphId: "graph-alpha",
      message: "Created edge 'user-to-reviewer' in graph 'graph-alpha'.",
      mutationKind: "created",
      schemaVersion: "1",
      timestamp: "2026-04-23T00:00:00.000Z",
      type: "edge.updated"
    });

    expect(result.type).toBe("edge.updated");
    expect(result.mutationKind).toBe("created");
  });
});

describe("runtime recovery contracts", () => {
  it("accepts a runtime recovery inspection response", () => {
    const result = runtimeRecoveryInspectionResponseSchema.parse({
      controller: {
        activeFailureFingerprint: "fp-worker-it",
        attemptsUsed: 1,
        graphId: "team-alpha",
        graphRevisionId: "team-alpha-20260424-000001",
        lastAttemptedAt: "2026-04-24T10:06:00.000Z",
        lastFailureAt: "2026-04-24T10:06:00.000Z",
        nodeId: "worker-it",
        schemaVersion: "1",
        state: "cooldown",
        updatedAt: "2026-04-24T10:06:00.000Z"
      },
      currentRuntime: {
        backendKind: "docker",
        contextAvailable: true,
        contextPath: "/tmp/runtime/worker-it/effective-runtime-context.json",
        desiredState: "running",
        graphId: "team-alpha",
        graphRevisionId: "team-alpha-20260424-000001",
        nodeId: "worker-it",
        observedState: "running",
        restartGeneration: 0
      },
      entries: [
        {
          recordedAt: "2026-04-24T10:05:00.000Z",
          recoveryId: "worker-it-20260424t100500-running",
          runtime: {
            backendKind: "docker",
            contextAvailable: true,
            contextPath: "/tmp/runtime/worker-it/effective-runtime-context.json",
            desiredState: "running",
            graphId: "team-alpha",
            graphRevisionId: "team-alpha-20260424-000001",
            nodeId: "worker-it",
            observedState: "running",
            restartGeneration: 0
          }
        }
      ],
      nodeId: "worker-it",
      policy: {
        nodeId: "worker-it",
        policy: {
          cooldownSeconds: 30,
          maxAttempts: 3,
          mode: "restart_on_failure"
        },
        schemaVersion: "1",
        updatedAt: "2026-04-24T10:05:30.000Z"
      }
    });

    expect(result.nodeId).toBe("worker-it");
    expect(result.entries).toHaveLength(1);
    expect(result.controller.state).toBe("cooldown");
    expect(result.policy.policy.mode).toBe("restart_on_failure");
  });
});

describe("reconciliation contracts", () => {
  it("classifies missing context as a degraded reconciliation finding", () => {
    expect(
      classifyRuntimeReconciliation({
        contextAvailable: false,
        desiredState: "running",
        observedState: "stopped"
      })
    ).toEqual({
      findingCodes: ["context_unavailable", "runtime_stopped"],
      state: "degraded"
    });
  });

  it("accepts legacy reconciliation snapshots and derives richer counts", () => {
    const result = reconciliationSnapshotSchema.parse({
      backendKind: "memory",
      failedRuntimeCount: 0,
      graphId: "graph-alpha",
      graphRevisionId: "graph-alpha-rev-001",
      lastReconciledAt: "2026-04-24T00:00:00.000Z",
      managedRuntimeCount: 1,
      nodes: [
        {
          desiredState: "running",
          nodeId: "worker-it",
          observedState: "missing",
          statusMessage: "Runtime is missing."
        }
      ],
      runningRuntimeCount: 0,
      schemaVersion: "1",
      stoppedRuntimeCount: 1
    });

    expect(result.degradedRuntimeCount).toBe(1);
    expect(result.blockedRuntimeCount).toBe(0);
    expect(result.issueCount).toBe(1);
    expect(result.transitioningRuntimeCount).toBe(0);
    expect(result.findingCodes).toEqual(["runtime_missing"]);
    expect(result.nodes[0]?.reconciliation).toEqual({
      findingCodes: ["runtime_missing"],
      state: "degraded"
    });
  });

  it("accepts host status summaries with richer reconciliation counts", () => {
    const result = hostStatusResponseSchema.parse({
      graphRevisionId: "graph-alpha-rev-001",
      reconciliation: {
        backendKind: "docker",
        blockedRuntimeCount: 1,
        degradedRuntimeCount: 1,
        failedRuntimeCount: 0,
        findingCodes: ["context_unavailable"],
        issueCount: 1,
        lastReconciledAt: "2026-04-24T00:00:00.000Z",
        managedRuntimeCount: 2,
        runningRuntimeCount: 1,
        stoppedRuntimeCount: 1,
        transitioningRuntimeCount: 0
      },
      runtimeCounts: {
        desired: 2,
        observed: 1,
        running: 1
      },
      service: "entangle-host",
      status: "degraded",
      timestamp: "2026-04-24T00:00:00.000Z"
    });

    expect(result.reconciliation.blockedRuntimeCount).toBe(1);
    expect(result.reconciliation.findingCodes).toEqual(["context_unavailable"]);
  });
});

describe("graph revision contracts", () => {
  it("accepts edge create requests with canonical defaults", () => {
    const result = edgeCreateRequestSchema.parse({
      edgeId: "user-to-worker",
      fromNodeId: "user-main",
      toNodeId: "worker-it",
      relation: "delegates_to"
    });

    expect(result.enabled).toBe(true);
    expect(result.transportPolicy.channel).toBe("default");
  });

  it("accepts graph revision inspection responses", () => {
    const result = graphRevisionInspectionResponseSchema.parse({
      graph: {
        graphId: "team-alpha",
        name: "Team Alpha",
        schemaVersion: "1",
        nodes: [
          {
            bindings: {},
            displayName: "User",
            nodeId: "user-main",
            nodeKind: "user",
            runtime: {
              enabled: false
            }
          }
        ],
        edges: []
      },
      revision: {
        appliedAt: "2026-04-23T00:00:00.000Z",
        graphId: "team-alpha",
        isActive: true,
        revisionId: "team-alpha-20260423-000000"
      }
    });

    expect(result.revision.isActive).toBe(true);
    expect(result.graph.graphId).toBe("team-alpha");
  });
});

describe("node inspection contracts", () => {
  it("rejects user nodes from managed-node create requests", () => {
    expect(() =>
      nodeCreateRequestSchema.parse({
        displayName: "User",
        nodeId: "user-main",
        nodeKind: "user"
      })
    ).toThrow();
  });

  it("accepts a typed node inspection response", () => {
    const result = nodeInspectionResponseSchema.parse({
      binding: {
        bindingId: "team-alpha-worker-it",
        externalPrincipals: [],
        graphId: "team-alpha",
        graphRevisionId: "team-alpha-20260423-000000",
        node: {
          autonomy: {
            canInitiateSessions: true,
            canMutateGraph: false
          },
          displayName: "Worker IT",
          nodeId: "worker-it",
          nodeKind: "worker",
          packageSourceRef: "worker-it-source",
          resourceBindings: {
            externalPrincipalRefs: [],
            gitServiceRefs: ["local-gitea"],
            modelEndpointProfileRef: "shared-anthropic",
            primaryGitServiceRef: "local-gitea",
            primaryRelayProfileRef: "local-relay",
            relayProfileRefs: ["local-relay"]
          }
        },
        packageSource: {
          absolutePath: "/tmp/packages/worker-it",
          admittedAt: "2026-04-23T00:00:00.000Z",
          manifestPath: "/tmp/packages/worker-it/manifest.json",
          materialization: {
            contentDigest:
              "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            materializationKind: "immutable_store",
            packageRoot: "/tmp/store/worker-it/package",
            synchronizedAt: "2026-04-23T00:00:00.000Z"
          },
          packageSourceId: "worker-it-source",
          packageStoreKey: "sha256-abc123",
          sourceKind: "local_path"
        },
        resolvedResourceBindings: {
          externalPrincipalRefs: [],
          gitServiceRefs: ["local-gitea"],
          modelEndpointProfileRef: "shared-anthropic",
          primaryGitServiceRef: "local-gitea",
          primaryRelayProfileRef: "local-relay",
          relayProfileRefs: ["local-relay"]
        },
        runtimeProfile: "hackathon_local",
        schemaVersion: "1"
      },
      runtime: {
        backendKind: "docker",
        contextAvailable: true,
        contextPath: "/tmp/runtime/worker-it/effective-runtime-context.json",
        desiredState: "running",
        graphId: "team-alpha",
        graphRevisionId: "team-alpha-20260423-000000",
        nodeId: "worker-it",
        observedState: "running",
        packageSourceId: "worker-it-source",
        reason: "running",
        restartGeneration: 0,
        runtimeHandle: "container://worker-it",
        statusMessage: "Runtime is healthy."
      }
    });

    expect(result.binding.node.nodeId).toBe("worker-it");
    expect(result.runtime.nodeId).toBe("worker-it");
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
