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
                runtimeProfile: "hackathon_local",
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
              runtimeProfile: "hackathon_local",
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
              runtimeProfile: "hackathon_local",
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
              graphId: "team-alpha",
              nodeIds: ["worker-it"],
              nodeStatuses: [
                {
                  nodeId: "worker-it",
                  status: "active"
                }
              ],
              sessionId: "session-alpha",
              traceIds: ["trace-alpha"],
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
          graphId: "team-alpha",
          nodeIds: ["worker-it"],
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
