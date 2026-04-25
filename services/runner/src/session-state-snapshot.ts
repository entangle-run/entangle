import type {
  ArtifactRecord,
  ArtifactLifecycleState,
  ArtifactPublicationState,
  ArtifactRetrievalState,
  ConversationRecord,
  RunnerTurnRecord,
  SessionRecord
} from "@entangle/types";
import {
  listArtifactRecords,
  listConversationRecords,
  listRunnerTurnRecords,
  readSessionRecord,
  type RunnerStatePaths
} from "./state-store.js";

export type RunnerSessionArtifactSummary = {
  artifactId: string;
  artifactKind: ArtifactRecord["ref"]["artifactKind"];
  backend: ArtifactRecord["ref"]["backend"];
  publicationState?: ArtifactPublicationState;
  retrievalState?: ArtifactRetrievalState;
  status?: ArtifactLifecycleState;
  turnId?: string;
  updatedAt: string;
};

export type RunnerSessionConversationSummary = {
  artifactIds: string[];
  conversationId: string;
  followupCount: number;
  initiator: ConversationRecord["initiator"];
  lastMessageType?: ConversationRecord["lastMessageType"];
  peerNodeId: string;
  responsePolicy: ConversationRecord["responsePolicy"];
  status: ConversationRecord["status"];
  updatedAt: string;
};

export type RunnerSessionTurnOutcomeSummary = {
  failure?: NonNullable<RunnerTurnRecord["engineOutcome"]>["failure"];
  providerMetadata?: NonNullable<RunnerTurnRecord["engineOutcome"]>["providerMetadata"];
  providerStopReason?: NonNullable<
    RunnerTurnRecord["engineOutcome"]
  >["providerStopReason"];
  stopReason: NonNullable<RunnerTurnRecord["engineOutcome"]>["stopReason"];
  toolExecutionCount: number;
  usage?: NonNullable<RunnerTurnRecord["engineOutcome"]>["usage"];
};

export type RunnerSessionTurnSummary = {
  consumedArtifactIds: string[];
  conversationId?: string;
  engineOutcome?: RunnerSessionTurnOutcomeSummary;
  messageId?: string;
  phase: RunnerTurnRecord["phase"];
  producedArtifactIds: string[];
  sessionId?: string;
  triggerKind: RunnerTurnRecord["triggerKind"];
  turnId: string;
  updatedAt: string;
};

export type RunnerSessionSummary = {
  activeConversationIds: string[];
  entrypointNodeId?: string;
  intent: string;
  lastMessageType?: SessionRecord["lastMessageType"];
  ownerNodeId: string;
  rootArtifactIds: string[];
  sessionId: string;
  status: SessionRecord["status"];
  updatedAt: string;
  waitingApprovalIds: string[];
};

export type RunnerSessionStateSnapshot = {
  artifacts: RunnerSessionArtifactSummary[];
  conversations: RunnerSessionConversationSummary[];
  counts: {
    activeConversationCount: number;
    artifactCount: number;
    conversationCount: number;
    recentTurnCount: number;
  };
  recentTurns: RunnerSessionTurnSummary[];
  session: RunnerSessionSummary;
};

function compareByUpdatedAtDesc<T extends { updatedAt: string }>(
  left: T,
  right: T,
  tieBreaker: (value: T) => string
): number {
  return (
    right.updatedAt.localeCompare(left.updatedAt) ||
    tieBreaker(left).localeCompare(tieBreaker(right))
  );
}

function summarizeTurnOutcome(
  record: RunnerTurnRecord
): RunnerSessionTurnOutcomeSummary | undefined {
  if (!record.engineOutcome) {
    return undefined;
  }

  return {
    ...(record.engineOutcome.failure
      ? {
          failure: record.engineOutcome.failure
        }
      : {}),
    ...(record.engineOutcome.providerMetadata
      ? {
          providerMetadata: record.engineOutcome.providerMetadata
        }
      : {}),
    ...(record.engineOutcome.providerStopReason
      ? {
          providerStopReason: record.engineOutcome.providerStopReason
        }
      : {}),
    ...(record.engineOutcome.usage
      ? {
          usage: record.engineOutcome.usage
        }
      : {}),
    stopReason: record.engineOutcome.stopReason,
    toolExecutionCount: record.engineOutcome.toolExecutions.length
  };
}

export async function buildRunnerSessionStateSnapshot(input: {
  maxArtifacts: number;
  maxRecentTurns: number;
  sessionId: string;
  statePaths: RunnerStatePaths;
}): Promise<RunnerSessionStateSnapshot | undefined> {
  const sessionRecord = await readSessionRecord(input.statePaths, input.sessionId);

  if (!sessionRecord) {
    return undefined;
  }

  const [conversationRecords, turnRecords, artifactRecords] = await Promise.all([
    listConversationRecords(input.statePaths),
    listRunnerTurnRecords(input.statePaths),
    listArtifactRecords(input.statePaths)
  ]);
  const sessionConversations = conversationRecords
    .filter((candidate) => candidate.sessionId === sessionRecord.sessionId)
    .sort((left, right) =>
      compareByUpdatedAtDesc(left, right, (value) => value.conversationId)
    );
  const sessionTurns = turnRecords
    .filter((candidate) => candidate.sessionId === sessionRecord.sessionId)
    .sort((left, right) =>
      compareByUpdatedAtDesc(left, right, (value) => value.turnId)
    );
  const relatedArtifactIds = new Set<string>(sessionRecord.rootArtifactIds);

  for (const conversationRecord of sessionConversations) {
    for (const artifactId of conversationRecord.artifactIds) {
      relatedArtifactIds.add(artifactId);
    }
  }

  for (const turnRecord of sessionTurns) {
    for (const artifactId of turnRecord.consumedArtifactIds) {
      relatedArtifactIds.add(artifactId);
    }

    for (const artifactId of turnRecord.producedArtifactIds) {
      relatedArtifactIds.add(artifactId);
    }
  }

  const relatedArtifacts = artifactRecords
    .filter((candidate) => relatedArtifactIds.has(candidate.ref.artifactId))
    .sort((left, right) =>
      compareByUpdatedAtDesc(left, right, (value) => value.ref.artifactId)
    )
    .slice(0, input.maxArtifacts);

  return {
    artifacts: relatedArtifacts.map((artifactRecord) => ({
      artifactId: artifactRecord.ref.artifactId,
      artifactKind: artifactRecord.ref.artifactKind,
      backend: artifactRecord.ref.backend,
      ...(artifactRecord.publication?.state
        ? {
            publicationState: artifactRecord.publication.state
          }
        : {}),
      ...(artifactRecord.retrieval?.state
        ? {
            retrievalState: artifactRecord.retrieval.state
          }
        : {}),
      ...(artifactRecord.ref.status
        ? {
            status: artifactRecord.ref.status
          }
        : {}),
      ...(artifactRecord.turnId
        ? {
            turnId: artifactRecord.turnId
          }
        : {}),
      updatedAt: artifactRecord.updatedAt
    })),
    conversations: sessionConversations.map((conversationRecord) => ({
      artifactIds: conversationRecord.artifactIds,
      conversationId: conversationRecord.conversationId,
      followupCount: conversationRecord.followupCount,
      initiator: conversationRecord.initiator,
      ...(conversationRecord.lastMessageType
        ? {
            lastMessageType: conversationRecord.lastMessageType
          }
        : {}),
      peerNodeId: conversationRecord.peerNodeId,
      responsePolicy: conversationRecord.responsePolicy,
      status: conversationRecord.status,
      updatedAt: conversationRecord.updatedAt
    })),
    counts: {
      activeConversationCount: sessionRecord.activeConversationIds.length,
      artifactCount: relatedArtifactIds.size,
      conversationCount: sessionConversations.length,
      recentTurnCount: Math.min(sessionTurns.length, input.maxRecentTurns)
    },
    recentTurns: sessionTurns.slice(0, input.maxRecentTurns).map((turnRecord) => {
      const engineOutcome = summarizeTurnOutcome(turnRecord);

      return {
        ...(turnRecord.conversationId
          ? {
              conversationId: turnRecord.conversationId
            }
          : {}),
        ...(turnRecord.messageId
          ? {
              messageId: turnRecord.messageId
            }
          : {}),
        ...(turnRecord.sessionId
          ? {
              sessionId: turnRecord.sessionId
            }
          : {}),
        consumedArtifactIds: turnRecord.consumedArtifactIds,
        ...(engineOutcome
          ? {
              engineOutcome
            }
          : {}),
        phase: turnRecord.phase,
        producedArtifactIds: turnRecord.producedArtifactIds,
        triggerKind: turnRecord.triggerKind,
        turnId: turnRecord.turnId,
        updatedAt: turnRecord.updatedAt
      };
    }),
    session: {
      activeConversationIds: sessionRecord.activeConversationIds,
      ...(sessionRecord.entrypointNodeId
        ? {
            entrypointNodeId: sessionRecord.entrypointNodeId
          }
        : {}),
      intent: sessionRecord.intent,
      ...(sessionRecord.lastMessageType
        ? {
            lastMessageType: sessionRecord.lastMessageType
          }
        : {}),
      ownerNodeId: sessionRecord.ownerNodeId,
      rootArtifactIds: sessionRecord.rootArtifactIds,
      sessionId: sessionRecord.sessionId,
      status: sessionRecord.status,
      updatedAt: sessionRecord.updatedAt,
      waitingApprovalIds: sessionRecord.waitingApprovalIds
    }
  };
}

export function renderRunnerSessionStateSnapshotForPrompt(
  snapshot: RunnerSessionStateSnapshot
): string {
  const conversationLines =
    snapshot.conversations.length > 0
      ? snapshot.conversations.map(
          (conversation) =>
            `  - ${conversation.conversationId} with ${conversation.peerNodeId} [` +
            `${conversation.status}] followups=${conversation.followupCount}`
        )
      : ["  - none"];
  const recentTurnLines =
    snapshot.recentTurns.length > 0
      ? snapshot.recentTurns.map((turn) => {
          const outcome =
            turn.engineOutcome?.failure
              ? `error:${turn.engineOutcome.failure.classification}`
              : turn.engineOutcome?.stopReason ?? "none";

          return (
            `  - ${turn.turnId} [${turn.phase}/${turn.triggerKind}] ` +
            `outcome=${outcome} produced=${turn.producedArtifactIds.length} ` +
            `consumed=${turn.consumedArtifactIds.length}`
          );
        })
      : ["  - none"];
  const artifactLines =
    snapshot.artifacts.length > 0
      ? snapshot.artifacts.map((artifact) => {
          const lifecycleState: string =
            artifact.publicationState ??
            artifact.retrievalState ??
            artifact.status ??
            "unknown";

          return (
            `  - ${artifact.artifactId} [` +
            `${artifact.backend}/${artifact.artifactKind ?? "unknown"}/${lifecycleState}]`
          );
        })
      : ["  - none"];

  return [
    "Current session snapshot:",
    `- Session status: \`${snapshot.session.status}\``,
    `- Session intent: ${snapshot.session.intent}`,
    `- Active conversations: ${snapshot.counts.activeConversationCount}`,
    `- Conversations observed: ${snapshot.counts.conversationCount}`,
    `- Related artifacts: ${snapshot.counts.artifactCount}`,
    `- Recent turns: ${snapshot.counts.recentTurnCount}`,
    "- Conversation summary:",
    ...conversationLines,
    "- Recent turn summary:",
    ...recentTurnLines,
    "- Related artifact summary:",
    ...artifactLines
  ].join("\n");
}
