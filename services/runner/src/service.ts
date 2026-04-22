import { randomUUID } from "node:crypto";
import type {
  AgentEngineTurnResult,
  ConversationLifecycleState,
  ConversationRecord,
  EffectiveRuntimeContext,
  EntangleA2AMessage,
  RunnerPhase,
  RunnerTurnRecord,
  SessionLifecycleState,
  SessionRecord
} from "@entangle/types";
import {
  isAllowedConversationLifecycleTransition,
  isAllowedSessionLifecycleTransition
} from "@entangle/types";
import { validateA2AMessageDocument } from "@entangle/validator";
import type { AgentEngine } from "@entangle/agent-engine";
import { createStubAgentEngine } from "@entangle/agent-engine";
import { buildAgentEngineTurnRequest } from "./runtime-context.js";
import {
  type RunnerStatePaths,
  ensureRunnerStatePaths,
  readConversationRecord,
  readSessionRecord,
  writeConversationRecord,
  writeRunnerTurnRecord,
  writeSessionRecord
} from "./state-store.js";
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
      response: RunnerPublishedEnvelope | undefined;
    };

function nowIsoString(): string {
  return new Date().toISOString();
}

function buildSyntheticTurnId(prefix: string): string {
  return `${prefix}-${randomUUID().replace(/-/g, "")}`;
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
      artifactRefs: input.envelope.message.work.artifactRefs,
      metadata: {
        stopReason: input.result.stopReason
      },
      summary:
        input.result.assistantMessages.join("\n").trim() ||
        `Node '${input.context.binding.node.nodeId}' completed the requested task.`
    }
  };
}

export class RunnerService {
  private readonly context: EffectiveRuntimeContext;
  private readonly engine: AgentEngine;
  private readonly transport: RunnerTransport;
  private subscription: RunnerTransportSubscription | undefined;
  private statePaths: RunnerStatePaths | undefined;

  constructor(input: {
    context: EffectiveRuntimeContext;
    engine?: AgentEngine;
    transport: RunnerTransport;
  }) {
    this.context = input.context;
    this.engine = input.engine ?? createStubAgentEngine();
    this.transport = input.transport;
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

    const statePaths =
      this.statePaths ??
      (await ensureRunnerStatePaths(this.context.workspace.runtimeRoot));
    this.statePaths = statePaths;
    let turnRecord: RunnerTurnRecord = {
      conversationId: envelope.message.conversationId,
      graphId: envelope.message.graphId,
      messageId: envelope.eventId,
      nodeId: this.context.binding.node.nodeId,
      phase: "receiving",
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
      const turnRequest = await buildAgentEngineTurnRequest(this.context, {
        inboundMessage: envelope.message
      });
      turnRecord = await writeRunnerPhase(statePaths, turnRecord, "reasoning");
      turnRecord = await writeRunnerPhase(statePaths, turnRecord, "acting");
      const result = await this.engine.executeTurn(turnRequest);
      turnRecord = await writeRunnerPhase(statePaths, turnRecord, "persisting");

      currentConversation = await transitionConversationStatus(
        statePaths,
        currentConversation,
        "resolved",
        {
          lastInboundMessageId: envelope.eventId,
          lastMessageType: envelope.message.messageType
        }
      );
      currentSession = await completeSession(statePaths, currentSession, {
        lastMessageId: envelope.eventId,
        lastMessageType: envelope.message.messageType
      });

      if (!envelope.message.responsePolicy.responseRequired) {
        if (envelope.message.responsePolicy.closeOnResult) {
          await transitionConversationStatus(
            statePaths,
            currentConversation,
            "closed",
            {
              lastMessageType: envelope.message.messageType
            }
          );
        }

        return {
          handled: true,
          response: undefined
        };
      }

      turnRecord = await writeRunnerPhase(statePaths, turnRecord, "emitting");
      const responseMessage = buildResponseMessage({
        context: this.context,
        envelope,
        result
      });
      const publishedEnvelope = await this.transport.publish(responseMessage);

      await transitionConversationStatus(
        statePaths,
        currentConversation,
        envelope.message.responsePolicy.closeOnResult ? "closed" : "resolved",
        {
          followupCount: currentConversation.followupCount + 1,
          lastMessageType: responseMessage.messageType,
          lastOutboundMessageId: publishedEnvelope.eventId
        }
      );
      await transitionSessionStatus(statePaths, currentSession, "completed", {
        lastMessageId: publishedEnvelope.eventId,
        lastMessageType: responseMessage.messageType
      });

      return {
        handled: true,
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
