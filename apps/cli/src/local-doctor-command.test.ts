import { describe, expect, it } from "vitest";
import {
  buildLocalDoctorReport,
  formatLocalDoctorText,
  type LocalDoctorDeps
} from "./local-doctor-command.js";

function createPassingDeps(): LocalDoctorDeps {
  return {
    commandRunner: (command, args) => ({
      status: 0,
      stdout: (() => {
        if (command === "docker" && args[0] === "image") {
          return "runner-image-found\n";
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

        return `${command} ok\n`;
      })(),
      stderr: ""
    }),
    connectWebSocket: (url) => Promise.resolve(`${url} connected`),
    fetchUrl: (url) => Promise.resolve(`${url} 200 OK`),
    fileExists: () => true,
    hostClient: {
      getHostStatus() {
        return Promise.resolve({
          graphRevisionId: "graph-alpha-001",
          reconciliation: {
            backendKind: "memory",
            blockedRuntimeCount: 0,
            degradedRuntimeCount: 0,
            failedRuntimeCount: 0,
            findingCodes: [],
            issueCount: 0,
            managedRuntimeCount: 1,
            runningRuntimeCount: 1,
            stoppedRuntimeCount: 0,
            transitioningRuntimeCount: 0
          },
          runtimeCounts: {
            desired: 1,
            observed: 1,
            running: 1
          },
          service: "entangle-host",
          timestamp: "2026-04-25T00:00:00.000Z",
          status: "healthy"
        });
      },
      getRuntimeContext() {
        return Promise.resolve({
          agentRuntimeContext: {
            defaultAgent: "build",
            engineProfile: {
              executable: "opencode",
              displayName: "Local OpenCode",
              id: "local-opencode",
              kind: "opencode_server",
              stateScope: "node"
            },
            engineProfileRef: "local-opencode",
            mode: "coding_agent"
          },
          artifactContext: {
            backends: ["git"],
            gitPrincipalBindings: [],
            gitServices: []
          },
          binding: {
            bindingId: "binding-worker-it",
            externalPrincipals: [],
            graphId: "team-alpha",
            graphRevisionId: "team-alpha-revision",
            node: {
              agentRuntime: {},
              autonomy: {
                canInitiateSessions: false,
                canMutateGraph: false
              },
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
          generatedAt: "2026-04-25T00:00:00.000Z",
          identityContext: {
            algorithm: "nostr_secp256k1",
            publicKey: "a".repeat(64),
            secretDelivery: {
              filePath: "/repo/.entangle/secrets/worker-it.json",
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
      listExternalPrincipals() {
        return Promise.resolve({
          principals: []
        });
      },
      listRuntimes() {
        return Promise.resolve({
          runtimes: [
            {
              backendKind: "memory",
              contextAvailable: true,
              desiredState: "running",
              graphId: "team-alpha",
              graphRevisionId: "team-alpha-revision",
              nodeId: "worker-it",
              observedState: "running",
              reconciliation: {
                findingCodes: [],
                state: "aligned"
              },
              restartGeneration: 0,
              workspaceHealth: {
                checkedAt: "2026-04-25T00:00:00.000Z",
                layoutVersion: "entangle-local-workspace-v1",
                status: "ready",
                surfaces: []
              }
            }
          ]
        });
      }
    },
    now: () => new Date("2026-04-25T00:00:00.000Z")
  };
}

describe("local doctor command helpers", () => {
  it("builds a passing report when local profile and live checks pass", async () => {
    const report = await buildLocalDoctorReport(
      {
        repositoryRoot: "/repo"
      },
      createPassingDeps()
    );

    expect(report.status).toBe("pass");
    expect(report.summary.fail).toBe(0);
    expect(report.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "host",
          status: "pass",
          summary: "Host API"
        }),
        expect.objectContaining({
          category: "workspace",
          status: "pass",
          summary: "Runtime workspace health"
        }),
        expect.objectContaining({
          category: "workspace",
          detail: "1 wiki repositories clean",
          status: "pass",
          summary: "Runtime wiki repositories"
        }),
        expect.objectContaining({
          category: "engine",
          status: "pass",
          summary: "OpenCode"
        }),
        expect.objectContaining({
          category: "runner",
          status: "pass",
          summary: "Runner OpenCode"
        })
      ])
    );
  });

  it("treats optional local infrastructure as warning by default and failure in strict mode", async () => {
    const deps: LocalDoctorDeps = {
      ...createPassingDeps(),
      commandRunner: (command) => ({
        status: command === "docker" ? 1 : 0,
        stdout: command === "docker" ? "" : `${command} ok\n`,
        stderr: command === "docker" ? "docker unavailable\n" : ""
      })
    };

    const defaultReport = await buildLocalDoctorReport(
      {
        repositoryRoot: "/repo",
        skipLive: true
      },
      deps
    );
    const strictReport = await buildLocalDoctorReport(
      {
        repositoryRoot: "/repo",
        skipLive: true,
        strict: true
      },
      deps
    );

    expect(defaultReport.status).toBe("warn");
    expect(
      defaultReport.checks.find((check) => check.summary === "Docker CLI")?.status
    ).toBe("warn");
    expect(strictReport.status).toBe("fail");
    expect(
      strictReport.checks.find((check) => check.summary === "Docker CLI")?.status
    ).toBe("fail");
  });

  it("renders human-readable output with remediation lines", async () => {
    const report = await buildLocalDoctorReport(
      {
        repositoryRoot: "/repo",
        skipLive: true,
        strict: true
      },
      {
        ...createPassingDeps(),
        fileExists: (filePath) => !filePath.endsWith("pnpm-lock.yaml")
      }
    );

    expect(formatLocalDoctorText(report)).toContain("FAIL profile:pnpm-lock.yaml");
    expect(formatLocalDoctorText(report)).toContain("remediation:");
  });

  it("warns when a runtime wiki repository has uncommitted changes", async () => {
    const report = await buildLocalDoctorReport(
      {
        repositoryRoot: "/repo"
      },
      {
        ...createPassingDeps(),
        commandRunner: (command, args) => ({
          status: 0,
          stdout:
            command === "git" && args.includes("status")
              ? " M summaries/working-context.md\n"
              : command === "git" && args.includes("--abbrev-ref")
                ? "entangle-wiki\n"
                : command === "git" && args.includes("--verify")
                  ? "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n"
                  : `${command} ok\n`,
          stderr: ""
        })
      }
    );

    const wikiRepositoryCheck = report.checks.find(
      (check) => check.summary === "Runtime wiki repositories"
    );
    expect(wikiRepositoryCheck).toMatchObject({
      category: "workspace",
      status: "warn"
    });
    expect(wikiRepositoryCheck?.detail).toContain("dirty: worker-it");
  });
});
