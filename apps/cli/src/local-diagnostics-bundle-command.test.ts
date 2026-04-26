import { describe, expect, it } from "vitest";
import {
  buildLocalDiagnosticsBundle,
  redactLocalDiagnosticsText,
  type LocalDiagnosticsBundleDeps
} from "./local-diagnostics-bundle-command.js";

function createDeps(): LocalDiagnosticsBundleDeps {
  return {
    commandRunner: (command, args) => ({
      status: 0,
      stdout:
        args.includes("logs")
          ? "service ready\nAuthorization: Bearer abc.def\ntoken=plain-secret\n"
          : `${command} ${args.join(" ")} ok\n`,
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
            runtimeProfile: "local",
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
            runtimeProfile: "local",
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
          timestamp: "2026-04-26T00:00:00.000Z"
        });
      },
      listExternalPrincipals() {
        return Promise.resolve({
          principals: []
        });
      },
      listHostEvents() {
        return Promise.resolve({
          events: []
        });
      },
      listRuntimes() {
        return Promise.resolve({
          runtimes: []
        });
      }
    },
    now: () => new Date("2026-04-26T00:00:00.000Z"),
    readFile: () =>
      JSON.stringify({
        createdAt: "2026-04-26T00:00:00.000Z",
        layoutVersion: 1,
        product: "entangle-local",
        schemaVersion: "1",
        updatedAt: "2026-04-26T00:00:00.000Z"
      })
  };
}

describe("local diagnostics bundle helpers", () => {
  it("redacts common secret shapes in diagnostic text", () => {
    const redacted = redactLocalDiagnosticsText(
      'Authorization: Bearer abc.def\n"token": "secret-value"\npassword=hunter2'
    );

    expect(redacted).toContain("<redacted>");
    expect(redacted).not.toContain("abc.def");
    expect(redacted).not.toContain("hunter2");
    expect(redacted).not.toContain("secret-value");
  });

  it("builds a redacted read-only Local diagnostics bundle", async () => {
    const bundle = await buildLocalDiagnosticsBundle(
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
        logTail: 10
      },
      schemaVersion: "1"
    });
    expect(bundle.commands).toHaveLength(3);
    expect(JSON.stringify(bundle)).toContain("<redacted>");
    expect(JSON.stringify(bundle)).not.toContain("plain-secret");
  });
});
