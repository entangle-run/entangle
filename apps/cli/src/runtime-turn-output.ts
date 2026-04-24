import {
  formatRuntimeTurnArtifactSummary,
  formatRuntimeTurnDetailLines,
  formatRuntimeTurnLabel,
  formatRuntimeTurnStatus
} from "@entangle/host-client";
import type { RunnerTurnRecord } from "@entangle/types";

export interface RuntimeTurnSummaryRecord {
  artifactSummary: string;
  detailLines: string[];
  label: string;
  phase: RunnerTurnRecord["phase"];
  sessionId?: string;
  status: string;
  turnId: string;
  updatedAt: string;
}

export function projectRuntimeTurnSummary(
  turn: RunnerTurnRecord
): RuntimeTurnSummaryRecord {
  return {
    artifactSummary: formatRuntimeTurnArtifactSummary(turn),
    detailLines: formatRuntimeTurnDetailLines(turn),
    label: formatRuntimeTurnLabel(turn),
    phase: turn.phase,
    ...(turn.sessionId ? { sessionId: turn.sessionId } : {}),
    status: formatRuntimeTurnStatus(turn),
    turnId: turn.turnId,
    updatedAt: turn.updatedAt
  };
}
