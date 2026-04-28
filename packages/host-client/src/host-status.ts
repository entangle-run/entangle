import type { HostStatusResponse } from "@entangle/types";

export function formatHostStatusLabel(status: HostStatusResponse): string {
  return `${status.service} · ${status.status}`;
}

export function formatHostStatusReconciliationSummary(
  status: HostStatusResponse
): string {
  const reconciliation = status.reconciliation;

  return `${reconciliation.managedRuntimeCount} runtimes · ${reconciliation.issueCount} issues · ${reconciliation.degradedRuntimeCount} degraded · ${reconciliation.blockedRuntimeCount} blocked`;
}

export function formatHostStatusSessionDiagnosticsSummary(
  status: HostStatusResponse
): string {
  const diagnostics = status.sessionDiagnostics;

  if (!diagnostics) {
    return "sessions not inspected";
  }

  return (
    `${diagnostics.inspectedSessionCount} sessions · ` +
    `${diagnostics.consistencyFindingCount} consistency findings · ` +
    `${diagnostics.sessionsWithConsistencyFindings} affected`
  );
}

export function formatHostStateLayoutSummary(status: HostStatusResponse): string {
  const layout = status.stateLayout;
  const recordedLayoutVersion = layout.recordedLayoutVersion ?? "unknown";

  return `v${recordedLayoutVersion} · ${layout.status}`;
}

export function formatHostTransportControlObserveSummary(
  status: HostStatusResponse
): string {
  const transport = status.transport.controlObserve;
  const relayLabel =
    transport.configuredRelayCount === 1
      ? "1 relay"
      : `${transport.configuredRelayCount} relays`;

  return `${transport.status} · ${relayLabel}`;
}

export function formatHostStatusDetailLines(
  status: HostStatusResponse
): string[] {
  const reconciliation = status.reconciliation;
  const transport = status.transport.controlObserve;
  const detailLines = [
    `timestamp ${status.timestamp}`,
    `state layout ${formatHostStateLayoutSummary(status)}`,
    `transport control/observe ${formatHostTransportControlObserveSummary(status)}`,
    `runtime counts desired ${status.runtimeCounts.desired}, observed ${status.runtimeCounts.observed}, running ${status.runtimeCounts.running}`,
    `reconciliation ${formatHostStatusReconciliationSummary(status)}`,
    `session diagnostics ${formatHostStatusSessionDiagnosticsSummary(status)}`,
    `backend ${reconciliation.backendKind}`,
    `running ${reconciliation.runningRuntimeCount}, stopped ${reconciliation.stoppedRuntimeCount}, failed ${reconciliation.failedRuntimeCount}, transitioning ${reconciliation.transitioningRuntimeCount}`
  ];

  if (status.graphRevisionId) {
    detailLines.push(`graph revision ${status.graphRevisionId}`);
  }

  if (reconciliation.findingCodes.length > 0) {
    detailLines.push(`findings ${reconciliation.findingCodes.join(", ")}`);
  }

  if (reconciliation.lastReconciledAt) {
    detailLines.push(`last reconciled ${reconciliation.lastReconciledAt}`);
  }

  if (transport.subscribedAt) {
    detailLines.push(`transport subscribed ${transport.subscribedAt}`);
  }

  if (transport.lastFailureMessage) {
    detailLines.push(`transport failure ${transport.lastFailureMessage}`);
  }

  if (transport.relayUrls.length > 0) {
    detailLines.push(`transport relays ${transport.relayUrls.join(", ")}`);
  }

  return detailLines;
}
