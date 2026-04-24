import type { HostEventRecord } from "@entangle/types";
import { filterHostEvents, runtimeTraceEventTypePrefixes } from "./event-inspection.js";

export interface RuntimeTraceEventPresentation {
  detailLines: string[];
  label: string;
}

export function collectRuntimeTraceEvents(
  events: HostEventRecord[],
  nodeId: string,
  limit = 16
): HostEventRecord[] {
  return filterHostEvents(events, {
    nodeId,
    typePrefixes: [...runtimeTraceEventTypePrefixes]
  }).slice(0, limit);
}

function buildRunnerTurnDetailLines(
  event: Extract<HostEventRecord, { type: "runner.turn.updated" }>
): string[] {
  const detailLines: string[] = [];
  const engineOutcome = event.engineOutcome;

  if (engineOutcome) {
    if (engineOutcome.providerMetadata) {
      const providerLabel = `${engineOutcome.providerMetadata.adapterKind}/${engineOutcome.providerMetadata.profileId}`;
      detailLines.push(
        engineOutcome.providerMetadata.modelId
          ? `Provider: ${providerLabel} (${engineOutcome.providerMetadata.modelId})`
          : `Provider: ${providerLabel}`
      );
    }

    const stopReasonLine = engineOutcome.providerStopReason
      ? `Outcome: ${engineOutcome.stopReason} (provider: ${engineOutcome.providerStopReason})`
      : `Outcome: ${engineOutcome.stopReason}`;
    detailLines.push(stopReasonLine);

    if (engineOutcome.failure) {
      detailLines.push(
        `Failure: ${engineOutcome.failure.classification} — ${engineOutcome.failure.message}`
      );
    }

    if (engineOutcome.usage) {
      detailLines.push(
        `Usage: ${engineOutcome.usage.inputTokens} input / ${engineOutcome.usage.outputTokens} output tokens`
      );
    }

    if (engineOutcome.toolExecutions.length > 0) {
      const successCount = engineOutcome.toolExecutions.filter(
        (toolExecution) => toolExecution.outcome === "success"
      ).length;
      const errorCount = engineOutcome.toolExecutions.length - successCount;
      const executionSummary = `Tool executions: ${engineOutcome.toolExecutions.length} total (${successCount} success, ${errorCount} error)`;
      detailLines.push(executionSummary);

      const executionLabels = engineOutcome.toolExecutions
        .slice(0, 3)
        .map((toolExecution) => {
          const outcomeLabel =
            toolExecution.outcome === "success"
              ? "success"
              : toolExecution.errorCode
                ? `error:${toolExecution.errorCode}`
                : "error";
          return `${toolExecution.sequence}. ${toolExecution.toolId} (${outcomeLabel})`;
        })
        .join(", ");

      if (executionLabels.length > 0) {
        detailLines.push(`Recent tools: ${executionLabels}`);
      }
    }
  }

  if (event.memorySynthesisOutcome) {
    detailLines.push(
      event.memorySynthesisOutcome.status === "succeeded"
        ? "Memory synthesis: updated working-context summary"
        : `Memory synthesis: failed — ${event.memorySynthesisOutcome.errorMessage}`
    );
  }

  return detailLines;
}

export function describeRuntimeTraceEvent(
  event: HostEventRecord
): RuntimeTraceEventPresentation {
  switch (event.type) {
    case "session.updated":
      return {
        detailLines: [`Trace: ${event.traceId}`],
        label: `Session ${event.sessionId} moved to ${event.status}`
      };
    case "conversation.trace.event":
      return {
        detailLines: [`Initiator: ${event.initiator}`, `Follow-ups: ${event.followupCount}`],
        label: `Conversation ${event.conversationId} moved to ${event.status}`
      };
    case "approval.trace.event":
      return {
        detailLines: [
          `Requested by: ${event.requestedByNodeId}`,
          `Approvers: ${event.approverNodeIds.length}`
        ],
        label: `Approval ${event.approvalId} is ${event.status}`
      };
    case "artifact.trace.event": {
      const state =
        event.retrievalState ??
        event.publicationState ??
        event.lifecycleState ??
        "observed";
      return {
        detailLines: [
          `Backend: ${event.backend}`,
          ...(event.artifactKind ? [`Kind: ${event.artifactKind}`] : [])
        ],
        label: `Artifact ${event.artifactId} is ${state}`
      };
    }
    case "runner.turn.updated":
      return {
        detailLines: buildRunnerTurnDetailLines(event),
        label: `Turn ${event.turnId} is ${event.phase}`
      };
    default:
      return {
        detailLines: [],
        label: event.type
      };
  }
}

export function formatRuntimeTraceEventLabel(event: HostEventRecord): string {
  return describeRuntimeTraceEvent(event).label;
}
