import {
  formatHostStateLayoutSummary,
  formatHostSecuritySummary,
  formatHostStatusDetailLines,
  formatHostStatusLabel,
  formatHostStatusReconciliationSummary,
  formatHostStatusSessionDiagnosticsSummary,
  formatHostTransportControlObserveSummary
} from "@entangle/host-client";
import type { HostStatusResponse } from "@entangle/types";

export type HostStatusCliSummary = {
  detailLines: string[];
  graphRevisionId?: string;
  label: string;
  reconciliation: {
    backendKind: string;
    blockedRuntimeCount: number;
    degradedRuntimeCount: number;
    failedRuntimeCount: number;
    findingCodes: string[];
    issueCount: number;
    lastReconciledAt?: string;
    managedRuntimeCount: number;
    runningRuntimeCount: number;
    stoppedRuntimeCount: number;
    summary: string;
    transitioningRuntimeCount: number;
  };
  runtimeCounts: HostStatusResponse["runtimeCounts"];
  security: HostStatusResponse["security"] & {
    summary: string;
  };
  service: string;
  sessionDiagnostics?: NonNullable<HostStatusResponse["sessionDiagnostics"]> & {
    summary: string;
  };
  stateLayout: HostStatusResponse["stateLayout"] & {
    summary: string;
  };
  status: string;
  timestamp: string;
  transport: HostStatusResponse["transport"] & {
    controlObserve: HostStatusResponse["transport"]["controlObserve"] & {
      summary: string;
    };
  };
};

export function projectHostStatusSummary(
  status: HostStatusResponse
): HostStatusCliSummary {
  return {
    detailLines: formatHostStatusDetailLines(status),
    ...(status.graphRevisionId ? { graphRevisionId: status.graphRevisionId } : {}),
    label: formatHostStatusLabel(status),
    reconciliation: {
      backendKind: status.reconciliation.backendKind,
      blockedRuntimeCount: status.reconciliation.blockedRuntimeCount,
      degradedRuntimeCount: status.reconciliation.degradedRuntimeCount,
      failedRuntimeCount: status.reconciliation.failedRuntimeCount,
      findingCodes: status.reconciliation.findingCodes,
      issueCount: status.reconciliation.issueCount,
      ...(status.reconciliation.lastReconciledAt
        ? { lastReconciledAt: status.reconciliation.lastReconciledAt }
        : {}),
      managedRuntimeCount: status.reconciliation.managedRuntimeCount,
      runningRuntimeCount: status.reconciliation.runningRuntimeCount,
      stoppedRuntimeCount: status.reconciliation.stoppedRuntimeCount,
      summary: formatHostStatusReconciliationSummary(status),
      transitioningRuntimeCount: status.reconciliation.transitioningRuntimeCount
    },
    runtimeCounts: status.runtimeCounts,
    security: {
      ...status.security,
      summary: formatHostSecuritySummary(status)
    },
    service: status.service,
    ...(status.sessionDiagnostics
      ? {
          sessionDiagnostics: {
            ...status.sessionDiagnostics,
            summary: formatHostStatusSessionDiagnosticsSummary(status)
          }
        }
      : {}),
    status: status.status,
    stateLayout: {
      ...status.stateLayout,
      summary: formatHostStateLayoutSummary(status)
    },
    timestamp: status.timestamp,
    transport: {
      ...status.transport,
      controlObserve: {
        ...status.transport.controlObserve,
        summary: formatHostTransportControlObserveSummary(status)
      }
    }
  };
}
