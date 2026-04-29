import type {
  HostArtifactBackendCacheClearResponse,
  HostStatusResponse,
  HostTransportRelayHealth
} from "@entangle/types";

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

export function formatHostArtifactBackendCacheSummary(
  status: HostStatusResponse
): string {
  const cache = status.artifactBackendCache;

  if (!cache) {
    return "artifact backend cache not inspected";
  }

  const repositoryLabel =
    cache.repositoryCount === 1
      ? "1 repository"
      : `${cache.repositoryCount} repositories`;

  return cache.available
    ? `${repositoryLabel} · ${cache.totalSizeBytes} bytes`
    : `unavailable · ${cache.reason ?? "unknown error"}`;
}

export function formatHostArtifactBackendCacheClearSummary(
  response: HostArtifactBackendCacheClearResponse
): string {
  const repositoryLabel =
    response.repositoryCount === 1
      ? "1 repository"
      : `${response.repositoryCount} repositories`;
  const actionLabel = response.dryRun ? "dry run" : "cleared";

  return `${actionLabel} · ${repositoryLabel} · ${response.totalSizeBytes} bytes`;
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

export function formatHostTransportRelayDetail(
  relay: HostTransportRelayHealth
): string {
  return [
    `${relay.relayUrl} ${relay.status}`,
    relay.subscribedAt ? `subscribed ${relay.subscribedAt}` : undefined,
    relay.lastFailureMessage ? `failure ${relay.lastFailureMessage}` : undefined
  ].filter((part): part is string => Boolean(part)).join(" · ");
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
    `artifact backend cache ${formatHostArtifactBackendCacheSummary(status)}`,
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

  for (const relay of transport.relays) {
    detailLines.push(`transport relay ${formatHostTransportRelayDetail(relay)}`);
  }

  return detailLines;
}
