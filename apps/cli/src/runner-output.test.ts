import { describe, expect, it } from "vitest";
import type { RunnerRegistryEntry } from "@entangle/types";
import {
  projectRunnerRegistrySummary,
  sortRunnerRegistryEntriesForPresentation
} from "./runner-output.js";

function buildRunnerEntry(input: {
  liveness?: "online" | "stale" | "offline" | "unknown";
  runnerId: string;
  trustState?: "pending" | "trusted" | "revoked";
}): RunnerRegistryEntry {
  return {
    heartbeat: {
      assignmentIds: ["assignment-alpha"],
      hostAuthorityPubkey:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      lastHeartbeatAt: "2026-04-26T12:00:01.000Z",
      operationalState: "ready",
      runnerId: input.runnerId,
      runnerPubkey: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      schemaVersion: "1",
      updatedAt: "2026-04-26T12:00:01.000Z"
    },
    liveness: input.liveness ?? "online",
    offlineAfterSeconds: 300,
    projectedAt: "2026-04-26T12:00:02.000Z",
    registration: {
      capabilities: {
        agentEngineKinds: ["opencode_server"],
        labels: [],
        maxAssignments: 1,
        runtimeKinds: ["agent_runner"],
        supportsLocalWorkspace: true,
        supportsNip59: true
      },
      firstSeenAt: "2026-04-26T12:00:00.000Z",
      hostAuthorityPubkey:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      lastSeenAt: "2026-04-26T12:00:01.000Z",
      publicKey: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      runnerId: input.runnerId,
      schemaVersion: "1",
      trustState: input.trustState ?? "pending",
      updatedAt: "2026-04-26T12:00:01.000Z"
    },
    staleAfterSeconds: 60
  };
}

describe("runner registry CLI output", () => {
  it("sorts and projects compact runner summaries", () => {
    const runners = [
      buildRunnerEntry({ runnerId: "runner-z" }),
      buildRunnerEntry({ runnerId: "runner-a", trustState: "trusted" })
    ];

    expect(
      sortRunnerRegistryEntriesForPresentation(runners).map(
        (runner) => runner.registration.runnerId
      )
    ).toEqual(["runner-a", "runner-z"]);
    expect(projectRunnerRegistrySummary(runners[1])).toMatchObject({
      assignmentIds: ["assignment-alpha"],
      liveness: "online",
      operationalState: "ready",
      runnerId: "runner-a",
      trustState: "trusted"
    });
  });
});
