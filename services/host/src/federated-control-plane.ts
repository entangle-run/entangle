import type {
  EntangleControlEvent,
  EntangleObservationEvent,
  RuntimeAssignmentRecord,
  RunnerTrustState
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
  recordRuntimeAssignmentReceiptObservation,
  recordRuntimeStatusObservation,
  recordRuntimeAssignmentAccepted,
  recordRuntimeAssignmentRejected,
  recordSessionUpdatedObservation,
  recordSourceChangeRefObservation,
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
