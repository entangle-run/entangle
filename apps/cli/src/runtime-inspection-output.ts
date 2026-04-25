import {
  formatRuntimeInspectionDetailLines,
  formatRuntimeInspectionLabel,
  formatRuntimeInspectionStatus
} from "@entangle/host-client";
import type { RuntimeInspectionResponse } from "@entangle/types";

export type RuntimeInspectionCliSummary = {
  backendKind: string;
  contextAvailable: boolean;
  desiredState: string;
  detailLines: string[];
  findingCodes: string[];
  label: string;
  nodeId: string;
  observedState: string;
  reconciliationState: string;
  restartGeneration: number;
  status: string;
};

export function projectRuntimeInspectionSummary(
  runtime: RuntimeInspectionResponse
): RuntimeInspectionCliSummary {
  return {
    backendKind: runtime.backendKind,
    contextAvailable: runtime.contextAvailable,
    desiredState: runtime.desiredState,
    detailLines: formatRuntimeInspectionDetailLines(runtime),
    findingCodes: runtime.reconciliation.findingCodes,
    label: formatRuntimeInspectionLabel(runtime),
    nodeId: runtime.nodeId,
    observedState: runtime.observedState,
    reconciliationState: runtime.reconciliation.state,
    restartGeneration: runtime.restartGeneration,
    status: formatRuntimeInspectionStatus(runtime)
  };
}
