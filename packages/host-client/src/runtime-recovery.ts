import type {
  HostEventRecord,
  RuntimeRecoveryControllerRecord,
  RuntimeRecoveryPolicyRecord,
  RuntimeRecoveryRecord
} from "@entangle/types";
import {
  filterHostEvents,
  runtimeRecoveryEventTypePrefixes
} from "./event-inspection.js";

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

export function formatRuntimeRecoveryRecordLabel(
  record: RuntimeRecoveryRecord
): string {
  return `${record.recoveryId} · ${record.runtime.observedState}`;
}

export function formatRuntimeRecoveryRecordDetailLines(
  record: RuntimeRecoveryRecord
): string[] {
  const lines = [
    `recorded ${record.recordedAt}`,
    `desired ${record.runtime.desiredState}`,
    `observed ${record.runtime.observedState}`,
    `backend ${record.runtime.backendKind}`,
    `restart generation ${record.runtime.restartGeneration}`,
    `reconciliation ${record.runtime.reconciliation.state}`
  ];

  if (record.runtime.reconciliation.findingCodes.length > 0) {
    lines.push(
      `findings ${record.runtime.reconciliation.findingCodes.join(", ")}`
    );
  }

  if (record.runtime.statusMessage) {
    lines.push(`status ${record.runtime.statusMessage}`);
  }

  if (record.lastError) {
    lines.push(`last error ${record.lastError}`);
  }

  return lines;
}
