import { describeRuntimeTraceEvent } from "@entangle/host-client";
import type { HostEventRecord } from "@entangle/types";

export interface RuntimeTraceSummaryRecord {
  detailLines: string[];
  eventId: string;
  label: string;
  message: string;
  timestamp: string;
  type: HostEventRecord["type"];
}

export function projectRuntimeTraceSummary(
  event: HostEventRecord
): RuntimeTraceSummaryRecord {
  const presentation = describeRuntimeTraceEvent(event);

  return {
    detailLines: presentation.detailLines,
    eventId: event.eventId,
    label: presentation.label,
    message: event.message,
    timestamp: event.timestamp,
    type: event.type
  };
}
