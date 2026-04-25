import type {
  RuntimeInspectionResponse,
  RuntimeRecoveryPolicyMutationRequest,
  RuntimeRecoveryPolicyRecord
} from "@entangle/types";

export {
  collectRuntimeRecoveryEvents,
  describeRuntimeRecoveryController,
  describeRuntimeRecoveryPolicy,
  formatRuntimeRecoveryEventLabel
} from "@entangle/host-client";

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
