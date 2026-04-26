import type { HostEventRecord } from "@entangle/types";

const overviewRefreshEventTypes = new Set<HostEventRecord["type"]>([
  "package_source.admitted",
  "package_source.deleted",
  "external_principal.updated",
  "external_principal.deleted",
  "graph.revision.applied",
  "node.binding.updated",
  "edge.updated",
  "runtime.desired_state.changed",
  "runtime.observed_state.changed",
  "runtime.restart.requested",
  "session.updated",
  "session.cancellation.requested",
  "conversation.trace.event",
  "host.reconciliation.completed"
]);

const selectedRuntimeRefreshEventTypes = new Set<HostEventRecord["type"]>([
  "runtime.desired_state.changed",
  "runtime.observed_state.changed",
  "runtime.restart.requested",
  "runtime.recovery_policy.updated",
  "runtime.recovery.attempted",
  "runtime.recovery.exhausted",
  "runtime.recovery.recorded",
  "runtime.recovery_controller.updated",
  "session.updated",
  "session.cancellation.requested",
  "runner.turn.updated",
  "conversation.trace.event",
  "approval.trace.event",
  "artifact.trace.event",
  "source_history.updated",
  "source_history.published",
  "source_history.replayed"
]);

export function shouldRefreshOverviewFromHostEvent(
  event: HostEventRecord
): boolean {
  return overviewRefreshEventTypes.has(event.type);
}

export function shouldRefreshSelectedRuntimeFromHostEvent(
  event: HostEventRecord,
  selectedRuntimeId: string | null
): boolean {
  if (!selectedRuntimeId || !("nodeId" in event) || event.nodeId !== selectedRuntimeId) {
    return false;
  }

  return selectedRuntimeRefreshEventTypes.has(event.type);
}
