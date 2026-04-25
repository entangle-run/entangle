import { describe, expect, it } from "vitest";
import type { EffectiveRuntimeContext, GraphSpec } from "@entangle/types";
import {
  buildSessionLaunchMessage,
  resolveDefaultSessionLaunchUserNodeId,
  resolveSessionLaunchRelaySelection
} from "./session-launch-command.js";

function buildGraph(): GraphSpec {
  return {
    defaults: {
      resourceBindings: {
        externalPrincipalRefs: [],
        gitServiceRefs: [],
        relayProfileRefs: ["relay-main"]
      },
      runtimeProfile: "hackathon_local"
    },
    edges: [],
    graphId: "local-preview",
    name: "Local Preview",
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
    artifactContext: {
      backends: ["git"],
      gitPrincipalBindings: [],
      gitServices: []
    },
    binding: {
      bindingId: "local-preview.builder",
      externalPrincipals: [],
      graphId: "local-preview",
      graphRevisionId: "local-preview-rev-1",
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
      runtimeProfile: "hackathon_local",
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
      runtimeProfile: "hackathon_local"
    },
    relayContext: {
      edgeRoutes: [],
      primaryRelayProfileRef: "relay-main",
      relayProfiles: [
        {
          authMode: "none",
          displayName: "Local Relay",
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

describe("session launch command helpers", () => {
  it("resolves the default user node from graph topology", () => {
    expect(resolveDefaultSessionLaunchUserNodeId(buildGraph())).toBe("user-main");
  });

  it("deduplicates writable relay URLs from runtime context", () => {
    expect(resolveSessionLaunchRelaySelection(buildRuntimeContext())).toEqual({
      authRequired: false,
      relayUrls: ["ws://localhost:7777"]
    });
  });

  it("builds a valid A2A task request for launch", () => {
    const message = buildSessionLaunchMessage({
      conversationId: "conversation-alpha",
      fromNodeId: "user-main",
      fromPubkey:
        "1111111111111111111111111111111111111111111111111111111111111111",
      runtimeContext: buildRuntimeContext(),
      sessionId: "session-alpha",
      summary: "Prepare a local report.",
      turnId: "turn-alpha"
    });

    expect(message).toMatchObject({
      fromNodeId: "user-main",
      graphId: "local-preview",
      intent: "Prepare a local report.",
      messageType: "task.request",
      sessionId: "session-alpha",
      toNodeId: "builder",
      work: {
        metadata: {
          launchedBy: "entangle-cli"
        },
        summary: "Prepare a local report."
      }
    });
  });
});
