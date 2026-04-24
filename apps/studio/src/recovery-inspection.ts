import {
  filterHostEvents,
  runtimeRecoveryEventTypePrefixes
} from "@entangle/host-client";
import type {
  HostEventRecord,
  RuntimeInspectionResponse,
  RuntimeRecoveryControllerRecord,
  RuntimeRecoveryPolicyMutationRequest,
  RuntimeRecoveryPolicyRecord
} from "@entangle/types";

export type RuntimeRecoveryPolicyDraft = {
  cooldownSeconds: string;
  maxAttempts: string;
  mode: RuntimeRecoveryPolicyMutationRequest["mode"];
};

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

export function createRuntimeRecoveryPolicyDraft(
  policyRecord?: RuntimeRecoveryPolicyRecord | null
): RuntimeRecoveryPolicyDraft {
  if (!policyRecord || policyRecord.policy.mode === "manual") {
    return {
      cooldownSeconds: "300",
      maxAttempts: "3",
      mode: "manual"
    };
  }

  return {
    cooldownSeconds: String(policyRecord.policy.cooldownSeconds),
    maxAttempts: String(policyRecord.policy.maxAttempts),
    mode: "restart_on_failure"
  };
}

export function isRuntimeRecoveryPolicyDraftValid(
  draft: RuntimeRecoveryPolicyDraft
): boolean {
  if (draft.mode === "manual") {
    return true;
  }

  const cooldownSeconds = Number.parseInt(draft.cooldownSeconds, 10);
  const maxAttempts = Number.parseInt(draft.maxAttempts, 10);

  return (
    Number.isInteger(cooldownSeconds) &&
    Number.isInteger(maxAttempts) &&
    String(cooldownSeconds) === draft.cooldownSeconds.trim() &&
    String(maxAttempts) === draft.maxAttempts.trim() &&
    cooldownSeconds >= 0 &&
    cooldownSeconds <= 3600 &&
    maxAttempts >= 1 &&
    maxAttempts <= 20
  );
}

export function buildRuntimeRecoveryPolicyMutationRequest(
  draft: RuntimeRecoveryPolicyDraft
): RuntimeRecoveryPolicyMutationRequest {
  if (draft.mode === "manual") {
    return {
      mode: "manual"
    };
  }

  if (!isRuntimeRecoveryPolicyDraftValid(draft)) {
    throw new Error(
      "Recovery policy must use integer max attempts 1-20 and cooldown seconds 0-3600."
    );
  }

  return {
    cooldownSeconds: Number.parseInt(draft.cooldownSeconds, 10),
    maxAttempts: Number.parseInt(draft.maxAttempts, 10),
    mode: "restart_on_failure"
  };
}

export function hasRuntimeRecoveryPolicyDraftChanged(
  policyRecord: RuntimeRecoveryPolicyRecord | null,
  draft: RuntimeRecoveryPolicyDraft
): boolean {
  if (!policyRecord || !isRuntimeRecoveryPolicyDraftValid(draft)) {
    return false;
  }

  return (
    JSON.stringify(policyRecord.policy) !==
    JSON.stringify(buildRuntimeRecoveryPolicyMutationRequest(draft))
  );
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
