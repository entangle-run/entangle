import type {
  ArtifactRef,
  EntangleControlEvent,
  EntangleObservationEvent,
  GitRepositoryTargetSelector,
  RuntimeAssignmentRecord,
  SessionCancellationRequestRecord,
  RunnerTrustState,
  SourceHistoryPublicationTarget
} from "@entangle/types";
import { entangleObservationEventSchema } from "@entangle/types";
import type {
  EntangleNostrFabricSubscription,
  EntangleNostrPublishedEvent
} from "@entangle/nostr-fabric";
import type { HostFederatedNostrTransport } from "./federated-nostr-transport.js";
import {
  recordApprovalUpdatedObservation,
  recordArtifactRefObservation,
  recordConversationUpdatedObservation,
  recordRunnerHeartbeat,
  recordRunnerHello,
  RunnerIdentityConflictError,
  recordRuntimeAssignmentReceiptObservation,
  recordRuntimeCommandReceiptObservation,
  recordRuntimeStatusObservation,
  recordRuntimeAssignmentAccepted,
  recordRuntimeAssignmentRejected,
  recordSessionUpdatedObservation,
  recordSourceChangeRefObservation,
  recordSourceHistoryRefObservation,
  recordSourceHistoryReplayedObservation,
  recordTurnUpdatedObservation,
  recordWikiRefObservation
} from "./state.js";

export type HostFederatedControlPlaneTransport = Pick<
  HostFederatedNostrTransport,
  "close" | "publishControlEvent" | "subscribeObservationEvents"
>;

export type HostFederatedObservationAction =
  | "ignored"
  | "published_control"
  | "recorded"
  | "recorded_and_published_control";

export type HostFederatedObservationResult = {
  action: HostFederatedObservationAction;
  controlEventId?: string;
  eventType: EntangleObservationEvent["payload"]["eventType"];
  reason?: "runner_identity_conflict";
  runnerId: string;
};

export class HostFederatedControlPlane {
  constructor(
    private readonly input: {
      clock?: () => string;
      transport: HostFederatedControlPlaneTransport;
    }
  ) {}

  close(): Promise<void> {
    return this.input.transport.close();
  }

  subscribeObservationEvents(input: {
    authRequired?: boolean;
    expectedRunnerPubkey?: string;
    hostAuthorityPubkey: string;
    relayUrls: string[];
  }): Promise<EntangleNostrFabricSubscription> {
    return this.input.transport.subscribeObservationEvents({
      ...(input.authRequired !== undefined
        ? { authRequired: input.authRequired }
        : {}),
      ...(input.expectedRunnerPubkey !== undefined
        ? { expectedRunnerPubkey: input.expectedRunnerPubkey }
        : {}),
      hostAuthorityPubkey: input.hostAuthorityPubkey,
      onEvent: async (event) => {
        await this.handleObservationEvent(event, {
          ...(input.authRequired !== undefined
            ? { authRequired: input.authRequired }
            : {}),
          relayUrls: input.relayUrls
        });
      },
      relayUrls: input.relayUrls
    });
  }

  async handleObservationEvent(
    event: EntangleObservationEvent,
    input: {
      authRequired?: boolean;
      relayUrls?: string[];
    } = {}
  ): Promise<HostFederatedObservationResult> {
    const parsedEvent = entangleObservationEventSchema.parse(event);
    const { payload } = parsedEvent;

    try {
      return await this.recordObservationPayload(payload, input);
    } catch (error) {
      if (error instanceof RunnerIdentityConflictError) {
        return {
          action: "ignored",
          eventType: payload.eventType,
          reason: "runner_identity_conflict",
          runnerId: payload.runnerId
        };
      }

      throw error;
    }
  }

  private async recordObservationPayload(
    payload: EntangleObservationEvent["payload"],
    input: {
      authRequired?: boolean;
      relayUrls?: string[];
    }
  ): Promise<HostFederatedObservationResult> {
    if (payload.eventType === "runner.hello") {
      const inspection = await recordRunnerHello(payload);
      const published =
        input.relayUrls && input.relayUrls.length > 0
          ? await this.publishRunnerHelloAck({
              ...(input.authRequired !== undefined
                ? { authRequired: input.authRequired }
                : {}),
              hostAuthorityPubkey: payload.hostAuthorityPubkey,
              relayUrls: input.relayUrls,
              runnerId: payload.runnerId,
              runnerPubkey: payload.runnerPubkey,
              trustState: inspection.runner.registration.trustState
            })
          : undefined;

      return {
        action: published ? "recorded_and_published_control" : "recorded",
        ...(published ? { controlEventId: published.event.envelope.eventId } : {}),
        eventType: payload.eventType,
        runnerId: payload.runnerId
      };
    }

    if (payload.eventType === "runner.heartbeat") {
      await recordRunnerHeartbeat(payload);
      return {
        action: "recorded",
        eventType: payload.eventType,
        runnerId: payload.runnerId
      };
    }

    if (payload.eventType === "assignment.accepted") {
      await recordRuntimeAssignmentAccepted(payload);
      return {
        action: "recorded",
        eventType: payload.eventType,
        runnerId: payload.runnerId
      };
    }

    if (payload.eventType === "assignment.rejected") {
      await recordRuntimeAssignmentRejected(payload);
      return {
        action: "recorded",
        eventType: payload.eventType,
        runnerId: payload.runnerId
      };
    }

    if (payload.eventType === "assignment.receipt") {
      await recordRuntimeAssignmentReceiptObservation(payload);
      return {
        action: "recorded",
        eventType: payload.eventType,
        runnerId: payload.runnerId
      };
    }

    if (payload.eventType === "runtime.command.receipt") {
      await recordRuntimeCommandReceiptObservation(payload);
      return {
        action: "recorded",
        eventType: payload.eventType,
        runnerId: payload.runnerId
      };
    }

    if (payload.eventType === "runtime.status") {
      await recordRuntimeStatusObservation(payload);
      return {
        action: "recorded",
        eventType: payload.eventType,
        runnerId: payload.runnerId
      };
    }

    if (payload.eventType === "session.updated") {
      await recordSessionUpdatedObservation(payload);
      return {
        action: "recorded",
        eventType: payload.eventType,
        runnerId: payload.runnerId
      };
    }

    if (payload.eventType === "conversation.updated") {
      await recordConversationUpdatedObservation(payload);
      return {
        action: "recorded",
        eventType: payload.eventType,
        runnerId: payload.runnerId
      };
    }

    if (payload.eventType === "turn.updated") {
      await recordTurnUpdatedObservation(payload);
      return {
        action: "recorded",
        eventType: payload.eventType,
        runnerId: payload.runnerId
      };
    }

    if (payload.eventType === "approval.updated") {
      await recordApprovalUpdatedObservation(payload);
      return {
        action: "recorded",
        eventType: payload.eventType,
        runnerId: payload.runnerId
      };
    }

    if (payload.eventType === "artifact.ref") {
      await recordArtifactRefObservation(payload);
      return {
        action: "recorded",
        eventType: payload.eventType,
        runnerId: payload.runnerId
      };
    }

    if (payload.eventType === "source_change.ref") {
      await recordSourceChangeRefObservation(payload);
      return {
        action: "recorded",
        eventType: payload.eventType,
        runnerId: payload.runnerId
      };
    }

    if (payload.eventType === "source_history.ref") {
      await recordSourceHistoryRefObservation(payload);
      return {
        action: "recorded",
        eventType: payload.eventType,
        runnerId: payload.runnerId
      };
    }

    if (payload.eventType === "source_history.replayed") {
      await recordSourceHistoryReplayedObservation(payload);
      return {
        action: "recorded",
        eventType: payload.eventType,
        runnerId: payload.runnerId
      };
    }

    if (payload.eventType === "wiki.ref") {
      await recordWikiRefObservation(payload);
      return {
        action: "recorded",
        eventType: payload.eventType,
        runnerId: payload.runnerId
      };
    }

    return {
      action: "ignored",
      eventType: payload.eventType,
      runnerId: payload.runnerId
    };
  }

  publishRuntimeAssignmentOffer(input: {
    assignment: RuntimeAssignmentRecord;
    authRequired?: boolean;
    correlationId?: string;
    relayUrls: string[];
  }): Promise<EntangleNostrPublishedEvent<EntangleControlEvent>> {
    return this.input.transport.publishControlEvent({
      ...(input.authRequired !== undefined
        ? { authRequired: input.authRequired }
        : {}),
      ...(input.correlationId !== undefined
        ? { correlationId: input.correlationId }
        : {}),
      payload: {
        assignment: input.assignment,
        eventType: "runtime.assignment.offer",
        hostAuthorityPubkey: input.assignment.hostAuthorityPubkey,
        issuedAt: this.now(),
        protocol: "entangle.control.v1",
        runnerId: input.assignment.runnerId,
        runnerPubkey: input.assignment.runnerPubkey
      },
      relayUrls: input.relayUrls
    });
  }

  publishRuntimeAssignmentRevoke(input: {
    assignment: RuntimeAssignmentRecord;
    authRequired?: boolean;
    correlationId?: string;
    reason?: string;
    relayUrls: string[];
  }): Promise<EntangleNostrPublishedEvent<EntangleControlEvent>> {
    return this.input.transport.publishControlEvent({
      ...(input.authRequired !== undefined
        ? { authRequired: input.authRequired }
        : {}),
      ...(input.correlationId !== undefined
        ? { correlationId: input.correlationId }
        : {}),
      payload: {
        assignmentId: input.assignment.assignmentId,
        eventType: "runtime.assignment.revoke",
        hostAuthorityPubkey: input.assignment.hostAuthorityPubkey,
        issuedAt: this.now(),
        protocol: "entangle.control.v1",
        ...(input.reason ?? input.assignment.revocationReason
          ? { reason: input.reason ?? input.assignment.revocationReason }
          : {}),
        revokedAt: input.assignment.revokedAt ?? this.now(),
        runnerId: input.assignment.runnerId,
        runnerPubkey: input.assignment.runnerPubkey
      },
      relayUrls: input.relayUrls
    });
  }

  publishRuntimeStart(input: {
    assignment: RuntimeAssignmentRecord;
    authRequired?: boolean;
    commandId: string;
    correlationId?: string;
    reason?: string;
    relayUrls: string[];
  }): Promise<EntangleNostrPublishedEvent<EntangleControlEvent>> {
    return this.input.transport.publishControlEvent({
      ...(input.authRequired !== undefined
        ? { authRequired: input.authRequired }
        : {}),
      ...(input.correlationId !== undefined
        ? { correlationId: input.correlationId }
        : {}),
      payload: {
        assignmentId: input.assignment.assignmentId,
        commandId: input.commandId,
        eventType: "runtime.start",
        graphId: input.assignment.graphId,
        hostAuthorityPubkey: input.assignment.hostAuthorityPubkey,
        issuedAt: this.now(),
        nodeId: input.assignment.nodeId,
        protocol: "entangle.control.v1",
        ...(input.reason ? { reason: input.reason } : {}),
        runnerId: input.assignment.runnerId,
        runnerPubkey: input.assignment.runnerPubkey
      },
      relayUrls: input.relayUrls
    });
  }

  publishRuntimeStop(input: {
    assignment: RuntimeAssignmentRecord;
    authRequired?: boolean;
    commandId: string;
    correlationId?: string;
    reason?: string;
    relayUrls: string[];
  }): Promise<EntangleNostrPublishedEvent<EntangleControlEvent>> {
    return this.input.transport.publishControlEvent({
      ...(input.authRequired !== undefined
        ? { authRequired: input.authRequired }
        : {}),
      ...(input.correlationId !== undefined
        ? { correlationId: input.correlationId }
        : {}),
      payload: {
        assignmentId: input.assignment.assignmentId,
        commandId: input.commandId,
        eventType: "runtime.stop",
        graphId: input.assignment.graphId,
        hostAuthorityPubkey: input.assignment.hostAuthorityPubkey,
        issuedAt: this.now(),
        nodeId: input.assignment.nodeId,
        protocol: "entangle.control.v1",
        ...(input.reason ? { reason: input.reason } : {}),
        runnerId: input.assignment.runnerId,
        runnerPubkey: input.assignment.runnerPubkey
      },
      relayUrls: input.relayUrls
    });
  }

  publishRuntimeRestart(input: {
    assignment: RuntimeAssignmentRecord;
    authRequired?: boolean;
    commandId: string;
    correlationId?: string;
    reason?: string;
    relayUrls: string[];
  }): Promise<EntangleNostrPublishedEvent<EntangleControlEvent>> {
    return this.input.transport.publishControlEvent({
      ...(input.authRequired !== undefined
        ? { authRequired: input.authRequired }
        : {}),
      ...(input.correlationId !== undefined
        ? { correlationId: input.correlationId }
        : {}),
      payload: {
        assignmentId: input.assignment.assignmentId,
        commandId: input.commandId,
        eventType: "runtime.restart",
        graphId: input.assignment.graphId,
        hostAuthorityPubkey: input.assignment.hostAuthorityPubkey,
        issuedAt: this.now(),
        nodeId: input.assignment.nodeId,
        protocol: "entangle.control.v1",
        ...(input.reason ? { reason: input.reason } : {}),
        runnerId: input.assignment.runnerId,
        runnerPubkey: input.assignment.runnerPubkey
      },
      relayUrls: input.relayUrls
    });
  }

  publishRuntimeSessionCancel(input: {
    assignment: RuntimeAssignmentRecord;
    authRequired?: boolean;
    cancellation: SessionCancellationRequestRecord;
    commandId: string;
    correlationId?: string;
    relayUrls: string[];
  }): Promise<EntangleNostrPublishedEvent<EntangleControlEvent>> {
    return this.input.transport.publishControlEvent({
      ...(input.authRequired !== undefined
        ? { authRequired: input.authRequired }
        : {}),
      ...(input.correlationId !== undefined
        ? { correlationId: input.correlationId }
        : {}),
      payload: {
        assignmentId: input.assignment.assignmentId,
        cancellation: input.cancellation,
        commandId: input.commandId,
        eventType: "runtime.session.cancel",
        graphId: input.assignment.graphId,
        hostAuthorityPubkey: input.assignment.hostAuthorityPubkey,
        issuedAt: this.now(),
        nodeId: input.assignment.nodeId,
        protocol: "entangle.control.v1",
        ...(input.cancellation.reason
          ? { reason: input.cancellation.reason }
          : {}),
        runnerId: input.assignment.runnerId,
        runnerPubkey: input.assignment.runnerPubkey,
        sessionId: input.cancellation.sessionId
      },
      relayUrls: input.relayUrls
    });
  }

  publishRuntimeSourceHistoryPublish(input: {
    approvalId?: string;
    assignment: RuntimeAssignmentRecord;
    authRequired?: boolean;
    commandId: string;
    correlationId?: string;
    reason?: string;
    relayUrls: string[];
    requestedBy?: string;
    retryFailedPublication?: boolean;
    sourceHistoryId: string;
    target?: SourceHistoryPublicationTarget;
  }): Promise<EntangleNostrPublishedEvent<EntangleControlEvent>> {
    return this.input.transport.publishControlEvent({
      ...(input.authRequired !== undefined
        ? { authRequired: input.authRequired }
        : {}),
      ...(input.correlationId !== undefined
        ? { correlationId: input.correlationId }
        : {}),
      payload: {
        ...(input.approvalId ? { approvalId: input.approvalId } : {}),
        assignmentId: input.assignment.assignmentId,
        commandId: input.commandId,
        eventType: "runtime.source_history.publish",
        graphId: input.assignment.graphId,
        hostAuthorityPubkey: input.assignment.hostAuthorityPubkey,
        issuedAt: this.now(),
        nodeId: input.assignment.nodeId,
        protocol: "entangle.control.v1",
        ...(input.reason ? { reason: input.reason } : {}),
        ...(input.requestedBy ? { requestedBy: input.requestedBy } : {}),
        retryFailedPublication: input.retryFailedPublication ?? false,
        runnerId: input.assignment.runnerId,
        runnerPubkey: input.assignment.runnerPubkey,
        sourceHistoryId: input.sourceHistoryId,
        ...(input.target ? { target: input.target } : {})
      },
      relayUrls: input.relayUrls
    });
  }

  publishRuntimeArtifactRestore(input: {
    artifactRef: ArtifactRef;
    assignment: RuntimeAssignmentRecord;
    authRequired?: boolean;
    commandId: string;
    correlationId?: string;
    reason?: string;
    relayUrls: string[];
    requestedBy?: string;
    restoreId?: string;
  }): Promise<EntangleNostrPublishedEvent<EntangleControlEvent>> {
    return this.input.transport.publishControlEvent({
      ...(input.authRequired !== undefined
        ? { authRequired: input.authRequired }
        : {}),
      ...(input.correlationId !== undefined
        ? { correlationId: input.correlationId }
        : {}),
      payload: {
        artifactId: input.artifactRef.artifactId,
        artifactRef: input.artifactRef,
        assignmentId: input.assignment.assignmentId,
        commandId: input.commandId,
        eventType: "runtime.artifact.restore",
        graphId: input.assignment.graphId,
        hostAuthorityPubkey: input.assignment.hostAuthorityPubkey,
        issuedAt: this.now(),
        nodeId: input.assignment.nodeId,
        protocol: "entangle.control.v1",
        ...(input.reason ? { reason: input.reason } : {}),
        ...(input.requestedBy ? { requestedBy: input.requestedBy } : {}),
        ...(input.restoreId ? { restoreId: input.restoreId } : {}),
        runnerId: input.assignment.runnerId,
        runnerPubkey: input.assignment.runnerPubkey
      },
      relayUrls: input.relayUrls
    });
  }

  publishRuntimeArtifactSourceChangeProposal(input: {
    artifactRef: ArtifactRef;
    assignment: RuntimeAssignmentRecord;
    authRequired?: boolean;
    commandId: string;
    correlationId?: string;
    overwrite?: boolean;
    proposalId?: string;
    reason?: string;
    relayUrls: string[];
    requestedBy?: string;
    targetPath?: string;
  }): Promise<EntangleNostrPublishedEvent<EntangleControlEvent>> {
    return this.input.transport.publishControlEvent({
      ...(input.authRequired !== undefined
        ? { authRequired: input.authRequired }
        : {}),
      ...(input.correlationId !== undefined
        ? { correlationId: input.correlationId }
        : {}),
      payload: {
        artifactId: input.artifactRef.artifactId,
        artifactRef: input.artifactRef,
        assignmentId: input.assignment.assignmentId,
        commandId: input.commandId,
        eventType: "runtime.artifact.propose_source_change",
        graphId: input.assignment.graphId,
        hostAuthorityPubkey: input.assignment.hostAuthorityPubkey,
        issuedAt: this.now(),
        nodeId: input.assignment.nodeId,
        overwrite: input.overwrite ?? false,
        protocol: "entangle.control.v1",
        ...(input.proposalId ? { proposalId: input.proposalId } : {}),
        ...(input.reason ? { reason: input.reason } : {}),
        ...(input.requestedBy ? { requestedBy: input.requestedBy } : {}),
        runnerId: input.assignment.runnerId,
        runnerPubkey: input.assignment.runnerPubkey,
        ...(input.targetPath ? { targetPath: input.targetPath } : {})
      },
      relayUrls: input.relayUrls
    });
  }

  publishRuntimeSourceHistoryReplay(input: {
    approvalId?: string;
    assignment: RuntimeAssignmentRecord;
    authRequired?: boolean;
    commandId: string;
    correlationId?: string;
    reason?: string;
    relayUrls: string[];
    replayedBy?: string;
    replayId?: string;
    sourceHistoryId: string;
  }): Promise<EntangleNostrPublishedEvent<EntangleControlEvent>> {
    return this.input.transport.publishControlEvent({
      ...(input.authRequired !== undefined
        ? { authRequired: input.authRequired }
        : {}),
      ...(input.correlationId !== undefined
        ? { correlationId: input.correlationId }
        : {}),
      payload: {
        ...(input.approvalId ? { approvalId: input.approvalId } : {}),
        assignmentId: input.assignment.assignmentId,
        commandId: input.commandId,
        eventType: "runtime.source_history.replay",
        graphId: input.assignment.graphId,
        hostAuthorityPubkey: input.assignment.hostAuthorityPubkey,
        issuedAt: this.now(),
        nodeId: input.assignment.nodeId,
        protocol: "entangle.control.v1",
        ...(input.reason ? { reason: input.reason } : {}),
        ...(input.replayedBy ? { replayedBy: input.replayedBy } : {}),
        ...(input.replayId ? { replayId: input.replayId } : {}),
        runnerId: input.assignment.runnerId,
        runnerPubkey: input.assignment.runnerPubkey,
        sourceHistoryId: input.sourceHistoryId
      },
      relayUrls: input.relayUrls
    });
  }

  publishRuntimeSourceHistoryReconcile(input: {
    approvalId?: string;
    assignment: RuntimeAssignmentRecord;
    authRequired?: boolean;
    commandId: string;
    correlationId?: string;
    reason?: string;
    relayUrls: string[];
    replayedBy?: string;
    replayId?: string;
    sourceHistoryId: string;
  }): Promise<EntangleNostrPublishedEvent<EntangleControlEvent>> {
    return this.input.transport.publishControlEvent({
      ...(input.authRequired !== undefined
        ? { authRequired: input.authRequired }
        : {}),
      ...(input.correlationId !== undefined
        ? { correlationId: input.correlationId }
        : {}),
      payload: {
        ...(input.approvalId ? { approvalId: input.approvalId } : {}),
        assignmentId: input.assignment.assignmentId,
        commandId: input.commandId,
        eventType: "runtime.source_history.reconcile",
        graphId: input.assignment.graphId,
        hostAuthorityPubkey: input.assignment.hostAuthorityPubkey,
        issuedAt: this.now(),
        nodeId: input.assignment.nodeId,
        protocol: "entangle.control.v1",
        ...(input.reason ? { reason: input.reason } : {}),
        ...(input.replayedBy ? { replayedBy: input.replayedBy } : {}),
        ...(input.replayId ? { replayId: input.replayId } : {}),
        runnerId: input.assignment.runnerId,
        runnerPubkey: input.assignment.runnerPubkey,
        sourceHistoryId: input.sourceHistoryId
      },
      relayUrls: input.relayUrls
    });
  }

  publishRuntimeWikiPublish(input: {
    assignment: RuntimeAssignmentRecord;
    authRequired?: boolean;
    commandId: string;
    correlationId?: string;
    reason?: string;
    relayUrls: string[];
    requestedBy?: string;
    retryFailedPublication?: boolean;
    target?: GitRepositoryTargetSelector;
  }): Promise<EntangleNostrPublishedEvent<EntangleControlEvent>> {
    return this.input.transport.publishControlEvent({
      ...(input.authRequired !== undefined
        ? { authRequired: input.authRequired }
        : {}),
      ...(input.correlationId !== undefined
        ? { correlationId: input.correlationId }
        : {}),
      payload: {
        assignmentId: input.assignment.assignmentId,
        commandId: input.commandId,
        eventType: "runtime.wiki.publish",
        graphId: input.assignment.graphId,
        hostAuthorityPubkey: input.assignment.hostAuthorityPubkey,
        issuedAt: this.now(),
        nodeId: input.assignment.nodeId,
        protocol: "entangle.control.v1",
        ...(input.reason ? { reason: input.reason } : {}),
        ...(input.requestedBy ? { requestedBy: input.requestedBy } : {}),
        retryFailedPublication: input.retryFailedPublication ?? false,
        runnerId: input.assignment.runnerId,
        runnerPubkey: input.assignment.runnerPubkey,
        ...(input.target ? { target: input.target } : {})
      },
      relayUrls: input.relayUrls
    });
  }

  publishRuntimeWikiUpsertPage(input: {
    assignment: RuntimeAssignmentRecord;
    authRequired?: boolean;
    commandId: string;
    content: string;
    correlationId?: string;
    expectedCurrentSha256?: string;
    mode?: "append" | "patch" | "replace";
    path: string;
    reason?: string;
    relayUrls: string[];
    requestedBy?: string;
  }): Promise<EntangleNostrPublishedEvent<EntangleControlEvent>> {
    return this.input.transport.publishControlEvent({
      ...(input.authRequired !== undefined
        ? { authRequired: input.authRequired }
        : {}),
      ...(input.correlationId !== undefined
        ? { correlationId: input.correlationId }
        : {}),
      payload: {
        assignmentId: input.assignment.assignmentId,
        commandId: input.commandId,
        content: input.content,
        eventType: "runtime.wiki.upsert_page",
        ...(input.expectedCurrentSha256
          ? { expectedCurrentSha256: input.expectedCurrentSha256 }
          : {}),
        graphId: input.assignment.graphId,
        hostAuthorityPubkey: input.assignment.hostAuthorityPubkey,
        issuedAt: this.now(),
        mode: input.mode ?? "replace",
        nodeId: input.assignment.nodeId,
        path: input.path,
        protocol: "entangle.control.v1",
        ...(input.reason ? { reason: input.reason } : {}),
        ...(input.requestedBy ? { requestedBy: input.requestedBy } : {}),
        runnerId: input.assignment.runnerId,
        runnerPubkey: input.assignment.runnerPubkey
      },
      relayUrls: input.relayUrls
    });
  }

  publishRuntimeWikiPatchSet(input: {
    assignment: RuntimeAssignmentRecord;
    authRequired?: boolean;
    commandId: string;
    correlationId?: string;
    pages: Array<{
      content: string;
      expectedCurrentSha256?: string;
      mode?: "append" | "patch" | "replace";
      path: string;
    }>;
    reason?: string;
    relayUrls: string[];
    requestedBy?: string;
  }): Promise<EntangleNostrPublishedEvent<EntangleControlEvent>> {
    return this.input.transport.publishControlEvent({
      ...(input.authRequired !== undefined
        ? { authRequired: input.authRequired }
        : {}),
      ...(input.correlationId !== undefined
        ? { correlationId: input.correlationId }
        : {}),
      payload: {
        assignmentId: input.assignment.assignmentId,
        commandId: input.commandId,
        eventType: "runtime.wiki.patch_set",
        graphId: input.assignment.graphId,
        hostAuthorityPubkey: input.assignment.hostAuthorityPubkey,
        issuedAt: this.now(),
        nodeId: input.assignment.nodeId,
        pages: input.pages.map((page) => ({
          content: page.content,
          ...(page.expectedCurrentSha256
            ? { expectedCurrentSha256: page.expectedCurrentSha256 }
            : {}),
          mode: page.mode ?? "replace",
          path: page.path
        })),
        protocol: "entangle.control.v1",
        ...(input.reason ? { reason: input.reason } : {}),
        ...(input.requestedBy ? { requestedBy: input.requestedBy } : {}),
        runnerId: input.assignment.runnerId,
        runnerPubkey: input.assignment.runnerPubkey
      },
      relayUrls: input.relayUrls
    });
  }

  private publishRunnerHelloAck(input: {
    authRequired?: boolean;
    hostAuthorityPubkey: string;
    relayUrls: string[];
    runnerId: string;
    runnerPubkey: string;
    trustState: RunnerTrustState;
  }): Promise<EntangleNostrPublishedEvent<EntangleControlEvent>> {
    return this.input.transport.publishControlEvent({
      ...(input.authRequired !== undefined
        ? { authRequired: input.authRequired }
        : {}),
      payload: {
        eventType: "runner.hello.ack",
        hostAuthorityPubkey: input.hostAuthorityPubkey,
        issuedAt: this.now(),
        protocol: "entangle.control.v1",
        runnerId: input.runnerId,
        runnerPubkey: input.runnerPubkey,
        trustState: input.trustState
      },
      relayUrls: input.relayUrls
    });
  }

  private now(): string {
    return this.input.clock?.() ?? new Date().toISOString();
  }
}
