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

  if (runtime.agentRuntime) {
    const runtimeProfile = [
      runtime.agentRuntime.mode,
      runtime.agentRuntime.engineKind,
      runtime.agentRuntime.engineProfileRef
    ]
      .filter((value): value is string => Boolean(value))
      .join(" / ");
    detailLines.push(`agent runtime ${runtimeProfile}`);

    if (runtime.agentRuntime.defaultAgent) {
      detailLines.push(`default agent ${runtime.agentRuntime.defaultAgent}`);
    }

    if (runtime.agentRuntime.lastEngineSessionId) {
      detailLines.push(
        `last engine session ${runtime.agentRuntime.lastEngineSessionId}`
      );
    }

    if (runtime.agentRuntime.lastEngineVersion) {
      detailLines.push(
        `last engine version ${runtime.agentRuntime.lastEngineVersion}`
      );
    }

    if (runtime.agentRuntime.lastEngineStopReason) {
      detailLines.push(
        `last engine stop ${runtime.agentRuntime.lastEngineStopReason}`
      );
    }

    if (runtime.agentRuntime.lastTurnId) {
      detailLines.push(
        `last engine turn ${runtime.agentRuntime.lastTurnId} updated ${runtime.agentRuntime.lastTurnUpdatedAt ?? "unknown"}`
      );
    }

    if (runtime.agentRuntime.lastEngineFailureClassification) {
      detailLines.push(
        `last engine failure ${runtime.agentRuntime.lastEngineFailureClassification}: ${runtime.agentRuntime.lastEngineFailureMessage ?? "No failure message recorded."}`
      );
    }
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
