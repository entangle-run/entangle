import {
  describeRuntimeRecoveryController,
  describeRuntimeRecoveryPolicy,
  formatRuntimeRecoveryRecordDetailLines,
  formatRuntimeRecoveryRecordLabel
} from "@entangle/host-client";
import type {
  RuntimeRecoveryInspectionResponse,
  RuntimeRecoveryRecord
} from "@entangle/types";

export interface RuntimeRecoveryEntryCliSummaryRecord {
  detailLines: string[];
  label: string;
  observedState: RuntimeRecoveryRecord["runtime"]["observedState"];
  recordedAt: string;
  recoveryId: string;
  restartGeneration: number;
}

export interface RuntimeRecoveryCliSummaryRecord {
  controller: string;
  controllerState: RuntimeRecoveryInspectionResponse["controller"]["state"];
  currentObservedState?: NonNullable<
    RuntimeRecoveryInspectionResponse["currentRuntime"]
  >["observedState"];
  entries: RuntimeRecoveryEntryCliSummaryRecord[];
  nodeId: string;
  policy: string;
  policyMode: RuntimeRecoveryInspectionResponse["policy"]["policy"]["mode"];
}

export function projectRuntimeRecoverySummary(
  recovery: RuntimeRecoveryInspectionResponse
): RuntimeRecoveryCliSummaryRecord {
  return {
    controller: describeRuntimeRecoveryController(recovery.controller),
    controllerState: recovery.controller.state,
    ...(recovery.currentRuntime
      ? { currentObservedState: recovery.currentRuntime.observedState }
      : {}),
    entries: recovery.entries.map((entry) => ({
      detailLines: formatRuntimeRecoveryRecordDetailLines(entry),
      label: formatRuntimeRecoveryRecordLabel(entry),
      observedState: entry.runtime.observedState,
      recordedAt: entry.recordedAt,
      recoveryId: entry.recoveryId,
      restartGeneration: entry.runtime.restartGeneration
    })),
    nodeId: recovery.nodeId,
    policy: describeRuntimeRecoveryPolicy(recovery.policy),
    policyMode: recovery.policy.policy.mode
  };
}
