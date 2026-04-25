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
  it("adds the configured host auth token to HTTP requests", async () => {
    const requests: Array<{ headers?: Record<string, string>; url: string }> = [];
    const client = createHostClient({
      authToken: "host-secret",
      baseUrl: "http://entangle-host.test",
      fetchImpl: (url, init) => {
        requests.push({
          headers: init?.headers,
          url
        });

        return Promise.resolve(
          createMockResponse({
            body: JSON.stringify({
              service: "entangle-host",
              status: "healthy",
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
              timestamp: "2026-04-24T00:00:00.000Z"
            }),
            ok: true,
            status: 200
          })
        );
      }
    });

    await expect(client.getHostStatus()).resolves.toMatchObject({
      service: "entangle-host"
    });
    expect(requests).toEqual([
      {
        headers: {
          authorization: "Bearer host-secret"
        },
        url: "http://entangle-host.test/v1/host/status"
      }
    ]);
  });

  it("preserves JSON headers while adding the configured host auth token", async () => {
    const requests: Array<{ headers?: Record<string, string> }> = [];
    const client = createHostClient({
      authToken: "host-secret",
      baseUrl: "http://entangle-host.test",
      fetchImpl: (_url, init) => {
        requests.push({
          headers: init?.headers
        });

        return Promise.resolve(
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
        );
      }
    });

    await expect(client.applyGraph({})).resolves.toEqual({
      validation: {
        findings: [],
        ok: false
      }
    });
    expect(requests[0]?.headers).toEqual({
      "content-type": "application/json",
      authorization: "Bearer host-secret"
    });
  });

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

  it("deletes package sources through the host package-source surface", async () => {
    const requests: Array<{ method?: string; url: string }> = [];
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: (url, init) => {
        requests.push({
          method: init?.method,
          url
        });

        return Promise.resolve(
          createMockResponse({
            body: JSON.stringify({
              deletedPackageSourceId: "worker-it-source"
            }),
            ok: true,
            status: 200
          })
        );
      }
    });

    await expect(
      client.deletePackageSource("worker-it-source")
    ).resolves.toEqual({
      deletedPackageSourceId: "worker-it-source"
    });
    expect(requests).toEqual([
      {
        method: "DELETE",
        url: "http://entangle-host.test/v1/package-sources/worker-it-source"
      }
    ]);
  });

  it("deletes external principals through the host external-principal surface", async () => {
    const requests: Array<{ method?: string; url: string }> = [];
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: (url, init) => {
        requests.push({
          method: init?.method,
          url
        });

        return Promise.resolve(
          createMockResponse({
            body: JSON.stringify({
              deletedPrincipalId: "worker-it-git"
            }),
            ok: true,
            status: 200
          })
        );
      }
    });

    await expect(
      client.deleteExternalPrincipal("worker-it-git")
    ).resolves.toEqual({
      deletedPrincipalId: "worker-it-git"
    });
    expect(requests).toEqual([
      {
        method: "DELETE",
        url: "http://entangle-host.test/v1/external-principals/worker-it-git"
      }
    ]);
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

  it("parses applied node inspection responses from the host surface", async () => {
    const responses = [
      createMockResponse({
        body: JSON.stringify({
          nodes: [
            {
              binding: {
                bindingId: "team-alpha-worker-it",
                externalPrincipals: [],
                graphId: "team-alpha",
                graphRevisionId: "team-alpha-20260423-000000",
                node: {
                  displayName: "Worker IT",
                  nodeId: "worker-it",
                  nodeKind: "worker"
                },
                resolvedResourceBindings: {
                  externalPrincipalRefs: [],
                  gitServiceRefs: ["local-gitea"],
                  relayProfileRefs: ["local-relay"]
                },
                runtimeProfile: "local",
                schemaVersion: "1"
              },
              runtime: {
                backendKind: "docker",
                contextAvailable: true,
                contextPath:
                  "/tmp/runtime/worker-it/effective-runtime-context.json",
                desiredState: "running",
                graphId: "team-alpha",
                graphRevisionId: "team-alpha-20260423-000000",
                nodeId: "worker-it",
                observedState: "running"
              }
            }
          ]
        }),
        ok: true,
        status: 200
      }),
      createMockResponse({
        body: JSON.stringify({
          binding: {
            bindingId: "team-alpha-worker-it",
            externalPrincipals: [],
            graphId: "team-alpha",
            graphRevisionId: "team-alpha-20260423-000000",
            node: {
              displayName: "Worker IT",
              nodeId: "worker-it",
              nodeKind: "worker"
            },
            resolvedResourceBindings: {
              externalPrincipalRefs: [],
              gitServiceRefs: ["local-gitea"],
              relayProfileRefs: ["local-relay"]
            },
            runtimeProfile: "local",
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
            observedState: "running"
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

    await expect(client.listNodes()).resolves.toMatchObject({
      nodes: [
        {
          binding: {
            node: {
              nodeId: "worker-it"
            }
          }
        }
      ]
    });

    await expect(client.getNode("worker-it")).resolves.toMatchObject({
      binding: {
        graphId: "team-alpha"
      },
      runtime: {
        observedState: "running"
      }
    });
  });

  it("parses managed node mutation responses from the host surface", async () => {
    const responses = [
      createMockResponse({
        body: JSON.stringify({
          activeRevisionId: "team-alpha-20260423-000001",
          node: {
            binding: {
              bindingId: "team-alpha-reviewer-it",
              externalPrincipals: [],
              graphId: "team-alpha",
              graphRevisionId: "team-alpha-20260423-000001",
              node: {
                displayName: "Reviewer IT",
                nodeId: "reviewer-it",
                nodeKind: "reviewer"
              },
              resolvedResourceBindings: {
                externalPrincipalRefs: [],
                gitServiceRefs: ["local-gitea"],
                relayProfileRefs: ["local-relay"]
              },
              runtimeProfile: "local",
              schemaVersion: "1"
            },
            runtime: {
              backendKind: "docker",
              contextAvailable: true,
              contextPath: "/tmp/runtime/reviewer-it/effective-runtime-context.json",
              desiredState: "running",
              graphId: "team-alpha",
              graphRevisionId: "team-alpha-20260423-000001",
              nodeId: "reviewer-it",
              observedState: "running"
            }
          },
          validation: {
            ok: true,
            findings: []
          }
        }),
        ok: true,
        status: 200
      }),
      createMockResponse({
        body: JSON.stringify({
          activeRevisionId: "team-alpha-20260423-000002",
          node: {
            binding: {
              bindingId: "team-alpha-reviewer-it",
              externalPrincipals: [],
              graphId: "team-alpha",
              graphRevisionId: "team-alpha-20260423-000002",
              node: {
                displayName: "Reviewer IT Updated",
                nodeId: "reviewer-it",
                nodeKind: "reviewer"
              },
              resolvedResourceBindings: {
                externalPrincipalRefs: [],
                gitServiceRefs: ["local-gitea"],
                relayProfileRefs: ["local-relay"]
              },
              runtimeProfile: "local",
              schemaVersion: "1"
            },
            runtime: {
              backendKind: "docker",
              contextAvailable: true,
              contextPath: "/tmp/runtime/reviewer-it/effective-runtime-context.json",
              desiredState: "running",
              graphId: "team-alpha",
              graphRevisionId: "team-alpha-20260423-000002",
              nodeId: "reviewer-it",
              observedState: "running"
            }
          },
          validation: {
            ok: true,
            findings: []
          }
        }),
        ok: true,
        status: 200
      }),
      createMockResponse({
        body: JSON.stringify({
          activeRevisionId: "team-alpha-20260423-000003",
          deletedNodeId: "reviewer-it",
          validation: {
            ok: true,
            findings: []
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

    await expect(
      client.createNode({
        displayName: "Reviewer IT",
        nodeId: "reviewer-it",
        nodeKind: "reviewer"
      })
    ).resolves.toMatchObject({
      node: {
        binding: {
          node: {
            nodeId: "reviewer-it"
          }
        }
      }
    });

    await expect(
      client.replaceNode("reviewer-it", {
        displayName: "Reviewer IT Updated",
        nodeKind: "reviewer"
      })
    ).resolves.toMatchObject({
      node: {
        binding: {
          node: {
            displayName: "Reviewer IT Updated"
          }
        }
      }
    });

    await expect(client.deleteNode("reviewer-it")).resolves.toMatchObject({
      deletedNodeId: "reviewer-it",
      validation: {
        ok: true
      }
    });
  });

  it("parses runtime restart responses from the host surface", async () => {
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: () =>
        Promise.resolve(
          createMockResponse({
            body: JSON.stringify({
              backendKind: "docker",
              contextAvailable: true,
              contextPath: "/tmp/runtime/worker-it/effective-runtime-context.json",
              desiredState: "running",
              graphId: "team-alpha",
              graphRevisionId: "team-alpha-20260423-000000",
              nodeId: "worker-it",
              observedState: "running",
              restartGeneration: 1
            }),
            ok: true,
            status: 200
          })
        )
    });

    await expect(client.restartRuntime("worker-it")).resolves.toMatchObject({
      nodeId: "worker-it",
      desiredState: "running",
      restartGeneration: 1
    });
  });

  it("parses runtime recovery inspection responses from the host surface", async () => {
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: () =>
        Promise.resolve(
          createMockResponse({
            body: JSON.stringify({
              controller: {
                attemptsUsed: 0,
                graphId: "team-alpha",
                graphRevisionId: "team-alpha-20260424-000001",
                nodeId: "worker-it",
                schemaVersion: "1",
                state: "idle",
                updatedAt: "2026-04-24T10:05:00.000Z"
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
                    contextPath:
                      "/tmp/runtime/worker-it/effective-runtime-context.json",
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
                  mode: "manual"
                },
                schemaVersion: "1",
                updatedAt: "2026-04-24T10:04:00.000Z"
              }
            }),
            ok: true,
            status: 200
          })
        )
    });

    await expect(client.getRuntimeRecovery("worker-it", 20)).resolves.toMatchObject({
      controller: {
        state: "idle"
      },
      nodeId: "worker-it",
      policy: {
        policy: {
          mode: "manual"
        }
      },
      entries: [
        {
          runtime: {
            observedState: "running"
          }
        }
      ]
    });
  });

  it("parses session list and inspection responses from the host surface", async () => {
    const responses = [
      createMockResponse({
        body: JSON.stringify({
          sessions: [
            {
              activeConversationIds: ["conv-alpha"],
              graphId: "team-alpha",
              latestMessageType: "task.request",
              nodeIds: ["worker-it"],
              nodeStatuses: [
                {
                  nodeId: "worker-it",
                  status: "active"
                }
              ],
              rootArtifactIds: ["artifact-alpha"],
              sessionId: "session-alpha",
              traceIds: ["trace-alpha"],
              waitingApprovalIds: ["approval-alpha"],
              updatedAt: "2026-04-24T10:05:00.000Z"
            }
          ]
        }),
        ok: true,
        status: 200
      }),
      createMockResponse({
        body: JSON.stringify({
          graphId: "team-alpha",
          nodes: [
            {
              nodeId: "worker-it",
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
              },
              session: {
                activeConversationIds: [],
                graphId: "team-alpha",
                intent: "Review the latest patch set.",
                openedAt: "2026-04-24T10:00:00.000Z",
                ownerNodeId: "worker-it",
                rootArtifactIds: [],
                sessionId: "session-alpha",
                status: "active",
                traceId: "trace-alpha",
                updatedAt: "2026-04-24T10:05:00.000Z",
                waitingApprovalIds: []
              }
            }
          ],
          sessionId: "session-alpha"
        }),
        ok: true,
        status: 200
      })
    ];
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: () => Promise.resolve(responses.shift()!)
    });

    await expect(client.listSessions()).resolves.toMatchObject({
      sessions: [
        {
          activeConversationIds: ["conv-alpha"],
          graphId: "team-alpha",
          latestMessageType: "task.request",
          nodeIds: ["worker-it"],
          rootArtifactIds: ["artifact-alpha"],
          waitingApprovalIds: ["approval-alpha"],
          sessionId: "session-alpha"
        }
      ]
    });

    await expect(client.getSession("session-alpha")).resolves.toMatchObject({
      graphId: "team-alpha",
      nodes: [
        {
          nodeId: "worker-it",
          runtime: {
            nodeId: "worker-it",
            observedState: "running"
          },
          session: {
            sessionId: "session-alpha",
            status: "active"
          }
        }
      ]
    });
  });

  it("posts session launch requests to the host surface", async () => {
    const requests: { body?: string; method?: string; url: string }[] = [];
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: (url, init) => {
        requests.push({
          body: init?.body,
          method: init?.method,
          url
        });

        return Promise.resolve(
          createMockResponse({
            body: JSON.stringify({
              conversationId: "conversation-alpha",
              eventId:
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              fromNodeId: "user-main",
              publishedRelays: ["ws://localhost:7777"],
              relayUrls: ["ws://localhost:7777"],
              sessionId: "session-alpha",
              targetNodeId: "worker-it",
              turnId: "turn-alpha"
            }),
            ok: true,
            status: 200
          })
        );
      }
    });

    await expect(
      client.launchSession({
        summary: "Prepare a local report.",
        targetNodeId: "worker-it"
      })
    ).resolves.toMatchObject({
      eventId: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      sessionId: "session-alpha",
      targetNodeId: "worker-it"
    });
    expect(requests).toEqual([
      {
        body: JSON.stringify({
          artifactRefs: [],
          summary: "Prepare a local report.",
          targetNodeId: "worker-it"
        }),
        method: "POST",
        url: "http://entangle-host.test/v1/sessions/launch"
      }
    ]);
  });

  it("formats structured host conflict errors for managed node creation", async () => {
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: () =>
        Promise.resolve(
          createMockResponse({
            body: JSON.stringify({
              code: "conflict",
              message:
                "Managed node 'reviewer-it' already exists in the active graph."
            }),
            ok: false,
            status: 409
          })
        )
    });

    await expect(
      client.createNode({
        displayName: "Reviewer IT",
        nodeId: "reviewer-it",
        nodeKind: "reviewer"
      })
    ).rejects.toThrow(
      "Host request failed with 409 [conflict]: Managed node 'reviewer-it' already exists in the active graph."
    );
  });

  it("parses edge list and mutation responses from the host surface", async () => {
    const responses = [
      createMockResponse({
        body: JSON.stringify({
          edges: [
            {
              edgeId: "user-to-worker",
              fromNodeId: "user-main",
              relation: "delegates_to",
              toNodeId: "worker-it"
            }
          ]
        }),
        ok: true,
        status: 200
      }),
      createMockResponse({
        body: JSON.stringify({
          activeRevisionId: "team-alpha-20260423-000001",
          edge: {
            edgeId: "user-to-reviewer",
            fromNodeId: "user-main",
            relation: "consults",
            toNodeId: "reviewer-it"
          },
          validation: {
            ok: true,
            findings: []
          }
        }),
        ok: true,
        status: 200
      }),
      createMockResponse({
        body: JSON.stringify({
          activeRevisionId: "team-alpha-20260423-000002",
          edge: {
            edgeId: "user-to-reviewer",
            enabled: false,
            fromNodeId: "user-main",
            relation: "reviews",
            toNodeId: "reviewer-it",
            transportPolicy: {
              channel: "review",
              mode: "bidirectional_shared_set",
              relayProfileRefs: []
            }
          },
          validation: {
            ok: true,
            findings: []
          }
        }),
        ok: true,
        status: 200
      }),
      createMockResponse({
        body: JSON.stringify({
          activeRevisionId: "team-alpha-20260423-000003",
          deletedEdgeId: "user-to-reviewer",
          validation: {
            ok: true,
            findings: []
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

    await expect(client.listEdges()).resolves.toMatchObject({
      edges: [
        {
          edgeId: "user-to-worker",
          relation: "delegates_to"
        }
      ]
    });

    await expect(
      client.createEdge({
        edgeId: "user-to-reviewer",
        fromNodeId: "user-main",
        relation: "consults",
        toNodeId: "reviewer-it"
      })
    ).resolves.toMatchObject({
      edge: {
        edgeId: "user-to-reviewer",
        relation: "consults"
      }
    });

    await expect(
      client.replaceEdge("user-to-reviewer", {
        enabled: false,
        fromNodeId: "user-main",
        relation: "reviews",
        toNodeId: "reviewer-it",
        transportPolicy: {
          channel: "review",
          mode: "bidirectional_shared_set",
          relayProfileRefs: []
        }
      })
    ).resolves.toMatchObject({
      edge: {
        enabled: false,
        relation: "reviews"
      }
    });

    await expect(client.deleteEdge("user-to-reviewer")).resolves.toMatchObject({
      deletedEdgeId: "user-to-reviewer",
      validation: {
        ok: true
      }
    });
  });

  it("formats structured host conflict errors for edge creation", async () => {
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: () =>
        Promise.resolve(
          createMockResponse({
            body: JSON.stringify({
              code: "conflict",
              message: "Edge 'user-to-reviewer' already exists in the active graph."
            }),
            ok: false,
            status: 409
          })
        )
    });

    await expect(
      client.createEdge({
        edgeId: "user-to-reviewer",
        fromNodeId: "user-main",
        relation: "consults",
        toNodeId: "reviewer-it"
      })
    ).rejects.toThrow(
      "Host request failed with 409 [conflict]: Edge 'user-to-reviewer' already exists in the active graph."
    );
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

  it("parses single runtime artifact inspection responses from the host surface", async () => {
    const requests: string[] = [];
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: (url) => {
        requests.push(url);

        return Promise.resolve(
          createMockResponse({
            body: JSON.stringify({
              artifact: {
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
            }),
            ok: true,
            status: 200
          })
        );
      }
    });

    await expect(
      client.getRuntimeArtifact("worker-it", "report-turn-001")
    ).resolves.toMatchObject({
      artifact: {
        ref: {
          artifactId: "report-turn-001",
          backend: "git"
        }
      }
    });
    expect(requests).toEqual([
      "http://entangle-host.test/v1/runtimes/worker-it/artifacts/report-turn-001"
    ]);
  });

  it("parses runtime artifact preview responses from the host surface", async () => {
    const requests: string[] = [];
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: (url) => {
        requests.push(url);

        return Promise.resolve(
          createMockResponse({
            body: JSON.stringify({
              artifact: {
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
                  locator: {
                    branch: "worker-it/session-alpha/review-patch",
                    commit: "abc123",
                    path: "reports/session-alpha/turn-001.md"
                  },
                  preferred: true,
                  status: "materialized"
                },
                updatedAt: "2026-04-22T00:00:00.000Z"
              },
              preview: {
                available: true,
                bytesRead: 31,
                content: "# Turn Report\n\nPrepared report.",
                contentEncoding: "utf8",
                contentType: "text/markdown",
                sourcePath:
                  "/tmp/entangle-runner/workspace/reports/session-alpha/turn-001.md",
                truncated: false
              }
            }),
            ok: true,
            status: 200
          })
        );
      }
    });

    await expect(
      client.getRuntimeArtifactPreview("worker-it", "report-turn-001")
    ).resolves.toMatchObject({
      artifact: {
        ref: {
          artifactId: "report-turn-001"
        }
      },
      preview: {
        available: true,
        contentType: "text/markdown"
      }
    });
    expect(requests).toEqual([
      "http://entangle-host.test/v1/runtimes/worker-it/artifacts/report-turn-001/preview"
    ]);
  });

  it("parses runtime artifact history responses from the host surface", async () => {
    const requests: string[] = [];
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: (url) => {
        requests.push(url);

        return Promise.resolve(
          createMockResponse({
            body: JSON.stringify({
              artifact: {
                createdAt: "2026-04-22T00:00:00.000Z",
                materialization: {
                  repoPath: "/tmp/entangle-runner/workspace"
                },
                ref: {
                  artifactId: "report-turn-001",
                  artifactKind: "report_file",
                  backend: "git",
                  locator: {
                    branch: "worker-it/session-alpha/review-patch",
                    commit: "abc123",
                    path: "reports/session-alpha/turn-001.md"
                  },
                  preferred: true,
                  status: "materialized"
                },
                updatedAt: "2026-04-22T00:00:00.000Z"
              },
              history: {
                available: true,
                commits: [
                  {
                    abbreviatedCommit: "abc123",
                    authorEmail: "worker@example.test",
                    authorName: "worker-it",
                    commit: "abc123",
                    committedAt: "2026-04-22T00:00:00.000Z",
                    subject: "Materialize runtime artifact"
                  }
                ],
                inspectedPath: "reports/session-alpha/turn-001.md",
                truncated: false
              }
            }),
            ok: true,
            status: 200
          })
        );
      }
    });

    await expect(
      client.getRuntimeArtifactHistory("worker-it", "report-turn-001", {
        limit: 5
      })
    ).resolves.toMatchObject({
      history: {
        available: true,
        commits: [
          {
            abbreviatedCommit: "abc123"
          }
        ]
      }
    });
    expect(requests).toEqual([
      "http://entangle-host.test/v1/runtimes/worker-it/artifacts/report-turn-001/history?limit=5"
    ]);
  });

  it("parses runtime artifact diff responses from the host surface", async () => {
    const requests: string[] = [];
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: (url) => {
        requests.push(url);

        return Promise.resolve(
          createMockResponse({
            body: JSON.stringify({
              artifact: {
                createdAt: "2026-04-22T00:00:00.000Z",
                materialization: {
                  repoPath: "/tmp/entangle-runner/workspace"
                },
                ref: {
                  artifactId: "report-turn-001",
                  artifactKind: "report_file",
                  backend: "git",
                  locator: {
                    branch: "worker-it/session-alpha/review-patch",
                    commit: "abc123",
                    path: "reports/session-alpha/turn-001.md"
                  },
                  preferred: true,
                  status: "materialized"
                },
                updatedAt: "2026-04-22T00:00:00.000Z"
              },
              diff: {
                available: true,
                bytesRead: 43,
                content: "diff --git a/report.md b/report.md\n",
                contentEncoding: "utf8",
                contentType: "text/x-diff",
                fromCommit: "base123",
                toCommit: "abc123",
                truncated: false
              }
            }),
            ok: true,
            status: 200
          })
        );
      }
    });

    await expect(
      client.getRuntimeArtifactDiff("worker-it", "report-turn-001", {
        fromCommit: "base123"
      })
    ).resolves.toMatchObject({
      diff: {
        available: true,
        fromCommit: "base123",
        toCommit: "abc123"
      }
    });
    expect(requests).toEqual([
      "http://entangle-host.test/v1/runtimes/worker-it/artifacts/report-turn-001/diff?fromCommit=base123"
    ]);
  });

  it("parses runtime memory list and page responses from the host surface", async () => {
    const requests: string[] = [];
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: (url) => {
        requests.push(url);

        if (url.endsWith("/memory")) {
          return Promise.resolve(
            createMockResponse({
              body: JSON.stringify({
                focusedRegisters: [
                  {
                    kind: "summary",
                    path: "wiki/summaries/working-context.md",
                    sizeBytes: 128,
                    updatedAt: "2026-04-25T12:00:00.000Z"
                  }
                ],
                memoryRoot: "/tmp/entangle-runner/memory",
                nodeId: "worker-it",
                pages: [
                  {
                    kind: "summary",
                    path: "wiki/summaries/working-context.md",
                    sizeBytes: 128,
                    updatedAt: "2026-04-25T12:00:00.000Z"
                  }
                ],
                taskPages: []
              }),
              ok: true,
              status: 200
            })
          );
        }

        return Promise.resolve(
          createMockResponse({
            body: JSON.stringify({
              nodeId: "worker-it",
              page: {
                kind: "summary",
                path: "wiki/summaries/working-context.md",
                sizeBytes: 128,
                updatedAt: "2026-04-25T12:00:00.000Z"
              },
              preview: {
                available: true,
                bytesRead: 42,
                content: "# Working Context Summary\n",
                contentEncoding: "utf8",
                contentType: "text/markdown",
                sourcePath:
                  "/tmp/entangle-runner/memory/wiki/summaries/working-context.md",
                truncated: false
              }
            }),
            ok: true,
            status: 200
          })
        );
      }
    });

    await expect(client.getRuntimeMemory("worker-it")).resolves.toMatchObject({
      focusedRegisters: [
        {
          kind: "summary",
          path: "wiki/summaries/working-context.md"
        }
      ],
      nodeId: "worker-it"
    });
    await expect(
      client.getRuntimeMemoryPage(
        "worker-it",
        "wiki/summaries/working-context.md"
      )
    ).resolves.toMatchObject({
      nodeId: "worker-it",
      page: {
        path: "wiki/summaries/working-context.md"
      },
      preview: {
        available: true,
        contentType: "text/markdown"
      }
    });
    expect(requests).toEqual([
      "http://entangle-host.test/v1/runtimes/worker-it/memory",
      "http://entangle-host.test/v1/runtimes/worker-it/memory/page?path=wiki%2Fsummaries%2Fworking-context.md"
    ]);
  });

  it("parses runtime approval list and inspection responses from the host surface", async () => {
    const requests: string[] = [];
    const approval = {
      approvalId: "approval-alpha",
      approverNodeIds: ["supervisor-it"],
      conversationId: "conv-alpha",
      graphId: "team-alpha",
      reason: "Supervisor approval is required before final publication.",
      requestedAt: "2026-04-24T00:00:00.000Z",
      requestedByNodeId: "worker-it",
      sessionId: "session-alpha",
      status: "pending",
      updatedAt: "2026-04-24T00:01:00.000Z"
    };
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: (url) => {
        requests.push(url);

        return Promise.resolve(
          createMockResponse({
            body: JSON.stringify(
              url.endsWith("/approval-alpha")
                ? { approval }
                : { approvals: [approval] }
            ),
            ok: true,
            status: 200
          })
        );
      }
    });

    await expect(client.listRuntimeApprovals("worker-it")).resolves.toMatchObject({
      approvals: [
        {
          approvalId: "approval-alpha",
          status: "pending"
        }
      ]
    });
    await expect(
      client.getRuntimeApproval("worker-it", "approval-alpha")
    ).resolves.toMatchObject({
      approval: {
        approvalId: "approval-alpha",
        status: "pending"
      }
    });
    expect(requests).toEqual([
      "http://entangle-host.test/v1/runtimes/worker-it/approvals",
      "http://entangle-host.test/v1/runtimes/worker-it/approvals/approval-alpha"
    ]);
  });

  it("parses runtime turn list and inspection responses from the host surface", async () => {
    const requests: string[] = [];
    const turn = {
      consumedArtifactIds: [],
      graphId: "team-alpha",
      nodeId: "worker-it",
      phase: "emitting",
      producedArtifactIds: [],
      startedAt: "2026-04-24T00:00:00.000Z",
      triggerKind: "message",
      turnId: "turn-alpha",
      updatedAt: "2026-04-24T00:01:00.000Z"
    };
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: (url) => {
        requests.push(url);

        return Promise.resolve(
          createMockResponse({
            body: JSON.stringify(
              url.endsWith("/turn-alpha") ? { turn } : { turns: [turn] }
            ),
            ok: true,
            status: 200
          })
        );
      }
    });

    await expect(client.listRuntimeTurns("worker-it")).resolves.toMatchObject({
      turns: [
        {
          turnId: "turn-alpha"
        }
      ]
    });
    await expect(
      client.getRuntimeTurn("worker-it", "turn-alpha")
    ).resolves.toMatchObject({
      turn: {
        turnId: "turn-alpha"
      }
    });
    expect(requests).toEqual([
      "http://entangle-host.test/v1/runtimes/worker-it/turns",
      "http://entangle-host.test/v1/runtimes/worker-it/turns/turn-alpha"
    ]);
  });

  it("parses source change candidate list and inspection responses from the host surface", async () => {
    const requests: string[] = [];
    const candidate = {
      candidateId: "source-change-turn-alpha",
      createdAt: "2026-04-24T00:01:00.000Z",
      graphId: "team-alpha",
      nodeId: "worker-it",
      sourceChangeSummary: {
        additions: 2,
        checkedAt: "2026-04-24T00:01:00.000Z",
        deletions: 1,
        fileCount: 1,
        files: [
          {
            additions: 2,
            deletions: 1,
            path: "src/index.ts",
            status: "modified"
          }
        ],
        status: "changed",
        truncated: false
      },
      status: "pending_review",
      turnId: "turn-alpha",
      updatedAt: "2026-04-24T00:01:00.000Z"
    };
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: (url) => {
        requests.push(url);

        return Promise.resolve(
          createMockResponse({
            body: JSON.stringify(
              url.endsWith("/source-change-turn-alpha")
                ? { candidate }
                : { candidates: [candidate] }
            ),
            ok: true,
            status: 200
          })
        );
      }
    });

    await expect(
      client.listRuntimeSourceChangeCandidates("worker-it")
    ).resolves.toMatchObject({
      candidates: [
        {
          candidateId: "source-change-turn-alpha",
          status: "pending_review"
        }
      ]
    });
    await expect(
      client.getRuntimeSourceChangeCandidate(
        "worker-it",
        "source-change-turn-alpha"
      )
    ).resolves.toMatchObject({
      candidate: {
        candidateId: "source-change-turn-alpha",
        status: "pending_review"
      }
    });
    expect(requests).toEqual([
      "http://entangle-host.test/v1/runtimes/worker-it/source-change-candidates",
      "http://entangle-host.test/v1/runtimes/worker-it/source-change-candidates/source-change-turn-alpha"
    ]);
  });

  it("parses source change candidate diff responses from the host surface", async () => {
    const requests: string[] = [];
    const candidate = {
      candidateId: "source-change-turn-alpha",
      createdAt: "2026-04-24T00:01:00.000Z",
      graphId: "team-alpha",
      nodeId: "worker-it",
      sourceChangeSummary: {
        additions: 1,
        checkedAt: "2026-04-24T00:01:00.000Z",
        deletions: 0,
        fileCount: 1,
        files: [],
        status: "changed",
        truncated: false
      },
      status: "pending_review",
      turnId: "turn-alpha",
      updatedAt: "2026-04-24T00:01:00.000Z"
    };
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: (url) => {
        requests.push(url);

        return Promise.resolve(
          createMockResponse({
            body: JSON.stringify({
              candidate,
              diff: {
                available: true,
                bytesRead: 64,
                content: "diff --git a/src/index.ts b/src/index.ts\n",
                contentEncoding: "utf8",
                contentType: "text/x-diff",
                truncated: false
              }
            }),
            ok: true,
            status: 200
          })
        );
      }
    });

    await expect(
      client.getRuntimeSourceChangeCandidateDiff(
        "worker-it",
        "source-change-turn-alpha"
      )
    ).resolves.toMatchObject({
      candidate: {
        candidateId: "source-change-turn-alpha"
      },
      diff: {
        available: true,
        contentType: "text/x-diff"
      }
    });
    expect(requests).toEqual([
      "http://entangle-host.test/v1/runtimes/worker-it/source-change-candidates/source-change-turn-alpha/diff"
    ]);
  });

  it("parses source change candidate file preview responses from the host surface", async () => {
    const requests: string[] = [];
    const candidate = {
      candidateId: "source-change-turn-alpha",
      createdAt: "2026-04-24T00:01:00.000Z",
      graphId: "team-alpha",
      nodeId: "worker-it",
      sourceChangeSummary: {
        additions: 1,
        checkedAt: "2026-04-24T00:01:00.000Z",
        deletions: 0,
        fileCount: 1,
        files: [
          {
            additions: 1,
            deletions: 0,
            path: "src/index.ts",
            status: "modified"
          }
        ],
        status: "changed",
        truncated: false
      },
      status: "pending_review",
      turnId: "turn-alpha",
      updatedAt: "2026-04-24T00:01:00.000Z"
    };
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: (url) => {
        requests.push(url);

        return Promise.resolve(
          createMockResponse({
            body: JSON.stringify({
              candidate,
              path: "src/index.ts",
              preview: {
                available: true,
                bytesRead: 27,
                content: "export const value = true;\n",
                contentEncoding: "utf8",
                contentType: "text/plain",
                truncated: false
              }
            }),
            ok: true,
            status: 200
          })
        );
      }
    });

    await expect(
      client.getRuntimeSourceChangeCandidateFilePreview(
        "worker-it",
        "source-change-turn-alpha",
        "src/index.ts"
      )
    ).resolves.toMatchObject({
      path: "src/index.ts",
      preview: {
        available: true,
        contentType: "text/plain"
      }
    });
    expect(requests).toEqual([
      "http://entangle-host.test/v1/runtimes/worker-it/source-change-candidates/source-change-turn-alpha/file?path=src%2Findex.ts"
    ]);
  });

  it("reviews source change candidates through the host surface", async () => {
    const requests: Array<{ body?: string; method?: string; url: string }> = [];
    const reviewedCandidate = {
      candidateId: "source-change-turn-alpha",
      createdAt: "2026-04-24T00:01:00.000Z",
      graphId: "team-alpha",
      nodeId: "worker-it",
      review: {
        decidedAt: "2026-04-24T00:02:00.000Z",
        decidedBy: "operator-alpha",
        decision: "accepted",
        reason: "Reviewed by the operator."
      },
      sourceChangeSummary: {
        additions: 1,
        checkedAt: "2026-04-24T00:01:00.000Z",
        deletions: 0,
        fileCount: 1,
        files: [],
        status: "changed",
        truncated: false
      },
      status: "accepted",
      turnId: "turn-alpha",
      updatedAt: "2026-04-24T00:02:00.000Z"
    };
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: (url, init) => {
        requests.push({
          body: init?.body,
          method: init?.method,
          url
        });

        return Promise.resolve(
          createMockResponse({
            body: JSON.stringify({
              candidate: reviewedCandidate
            }),
            ok: true,
            status: 200
          })
        );
      }
    });

    await expect(
      client.reviewRuntimeSourceChangeCandidate(
        "worker-it",
        "source-change-turn-alpha",
        {
          reason: "Reviewed by the operator.",
          reviewedBy: "operator-alpha",
          status: "accepted"
        }
      )
    ).resolves.toMatchObject({
      candidate: {
        review: {
          decision: "accepted"
        },
        status: "accepted"
      }
    });
    expect(requests).toEqual([
      {
        body: JSON.stringify({
          reason: "Reviewed by the operator.",
          reviewedBy: "operator-alpha",
          status: "accepted"
        }),
        method: "PATCH",
        url: "http://entangle-host.test/v1/runtimes/worker-it/source-change-candidates/source-change-turn-alpha/review"
      }
    ]);
  });

  it("applies source change candidates and inspects source history through the host surface", async () => {
    const requests: Array<{ body?: string; method?: string; url: string }> = [];
    const sourceHistoryEntry = {
      appliedAt: "2026-04-24T00:03:00.000Z",
      appliedBy: "operator-alpha",
      baseTree: "base-tree-alpha",
      branch: "entangle-source-history",
      candidateId: "source-change-turn-alpha",
      commit: "commit-alpha",
      graphId: "team-alpha",
      graphRevisionId: "team-alpha-20260424-000000",
      headTree: "head-tree-alpha",
      mode: "already_in_workspace",
      nodeId: "worker-it",
      reason: "Promote accepted source.",
      sourceChangeSummary: {
        additions: 1,
        checkedAt: "2026-04-24T00:01:00.000Z",
        deletions: 0,
        fileCount: 1,
        files: [],
        status: "changed",
        truncated: false
      },
      sourceHistoryId: "source-history-source-change-turn-alpha",
      turnId: "turn-alpha",
      updatedAt: "2026-04-24T00:03:00.000Z"
    };
    const publishedSourceHistoryEntry = {
      ...sourceHistoryEntry,
      publication: {
        artifactId: "source-source-history-source-change-turn-alpha",
        branch: "worker-it/source-history/source-history-source-change-turn-alpha",
        publication: {
          publishedAt: "2026-04-24T00:04:00.000Z",
          remoteName: "entangle-local-gitea",
          remoteUrl: "ssh://git@gitea.local:22/team-alpha/graph-alpha.git",
          state: "published"
        },
        requestedAt: "2026-04-24T00:04:00.000Z",
        requestedBy: "operator-alpha",
        targetGitServiceRef: "local-gitea",
        targetNamespace: "team-alpha",
        targetRepositoryName: "graph-alpha"
      },
      updatedAt: "2026-04-24T00:04:00.000Z"
    };
    const sourceArtifact = {
      createdAt: "2026-04-24T00:04:00.000Z",
      materialization: {
        repoPath: "/tmp/entangle/workspace/source-history"
      },
      publication: {
        publishedAt: "2026-04-24T00:04:00.000Z",
        remoteName: "entangle-local-gitea",
        remoteUrl: "ssh://git@gitea.local:22/team-alpha/graph-alpha.git",
        state: "published"
      },
      ref: {
        artifactId: "source-source-history-source-change-turn-alpha",
        artifactKind: "commit",
        backend: "git",
        createdByNodeId: "worker-it",
        locator: {
          branch: "worker-it/source-history/source-history-source-change-turn-alpha",
          commit: "artifact-commit-alpha",
          gitServiceRef: "local-gitea",
          namespace: "team-alpha",
          path: ".",
          repositoryName: "graph-alpha"
        },
        preferred: true,
        status: "published"
      },
      turnId: "turn-alpha",
      updatedAt: "2026-04-24T00:04:00.000Z"
    };
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: (url, init) => {
        requests.push({
          body: init?.body,
          method: init?.method,
          url
        });

        const body = url.endsWith("/source-history")
          ? { history: [sourceHistoryEntry] }
          : url.endsWith("/publish")
            ? { artifact: sourceArtifact, entry: publishedSourceHistoryEntry }
            : { entry: sourceHistoryEntry };

        return Promise.resolve(
          createMockResponse({
            body: JSON.stringify(body),
            ok: true,
            status: 200
          })
        );
      }
    });

    await expect(
      client.applyRuntimeSourceChangeCandidate(
        "worker-it",
        "source-change-turn-alpha",
        {
          appliedBy: "operator-alpha",
          reason: "Promote accepted source."
        }
      )
    ).resolves.toMatchObject({
      entry: {
        mode: "already_in_workspace",
        sourceHistoryId: "source-history-source-change-turn-alpha"
      }
    });
    await expect(client.listRuntimeSourceHistory("worker-it")).resolves.toMatchObject({
      history: [
        {
          sourceHistoryId: "source-history-source-change-turn-alpha"
        }
      ]
    });
    await expect(
      client.getRuntimeSourceHistory(
        "worker-it",
        "source-history-source-change-turn-alpha"
      )
    ).resolves.toMatchObject({
      entry: {
        commit: "commit-alpha"
      }
    });
    await expect(
      client.publishRuntimeSourceHistory(
        "worker-it",
        "source-history-source-change-turn-alpha",
        {
          publishedBy: "operator-alpha",
          reason: "Publish source history.",
          retry: true,
          targetGitServiceRef: "local-gitea",
          targetNamespace: "team-alpha",
          targetRepositoryName: "graph-alpha"
        }
      )
    ).resolves.toMatchObject({
      artifact: {
        ref: {
          artifactId: "source-source-history-source-change-turn-alpha"
        }
      },
      entry: {
        publication: {
          publication: {
            state: "published"
          }
        }
      }
    });
    expect(requests).toEqual([
      {
        body: JSON.stringify({
          appliedBy: "operator-alpha",
          reason: "Promote accepted source."
        }),
        method: "POST",
        url: "http://entangle-host.test/v1/runtimes/worker-it/source-change-candidates/source-change-turn-alpha/apply"
      },
      {
        method: undefined,
        url: "http://entangle-host.test/v1/runtimes/worker-it/source-history"
      },
      {
        method: undefined,
        url: "http://entangle-host.test/v1/runtimes/worker-it/source-history/source-history-source-change-turn-alpha"
      },
      {
        body: JSON.stringify({
          publishedBy: "operator-alpha",
          reason: "Publish source history.",
          retry: true,
          targetGitServiceRef: "local-gitea",
          targetNamespace: "team-alpha",
          targetRepositoryName: "graph-alpha"
        }),
        method: "POST",
        url: "http://entangle-host.test/v1/runtimes/worker-it/source-history/source-history-source-change-turn-alpha/publish"
      }
    ]);
  });

  it("parses runtime recovery policy mutation responses from the host surface", async () => {
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: () =>
        Promise.resolve(
          createMockResponse({
            body: JSON.stringify({
              controller: {
                attemptsUsed: 0,
                graphId: "team-alpha",
                graphRevisionId: "team-alpha-20260424-000001",
                nodeId: "worker-it",
                schemaVersion: "1",
                state: "idle",
                updatedAt: "2026-04-24T12:00:00.000Z"
              },
              currentRuntime: {
                backendKind: "memory",
                contextAvailable: true,
                desiredState: "running",
                graphId: "team-alpha",
                graphRevisionId: "team-alpha-20260424-000001",
                nodeId: "worker-it",
                observedState: "running",
                restartGeneration: 1
              },
              entries: [],
              nodeId: "worker-it",
              policy: {
                nodeId: "worker-it",
                policy: {
                  cooldownSeconds: 30,
                  maxAttempts: 2,
                  mode: "restart_on_failure"
                },
                schemaVersion: "1",
                updatedAt: "2026-04-24T12:00:00.000Z"
              }
            }),
            ok: true,
            status: 200
          })
        )
    });

    await expect(
      client.setRuntimeRecoveryPolicy("worker-it", {
        cooldownSeconds: 30,
        maxAttempts: 2,
        mode: "restart_on_failure"
      })
    ).resolves.toMatchObject({
      nodeId: "worker-it",
      policy: {
        policy: {
          mode: "restart_on_failure"
        }
      }
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
    mockWebSocket.dispatch("message", {
      data: JSON.stringify({
        category: "runtime",
        controller: {
          attemptsUsed: 1,
          graphId: "team-alpha",
          graphRevisionId: "team-alpha-20260423-000000",
          lastAttemptedAt: "2026-04-23T00:01:00.000Z",
          lastFailureAt: "2026-04-23T00:01:00.000Z",
          nodeId: "worker-it",
          schemaVersion: "1",
          state: "cooldown",
          updatedAt: "2026-04-23T00:01:00.000Z"
        },
        eventId: "evt-runtime-recovery-controller-001",
        graphId: "team-alpha",
        graphRevisionId: "team-alpha-20260423-000000",
        message: "Runtime 'worker-it' recovery controller is now 'cooldown'.",
        nodeId: "worker-it",
        previousAttemptsUsed: 0,
        previousState: "manual_required",
        schemaVersion: "1",
        timestamp: "2026-04-23T00:01:00.000Z",
        type: "runtime.recovery_controller.updated"
      })
    });

    expect(receivedEvents).toEqual([
      {
        nodeId: "worker-it",
        type: "runtime.observed_state.changed"
      },
      {
        nodeId: "worker-it",
        type: "runtime.recovery_controller.updated"
      }
    ]);
  });

  it("adds the configured host auth token to event stream websocket URLs", () => {
    const openedUrls: string[] = [];
    const mockWebSocket = createMockWebSocket();
    const client = createHostClient({
      authToken: "host-secret",
      baseUrl: "http://entangle-host.test",
      fetchImpl: () =>
        Promise.resolve(
          createMockResponse({
            body: JSON.stringify({ events: [] }),
            ok: true,
            status: 200
          })
        ),
      webSocketFactory: (url) => {
        openedUrls.push(url);
        return mockWebSocket.socket;
      }
    });

    client.subscribeToEvents({
      onEvent() {},
      replay: 3
    });

    expect(openedUrls).toEqual([
      "ws://entangle-host.test/v1/events?replay=3&access_token=host-secret"
    ]);
  });
});
