import type { RunnerTurnRecord, SourceChangeSummary } from "@entangle/types";

export function sortRuntimeTurnsForPresentation(
  turns: RunnerTurnRecord[]
): RunnerTurnRecord[] {
  return [...turns].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  );
}

export function formatRuntimeTurnLabel(turn: RunnerTurnRecord): string {
  const sessionSuffix = turn.sessionId ? ` · ${turn.sessionId}` : "";

  return `${turn.turnId} · ${turn.phase}${sessionSuffix}`;
}

export function formatRuntimeTurnStatus(turn: RunnerTurnRecord): string {
  const engineStatus = turn.engineOutcome?.stopReason ?? "pending";
  const memoryStatus = turn.memorySynthesisOutcome?.status ?? "not_run";
  const wikiStatus = turn.memoryRepositorySyncOutcome?.status ?? "not_run";
  const sourceStatus = turn.sourceChangeSummary?.status ?? "not_checked";

  return `Trigger ${turn.triggerKind} · engine ${engineStatus} · memory ${memoryStatus} · wiki repo ${wikiStatus} · source ${sourceStatus}`;
}

export function formatRuntimeTurnArtifactSummary(
  turn: RunnerTurnRecord
): string {
  const handoffMessageIds = turn.emittedHandoffMessageIds ?? [];

  return (
    `Artifacts consumed ${turn.consumedArtifactIds.length} · ` +
    `produced ${turn.producedArtifactIds.length} · ` +
    `handoffs ${handoffMessageIds.length}`
  );
}

export function formatSourceChangeSummary(
  summary: SourceChangeSummary | undefined
): string {
  if (!summary) {
    return "not checked";
  }

  if (summary.status === "changed") {
    const fileLabel = summary.fileCount === 1 ? "file" : "files";

    return `${summary.fileCount} ${fileLabel} (+${summary.additions}/-${summary.deletions})${
      summary.truncated ? " · truncated" : ""
    }`;
  }

  if (summary.status === "failed") {
    return `failed${summary.failureReason ? ` · ${summary.failureReason}` : ""}`;
  }

  if (summary.status === "not_configured") {
    return "not configured";
  }

  return "unchanged";
}

export function formatRuntimeTurnDetailLines(
  turn: RunnerTurnRecord
): string[] {
  const handoffMessageIds = turn.emittedHandoffMessageIds ?? [];
  const requestedApprovalIds = turn.requestedApprovalIds ?? [];
  const lines = [
    `started ${turn.startedAt}`,
    `updated ${turn.updatedAt}`,
    `graph ${turn.graphId}`,
    `node ${turn.nodeId}`,
    `phase ${turn.phase}`,
    `trigger ${turn.triggerKind}`
  ];

  if (turn.sessionId) {
    lines.push(`session ${turn.sessionId}`);
  }

  if (turn.conversationId) {
    lines.push(`conversation ${turn.conversationId}`);
  }

  if (turn.messageId) {
    lines.push(`message ${turn.messageId}`);
  }

  lines.push(
    `consumed artifacts ${formatIdList(turn.consumedArtifactIds)}`,
    `produced artifacts ${formatIdList(turn.producedArtifactIds)}`,
    `handoff messages ${formatIdList(handoffMessageIds)}`,
    `approval requests ${formatIdList(requestedApprovalIds)}`,
    `source change candidates ${formatIdList(turn.sourceChangeCandidateIds)}`,
    `source changes ${formatSourceChangeSummary(turn.sourceChangeSummary)}`
  );

  if (turn.sourceChangeSummary?.files.length) {
    lines.push(
      ...turn.sourceChangeSummary.files.slice(0, 5).map((file) => {
        const churn =
          file.additions > 0 || file.deletions > 0
            ? ` (+${file.additions}/-${file.deletions})`
            : "";

        return `source file ${file.status} ${file.path}${churn}`;
      })
    );
  }

  if (turn.engineRequestSummary) {
    const summary = turn.engineRequestSummary;

    lines.push(
      `engine request ${formatCount(summary.systemPromptPartCount, "system part")} / ` +
        `${formatCount(summary.interactionPromptPartCount, "task part")} (` +
        `${formatCount(summary.memoryRefCount, "memory ref")}, ` +
        `${formatCount(summary.artifactRefCount, "artifact ref")}, ` +
        `${formatCount(summary.artifactInputCount, "artifact input")}, ` +
        `${formatCount(summary.toolDefinitionCount, "tool")})`
    );
    lines.push(
      `engine request limits ${summary.executionLimits.maxToolTurns} tool turns / ` +
        `${summary.executionLimits.maxOutputTokens} output tokens; peer routes ` +
        `${summary.peerRouteContextIncluded ? "included" : "not included"}`
    );
    lines.push(
      `engine context agent ${formatIncluded(summary.agentRuntimeContextIncluded)}, ` +
        `workspace ${formatIncluded(summary.workspaceBoundaryContextIncluded)}, ` +
        `policy ${formatIncluded(summary.policyContextIncluded)}, ` +
        `memory brief ${formatIncluded(summary.memoryBriefContextIncluded)}, ` +
        `inbound ${formatIncluded(summary.inboundMessageContextIncluded)}, ` +
        `actions ${formatIncluded(summary.actionContractContextIncluded)}`
    );
  }

  if (turn.engineOutcome) {
    const provider = turn.engineOutcome.providerMetadata;

    if (provider) {
      lines.push(
        `provider ${provider.adapterKind}/${provider.profileId}${
          provider.modelId ? ` (${provider.modelId})` : ""
        }`
      );
    }

    lines.push(`engine outcome ${turn.engineOutcome.stopReason}`);

    if (turn.engineOutcome.engineSessionId) {
      lines.push(`engine session ${turn.engineOutcome.engineSessionId}`);
    }

    if (turn.engineOutcome.engineVersion) {
      lines.push(`engine version ${turn.engineOutcome.engineVersion}`);
    }

    if (turn.engineOutcome.providerStopReason) {
      lines.push(`provider stop ${turn.engineOutcome.providerStopReason}`);
    }

    if (turn.engineOutcome.failure) {
      lines.push(
        `engine failure ${turn.engineOutcome.failure.classification}: ${turn.engineOutcome.failure.message}`
      );
    }

    const permissionObservations =
      turn.engineOutcome.permissionObservations ?? [];

    if (permissionObservations.length > 0) {
      const latestPermission =
        permissionObservations[permissionObservations.length - 1]!;
      const reason = latestPermission.reason ? `: ${latestPermission.reason}` : "";
      lines.push(
        `permission ${latestPermission.decision} ${latestPermission.operation}${reason}`
      );
    }

    if (turn.engineOutcome.usage) {
      lines.push(
        `usage ${turn.engineOutcome.usage.inputTokens} input / ${turn.engineOutcome.usage.outputTokens} output tokens`
      );
    }

    if (turn.engineOutcome.toolExecutions.length > 0) {
      const toolEvidenceLines = turn.engineOutcome.toolExecutions
        .filter(
          (execution) =>
            execution.title ||
            execution.inputSummary ||
            execution.outputSummary ||
            execution.durationMs !== undefined
        )
        .slice(0, 3)
        .map((execution) => formatToolExecutionEvidenceLine(execution));
      const successCount = turn.engineOutcome.toolExecutions.filter(
        (execution) => execution.outcome === "success"
      ).length;
      const errorCount = turn.engineOutcome.toolExecutions.length - successCount;

      lines.push(
        `tool executions ${turn.engineOutcome.toolExecutions.length} total (${successCount} success, ${errorCount} error)`
      );

      lines.push(...toolEvidenceLines);

      lines.push(
        ...turn.engineOutcome.toolExecutions
          .filter((execution) => execution.outcome === "error")
          .slice(0, 3)
          .map((execution) => {
            const errorCode = execution.errorCode ?? "error";
            const message = execution.message
              ? ` - ${truncateRuntimeTurnDetail(execution.message)}`
              : "";

            return `tool error #${execution.sequence} ${execution.toolId}: ${errorCode}${message}`;
          })
      );
    }
  }

  if (turn.memorySynthesisOutcome) {
    if (turn.memorySynthesisOutcome.status === "succeeded") {
      lines.push(
        `memory synthesis succeeded with ${turn.memorySynthesisOutcome.updatedSummaryPagePaths.length} summary pages`
      );
    } else {
      lines.push(
        `memory synthesis failed: ${turn.memorySynthesisOutcome.errorMessage}`
      );
    }
  }

  if (turn.memoryRepositorySyncOutcome) {
    if (turn.memoryRepositorySyncOutcome.status === "committed") {
      lines.push(
        `wiki repository committed ${turn.memoryRepositorySyncOutcome.commit} on ${turn.memoryRepositorySyncOutcome.branch} (${turn.memoryRepositorySyncOutcome.changedFileCount} changed files)`
      );
    } else if (turn.memoryRepositorySyncOutcome.status === "unchanged") {
      lines.push(
        `wiki repository unchanged on ${turn.memoryRepositorySyncOutcome.branch}${
          turn.memoryRepositorySyncOutcome.commit
            ? ` at ${turn.memoryRepositorySyncOutcome.commit}`
            : ""
        }`
      );
    } else {
      lines.push(
        `wiki repository ${turn.memoryRepositorySyncOutcome.status}: ${turn.memoryRepositorySyncOutcome.reason}`
      );
    }
  }

  return lines;
}

function formatIdList(ids: string[]): string {
  return ids.length > 0 ? ids.join(", ") : "none";
}

function formatCount(
  count: number,
  singular: string,
  plural = `${singular}s`
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatIncluded(included: boolean): string {
  return included ? "included" : "not included";
}

function formatToolExecutionEvidenceLine(
  execution: NonNullable<
    RunnerTurnRecord["engineOutcome"]
  >["toolExecutions"][number]
): string {
  const title = execution.title ? `: ${execution.title}` : "";
  const duration =
    execution.durationMs !== undefined ? ` (${execution.durationMs}ms)` : "";
  const input = execution.inputSummary
    ? ` input ${truncateRuntimeTurnDetail(execution.inputSummary)}`
    : "";
  const output = execution.outputSummary
    ? ` output ${truncateRuntimeTurnDetail(execution.outputSummary)}`
    : "";

  return `tool #${execution.sequence} ${execution.toolId}${title}${duration}${input}${output}`;
}

function truncateRuntimeTurnDetail(value: string, maxLength = 96): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}
