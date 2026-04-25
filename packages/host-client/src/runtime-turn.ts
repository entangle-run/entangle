import type { RunnerTurnRecord } from "@entangle/types";

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

  return `Trigger ${turn.triggerKind} · engine ${engineStatus} · memory ${memoryStatus}`;
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

export function formatRuntimeTurnDetailLines(
  turn: RunnerTurnRecord
): string[] {
  const handoffMessageIds = turn.emittedHandoffMessageIds ?? [];
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
    `handoff messages ${formatIdList(handoffMessageIds)}`
  );

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

    if (turn.engineOutcome.usage) {
      lines.push(
        `usage ${turn.engineOutcome.usage.inputTokens} input / ${turn.engineOutcome.usage.outputTokens} output tokens`
      );
    }

    if (turn.engineOutcome.toolExecutions.length > 0) {
      const successCount = turn.engineOutcome.toolExecutions.filter(
        (execution) => execution.outcome === "success"
      ).length;
      const errorCount = turn.engineOutcome.toolExecutions.length - successCount;

      lines.push(
        `tool executions ${turn.engineOutcome.toolExecutions.length} total (${successCount} success, ${errorCount} error)`
      );

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

  return lines;
}

function formatIdList(ids: string[]): string {
  return ids.length > 0 ? ids.join(", ") : "none";
}

function truncateRuntimeTurnDetail(value: string, maxLength = 96): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}
