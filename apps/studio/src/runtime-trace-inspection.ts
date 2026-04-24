import {
  collectRuntimeTraceEvents,
  describeRuntimeTraceEvent,
  formatRuntimeTraceEventLabel
} from "@entangle/host-client";
import type { HostEventRecord } from "@entangle/types";

export { collectRuntimeTraceEvents, formatRuntimeTraceEventLabel };

export function formatRuntimeTraceEventDetailLines(
  event: HostEventRecord
): string[] {
  return describeRuntimeTraceEvent(event).detailLines;
}
