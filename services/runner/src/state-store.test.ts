import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { SessionRecord } from "@entangle/types";
import { afterEach, describe, expect, it } from "vitest";
import {
  ensureRunnerStatePaths,
  readSessionRecord,
  writeSessionRecord,
  type RunnerStatePaths
} from "./state-store.js";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((temporaryRoot) =>
      rm(temporaryRoot, { force: true, recursive: true })
    )
  );
});

async function createStatePaths(): Promise<RunnerStatePaths> {
  const runtimeRoot = await mkdtemp(
    path.join(os.tmpdir(), "entangle-runner-state-store-")
  );
  temporaryRoots.push(runtimeRoot);

  return ensureRunnerStatePaths(runtimeRoot);
}

function buildSessionRecord(index: number): SessionRecord {
  return {
    activeConversationIds: [`conversation-${index}`],
    entrypointNodeId: "lead-it",
    graphId: "graph-alpha",
    intent: `Persist a large turn snapshot ${index}: ${"x".repeat(200_000)}`,
    lastMessageType: "task.update",
    openedAt: "2026-04-24T11:00:00.000Z",
    originatingNodeId: "lead-it",
    ownerNodeId: "worker-it",
    rootArtifactIds: [],
    sessionId: "session-alpha",
    status: "active",
    traceId: "trace-alpha",
    updatedAt: `2026-04-24T11:${String(index % 60).padStart(2, "0")}:00.000Z`,
    waitingApprovalIds: []
  };
}

describe("runner state store", () => {
  it("keeps session records readable while overwriting them", async () => {
    const statePaths = await createStatePaths();
    const readErrors: unknown[] = [];
    let writing = true;

    await writeSessionRecord(statePaths, buildSessionRecord(0));

    const reader = (async () => {
      while (writing) {
        try {
          const record = await readSessionRecord(statePaths, "session-alpha");

          if (record?.sessionId !== "session-alpha") {
            readErrors.push(new Error("read returned a missing session record"));
          }
        } catch (error) {
          readErrors.push(error);
        }

        await new Promise((resolve) => {
          setTimeout(resolve, 0);
        });
      }
    })();

    try {
      for (let index = 1; index <= 80; index += 1) {
        await writeSessionRecord(statePaths, buildSessionRecord(index));
      }
    } finally {
      writing = false;
    }

    await reader;

    const finalRecord = await readSessionRecord(statePaths, "session-alpha");
    expect(readErrors).toEqual([]);
    expect(finalRecord?.activeConversationIds).toEqual(["conversation-80"]);
  });
});
