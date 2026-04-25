import type { SourceHistoryRecord } from "@entangle/types";
import {
  formatRuntimeSourceHistoryDetailLines,
  formatRuntimeSourceHistoryLabel
} from "@entangle/host-client";

export function projectRuntimeSourceHistorySummary(entry: SourceHistoryRecord) {
  return {
    appliedAt: entry.appliedAt,
    candidateId: entry.candidateId,
    commit: entry.commit,
    detailLines: formatRuntimeSourceHistoryDetailLines(entry),
    label: formatRuntimeSourceHistoryLabel(entry),
    mode: entry.mode,
    nodeId: entry.nodeId,
    sourceHistoryId: entry.sourceHistoryId,
    turnId: entry.turnId
  };
}
