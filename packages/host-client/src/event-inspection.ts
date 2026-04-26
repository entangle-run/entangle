import type { HostEventRecord } from "@entangle/types";

export interface HostEventFilter {
  categories?: HostEventRecord["category"][];
  nodeId?: string;
  typePrefixes?: string[];
}

export const runtimeRecoveryEventTypePrefixes = [
  "runtime.recovery.",
  "runtime.restart.requested",
  "runtime.observed_state.changed"
] as const;

export const runtimeTraceEventTypePrefixes = [
  "session.updated",
  "conversation.trace.event",
  "approval.trace.event",
  "artifact.trace.event",
  "runner.turn.updated",
  "source_change_candidate.reviewed",
  "source_history.updated",
  "source_history.published",
  "source_history.replayed",
  "wiki_repository.published"
] as const;

function eventHasNodeId(
  event: HostEventRecord
): event is HostEventRecord & { nodeId: string } {
  return "nodeId" in event && typeof event.nodeId === "string";
}

export function hostEventMatchesFilter(
  event: HostEventRecord,
  filter: HostEventFilter
): boolean {
  if (filter.categories && !filter.categories.includes(event.category)) {
    return false;
  }

  if (filter.nodeId) {
    if (!eventHasNodeId(event) || event.nodeId !== filter.nodeId) {
      return false;
    }
  }

  if (filter.typePrefixes && filter.typePrefixes.length > 0) {
    const matchesTypePrefix = filter.typePrefixes.some(
      (typePrefix) =>
        event.type === typePrefix || event.type.startsWith(typePrefix)
    );

    if (!matchesTypePrefix) {
      return false;
    }
  }

  return true;
}

export function filterHostEvents(
  events: HostEventRecord[],
  filter: HostEventFilter
): HostEventRecord[] {
  return events.filter((event) => hostEventMatchesFilter(event, filter));
}
