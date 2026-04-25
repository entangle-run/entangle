import {
  sourceChangeCandidateRecordSchema,
  type RunnerTurnRecord,
  type SourceChangeCandidateRecord
} from "@entangle/types";
import type { SourceChangeHarvestResult } from "./source-change-harvester.js";

function nowIsoString(): string {
  return new Date().toISOString();
}

export function buildSourceChangeCandidateRecord(input: {
  harvestResult: SourceChangeHarvestResult;
  turnRecord: RunnerTurnRecord;
}): SourceChangeCandidateRecord | undefined {
  if (input.harvestResult.summary.status !== "changed") {
    return undefined;
  }

  const timestamp = nowIsoString();

  return sourceChangeCandidateRecordSchema.parse({
    candidateId: `source-change-${input.turnRecord.turnId}`,
    ...(input.turnRecord.conversationId
      ? { conversationId: input.turnRecord.conversationId }
      : {}),
    createdAt: timestamp,
    graphId: input.turnRecord.graphId,
    nodeId: input.turnRecord.nodeId,
    ...(input.turnRecord.sessionId ? { sessionId: input.turnRecord.sessionId } : {}),
    ...(input.harvestResult.snapshot
      ? { snapshot: input.harvestResult.snapshot }
      : {}),
    sourceChangeSummary: input.harvestResult.summary,
    status: "pending_review",
    turnId: input.turnRecord.turnId,
    updatedAt: timestamp
  });
}
