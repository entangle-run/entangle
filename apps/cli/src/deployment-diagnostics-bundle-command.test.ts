import { describe, expect, it } from "vitest";
import {
  buildDeploymentDiagnosticsBundle,
  redactDeploymentDiagnosticsText,
  type DeploymentDiagnosticsBundleDeps
} from "./deployment-diagnostics-bundle-command.js";

function createDeps(): DeploymentDiagnosticsBundleDeps {
  return {
    commandRunner: (command, args) => ({
      status: 0,
      stdout: (() => {
        if (args.includes("logs")) {
          return "service ready\nAuthorization: Bearer abc.def\ntoken=plain-secret\n";
        }

        if (command === "git" && args.includes("status")) {
          return "";
        }

        if (command === "git" && args.includes("--abbrev-ref")) {
          return "entangle-wiki\n";
        }

        if (command === "git" && args.includes("--verify")) {
          return "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n";
        }

        return `${command} ${args.join(" ")} ok\n`;
      })(),
      stderr: ""
    }),
    connectWebSocket: (url) => Promise.resolve(`${url} connected`),
    fetchUrl: (url) => Promise.resolve(`${url} 200 OK`),
    fileExists: () => true,
    hostClient: {
      getRuntimeContext() {
        return Promise.resolve({
          agentRuntimeContext: {
            mode: "disabled"
          },
          artifactContext: {
            backends: [],
            gitPrincipalBindings: [],
            gitServices: []
          },
          binding: {
            bindingId: "binding-worker-it",
            externalPrincipals: [],
            graphId: "team-alpha",
            graphRevisionId: "team-alpha-revision",
            node: {
              displayName: "Worker",
              nodeId: "worker-it",
              nodeKind: "agent",
              resourceBindings: {
                externalPrincipalRefs: [],
                gitServiceRefs: [],
                relayProfileRefs: []
              }
            },
            resolvedResourceBindings: {
              externalPrincipalRefs: [],
              gitServiceRefs: [],
              relayProfileRefs: []
            },
            runtimeProfile: "federated",
            schemaVersion: "1"
          },
          generatedAt: "2026-04-26T00:00:00.000Z",
          identityContext: {
            algorithm: "nostr_secp256k1",
            publicKey: "a".repeat(64),
            secretDelivery: {
              filePath: "/repo/.entangle-secrets/runtime-identities/worker-it",
              mode: "mounted_file"
            }
          },
          modelContext: {},
          policyContext: {
            autonomy: {
              canInitiateSessions: false,
              canMutateGraph: false
            },
            notes: [],
            runtimeProfile: "federated",
            sourceMutation: {
              applyRequiresApproval: false,
              nonPrimaryPublishRequiresApproval: true,
              publishRequiresApproval: false
            }
          },
          relayContext: {
            edgeRoutes: [],
            relayProfiles: []
          },
          schemaVersion: "1",
          workspace: {
            artifactWorkspaceRoot: "/repo/.entangle/host/workspaces/worker-it/artifacts",
            engineStateRoot: "/repo/.entangle/host/workspaces/worker-it/engine-state",
            injectedRoot: "/repo/.entangle/host/workspaces/worker-it/injected",
            memoryRoot: "/repo/.entangle/host/workspaces/worker-it/memory",
            packageRoot: "/repo/.entangle/host/workspaces/worker-it/package",
            retrievalRoot: "/repo/.entangle/host/workspaces/worker-it/retrieval",
            root: "/repo/.entangle/host/workspaces/worker-it",
            runtimeRoot: "/repo/.entangle/host/workspaces/worker-it/runtime",
            sourceWorkspaceRoot: "/repo/.entangle/host/workspaces/worker-it/source",
            wikiRepositoryRoot:
              "/repo/.entangle/host/workspaces/worker-it/wiki-repository"
          }
        });
      },
      getHostStatus() {
        return Promise.resolve({
          reconciliation: {
            backendKind: "memory",
            blockedRuntimeCount: 0,
            degradedRuntimeCount: 0,
            failedRuntimeCount: 0,
            findingCodes: [],
            issueCount: 0,
            managedRuntimeCount: 0,
            runningRuntimeCount: 0,
            stoppedRuntimeCount: 0,
            transitioningRuntimeCount: 0
          },
          runtimeCounts: {
            desired: 0,
            observed: 0,
            running: 0
          },
          security: {
            operatorAuthMode: "none"
          },
          service: "entangle-host",
          stateLayout: {
            checkedAt: "2026-04-26T00:00:00.000Z",
            currentLayoutVersion: 1,
            minimumSupportedLayoutVersion: 1,
            recordedAt: "2026-04-26T00:00:00.000Z",
            recordedLayoutVersion: 1,
            status: "current"
          },
          status: "healthy",
          timestamp: "2026-04-26T00:00:00.000Z",
          transport: {
            controlObserve: {
              configuredRelayCount: 0,
              relayUrls: [],
              status: "disabled",
              updatedAt: "2026-04-26T00:00:00.000Z"
            }
          }
        });
      },
      listExternalPrincipals() {
        return Promise.resolve({
          principals: []
        });
      },
      listRuntimeApprovals() {
        return Promise.resolve({
          approvals: [
            {
              approvalId: "approval-alpha",
              approverNodeIds: [],
              graphId: "team-alpha",
              requestedAt: "2026-04-26T00:00:00.000Z",
              requestedByNodeId: "worker-it",
              sessionId: "session-alpha",
              status: "pending",
              updatedAt: "2026-04-26T00:00:00.000Z"
            }
          ]
        });
      },
      listRuntimeArtifacts() {
        return Promise.resolve({
          artifacts: []
        });
      },
      listRuntimeTurns() {
        return Promise.resolve({
          turns: [
            {
              consumedArtifactIds: [],
              emittedHandoffMessageIds: [],
              engineOutcome: {
                failure: {
                  classification: "policy_denied",
                  message: "Authorization: Bearer abc.def"
                },
                permissionObservations: [
                  {
                    decision: "denied",
                    operation: "source_application",
                    patterns: [],
                    permission: "edit"
                  }
                ],
                stopReason: "error",
                toolExecutions: []
              },
              graphId: "team-alpha",
              nodeId: "worker-it",
              phase: "errored",
              producedArtifactIds: ["artifact-alpha"],
              requestedApprovalIds: ["approval-alpha"],
              sessionId: "session-alpha",
              sourceChangeCandidateIds: [],
              startedAt: "2026-04-26T00:00:00.000Z",
              triggerKind: "message",
              turnId: "turn-alpha",
              updatedAt: "2026-04-26T00:00:01.000Z"
            }
          ]
        });
      },
      listHostEvents() {
        return Promise.resolve({
          events: []
        });
      },
      exportHostEventAuditBundle() {
        return Promise.resolve({
          bundleHash:
            "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
          bundleKind: "host_event_audit_bundle",
          eventCount: 0,
          events: [],
          eventsJsonlSha256:
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          generatedAt: "2026-04-26T00:00:00.000Z",
          schemaVersion: "1",
          signedIntegrityReport: {
            generatedAt: "2026-04-26T00:00:00.000Z",
            hostAuthorityPubkey: "a".repeat(64),
            integrity: {
              checkedEventCount: 0,
              genesisHash: "b".repeat(64),
              schemaVersion: "1",
              status: "valid",
              unverifiableEventCount: 0
            },
            reportHash: "c".repeat(64),
            reportKind: "host_event_integrity",
            schemaVersion: "1",
            signedContent: "{\"reportKind\":\"host_event_integrity\"}",
            signedEvent: {
              createdAt: "2026-04-26T00:00:00.000Z",
              createdAtUnix: 1777161600,
              eventId: "d".repeat(64),
              kind: 30078,
              signature: "e".repeat(128),
              signerPubkey: "a".repeat(64),
              tags: [["report", "host_event_integrity"]]
            }
          }
        });
      },
      listRuntimes() {
        return Promise.resolve({
          runtimes: [
            {
              agentRuntime: {
                lastTurnId: "turn-alpha",
                mode: "coding_agent"
              },
              backendKind: "memory",
              contextAvailable: true,
              desiredState: "running",
              graphId: "team-alpha",
              graphRevisionId: "team-alpha-revision",
              nodeId: "worker-it",
              observedState: "running",
              restartGeneration: 0
            }
          ]
        });
      }
    },
    now: () => new Date("2026-04-26T00:00:00.000Z"),
    readFile: () =>
      JSON.stringify({
        createdAt: "2026-04-26T00:00:00.000Z",
        layoutVersion: 1,
        product: "entangle",
        schemaVersion: "1",
        updatedAt: "2026-04-26T00:00:00.000Z"
      })
  };
}

describe("deployment diagnostics bundle helpers", () => {
  it("redacts common secret shapes in diagnostic text", () => {
    const redacted = redactDeploymentDiagnosticsText(
      'Authorization: Bearer abc.def\n"token": "secret-value"\npassword=hunter2'
    );

    expect(redacted).toContain("<redacted>");
    expect(redacted).not.toContain("abc.def");
    expect(redacted).not.toContain("hunter2");
    expect(redacted).not.toContain("secret-value");
  });

  it("builds a redacted read-only Deployment diagnostics bundle", async () => {
    const bundle = await buildDeploymentDiagnosticsBundle(
      {
        eventLimit: 3,
        logTail: 10,
        maxCommandOutputChars: 128,
        repositoryRoot: "/repo",
        skipLive: false
      },
      createDeps()
    );

    expect(bundle).toMatchObject({
      doctor: {
        status: "pass"
      },
      generatedAt: "2026-04-26T00:00:00.000Z",
      host: {
        errors: [],
        status: {
          status: "healthy"
        }
      },
      profile: {
        eventLimit: 3,
        includeAuditBundle: true,
        logTail: 10
      },
      schemaVersion: "1"
    });
    expect(bundle.commands).toHaveLength(3);
    expect(bundle.host?.runtimeEvidence).toMatchObject([
      {
        approvalCount: 1,
        artifactCount: 0,
        nodeId: "worker-it",
        pendingApprovalIds: ["approval-alpha"],
        turnCount: 1
      }
    ]);
    expect(bundle.host?.runtimeEvidence?.[0]?.latestTurns?.[0]).toMatchObject({
      engineFailureClassification: "policy_denied",
      engineFailureMessage: "Authorization: <redacted> <redacted>",
      enginePermissionDecisions: ["denied"],
      engineStopReason: "error",
      producedArtifactIds: ["artifact-alpha"],
      requestedApprovalIds: ["approval-alpha"],
      turnId: "turn-alpha"
    });
    expect(bundle.host?.auditBundle).toMatchObject({
      bundleKind: "host_event_audit_bundle",
      eventCount: 0,
      signedIntegrityReport: {
        reportKind: "host_event_integrity"
      }
    });
    expect(JSON.stringify(bundle)).toContain("<redacted>");
    expect(JSON.stringify(bundle)).not.toContain("plain-secret");
    expect(JSON.stringify(bundle)).not.toContain("abc.def");
  });

  it("skips Host event audit bundle collection when disabled", async () => {
    let called = false;
    const deps = createDeps();
    deps.hostClient = {
      ...deps.hostClient!,
      exportHostEventAuditBundle() {
        called = true;
        throw new Error("audit bundle should not be collected");
      }
    };

    const bundle = await buildDeploymentDiagnosticsBundle(
      {
        eventLimit: 3,
        includeAuditBundle: false,
        logTail: 10,
        maxCommandOutputChars: 128,
        repositoryRoot: "/repo",
        skipLive: false
      },
      deps
    );

    expect(called).toBe(false);
    expect(bundle.profile.includeAuditBundle).toBe(false);
    expect(bundle.host?.auditBundle).toBeUndefined();
    expect(
      bundle.host?.errors.some((error) => error.includes("event audit bundle"))
    ).toBe(false);
  });
});
