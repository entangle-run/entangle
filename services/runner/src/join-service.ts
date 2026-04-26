import { randomUUID } from "node:crypto";
import type {
  AssignmentLease,
  EntangleControlEvent,
  EntangleObservationEventPayload,
  RuntimeAssignmentRecord,
  RunnerJoinConfig,
  RunnerJoinStatus
} from "@entangle/types";
import { runnerJoinStatusSchema } from "@entangle/types";
import { RunnerFederatedNostrTransport } from "./federated-nostr-transport.js";

type RunnerJoinTransportSubscription = {
  close(): Promise<void>;
};

export type RunnerJoinTransport = {
  close(): Promise<void>;
  publishObservationEvent(input: {
    authRequired?: boolean;
    causationEventId?: string;
    correlationId?: string;
    payload: EntangleObservationEventPayload;
    relayUrls: string[];
  }): Promise<{
    event: {
      envelope: {
        eventId: string;
      };
    };
  }>;
  subscribeControlEvents(input: {
    authRequired?: boolean;
    expectedHostAuthorityPubkey: string;
    onEvent: (event: EntangleControlEvent) => Promise<void> | void;
    relayUrls: string[];
    runnerPubkey: string;
  }): Promise<RunnerJoinTransportSubscription>;
};

export type RunnerAssignmentMaterializationResult =
  | {
      accepted: true;
      lease?: AssignmentLease;
    }
  | {
      accepted: false;
      rejectionReason: string;
    };

export type RunnerAssignmentMaterializer = (input: {
  assignment: RuntimeAssignmentRecord;
  controlEvent: EntangleControlEvent;
}) => Promise<RunnerAssignmentMaterializationResult>;

export class RunnerJoinService {
  private readonly acceptedAssignments = new Map<
    string,
    RuntimeAssignmentRecord
  >();
  private lastHelloAck:
    | Extract<
        EntangleControlEvent["payload"],
        { eventType: "runner.hello.ack" }
      >
    | undefined;
  private lastHelloEventId: string | undefined;
  private startedAt: string | undefined;
  private subscription: RunnerJoinTransportSubscription | undefined;

  constructor(
    private readonly input: {
      clock?: () => string;
      config: RunnerJoinConfig;
      materializer?: RunnerAssignmentMaterializer;
      nonceFactory?: () => string;
      runnerPubkey: string;
      transport: RunnerJoinTransport;
    }
  ) {}

  async start(): Promise<RunnerJoinStatus> {
    if (this.subscription) {
      return this.buildStatus(this.startedAt ?? this.now());
    }

    const startedAt = this.now();
    this.startedAt = startedAt;
    this.subscription = await this.input.transport.subscribeControlEvents({
      authRequired: this.input.config.authRequired,
      expectedHostAuthorityPubkey: this.input.config.hostAuthorityPubkey,
      onEvent: (event) => this.handleControlEvent(event),
      relayUrls: this.input.config.relayUrls,
      runnerPubkey: this.input.runnerPubkey
    });

    const hello = await this.input.transport.publishObservationEvent({
      authRequired: this.input.config.authRequired,
      payload: {
        capabilities: this.input.config.capabilities,
        eventType: "runner.hello",
        hostAuthorityPubkey: this.input.config.hostAuthorityPubkey,
        issuedAt: startedAt,
        nonce: this.input.nonceFactory?.() ?? randomUUID(),
        protocol: "entangle.observe.v1",
        runnerId: this.input.config.runnerId,
        runnerPubkey: this.input.runnerPubkey
      },
      relayUrls: this.input.config.relayUrls
    });
    this.lastHelloEventId = hello.event.envelope.eventId;

    return this.buildStatus(startedAt);
  }

  async stop(): Promise<void> {
    const subscription = this.subscription;
    this.subscription = undefined;

    if (subscription) {
      await subscription.close();
    }

    await this.input.transport.close();
  }

  getLastHelloAck():
    | Extract<
        EntangleControlEvent["payload"],
        { eventType: "runner.hello.ack" }
      >
    | undefined {
    return this.lastHelloAck;
  }

  getAcceptedAssignments(): RuntimeAssignmentRecord[] {
    return [...this.acceptedAssignments.values()];
  }

  private async handleControlEvent(event: EntangleControlEvent): Promise<void> {
    const payload = event.payload;

    if (payload.eventType === "runner.hello.ack") {
      this.lastHelloAck = payload;
      return;
    }

    if (payload.eventType === "runtime.assignment.offer") {
      await this.handleAssignmentOffer(event, payload.assignment);
      return;
    }

    if (payload.eventType === "runtime.assignment.revoke") {
      this.acceptedAssignments.delete(payload.assignmentId);
      await this.publishObservation({
        assignmentId: payload.assignmentId,
        eventType: "assignment.receipt",
        message: payload.reason,
        observedAt: this.now(),
        receiptKind: "stopped"
      });
    }
  }

  private async handleAssignmentOffer(
    event: EntangleControlEvent,
    assignment: RuntimeAssignmentRecord
  ): Promise<void> {
    await this.publishObservation({
      assignmentId: assignment.assignmentId,
      eventType: "assignment.receipt",
      observedAt: this.now(),
      receiptKind: "received"
    });

    if (
      !this.input.config.capabilities.runtimeKinds.includes(
        assignment.runtimeKind
      )
    ) {
      await this.rejectAssignment(
        assignment,
        `Runner '${this.input.config.runnerId}' does not support runtime kind '${assignment.runtimeKind}'.`
      );
      return;
    }

    if (!this.input.materializer) {
      await this.rejectAssignment(
        assignment,
        "No federated assignment materializer is configured for this runner."
      );
      return;
    }

    let materialized: RunnerAssignmentMaterializationResult;

    try {
      materialized = await this.input.materializer({
        assignment,
        controlEvent: event
      });
    } catch (error) {
      await this.rejectAssignment(
        assignment,
        error instanceof Error
          ? error.message
          : "Assignment materialization failed."
      );
      return;
    }

    if (!materialized.accepted) {
      await this.rejectAssignment(assignment, materialized.rejectionReason);
      return;
    }

    this.acceptedAssignments.set(assignment.assignmentId, assignment);
    await this.publishObservation({
      acceptedAt: this.now(),
      assignmentId: assignment.assignmentId,
      eventType: "assignment.accepted",
      ...(materialized.lease ?? assignment.lease
        ? { lease: materialized.lease ?? assignment.lease }
        : {})
    });
  }

  private async rejectAssignment(
    assignment: RuntimeAssignmentRecord,
    rejectionReason: string
  ): Promise<void> {
    await this.publishObservation({
      assignmentId: assignment.assignmentId,
      eventType: "assignment.rejected",
      rejectedAt: this.now(),
      rejectionReason
    });
  }

  private publishObservation(
    payload: Record<string, unknown>
  ): Promise<{
    event: {
      envelope: {
        eventId: string;
      };
    };
  }> {
    return this.input.transport.publishObservationEvent({
      authRequired: this.input.config.authRequired,
      payload: {
        ...payload,
        hostAuthorityPubkey: this.input.config.hostAuthorityPubkey,
        protocol: "entangle.observe.v1",
        runnerId: this.input.config.runnerId,
        runnerPubkey: this.input.runnerPubkey
      } as EntangleObservationEventPayload,
      relayUrls: this.input.config.relayUrls
    });
  }

  private now(): string {
    return this.input.clock?.() ?? new Date().toISOString();
  }

  private buildStatus(startedAt: string): RunnerJoinStatus {
    return runnerJoinStatusSchema.parse({
      assignmentIds: [...this.acceptedAssignments.keys()],
      hostAuthorityPubkey: this.input.config.hostAuthorityPubkey,
      ...(this.lastHelloEventId
        ? { lastHelloEventId: this.lastHelloEventId }
        : {}),
      relayUrls: this.input.config.relayUrls,
      runnerId: this.input.config.runnerId,
      runnerPubkey: this.input.runnerPubkey,
      schemaVersion: "1",
      startedAt
    });
  }
}

export function createRunnerJoinTransport(input: {
  secretKey: Uint8Array;
}): RunnerJoinTransport {
  return new RunnerFederatedNostrTransport({
    secretKey: input.secretKey
  });
}
