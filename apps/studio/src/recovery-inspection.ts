import {
  filterHostEvents,
  runtimeRecoveryEventTypePrefixes
} from "@entangle/host-client";
import type {
  HostEventRecord,
  RuntimeInspectionResponse,
  RuntimeRecoveryControllerRecord,
  RuntimeRecoveryPolicyRecord
} from "@entangle/types";

export function deriveSelectedRuntimeId(
  runtimes: RuntimeInspectionResponse[],
  selectedRuntimeId: string | null
): string | null {
  if (selectedRuntimeId && runtimes.some((runtime) => runtime.nodeId === selectedRuntimeId)) {
    return selectedRuntimeId;
  }

  return runtimes[0]?.nodeId ?? null;
}

export function describeRuntimeRecoveryPolicy(
  policyRecord: RuntimeRecoveryPolicyRecord
): string {
  if (policyRecord.policy.mode === "manual") {
    return "Manual recovery only";
  }

  return `Restart on failure, max ${policyRecord.policy.maxAttempts} attempts, cooldown ${policyRecord.policy.cooldownSeconds}s`;
}

export function describeRuntimeRecoveryController(
  controller: RuntimeRecoveryControllerRecord
): string {
  switch (controller.state) {
    case "idle":
      return controller.attemptsUsed > 0
        ? `Idle after ${controller.attemptsUsed} recovery attempts`
        : "Idle";
    case "manual_required":
      return "Manual intervention required";
    case "cooldown":
      return controller.nextEligibleAt
        ? `Cooldown until ${controller.nextEligibleAt}`
        : "Cooldown before the next automatic recovery attempt";
    case "exhausted":
      return `Automatic recovery exhausted after ${controller.attemptsUsed} attempts`;
  }
}

export function collectRuntimeRecoveryEvents(
  events: HostEventRecord[],
  nodeId: string,
  limit = 12
): HostEventRecord[] {
  return filterHostEvents(events, {
    nodeId,
    typePrefixes: [...runtimeRecoveryEventTypePrefixes]
  }).slice(0, limit);
}

export function formatRuntimeRecoveryEventLabel(event: HostEventRecord): string {
  switch (event.type) {
    case "runtime.recovery.recorded":
      return `Recovery snapshot recorded (${event.observedState})`;
    case "runtime.recovery_controller.updated":
      return `Recovery controller moved to ${event.controller.state}`;
    case "runtime.recovery_policy.updated":
      return `Recovery policy set to ${event.policy.mode}`;
    case "runtime.recovery.attempted":
      return `Recovery attempt ${event.attemptNumber}/${event.maxAttempts}`;
    case "runtime.recovery.exhausted":
      return `Recovery exhausted after ${event.attemptsUsed} attempts`;
    case "runtime.restart.requested":
      return `Deterministic restart requested (${event.restartGeneration})`;
    case "runtime.observed_state.changed":
      return `Observed runtime state is ${event.observedState}`;
    default:
      return event.type;
  }
}
