import { describe, expect, it } from "vitest";
import {
  graphSpecSchema,
  type GraphSpec,
  type HostProjectionSnapshot
} from "@entangle/types";
import {
  buildRuntimeAssignmentNodeOptions,
  buildRuntimeAssignmentOfferRequest,
  buildRuntimeAssignmentRunnerOptions,
  canRevokeAssignmentProjection,
  createEmptyRuntimeAssignmentControlDraft,
  formatAssignmentProjectionDetail,
  formatAssignmentProjectionLabel,
  normalizeRuntimeAssignmentControlDraft,
  sortAssignmentProjectionsForStudio
} from "./runtime-assignment-control.js";

const graph: GraphSpec = graphSpecSchema.parse({
  defaults: {
    agentRuntime: {
      mode: "coding_agent"
    },
    resourceBindings: {
      externalPrincipalRefs: [],
      gitServiceRefs: [],
      relayProfileRefs: []
    },
    runtimeProfile: "federated"
  },
  edges: [],
  graphId: "team-alpha",
  name: "Team Alpha",
  nodes: [
    {
      displayName: "Builder",
      nodeId: "builder-it",
      nodeKind: "worker"
    },
    {
      displayName: "User A",
      nodeId: "user-a",
      nodeKind: "user"
    }
  ],
  schemaVersion: "1"
});

const projection: HostProjectionSnapshot = {
  artifactRefs: [],
  assignmentReceipts: [],
  assignments: [
    {
      assignmentId: "assignment-revoked",
      graphId: "team-alpha",
      graphRevisionId: "graph-revision-alpha",
      hostAuthorityPubkey:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      nodeId: "builder-it",
      projection: {
        source: "control_event",
        updatedAt: "2026-04-28T12:01:00.000Z"
      },
      runnerId: "runner-trusted",
      status: "revoked"
    },
    {
      assignmentId: "assignment-active",
      graphId: "team-alpha",
      graphRevisionId: "graph-revision-alpha",
      hostAuthorityPubkey:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      nodeId: "user-a",
      projection: {
        source: "observation_event",
        updatedAt: "2026-04-28T12:02:00.000Z"
      },
      runnerId: "runner-trusted",
      status: "active"
    }
  ],
  freshness: "current",
  generatedAt: "2026-04-28T12:00:00.000Z",
  hostAuthorityPubkey:
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  runtimes: [],
  runners: [
    {
      assignmentIds: [],
      hostAuthorityPubkey:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      operationalState: "ready",
      projection: {
        source: "observation_event",
        updatedAt: "2026-04-28T12:00:00.000Z"
      },
      publicKey:
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      runnerId: "runner-trusted",
      trustState: "trusted"
    },
    {
      assignmentIds: [],
      hostAuthorityPubkey:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      operationalState: "ready",
      projection: {
        source: "observation_event",
        updatedAt: "2026-04-28T12:00:00.000Z"
      },
      publicKey:
        "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      runnerId: "runner-pending",
      trustState: "pending"
    }
  ],
  schemaVersion: "1",
  sourceChangeRefs: [],
  sourceHistoryRefs: [],
  sourceHistoryReplays: [],
  userConversations: [],
  wikiRefs: []
};

describe("runtime assignment control helpers", () => {
  it("builds graph node and trusted runner options", () => {
    expect(buildRuntimeAssignmentNodeOptions(graph)).toEqual([
      {
        detail: "worker",
        id: "builder-it",
        label: "builder-it - worker"
      },
      {
        detail: "user",
        id: "user-a",
        label: "user-a - user"
      }
    ]);
    expect(buildRuntimeAssignmentRunnerOptions(projection)).toEqual([
      {
        detail: "trusted - ready",
        id: "runner-trusted",
        label: "runner-trusted - ready"
      }
    ]);
  });

  it("normalizes stale drafts to available node and runner choices", () => {
    expect(
      normalizeRuntimeAssignmentControlDraft({
        draft: {
          leaseDurationSeconds: "",
          nodeId: "deleted-node",
          runnerId: "revoked-runner"
        },
        nodeOptions: buildRuntimeAssignmentNodeOptions(graph),
        runnerOptions: buildRuntimeAssignmentRunnerOptions(projection)
      })
    ).toEqual({
      leaseDurationSeconds: "3600",
      nodeId: "builder-it",
      runnerId: "runner-trusted"
    });
  });

  it("builds assignment offer requests from validated drafts", () => {
    expect(
      buildRuntimeAssignmentOfferRequest({
        ...createEmptyRuntimeAssignmentControlDraft(),
        nodeId: "user-a",
        runnerId: "runner-trusted"
      })
    ).toEqual({
      leaseDurationSeconds: 3600,
      nodeId: "user-a",
      runnerId: "runner-trusted"
    });

    expect(() =>
      buildRuntimeAssignmentOfferRequest({
        leaseDurationSeconds: "0",
        nodeId: "user-a",
        runnerId: "runner-trusted"
      })
    ).toThrow("Assignment lease duration must be a positive integer.");
  });

  it("sorts and formats assignment projections for Studio controls", () => {
    const assignments = sortAssignmentProjectionsForStudio(
      projection.assignments
    );

    expect(assignments.map((assignment) => assignment.assignmentId)).toEqual([
      "assignment-active",
      "assignment-revoked"
    ]);
    expect(formatAssignmentProjectionLabel(assignments[0]!)).toBe(
      "user-a -> runner-trusted"
    );
    expect(formatAssignmentProjectionDetail(assignments[0]!)).toBe(
      "active - assignment-active"
    );
    expect(canRevokeAssignmentProjection(assignments[0]!)).toBe(true);
    expect(canRevokeAssignmentProjection(assignments[1]!)).toBe(false);
  });
});
