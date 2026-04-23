import { describe, expect, it } from "vitest";
import { createHostClient } from "./index.js";

function createMockResponse(options: {
  body: string;
  ok: boolean;
  status: number;
}) {
  return {
    json() {
      return Promise.resolve(JSON.parse(options.body) as unknown);
    },
    ok: options.ok,
    status: options.status,
    text() {
      return Promise.resolve(options.body);
    }
  };
}

function createMockWebSocket() {
  const listeners = new Map<string, Array<(event: unknown) => void>>();

  return {
    socket: {
      addEventListener(type: string, listener: (event: unknown) => void) {
        const current = listeners.get(type) ?? [];
        current.push(listener);
        listeners.set(type, current);
      },
      close() {}
    },
    dispatch(type: string, event: unknown) {
      for (const listener of listeners.get(type) ?? []) {
        listener(event);
      }
    }
  };
}

describe("createHostClient", () => {
  it("parses host event list responses from the host surface", async () => {
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: () =>
        Promise.resolve(
          createMockResponse({
            body: JSON.stringify({
              events: [
                {
                  eventId: "evt-graph-apply-001",
                  message: "Applied graph 'team-alpha' as revision 'team-alpha-20260423-000000'.",
                  schemaVersion: "1",
                  timestamp: "2026-04-23T00:00:00.000Z",
                  activeRevisionId: "team-alpha-20260423-000000",
                  category: "control_plane",
                  graphId: "team-alpha",
                  type: "graph.revision.applied"
                }
              ]
            }),
            ok: true,
            status: 200
          })
        )
    });

    await expect(client.listHostEvents(20)).resolves.toMatchObject({
      events: [
        {
          type: "graph.revision.applied",
          graphId: "team-alpha"
        }
      ]
    });
  });

  it("surfaces plain-text upstream failures without masking them behind JSON parsing", async () => {
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: () =>
        Promise.resolve(
          createMockResponse({
            body: "upstream proxy failure",
            ok: false,
            status: 502
          })
        )
    });

    await expect(client.getHostStatus()).rejects.toThrow(
      "Host request failed with 502: upstream proxy failure"
    );
  });

  it("still parses accepted non-2xx domain responses when the caller expects them", async () => {
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: () =>
        Promise.resolve(
          createMockResponse({
            body: JSON.stringify({
              validation: {
                findings: [],
                ok: false
              }
            }),
            ok: false,
            status: 400
          })
        )
    });

    await expect(client.applyGraph({})).resolves.toEqual({
      validation: {
        findings: [],
        ok: false
      }
    });
  });

  it("parses graph revision list and inspection responses from the host surface", async () => {
    const responses = [
      createMockResponse({
        body: JSON.stringify({
          revisions: [
            {
              appliedAt: "2026-04-23T00:00:00.000Z",
              graphId: "team-alpha",
              isActive: true,
              revisionId: "team-alpha-20260423-000000"
            }
          ]
        }),
        ok: true,
        status: 200
      }),
      createMockResponse({
        body: JSON.stringify({
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
        }),
        ok: true,
        status: 200
      })
    ];
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: () => Promise.resolve(responses.shift()!)
    });

    await expect(client.listGraphRevisions()).resolves.toMatchObject({
      revisions: [
        {
          revisionId: "team-alpha-20260423-000000",
          isActive: true
        }
      ]
    });

    await expect(
      client.getGraphRevision("team-alpha-20260423-000000")
    ).resolves.toMatchObject({
      revision: {
        graphId: "team-alpha"
      }
    });
  });

  it("formats structured host conflict errors for runtime context requests", async () => {
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: () =>
        Promise.resolve(
          createMockResponse({
            body: JSON.stringify({
              code: "conflict",
              message: "Runtime 'worker-it' has no effective model endpoint."
            }),
            ok: false,
            status: 409
          })
        )
    });

    await expect(client.getRuntimeContext("worker-it")).rejects.toThrow(
      "Host request failed with 409 [conflict]: Runtime 'worker-it' has no effective model endpoint."
    );
  });

  it("parses external principal inspection responses from the host surface", async () => {
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: () =>
        Promise.resolve(
          createMockResponse({
            body: JSON.stringify({
              principal: {
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
              },
              validation: {
                ok: true,
                findings: []
              }
            }),
            ok: true,
            status: 200
          })
        )
    });

    await expect(client.getExternalPrincipal("worker-it-git")).resolves.toMatchObject({
      principal: {
        principalId: "worker-it-git",
        gitServiceRef: "local-gitea"
      }
    });
  });

  it("parses runtime artifact lists from the host surface", async () => {
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: () =>
        Promise.resolve(
          createMockResponse({
            body: JSON.stringify({
              artifacts: [
                {
                  createdAt: "2026-04-22T00:00:00.000Z",
                  materialization: {
                    localPath:
                      "/tmp/entangle-runner/workspace/reports/session-alpha/turn-001.md",
                    repoPath: "/tmp/entangle-runner/workspace"
                  },
                  ref: {
                    artifactId: "report-turn-001",
                    artifactKind: "report_file",
                    backend: "git",
                    contentSummary: "Turn report",
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
                }
              ]
            }),
            ok: true,
            status: 200
          })
        )
    });

    await expect(client.listRuntimeArtifacts("worker-it")).resolves.toMatchObject({
      artifacts: [
        {
          ref: {
            artifactId: "report-turn-001",
            backend: "git"
          }
        }
      ]
    });
  });

  it("parses typed host events from the websocket event stream surface", () => {
    const mockWebSocket = createMockWebSocket();
    const receivedEvents: Array<{ type: string; nodeId?: string }> = [];
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: () =>
        Promise.resolve(
          createMockResponse({
            body: JSON.stringify({ events: [] }),
            ok: true,
            status: 200
          })
        ),
      webSocketFactory: () => mockWebSocket.socket
    });

    client.subscribeToEvents({
      onEvent(event) {
        receivedEvents.push({
          type: event.type,
          ...("nodeId" in event ? { nodeId: event.nodeId } : {})
        });
      },
      replay: 5
    });

    mockWebSocket.dispatch("message", {
      data: JSON.stringify({
        eventId: "evt-runtime-observed-001",
        message: "Runtime 'worker-it' observed state is now 'running'.",
        schemaVersion: "1",
        timestamp: "2026-04-23T00:00:00.000Z",
        backendKind: "docker",
        category: "runtime",
        desiredState: "running",
        graphId: "team-alpha",
        graphRevisionId: "team-alpha-20260423-000000",
        nodeId: "worker-it",
        observedState: "running",
        previousObservedState: "starting",
        type: "runtime.observed_state.changed"
      })
    });

    expect(receivedEvents).toEqual([
      {
        nodeId: "worker-it",
        type: "runtime.observed_state.changed"
      }
    ]);
  });
});
