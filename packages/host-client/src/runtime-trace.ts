import type { HostEventRecord } from "@entangle/types";
import { filterHostEvents, runtimeTraceEventTypePrefixes } from "./event-inspection.js";
import {
  countHostSessionApprovalStatusRecords,
  countHostSessionConversationStatusRecords,
  formatHostSessionApprovalStatusSummary,
  formatHostSessionConversationStatusSummary
} from "./runtime-session.js";
import { formatSourceChangeSummary } from "./runtime-turn.js";

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

function truncateRuntimeTraceDetail(value: string, maxLength = 96): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
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

    if (engineOutcome.engineSessionId) {
      detailLines.push(`Engine session: ${engineOutcome.engineSessionId}`);
    }

    if (engineOutcome.engineVersion) {
      detailLines.push(`Engine version: ${engineOutcome.engineVersion}`);
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

    const permissionObservations = engineOutcome.permissionObservations ?? [];

    if (permissionObservations.length > 0) {
      const latestPermission =
        permissionObservations[permissionObservations.length - 1]!;
      const reason = latestPermission.reason ? `: ${latestPermission.reason}` : "";
      detailLines.push(
        `Permission: ${latestPermission.decision} ${latestPermission.operation}${reason}`
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
        .map(formatToolExecutionLabel)
        .join(", ");

      if (executionLabels.length > 0) {
        detailLines.push(`Recent tools: ${executionLabels}`);
      }
    }
  }

  if (event.memorySynthesisOutcome) {
    detailLines.push(
      event.memorySynthesisOutcome.status === "succeeded"
        ? `Memory synthesis: updated ${event.memorySynthesisOutcome.updatedSummaryPagePaths.length} summary page${
            event.memorySynthesisOutcome.updatedSummaryPagePaths.length === 1
              ? ""
              : "s"
          }`
        : `Memory synthesis: failed — ${event.memorySynthesisOutcome.errorMessage}`
    );
  }

  if (event.sourceChangeSummary) {
    detailLines.push(
      `Source changes: ${formatSourceChangeSummary(event.sourceChangeSummary)}`
    );
  }

  if (event.sourceChangeCandidateIds.length > 0) {
    detailLines.push(
      `Source change candidates: ${event.sourceChangeCandidateIds.join(", ")}`
    );
  }

  return detailLines;
}

function formatToolExecutionLabel(
  toolExecution: NonNullable<
    Extract<HostEventRecord, { type: "runner.turn.updated" }>["engineOutcome"]
  >["toolExecutions"][number]
): string {
  const outcomeLabel =
    toolExecution.outcome === "success"
      ? "success"
      : toolExecution.errorCode
        ? `error:${toolExecution.errorCode}`
        : "error";
  const titleLabel = toolExecution.title
    ? ` - ${truncateRuntimeTraceDetail(toolExecution.title)}`
    : "";
  const durationLabel =
    toolExecution.durationMs !== undefined
      ? `, ${toolExecution.durationMs}ms`
      : "";
  const messageLabel = toolExecution.message
    ? ` - ${truncateRuntimeTraceDetail(toolExecution.message)}`
    : "";

  return `${toolExecution.sequence}. ${toolExecution.toolId}${titleLabel} (${outcomeLabel}${durationLabel})${messageLabel}`;
}

function buildSessionUpdatedDetailLines(
  event: Extract<HostEventRecord, { type: "session.updated" }>
): string[] {
  const activeConversationIds = event.activeConversationIds ?? [];
  const rootArtifactIds = event.rootArtifactIds ?? [];
  const approvalRecordCount = event.approvalStatusCounts
    ? countHostSessionApprovalStatusRecords(event.approvalStatusCounts)
    : undefined;
  const conversationRecordCount = event.conversationStatusCounts
    ? countHostSessionConversationStatusRecords(event.conversationStatusCounts)
    : undefined;
  const consistencyFindingCodes = event.sessionConsistencyFindingCodes ?? [];
  const consistencyFindingCount = event.sessionConsistencyFindingCount ?? 0;

  return [
    `Trace: ${event.traceId}`,
    `Active conversations: ${activeConversationIds.length}`,
    ...(conversationRecordCount !== undefined
      ? [
          `Recorded conversations: ${conversationRecordCount}`,
          `Conversation statuses: ${formatHostSessionConversationStatusSummary(
            event.conversationStatusCounts
          )}`
        ]
      : []),
    ...(approvalRecordCount !== undefined
      ? [
          `Recorded approvals: ${approvalRecordCount}`,
          `Approval statuses: ${formatHostSessionApprovalStatusSummary(
            event.approvalStatusCounts
          )}`
        ]
      : []),
    ...(event.sessionConsistencyFindingCount !== undefined
      ? [
          consistencyFindingCodes.length > 0
            ? `Consistency findings: ${consistencyFindingCount} (${consistencyFindingCodes.join(", ")})`
            : `Consistency findings: ${consistencyFindingCount}`
        ]
      : []),
    `Root artifacts: ${rootArtifactIds.length}`,
    ...(event.lastMessageType ? [`Last message: ${event.lastMessageType}`] : [])
  ];
}

export function describeRuntimeTraceEvent(
  event: HostEventRecord
): RuntimeTraceEventPresentation {
  switch (event.type) {
    case "host.operator_request.completed":
      return {
        detailLines: [
          `Operator: ${event.operatorId} (${event.operatorRole})`,
          `Method: ${event.method}`,
          `Path: ${event.path}`,
          `Status: ${event.statusCode}`,
          `Auth: ${event.authMode}`
        ],
        label: `Operator ${event.operatorId} ${event.method} ${event.path} -> ${event.statusCode}`
      };
    case "session.updated":
      return {
        detailLines: buildSessionUpdatedDetailLines(event),
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
          `Approvers: ${event.approverNodeIds.length}`,
          ...(event.operation ? [`Operation: ${event.operation}`] : []),
          ...(event.resource
            ? [
                `Resource: ${event.resource.kind}:${event.resource.id}` +
                  (event.resource.label ? ` (${event.resource.label})` : "")
              ]
            : [])
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
    case "source_history.updated":
      return {
        detailLines: [
          `Candidate: ${event.candidateId}`,
          `Mode: ${event.mode}`,
          `Commit: ${event.commit}`
        ],
        label: `Source history ${event.historyId} updated`
      };
    case "source_history.published":
      return {
        detailLines: [
          `Candidate: ${event.candidateId}`,
          `Artifact: ${event.artifactId}`,
          `Publication: ${event.publicationState}`,
          ...(event.remoteUrl ? [`Remote: ${event.remoteUrl}`] : [])
        ],
        label: `Source history ${event.historyId} publication ${event.publicationState}`
      };
    case "source_history.replayed":
      return {
        detailLines: [
          `Candidate: ${event.candidateId}`,
          `Replay: ${event.replayId}`,
          `Status: ${event.replayStatus}`,
          `Commit: ${event.commit}`
        ],
        label: `Source history ${event.historyId} replay ${event.replayStatus}`
      };
    case "wiki_repository.published":
      return {
        detailLines: [
          `Publication: ${event.publicationId}`,
          `Artifact: ${event.artifactId}`,
          `State: ${event.publicationState}`,
          `Branch: ${event.branch}`,
          ...(event.remoteUrl ? [`Remote: ${event.remoteUrl}`] : [])
        ],
        label: `Wiki repository ${event.nodeId} publication ${event.publicationState}`
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
