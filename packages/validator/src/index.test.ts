import type { GraphSpec } from "@entangle/types";
import { describe, expect, it } from "vitest";
import {
  validateA2AMessageDocument,
  validateConversationLifecycleTransition,
  validateGraphDocument,
  validateSessionLifecycleTransition
} from "./index.js";

function buildGraph(packageSourceRef?: string): GraphSpec {
  return {
    defaults: {
      resourceBindings: {
        gitServiceRefs: [],
        relayProfileRefs: []
      },
      runtimeProfile: "hackathon_local"
    },
    edges: [],
    graphId: "demo-graph",
    name: "Demo Graph",
    nodes: [
      {
        autonomy: {
          canInitiateSessions: false,
          canMutateGraph: false
        },
        displayName: "User",
        nodeId: "user",
        nodeKind: "user",
        resourceBindings: {
          gitServiceRefs: [],
          relayProfileRefs: []
        }
      },
      {
        autonomy: {
          canInitiateSessions: false,
          canMutateGraph: false
        },
        displayName: "Worker",
        nodeId: "worker",
        nodeKind: "worker",
        packageSourceRef,
        resourceBindings: {
          gitServiceRefs: [],
          relayProfileRefs: []
        }
      }
    ],
    schemaVersion: "1"
  };
}

describe("validateGraphDocument", () => {
  it("does not invent missing host state when package-source ids were not provided", () => {
    const report = validateGraphDocument(buildGraph("worker-source"));

    expect(report.findings.some((finding) => finding.code === "unknown_package_source_ref")).toBe(
      false
    );
  });

  it("treats an explicitly empty admitted package-source set as authoritative", () => {
    const report = validateGraphDocument(buildGraph("worker-source"), {
      packageSourceIds: []
    });

    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "unknown_package_source_ref",
          severity: "error"
        })
      ])
    );
  });
});

describe("validateA2AMessageDocument", () => {
  it("rejects self-addressed protocol messages", () => {
    const report = validateA2AMessageDocument({
      conversationId: "conv-alpha",
      fromNodeId: "worker-it",
      fromPubkey:
        "1111111111111111111111111111111111111111111111111111111111111111",
      graphId: "graph-alpha",
      intent: "review_patch",
      messageType: "task.request",
      protocol: "entangle.a2a.v1",
      responsePolicy: {
        closeOnResult: true,
        maxFollowups: 1,
        responseRequired: true
      },
      sessionId: "session-alpha",
      toNodeId: "worker-it",
      toPubkey:
        "1111111111111111111111111111111111111111111111111111111111111111",
      turnId: "turn-001",
      work: {
        summary: "Review the patch."
      }
    });

    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "a2a_message_invalid",
          severity: "error"
        })
      ])
    );
  });
});

describe("lifecycle transition validation", () => {
  it("rejects invalid session regressions", () => {
    const report = validateSessionLifecycleTransition("completed", "active");

    expect(report.ok).toBe(false);
    expect(report.findings[0]?.code).toBe("session_transition_invalid");
  });

  it("accepts valid conversation progress transitions", () => {
    const report = validateConversationLifecycleTransition("working", "resolved");

    expect(report.ok).toBe(true);
    expect(report.findings).toHaveLength(0);
  });
});
