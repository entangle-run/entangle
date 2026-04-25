import type { RuntimeInspectionResponse } from "@entangle/types";

export function sortRuntimeInspectionsForPresentation(
  runtimes: RuntimeInspectionResponse[]
): RuntimeInspectionResponse[] {
  return [...runtimes].sort((left, right) =>
    left.nodeId.localeCompare(right.nodeId)
  );
}

export function formatRuntimeInspectionLabel(
  runtime: RuntimeInspectionResponse
): string {
  return `${runtime.nodeId} · ${runtime.observedState}`;
}

export function formatRuntimeInspectionStatus(
  runtime: RuntimeInspectionResponse
): string {
  const findings =
    runtime.reconciliation.findingCodes.length > 0
      ? ` · findings ${runtime.reconciliation.findingCodes.join(", ")}`
      : "";

  return `${runtime.desiredState}/${runtime.observedState} · reconciliation ${runtime.reconciliation.state}${findings}`;
}

export function formatRuntimeInspectionDetailLines(
  runtime: RuntimeInspectionResponse
): string[] {
  const detailLines = [
    `graph ${runtime.graphId}@${runtime.graphRevisionId}`,
    `backend ${runtime.backendKind}`,
    `context ${runtime.contextAvailable ? "available" : "unavailable"}`,
    `restart generation ${runtime.restartGeneration}`
  ];

  if (runtime.packageSourceId) {
    detailLines.push(`package source ${runtime.packageSourceId}`);
  }

  if (runtime.runtimeHandle) {
    detailLines.push(`runtime handle ${runtime.runtimeHandle}`);
  }

  if (runtime.statusMessage) {
    detailLines.push(`status ${runtime.statusMessage}`);
  }

  if (runtime.reason) {
    detailLines.push(`reason ${runtime.reason}`);
  }

  if (runtime.primaryGitRepositoryProvisioning) {
    const provisioning = runtime.primaryGitRepositoryProvisioning;
    const target = provisioning.target;
    const created =
      provisioning.created === undefined
        ? ""
        : ` · created ${provisioning.created ? "yes" : "no"}`;

    detailLines.push(
      `git provisioning ${provisioning.state}${created} · ${target.gitServiceRef}/${target.namespace}/${target.repositoryName}`
    );

    if (provisioning.lastError) {
      detailLines.push(`git provisioning error ${provisioning.lastError}`);
    }
  }

  return detailLines;
}
