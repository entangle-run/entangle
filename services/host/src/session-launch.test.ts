import { describe, expect, it, vi } from "vitest";
import type { EffectiveRuntimeContext, GraphSpec } from "@entangle/types";
import { generateSecretKey, getPublicKey } from "nostr-tools";
import {
  buildSessionLaunchMessage,
  publishHostSessionLaunch,
  resolveDefaultSessionLaunchUserNodeId,
  resolveSessionLaunchRelaySelection
} from "./session-launch.js";

function buildUserNodeSigner(nodeId = "user-main") {
  const secretKey = generateSecretKey();

  return {
    nodeId,
    publicKey: getPublicKey(secretKey),
    secretKey
  };
}

function buildGraph(): GraphSpec {
  return {
    defaults: {
      resourceBindings: {
        externalPrincipalRefs: [],
        gitServiceRefs: [],
        relayProfileRefs: ["relay-main"]
      },
      runtimeProfile: "federated"
    },
    edges: [],
    graphId: "federated-preview",
    name: "Federated Preview",
    nodes: [
      {
        displayName: "Operator",
        nodeId: "user-main",
        nodeKind: "user"
      },
      {
        displayName: "Builder",
        nodeId: "builder",
        nodeKind: "worker",
        resourceBindings: {
          externalPrincipalRefs: [],
          gitServiceRefs: [],
          relayProfileRefs: ["relay-main"]
        }
      }
    ],
    schemaVersion: "1"
  };
}

function buildRuntimeContext(): EffectiveRuntimeContext {
  return {
    agentRuntimeContext: {
      engineProfile: {
        id: "local-opencode",
        displayName: "Local OpenCode",
        kind: "opencode_server",
        executable: "opencode",
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
      bindingId: "federated-preview.builder",
      externalPrincipals: [],
      graphId: "federated-preview",
      graphRevisionId: "federated-preview-rev-1",
      node: {
        displayName: "Builder",
        nodeId: "builder",
        nodeKind: "worker",
        resourceBindings: {
          externalPrincipalRefs: [],
          gitServiceRefs: [],
          relayProfileRefs: ["relay-main"]
        }
      },
      resolvedResourceBindings: {
        externalPrincipalRefs: [],
        gitServiceRefs: [],
        relayProfileRefs: ["relay-main"]
      },
      runtimeProfile: "federated",
      schemaVersion: "1"
    },
    generatedAt: "2026-04-25T00:00:00.000Z",
    identityContext: {
      algorithm: "nostr_secp256k1",
      publicKey:
        "2222222222222222222222222222222222222222222222222222222222222222",
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
      notes: [],
      runtimeProfile: "federated"
    },
    relayContext: {
      edgeRoutes: [],
      primaryRelayProfileRef: "relay-main",
      relayProfiles: [
        {
          authMode: "none",
          displayName: "Preview Relay",
          id: "relay-main",
          readUrls: ["ws://localhost:7777"],
          writeUrls: ["ws://localhost:7777", "ws://localhost:7777"]
        }
      ]
    },
    schemaVersion: "1",
    workspace: {
      artifactWorkspaceRoot: "/tmp/artifacts",
      injectedRoot: "/tmp/injected",
      memoryRoot: "/tmp/memory",
      packageRoot: "/tmp/package",
      retrievalRoot: "/tmp/retrieval",
      root: "/tmp",
      runtimeRoot: "/tmp/runtime"
    }
  };
}

describe("host session launch helpers", () => {
  it("resolves launch routing from graph and runtime context", () => {
    expect(resolveDefaultSessionLaunchUserNodeId(buildGraph())).toBe("user-main");
    expect(resolveSessionLaunchRelaySelection(buildRuntimeContext())).toEqual({
      authRequired: false,
      relayUrls: ["ws://localhost:7777"]
    });
  });

  it("builds valid A2A launch messages", () => {
    expect(
      buildSessionLaunchMessage({
        conversationId: "conversation-alpha",
        fromNodeId: "user-main",
        fromPubkey:
          "1111111111111111111111111111111111111111111111111111111111111111",
        request: {
          artifactRefs: [],
          summary: "Prepare a local report.",
          targetNodeId: "builder"
        },
        runtimeContext: buildRuntimeContext(),
        sessionId: "session-alpha",
        turnId: "turn-alpha"
      })
    ).toMatchObject({
      fromNodeId: "user-main",
      graphId: "federated-preview",
      intent: "Prepare a local report.",
      messageType: "task.request",
      sessionId: "session-alpha",
      toNodeId: "builder",
      work: {
        metadata: {
          launchedBy: "user-node-gateway"
        },
        summary: "Prepare a local report."
      }
    });
  });

  it("publishes through an injected pool for testable host launch", async () => {
    const publish = vi.fn(() => [Promise.resolve("ws://localhost:7777")]);
    const destroy = vi.fn();
    const result = await publishHostSessionLaunch({
      graph: buildGraph(),
      pool: {
        destroy,
        publish
      },
      request: {
        conversationId: "conversation-alpha",
        sessionId: "session-alpha",
        summary: "Prepare a local report.",
        targetNodeId: "builder",
        turnId: "turn-alpha"
      },
      runtimeContext: buildRuntimeContext(),
      userNode: buildUserNodeSigner()
    });

    expect(result).toMatchObject({
      conversationId: "conversation-alpha",
      fromNodeId: "user-main",
      publishedRelays: ["ws://localhost:7777"],
      relayUrls: ["ws://localhost:7777"],
      sessionId: "session-alpha",
      targetNodeId: "builder",
      turnId: "turn-alpha"
    });
    expect(result.fromPubkey).toMatch(/^[0-9a-f]{64}$/u);
    expect(result.eventId).toMatch(/^[0-9a-f]{64}$/);
    expect(publish).toHaveBeenCalledOnce();
    expect(destroy).toHaveBeenCalledOnce();
  });
});
