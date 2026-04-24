import {
  filterHostEvents,
  runtimeTraceEventTypePrefixes
} from "@entangle/host-client";
import type { HostEventRecord } from "@entangle/types";

export function collectRuntimeTraceEvents(
  events: HostEventRecord[],
  nodeId: string,
  limit = 16
): HostEventRecord[] {
  return filterHostEvents(events, {
    nodeId,
    typePrefixes: [...runtimeTraceEventTypePrefixes]
  }).slice(0, limit);
}

export function formatRuntimeTraceEventLabel(event: HostEventRecord): string {
  switch (event.type) {
    case "session.updated":
      return `Session ${event.sessionId} moved to ${event.status}`;
    case "conversation.trace.event":
      return `Conversation ${event.conversationId} moved to ${event.status}`;
    case "approval.trace.event":
      return `Approval ${event.approvalId} is ${event.status}`;
    case "artifact.trace.event": {
      const state =
        event.retrievalState ??
        event.publicationState ??
        event.lifecycleState ??
        "observed";

      return `Artifact ${event.artifactId} is ${state}`;
    }
    case "runner.turn.updated":
      return `Turn ${event.turnId} is ${event.phase}`;
    default:
      return event.type;
  }
}
