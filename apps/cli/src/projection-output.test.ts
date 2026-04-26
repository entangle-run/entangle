import { describe, expect, it } from "vitest";
import type { HostProjectionSnapshot } from "@entangle/types";
import {
  projectHostProjectionSummary,
  projectRuntimeProjectionSummary,
  sortRuntimeProjectionsForCli
} from "./projection-output.js";

const projection: HostProjectionSnapshot = {
  artifactRefs: [],
  assignments: [],
  freshness: "current",
  generatedAt: "2026-04-26T12:00:00.000Z",
  hostAuthorityPubkey:
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  runtimes: [
    {
      assignmentId: "assignment-alpha",
      backendKind: "federated",
      desiredState: "running",
      graphId: "team-alpha",
      graphRevisionId: "team-alpha-rev-1",
      hostAuthorityPubkey:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      lastSeenAt: "2026-04-26T12:00:00.000Z",
      nodeId: "worker-b",
      observedState: "running",
      projection: {
        source: "observation_event",
        updatedAt: "2026-04-26T12:00:00.000Z"
      },
      restartGeneration: 0,
      runnerId: "runner-alpha",
      runtimeHandle: "federated:runner-alpha:assignment-alpha"
    },
    {
      backendKind: "federated",
      desiredState: "running",
      graphId: "team-alpha",
      graphRevisionId: "team-alpha-rev-1",
      hostAuthorityPubkey:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      nodeId: "worker-a",
      observedState: "missing",
      projection: {
        source: "desired_state",
        updatedAt: "2026-04-26T12:00:00.000Z"
      },
      restartGeneration: 0
    }
  ],
  runners: [],
  schemaVersion: "1",
  sourceChangeRefs: [],
  userConversations: [],
  wikiRefs: []
};

describe("projection CLI output", () => {
  it("sorts runtime projection records for stable output", () => {
    expect(
      sortRuntimeProjectionsForCli(projection.runtimes).map(
        (runtime) => runtime.nodeId
      )
    ).toEqual(["worker-a", "worker-b"]);
  });

  it("projects compact runtime summaries", () => {
    expect(projectRuntimeProjectionSummary(projection.runtimes[0]!)).toMatchObject({
      assignmentId: "assignment-alpha",
      nodeId: "worker-b",
      observedState: "running",
      projectionSource: "observation_event",
      runnerId: "runner-alpha"
    });
  });

  it("projects compact Host projection summaries", () => {
    expect(projectHostProjectionSummary(projection)).toMatchObject({
      failedRuntimeCount: 0,
      runtimeCount: 2,
      runningRuntimeCount: 1,
      runtimes: [
        {
          nodeId: "worker-a",
          observedState: "missing"
        },
        {
          nodeId: "worker-b",
          observedState: "running"
        }
      ]
    });
  });
});
