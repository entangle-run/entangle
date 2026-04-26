import { describe, expect, it, vi } from "vitest";
import type { EffectiveRuntimeContext } from "@entangle/types";
import { generateSecretKey, getPublicKey, nip59, type NostrEvent } from "nostr-tools";
import {
  buildUserNodeA2AMessage,
  publishUserNodeA2AMessage
} from "./user-node-messaging.js";

function buildRuntimeContext(publicKey: string): EffectiveRuntimeContext {
  return {
    agentRuntimeContext: {
      engineProfile: {
        id: "opencode-default",
        displayName: "OpenCode",
        kind: "opencode_server",
        executable: "opencode",
        stateScope: "node"
      },
      engineProfileRef: "opencode-default",
      mode: "coding_agent"
    },
    artifactContext: {
      backends: ["git"],
      gitPrincipalBindings: [],
      gitServices: []
    },
    binding: {
      bindingId: "team-alpha.worker-it",
      externalPrincipals: [],
      graphId: "team-alpha",
      graphRevisionId: "team-alpha-rev-1",
      node: {
        displayName: "Worker IT",
        nodeId: "worker-it",
        nodeKind: "worker"
      },
      resolvedResourceBindings: {
        externalPrincipalRefs: [],
        gitServiceRefs: [],
        relayProfileRefs: ["relay-main"]
      },
      runtimeProfile: "federated",
      schemaVersion: "1"
    },
    generatedAt: "2026-04-26T12:00:00.000Z",
    identityContext: {
      algorithm: "nostr_secp256k1",
      publicKey,
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
          writeUrls: ["ws://localhost:7777"]
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

describe("User Node A2A publishing", () => {
  it("builds approval responses signed as the selected User Node", () => {
    const userSecretKey = generateSecretKey();
    const workerSecretKey = generateSecretKey();
    const message = buildUserNodeA2AMessage({
      request: {
        approval: {
          approvalId: "approval-alpha",
          decision: "approved"
        },
        artifactRefs: [],
        messageType: "approval.response",
        parentMessageId:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        summary: "Approved.",
        targetNodeId: "worker-it"
      },
      runtimeContext: buildRuntimeContext(getPublicKey(workerSecretKey)),
      userNode: {
        nodeId: "user-main",
        publicKey: getPublicKey(userSecretKey),
        secretKey: userSecretKey
      }
    });

    expect(message).toMatchObject({
      fromNodeId: "user-main",
      messageType: "approval.response",
      parentMessageId:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      toNodeId: "worker-it",
      work: {
        metadata: {
          approval: {
            approvalId: "approval-alpha",
            decision: "approved"
          },
          sentBy: "user-node-gateway"
        }
      }
    });
  });

  it("publishes private Nostr-wrapped User Node messages through an injected pool", async () => {
    const userSecretKey = generateSecretKey();
    const workerSecretKey = generateSecretKey();
    const wrappedEvents: NostrEvent[] = [];
    const publish = vi.fn((relayUrls: string[], event: NostrEvent) => {
      wrappedEvents.push(event);
      return relayUrls.map((relayUrl) => Promise.resolve(relayUrl));
    });
    const destroy = vi.fn();
    const response = await publishUserNodeA2AMessage({
      pool: {
        destroy,
        publish
      },
      request: {
        artifactRefs: [],
        messageType: "task.request",
        summary: "Prepare a signed User Node task.",
        targetNodeId: "worker-it"
      },
      runtimeContext: buildRuntimeContext(getPublicKey(workerSecretKey)),
      userNode: {
        nodeId: "user-main",
        publicKey: getPublicKey(userSecretKey),
        secretKey: userSecretKey
      }
    });

    expect(response).toMatchObject({
      fromNodeId: "user-main",
      fromPubkey: getPublicKey(userSecretKey),
      messageType: "task.request",
      publishedRelays: ["ws://localhost:7777"],
      targetNodeId: "worker-it",
      toPubkey: getPublicKey(workerSecretKey)
    });
    expect(response.eventId).toMatch(/^[0-9a-f]{64}$/u);
    expect(publish).toHaveBeenCalledOnce();
    expect(destroy).toHaveBeenCalledOnce();
    expect(wrappedEvents).toHaveLength(1);

    const rumor = nip59.unwrapEvent(wrappedEvents[0]!, workerSecretKey);
    const message = JSON.parse(rumor.content) as { fromPubkey?: string };
    expect(message.fromPubkey).toBe(getPublicKey(userSecretKey));
  });

  it("falls back to requested relay URLs when the pool returns empty publish results", async () => {
    const userSecretKey = generateSecretKey();
    const workerSecretKey = generateSecretKey();
    const response = await publishUserNodeA2AMessage({
      pool: {
        destroy: vi.fn(),
        publish: vi.fn((relayUrls: string[]) =>
          relayUrls.map(() => Promise.resolve(""))
        )
      },
      request: {
        artifactRefs: [],
        messageType: "question",
        responsePolicy: {
          closeOnResult: false,
          maxFollowups: 0,
          responseRequired: false
        },
        summary: "Can you receive this signed message?",
        targetNodeId: "worker-it"
      },
      runtimeContext: buildRuntimeContext(getPublicKey(workerSecretKey)),
      userNode: {
        nodeId: "user-main",
        publicKey: getPublicKey(userSecretKey),
        secretKey: userSecretKey
      }
    });

    expect(response.publishedRelays).toEqual(["ws://localhost:7777"]);
  });
});
