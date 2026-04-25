import { randomUUID } from "node:crypto";
import type {
  AgentEngineTurnResult,
  ArtifactRecord,
  ArtifactRef,
  ApprovalRecord,
  ConversationLifecycleState,
  ConversationRecord,
  EngineArtifactInput,
  EngineHandoffDirective,
  EngineProviderMetadata,
  EngineToolDefinition,
  EngineTurnFailure,
  EngineTurnOutcome,
  EffectiveRuntimeContext,
  EntangleA2AMessage,
  MemorySynthesisOutcome,
  RunnerPhase,
  RunnerTurnRecord,
  SessionLifecycleState,
  SessionRecord
} from "@entangle/types";
import {
  agentEngineTurnResultSchema,
  entangleA2AApprovalRequestMetadataSchema,
  entangleA2AApprovalResponseMetadataSchema,
  engineTurnOutcomeSchema,
  isAllowedApprovalLifecycleTransition,
  isAllowedConversationLifecycleTransition,
  isAllowedSessionLifecycleTransition
} from "@entangle/types";
import { validateA2AMessageDocument } from "@entangle/validator";
import type { AgentEngine } from "@entangle/agent-engine";
import {
  AgentEngineConfigurationError,
  AgentEngineExecutionError,
  createStubAgentEngine
} from "@entangle/agent-engine";
import {
  buildAgentEngineTurnRequest,
  loadPackageToolCatalog,
  mapPackageToolCatalogToEngineToolDefinitions
} from "./runtime-context.js";
import {
  type RunnerStatePaths,
  ensureRunnerStatePaths,
  listApprovalRecords,
  listConversationRecords,
  listSessionRecords,
  readApprovalRecord,
  readConversationRecord,
  readSessionRecord,
  writeApprovalRecord,
  writeArtifactRecord,
  writeConversationRecord,
  writeRunnerTurnRecord,
  writeSessionRecord
} from "./state-store.js";
import {
  GitCliRunnerArtifactBackend,
  RunnerArtifactRetrievalError,
  type RunnerArtifactBackend
} from "./artifact-backend.js";
import { performPostTurnMemoryUpdate } from "./memory-maintenance.js";
import {
  buildArtifactInputsFromMaterializedRecords,
  type RunnerMemorySynthesizer
} from "./memory-synthesizer.js";
import {
  harvestSourceChanges,
  prepareSourceChangeHarvest
} from "./source-change-harvester.js";
import type {
  RunnerInboundEnvelope,
  RunnerPublishedEnvelope,
  RunnerTransport,
  RunnerTransportSubscription
} from "./transport.js";

export type RunnerServiceStartResult = {
  nodeId: string;
  publicKey: string;
  runtimeRoot: string;
};

export type RunnerServiceHandleResult =
  | {
      handled: false;
      reason: "invalid_message" | "wrong_node" | "wrong_pubkey";
    }
  | {
      handled: true;
      handoffs: RunnerPublishedEnvelope[];
      response: RunnerPublishedEnvelope | undefined;
    };

type EffectiveEdgeRouteRelation = Exclude<
  EffectiveRuntimeContext["relayContext"]["edgeRoutes"][number]["relation"],
  undefined
>;

type ResolvedHandoffRoute = {
  channel: string;
  edgeId: string;
  peerNodeId: string;
  peerPubkey: string;
  relation: EffectiveEdgeRouteRelation;
  relayProfileRefs: string[];
};

type ResolvedHandoffPlan = {
  directive: EngineHandoffDirective;
  route: ResolvedHandoffRoute;
};

class RunnerHandoffPolicyError extends AgentEngineExecutionError {
  constructor(message: string) {
    super(message, {
      classification: "bad_request"
    });
  }
}

const handoffAllowedRelations = new Set([
  "delegates_to",
  "peer_collaborates_with",
  "reviews",
  "routes_to"
]);

function nowIsoString(): string {
  return new Date().toISOString();
}

function buildSyntheticTurnId(prefix: string): string {
  return `${prefix}-${randomUUID().replace(/-/g, "")}`;
}

function truncateBoundedText(value: string, maxCharacters = 240): string {
  const normalizedValue = value.trim();

  if (normalizedValue.length <= maxCharacters) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, maxCharacters - 1)}…`;
}

function buildEngineProviderMetadataFromContext(
  context: EffectiveRuntimeContext
): EngineProviderMetadata | undefined {
  if (context.agentRuntimeContext.engineProfile.kind === "opencode_server") {
    return undefined;
  }

  const profile = context.modelContext.modelEndpointProfile;

  if (!profile) {
    return undefined;
  }

  return {
    adapterKind: profile.adapterKind,
    ...(profile.defaultModel ? { modelId: profile.defaultModel } : {}),
    profileId: profile.id
  };
}

function buildEngineFailure(
  context: EffectiveRuntimeContext,
  error: unknown
): EngineTurnFailure {
  if (error instanceof AgentEngineExecutionError) {
    return {
      classification: error.classification,
      message: truncateBoundedText(error.message)
    };
  }

  if (error instanceof AgentEngineConfigurationError) {
    return {
      classification: "configuration_error",
      message: truncateBoundedText(error.message)
    };
  }

  if (error instanceof Error) {
    return {
      classification: "unknown_provider_error",
      message: truncateBoundedText(error.message)
    };
  }

  return {
    classification: "unknown_provider_error",
    message: `Unexpected engine execution failure for node '${context.binding.node.nodeId}'.`
  };
}

async function advanceSessionToProcessing(
  statePaths: RunnerStatePaths,
  record: SessionRecord,
  input: {
    lastMessageId: string;
    lastMessageType: EntangleA2AMessage["messageType"];
  }
): Promise<SessionRecord> {
  let currentRecord = record;

  if (currentRecord.status === "requested") {
    currentRecord = await transitionSessionStatus(
      statePaths,
      currentRecord,
      "accepted",
      input
    );
  }

  if (currentRecord.status === "accepted") {
    currentRecord = await transitionSessionStatus(
      statePaths,
      currentRecord,
      "planning",
      input
    );
  }

  if (currentRecord.status === "planning") {
    currentRecord = await transitionSessionStatus(
      statePaths,
      currentRecord,
      "active",
      input
    );
  }

  if (currentRecord.status !== "active") {
    throw new Error(
      `Session '${record.sessionId}' is not in an active processing state after intake; current status is '${currentRecord.status}'.`
    );
  }

  return currentRecord;
}

async function completeSession(
  statePaths: RunnerStatePaths,
  record: SessionRecord,
  input: {
    lastMessageId: string;
    lastMessageType: EntangleA2AMessage["messageType"];
  }
): Promise<SessionRecord> {
  let currentRecord = record;

  if (currentRecord.status === "active") {
    currentRecord = await transitionSessionStatus(
      statePaths,
      currentRecord,
      "synthesizing",
      input
    );
  }

  if (currentRecord.status === "synthesizing") {
    currentRecord = await transitionSessionStatus(
      statePaths,
      currentRecord,
      "completed",
      input
    );
  }

  if (currentRecord.status !== "completed") {
    throw new Error(
      `Session '${record.sessionId}' did not reach a completed state; current status is '${currentRecord.status}'.`
    );
  }

  return currentRecord;
}

async function transitionSessionStatus(
  statePaths: RunnerStatePaths,
  record: SessionRecord,
  nextStatus: SessionLifecycleState,
  input: {
    lastMessageId?: string;
    lastMessageType?: EntangleA2AMessage["messageType"];
  } = {}
): Promise<SessionRecord> {
  if (
    record.status !== nextStatus &&
    !isAllowedSessionLifecycleTransition(record.status, nextStatus)
  ) {
    throw new Error(
      `Invalid session transition '${record.status} -> ${nextStatus}' for session '${record.sessionId}'.`
    );
  }

  const nextRecord: SessionRecord = {
    ...record,
    lastMessageId: input.lastMessageId ?? record.lastMessageId,
    lastMessageType: input.lastMessageType ?? record.lastMessageType,
    status: nextStatus,
    updatedAt: nowIsoString()
  };
  await writeSessionRecord(statePaths, nextRecord);
  return nextRecord;
}

async function advanceConversationToWorking(
  statePaths: RunnerStatePaths,
  record: ConversationRecord,
  input: {
    lastInboundMessageId: string;
    lastMessageType: EntangleA2AMessage["messageType"];
  }
): Promise<ConversationRecord> {
  let currentRecord = record;

  if (currentRecord.status === "opened") {
    currentRecord = await transitionConversationStatus(
      statePaths,
      currentRecord,
      "acknowledged",
      input
    );
  }

  if (currentRecord.status === "acknowledged") {
    currentRecord = await transitionConversationStatus(
      statePaths,
      currentRecord,
      "working",
      input
    );
  }

  if (currentRecord.status !== "working") {
    throw new Error(
      `Conversation '${record.conversationId}' is not in a working state after intake; current status is '${currentRecord.status}'.`
    );
  }

  return currentRecord;
}

async function transitionConversationStatus(
  statePaths: RunnerStatePaths,
  record: ConversationRecord,
  nextStatus: ConversationLifecycleState,
  input: {
    followupCount?: number;
    lastInboundMessageId?: string;
    lastMessageType?: EntangleA2AMessage["messageType"];
    lastOutboundMessageId?: string;
  } = {}
): Promise<ConversationRecord> {
  if (
    record.status !== nextStatus &&
    !isAllowedConversationLifecycleTransition(record.status, nextStatus)
  ) {
    throw new Error(
      `Invalid conversation transition '${record.status} -> ${nextStatus}' for conversation '${record.conversationId}'.`
    );
  }

  const nextRecord: ConversationRecord = {
    ...record,
    followupCount: input.followupCount ?? record.followupCount,
    lastInboundMessageId: input.lastInboundMessageId ?? record.lastInboundMessageId,
    lastMessageType: input.lastMessageType ?? record.lastMessageType,
    lastOutboundMessageId:
      input.lastOutboundMessageId ?? record.lastOutboundMessageId,
    status: nextStatus,
    updatedAt: nowIsoString()
  };
  await writeConversationRecord(statePaths, nextRecord);
  return nextRecord;
}

async function writeRunnerPhase(
  statePaths: RunnerStatePaths,
  record: RunnerTurnRecord,
  phase: RunnerPhase
): Promise<RunnerTurnRecord> {
  const nextRecord: RunnerTurnRecord = {
    ...record,
    phase,
    updatedAt: nowIsoString()
  };
  await writeRunnerTurnRecord(statePaths, nextRecord);
  return nextRecord;
}

function buildInitialSessionRecord(
  context: EffectiveRuntimeContext,
  envelope: RunnerInboundEnvelope
): SessionRecord {
  return {
    activeConversationIds: [envelope.message.conversationId],
    entrypointNodeId: envelope.message.toNodeId,
    graphId: envelope.message.graphId,
    intent: envelope.message.intent,
    lastMessageId: envelope.eventId,
    lastMessageType: envelope.message.messageType,
    openedAt: envelope.receivedAt,
    originatingNodeId: envelope.message.fromNodeId,
    ownerNodeId: context.binding.node.nodeId,
    rootArtifactIds: [],
    sessionId: envelope.message.sessionId,
    status: "requested",
    traceId: envelope.message.sessionId,
    updatedAt: envelope.receivedAt,
    waitingApprovalIds: []
  };
}

function buildInitialConversationRecord(
  context: EffectiveRuntimeContext,
  envelope: RunnerInboundEnvelope
): ConversationRecord {
  return {
    artifactIds: [],
    conversationId: envelope.message.conversationId,
    followupCount: 0,
    graphId: envelope.message.graphId,
    initiator: "remote",
    lastInboundMessageId: envelope.eventId,
    lastMessageType: envelope.message.messageType,
    localNodeId: context.binding.node.nodeId,
    localPubkey: context.identityContext.publicKey,
    openedAt: envelope.receivedAt,
    peerNodeId: envelope.message.fromNodeId,
    peerPubkey: envelope.message.fromPubkey,
    responsePolicy: envelope.message.responsePolicy,
    sessionId: envelope.message.sessionId,
    status: "opened",
    updatedAt: envelope.receivedAt
  };
}

function buildResponseMessage(input: {
  context: EffectiveRuntimeContext;
  envelope: RunnerInboundEnvelope;
  producedArtifacts: ArtifactRecord[];
  result: AgentEngineTurnResult;
}): EntangleA2AMessage {
  return {
    constraints: {
      approvalRequiredBeforeAction: false
    },
    conversationId: input.envelope.message.conversationId,
    fromNodeId: input.context.binding.node.nodeId,
    fromPubkey: input.context.identityContext.publicKey,
    graphId: input.envelope.message.graphId,
    intent: input.envelope.message.intent,
    messageType: "task.result",
    parentMessageId: input.envelope.eventId,
    protocol: "entangle.a2a.v1",
    responsePolicy: {
      closeOnResult: input.envelope.message.responsePolicy.closeOnResult,
      maxFollowups: 0,
      responseRequired: false
    },
    sessionId: input.envelope.message.sessionId,
    toNodeId: input.envelope.message.fromNodeId,
    toPubkey: input.envelope.message.fromPubkey,
    turnId: buildSyntheticTurnId("result"),
    work: {
      artifactRefs: [
        ...input.envelope.message.work.artifactRefs,
        ...input.producedArtifacts.map((artifactRecord) => artifactRecord.ref)
      ],
      metadata: {
        producedArtifactIds: input.producedArtifacts.map(
          (artifactRecord) => artifactRecord.ref.artifactId
        ),
        stopReason: input.result.stopReason
      },
      summary:
        input.result.assistantMessages.join("\n").trim() ||
        `Node '${input.context.binding.node.nodeId}' completed the requested task.`
    }
  };
}

function parseEngineTurnResult(value: unknown): AgentEngineTurnResult {
  const result = agentEngineTurnResultSchema.safeParse(value);

  if (!result.success) {
    throw new AgentEngineExecutionError(
      `Engine returned an invalid turn result: ${result.error.issues
        .map((issue) => issue.message)
        .join("; ")}`,
      {
        cause: result.error,
        classification: "bad_request"
      }
    );
  }

  return result.data;
}

function resolveHandoffPlans(
  context: EffectiveRuntimeContext,
  directives: EngineHandoffDirective[]
): ResolvedHandoffPlan[] {
  if (directives.length === 0) {
    return [];
  }

  if (!context.policyContext.autonomy.canInitiateSessions) {
    throw new RunnerHandoffPolicyError(
      `Node '${context.binding.node.nodeId}' cannot emit autonomous handoffs because its autonomy policy does not allow session initiation.`
    );
  }

  return directives.map((directive) => {
    const matchingRoutes = context.relayContext.edgeRoutes.filter(
      (route) =>
        (!directive.edgeId || route.edgeId === directive.edgeId) &&
        (!directive.targetNodeId || route.peerNodeId === directive.targetNodeId)
    );

    if (matchingRoutes.length === 0) {
      throw new RunnerHandoffPolicyError(
        `Engine requested a handoff from node '${context.binding.node.nodeId}' but no effective edge route matched edgeId '${directive.edgeId ?? "unspecified"}' and targetNodeId '${directive.targetNodeId ?? "unspecified"}'.`
      );
    }

    if (matchingRoutes.length > 1) {
      throw new RunnerHandoffPolicyError(
        `Engine requested an ambiguous handoff from node '${context.binding.node.nodeId}'; specify edgeId to select one route.`
      );
    }

    const route = matchingRoutes[0];

    if (
      !route?.channel ||
      !route.edgeId ||
      !route.peerNodeId ||
      !route.relation
    ) {
      throw new RunnerHandoffPolicyError(
        `Engine requested a handoff from node '${context.binding.node.nodeId}' but the matched route is incomplete.`
      );
    }

    if (!handoffAllowedRelations.has(route.relation)) {
      throw new RunnerHandoffPolicyError(
        `Edge '${route.edgeId}' relation '${route.relation}' is not allowed for autonomous handoff.`
      );
    }

    if (!route.peerPubkey) {
      throw new RunnerHandoffPolicyError(
        `Edge '${route.edgeId}' cannot be used for autonomous handoff because the peer route has no materialized Nostr public key.`
      );
    }

    return {
      directive,
      route: {
        channel: route.channel,
        edgeId: route.edgeId,
        peerNodeId: route.peerNodeId,
        peerPubkey: route.peerPubkey,
        relation: route.relation,
        relayProfileRefs: route.relayProfileRefs ?? []
      }
    };
  });
}

function dedupeArtifactRefs(artifactRefs: ArtifactRef[]): ArtifactRef[] {
  const seenArtifactIds = new Set<string>();

  return artifactRefs.filter((artifactRef) => {
    if (seenArtifactIds.has(artifactRef.artifactId)) {
      return false;
    }

    seenArtifactIds.add(artifactRef.artifactId);
    return true;
  });
}

function selectHandoffArtifactRefs(input: {
  directive: EngineHandoffDirective;
  inboundArtifactRefs: ArtifactRef[];
  producedArtifacts: ArtifactRecord[];
}): ArtifactRef[] {
  switch (input.directive.includeArtifacts) {
    case "all":
      return dedupeArtifactRefs([
        ...input.inboundArtifactRefs,
        ...input.producedArtifacts.map((artifactRecord) => artifactRecord.ref)
      ]);
    case "none":
      return [];
    case "produced":
      return dedupeArtifactRefs(
        input.producedArtifacts.map((artifactRecord) => artifactRecord.ref)
      );
  }
}

function buildHandoffMessage(input: {
  context: EffectiveRuntimeContext;
  envelope: RunnerInboundEnvelope;
  plan: ResolvedHandoffPlan;
  producedArtifacts: ArtifactRecord[];
  sourceRunnerTurnId: string;
}): EntangleA2AMessage {
  return {
    constraints: {
      approvalRequiredBeforeAction: false
    },
    conversationId: buildSyntheticTurnId("handoff-conv"),
    fromNodeId: input.context.binding.node.nodeId,
    fromPubkey: input.context.identityContext.publicKey,
    graphId: input.envelope.message.graphId,
    intent: input.plan.directive.intent ?? input.envelope.message.intent,
    messageType: "task.handoff",
    parentMessageId: input.envelope.eventId,
    protocol: "entangle.a2a.v1",
    responsePolicy: input.plan.directive.responsePolicy,
    sessionId: input.envelope.message.sessionId,
    toNodeId: input.plan.route.peerNodeId,
    toPubkey: input.plan.route.peerPubkey,
    turnId: buildSyntheticTurnId("handoff"),
    work: {
      artifactRefs: selectHandoffArtifactRefs({
        directive: input.plan.directive,
        inboundArtifactRefs: input.envelope.message.work.artifactRefs,
        producedArtifacts: input.producedArtifacts
      }),
      metadata: {
        handoff: {
          edgeId: input.plan.route.edgeId,
          includeArtifacts: input.plan.directive.includeArtifacts,
          relation: input.plan.route.relation,
          sourceConversationId: input.envelope.message.conversationId,
          sourceMessageId: input.envelope.eventId,
          sourceRunnerTurnId: input.sourceRunnerTurnId
        }
      },
      summary: input.plan.directive.summary
    }
  };
}

function mergeIdentifierLists(
  currentValues: string[],
  nextValues: string[]
): string[] {
  return [...new Set([...currentValues, ...nextValues])];
}

function isExecutableWorkMessage(
  messageType: EntangleA2AMessage["messageType"]
): boolean {
  return messageType === "task.request" || messageType === "task.handoff";
}

function determineHandoffConversationStatus(
  responsePolicy: EntangleA2AMessage["responsePolicy"]
): ConversationLifecycleState {
  if (responsePolicy.responseRequired) {
    return "working";
  }

  return responsePolicy.closeOnResult ? "closed" : "resolved";
}

function hasOpenConversationStatus(record: ConversationRecord): boolean {
  return !["closed", "expired", "rejected", "resolved"].includes(record.status);
}

function listOpenConversationIdsForSession(input: {
  conversationRecords: ConversationRecord[];
  sessionId: string;
}): string[] {
  return input.conversationRecords
    .filter(
      (conversationRecord) =>
        conversationRecord.sessionId === input.sessionId &&
        hasOpenConversationStatus(conversationRecord)
    )
    .map((conversationRecord) => conversationRecord.conversationId);
}

function listUnapprovedWaitingApprovalIds(input: {
  approvalRecords: ApprovalRecord[];
  sessionRecord: SessionRecord;
}): string[] {
  const approvalRecordsById = new Map(
    input.approvalRecords.map((approvalRecord) => [
      approvalRecord.approvalId,
      approvalRecord
    ])
  );

  return input.sessionRecord.waitingApprovalIds.filter(
    (approvalId) => approvalRecordsById.get(approvalId)?.status !== "approved"
  );
}

async function transitionApprovalStatus(
  statePaths: RunnerStatePaths,
  record: ApprovalRecord,
  nextStatus: ApprovalRecord["status"],
  input: {
    approverNodeId?: string;
    updatedAt: string;
  }
): Promise<ApprovalRecord> {
  if (
    record.status !== nextStatus &&
    !isAllowedApprovalLifecycleTransition(record.status, nextStatus)
  ) {
    return record;
  }

  const nextApproverNodeIds = input.approverNodeId
    ? mergeIdentifierLists(record.approverNodeIds, [input.approverNodeId])
    : record.approverNodeIds;
  const nextRecord: ApprovalRecord = {
    ...record,
    approverNodeIds: nextApproverNodeIds,
    status: nextStatus,
    updatedAt: input.updatedAt
  };

  await writeApprovalRecord(statePaths, nextRecord);
  return nextRecord;
}

function isTerminalSessionStatus(status: SessionLifecycleState): boolean {
  return ["cancelled", "completed", "failed", "timed_out"].includes(status);
}

function areIdentifierListsEqual(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

async function repairSessionDerivedWorkState(
  statePaths: RunnerStatePaths
): Promise<void> {
  const [approvalRecords, conversationRecords, sessionRecords] =
    await Promise.all([
      listApprovalRecords(statePaths),
      listConversationRecords(statePaths),
      listSessionRecords(statePaths)
    ]);

  await Promise.all(
    sessionRecords.map(async (sessionRecord) => {
      const activeConversationIds = isTerminalSessionStatus(sessionRecord.status)
        ? []
        : listOpenConversationIdsForSession({
            conversationRecords,
            sessionId: sessionRecord.sessionId
          });
      const canExplainLifecycleRepair = Boolean(
        sessionRecord.lastMessageId && sessionRecord.lastMessageType
      );
      const waitingApprovalIds =
        canExplainLifecycleRepair &&
        ["active", "waiting_approval"].includes(sessionRecord.status)
          ? listUnapprovedWaitingApprovalIds({
              approvalRecords: approvalRecords.filter(
                (approvalRecord) =>
                  approvalRecord.sessionId === sessionRecord.sessionId
              ),
              sessionRecord
            })
          : sessionRecord.waitingApprovalIds;
      const repairedSession: SessionRecord = {
        ...sessionRecord,
        activeConversationIds,
        waitingApprovalIds,
        updatedAt:
          areIdentifierListsEqual(
            sessionRecord.activeConversationIds,
            activeConversationIds
          ) &&
          areIdentifierListsEqual(
            sessionRecord.waitingApprovalIds,
            waitingApprovalIds
          )
          ? sessionRecord.updatedAt
          : nowIsoString()
      };

      if (
        repairedSession.status === "waiting_approval" &&
        repairedSession.waitingApprovalIds.length === 0 &&
        repairedSession.lastMessageId &&
        repairedSession.lastMessageType
      ) {
        const activeSession = await transitionSessionStatus(
          statePaths,
          repairedSession,
          "active",
          {
            lastMessageId: repairedSession.lastMessageId,
            lastMessageType: repairedSession.lastMessageType
          }
        );

        if (activeSession.activeConversationIds.length === 0) {
          await completeSession(statePaths, activeSession, {
            lastMessageId: repairedSession.lastMessageId,
            lastMessageType: repairedSession.lastMessageType
          });
        }

        return;
      }

      if (
        repairedSession.status === "active" &&
        repairedSession.activeConversationIds.length === 0 &&
        repairedSession.waitingApprovalIds.length > 0 &&
        repairedSession.lastMessageId &&
        repairedSession.lastMessageType
      ) {
        await transitionSessionStatus(
          statePaths,
          repairedSession,
          "waiting_approval",
          {
            lastMessageId: repairedSession.lastMessageId,
            lastMessageType: repairedSession.lastMessageType
          }
        );
        return;
      }

      if (
        repairedSession.status === "active" &&
        repairedSession.activeConversationIds.length === 0 &&
        repairedSession.waitingApprovalIds.length === 0 &&
        repairedSession.lastMessageId &&
        repairedSession.lastMessageType
      ) {
        await completeSession(statePaths, repairedSession, {
          lastMessageId: repairedSession.lastMessageId,
          lastMessageType: repairedSession.lastMessageType
        });
        return;
      }

      if (
        areIdentifierListsEqual(
          sessionRecord.activeConversationIds,
          activeConversationIds
        ) &&
        areIdentifierListsEqual(
          sessionRecord.waitingApprovalIds,
          waitingApprovalIds
        )
      ) {
        return;
      }

      await writeSessionRecord(statePaths, repairedSession);
    })
  );
}

function buildConversationTransitionInput(input: {
  followupCount?: number | undefined;
  lastInboundMessageId?: string | undefined;
  lastMessageType: EntangleA2AMessage["messageType"];
  lastOutboundMessageId?: string | undefined;
}): {
  followupCount?: number;
  lastInboundMessageId?: string;
  lastMessageType: EntangleA2AMessage["messageType"];
  lastOutboundMessageId?: string;
} {
  return {
    ...(input.followupCount !== undefined
      ? { followupCount: input.followupCount }
      : {}),
    ...(input.lastInboundMessageId
      ? { lastInboundMessageId: input.lastInboundMessageId }
      : {}),
    lastMessageType: input.lastMessageType,
    ...(input.lastOutboundMessageId
      ? { lastOutboundMessageId: input.lastOutboundMessageId }
      : {})
  };
}

function buildEngineTurnOutcome(
  result: AgentEngineTurnResult,
  context: EffectiveRuntimeContext
): EngineTurnOutcome {
  return engineTurnOutcomeSchema.parse({
    ...(result.engineSessionId
      ? { engineSessionId: result.engineSessionId }
      : {}),
    ...(result.engineVersion ? { engineVersion: result.engineVersion } : {}),
    ...(result.failure ? { failure: result.failure } : {}),
    ...(result.permissionObservations
      ? { permissionObservations: result.permissionObservations }
      : {}),
    ...(result.providerMetadata
      ? { providerMetadata: result.providerMetadata }
      : buildEngineProviderMetadataFromContext(context)
        ? { providerMetadata: buildEngineProviderMetadataFromContext(context) }
        : {}),
    ...(result.providerStopReason
      ? { providerStopReason: result.providerStopReason }
      : {}),
    stopReason: result.stopReason,
    toolExecutions: result.toolExecutions,
    ...(result.usage ? { usage: result.usage } : {})
  });
}

function buildFailedEngineTurnOutcome(
  context: EffectiveRuntimeContext,
  error: unknown
): EngineTurnOutcome {
  return engineTurnOutcomeSchema.parse({
    failure: buildEngineFailure(context, error),
    ...(buildEngineProviderMetadataFromContext(context)
      ? { providerMetadata: buildEngineProviderMetadataFromContext(context) }
      : {}),
    stopReason: "error",
    toolExecutions: []
  });
}

export class RunnerService {
  private readonly artifactBackend: RunnerArtifactBackend;
  private readonly context: EffectiveRuntimeContext;
  private readonly engine: AgentEngine;
  private readonly explicitToolDefinitions: EngineToolDefinition[] | undefined;
  private readonly memorySynthesizer: RunnerMemorySynthesizer | undefined;
  private readonly transport: RunnerTransport;
  private subscription: RunnerTransportSubscription | undefined;
  private statePaths: RunnerStatePaths | undefined;
  private toolDefinitionsPromise: Promise<EngineToolDefinition[]> | undefined;

  constructor(input: {
    artifactBackend?: RunnerArtifactBackend;
    context: EffectiveRuntimeContext;
    engine?: AgentEngine;
    memorySynthesizer?: RunnerMemorySynthesizer;
    toolDefinitions?: EngineToolDefinition[];
    transport: RunnerTransport;
  }) {
    this.artifactBackend =
      input.artifactBackend ?? new GitCliRunnerArtifactBackend();
    this.context = input.context;
    this.engine = input.engine ?? createStubAgentEngine();
    this.explicitToolDefinitions = input.toolDefinitions;
    this.memorySynthesizer = input.memorySynthesizer;
    this.transport = input.transport;
  }

  private async resolveToolDefinitions(): Promise<EngineToolDefinition[]> {
    if (!this.toolDefinitionsPromise) {
      this.toolDefinitionsPromise = this.explicitToolDefinitions
        ? Promise.resolve(this.explicitToolDefinitions)
        : loadPackageToolCatalog(this.context).then(
            mapPackageToolCatalogToEngineToolDefinitions
          );
    }

    return this.toolDefinitionsPromise;
  }

  private async transitionConversationToResolved(input: {
    conversation: ConversationRecord;
    lastInboundMessageId?: string;
    lastMessageType: EntangleA2AMessage["messageType"];
    statePaths: RunnerStatePaths;
  }): Promise<ConversationRecord> {
    let currentConversation = input.conversation;
    const transitionInput = buildConversationTransitionInput({
      lastInboundMessageId: input.lastInboundMessageId,
      lastMessageType: input.lastMessageType
    });

    if (["closed", "expired", "resolved"].includes(currentConversation.status)) {
      return currentConversation;
    }

    if (currentConversation.status === "opened") {
      currentConversation = await transitionConversationStatus(
        input.statePaths,
        currentConversation,
        "acknowledged",
        transitionInput
      );
    }

    if (currentConversation.status === "acknowledged") {
      currentConversation = await transitionConversationStatus(
        input.statePaths,
        currentConversation,
        "working",
        transitionInput
      );
    }

    if (
      currentConversation.status === "blocked" ||
      currentConversation.status === "awaiting_approval"
    ) {
      currentConversation = await transitionConversationStatus(
        input.statePaths,
        currentConversation,
        "working",
        transitionInput
      );
    }

    if (currentConversation.status === "working") {
      currentConversation = await transitionConversationStatus(
        input.statePaths,
        currentConversation,
        "resolved",
        transitionInput
      );
    }

    return currentConversation;
  }

  private async transitionConversationToClosed(input: {
    conversation: ConversationRecord;
    lastInboundMessageId?: string;
    lastMessageType: EntangleA2AMessage["messageType"];
    statePaths: RunnerStatePaths;
  }): Promise<ConversationRecord> {
    let currentConversation = await this.transitionConversationToResolved(input);

    if (currentConversation.status === "resolved") {
      currentConversation = await transitionConversationStatus(
        input.statePaths,
        currentConversation,
        "closed",
        buildConversationTransitionInput({
          lastInboundMessageId: input.lastInboundMessageId,
          lastMessageType: input.lastMessageType
        })
      );
    }

    return currentConversation;
  }

  private async transitionConversationToAwaitingApproval(input: {
    conversation: ConversationRecord;
    lastInboundMessageId?: string;
    lastMessageType: EntangleA2AMessage["messageType"];
    statePaths: RunnerStatePaths;
  }): Promise<ConversationRecord> {
    let currentConversation = input.conversation;
    const transitionInput = buildConversationTransitionInput({
      lastInboundMessageId: input.lastInboundMessageId,
      lastMessageType: input.lastMessageType
    });

    if (["closed", "expired", "rejected"].includes(currentConversation.status)) {
      return currentConversation;
    }

    if (currentConversation.status === "opened") {
      currentConversation = await transitionConversationStatus(
        input.statePaths,
        currentConversation,
        "acknowledged",
        transitionInput
      );
    }

    if (
      currentConversation.status === "acknowledged" ||
      currentConversation.status === "blocked"
    ) {
      currentConversation = await transitionConversationStatus(
        input.statePaths,
        currentConversation,
        "working",
        transitionInput
      );
    }

    if (currentConversation.status === "working") {
      currentConversation = await transitionConversationStatus(
        input.statePaths,
        currentConversation,
        "awaiting_approval",
        transitionInput
      );
    }

    return currentConversation;
  }

  private async transitionConversationAfterApprovalResponse(input: {
    closeOnResult: boolean;
    conversation: ConversationRecord;
    decision: "approved" | "rejected";
    lastInboundMessageId: string;
    lastMessageType: EntangleA2AMessage["messageType"];
    statePaths: RunnerStatePaths;
  }): Promise<ConversationRecord> {
    let currentConversation = input.conversation;

    if (["closed", "expired"].includes(currentConversation.status)) {
      return currentConversation;
    }

    if (input.decision === "rejected") {
      currentConversation = await this.transitionConversationToAwaitingApproval({
        conversation: currentConversation,
        lastInboundMessageId: input.lastInboundMessageId,
        lastMessageType: input.lastMessageType,
        statePaths: input.statePaths
      });

      if (currentConversation.status === "awaiting_approval") {
        currentConversation = await transitionConversationStatus(
          input.statePaths,
          currentConversation,
          "rejected",
          buildConversationTransitionInput({
            lastInboundMessageId: input.lastInboundMessageId,
            lastMessageType: input.lastMessageType
          })
        );
      }

      if (input.closeOnResult && currentConversation.status === "rejected") {
        return transitionConversationStatus(
          input.statePaths,
          currentConversation,
          "closed",
          buildConversationTransitionInput({
            lastInboundMessageId: input.lastInboundMessageId,
            lastMessageType: input.lastMessageType
          })
        );
      }

      return currentConversation;
    }

    if (currentConversation.status === "awaiting_approval") {
      currentConversation = await transitionConversationStatus(
        input.statePaths,
        currentConversation,
        "working",
        buildConversationTransitionInput({
          lastInboundMessageId: input.lastInboundMessageId,
          lastMessageType: input.lastMessageType
        })
      );
    } else if (currentConversation.status !== "working") {
      currentConversation = await advanceConversationToWorking(
        input.statePaths,
        currentConversation,
        {
          lastInboundMessageId: input.lastInboundMessageId,
          lastMessageType: input.lastMessageType
        }
      );
    }

    return input.closeOnResult
      ? this.transitionConversationToClosed({
          conversation: currentConversation,
          lastInboundMessageId: input.lastInboundMessageId,
          lastMessageType: input.lastMessageType,
          statePaths: input.statePaths
        })
      : currentConversation;
  }

  private async completeSessionIfNoOpenConversations(input: {
    lastMessageId: string;
    lastMessageType: EntangleA2AMessage["messageType"];
    session: SessionRecord;
    statePaths: RunnerStatePaths;
  }): Promise<SessionRecord> {
    const [approvalRecords, conversationRecords] = await Promise.all([
      listApprovalRecords(input.statePaths),
      listConversationRecords(input.statePaths)
    ]);
    const activeConversationIds = listOpenConversationIdsForSession({
      conversationRecords,
      sessionId: input.session.sessionId
    });
    const waitingApprovalIds = listUnapprovedWaitingApprovalIds({
      approvalRecords: approvalRecords.filter(
        (approvalRecord) => approvalRecord.sessionId === input.session.sessionId
      ),
      sessionRecord: input.session
    });
    const currentSession: SessionRecord = {
      ...input.session,
      activeConversationIds,
      waitingApprovalIds
    };

    if (
      currentSession.status === "waiting_approval" &&
      currentSession.waitingApprovalIds.length === 0
    ) {
      const activeSession = await transitionSessionStatus(
        input.statePaths,
        currentSession,
        "active",
        {
          lastMessageId: input.lastMessageId,
          lastMessageType: input.lastMessageType
        }
      );

      if (activeSession.activeConversationIds.length === 0) {
        return completeSession(input.statePaths, activeSession, {
          lastMessageId: input.lastMessageId,
          lastMessageType: input.lastMessageType
        });
      }

      return activeSession;
    }

    if (activeConversationIds.length > 0 || currentSession.status !== "active") {
      return transitionSessionStatus(
        input.statePaths,
        currentSession,
        currentSession.status,
        {
          lastMessageId: input.lastMessageId,
          lastMessageType: input.lastMessageType
        }
      );
    }

    if (currentSession.waitingApprovalIds.length > 0) {
      return transitionSessionStatus(
        input.statePaths,
        currentSession,
        "waiting_approval",
        {
          lastMessageId: input.lastMessageId,
          lastMessageType: input.lastMessageType
        }
      );
    }

    return completeSession(input.statePaths, currentSession, {
      lastMessageId: input.lastMessageId,
      lastMessageType: input.lastMessageType
    });
  }

  private async publishHandoffMessages(input: {
    envelope: RunnerInboundEnvelope;
    plans: ResolvedHandoffPlan[];
    producedArtifacts: ArtifactRecord[];
    statePaths: RunnerStatePaths;
    turnId: string;
  }): Promise<RunnerPublishedEnvelope[]> {
    const publishedEnvelopes: RunnerPublishedEnvelope[] = [];

    for (const plan of input.plans) {
      const message = buildHandoffMessage({
        context: this.context,
        envelope: input.envelope,
        plan,
        producedArtifacts: input.producedArtifacts,
        sourceRunnerTurnId: input.turnId
      });
      const validation = validateA2AMessageDocument(message);

      if (!validation.ok) {
        throw new RunnerHandoffPolicyError(
          `Runner built an invalid task.handoff message: ${validation.findings
            .map((finding) => finding.message)
            .join("; ")}`
        );
      }

      const openedAt = nowIsoString();
      const outboundConversation: ConversationRecord = {
        artifactIds: message.work.artifactRefs.map(
          (artifactRef) => artifactRef.artifactId
        ),
        conversationId: message.conversationId,
        followupCount: 1,
        graphId: message.graphId,
        initiator: "local",
        lastMessageType: message.messageType,
        localNodeId: this.context.binding.node.nodeId,
        localPubkey: this.context.identityContext.publicKey,
        openedAt,
        peerNodeId: message.toNodeId,
        peerPubkey: message.toPubkey,
        responsePolicy: message.responsePolicy,
        sessionId: message.sessionId,
        status: determineHandoffConversationStatus(message.responsePolicy),
        updatedAt: openedAt
      };
      await writeConversationRecord(input.statePaths, outboundConversation);

      const publishedEnvelope = await this.transport.publish(message);
      const latestConversation =
        (await readConversationRecord(
          input.statePaths,
          outboundConversation.conversationId
        )) ?? outboundConversation;

      await writeConversationRecord(input.statePaths, {
        ...latestConversation,
        lastMessageType: latestConversation.lastInboundMessageId
          ? latestConversation.lastMessageType
          : message.messageType,
        lastOutboundMessageId: publishedEnvelope.eventId,
        updatedAt: latestConversation.lastInboundMessageId
          ? latestConversation.updatedAt
          : publishedEnvelope.receivedAt
      });
      publishedEnvelopes.push(publishedEnvelope);
    }

    return publishedEnvelopes;
  }

  private async handleApprovalRequestEnvelope(input: {
    conversation: ConversationRecord;
    envelope: RunnerInboundEnvelope;
    session: SessionRecord;
    statePaths: RunnerStatePaths;
  }): Promise<{
    conversation: ConversationRecord;
    session: SessionRecord;
  }> {
    const metadata = entangleA2AApprovalRequestMetadataSchema.safeParse(
      input.envelope.message.work.metadata
    );

    if (!metadata.success) {
      return {
        conversation: input.conversation,
        session: input.session
      };
    }

    const { approval } = metadata.data;
    const approverNodeIds =
      approval.approverNodeIds.length > 0
        ? approval.approverNodeIds
        : [input.envelope.message.toNodeId];
    const existingApproval = await readApprovalRecord(
      input.statePaths,
      approval.approvalId
    );

    if (!existingApproval || existingApproval.status === "pending") {
      await writeApprovalRecord(input.statePaths, {
        approvalId: approval.approvalId,
        approverNodeIds: existingApproval
          ? mergeIdentifierLists(existingApproval.approverNodeIds, approverNodeIds)
          : approverNodeIds,
        conversationId: input.envelope.message.conversationId,
        graphId: input.envelope.message.graphId,
        reason: approval.reason ?? input.envelope.message.work.summary,
        requestedAt: existingApproval?.requestedAt ?? input.envelope.receivedAt,
        requestedByNodeId: input.envelope.message.fromNodeId,
        sessionId: input.envelope.message.sessionId,
        status: "pending",
        updatedAt: input.envelope.receivedAt
      });
    }

    const waitingSession: SessionRecord = {
      ...input.session,
      waitingApprovalIds: mergeIdentifierLists(input.session.waitingApprovalIds, [
        approval.approvalId
      ])
    };
    await writeSessionRecord(input.statePaths, waitingSession);
    const nextSession = isAllowedSessionLifecycleTransition(
      waitingSession.status,
      "waiting_approval"
    )
      ? await transitionSessionStatus(input.statePaths, waitingSession, "waiting_approval", {
          lastMessageId: input.envelope.eventId,
          lastMessageType: input.envelope.message.messageType
        })
      : waitingSession;
    const nextConversation = await this.transitionConversationToAwaitingApproval({
      conversation: input.conversation,
      lastInboundMessageId: input.envelope.eventId,
      lastMessageType: input.envelope.message.messageType,
      statePaths: input.statePaths
    });

    return {
      conversation: nextConversation,
      session: nextSession
    };
  }

  private async handleApprovalResponseEnvelope(input: {
    conversation: ConversationRecord;
    envelope: RunnerInboundEnvelope;
    session: SessionRecord;
    statePaths: RunnerStatePaths;
  }): Promise<{
    conversation: ConversationRecord;
    session: SessionRecord;
  }> {
    const metadata = entangleA2AApprovalResponseMetadataSchema.safeParse(
      input.envelope.message.work.metadata
    );

    if (!metadata.success) {
      return {
        conversation: input.conversation,
        session: input.session
      };
    }

    const { approval } = metadata.data;
    const approvalRecord = await readApprovalRecord(
      input.statePaths,
      approval.approvalId
    );

    if (!approvalRecord) {
      return {
        conversation: input.conversation,
        session: input.session
      };
    }

    const nextApprovalStatus = approval.decision;
    const nextApprovalRecord = await transitionApprovalStatus(
      input.statePaths,
      approvalRecord,
      nextApprovalStatus,
      {
        approverNodeId: input.envelope.message.fromNodeId,
        updatedAt: input.envelope.receivedAt
      }
    );

    if (nextApprovalRecord.status !== nextApprovalStatus) {
      return {
        conversation: input.conversation,
        session: input.session
      };
    }

    const nextConversation = await this.transitionConversationAfterApprovalResponse({
      closeOnResult: input.envelope.message.responsePolicy.closeOnResult,
      conversation: input.conversation,
      decision: approval.decision,
      lastInboundMessageId: input.envelope.eventId,
      lastMessageType: input.envelope.message.messageType,
      statePaths: input.statePaths
    });

    if (approval.decision === "rejected") {
      const rejectedSession: SessionRecord = {
        ...input.session,
        activeConversationIds: [],
        waitingApprovalIds: []
      };
      const failedSession = isAllowedSessionLifecycleTransition(
        rejectedSession.status,
        "failed"
      )
        ? await transitionSessionStatus(input.statePaths, rejectedSession, "failed", {
            lastMessageId: input.envelope.eventId,
            lastMessageType: input.envelope.message.messageType
          })
        : rejectedSession;

      return {
        conversation: nextConversation,
        session: failedSession
      };
    }

    const nextSession = await this.completeSessionIfNoOpenConversations({
      lastMessageId: input.envelope.eventId,
      lastMessageType: input.envelope.message.messageType,
      session: input.session,
      statePaths: input.statePaths
    });

    return {
      conversation: nextConversation,
      session: nextSession
    };
  }

  private async handleCoordinationEnvelope(
    envelope: RunnerInboundEnvelope
  ): Promise<RunnerServiceHandleResult> {
    const statePaths =
      this.statePaths ??
      (await ensureRunnerStatePaths(this.context.workspace.runtimeRoot));
    this.statePaths = statePaths;

    if (envelope.message.messageType === "approval.response") {
      const metadata = entangleA2AApprovalResponseMetadataSchema.safeParse(
        envelope.message.work.metadata
      );
      const [approvalRecord, conversationRecord, sessionRecord] =
        await Promise.all([
          metadata.success
            ? readApprovalRecord(statePaths, metadata.data.approval.approvalId)
            : undefined,
          readConversationRecord(statePaths, envelope.message.conversationId),
          readSessionRecord(statePaths, envelope.message.sessionId)
        ]);

      if (!approvalRecord && !conversationRecord && !sessionRecord) {
        return {
          handled: true,
          handoffs: [],
          response: undefined
        };
      }
    }

    const inboundArtifactIds = envelope.message.work.artifactRefs.map(
      (artifactRef) => artifactRef.artifactId
    );
    const sessionRecord =
      (await readSessionRecord(statePaths, envelope.message.sessionId)) ??
      ({
        activeConversationIds: [envelope.message.conversationId],
        entrypointNodeId: envelope.message.toNodeId,
        graphId: envelope.message.graphId,
        intent: envelope.message.intent,
        lastMessageId: envelope.eventId,
        lastMessageType: envelope.message.messageType,
        openedAt: envelope.receivedAt,
        originatingNodeId: envelope.message.fromNodeId,
        ownerNodeId: this.context.binding.node.nodeId,
        rootArtifactIds: inboundArtifactIds,
        sessionId: envelope.message.sessionId,
        status: "active",
        traceId: envelope.message.sessionId,
        updatedAt: envelope.receivedAt,
        waitingApprovalIds: []
      } satisfies SessionRecord);

    const currentSession: SessionRecord = {
      ...sessionRecord,
      activeConversationIds: mergeIdentifierLists(
        sessionRecord.activeConversationIds,
        [envelope.message.conversationId]
      ),
      lastMessageId: envelope.eventId,
      lastMessageType: envelope.message.messageType,
      rootArtifactIds: mergeIdentifierLists(
        sessionRecord.rootArtifactIds,
        inboundArtifactIds
      ),
      updatedAt: envelope.receivedAt
    };
    await writeSessionRecord(statePaths, currentSession);

    const conversationRecord =
      (await readConversationRecord(statePaths, envelope.message.conversationId)) ??
      buildInitialConversationRecord(this.context, envelope);
    const currentConversation: ConversationRecord = {
      ...conversationRecord,
      artifactIds: mergeIdentifierLists(
        conversationRecord.artifactIds,
        inboundArtifactIds
      ),
      lastInboundMessageId: envelope.eventId,
      lastMessageType: envelope.message.messageType,
      updatedAt: envelope.receivedAt
    };
    await writeConversationRecord(statePaths, currentConversation);

    if (envelope.message.messageType === "approval.request") {
      await this.handleApprovalRequestEnvelope({
        conversation: currentConversation,
        envelope,
        session: currentSession,
        statePaths
      });
    } else if (envelope.message.messageType === "approval.response") {
      await this.handleApprovalResponseEnvelope({
        conversation: currentConversation,
        envelope,
        session: currentSession,
        statePaths
      });
    } else if (envelope.message.messageType === "task.result") {
      if (envelope.message.responsePolicy.closeOnResult) {
        await this.transitionConversationToClosed({
          conversation: currentConversation,
          lastInboundMessageId: envelope.eventId,
          lastMessageType: envelope.message.messageType,
          statePaths
        });
      } else {
        await this.transitionConversationToResolved({
          conversation: currentConversation,
          lastInboundMessageId: envelope.eventId,
          lastMessageType: envelope.message.messageType,
          statePaths
        });
      }

      await this.completeSessionIfNoOpenConversations({
        lastMessageId: envelope.eventId,
        lastMessageType: envelope.message.messageType,
        session: currentSession,
        statePaths
      });
    } else if (envelope.message.messageType === "conversation.close") {
      await this.transitionConversationToClosed({
        conversation: currentConversation,
        lastInboundMessageId: envelope.eventId,
        lastMessageType: envelope.message.messageType,
        statePaths
      });
      await this.completeSessionIfNoOpenConversations({
        lastMessageId: envelope.eventId,
        lastMessageType: envelope.message.messageType,
        session: currentSession,
        statePaths
      });
    }

    return {
      handled: true,
      handoffs: [],
      response: undefined
    };
  }

  private async runOptionalMemorySynthesis(input: {
    artifactInputs: EngineArtifactInput[];
    artifactRefs: ArtifactRef[];
    consumedArtifactIds: string[];
    envelope: RunnerInboundEnvelope;
    producedArtifactIds: string[];
    recentWorkSummaryPath: string;
    result: AgentEngineTurnResult;
    statePaths: RunnerStatePaths;
    taskPagePath: string;
    turnRecord: RunnerTurnRecord;
    turnId: string;
  }): Promise<RunnerTurnRecord> {
    if (!this.memorySynthesizer) {
      return input.turnRecord;
    }

    let memorySynthesisOutcome: MemorySynthesisOutcome;

    try {
      const synthesisResult = await this.memorySynthesizer.synthesize({
        artifactInputs: input.artifactInputs,
        artifactRefs: input.artifactRefs,
        consumedArtifactIds: input.consumedArtifactIds,
        context: this.context,
        envelope: input.envelope,
        producedArtifactIds: input.producedArtifactIds,
        recentWorkSummaryPath: input.recentWorkSummaryPath,
        result: input.result,
        taskPagePath: input.taskPagePath,
        turnId: input.turnId
      });

      memorySynthesisOutcome = synthesisResult.ok
        ? {
            status: "succeeded",
            updatedAt: nowIsoString(),
            updatedSummaryPagePaths: synthesisResult.updatedSummaryPagePaths,
            workingContextPagePath: synthesisResult.workingContextPagePath
          }
        : {
            errorMessage: truncateBoundedText(synthesisResult.errorMessage),
            status: "failed",
            updatedAt: nowIsoString()
          };
    } catch (error: unknown) {
      memorySynthesisOutcome = {
        errorMessage:
          error instanceof Error
            ? truncateBoundedText(error.message)
            : "Optional memory synthesis failed unexpectedly.",
        status: "failed",
        updatedAt: nowIsoString()
      };
    }

    const nextTurnRecord: RunnerTurnRecord = {
      ...input.turnRecord,
      memorySynthesisOutcome,
      updatedAt: nowIsoString()
    };
    await writeRunnerTurnRecord(input.statePaths, nextTurnRecord);
    return nextTurnRecord;
  }

  async handleInboundEnvelope(
    envelope: RunnerInboundEnvelope
  ): Promise<RunnerServiceHandleResult> {
    if (envelope.message.toNodeId !== this.context.binding.node.nodeId) {
      return {
        handled: false,
        reason: "wrong_node"
      };
    }

    if (envelope.message.toPubkey !== this.context.identityContext.publicKey) {
      return {
        handled: false,
        reason: "wrong_pubkey"
      };
    }

    const validation = validateA2AMessageDocument(envelope.message);

    if (!validation.ok) {
      return {
        handled: false,
        reason: "invalid_message"
      };
    }

    if (!isExecutableWorkMessage(envelope.message.messageType)) {
      return this.handleCoordinationEnvelope(envelope);
    }

    const statePaths =
      this.statePaths ??
      (await ensureRunnerStatePaths(this.context.workspace.runtimeRoot));
    this.statePaths = statePaths;
    let turnRecord: RunnerTurnRecord = {
      conversationId: envelope.message.conversationId,
      consumedArtifactIds: [],
      emittedHandoffMessageIds: [],
      graphId: envelope.message.graphId,
      messageId: envelope.eventId,
      nodeId: this.context.binding.node.nodeId,
      phase: "receiving",
      producedArtifactIds: [],
      sessionId: envelope.message.sessionId,
      startedAt: envelope.receivedAt,
      triggerKind: "message",
      turnId: buildSyntheticTurnId("turn"),
      updatedAt: envelope.receivedAt
    };
    await writeRunnerTurnRecord(statePaths, turnRecord);
    let currentSession: SessionRecord | undefined;
    let currentConversation: ConversationRecord | undefined;

    try {
      turnRecord = await writeRunnerPhase(statePaths, turnRecord, "validating");

      const sessionRecord =
        (await readSessionRecord(statePaths, envelope.message.sessionId)) ??
        buildInitialSessionRecord(this.context, envelope);
      await writeSessionRecord(statePaths, sessionRecord);
      currentSession = await advanceSessionToProcessing(statePaths, sessionRecord, {
        lastMessageId: envelope.eventId,
        lastMessageType: envelope.message.messageType
      });

      const conversationRecord =
        (await readConversationRecord(statePaths, envelope.message.conversationId)) ??
        buildInitialConversationRecord(this.context, envelope);
      await writeConversationRecord(statePaths, conversationRecord);
      currentConversation = await advanceConversationToWorking(
        statePaths,
        conversationRecord,
        {
          lastInboundMessageId: envelope.eventId,
          lastMessageType: envelope.message.messageType
        }
      );

      turnRecord = await writeRunnerPhase(statePaths, turnRecord, "contextualizing");
      let retrievedArtifacts;

      try {
        retrievedArtifacts = await this.artifactBackend.retrieveInboundArtifacts({
          artifactRefs: envelope.message.work.artifactRefs,
          context: this.context
        });
      } catch (error) {
        if (error instanceof RunnerArtifactRetrievalError) {
          await Promise.all(
            error.artifactRecords.map((artifactRecord) =>
              writeArtifactRecord(statePaths, artifactRecord)
            )
          );
        }

        throw error;
      }

      await Promise.all(
        retrievedArtifacts.artifacts.map((artifactRecord) =>
          writeArtifactRecord(statePaths, artifactRecord)
        )
      );
      const consumedArtifactIds = retrievedArtifacts.artifacts.map(
        (artifactRecord) => artifactRecord.ref.artifactId
      );
      turnRecord = {
        ...turnRecord,
        consumedArtifactIds,
        updatedAt: nowIsoString()
      };
      await writeRunnerTurnRecord(statePaths, turnRecord);
      currentConversation = {
        ...currentConversation,
        artifactIds: mergeIdentifierLists(
          currentConversation.artifactIds,
          consumedArtifactIds
        )
      };
      await writeConversationRecord(statePaths, currentConversation);

      const turnRequest = await buildAgentEngineTurnRequest(this.context, {
        artifactInputs: retrievedArtifacts.artifactInputs,
        inboundMessage: envelope.message,
        toolDefinitions: await this.resolveToolDefinitions()
      });
      turnRecord = await writeRunnerPhase(statePaths, turnRecord, "reasoning");
      turnRecord = await writeRunnerPhase(statePaths, turnRecord, "acting");
      const sourceChangeBaseline = await prepareSourceChangeHarvest(this.context);
      let result: AgentEngineTurnResult;
      let handoffPlans: ResolvedHandoffPlan[] = [];

      try {
        result = parseEngineTurnResult(await this.engine.executeTurn(turnRequest));
        handoffPlans = resolveHandoffPlans(this.context, result.handoffDirectives);
      } catch (error) {
        const sourceChangeSummary = await harvestSourceChanges(
          this.context,
          sourceChangeBaseline
        );
        turnRecord = {
          ...turnRecord,
          engineOutcome: buildFailedEngineTurnOutcome(this.context, error),
          sourceChangeSummary,
          updatedAt: nowIsoString()
        };
        await writeRunnerTurnRecord(statePaths, turnRecord);
        throw error;
      }

      const sourceChangeSummary = await harvestSourceChanges(
        this.context,
        sourceChangeBaseline
      );
      turnRecord = {
        ...turnRecord,
        engineOutcome: buildEngineTurnOutcome(result, this.context),
        sourceChangeSummary,
        updatedAt: nowIsoString()
      };
      await writeRunnerTurnRecord(statePaths, turnRecord);
      turnRecord = await writeRunnerPhase(statePaths, turnRecord, "persisting");
      const materializedArtifacts = await this.artifactBackend.materializeTurnArtifacts({
        context: this.context,
        envelope,
        result,
        turnId: turnRecord.turnId
      });
      const producedArtifactIds = materializedArtifacts.artifacts.map(
        (artifactRecord) => artifactRecord.ref.artifactId
      );
      await Promise.all(
        materializedArtifacts.artifacts.map((artifactRecord) =>
          writeArtifactRecord(statePaths, artifactRecord)
        )
      );
      turnRecord = {
        ...turnRecord,
        producedArtifactIds,
        updatedAt: nowIsoString()
      };
      await writeRunnerTurnRecord(statePaths, turnRecord);
      currentConversation = {
        ...currentConversation,
        artifactIds: mergeIdentifierLists(
          currentConversation.artifactIds,
          producedArtifactIds
        )
      };
      await writeConversationRecord(statePaths, currentConversation);
      currentSession = {
        ...currentSession,
        rootArtifactIds: mergeIdentifierLists(
          currentSession.rootArtifactIds,
          producedArtifactIds
        )
      };
      await writeSessionRecord(statePaths, currentSession);
      let publishedHandoffs: RunnerPublishedEnvelope[] = [];

      if (handoffPlans.length > 0) {
        turnRecord = await writeRunnerPhase(statePaths, turnRecord, "emitting");
        publishedHandoffs = await this.publishHandoffMessages({
          envelope,
          plans: handoffPlans,
          producedArtifacts: materializedArtifacts.artifacts,
          statePaths,
          turnId: turnRecord.turnId
        });
        const latestSession =
          (await readSessionRecord(statePaths, currentSession.sessionId)) ??
          currentSession;
        const lastPublishedHandoff =
          publishedHandoffs[publishedHandoffs.length - 1];
        const shouldPreserveLatestCoordinationMessage =
          latestSession.lastMessageType === "task.result" ||
          latestSession.lastMessageType === "conversation.close";
        const nextLastMessageId = shouldPreserveLatestCoordinationMessage
          ? latestSession.lastMessageId
          : lastPublishedHandoff?.eventId ?? latestSession.lastMessageId;
        const nextLastMessageType = shouldPreserveLatestCoordinationMessage
          ? latestSession.lastMessageType
          : lastPublishedHandoff?.message.messageType ??
            latestSession.lastMessageType;

        currentSession = {
          ...latestSession,
          activeConversationIds: mergeIdentifierLists(
            latestSession.activeConversationIds,
            [
              ...currentSession.activeConversationIds,
              ...publishedHandoffs.map(
                (publishedEnvelope) => publishedEnvelope.message.conversationId
              )
            ]
          ),
          ...(nextLastMessageId ? { lastMessageId: nextLastMessageId } : {}),
          ...(nextLastMessageType ? { lastMessageType: nextLastMessageType } : {}),
          rootArtifactIds: mergeIdentifierLists(
            latestSession.rootArtifactIds,
            currentSession.rootArtifactIds
          ),
          updatedAt: nowIsoString()
        };
        await writeSessionRecord(statePaths, currentSession);
        turnRecord = {
          ...turnRecord,
          emittedHandoffMessageIds: publishedHandoffs.map(
            (publishedEnvelope) => publishedEnvelope.eventId
          ),
          updatedAt: nowIsoString()
        };
        await writeRunnerTurnRecord(statePaths, turnRecord);
      }
      const memoryUpdate = await performPostTurnMemoryUpdate({
        consumedArtifactIds,
        context: this.context,
        envelope,
        producedArtifactIds,
        result,
        turnId: turnRecord.turnId
      });
      const memorySynthesisInput = {
        artifactInputs: [
          ...retrievedArtifacts.artifactInputs,
          ...buildArtifactInputsFromMaterializedRecords(
            materializedArtifacts.artifacts
          )
        ],
        artifactRefs: [
          ...envelope.message.work.artifactRefs,
          ...materializedArtifacts.artifacts.map((artifactRecord) => artifactRecord.ref)
        ],
        consumedArtifactIds,
        envelope,
        producedArtifactIds,
        recentWorkSummaryPath: memoryUpdate.summaryPagePath,
        result,
        statePaths,
        taskPagePath: memoryUpdate.taskPagePath,
        turnRecord,
        turnId: turnRecord.turnId
      };

      currentConversation = await transitionConversationStatus(
        statePaths,
        currentConversation,
        "resolved",
        {
          lastInboundMessageId: envelope.eventId,
          lastMessageType: envelope.message.messageType
        }
      );
      currentSession = await this.completeSessionIfNoOpenConversations({
        lastMessageId: envelope.eventId,
        lastMessageType: envelope.message.messageType,
        session: currentSession,
        statePaths
      });

      if (!envelope.message.responsePolicy.responseRequired) {
        if (envelope.message.responsePolicy.closeOnResult) {
          currentConversation = await transitionConversationStatus(
            statePaths,
            currentConversation,
            "closed",
            {
              lastMessageType: envelope.message.messageType
            }
          );
        }

        turnRecord = await this.runOptionalMemorySynthesis(memorySynthesisInput);

        return {
          handled: true,
          handoffs: publishedHandoffs,
          response: undefined
        };
      }

      turnRecord = await writeRunnerPhase(statePaths, turnRecord, "emitting");
      const responseMessage = buildResponseMessage({
        context: this.context,
        envelope,
        producedArtifacts: materializedArtifacts.artifacts,
        result
      });
      const publishedEnvelope = await this.transport.publish(responseMessage);

      currentConversation = await transitionConversationStatus(
        statePaths,
        currentConversation,
        envelope.message.responsePolicy.closeOnResult ? "closed" : "resolved",
        {
          followupCount: currentConversation.followupCount + 1,
          lastMessageType: responseMessage.messageType,
          lastOutboundMessageId: publishedEnvelope.eventId
        }
      );
      currentSession = await transitionSessionStatus(
        statePaths,
        currentSession,
        currentSession.status,
        {
          lastMessageId: publishedEnvelope.eventId,
          lastMessageType: responseMessage.messageType
        }
      );
      currentSession = await this.completeSessionIfNoOpenConversations({
        lastMessageId: publishedEnvelope.eventId,
        lastMessageType: responseMessage.messageType,
        session: currentSession,
        statePaths
      });
      turnRecord = await this.runOptionalMemorySynthesis(memorySynthesisInput);

      return {
        handled: true,
        handoffs: publishedHandoffs,
        response: publishedEnvelope
      };
    } catch (error: unknown) {
      await writeRunnerPhase(statePaths, turnRecord, "errored");

      if (
        currentSession &&
        isAllowedSessionLifecycleTransition(currentSession.status, "failed")
      ) {
        await transitionSessionStatus(statePaths, currentSession, "failed", {
          lastMessageId: envelope.eventId,
          lastMessageType: envelope.message.messageType
        });
      }

      throw error;
    }
  }

  async start(): Promise<RunnerServiceStartResult> {
    if (this.subscription) {
      return {
        nodeId: this.context.binding.node.nodeId,
        publicKey: this.context.identityContext.publicKey,
        runtimeRoot: this.context.workspace.runtimeRoot
      };
    }

    this.statePaths = await ensureRunnerStatePaths(this.context.workspace.runtimeRoot);
    await repairSessionDerivedWorkState(this.statePaths);
    this.subscription = await this.transport.subscribe({
      onMessage: async (envelope) => {
        await this.handleInboundEnvelope(envelope);
      },
      recipientPubkey: this.context.identityContext.publicKey
    });

    return {
      nodeId: this.context.binding.node.nodeId,
      publicKey: this.context.identityContext.publicKey,
      runtimeRoot: this.context.workspace.runtimeRoot
    };
  }

  async stop(): Promise<void> {
    await this.subscription?.close();
    this.subscription = undefined;
    await this.transport.close();
  }
}
