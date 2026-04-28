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
              stateLayout: {
                checkedAt: "2026-04-24T00:00:00.000Z",
                currentLayoutVersion: 1,
                minimumSupportedLayoutVersion: 1,
                recordedAt: "2026-04-24T00:00:00.000Z",
                recordedLayoutVersion: 1,
                status: "current"
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

  it("fetches the Host projection snapshot", async () => {
    const requests: string[] = [];
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: (url) => {
        requests.push(url);

        return Promise.resolve(
          createMockResponse({
            body: JSON.stringify({
              assignments: [],
              freshness: "current",
              generatedAt: "2026-04-26T12:00:00.000Z",
              hostAuthorityPubkey:
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              runners: [],
              schemaVersion: "1",
              userConversations: []
            }),
            ok: true,
            status: 200
          })
        );
      }
    });

    await expect(client.getProjection()).resolves.toMatchObject({
      freshness: "current",
      schemaVersion: "1"
    });
    expect(requests).toEqual(["http://entangle-host.test/v1/projection"]);
  });

  it("fetches User Node identity surfaces", async () => {
    const requests: string[] = [];
    const userNode = {
      createdAt: "2026-04-26T12:00:00.000Z",
      displayName: "Operator",
      graphId: "team-alpha",
      hostAuthorityPubkey:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      keyRef: "secret://user-nodes/team-alpha-user-main",
      nodeId: "user-main",
      publicKey:
        "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      schemaVersion: "1",
      status: "active",
      updatedAt: "2026-04-26T12:00:00.000Z"
    };
    const publishResponse = {
      conversationId: "conversation-alpha",
      eventId: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      fromNodeId: "user-main",
      fromPubkey: userNode.publicKey,
      messageType: "approval.response",
      publishedRelays: ["ws://localhost:7777"],
      relayUrls: ["ws://localhost:7777"],
      sessionId: "session-alpha",
      targetNodeId: "worker-it",
      toPubkey: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      turnId: "turn-alpha"
    };
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: (url, init) => {
        requests.push(url);
        let body: unknown;

        if (
          init?.method === "POST" &&
          url.endsWith("/v1/user-nodes/user-main/inbox/conversation-alpha/read")
        ) {
          body = {
            conversation: {
              conversationId: "conversation-alpha",
              graphId: "graph-alpha",
              lastReadAt: "2026-04-26T12:01:00.000Z",
              peerNodeId: "worker-it",
              projection: {
                source: "observation_event",
                updatedAt: "2026-04-26T12:01:00.000Z"
              },
              unreadCount: 0,
              userNodeId: "user-main"
            },
            read: {
              conversationId: "conversation-alpha",
              readAt: "2026-04-26T12:01:00.000Z",
              userNodeId: "user-main"
            }
          };
        } else if (init?.method === "POST") {
          body = publishResponse;
        } else if (url.endsWith("/v1/user-nodes")) {
          body = {
            generatedAt: "2026-04-26T12:00:00.000Z",
            userNodes: [userNode]
          };
        } else if (url.endsWith("/v1/user-nodes/user-main/inbox")) {
          body = {
            conversations: [
              {
                conversationId: "conversation-alpha",
                graphId: "graph-alpha",
                peerNodeId: "worker-it",
                projection: {
                  source: "observation_event",
                  updatedAt: "2026-04-26T12:00:00.000Z"
                },
                unreadCount: 0,
                userNodeId: "user-main"
              }
            ],
            generatedAt: "2026-04-26T12:00:00.000Z",
            userNodeId: "user-main"
          };
        } else if (
          url.endsWith("/v1/user-nodes/user-main/inbox/conversation-alpha")
        ) {
          body = {
            conversationId: "conversation-alpha",
            generatedAt: "2026-04-26T12:00:00.000Z",
            messages: [
              {
                conversationId: "conversation-alpha",
                createdAt: "2026-04-26T12:00:00.000Z",
                direction: "outbound",
                eventId: publishResponse.eventId,
                fromNodeId: "user-main",
                fromPubkey: userNode.publicKey,
                messageType: "approval.response",
                peerNodeId: "worker-it",
                publishedRelays: ["ws://localhost:7777"],
                relayUrls: ["ws://localhost:7777"],
                schemaVersion: "1",
                sessionId: "session-alpha",
                summary: "Approved.",
                toNodeId: "worker-it",
                toPubkey:
                  "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                turnId: "turn-alpha",
                userNodeId: "user-main"
              }
            ],
            userNodeId: "user-main"
          };
        } else {
          body = {
            gateways: [],
            userNode
          };
        }

        return Promise.resolve(
          createMockResponse({
            body: JSON.stringify(body),
            ok: true,
            status: 200
          })
        );
      }
    });

    await expect(client.listUserNodes()).resolves.toMatchObject({
      userNodes: [
        {
          nodeId: "user-main"
        }
      ]
    });
    await expect(client.getUserNode("user-main")).resolves.toMatchObject({
      userNode: {
        nodeId: "user-main"
      }
    });
    await expect(client.getUserNodeInbox("user-main")).resolves.toMatchObject({
      conversations: [
        {
          conversationId: "conversation-alpha",
          userNodeId: "user-main"
        }
      ]
    });
    await expect(
      client.getUserNodeConversation("user-main", "conversation-alpha")
    ).resolves.toMatchObject({
      messages: [
        {
          summary: "Approved."
        }
      ]
    });
    await expect(
      client.markUserNodeConversationRead("user-main", "conversation-alpha")
    ).resolves.toMatchObject({
      conversation: {
        lastReadAt: "2026-04-26T12:01:00.000Z",
        unreadCount: 0
      },
      read: {
        conversationId: "conversation-alpha"
      }
    });
    await expect(
      client.publishUserNodeMessage("user-main", {
        approval: {
          approvalId: "approval-alpha",
          decision: "approved"
        },
        messageType: "approval.response",
        parentMessageId:
          "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        summary: "Approved.",
        targetNodeId: "worker-it"
      })
    ).resolves.toMatchObject({
      eventId: publishResponse.eventId,
      fromNodeId: "user-main",
      messageType: "approval.response"
    });
    expect(requests).toEqual([
      "http://entangle-host.test/v1/user-nodes",
      "http://entangle-host.test/v1/user-nodes/user-main",
      "http://entangle-host.test/v1/user-nodes/user-main/inbox",
      "http://entangle-host.test/v1/user-nodes/user-main/inbox/conversation-alpha",
      "http://entangle-host.test/v1/user-nodes/user-main/inbox/conversation-alpha/read",
      "http://entangle-host.test/v1/user-nodes/user-main/messages"
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

  it("calls Host Authority inspect, export, and import surfaces", async () => {
    const authority = {
      authorityId: "authority-main",
      createdAt: "2026-04-26T10:00:00.000Z",
      keyRef: "secret://host-authority/main",
      publicKey:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      schemaVersion: "1",
      status: "active",
      updatedAt: "2026-04-26T10:00:00.000Z"
    };
    const requests: Array<{
      body?: string;
      method?: string;
      url: string;
    }> = [];
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: (url, init) => {
        requests.push({
          body: init?.body,
          method: init?.method,
          url
        });

        if (url.endsWith("/v1/authority/export")) {
          return Promise.resolve(
            createMockResponse({
              body: JSON.stringify({
                authority,
                exportedAt: "2026-04-26T10:01:00.000Z",
                secretKey:
                  "1111111111111111111111111111111111111111111111111111111111111111"
              }),
              ok: true,
              status: 200
            })
          );
        }

        if (url.endsWith("/v1/authority/import")) {
          return Promise.resolve(
            createMockResponse({
              body: JSON.stringify({
                authority,
                importedAt: "2026-04-26T10:02:00.000Z"
              }),
              ok: true,
              status: 200
            })
          );
        }

        return Promise.resolve(
          createMockResponse({
            body: JSON.stringify({
              authority,
              checkedAt: "2026-04-26T10:00:00.000Z",
              secret: {
                keyRef: "secret://host-authority/main",
                status: "available"
              }
            }),
            ok: true,
            status: 200
          })
        );
      }
    });

    await expect(client.getHostAuthority()).resolves.toMatchObject({
      authority: {
        authorityId: "authority-main"
      },
      secret: {
        status: "available"
      }
    });
    const exported = await client.exportHostAuthority();
    await expect(client.importHostAuthority(exported)).resolves.toMatchObject({
      importedAt: "2026-04-26T10:02:00.000Z"
    });

    expect(requests.map((request) => request.url)).toEqual([
      "http://entangle-host.test/v1/authority",
      "http://entangle-host.test/v1/authority/export",
      "http://entangle-host.test/v1/authority/import"
    ]);
    expect(requests[2]).toMatchObject({
      method: "PUT"
    });
    expect(JSON.parse(requests[2]!.body ?? "{}")).toMatchObject({
      authority: {
        authorityId: "authority-main"
      }
    });
  });

  it("calls runner registry list, inspect, trust, and revoke surfaces", async () => {
    const runner = {
      heartbeat: {
        assignmentIds: [],
        hostAuthorityPubkey:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        lastHeartbeatAt: "2026-04-26T10:01:00.000Z",
        operationalState: "ready",
        runnerId: "runner-alpha",
        runnerPubkey:
          "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        schemaVersion: "1",
        updatedAt: "2026-04-26T10:01:00.000Z"
      },
      liveness: "online",
      offlineAfterSeconds: 300,
      projectedAt: "2026-04-26T10:02:00.000Z",
      registration: {
        capabilities: {
          agentEngineKinds: ["opencode_server"],
          runtimeKinds: ["agent_runner"]
        },
        firstSeenAt: "2026-04-26T10:00:00.000Z",
        hostAuthorityPubkey:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        lastSeenAt: "2026-04-26T10:01:00.000Z",
        publicKey:
          "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        runnerId: "runner-alpha",
        schemaVersion: "1",
        trustState: "pending",
        updatedAt: "2026-04-26T10:01:00.000Z"
      },
      staleAfterSeconds: 60
    };
    const requests: Array<{
      body?: string;
      method?: string;
      url: string;
    }> = [];
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: (url, init) => {
        requests.push({
          body: init?.body,
          method: init?.method,
          url
        });

        if (url.endsWith("/trust")) {
          return Promise.resolve(
            createMockResponse({
              body: JSON.stringify({
                runner: {
                  ...runner,
                  registration: {
                    ...runner.registration,
                    trustState: "trusted"
                  }
                }
              }),
              ok: true,
              status: 200
            })
          );
        }

        if (url.endsWith("/revoke")) {
          return Promise.resolve(
            createMockResponse({
              body: JSON.stringify({
                runner: {
                  ...runner,
                  registration: {
                    ...runner.registration,
                    revokedAt: "2026-04-26T10:03:00.000Z",
                    trustState: "revoked"
                  }
                }
              }),
              ok: true,
              status: 200
            })
          );
        }

        if (url.endsWith("/v1/runners")) {
          return Promise.resolve(
            createMockResponse({
              body: JSON.stringify({
                generatedAt: "2026-04-26T10:02:00.000Z",
                runners: [runner]
              }),
              ok: true,
              status: 200
            })
          );
        }

        return Promise.resolve(
          createMockResponse({
            body: JSON.stringify({ runner }),
            ok: true,
            status: 200
          })
        );
      }
    });

    await expect(client.listRunners()).resolves.toMatchObject({
      runners: [
        {
          registration: {
            runnerId: "runner-alpha"
          }
        }
      ]
    });
    await expect(client.getRunner("runner-alpha")).resolves.toMatchObject({
      runner: {
        liveness: "online"
      }
    });
    await expect(
      client.trustRunner("runner-alpha", { reason: "approved" })
    ).resolves.toMatchObject({
      runner: {
        registration: {
          trustState: "trusted"
        }
      }
    });
    await expect(
      client.revokeRunner("runner-alpha", { reason: "maintenance" })
    ).resolves.toMatchObject({
      runner: {
        registration: {
          trustState: "revoked"
        }
      }
    });

    expect(requests.map((request) => request.url)).toEqual([
      "http://entangle-host.test/v1/runners",
      "http://entangle-host.test/v1/runners/runner-alpha",
      "http://entangle-host.test/v1/runners/runner-alpha/trust",
      "http://entangle-host.test/v1/runners/runner-alpha/revoke"
    ]);
    expect(JSON.parse(requests[2]!.body ?? "{}")).toEqual({
      reason: "approved"
    });
  });

  it("calls runtime assignment list, inspect, offer, and revoke surfaces", async () => {
    const assignment = {
      assignmentId: "assignment-alpha",
      assignmentRevision: 0,
      graphId: "team-alpha",
      graphRevisionId: "team-alpha-rev-1",
      hostAuthorityPubkey:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      lease: {
        expiresAt: "2026-04-26T11:00:00.000Z",
        issuedAt: "2026-04-26T10:00:00.000Z",
        leaseId: "lease-alpha",
        renewBy: "2026-04-26T10:48:00.000Z"
      },
      nodeId: "worker-it",
      offeredAt: "2026-04-26T10:00:00.000Z",
      runnerId: "runner-alpha",
      runnerPubkey:
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      runtimeKind: "agent_runner",
      schemaVersion: "1",
      status: "offered",
      updatedAt: "2026-04-26T10:00:00.000Z"
    };
    const requests: Array<{
      body?: string;
      method?: string;
      url: string;
    }> = [];
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: (url, init) => {
        requests.push({
          body: init?.body,
          method: init?.method,
          url
        });

        if (url.endsWith("/revoke")) {
          return Promise.resolve(
            createMockResponse({
              body: JSON.stringify({
                assignment: {
                  ...assignment,
                  revokedAt: "2026-04-26T10:05:00.000Z",
                  status: "revoked"
                }
              }),
              ok: true,
              status: 200
            })
          );
        }

        if (url.endsWith("/v1/assignments") && init?.method === "POST") {
          return Promise.resolve(
            createMockResponse({
              body: JSON.stringify({ assignment }),
              ok: true,
              status: 200
            })
          );
        }

        if (url.endsWith("/v1/assignments")) {
          return Promise.resolve(
            createMockResponse({
              body: JSON.stringify({
                assignments: [assignment],
                generatedAt: "2026-04-26T10:01:00.000Z"
              }),
              ok: true,
              status: 200
            })
          );
        }

        return Promise.resolve(
          createMockResponse({
            body: JSON.stringify({ assignment }),
            ok: true,
            status: 200
          })
        );
      }
    });

    await expect(client.listAssignments()).resolves.toMatchObject({
      assignments: [
        {
          assignmentId: "assignment-alpha"
        }
      ]
    });
    await expect(client.getAssignment("assignment-alpha")).resolves.toMatchObject({
      assignment: {
        status: "offered"
      }
    });
    await expect(
      client.offerAssignment({
        assignmentId: "assignment-alpha",
        nodeId: "worker-it",
        runnerId: "runner-alpha"
      })
    ).resolves.toMatchObject({
      assignment: {
        assignmentId: "assignment-alpha"
      }
    });
    await expect(
      client.revokeAssignment("assignment-alpha", { reason: "operator" })
    ).resolves.toMatchObject({
      assignment: {
        status: "revoked"
      }
    });

    expect(requests.map((request) => request.url)).toEqual([
      "http://entangle-host.test/v1/assignments",
      "http://entangle-host.test/v1/assignments/assignment-alpha",
      "http://entangle-host.test/v1/assignments",
      "http://entangle-host.test/v1/assignments/assignment-alpha/revoke"
    ]);
    expect(JSON.parse(requests[2]!.body ?? "{}")).toMatchObject({
      assignmentId: "assignment-alpha",
      leaseDurationSeconds: 3600
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
                  gitServiceRefs: ["gitea"],
                  relayProfileRefs: ["preview-relay"]
                },
                runtimeProfile: "federated",
                schemaVersion: "1"
              },
              runtime: {
                backendKind: "docker",
                contextAvailable: true,
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
              gitServiceRefs: ["gitea"],
              relayProfileRefs: ["preview-relay"]
            },
            runtimeProfile: "federated",
            schemaVersion: "1"
          },
          runtime: {
            backendKind: "docker",
            contextAvailable: true,
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
                gitServiceRefs: ["gitea"],
                relayProfileRefs: ["preview-relay"]
              },
              runtimeProfile: "federated",
              schemaVersion: "1"
            },
            runtime: {
              backendKind: "docker",
              contextAvailable: true,
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
                gitServiceRefs: ["gitea"],
                relayProfileRefs: ["preview-relay"]
              },
              runtimeProfile: "federated",
              schemaVersion: "1"
            },
            runtime: {
              backendKind: "docker",
              contextAvailable: true,
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

  it("posts session cancellation requests to aggregate and runtime-bound host surfaces", async () => {
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
              cancellations: [
                {
                  cancellationId: "cancel-alpha",
                  graphId: "team-alpha",
                  nodeId: "worker-it",
                  requestedAt: "2026-04-24T10:00:00.000Z",
                  sessionId: "session-alpha",
                  status: "requested"
                }
              ],
              sessionId: "session-alpha"
            }),
            ok: true,
            status: 200
          })
        );
      }
    });

    await expect(
      client.cancelSession("session-alpha", {
        cancellationId: "cancel-alpha",
        reason: "Stop the session.",
        requestedBy: "operator-main"
      })
    ).resolves.toMatchObject({
      cancellations: [
        {
          cancellationId: "cancel-alpha",
          nodeId: "worker-it",
          sessionId: "session-alpha"
        }
      ],
      sessionId: "session-alpha"
    });
    await expect(
      client.cancelRuntimeSession("worker-it", "session-alpha", {
        cancellationId: "cancel-runtime-alpha"
      })
    ).resolves.toMatchObject({
      sessionId: "session-alpha"
    });
    expect(requests).toEqual([
      {
        body: JSON.stringify({
          cancellationId: "cancel-alpha",
          nodeIds: [],
          reason: "Stop the session.",
          requestedBy: "operator-main"
        }),
        method: "POST",
        url: "http://entangle-host.test/v1/sessions/session-alpha/cancel"
      },
      {
        body: JSON.stringify({
          cancellationId: "cancel-runtime-alpha",
          nodeIds: []
        }),
        method: "POST",
        url: "http://entangle-host.test/v1/runtimes/worker-it/sessions/session-alpha/cancel"
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

  it("parses runtime bootstrap bundles from the host surface", async () => {
    const requests: string[] = [];
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: (url) => {
        requests.push(url);
        return Promise.resolve(
          createMockResponse({
            body: JSON.stringify({
              graphId: "team-alpha",
              graphRevisionId: "team-alpha-20260426-000001",
              nodeId: "worker-it",
              runtimeContext: {
                agentRuntimeContext: {
                  engineProfile: {
                    defaultAgent: "build",
                    displayName: "OpenCode",
                    executable: "opencode",
                    id: "opencode-default",
                    kind: "opencode_server"
                  },
                  engineProfileRef: "opencode-default",
                  mode: "coding_agent"
                },
                artifactContext: {},
                binding: {
                  bindingId: "team-alpha-worker-it",
                  externalPrincipals: [],
                  graphId: "team-alpha",
                  graphRevisionId: "team-alpha-20260426-000001",
                  node: {
                    displayName: "Worker IT",
                    nodeId: "worker-it",
                    nodeKind: "worker"
                  },
                  resolvedResourceBindings: {
                    externalPrincipalRefs: [],
                    gitServiceRefs: [],
                    relayProfileRefs: []
                  },
                  runtimeProfile: "federated",
                  schemaVersion: "1"
                },
                generatedAt: "2026-04-26T10:00:00.000Z",
                identityContext: {
                  algorithm: "nostr_secp256k1",
                  publicKey:
                    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
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
                  runtimeProfile: "federated"
                },
                relayContext: {},
                schemaVersion: "1",
                workspace: {
                  artifactWorkspaceRoot: "/entangle/runtime/workspace/artifacts",
                  injectedRoot: "/entangle/runtime/workspace/injected",
                  memoryRoot: "/entangle/runtime/workspace/memory",
                  packageRoot: "/entangle/runtime/workspace/package",
                  retrievalRoot: "/entangle/runtime/workspace/retrieval",
                  root: "/entangle/runtime/workspace",
                  runtimeRoot: "/entangle/runtime/workspace/runtime"
                }
              },
              schemaVersion: "1",
              snapshots: []
            }),
            ok: true,
            status: 200
          })
        );
      }
    });

    await expect(
      client.getRuntimeBootstrapBundle("worker-it")
    ).resolves.toMatchObject({
      nodeId: "worker-it",
      runtimeContext: {
        workspace: {
          packageRoot: "/entangle/runtime/workspace/package"
        }
      }
    });
    expect(requests).toEqual([
      "http://entangle-host.test/v1/runtimes/worker-it/bootstrap-bundle"
    ]);
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
                gitServiceRef: "gitea",
                subject: "worker-it",
                transportAuthMode: "ssh_key",
                secretRef: "secret://git/worker-it/ssh",
                attribution: {
                  displayName: "Worker IT",
                  email: "worker-it@entangle.example"
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
        gitServiceRef: "gitea"
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
                      gitServiceRef: "gitea",
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
                    gitServiceRef: "gitea",
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

  it("posts runtime artifact restore requests to the host surface", async () => {
    const requests: Array<{ body?: string; method?: string; url: string }> = [];
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
              restore: {
                artifactId: "report-turn-001",
                createdAt: "2026-04-22T00:01:00.000Z",
                mode: "restore_workspace",
                nodeId: "worker-it",
                requestedBy: "user-main",
                restoreId: "restore-report-turn-001",
                restoredFileCount: 1,
                restoredPath:
                  "/tmp/entangle-runner/workspace/restores/restore-report-turn-001",
                source: {
                  backend: "git",
                  commit: "abc123",
                  path: "reports/session-alpha/turn-001.md"
                },
                status: "restored",
                updatedAt: "2026-04-22T00:01:00.000Z"
              }
            }),
            ok: true,
            status: 200
          })
        );
      }
    });

    await expect(
      client.restoreRuntimeArtifact("worker-it", "report-turn-001", {
        requestedBy: "user-main",
        restoreId: "restore-report-turn-001"
      })
    ).resolves.toMatchObject({
      restore: {
        restoredFileCount: 1,
        status: "restored"
      }
    });
    expect(requests).toEqual([
      {
        body: JSON.stringify({
          mode: "restore_workspace",
          overwrite: false,
          requestedBy: "user-main",
          restoreId: "restore-report-turn-001"
        }),
        method: "POST",
        url:
          "http://entangle-host.test/v1/runtimes/worker-it/artifacts/report-turn-001/restore"
      }
    ]);
  });

  it("posts runtime artifact promotion requests to the host surface", async () => {
    const requests: Array<{ body: string | undefined; method: string; url: string }> =
      [];
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: (url, init) => {
        requests.push({
          body: typeof init?.body === "string" ? init.body : undefined,
          method: init?.method ?? "GET",
          url
        });

        return Promise.resolve(
          createMockResponse({
            body: JSON.stringify({
              artifact: {
                createdAt: "2026-04-22T00:00:00.000Z",
                ref: {
                  artifactId: "report-turn-001",
                  artifactKind: "report_file",
                  backend: "git",
                  createdByNodeId: "worker-it",
                  locator: {
                    branch: "main",
                    commit: "abc123",
                    gitServiceRef: "gitea",
                    namespace: "team-alpha",
                    path: "reports/session-alpha/turn-001.md",
                    repositoryName: "team-alpha"
                  },
                  preferred: true,
                  status: "materialized"
                },
                updatedAt: "2026-04-22T00:00:00.000Z"
              },
              promotion: {
                approvalId: "approval-promote-report",
                artifactId: "report-turn-001",
                createdAt: "2026-04-22T00:02:00.000Z",
                nodeId: "worker-it",
                promotedFileCount: 1,
                promotedPath: "/tmp/entangle/source",
                promotionId: "promotion-report-turn-001",
                restoreId: "restore-report-turn-001",
                status: "promoted",
                target: "source_workspace",
                updatedAt: "2026-04-22T00:02:00.000Z"
              },
              restore: {
                artifactId: "report-turn-001",
                createdAt: "2026-04-22T00:01:00.000Z",
                mode: "restore_workspace",
                nodeId: "worker-it",
                restoreId: "restore-report-turn-001",
                restoredFileCount: 1,
                restoredPath:
                  "/tmp/entangle-runner/workspace/restores/restore-report-turn-001",
                source: {
                  backend: "git",
                  commit: "abc123",
                  path: "reports/session-alpha/turn-001.md"
                },
                status: "restored",
                updatedAt: "2026-04-22T00:01:00.000Z"
              }
            }),
            ok: true,
            status: 200
          })
        );
      }
    });

    await expect(
      client.promoteRuntimeArtifact("worker-it", "report-turn-001", {
        approvalId: "approval-promote-report",
        overwrite: true,
        promotionId: "promotion-report-turn-001",
        restoreId: "restore-report-turn-001"
      })
    ).resolves.toMatchObject({
      promotion: {
        promotedFileCount: 1,
        status: "promoted"
      }
    });
    expect(requests).toEqual([
      {
        body: JSON.stringify({
          approvalId: "approval-promote-report",
          overwrite: true,
          promotionId: "promotion-report-turn-001",
          restoreId: "restore-report-turn-001",
          target: "source_workspace"
        }),
        method: "POST",
        url:
          "http://entangle-host.test/v1/runtimes/worker-it/artifacts/report-turn-001/promote"
      }
    ]);
  });

  it("parses runtime artifact restore history lists from the host surface", async () => {
    const requests: string[] = [];
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: (url) => {
        requests.push(url);

        return Promise.resolve(
          createMockResponse({
            body: JSON.stringify({
              restores: [
                {
                  artifactId: "report-turn-001",
                  createdAt: "2026-04-22T00:01:00.000Z",
                  mode: "restore_workspace",
                  nodeId: "worker-it",
                  restoreId: "restore-report-turn-001",
                  restoredFileCount: 1,
                  restoredPath:
                    "/tmp/entangle-runner/workspace/restores/restore-report-turn-001",
                  source: {
                    backend: "git",
                    commit: "abc123",
                    path: "reports/session-alpha/turn-001.md"
                  },
                  status: "restored",
                  updatedAt: "2026-04-22T00:01:00.000Z"
                }
              ]
            }),
            ok: true,
            status: 200
          })
        );
      }
    });

    await expect(
      client.listRuntimeArtifactRestoresForArtifact(
        "worker-it",
        "report-turn-001"
      )
    ).resolves.toMatchObject({
      restores: [
        {
          restoreId: "restore-report-turn-001",
          status: "restored"
        }
      ]
    });
    await expect(
      client.listRuntimeArtifactRestores("worker-it")
    ).resolves.toMatchObject({
      restores: [
        {
          artifactId: "report-turn-001"
        }
      ]
    });
    expect(requests).toEqual([
      "http://entangle-host.test/v1/runtimes/worker-it/artifacts/report-turn-001/restores",
      "http://entangle-host.test/v1/runtimes/worker-it/artifact-restores"
    ]);
  });

  it("parses runtime artifact promotion history lists from the host surface", async () => {
    const requests: string[] = [];
    const client = createHostClient({
      baseUrl: "http://entangle-host.test",
      fetchImpl: (url) => {
        requests.push(url);

        return Promise.resolve(
          createMockResponse({
            body: JSON.stringify({
              promotions: [
                {
                  approvalId: "approval-promote-report",
                  artifactId: "report-turn-001",
                  createdAt: "2026-04-22T00:02:00.000Z",
                  nodeId: "worker-it",
                  promotedFileCount: 1,
                  promotedPath: "/tmp/entangle-runner/source",
                  promotionId: "promotion-report-turn-001",
                  restoreId: "restore-report-turn-001",
                  status: "promoted",
                  target: "source_workspace",
                  updatedAt: "2026-04-22T00:02:00.000Z"
                }
              ]
            }),
            ok: true,
            status: 200
          })
        );
      }
    });

    await expect(
      client.listRuntimeArtifactPromotionsForArtifact(
        "worker-it",
        "report-turn-001"
      )
    ).resolves.toMatchObject({
      promotions: [
        {
          promotionId: "promotion-report-turn-001",
          status: "promoted"
        }
      ]
    });
    await expect(
      client.listRuntimeArtifactPromotions("worker-it")
    ).resolves.toMatchObject({
      promotions: [
        {
          artifactId: "report-turn-001"
        }
      ]
    });
    expect(requests).toEqual([
      "http://entangle-host.test/v1/runtimes/worker-it/artifacts/report-turn-001/promotions",
      "http://entangle-host.test/v1/runtimes/worker-it/artifact-promotions"
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
    const requests: Array<{ body?: string; method?: string; url: string }> = [];
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
      fetchImpl: (url, init) => {
        requests.push({
          ...(init?.body ? { body: init.body } : {}),
          ...(init?.method ? { method: init.method } : {}),
          url
        });

        return Promise.resolve(
          createMockResponse({
            body: JSON.stringify(
              init?.method === "POST"
                ? {
                    approval: {
                      ...approval,
                      status: "approved",
                      updatedAt: "2026-04-24T00:02:00.000Z"
                    }
                  }
                : url.endsWith("/approval-alpha")
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
    await expect(
      client.recordRuntimeApprovalDecision("worker-it", {
        approvalId: "approval-alpha",
        status: "approved"
      })
    ).resolves.toMatchObject({
      approval: {
        approvalId: "approval-alpha",
        status: "approved"
      }
    });
    expect(requests).toEqual([
      {
        url: "http://entangle-host.test/v1/runtimes/worker-it/approvals"
      },
      {
        url: "http://entangle-host.test/v1/runtimes/worker-it/approvals/approval-alpha"
      },
      {
        body: JSON.stringify({
          approvalId: "approval-alpha",
          approverNodeIds: ["user"],
          status: "approved"
        }),
        method: "POST",
        url: "http://entangle-host.test/v1/runtimes/worker-it/approvals"
      }
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
          remoteName: "entangle-gitea",
          remoteUrl: "ssh://git@gitea.example:22/team-alpha/graph-alpha.git",
          state: "published"
        },
        requestedAt: "2026-04-24T00:04:00.000Z",
        requestedBy: "operator-alpha",
        targetGitServiceRef: "gitea",
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
        remoteName: "entangle-gitea",
        remoteUrl: "ssh://git@gitea.example:22/team-alpha/graph-alpha.git",
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
          gitServiceRef: "gitea",
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
    const sourceHistoryReplay = {
      baseTree: "base-tree-alpha",
      candidateId: "source-change-turn-alpha",
      commit: "commit-alpha",
      createdAt: "2026-04-24T00:05:00.000Z",
      graphId: "team-alpha",
      graphRevisionId: "team-alpha-20260424-000000",
      headTree: "head-tree-alpha",
      nodeId: "worker-it",
      replayedFileCount: 1,
      replayedPath: "/tmp/entangle/source",
      replayId: "replay-source-history-source-change-turn-alpha",
      sourceHistoryId: "source-history-source-change-turn-alpha",
      status: "replayed",
      turnId: "turn-alpha",
      updatedAt: "2026-04-24T00:05:00.000Z"
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
          : url.endsWith("/source-history-replays") ||
              url.endsWith("/replays")
            ? { replays: [sourceHistoryReplay] }
            : url.endsWith("/replay")
              ? { entry: sourceHistoryEntry, replay: sourceHistoryReplay }
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
          targetGitServiceRef: "gitea",
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
    await expect(
      client.replayRuntimeSourceHistory(
        "worker-it",
        "source-history-source-change-turn-alpha",
        {
          reason: "Replay source history.",
          replayedBy: "operator-alpha",
          replayId: "replay-source-history-source-change-turn-alpha"
        }
      )
    ).resolves.toMatchObject({
      replay: {
        replayId: "replay-source-history-source-change-turn-alpha",
        status: "replayed"
      }
    });
    await expect(
      client.listRuntimeSourceHistoryReplaysForEntry(
        "worker-it",
        "source-history-source-change-turn-alpha"
      )
    ).resolves.toMatchObject({
      replays: [
        {
          replayId: "replay-source-history-source-change-turn-alpha"
        }
      ]
    });
    await expect(
      client.listRuntimeSourceHistoryReplays("worker-it")
    ).resolves.toMatchObject({
      replays: [
        {
          sourceHistoryId: "source-history-source-change-turn-alpha"
        }
      ]
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
          targetGitServiceRef: "gitea",
          targetNamespace: "team-alpha",
          targetRepositoryName: "graph-alpha"
        }),
        method: "POST",
        url: "http://entangle-host.test/v1/runtimes/worker-it/source-history/source-history-source-change-turn-alpha/publish"
      },
      {
        body: JSON.stringify({
          reason: "Replay source history.",
          replayedBy: "operator-alpha",
          replayId: "replay-source-history-source-change-turn-alpha"
        }),
        method: "POST",
        url: "http://entangle-host.test/v1/runtimes/worker-it/source-history/source-history-source-change-turn-alpha/replay"
      },
      {
        method: undefined,
        url: "http://entangle-host.test/v1/runtimes/worker-it/source-history/source-history-source-change-turn-alpha/replays"
      },
      {
        method: undefined,
        url: "http://entangle-host.test/v1/runtimes/worker-it/source-history-replays"
      }
    ]);
  });

  it("publishes and lists runtime wiki repositories through the host surface", async () => {
    const requests: Array<{ body?: string; method?: string; url: string }> = [];
    const publication = {
      artifactId: "wiki-repository-worker-it-wiki-commit",
      branch: "worker-it/wiki-repository/entangle-wiki",
      commit: "wiki-commit-alpha",
      createdAt: "2026-04-24T00:06:00.000Z",
      graphId: "team-alpha",
      graphRevisionId: "team-alpha-20260424-000000",
      nodeId: "worker-it",
      publication: {
        publishedAt: "2026-04-24T00:06:00.000Z",
        remoteName: "entangle-gitea",
        remoteUrl: "ssh://git@gitea.example:22/team-alpha/graph-alpha.git",
        state: "published"
      },
      publicationId: "wiki-publication-alpha",
      requestedBy: "operator-alpha",
      targetGitServiceRef: "gitea",
      targetNamespace: "team-alpha",
      targetRepositoryName: "graph-alpha",
      updatedAt: "2026-04-24T00:06:00.000Z"
    };
    const artifact = {
      createdAt: "2026-04-24T00:06:00.000Z",
      materialization: {
        repoPath: "/tmp/entangle/workspace/wiki-repository"
      },
      publication: publication.publication,
      ref: {
        artifactId: "wiki-repository-worker-it-wiki-commit",
        artifactKind: "knowledge_summary",
        backend: "git",
        createdByNodeId: "worker-it",
        locator: {
          branch: "worker-it/wiki-repository/entangle-wiki",
          commit: "artifact-wiki-commit-alpha",
          gitServiceRef: "gitea",
          namespace: "team-alpha",
          path: ".",
          repositoryName: "graph-alpha"
        },
        preferred: true,
        status: "published"
      },
      updatedAt: "2026-04-24T00:06:00.000Z"
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
            body: JSON.stringify(
              url.endsWith("/publications")
                ? { publications: [publication] }
                : { artifact, publication }
            ),
            ok: true,
            status: 200
          })
        );
      }
    });

    await expect(
      client.publishRuntimeWikiRepository("worker-it", {
        publicationId: "wiki-publication-alpha",
        publishedBy: "operator-alpha",
        reason: "Publish wiki repository.",
        retry: true,
        targetRepositoryName: "graph-alpha"
      })
    ).resolves.toMatchObject({
      artifact: {
        ref: {
          artifactId: "wiki-repository-worker-it-wiki-commit"
        }
      },
      publication: {
        publicationId: "wiki-publication-alpha"
      }
    });
    await expect(
      client.listRuntimeWikiRepositoryPublications("worker-it")
    ).resolves.toMatchObject({
      publications: [
        {
          publicationId: "wiki-publication-alpha"
        }
      ]
    });
    expect(requests).toEqual([
      {
        body: JSON.stringify({
          publicationId: "wiki-publication-alpha",
          publishedBy: "operator-alpha",
          reason: "Publish wiki repository.",
          retry: true,
          targetRepositoryName: "graph-alpha"
        }),
        method: "POST",
        url:
          "http://entangle-host.test/v1/runtimes/worker-it/wiki-repository/publish"
      },
      {
        method: undefined,
        url:
          "http://entangle-host.test/v1/runtimes/worker-it/wiki-repository/publications"
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
