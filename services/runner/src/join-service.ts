import { randomUUID } from "node:crypto";
import type {
  AssignmentLease,
  ArtifactRef,
  EntangleControlEvent,
  EntangleObservationEventPayload,
  GitRepositoryTargetSelector,
  RuntimeAssignmentRecord,
  RunnerJoinConfig,
  RunnerJoinStatus,
  SessionCancellationRequestRecord,
  SourceHistoryPublicationTarget,
  SourceHistoryReplayStatus
} from "@entangle/types";
import {
  runnerJoinStatusSchema,
  sessionCancellationRequestRecordSchema
} from "@entangle/types";
import { RunnerFederatedNostrTransport } from "./federated-nostr-transport.js";

type RunnerJoinTransportSubscription = {
  close(): Promise<void>;
};

type HeartbeatTimer = ReturnType<typeof setInterval> & {
  unref?: () => void;
};

type RuntimeCommandControlPayload = Extract<
  EntangleControlEvent["payload"],
  { commandId: string; graphId: string; nodeId: string }
>;

function resolveRuntimeCommandRequestedBy(
  payload: RuntimeCommandControlPayload
): string | undefined {
  if ("requestedBy" in payload && payload.requestedBy) {
    return payload.requestedBy;
  }

  if ("replayedBy" in payload && payload.replayedBy) {
    return payload.replayedBy;
  }

  if ("cancellation" in payload && payload.cancellation.requestedBy) {
    return payload.cancellation.requestedBy;
  }

  return undefined;
}

const defaultHeartbeatIntervalMs = 30_000;

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
      runtimeContextPath?: string;
    }
  | {
      accepted: false;
      rejectionReason: string;
    };

export type RunnerAssignmentMaterializer = (input: {
  assignment: RuntimeAssignmentRecord;
  controlEvent: EntangleControlEvent;
}) => Promise<RunnerAssignmentMaterializationResult>;

export type RunnerAssignmentRuntimeHandle = {
  cancelSession?(request: SessionCancellationRequestRecord): Promise<void>;
  clientUrl?: string;
  publishSourceHistory?(request: {
    approvalId?: string;
    reason?: string;
    requestedAt?: string;
    requestedBy?: string;
    retryFailedPublication?: boolean;
    sourceHistoryId: string;
    target?: SourceHistoryPublicationTarget;
  }): Promise<{
    message?: string;
    publicationState?: "failed" | "not_requested" | "published";
    sourceHistoryId: string;
  }>;
  restoreArtifact?(request: {
    artifactRef: ArtifactRef;
    reason?: string;
    requestedAt?: string;
    requestedBy?: string;
    restoreId?: string;
  }): Promise<{
    artifactId: string;
    message?: string;
    retrievalState?: "failed" | "retrieved";
  }>;
  proposeSourceChangeFromArtifact?(request: {
    artifactRef: ArtifactRef;
    overwrite?: boolean;
    proposalId?: string;
    reason?: string;
    requestedAt?: string;
    requestedBy?: string;
    targetPath?: string;
  }): Promise<{
    artifactId: string;
    candidateId?: string;
    message?: string;
    sourceChangeStatus?: "changed" | "failed" | "not_configured" | "unchanged";
  }>;
  replaySourceHistory?(request: {
    approvalId?: string;
    reason?: string;
    replayedAt?: string;
    replayedBy?: string;
    replayId?: string;
    sourceHistoryId: string;
  }): Promise<{
    message?: string;
    replayId: string;
    replayStatus: SourceHistoryReplayStatus;
    sourceHistoryId: string;
  }>;
  reconcileSourceHistory?(request: {
    approvalId?: string;
    reason?: string;
    replayedAt?: string;
    replayedBy?: string;
    replayId?: string;
    sourceHistoryId: string;
  }): Promise<{
    message?: string;
    replayId: string;
    replayStatus: SourceHistoryReplayStatus;
    sourceHistoryId: string;
  }>;
  publishWikiRepository?(request: {
    reason?: string;
    requestedAt?: string;
    requestedBy?: string;
    retryFailedPublication?: boolean;
    target?: GitRepositoryTargetSelector;
  }): Promise<{
    artifactId?: string;
    message?: string;
    publicationState?: "failed" | "not_requested" | "published";
  }>;
  upsertWikiPage?(request: {
    commandId?: string;
    content: string;
    expectedCurrentSha256?: string;
    mode?: "append" | "patch" | "replace";
    path: string;
    reason?: string;
    requestedAt?: string;
    requestedBy?: string;
  }): Promise<{
    expectedCurrentSha256?: string;
    message?: string;
    nextSha256?: string;
    path: string;
    previousSha256?: string;
    syncStatus?:
      | "committed"
      | "conflict"
      | "failed"
      | "not_configured"
      | "unchanged";
  }>;
  runtimeContextPath: string;
  runtimeRoot?: string;
  stop(): Promise<void>;
};

export type RunnerAssignmentRuntimeStarter = (input: {
  assignment: RuntimeAssignmentRecord;
  controlEvent: EntangleControlEvent;
  runtimeContextPath: string;
}) => Promise<RunnerAssignmentRuntimeHandle>;

export class RunnerJoinService {
  private readonly acceptedAssignments = new Map<
    string,
    RuntimeAssignmentRecord
  >();
  private readonly assignmentRuntimeHandles = new Map<
    string,
    RunnerAssignmentRuntimeHandle
  >();
  private readonly assignmentRuntimeContextPaths = new Map<string, string>();
  private lastHelloAck:
    | Extract<
        EntangleControlEvent["payload"],
        { eventType: "runner.hello.ack" }
      >
    | undefined;
  private lastHelloEventId: string | undefined;
  private heartbeatTimer: HeartbeatTimer | undefined;
  private startedAt: string | undefined;
  private subscription: RunnerJoinTransportSubscription | undefined;

  constructor(
    private readonly input: {
      clock?: () => string;
      config: RunnerJoinConfig;
      heartbeatIntervalMs?: number;
      materializer?: RunnerAssignmentMaterializer;
      nonceFactory?: () => string;
      runnerPubkey: string;
      runtimeStarter?: RunnerAssignmentRuntimeStarter;
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
    this.startHeartbeatTimer();

    return this.buildStatus(startedAt);
  }

  async stop(): Promise<void> {
    const subscription = this.subscription;
    this.subscription = undefined;
    this.stopHeartbeatTimer();

    for (const assignment of this.acceptedAssignments.values()) {
      await this.stopAssignmentRuntime(assignment, "Runner join service stopped.");
    }
    this.acceptedAssignments.clear();
    this.assignmentRuntimeContextPaths.clear();

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
      const assignment = this.acceptedAssignments.get(payload.assignmentId);
      if (assignment) {
        await this.stopAssignmentRuntime(assignment, payload.reason);
      }
      this.acceptedAssignments.delete(payload.assignmentId);
      this.assignmentRuntimeContextPaths.delete(payload.assignmentId);
      await this.publishObservation({
        assignmentId: payload.assignmentId,
        eventType: "assignment.receipt",
        message: payload.reason,
        observedAt: this.now(),
        receiptKind: "stopped"
      });
      return;
    }

    if (payload.eventType === "runtime.start") {
      await this.handleRuntimeStartCommand(event, payload);
      return;
    }

    if (payload.eventType === "runtime.stop") {
      await this.handleRuntimeStopCommand(payload);
      return;
    }

    if (payload.eventType === "runtime.restart") {
      await this.handleRuntimeRestartCommand(event, payload);
      return;
    }

    if (payload.eventType === "runtime.session.cancel") {
      await this.handleRuntimeSessionCancelCommand(payload);
      return;
    }

    if (payload.eventType === "runtime.artifact.restore") {
      await this.handleRuntimeArtifactRestoreCommand(payload);
      return;
    }

    if (payload.eventType === "runtime.artifact.propose_source_change") {
      await this.handleRuntimeArtifactSourceChangeProposalCommand(payload);
      return;
    }

    if (payload.eventType === "runtime.source_history.publish") {
      await this.handleRuntimeSourceHistoryPublishCommand(payload);
      return;
    }

    if (payload.eventType === "runtime.source_history.replay") {
      await this.handleRuntimeSourceHistoryReplayCommand(payload);
      return;
    }

    if (payload.eventType === "runtime.source_history.reconcile") {
      await this.handleRuntimeSourceHistoryReconcileCommand(payload);
      return;
    }

    if (payload.eventType === "runtime.wiki.publish") {
      await this.handleRuntimeWikiPublishCommand(payload);
      return;
    }

    if (payload.eventType === "runtime.wiki.upsert_page") {
      await this.handleRuntimeWikiUpsertPageCommand(payload);
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

    if (
      !this.acceptedAssignments.has(assignment.assignmentId) &&
      this.acceptedAssignments.size >=
        this.input.config.capabilities.maxAssignments
    ) {
      await this.rejectAssignment(
        assignment,
        `Runner '${this.input.config.runnerId}' has reached its assignment capacity of '${this.input.config.capabilities.maxAssignments}'.`
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

    if (materialized.runtimeContextPath) {
      this.assignmentRuntimeContextPaths.set(
        assignment.assignmentId,
        materialized.runtimeContextPath
      );
    }

    let runtimeHandle: RunnerAssignmentRuntimeHandle | undefined;
    if (materialized.runtimeContextPath) {
      if (!this.input.runtimeStarter) {
        this.assignmentRuntimeContextPaths.delete(assignment.assignmentId);
        await this.rejectAssignment(
          assignment,
          "No assignment runtime starter is configured for this runner."
        );
        return;
      }

      await this.publishRuntimeStatus(
        assignment,
        "starting",
        "Assignment runtime is starting."
      );

      try {
        runtimeHandle = await this.input.runtimeStarter({
          assignment,
          controlEvent: event,
          runtimeContextPath: materialized.runtimeContextPath
        });
      } catch (error) {
        this.assignmentRuntimeContextPaths.delete(assignment.assignmentId);
        await this.publishRuntimeStatus(
          assignment,
          "failed",
          error instanceof Error
            ? error.message
            : "Assignment runtime start failed."
        );
        await this.rejectAssignment(
          assignment,
          error instanceof Error
            ? error.message
            : "Assignment runtime start failed."
        );
        return;
      }
    }

    this.acceptedAssignments.set(assignment.assignmentId, assignment);
    if (runtimeHandle) {
      this.assignmentRuntimeHandles.set(assignment.assignmentId, runtimeHandle);
      await this.publishRuntimeStatus(
        assignment,
        "running",
        "Assignment runtime is running.",
        runtimeHandle.clientUrl
      );
    }
    await this.publishObservation({
      acceptedAt: this.now(),
      assignmentId: assignment.assignmentId,
      eventType: "assignment.accepted",
      ...(materialized.lease ?? assignment.lease
        ? { lease: materialized.lease ?? assignment.lease }
        : {})
    });
  }

  private resolveRuntimeCommandAssignment(
    payload: Extract<
      EntangleControlEvent["payload"],
      {
        eventType:
          | "runtime.restart"
          | "runtime.artifact.propose_source_change"
          | "runtime.artifact.restore"
          | "runtime.session.cancel"
          | "runtime.source_history.publish"
          | "runtime.source_history.replay"
          | "runtime.source_history.reconcile"
          | "runtime.start"
          | "runtime.stop"
          | "runtime.wiki.publish"
          | "runtime.wiki.upsert_page";
      }
    >
  ): RuntimeAssignmentRecord | undefined {
    if (
      payload.runnerId !== this.input.config.runnerId ||
      payload.runnerPubkey !== this.input.runnerPubkey
    ) {
      return undefined;
    }

    const assignment = payload.assignmentId
      ? this.acceptedAssignments.get(payload.assignmentId)
      : [...this.acceptedAssignments.values()].find(
          (candidate) =>
            candidate.graphId === payload.graphId &&
            candidate.nodeId === payload.nodeId
        );

    if (
      assignment &&
      assignment.graphId === payload.graphId &&
      assignment.nodeId === payload.nodeId
    ) {
      return assignment;
    }

    return undefined;
  }

  private async publishRuntimeCommandFailure(input: {
    assignmentId: string | undefined;
    message: string;
    payload?: RuntimeCommandControlPayload;
    receipt?: Partial<{
      artifactId: string;
      cancellationId: string;
      candidateId: string;
      proposalId: string;
      replayId: string;
      restoreId: string;
      sessionId: string;
      sourceHistoryId: string;
      targetPath: string;
      wikiArtifactId: string;
      wikiPageExpectedSha256: string;
      wikiPageNextSha256: string;
      wikiPagePath: string;
      wikiPagePreviousSha256: string;
    }>;
  }): Promise<void> {
    if (input.payload) {
      await this.publishRuntimeCommandReceipt({
        assignmentId: input.assignmentId,
        message: input.message,
        payload: input.payload,
        ...(input.receipt ? { receipt: input.receipt } : {}),
        status: "failed"
      });
    }

    if (!input.assignmentId) {
      return;
    }

    await this.publishObservation({
      assignmentId: input.assignmentId,
      eventType: "assignment.receipt",
      message: input.message,
      observedAt: this.now(),
      receiptKind: "failed"
    });
  }

  private publishRuntimeCommandReceipt(input: {
    assignmentId: string | undefined;
    message?: string;
    payload: RuntimeCommandControlPayload;
    receipt?: Partial<{
      artifactId: string;
      cancellationId: string;
      candidateId: string;
      proposalId: string;
      replayId: string;
      restoreId: string;
      sessionId: string;
      sourceHistoryId: string;
      targetPath: string;
      wikiArtifactId: string;
      wikiPageExpectedSha256: string;
      wikiPageNextSha256: string;
      wikiPagePath: string;
      wikiPagePreviousSha256: string;
    }>;
    status: "completed" | "failed" | "received";
  }): Promise<{
    event: {
      envelope: {
        eventId: string;
      };
    };
  }> {
    const requestedBy = resolveRuntimeCommandRequestedBy(input.payload);

    return this.publishObservation({
      ...(input.receipt?.artifactId
        ? { artifactId: input.receipt.artifactId }
        : {}),
      ...(input.assignmentId ? { assignmentId: input.assignmentId } : {}),
      ...(input.receipt?.cancellationId
        ? { cancellationId: input.receipt.cancellationId }
        : {}),
      ...(input.receipt?.candidateId
        ? { candidateId: input.receipt.candidateId }
        : {}),
      commandEventType: input.payload.eventType,
      commandId: input.payload.commandId,
      eventType: "runtime.command.receipt",
      graphId: input.payload.graphId,
      ...(input.message ? { message: input.message } : {}),
      nodeId: input.payload.nodeId,
      observedAt: this.now(),
      ...(input.receipt?.proposalId
        ? { proposalId: input.receipt.proposalId }
        : {}),
      ...(input.receipt?.replayId ? { replayId: input.receipt.replayId } : {}),
      ...(requestedBy ? { requestedBy } : {}),
      ...(input.receipt?.restoreId
        ? { restoreId: input.receipt.restoreId }
        : {}),
      ...(input.receipt?.sessionId
        ? { sessionId: input.receipt.sessionId }
        : {}),
      ...(input.receipt?.sourceHistoryId
        ? { sourceHistoryId: input.receipt.sourceHistoryId }
        : {}),
      status: input.status,
      ...(input.receipt?.targetPath
        ? { targetPath: input.receipt.targetPath }
        : {}),
      ...(input.receipt?.wikiArtifactId
        ? { wikiArtifactId: input.receipt.wikiArtifactId }
        : {}),
      ...(input.receipt?.wikiPageExpectedSha256
        ? { wikiPageExpectedSha256: input.receipt.wikiPageExpectedSha256 }
        : {}),
      ...(input.receipt?.wikiPageNextSha256
        ? { wikiPageNextSha256: input.receipt.wikiPageNextSha256 }
        : {}),
      ...(input.receipt?.wikiPagePath
        ? { wikiPagePath: input.receipt.wikiPagePath }
        : {}),
      ...(input.receipt?.wikiPagePreviousSha256
        ? { wikiPagePreviousSha256: input.receipt.wikiPagePreviousSha256 }
        : {})
    });
  }

  private async handleRuntimeStartCommand(
    event: EntangleControlEvent,
    payload: Extract<
      EntangleControlEvent["payload"],
      { eventType: "runtime.start" }
    >
  ): Promise<void> {
    const assignment = this.resolveRuntimeCommandAssignment(payload);

    if (!assignment) {
      await this.publishRuntimeCommandFailure({
        assignmentId: payload.assignmentId,
        message: "Runtime start command did not match an accepted assignment.",
        payload
      });
      return;
    }

    await this.publishRuntimeCommandReceipt({
      assignmentId: assignment.assignmentId,
      ...(payload.reason ? { message: payload.reason } : {}),
      payload,
      status: "received"
    });

    await this.publishObservation({
      assignmentId: assignment.assignmentId,
      eventType: "assignment.receipt",
      message: payload.reason,
      observedAt: this.now(),
      receiptKind: "received"
    });

    const existingHandle = this.assignmentRuntimeHandles.get(
      assignment.assignmentId
    );
    if (existingHandle) {
      await this.publishRuntimeStatus(
        assignment,
        "running",
        "Assignment runtime is already running.",
        existingHandle.clientUrl
      );
      await this.publishRuntimeCommandReceipt({
        assignmentId: assignment.assignmentId,
        message: "Assignment runtime is already running.",
        payload,
        status: "completed"
      });
      return;
    }

    await this.startAssignmentRuntime(
      assignment,
      event,
      payload.reason ?? "Runtime start requested by Host.",
      payload
    );
  }

  private async handleRuntimeStopCommand(
    payload: Extract<EntangleControlEvent["payload"], { eventType: "runtime.stop" }>
  ): Promise<void> {
    const assignment = this.resolveRuntimeCommandAssignment(payload);

    if (!assignment) {
      await this.publishRuntimeCommandFailure({
        assignmentId: payload.assignmentId,
        message: "Runtime stop command did not match an accepted assignment.",
        payload
      });
      return;
    }

    await this.publishRuntimeCommandReceipt({
      assignmentId: assignment.assignmentId,
      ...(payload.reason ? { message: payload.reason } : {}),
      payload,
      status: "received"
    });

    await this.publishObservation({
      assignmentId: assignment.assignmentId,
      eventType: "assignment.receipt",
      message: payload.reason,
      observedAt: this.now(),
      receiptKind: "received"
    });

    if (this.assignmentRuntimeHandles.has(assignment.assignmentId)) {
      await this.stopAssignmentRuntime(
        assignment,
        payload.reason ?? "Runtime stop requested by Host."
      );
    } else {
      await this.publishRuntimeStatus(
        assignment,
        "stopped",
        payload.reason ?? "Assignment runtime is already stopped."
      );
    }

    await this.publishObservation({
      assignmentId: assignment.assignmentId,
      eventType: "assignment.receipt",
      message: payload.reason,
      observedAt: this.now(),
      receiptKind: "stopped"
    });
    await this.publishRuntimeCommandReceipt({
      assignmentId: assignment.assignmentId,
      message: payload.reason ?? "Assignment runtime stopped.",
      payload,
      status: "completed"
    });
  }

  private async handleRuntimeRestartCommand(
    event: EntangleControlEvent,
    payload: Extract<
      EntangleControlEvent["payload"],
      { eventType: "runtime.restart" }
    >
  ): Promise<void> {
    const assignment = this.resolveRuntimeCommandAssignment(payload);

    if (!assignment) {
      await this.publishRuntimeCommandFailure({
        assignmentId: payload.assignmentId,
        message: "Runtime restart command did not match an accepted assignment.",
        payload
      });
      return;
    }

    await this.publishRuntimeCommandReceipt({
      assignmentId: assignment.assignmentId,
      ...(payload.reason ? { message: payload.reason } : {}),
      payload,
      status: "received"
    });

    await this.publishObservation({
      assignmentId: assignment.assignmentId,
      eventType: "assignment.receipt",
      message: payload.reason,
      observedAt: this.now(),
      receiptKind: "received"
    });

    if (this.assignmentRuntimeHandles.has(assignment.assignmentId)) {
      await this.stopAssignmentRuntime(
        assignment,
        payload.reason ?? "Runtime restart requested by Host."
      );
    }

    await this.startAssignmentRuntime(
      assignment,
      event,
      payload.reason ?? "Runtime restart requested by Host.",
      payload
    );
  }

  private async handleRuntimeSessionCancelCommand(
    payload: Extract<
      EntangleControlEvent["payload"],
      { eventType: "runtime.session.cancel" }
    >
  ): Promise<void> {
    const assignment = this.resolveRuntimeCommandAssignment(payload);

    if (!assignment) {
      await this.publishRuntimeCommandFailure({
        assignmentId: payload.assignmentId,
        message:
          "Runtime session cancellation command did not match an accepted assignment.",
        payload,
        receipt: {
          cancellationId: payload.cancellation.cancellationId,
          sessionId: payload.sessionId
        }
      });
      return;
    }

    await this.publishRuntimeCommandReceipt({
      assignmentId: assignment.assignmentId,
      ...(payload.reason ? { message: payload.reason } : {}),
      payload,
      receipt: {
        cancellationId: payload.cancellation.cancellationId,
        sessionId: payload.sessionId
      },
      status: "received"
    });

    await this.publishObservation({
      assignmentId: assignment.assignmentId,
      eventType: "assignment.receipt",
      message: payload.reason,
      observedAt: this.now(),
      receiptKind: "received"
    });

    const handle = this.assignmentRuntimeHandles.get(assignment.assignmentId);
    if (!handle?.cancelSession) {
      await this.publishRuntimeCommandFailure({
        assignmentId: assignment.assignmentId,
        message:
          "Runtime session cancellation command cannot be applied because the assigned runtime is not running.",
        payload,
        receipt: {
          cancellationId: payload.cancellation.cancellationId,
          sessionId: payload.sessionId
        }
      });
      return;
    }

    try {
      await handle.cancelSession(
        sessionCancellationRequestRecordSchema.parse(payload.cancellation)
      );
      await this.publishRuntimeCommandReceipt({
        assignmentId: assignment.assignmentId,
        message: payload.reason ?? "Runtime session cancellation completed.",
        payload,
        receipt: {
          cancellationId: payload.cancellation.cancellationId,
          sessionId: payload.sessionId
        },
        status: "completed"
      });
    } catch (error) {
      await this.publishRuntimeCommandFailure({
        assignmentId: assignment.assignmentId,
        message:
          error instanceof Error
            ? error.message
            : "Runtime session cancellation command failed.",
        payload,
        receipt: {
          cancellationId: payload.cancellation.cancellationId,
          sessionId: payload.sessionId
        }
      });
    }
  }

  private async handleRuntimeArtifactRestoreCommand(
    payload: Extract<
      EntangleControlEvent["payload"],
      { eventType: "runtime.artifact.restore" }
    >
  ): Promise<void> {
    const assignment = this.resolveRuntimeCommandAssignment(payload);

    if (!assignment) {
      await this.publishRuntimeCommandFailure({
        assignmentId: payload.assignmentId,
        message:
          "Runtime artifact restore command did not match an accepted assignment.",
        payload,
        receipt: {
          artifactId: payload.artifactId,
          ...(payload.restoreId ? { restoreId: payload.restoreId } : {})
        }
      });
      return;
    }

    await this.publishRuntimeCommandReceipt({
      assignmentId: assignment.assignmentId,
      ...(payload.reason ? { message: payload.reason } : {}),
      payload,
      receipt: {
        artifactId: payload.artifactId,
        ...(payload.restoreId ? { restoreId: payload.restoreId } : {})
      },
      status: "received"
    });

    await this.publishObservation({
      assignmentId: assignment.assignmentId,
      eventType: "assignment.receipt",
      message: payload.reason,
      observedAt: this.now(),
      receiptKind: "received"
    });

    const handle = this.assignmentRuntimeHandles.get(assignment.assignmentId);
    if (!handle?.restoreArtifact) {
      await this.publishRuntimeCommandFailure({
        assignmentId: assignment.assignmentId,
        message:
          "Runtime artifact restore command cannot be applied because the assigned runtime is not running.",
        payload,
        receipt: {
          artifactId: payload.artifactId,
          ...(payload.restoreId ? { restoreId: payload.restoreId } : {})
        }
      });
      return;
    }

    try {
      const result = await handle.restoreArtifact({
        artifactRef: payload.artifactRef,
        ...(payload.reason ? { reason: payload.reason } : {}),
        requestedAt: payload.issuedAt,
        ...(payload.requestedBy ? { requestedBy: payload.requestedBy } : {}),
        ...(payload.restoreId ? { restoreId: payload.restoreId } : {})
      });

      if (result.retrievalState === "failed") {
        await this.publishRuntimeCommandFailure({
          assignmentId: assignment.assignmentId,
          message:
            result.message ??
            `Artifact '${result.artifactId}' restore failed.`,
          payload,
          receipt: {
            artifactId: result.artifactId,
            ...(payload.restoreId ? { restoreId: payload.restoreId } : {})
          }
        });
        return;
      }

      await this.publishRuntimeCommandReceipt({
        assignmentId: assignment.assignmentId,
        message:
          result.message ?? `Artifact '${result.artifactId}' restore completed.`,
        payload,
        receipt: {
          artifactId: result.artifactId,
          ...(payload.restoreId ? { restoreId: payload.restoreId } : {})
        },
        status: "completed"
      });
    } catch (error) {
      await this.publishRuntimeCommandFailure({
        assignmentId: assignment.assignmentId,
        message:
          error instanceof Error
            ? error.message
            : "Runtime artifact restore command failed.",
        payload,
        receipt: {
          artifactId: payload.artifactId,
          ...(payload.restoreId ? { restoreId: payload.restoreId } : {})
        }
      });
    }
  }

  private async handleRuntimeArtifactSourceChangeProposalCommand(
    payload: Extract<
      EntangleControlEvent["payload"],
      { eventType: "runtime.artifact.propose_source_change" }
    >
  ): Promise<void> {
    const assignment = this.resolveRuntimeCommandAssignment(payload);

    if (!assignment) {
      await this.publishRuntimeCommandFailure({
        assignmentId: payload.assignmentId,
        message:
          "Runtime artifact source-change proposal command did not match an accepted assignment.",
        payload,
        receipt: {
          artifactId: payload.artifactId,
          ...(payload.proposalId ? { proposalId: payload.proposalId } : {}),
          ...(payload.targetPath ? { targetPath: payload.targetPath } : {})
        }
      });
      return;
    }

    await this.publishRuntimeCommandReceipt({
      assignmentId: assignment.assignmentId,
      ...(payload.reason ? { message: payload.reason } : {}),
      payload,
      receipt: {
        artifactId: payload.artifactId,
        ...(payload.proposalId ? { proposalId: payload.proposalId } : {}),
        ...(payload.targetPath ? { targetPath: payload.targetPath } : {})
      },
      status: "received"
    });

    await this.publishObservation({
      assignmentId: assignment.assignmentId,
      eventType: "assignment.receipt",
      message: payload.reason,
      observedAt: this.now(),
      receiptKind: "received"
    });

    const handle = this.assignmentRuntimeHandles.get(assignment.assignmentId);
    if (!handle?.proposeSourceChangeFromArtifact) {
      await this.publishRuntimeCommandFailure({
        assignmentId: assignment.assignmentId,
        message:
          "Runtime artifact source-change proposal command cannot be applied because the assigned runtime is not running.",
        payload,
        receipt: {
          artifactId: payload.artifactId,
          ...(payload.proposalId ? { proposalId: payload.proposalId } : {}),
          ...(payload.targetPath ? { targetPath: payload.targetPath } : {})
        }
      });
      return;
    }

    try {
      const result = await handle.proposeSourceChangeFromArtifact({
        artifactRef: payload.artifactRef,
        overwrite: payload.overwrite,
        ...(payload.proposalId ? { proposalId: payload.proposalId } : {}),
        ...(payload.reason ? { reason: payload.reason } : {}),
        requestedAt: payload.issuedAt,
        ...(payload.requestedBy ? { requestedBy: payload.requestedBy } : {}),
        ...(payload.targetPath ? { targetPath: payload.targetPath } : {})
      });

      if (result.sourceChangeStatus && result.sourceChangeStatus !== "changed") {
        await this.publishRuntimeCommandFailure({
          assignmentId: assignment.assignmentId,
          message:
            result.message ??
            `Artifact '${result.artifactId}' did not produce a source-change proposal.`,
          payload,
          receipt: {
            artifactId: result.artifactId,
            ...(result.candidateId ? { candidateId: result.candidateId } : {}),
            ...(payload.proposalId ? { proposalId: payload.proposalId } : {}),
            ...(payload.targetPath ? { targetPath: payload.targetPath } : {})
          }
        });
        return;
      }

      await this.publishRuntimeCommandReceipt({
        assignmentId: assignment.assignmentId,
        message:
          result.message ??
          `Artifact '${result.artifactId}' produced source-change proposal '${result.candidateId ?? payload.proposalId ?? payload.commandId}'.`,
        payload,
        receipt: {
          artifactId: result.artifactId,
          ...(result.candidateId ? { candidateId: result.candidateId } : {}),
          ...(payload.proposalId ? { proposalId: payload.proposalId } : {}),
          ...(payload.targetPath ? { targetPath: payload.targetPath } : {})
        },
        status: "completed"
      });
    } catch (error) {
      await this.publishRuntimeCommandFailure({
        assignmentId: assignment.assignmentId,
        message:
          error instanceof Error
            ? error.message
            : "Runtime artifact source-change proposal command failed.",
        payload,
        receipt: {
          artifactId: payload.artifactId,
          ...(payload.proposalId ? { proposalId: payload.proposalId } : {}),
          ...(payload.targetPath ? { targetPath: payload.targetPath } : {})
        }
      });
    }
  }

  private async handleRuntimeSourceHistoryPublishCommand(
    payload: Extract<
      EntangleControlEvent["payload"],
      { eventType: "runtime.source_history.publish" }
    >
  ): Promise<void> {
    const assignment = this.resolveRuntimeCommandAssignment(payload);

    if (!assignment) {
      await this.publishRuntimeCommandFailure({
        assignmentId: payload.assignmentId,
        message:
          "Runtime source-history publication command did not match an accepted assignment.",
        payload,
        receipt: {
          sourceHistoryId: payload.sourceHistoryId
        }
      });
      return;
    }

    await this.publishRuntimeCommandReceipt({
      assignmentId: assignment.assignmentId,
      ...(payload.reason ? { message: payload.reason } : {}),
      payload,
      receipt: {
        sourceHistoryId: payload.sourceHistoryId
      },
      status: "received"
    });

    await this.publishObservation({
      assignmentId: assignment.assignmentId,
      eventType: "assignment.receipt",
      message: payload.reason,
      observedAt: this.now(),
      receiptKind: "received"
    });

    const handle = this.assignmentRuntimeHandles.get(assignment.assignmentId);
    if (!handle?.publishSourceHistory) {
      await this.publishRuntimeCommandFailure({
        assignmentId: assignment.assignmentId,
        message:
          "Runtime source-history publication command cannot be applied because the assigned runtime is not running.",
        payload,
        receipt: {
          sourceHistoryId: payload.sourceHistoryId
        }
      });
      return;
    }

    try {
      const result = await handle.publishSourceHistory({
        ...(payload.approvalId ? { approvalId: payload.approvalId } : {}),
        ...(payload.reason ? { reason: payload.reason } : {}),
        requestedAt: payload.issuedAt,
        ...(payload.requestedBy ? { requestedBy: payload.requestedBy } : {}),
        retryFailedPublication: payload.retryFailedPublication,
        sourceHistoryId: payload.sourceHistoryId,
        ...(payload.target ? { target: payload.target } : {})
      });

      if (result.publicationState === "failed") {
        await this.publishRuntimeCommandFailure({
          assignmentId: assignment.assignmentId,
          message:
            result.message ??
            `Source history '${result.sourceHistoryId}' publication failed.`,
          payload,
          receipt: {
            sourceHistoryId: result.sourceHistoryId
          }
        });
        return;
      }

      await this.publishRuntimeCommandReceipt({
        assignmentId: assignment.assignmentId,
        message:
          result.message ??
          `Source history '${result.sourceHistoryId}' publication completed.`,
        payload,
        receipt: {
          sourceHistoryId: result.sourceHistoryId
        },
        status: "completed"
      });
    } catch (error) {
      await this.publishRuntimeCommandFailure({
        assignmentId: assignment.assignmentId,
        message:
          error instanceof Error
            ? error.message
            : "Runtime source-history publication command failed.",
        payload,
        receipt: {
          sourceHistoryId: payload.sourceHistoryId
        }
      });
    }
  }

  private async handleRuntimeSourceHistoryReplayCommand(
    payload: Extract<
      EntangleControlEvent["payload"],
      { eventType: "runtime.source_history.replay" }
    >
  ): Promise<void> {
    const assignment = this.resolveRuntimeCommandAssignment(payload);

    if (!assignment) {
      await this.publishRuntimeCommandFailure({
        assignmentId: payload.assignmentId,
        message:
          "Runtime source-history replay command did not match an accepted assignment.",
        payload,
        receipt: {
          ...(payload.replayId ? { replayId: payload.replayId } : {}),
          sourceHistoryId: payload.sourceHistoryId
        }
      });
      return;
    }

    await this.publishRuntimeCommandReceipt({
      assignmentId: assignment.assignmentId,
      ...(payload.reason ? { message: payload.reason } : {}),
      payload,
      receipt: {
        ...(payload.replayId ? { replayId: payload.replayId } : {}),
        sourceHistoryId: payload.sourceHistoryId
      },
      status: "received"
    });

    await this.publishObservation({
      assignmentId: assignment.assignmentId,
      eventType: "assignment.receipt",
      message: payload.reason,
      observedAt: this.now(),
      receiptKind: "received"
    });

    const handle = this.assignmentRuntimeHandles.get(assignment.assignmentId);
    if (!handle?.replaySourceHistory) {
      await this.publishRuntimeCommandFailure({
        assignmentId: assignment.assignmentId,
        message:
          "Runtime source-history replay command cannot be applied because the assigned runtime is not running.",
        payload,
        receipt: {
          ...(payload.replayId ? { replayId: payload.replayId } : {}),
          sourceHistoryId: payload.sourceHistoryId
        }
      });
      return;
    }

    try {
      const result = await handle.replaySourceHistory({
        ...(payload.approvalId ? { approvalId: payload.approvalId } : {}),
        ...(payload.reason ? { reason: payload.reason } : {}),
        replayedAt: payload.issuedAt,
        ...(payload.replayedBy ? { replayedBy: payload.replayedBy } : {}),
        ...(payload.replayId ? { replayId: payload.replayId } : {}),
        sourceHistoryId: payload.sourceHistoryId
      });

      if (result.replayStatus === "unavailable") {
        await this.publishRuntimeCommandFailure({
          assignmentId: assignment.assignmentId,
          message:
            result.message ??
            `Source history '${result.sourceHistoryId}' replay '${result.replayId}' is unavailable.`,
          payload,
          receipt: {
            replayId: result.replayId,
            sourceHistoryId: result.sourceHistoryId
          }
        });
        return;
      }

      await this.publishRuntimeCommandReceipt({
        assignmentId: assignment.assignmentId,
        message:
          result.message ??
          `Source history '${result.sourceHistoryId}' replay '${result.replayId}' completed.`,
        payload,
        receipt: {
          replayId: result.replayId,
          sourceHistoryId: result.sourceHistoryId
        },
        status: "completed"
      });
    } catch (error) {
      await this.publishRuntimeCommandFailure({
        assignmentId: assignment.assignmentId,
        message:
          error instanceof Error
            ? error.message
            : "Runtime source-history replay command failed.",
        payload,
        receipt: {
          ...(payload.replayId ? { replayId: payload.replayId } : {}),
          sourceHistoryId: payload.sourceHistoryId
        }
      });
    }
  }

  private async handleRuntimeSourceHistoryReconcileCommand(
    payload: Extract<
      EntangleControlEvent["payload"],
      { eventType: "runtime.source_history.reconcile" }
    >
  ): Promise<void> {
    const assignment = this.resolveRuntimeCommandAssignment(payload);

    if (!assignment) {
      await this.publishRuntimeCommandFailure({
        assignmentId: payload.assignmentId,
        message:
          "Runtime source-history reconcile command did not match an accepted assignment.",
        payload,
        receipt: {
          ...(payload.replayId ? { replayId: payload.replayId } : {}),
          sourceHistoryId: payload.sourceHistoryId
        }
      });
      return;
    }

    await this.publishRuntimeCommandReceipt({
      assignmentId: assignment.assignmentId,
      ...(payload.reason ? { message: payload.reason } : {}),
      payload,
      receipt: {
        ...(payload.replayId ? { replayId: payload.replayId } : {}),
        sourceHistoryId: payload.sourceHistoryId
      },
      status: "received"
    });

    await this.publishObservation({
      assignmentId: assignment.assignmentId,
      eventType: "assignment.receipt",
      message: payload.reason,
      observedAt: this.now(),
      receiptKind: "received"
    });

    const handle = this.assignmentRuntimeHandles.get(assignment.assignmentId);
    if (!handle?.reconcileSourceHistory) {
      await this.publishRuntimeCommandFailure({
        assignmentId: assignment.assignmentId,
        message:
          "Runtime source-history reconcile command cannot be applied because the assigned runtime is not running.",
        payload,
        receipt: {
          ...(payload.replayId ? { replayId: payload.replayId } : {}),
          sourceHistoryId: payload.sourceHistoryId
        }
      });
      return;
    }

    try {
      const result = await handle.reconcileSourceHistory({
        ...(payload.approvalId ? { approvalId: payload.approvalId } : {}),
        ...(payload.reason ? { reason: payload.reason } : {}),
        replayedAt: payload.issuedAt,
        ...(payload.replayedBy ? { replayedBy: payload.replayedBy } : {}),
        ...(payload.replayId ? { replayId: payload.replayId } : {}),
        sourceHistoryId: payload.sourceHistoryId
      });

      if (result.replayStatus === "unavailable") {
        await this.publishRuntimeCommandFailure({
          assignmentId: assignment.assignmentId,
          message:
            result.message ??
            `Source history '${result.sourceHistoryId}' reconcile '${result.replayId}' is unavailable.`,
          payload,
          receipt: {
            replayId: result.replayId,
            sourceHistoryId: result.sourceHistoryId
          }
        });
        return;
      }

      await this.publishRuntimeCommandReceipt({
        assignmentId: assignment.assignmentId,
        message:
          result.message ??
          `Source history '${result.sourceHistoryId}' reconcile '${result.replayId}' completed.`,
        payload,
        receipt: {
          replayId: result.replayId,
          sourceHistoryId: result.sourceHistoryId
        },
        status: "completed"
      });
    } catch (error) {
      await this.publishRuntimeCommandFailure({
        assignmentId: assignment.assignmentId,
        message:
          error instanceof Error
            ? error.message
            : "Runtime source-history reconcile command failed.",
        payload,
        receipt: {
          ...(payload.replayId ? { replayId: payload.replayId } : {}),
          sourceHistoryId: payload.sourceHistoryId
        }
      });
    }
  }

  private async handleRuntimeWikiPublishCommand(
    payload: Extract<
      EntangleControlEvent["payload"],
      { eventType: "runtime.wiki.publish" }
    >
  ): Promise<void> {
    const assignment = this.resolveRuntimeCommandAssignment(payload);

    if (!assignment) {
      await this.publishRuntimeCommandFailure({
        assignmentId: payload.assignmentId,
        message:
          "Runtime wiki publication command did not match an accepted assignment.",
        payload
      });
      return;
    }

    await this.publishRuntimeCommandReceipt({
      assignmentId: assignment.assignmentId,
      ...(payload.reason ? { message: payload.reason } : {}),
      payload,
      status: "received"
    });

    await this.publishObservation({
      assignmentId: assignment.assignmentId,
      eventType: "assignment.receipt",
      message: payload.reason,
      observedAt: this.now(),
      receiptKind: "received"
    });

    const handle = this.assignmentRuntimeHandles.get(assignment.assignmentId);
    if (!handle?.publishWikiRepository) {
      await this.publishRuntimeCommandFailure({
        assignmentId: assignment.assignmentId,
        message:
          "Runtime wiki publication command cannot be applied because the assigned runtime is not running.",
        payload
      });
      return;
    }

    try {
      const result = await handle.publishWikiRepository({
        ...(payload.reason ? { reason: payload.reason } : {}),
        requestedAt: payload.issuedAt,
        ...(payload.requestedBy ? { requestedBy: payload.requestedBy } : {}),
        retryFailedPublication: payload.retryFailedPublication,
        ...(payload.target ? { target: payload.target } : {})
      });

      if (result.publicationState === "failed") {
        await this.publishRuntimeCommandFailure({
          assignmentId: assignment.assignmentId,
          message:
            result.message ??
            `Wiki publication '${result.artifactId ?? "unknown"}' failed.`,
          payload,
          receipt: {
            ...(result.artifactId ? { wikiArtifactId: result.artifactId } : {})
          }
        });
        return;
      }

      await this.publishRuntimeCommandReceipt({
        assignmentId: assignment.assignmentId,
        message:
          result.message ??
          `Wiki publication '${result.artifactId ?? "unknown"}' completed.`,
        payload,
        receipt: {
          ...(result.artifactId ? { wikiArtifactId: result.artifactId } : {})
        },
        status: "completed"
      });
    } catch (error) {
      await this.publishRuntimeCommandFailure({
        assignmentId: assignment.assignmentId,
        message:
          error instanceof Error
            ? error.message
            : "Runtime wiki publication command failed.",
        payload
      });
    }
  }

  private async handleRuntimeWikiUpsertPageCommand(
    payload: Extract<
      EntangleControlEvent["payload"],
      { eventType: "runtime.wiki.upsert_page" }
    >
  ): Promise<void> {
    const assignment = this.resolveRuntimeCommandAssignment(payload);

    if (!assignment) {
      await this.publishRuntimeCommandFailure({
        assignmentId: payload.assignmentId,
        message:
          "Runtime wiki page mutation command did not match an accepted assignment.",
        payload,
        receipt: {
          wikiPagePath: payload.path
        }
      });
      return;
    }

    await this.publishRuntimeCommandReceipt({
      assignmentId: assignment.assignmentId,
      ...(payload.reason ? { message: payload.reason } : {}),
      payload,
      receipt: {
        wikiPagePath: payload.path
      },
      status: "received"
    });

    await this.publishObservation({
      assignmentId: assignment.assignmentId,
      eventType: "assignment.receipt",
      message: payload.reason,
      observedAt: this.now(),
      receiptKind: "received"
    });

    const handle = this.assignmentRuntimeHandles.get(assignment.assignmentId);
    if (!handle?.upsertWikiPage) {
      await this.publishRuntimeCommandFailure({
        assignmentId: assignment.assignmentId,
        message:
          "Runtime wiki page mutation command cannot be applied because the assigned runtime is not running.",
        payload,
        receipt: {
          wikiPagePath: payload.path
        }
      });
      return;
    }

    try {
      const result = await handle.upsertWikiPage({
        commandId: payload.commandId,
        content: payload.content,
        ...(payload.expectedCurrentSha256
          ? { expectedCurrentSha256: payload.expectedCurrentSha256 }
          : {}),
        mode: payload.mode,
        path: payload.path,
        ...(payload.reason ? { reason: payload.reason } : {}),
        requestedAt: payload.issuedAt,
        ...(payload.requestedBy ? { requestedBy: payload.requestedBy } : {})
      });

      if (
        result.syncStatus === "failed" ||
        result.syncStatus === "not_configured" ||
        result.syncStatus === "conflict"
      ) {
        await this.publishRuntimeCommandFailure({
          assignmentId: assignment.assignmentId,
          message:
            result.message ??
            `Wiki page '${result.path}' was updated but repository sync failed.`,
          payload,
          receipt: {
            ...(result.expectedCurrentSha256
              ? { wikiPageExpectedSha256: result.expectedCurrentSha256 }
              : {}),
            ...(result.nextSha256
              ? { wikiPageNextSha256: result.nextSha256 }
              : {}),
            ...(result.previousSha256
              ? { wikiPagePreviousSha256: result.previousSha256 }
              : {}),
            wikiPagePath: result.path
          }
        });
        return;
      }

      await this.publishRuntimeCommandReceipt({
        assignmentId: assignment.assignmentId,
        message:
          result.message ??
          `Wiki page '${result.path}' ${
            payload.mode === "append"
              ? "appended"
              : payload.mode === "patch"
                ? "patched"
                : "replaced"
          }.`,
        payload,
        receipt: {
          ...(result.expectedCurrentSha256
            ? { wikiPageExpectedSha256: result.expectedCurrentSha256 }
            : {}),
          ...(result.nextSha256 ? { wikiPageNextSha256: result.nextSha256 } : {}),
          ...(result.previousSha256
            ? { wikiPagePreviousSha256: result.previousSha256 }
            : {}),
          wikiPagePath: result.path
        },
        status: "completed"
      });
    } catch (error) {
      await this.publishRuntimeCommandFailure({
        assignmentId: assignment.assignmentId,
        message:
          error instanceof Error
            ? error.message
            : "Runtime wiki page mutation command failed.",
        payload,
        receipt: {
          wikiPagePath: payload.path
        }
      });
    }
  }

  private startHeartbeatTimer(): void {
    if (this.heartbeatTimer) {
      return;
    }

    const intervalMs =
      this.input.heartbeatIntervalMs ??
      this.input.config.heartbeatIntervalMs ??
      defaultHeartbeatIntervalMs;

    if (intervalMs <= 0) {
      return;
    }

    const timer = setInterval(() => {
      void this.publishHeartbeat().catch(() => undefined);
    }, intervalMs) as HeartbeatTimer;
    timer.unref?.();
    this.heartbeatTimer = timer;
  }

  private stopHeartbeatTimer(): void {
    if (!this.heartbeatTimer) {
      return;
    }

    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = undefined;
  }

  private async stopAssignmentRuntime(
    assignment: RuntimeAssignmentRecord,
    reason: string | undefined
  ): Promise<void> {
    const handle = this.assignmentRuntimeHandles.get(assignment.assignmentId);
    if (!handle) {
      return;
    }

    this.assignmentRuntimeHandles.delete(assignment.assignmentId);
    await handle.stop();
    await this.publishRuntimeStatus(
      assignment,
      "stopped",
      reason ?? "Assignment runtime stopped."
    );
  }

  private async startAssignmentRuntime(
    assignment: RuntimeAssignmentRecord,
    event: EntangleControlEvent,
    reason: string,
    commandPayload?: RuntimeCommandControlPayload
  ): Promise<void> {
    const runtimeContextPath = this.assignmentRuntimeContextPaths.get(
      assignment.assignmentId
    );

    if (!runtimeContextPath) {
      await this.publishRuntimeStatus(
        assignment,
        "failed",
        "Assignment runtime cannot start without a materialized runtime context."
      );
      if (commandPayload) {
        await this.publishRuntimeCommandFailure({
          assignmentId: assignment.assignmentId,
          message:
            "Assignment runtime cannot start without a materialized runtime context.",
          payload: commandPayload
        });
      } else {
        await this.publishObservation({
          assignmentId: assignment.assignmentId,
          eventType: "assignment.receipt",
          message:
            "Assignment runtime cannot start without a materialized runtime context.",
          observedAt: this.now(),
          receiptKind: "failed"
        });
      }
      return;
    }

    if (!this.input.runtimeStarter) {
      await this.publishRuntimeStatus(
        assignment,
        "failed",
        "No assignment runtime starter is configured for this runner."
      );
      if (commandPayload) {
        await this.publishRuntimeCommandFailure({
          assignmentId: assignment.assignmentId,
          message: "No assignment runtime starter is configured for this runner.",
          payload: commandPayload
        });
      } else {
        await this.publishObservation({
          assignmentId: assignment.assignmentId,
          eventType: "assignment.receipt",
          message: "No assignment runtime starter is configured for this runner.",
          observedAt: this.now(),
          receiptKind: "failed"
        });
      }
      return;
    }

    await this.publishRuntimeStatus(assignment, "starting", reason);

    try {
      const runtimeHandle = await this.input.runtimeStarter({
        assignment,
        controlEvent: event,
        runtimeContextPath
      });
      this.assignmentRuntimeHandles.set(assignment.assignmentId, runtimeHandle);
      this.assignmentRuntimeContextPaths.set(
        assignment.assignmentId,
        runtimeHandle.runtimeContextPath
      );
      await this.publishObservation({
        assignmentId: assignment.assignmentId,
        eventType: "assignment.receipt",
        observedAt: this.now(),
        receiptKind: "started"
      });
      await this.publishRuntimeStatus(
        assignment,
        "running",
        "Assignment runtime is running.",
        runtimeHandle.clientUrl
      );
      if (commandPayload) {
        await this.publishRuntimeCommandReceipt({
          assignmentId: assignment.assignmentId,
          message: "Assignment runtime is running.",
          payload: commandPayload,
          status: "completed"
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Assignment runtime start failed.";
      if (commandPayload) {
        await this.publishRuntimeCommandFailure({
          assignmentId: assignment.assignmentId,
          message,
          payload: commandPayload
        });
      } else {
        await this.publishObservation({
          assignmentId: assignment.assignmentId,
          eventType: "assignment.receipt",
          message,
          observedAt: this.now(),
          receiptKind: "failed"
        });
      }
      await this.publishRuntimeStatus(assignment, "failed", message);
    }
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

  private publishHeartbeat(): Promise<{
    event: {
      envelope: {
        eventId: string;
      };
    };
  }> {
    const maxAssignments = this.input.config.capabilities.maxAssignments;
    const acceptedAssignmentIds = [...this.acceptedAssignments.keys()];
    const operationalState =
      acceptedAssignmentIds.length >= maxAssignments ? "busy" : "ready";

    return this.publishObservation({
      assignmentIds: acceptedAssignmentIds,
      eventType: "runner.heartbeat",
      observedAt: this.now(),
      operationalState
    });
  }

  private publishRuntimeStatus(
    assignment: RuntimeAssignmentRecord,
    observedState: "failed" | "running" | "starting" | "stopped",
    statusMessage: string,
    clientUrl?: string
  ) {
    return this.publishObservation({
      assignmentId: assignment.assignmentId,
      ...(clientUrl ? { clientUrl } : {}),
      eventType: "runtime.status",
      graphId: assignment.graphId,
      graphRevisionId: assignment.graphRevisionId,
      nodeId: assignment.nodeId,
      observedAt: this.now(),
      observedState,
      restartGeneration: 0,
      statusMessage
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
