import { createHash, randomUUID } from "node:crypto";
import {
  copyFile,
  lstat,
  mkdir,
  open,
  readdir,
  stat
} from "node:fs/promises";
import path from "node:path";
import type {
  AgentEngineTurnResult,
  ArtifactContentPreview,
  ArtifactRecord,
  ArtifactRef,
  ApprovalRecord,
  ConversationLifecycleState,
  ConversationRecord,
  EngineApprovalRequestDirective,
  EngineArtifactInput,
  EngineHandoffDirective,
  EngineProviderMetadata,
  EngineToolDefinition,
  EngineTurnFailure,
  EngineTurnOutcome,
  EffectiveRuntimeContext,
  EntangleA2AMessage,
  GitRepositoryTargetSelector,
  MemorySynthesisOutcome,
  RunnerPhase,
  SourceChangeCandidateRecord,
  RunnerTurnRecord,
  SessionCancellationRequestRecord,
  SessionLifecycleState,
  SessionRecord,
  SourceHistoryRecord,
  SourceHistoryPublicationTarget,
  SourceHistoryReplayRecord,
  SourceHistoryReplayStatus
} from "@entangle/types";
import {
  agentEngineTurnResultSchema,
  entangleA2AApprovalRequestMetadataSchema,
  entangleA2AApprovalResponseMetadataSchema,
  entangleA2ASourceChangeReviewMetadataSchema,
  engineTurnOutcomeSchema,
  isAllowedApprovalLifecycleTransition,
  isAllowedConversationLifecycleTransition,
  isAllowedSessionLifecycleTransition,
  sessionCancellationRequestRecordSchema,
  sourceChangeCandidateRecordSchema
} from "@entangle/types";
import { validateA2AMessageDocument } from "@entangle/validator";
import type {
  AgentEngine,
  AgentEnginePermissionRequest,
  AgentEnginePermissionResponse
} from "@entangle/agent-engine";
import {
  AgentEngineConfigurationError,
  AgentEngineExecutionError,
  createStubAgentEngine
} from "@entangle/agent-engine";
import {
  buildAgentEngineTurnRequest,
  loadPackageToolCatalog,
  mapPackageToolCatalogToEngineToolDefinitions,
  summarizeAgentEngineTurnRequest
} from "./runtime-context.js";
import {
  type RunnerStatePaths,
  ensureRunnerStatePaths,
  listApprovalRecords,
  listConversationRecords,
  listSessionCancellationRequestRecords,
  listSessionRecords,
  readApprovalRecord,
  readConversationRecord,
  readSourceChangeCandidateRecord,
  readSourceHistoryRecord,
  readSessionRecord,
  writeApprovalRecord,
  writeArtifactRecord,
  writeConversationRecord,
  writeRunnerTurnRecord,
  writeSessionCancellationRequestRecord,
  writeSourceChangeCandidateRecord,
  writeSessionRecord
} from "./state-store.js";
import {
  GitCliRunnerArtifactBackend,
  RunnerArtifactRetrievalError,
  type RunnerArtifactBackend
} from "./artifact-backend.js";
import {
  appendSectionBullet,
  performPostTurnMemoryUpdate,
  readTextFileOrDefault,
  writeTextFile
} from "./memory-maintenance.js";
import {
  buildArtifactInputsFromMaterializedRecords,
  type RunnerMemorySynthesizer
} from "./memory-synthesizer.js";
import {
  harvestSourceChanges,
  prepareSourceChangeHarvest
} from "./source-change-harvester.js";
import { buildSourceChangeCandidateRecord } from "./source-change-candidates.js";
import {
  applyAcceptedSourceChangeCandidate,
  publishSourceHistoryToGitTarget,
  reconcileSourceHistoryToWorkspace,
  replaySourceHistoryToWorkspace
} from "./source-history.js";
import {
  publishWikiRepositoryToGitTarget,
  syncWikiRepository
} from "./wiki-repository.js";
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

export type RunnerSourceHistoryPublicationCommandResult = {
  message?: string;
  publicationState?: "failed" | "not_requested" | "published";
  sourceHistoryId: string;
};

export type RunnerSourceHistoryReplayCommandResult = {
  message?: string;
  replayId: string;
  replayStatus: SourceHistoryReplayStatus;
  sourceHistoryId: string;
};

export type RunnerWikiPublicationCommandResult = {
  artifactId?: string;
  message?: string;
  publicationState?: "failed" | "not_requested" | "published";
};

export type RunnerWikiPageUpsertCommandResult = {
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
};

export type RunnerWikiPatchSetPageInput = {
  content: string;
  expectedCurrentSha256?: string;
  mode?: "append" | "patch" | "replace";
  path: string;
};

export type RunnerWikiPatchSetPageResult = {
  expectedCurrentSha256?: string;
  mode: "append" | "patch" | "replace";
  nextSha256?: string;
  path: string;
  previousSha256?: string;
};

export type RunnerWikiPatchSetCommandResult = {
  message?: string;
  pageCount: number;
  pages: RunnerWikiPatchSetPageResult[];
  syncStatus?:
    | "committed"
    | "conflict"
    | "failed"
    | "not_configured"
    | "unchanged";
};

export type RunnerArtifactRestoreCommandResult = {
  artifactId: string;
  message?: string;
  retrievalState?: "failed" | "retrieved";
};

export type RunnerArtifactSourceChangeProposalCommandResult = {
  artifactId: string;
  candidateId?: string;
  message?: string;
  sourceChangeStatus?: "changed" | "failed" | "not_configured" | "unchanged";
};

export type RunnerServiceObservationPublisher = {
  publishArtifactRefObserved?(input: {
    artifactRecord: ArtifactRecord;
    artifactPreview?: ArtifactContentPreview | undefined;
    graphId: string;
    nodeId: string;
    observedAt: string;
  }): Promise<void>;
  publishApprovalUpdated?(record: ApprovalRecord): Promise<void>;
  publishConversationUpdated(record: ConversationRecord): Promise<void>;
  publishSessionUpdated(record: SessionRecord): Promise<void>;
  publishSourceChangeRefObserved?(input: {
    artifactRefs: ArtifactRef[];
    candidate: SourceChangeCandidateRecord;
    observedAt: string;
  }): Promise<void>;
  publishSourceHistoryRefObserved?(input: {
    history: SourceHistoryRecord;
    observedAt: string;
  }): Promise<void>;
  publishSourceHistoryReplayedObserved?(input: {
    observedAt: string;
    replay: SourceHistoryReplayRecord;
  }): Promise<void>;
  publishTurnUpdated(record: RunnerTurnRecord): Promise<void>;
  publishWikiRefObserved?(input: {
    artifactRef: ArtifactRef;
    artifactPreview?: ArtifactContentPreview;
    graphId: string;
    nodeId: string;
    observedAt: string;
  }): Promise<void>;
};

export type RunnerServiceHandleResult =
  | {
      handled: false;
      reason:
        | "invalid_message"
        | "signer_mismatch"
        | "wrong_node"
        | "wrong_pubkey";
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

type MaterializedApprovalRequests = {
  approvalRecords: ApprovalRecord[];
  waitingApprovalIds: string[];
};

class RunnerHandoffPolicyError extends AgentEngineExecutionError {
  constructor(message: string) {
    super(message, {
      classification: "policy_denied"
    });
  }
}

const handoffAllowedRelations = new Set([
  "delegates_to",
  "peer_collaborates_with",
  "reviews",
  "routes_to"
]);

const artifactProjectionPreviewMaxBytes = 12 * 1024;
const artifactSourceProposalMaxFiles = 200;
const artifactSourceProposalMaxBytes = 20 * 1024 * 1024;
const enginePermissionApprovalPollIntervalMs = 250;
const maxEnginePermissionApprovalReasonCharacters = 800;

function nowIsoString(): string {
  return new Date().toISOString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function sanitizeIdentifier(input: string): string {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized.length > 0 ? normalized : `id-${randomUUID().slice(0, 8)}`;
}

function buildArtifactSourceProposalCandidateId(input: {
  artifactId: string;
  proposalId?: string | undefined;
}): string {
  const raw =
    input.proposalId ??
    `artifact-proposal-${sanitizeIdentifier(input.artifactId)}-${randomUUID().slice(0, 8)}`;
  const normalized = sanitizeIdentifier(raw);

  return normalized.length <= 100 ? normalized : normalized.slice(0, 100);
}

function defaultArtifactSourceProposalTargetPath(
  artifactRef: ArtifactRef
): string {
  if (artifactRef.backend === "git" && artifactRef.locator.path !== ".") {
    return artifactRef.locator.path;
  }

  return path.join("artifact-proposals", sanitizeIdentifier(artifactRef.artifactId));
}

function normalizeSafeRelativeSourcePath(input: {
  artifactRef: ArtifactRef;
  targetPath?: string | undefined;
}): string {
  const rawPath =
    input.targetPath?.trim() ??
    defaultArtifactSourceProposalTargetPath(input.artifactRef);
  const normalizedPath = path.normalize(rawPath);

  if (
    normalizedPath === "." ||
    path.isAbsolute(normalizedPath) ||
    normalizedPath.split(path.sep).includes("..")
  ) {
    throw new Error(
      `Artifact source-change proposal target path '${rawPath}' is not a safe relative path.`
    );
  }

  return normalizedPath;
}

function assertPathInsideRoot(input: {
  root: string;
  targetPath: string;
  label: string;
}): void {
  const relativePath = path.relative(input.root, input.targetPath);

  if (
    relativePath === "" ||
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error(`${input.label} must stay inside the source workspace.`);
  }
}

function isNodeErrorCode(error: unknown, code: string): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === code
  );
}

async function copyArtifactProposalFile(input: {
  destinationPath: string;
  overwrite: boolean;
  sourcePath: string;
}): Promise<{
  copiedBytes: number;
  copiedFiles: number;
}> {
  const sourceStats = await lstat(input.sourcePath);

  if (sourceStats.isSymbolicLink()) {
    throw new Error("Artifact source-change proposals cannot copy symlinks.");
  }

  if (!sourceStats.isFile()) {
    throw new Error("Artifact source-change proposals can only copy files or directories.");
  }

  try {
    await lstat(input.destinationPath);

    if (!input.overwrite) {
      throw new Error(
        `Artifact source-change proposal target '${input.destinationPath}' already exists.`
      );
    }
  } catch (error) {
    if (!isNodeErrorCode(error, "ENOENT")) {
      throw error;
    }
  }

  await mkdir(path.dirname(input.destinationPath), { recursive: true });
  await copyFile(input.sourcePath, input.destinationPath);

  return {
    copiedBytes: sourceStats.size,
    copiedFiles: 1
  };
}

async function copyArtifactProposalDirectory(input: {
  destinationRoot: string;
  overwrite: boolean;
  sourceRoot: string;
}): Promise<{
  copiedBytes: number;
  copiedFiles: number;
}> {
  let copiedBytes = 0;
  let copiedFiles = 0;

  async function visit(sourceDirectory: string, destinationDirectory: string): Promise<void> {
    await mkdir(destinationDirectory, { recursive: true });

    for (const entry of await readdir(sourceDirectory, { withFileTypes: true })) {
      if (entry.name === ".git") {
        continue;
      }

      const sourcePath = path.join(sourceDirectory, entry.name);
      const destinationPath = path.join(destinationDirectory, entry.name);

      if (entry.isSymbolicLink()) {
        throw new Error("Artifact source-change proposals cannot copy symlinks.");
      }

      if (entry.isDirectory()) {
        await visit(sourcePath, destinationPath);
        continue;
      }

      if (!entry.isFile()) {
        throw new Error(
          "Artifact source-change proposals can only copy regular files and directories."
        );
      }

      const result = await copyArtifactProposalFile({
        destinationPath,
        overwrite: input.overwrite,
        sourcePath
      });
      copiedBytes += result.copiedBytes;
      copiedFiles += result.copiedFiles;

      if (copiedFiles > artifactSourceProposalMaxFiles) {
        throw new Error(
          `Artifact source-change proposal exceeds ${artifactSourceProposalMaxFiles} files.`
        );
      }

      if (copiedBytes > artifactSourceProposalMaxBytes) {
        throw new Error(
          `Artifact source-change proposal exceeds ${artifactSourceProposalMaxBytes} bytes.`
        );
      }
    }
  }

  await visit(input.sourceRoot, input.destinationRoot);

  return {
    copiedBytes,
    copiedFiles
  };
}

async function copyArtifactIntoSourceWorkspace(input: {
  artifactRef: ArtifactRef;
  overwrite: boolean;
  sourcePath: string;
  sourceWorkspaceRoot: string;
  targetPath?: string | undefined;
}): Promise<{
  copiedBytes: number;
  copiedFiles: number;
  targetPath: string;
}> {
  const targetPath = normalizeSafeRelativeSourcePath({
    artifactRef: input.artifactRef,
    ...(input.targetPath ? { targetPath: input.targetPath } : {})
  });
  const destinationPath = path.resolve(input.sourceWorkspaceRoot, targetPath);
  assertPathInsideRoot({
    label: "Artifact source-change proposal target path",
    root: input.sourceWorkspaceRoot,
    targetPath: destinationPath
  });

  const sourceStats = await lstat(input.sourcePath);
  const result = sourceStats.isDirectory()
    ? await copyArtifactProposalDirectory({
        destinationRoot: destinationPath,
        overwrite: input.overwrite,
        sourceRoot: input.sourcePath
      })
    : await copyArtifactProposalFile({
        destinationPath,
        overwrite: input.overwrite,
        sourcePath: input.sourcePath
      });

  return {
    ...result,
    targetPath
  };
}

function resolveEnvelopeSignerPubkey(envelope: RunnerInboundEnvelope): string {
  return envelope.signerPubkey ?? envelope.message.fromPubkey;
}

function hasEnvelopeSignerMismatch(envelope: RunnerInboundEnvelope): boolean {
  return (
    envelope.signerPubkey !== undefined &&
    envelope.signerPubkey !== envelope.message.fromPubkey
  );
}

function inferArtifactContentPreviewType(
  artifactRecord: ArtifactRecord
): Extract<ArtifactContentPreview, { available: true }>["contentType"] {
  const artifactPath = artifactRecord.ref.locator.path;
  const normalizedPath = artifactPath.toLowerCase();

  return normalizedPath.endsWith(".md") || normalizedPath.endsWith(".markdown")
    ? "text/markdown"
    : "text/plain";
}

async function buildArtifactContentPreview(
  artifactRecord: ArtifactRecord
): Promise<ArtifactContentPreview | undefined> {
  const localPath = artifactRecord.materialization?.localPath;

  if (!localPath) {
    return undefined;
  }

  try {
    if (!(await stat(localPath)).isFile()) {
      return {
        available: false,
        reason: "Artifact preview is unavailable because the artifact is not a file."
      };
    }

    const file = await open(localPath, "r");

    try {
      const buffer = Buffer.alloc(artifactProjectionPreviewMaxBytes + 1);
      const { bytesRead } = await file.read(
        buffer,
        0,
        artifactProjectionPreviewMaxBytes + 1,
        0
      );
      const truncated = bytesRead > artifactProjectionPreviewMaxBytes;
      const previewBuffer = buffer.subarray(
        0,
        Math.min(bytesRead, artifactProjectionPreviewMaxBytes)
      );

      if (previewBuffer.includes(0)) {
        return {
          available: false,
          reason:
            "Artifact preview is unavailable because the artifact content is not text."
        };
      }

      return {
        available: true,
        bytesRead: previewBuffer.length,
        content: previewBuffer.toString("utf8"),
        contentEncoding: "utf8",
        contentType: inferArtifactContentPreviewType(artifactRecord),
        truncated
      };
    } finally {
      await file.close();
    }
  } catch {
    return {
      available: false,
      reason: "Artifact preview is unavailable because the artifact cannot be read."
    };
  }
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

function isSessionCancellationExecutionError(error: unknown): boolean {
  return (
    error instanceof AgentEngineExecutionError &&
    error.classification === "cancelled"
  );
}

function resolveCancellationRequestFromAbortSignal(
  signal: AbortSignal | undefined
): SessionCancellationRequestRecord | undefined {
  if (!signal?.aborted) {
    return undefined;
  }

  const parsedRequest = sessionCancellationRequestRecordSchema.safeParse(
    signal.reason
  );

  return parsedRequest.success ? parsedRequest.data : undefined;
}

function buildSessionCancellationExecutionError(input: {
  context: EffectiveRuntimeContext;
  request?: SessionCancellationRequestRecord;
  sessionId: string;
}): AgentEngineExecutionError {
  return new AgentEngineExecutionError(
    input.request
      ? `Session '${input.sessionId}' on node '${input.context.binding.node.nodeId}' was cancelled by request '${input.request.cancellationId}'.`
      : `Session '${input.sessionId}' on node '${input.context.binding.node.nodeId}' was cancelled.`,
    {
      classification: "cancelled"
    }
  );
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
    initiator: "peer",
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

function buildEngineApprovalRequestId(input: {
  directive: EngineApprovalRequestDirective;
  index: number;
  turnId: string;
}): string {
  return (
    input.directive.approvalId ??
    `approval-${input.turnId}-${String(input.index + 1).padStart(3, "0")}`
  );
}

function policyResourcesMatch(
  left: ApprovalRecord["resource"],
  right: ApprovalRecord["resource"]
): boolean {
  if (!left && !right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return left.id === right.id && left.kind === right.kind;
}

function assertEngineApprovalRequestCompatible(input: {
  approvalId: string;
  context: EffectiveRuntimeContext;
  directive: EngineApprovalRequestDirective;
  envelope: RunnerInboundEnvelope;
  existingApproval: ApprovalRecord;
}): void {
  if (input.existingApproval.graphId !== input.envelope.message.graphId) {
    throw new AgentEngineExecutionError(
      `Engine approval request '${input.approvalId}' belongs to graph '${input.existingApproval.graphId}', not '${input.envelope.message.graphId}'.`,
      {
        classification: "bad_request"
      }
    );
  }

  if (
    input.existingApproval.requestedByNodeId !==
    input.context.binding.node.nodeId
  ) {
    throw new AgentEngineExecutionError(
      `Engine approval request '${input.approvalId}' was requested by node '${input.existingApproval.requestedByNodeId}', not '${input.context.binding.node.nodeId}'.`,
      {
        classification: "bad_request"
      }
    );
  }

  if (input.existingApproval.sessionId !== input.envelope.message.sessionId) {
    throw new AgentEngineExecutionError(
      `Engine approval request '${input.approvalId}' belongs to session '${input.existingApproval.sessionId}', not '${input.envelope.message.sessionId}'.`,
      {
        classification: "bad_request"
      }
    );
  }

  if (
    input.existingApproval.operation &&
    input.existingApproval.operation !== input.directive.operation
  ) {
    throw new AgentEngineExecutionError(
      `Engine approval request '${input.approvalId}' is scoped to operation '${input.existingApproval.operation}', not '${input.directive.operation}'.`,
      {
        classification: "bad_request"
      }
    );
  }

  if (
    !policyResourcesMatch(
      input.existingApproval.resource,
      input.directive.resource
    )
  ) {
    throw new AgentEngineExecutionError(
      `Engine approval request '${input.approvalId}' has a conflicting resource scope.`,
      {
        classification: "bad_request"
      }
    );
  }
}

async function materializeEngineApprovalRequests(input: {
  context: EffectiveRuntimeContext;
  directives: EngineApprovalRequestDirective[];
  envelope: RunnerInboundEnvelope;
  statePaths: RunnerStatePaths;
  turnId: string;
}): Promise<MaterializedApprovalRequests> {
  const approvalRecords: ApprovalRecord[] = [];
  const waitingApprovalIds: string[] = [];

  for (const [index, directive] of input.directives.entries()) {
    const approvalId = buildEngineApprovalRequestId({
      directive,
      index,
      turnId: input.turnId
    });
    const existingApproval = await readApprovalRecord(
      input.statePaths,
      approvalId
    );

    if (existingApproval) {
      assertEngineApprovalRequestCompatible({
        approvalId,
        context: input.context,
        directive,
        envelope: input.envelope,
        existingApproval
      });

      if (existingApproval.status === "approved") {
        approvalRecords.push(existingApproval);
        continue;
      }

      if (existingApproval.status !== "pending") {
        throw new AgentEngineExecutionError(
          `Engine approval request '${approvalId}' is '${existingApproval.status}' and cannot be reused as a pending gate.`,
          {
            classification: "policy_denied"
          }
        );
      }
    }

    const requestedAt = existingApproval?.requestedAt ?? nowIsoString();
    const approvalRecord: ApprovalRecord = {
      approvalId,
      approverNodeIds: existingApproval
        ? mergeIdentifierLists(
            existingApproval.approverNodeIds,
            directive.approverNodeIds
          )
        : directive.approverNodeIds,
      conversationId: input.envelope.message.conversationId,
      graphId: input.envelope.message.graphId,
      operation: directive.operation,
      reason: directive.reason,
      requestedAt,
      requestedByNodeId: input.context.binding.node.nodeId,
      ...(directive.resource ? { resource: directive.resource } : {}),
      sessionId: input.envelope.message.sessionId,
      sourceMessageId: existingApproval?.sourceMessageId ?? input.envelope.eventId,
      status: "pending",
      updatedAt: nowIsoString()
    };

    await writeApprovalRecord(input.statePaths, approvalRecord);
    approvalRecords.push(approvalRecord);
    waitingApprovalIds.push(approvalId);
  }

  return {
    approvalRecords,
    waitingApprovalIds
  };
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
    responseEventId?: string;
    responseSignerPubkey?: string;
    sourceMessageId?: string;
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
    ...(input.responseEventId
      ? { responseEventId: input.responseEventId }
      : {}),
    ...(input.responseSignerPubkey
      ? { responseSignerPubkey: input.responseSignerPubkey }
      : {}),
    ...(input.sourceMessageId ? { sourceMessageId: input.sourceMessageId } : {}),
    status: nextStatus,
    updatedAt: input.updatedAt
  };

  await writeApprovalRecord(statePaths, nextRecord);
  return nextRecord;
}

function isTerminalSessionStatus(status: SessionLifecycleState): boolean {
  return ["cancelled", "completed", "failed", "timed_out"].includes(status);
}

async function markSessionCancellationRequestObserved(input: {
  record: SessionCancellationRequestRecord;
  statePaths: RunnerStatePaths;
  turnId?: string;
}): Promise<SessionCancellationRequestRecord> {
  if (input.record.status === "observed") {
    return input.record;
  }

  const observedRecord = sessionCancellationRequestRecordSchema.parse({
    ...input.record,
    observedAt: nowIsoString(),
    ...(input.turnId ? { observedTurnId: input.turnId } : {}),
    status: "observed"
  });
  await writeSessionCancellationRequestRecord(input.statePaths, observedRecord);
  return observedRecord;
}

async function cancelSessionForRequest(input: {
  lastMessageId?: string;
  lastMessageType?: EntangleA2AMessage["messageType"];
  request: SessionCancellationRequestRecord;
  session: SessionRecord;
  statePaths: RunnerStatePaths;
  turnId?: string;
}): Promise<SessionRecord> {
  if (isTerminalSessionStatus(input.session.status)) {
    await markSessionCancellationRequestObserved({
      record: input.request,
      statePaths: input.statePaths,
      ...(input.turnId ? { turnId: input.turnId } : {})
    });
    return input.session;
  }

  const [approvalRecords, conversationRecords] = await Promise.all([
    listApprovalRecords(input.statePaths),
    listConversationRecords(input.statePaths)
  ]);
  const now = nowIsoString();

  await Promise.all(
    approvalRecords
      .filter(
        (approvalRecord) =>
          approvalRecord.sessionId === input.session.sessionId &&
          approvalRecord.status === "pending"
      )
      .map((approvalRecord) =>
        transitionApprovalStatus(input.statePaths, approvalRecord, "withdrawn", {
          updatedAt: now
        })
      )
  );

  await Promise.all(
    conversationRecords
      .filter(
        (conversationRecord) =>
          conversationRecord.sessionId === input.session.sessionId &&
          hasOpenConversationStatus(conversationRecord) &&
          isAllowedConversationLifecycleTransition(
            conversationRecord.status,
            "expired"
          )
      )
      .map((conversationRecord) =>
        transitionConversationStatus(input.statePaths, conversationRecord, "expired", {
          ...(conversationRecord.lastInboundMessageId
            ? { lastInboundMessageId: conversationRecord.lastInboundMessageId }
            : {}),
          lastMessageType:
            conversationRecord.lastMessageType ??
            input.lastMessageType ??
            "conversation.close"
        })
      )
  );

  const cancellableSession: SessionRecord = {
    ...input.session,
    activeConversationIds: [],
    waitingApprovalIds: [],
    updatedAt: now
  };
  const cancelledSession = isAllowedSessionLifecycleTransition(
    cancellableSession.status,
    "cancelled"
  )
    ? await transitionSessionStatus(input.statePaths, cancellableSession, "cancelled", {
        ...(input.lastMessageId ? { lastMessageId: input.lastMessageId } : {}),
        ...(input.lastMessageType ? { lastMessageType: input.lastMessageType } : {})
      })
    : cancellableSession;

  await markSessionCancellationRequestObserved({
    record: input.request,
    statePaths: input.statePaths,
    ...(input.turnId ? { turnId: input.turnId } : {})
  });

  return cancelledSession;
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
  error: unknown,
  result?: AgentEngineTurnResult
): EngineTurnOutcome {
  const failure = buildEngineFailure(context, error);

  return engineTurnOutcomeSchema.parse({
    ...(result?.engineSessionId
      ? { engineSessionId: result.engineSessionId }
      : {}),
    ...(result?.engineVersion ? { engineVersion: result.engineVersion } : {}),
    failure,
    ...(result?.permissionObservations
      ? { permissionObservations: result.permissionObservations }
      : {}),
    ...(buildEngineProviderMetadataFromContext(context)
      ? { providerMetadata: buildEngineProviderMetadataFromContext(context) }
      : result?.providerMetadata
        ? { providerMetadata: result.providerMetadata }
        : {}),
    ...(result?.providerStopReason
      ? { providerStopReason: result.providerStopReason }
      : {}),
    stopReason: failure.classification === "cancelled" ? "cancelled" : "error",
    toolExecutions: result?.toolExecutions ?? [],
    ...(result?.usage ? { usage: result.usage } : {})
  });
}

function buildWikiArtifactRefForTurn(input: {
  context: EffectiveRuntimeContext;
  turnRecord: RunnerTurnRecord;
}): ArtifactRef | undefined {
  const outcome = input.turnRecord.memoryRepositorySyncOutcome;

  if (
    !outcome ||
    (outcome.status !== "committed" && outcome.status !== "unchanged") ||
    !outcome.commit
  ) {
    return undefined;
  }

  return {
    artifactId: `wiki-${input.turnRecord.turnId}`,
    artifactKind: "knowledge_summary",
    backend: "wiki",
    contentSummary: `Wiki repository ${outcome.status} at ${outcome.commit}.`,
    createdByNodeId: input.context.binding.node.nodeId,
    locator: {
      nodeId: input.context.binding.node.nodeId,
      path: "/"
    },
    preferred: true,
    ...(input.turnRecord.sessionId
      ? { sessionId: input.turnRecord.sessionId }
      : {}),
    status: "materialized"
  };
}

const wikiPreviewMaxBytes = 8 * 1024;
const wikiPreviewCandidatePaths = [
  "summaries/working-context.md",
  "index.md"
] as const;

async function readWikiRepositoryPreview(
  context: EffectiveRuntimeContext
): Promise<ArtifactContentPreview | undefined> {
  const repositoryRoot = context.workspace.wikiRepositoryRoot;

  if (!repositoryRoot) {
    return undefined;
  }

  for (const relativePath of wikiPreviewCandidatePaths) {
    const candidatePath = path.join(repositoryRoot, relativePath);

    try {
      const candidateStat = await stat(candidatePath);

      if (!candidateStat.isFile()) {
        continue;
      }

      const file = await open(candidatePath, "r");

      try {
        const buffer = Buffer.alloc(wikiPreviewMaxBytes + 1);
        const { bytesRead } = await file.read(
          buffer,
          0,
          wikiPreviewMaxBytes + 1,
          0
        );
        const truncated = bytesRead > wikiPreviewMaxBytes;
        const previewBuffer = buffer.subarray(
          0,
          Math.min(bytesRead, wikiPreviewMaxBytes)
        );

        if (previewBuffer.includes(0)) {
          return {
            available: false,
            reason:
              "Wiki preview is unavailable because the selected wiki page is not text."
          };
        }

        return {
          available: true,
          bytesRead: previewBuffer.length,
          content: previewBuffer.toString("utf8"),
          contentEncoding: "utf8",
          contentType: "text/markdown",
          truncated
        };
      } finally {
        await file.close();
      }
    } catch {
      continue;
    }
  }

  return {
    available: false,
    reason: "Wiki preview is unavailable because no previewable wiki page exists."
  };
}

function resolveWikiPageRelativePath(pagePath: string): string {
  const trimmedPath = pagePath.trim();

  if (
    trimmedPath.length === 0 ||
    trimmedPath.includes("\\") ||
    trimmedPath.includes("\0") ||
    path.posix.isAbsolute(trimmedPath)
  ) {
    throw new Error("Wiki page path must be a non-empty POSIX markdown path.");
  }

  const rawSegments = trimmedPath.split("/");

  if (rawSegments.includes("..")) {
    throw new Error("Wiki page path must stay inside the runtime wiki root.");
  }

  const normalizedPath = path.posix.normalize(trimmedPath);
  const segments = normalizedPath.split("/");

  if (
    normalizedPath === "." ||
    normalizedPath.startsWith("../") ||
    segments.includes("..")
  ) {
    throw new Error("Wiki page path must stay inside the runtime wiki root.");
  }

  if (!normalizedPath.endsWith(".md")) {
    throw new Error("Wiki page path must end with '.md'.");
  }

  return normalizedPath;
}

function resolveWikiPageAbsolutePath(input: {
  context: EffectiveRuntimeContext;
  relativePath: string;
}): string {
  const wikiRoot = path.join(input.context.workspace.memoryRoot, "wiki");
  const absolutePath = path.join(
    wikiRoot,
    ...input.relativePath.split(path.posix.sep)
  );
  const relativeToRoot = path.relative(wikiRoot, absolutePath);

  if (
    relativeToRoot === "" ||
    relativeToRoot.startsWith("..") ||
    path.isAbsolute(relativeToRoot)
  ) {
    throw new Error("Wiki page path must stay inside the runtime wiki root.");
  }

  return absolutePath;
}

function buildWikiPageArtifactId(input: {
  commandId?: string;
  nodeId: string;
  relativePath: string;
}): string {
  if (input.commandId) {
    return `wiki-${input.commandId}`;
  }

  const digest = createHash("sha256")
    .update(`${input.nodeId}:${input.relativePath}`)
    .digest("hex")
    .slice(0, 16);

  return `wiki-page-${input.nodeId}-${digest}`;
}

function hashWikiPageContent(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function splitWikiPageLines(content: string): string[] {
  const normalized = content.replace(/\r\n/g, "\n");
  const withoutFinalNewline = normalized.endsWith("\n")
    ? normalized.slice(0, -1)
    : normalized;

  return withoutFinalNewline.length > 0
    ? withoutFinalNewline.split("\n")
    : [];
}

function describeWikiPageMutationMode(mode: "append" | "patch" | "replace"): string {
  return mode === "append" ? "appended" : mode === "patch" ? "patched" : "replaced";
}

function applyWikiPageUnifiedPatch(input: {
  currentContent: string;
  patchContent: string;
}): string {
  const currentLines = splitWikiPageLines(input.currentContent);
  const patchLines = input.patchContent.replace(/\r\n/g, "\n").split("\n");
  const outputLines: string[] = [];
  let currentIndex = 0;
  let hunkSeen = false;

  for (let patchIndex = 0; patchIndex < patchLines.length;) {
    const line = patchLines[patchIndex] ?? "";

    if (line.length === 0 && patchIndex === patchLines.length - 1) {
      break;
    }

    if (line.startsWith("--- ") || line.startsWith("+++ ")) {
      patchIndex += 1;
      continue;
    }

    const header = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);

    if (!header) {
      throw new Error("Wiki page patch must be a unified diff with hunks.");
    }

    hunkSeen = true;
    const oldStart = Number(header[1]);
    const hunkStartIndex = Math.max(oldStart - 1, 0);

    if (hunkStartIndex < currentIndex) {
      throw new Error("Wiki page patch hunks overlap or are out of order.");
    }

    outputLines.push(...currentLines.slice(currentIndex, hunkStartIndex));
    currentIndex = hunkStartIndex;
    patchIndex += 1;

    while (patchIndex < patchLines.length) {
      const hunkLine = patchLines[patchIndex] ?? "";

      if (hunkLine.startsWith("@@ ")) {
        break;
      }

      if (hunkLine.length === 0 && patchIndex === patchLines.length - 1) {
        break;
      }

      if (hunkLine === "\\ No newline at end of file") {
        patchIndex += 1;
        continue;
      }

      const marker = hunkLine[0];
      const text = hunkLine.slice(1);

      if (marker === " ") {
        if (currentLines[currentIndex] !== text) {
          throw new Error("Wiki page patch context did not match current content.");
        }

        outputLines.push(text);
        currentIndex += 1;
        patchIndex += 1;
        continue;
      }

      if (marker === "-") {
        if (currentLines[currentIndex] !== text) {
          throw new Error("Wiki page patch removal did not match current content.");
        }

        currentIndex += 1;
        patchIndex += 1;
        continue;
      }

      if (marker === "+") {
        outputLines.push(text);
        patchIndex += 1;
        continue;
      }

      throw new Error("Wiki page patch contains an unsupported hunk line.");
    }
  }

  if (!hunkSeen) {
    throw new Error("Wiki page patch must include at least one hunk.");
  }

  outputLines.push(...currentLines.slice(currentIndex));

  return `${outputLines.join("\n")}\n`;
}

async function readWikiPagePreview(input: {
  absolutePath: string;
}): Promise<ArtifactContentPreview> {
  try {
    const file = await open(input.absolutePath, "r");

    try {
      const buffer = Buffer.alloc(wikiPreviewMaxBytes + 1);
      const { bytesRead } = await file.read(
        buffer,
        0,
        wikiPreviewMaxBytes + 1,
        0
      );
      const truncated = bytesRead > wikiPreviewMaxBytes;
      const previewBuffer = buffer.subarray(
        0,
        Math.min(bytesRead, wikiPreviewMaxBytes)
      );

      if (previewBuffer.includes(0)) {
        return {
          available: false,
          reason: "Wiki page preview is unavailable because the page is not text."
        };
      }

      return {
        available: true,
        bytesRead: previewBuffer.length,
        content: previewBuffer.toString("utf8"),
        contentEncoding: "utf8",
        contentType: "text/markdown",
        truncated
      };
    } finally {
      await file.close();
    }
  } catch (error) {
    return {
      available: false,
      reason:
        error instanceof Error
          ? error.message
          : "Wiki page preview is unavailable."
    };
  }
}

export class RunnerService {
  private readonly cancellationPollIntervalMs: number;
  private readonly artifactBackend: RunnerArtifactBackend;
  private readonly context: EffectiveRuntimeContext;
  private readonly engine: AgentEngine;
  private readonly explicitToolDefinitions: EngineToolDefinition[] | undefined;
  private readonly memorySynthesizer: RunnerMemorySynthesizer | undefined;
  private readonly observationPublisher:
    | RunnerServiceObservationPublisher
    | undefined;
  private readonly transport: RunnerTransport;
  private readonly activeSessionAbortControllers = new Map<
    string,
    AbortController
  >();
  private cancellationPollTimer: ReturnType<typeof setInterval> | undefined;
  private subscription: RunnerTransportSubscription | undefined;
  private statePaths: RunnerStatePaths | undefined;
  private toolDefinitionsPromise: Promise<EngineToolDefinition[]> | undefined;

  constructor(input: {
    artifactBackend?: RunnerArtifactBackend;
    context: EffectiveRuntimeContext;
    engine?: AgentEngine;
    memorySynthesizer?: RunnerMemorySynthesizer;
    observationPublisher?: RunnerServiceObservationPublisher;
    cancellationPollIntervalMs?: number;
    toolDefinitions?: EngineToolDefinition[];
    transport: RunnerTransport;
  }) {
    this.cancellationPollIntervalMs = input.cancellationPollIntervalMs ?? 500;
    this.artifactBackend =
      input.artifactBackend ?? new GitCliRunnerArtifactBackend();
    this.context = input.context;
    this.engine = input.engine ?? createStubAgentEngine();
    this.explicitToolDefinitions = input.toolDefinitions;
    this.memorySynthesizer = input.memorySynthesizer;
    this.observationPublisher = input.observationPublisher;
    this.transport = input.transport;
  }

  private async publishSessionObservation(record: SessionRecord): Promise<void> {
    try {
      await this.observationPublisher?.publishSessionUpdated(record);
    } catch {
      // Observation transport failures must not corrupt runner-local state.
    }
  }

  private async publishConversationObservation(
    record: ConversationRecord
  ): Promise<void> {
    try {
      await this.observationPublisher?.publishConversationUpdated(record);
    } catch {
      // Observation transport failures must not corrupt runner-local state.
    }
  }

  private async publishTurnObservation(record: RunnerTurnRecord): Promise<void> {
    try {
      await this.observationPublisher?.publishTurnUpdated(record);
    } catch {
      // Observation transport failures must not corrupt runner-local state.
    }
  }

  private async publishArtifactRefObservation(
    artifactRecord: ArtifactRecord
  ): Promise<void> {
    try {
      await this.observationPublisher?.publishArtifactRefObserved?.({
        artifactRecord,
        artifactPreview: await buildArtifactContentPreview(artifactRecord),
        graphId: this.context.binding.graphId,
        nodeId: this.context.binding.node.nodeId,
        observedAt: artifactRecord.updatedAt
      });
    } catch {
      // Observation transport failures must not corrupt runner-local state.
    }
  }

  private async publishArtifactRefObservations(
    artifactRecords: ArtifactRecord[]
  ): Promise<void> {
    for (const artifactRecord of artifactRecords) {
      await this.publishArtifactRefObservation(artifactRecord);
    }
  }

  private async publishApprovalObservation(record: ApprovalRecord): Promise<void> {
    try {
      await this.observationPublisher?.publishApprovalUpdated?.(record);
    } catch {
      // Observation transport failures must not corrupt runner-local state.
    }
  }

  private async publishApprovalObservations(
    approvalRecords: ApprovalRecord[]
  ): Promise<void> {
    for (const approvalRecord of approvalRecords) {
      await this.publishApprovalObservation(approvalRecord);
    }
  }

  private buildEnginePermissionApprovalId(input: {
    permission: AgentEnginePermissionRequest;
    sequence: number;
    turnId: string;
  }): string {
    return sanitizeIdentifier(
      `approval-${input.turnId}-engine-permission-${input.sequence}-${input.permission.permission}`
    ).slice(0, 120);
  }

  private buildEnginePermissionApprovalRequestMessage(input: {
    approvalId: string;
    envelope: RunnerInboundEnvelope;
    permission: AgentEnginePermissionRequest;
  }): EntangleA2AMessage {
    const reason = truncateBoundedText(
      input.permission.reason,
      maxEnginePermissionApprovalReasonCharacters
    );

    return {
      constraints: {
        approvalRequiredBeforeAction: false
      },
      conversationId: input.envelope.message.conversationId,
      fromNodeId: this.context.binding.node.nodeId,
      fromPubkey: this.context.identityContext.publicKey,
      graphId: input.envelope.message.graphId,
      intent: `Approve ${input.permission.permission}`,
      messageType: "approval.request",
      parentMessageId: input.envelope.eventId,
      protocol: "entangle.a2a.v1",
      responsePolicy: {
        closeOnResult: false,
        maxFollowups: 1,
        responseRequired: true
      },
      sessionId: input.envelope.message.sessionId,
      toNodeId: input.envelope.message.fromNodeId,
      toPubkey: input.envelope.message.fromPubkey,
      turnId: buildSyntheticTurnId("approval"),
      work: {
        artifactRefs: [],
        metadata: {
          approval: {
            approvalId: input.approvalId,
            approverNodeIds: [input.envelope.message.fromNodeId],
            operation: input.permission.operation,
            reason,
            ...(input.permission.resource
              ? { resource: input.permission.resource }
              : {})
          },
          enginePermission: {
            patterns: input.permission.patterns,
            permission: input.permission.permission,
            ...(input.permission.toolCallId
              ? { toolCallId: input.permission.toolCallId }
              : {})
          }
        },
        summary: reason
      }
    };
  }

  private async waitForEnginePermissionApproval(input: {
    abortSignal: AbortSignal;
    approvalId: string;
    statePaths: RunnerStatePaths;
  }): Promise<AgentEnginePermissionResponse> {
    while (!input.abortSignal.aborted) {
      const approvalRecord = await readApprovalRecord(
        input.statePaths,
        input.approvalId
      );

      if (approvalRecord?.status === "approved") {
        return {
          approvalId: approvalRecord.approvalId,
          decision: "approved",
          message: `Entangle approval '${approvalRecord.approvalId}' was approved.`
        };
      }

      if (approvalRecord?.status === "rejected") {
        return {
          approvalId: approvalRecord.approvalId,
          decision: "rejected",
          message: `Entangle approval '${approvalRecord.approvalId}' was rejected.`
        };
      }

      await sleep(enginePermissionApprovalPollIntervalMs);
    }

    return {
      approvalId: input.approvalId,
      decision: "rejected",
      message: `Entangle approval '${input.approvalId}' was cancelled before a decision.`
    };
  }

  private async requestEnginePermissionApproval(input: {
    abortSignal: AbortSignal;
    envelope: RunnerInboundEnvelope;
    permission: AgentEnginePermissionRequest;
    sequence: number;
    statePaths: RunnerStatePaths;
    turnId: string;
  }): Promise<AgentEnginePermissionResponse> {
    const approvalId = this.buildEnginePermissionApprovalId({
      permission: input.permission,
      sequence: input.sequence,
      turnId: input.turnId
    });
    const requestedAt = nowIsoString();
    const approvalRecord: ApprovalRecord = {
      approvalId,
      approverNodeIds: [input.envelope.message.fromNodeId],
      conversationId: input.envelope.message.conversationId,
      graphId: input.envelope.message.graphId,
      operation: input.permission.operation,
      reason: truncateBoundedText(
        input.permission.reason,
        maxEnginePermissionApprovalReasonCharacters
      ),
      requestedAt,
      requestedByNodeId: this.context.binding.node.nodeId,
      ...(input.permission.resource ? { resource: input.permission.resource } : {}),
      sessionId: input.envelope.message.sessionId,
      sourceMessageId: input.envelope.eventId,
      status: "pending",
      updatedAt: requestedAt
    };
    await writeApprovalRecord(input.statePaths, approvalRecord);
    await this.publishApprovalObservation(approvalRecord);

    const requestMessage = this.buildEnginePermissionApprovalRequestMessage({
      approvalId,
      envelope: input.envelope,
      permission: input.permission
    });
    const published = await this.transport.publish(requestMessage);
    const publishedApprovalRecord: ApprovalRecord = {
      ...approvalRecord,
      requestEventId: published.eventId,
      ...(published.signerPubkey
        ? { requestSignerPubkey: published.signerPubkey }
        : {}),
      updatedAt: published.receivedAt
    };
    await writeApprovalRecord(input.statePaths, publishedApprovalRecord);
    await this.publishApprovalObservation(publishedApprovalRecord);

    const currentSession = await readSessionRecord(
      input.statePaths,
      input.envelope.message.sessionId
    );
    if (currentSession) {
      const waitingSession: SessionRecord = {
        ...currentSession,
        waitingApprovalIds: mergeIdentifierLists(
          currentSession.waitingApprovalIds,
          [approvalId]
        )
      };
      await writeSessionRecord(input.statePaths, waitingSession);
      await this.publishSessionObservation(
        isAllowedSessionLifecycleTransition(
          waitingSession.status,
          "waiting_approval"
        )
          ? await transitionSessionStatus(
              input.statePaths,
              waitingSession,
              "waiting_approval",
              {
                lastMessageId: published.eventId,
                lastMessageType: "approval.request"
              }
            )
          : waitingSession
      );
    }

    const currentConversation = await readConversationRecord(
      input.statePaths,
      input.envelope.message.conversationId
    );
    if (currentConversation) {
      await this.publishConversationObservation(
        await this.transitionConversationToAwaitingApproval({
          conversation: currentConversation,
          lastInboundMessageId: published.eventId,
          lastMessageType: "approval.request",
          statePaths: input.statePaths
        })
      );
    }

    return this.waitForEnginePermissionApproval({
      abortSignal: input.abortSignal,
      approvalId,
      statePaths: input.statePaths
    });
  }

  private async publishSourceChangeRefObservation(
    candidate: SourceChangeCandidateRecord,
    artifactRefs: ArtifactRef[] = []
  ): Promise<void> {
    try {
      await this.observationPublisher?.publishSourceChangeRefObserved?.({
        artifactRefs,
        candidate,
        observedAt: candidate.updatedAt
      });
    } catch {
      // Observation transport failures must not corrupt runner-local state.
    }
  }

  private async publishSourceHistoryRefObservation(
    history: SourceHistoryRecord
  ): Promise<void> {
    try {
      await this.observationPublisher?.publishSourceHistoryRefObserved?.({
        history,
        observedAt: history.updatedAt
      });
    } catch {
      // Observation transport failures must not corrupt runner-local state.
    }
  }

  private async publishSourceHistoryReplayObservation(
    replay: SourceHistoryReplayRecord
  ): Promise<void> {
    try {
      await this.observationPublisher?.publishSourceHistoryReplayedObserved?.({
        observedAt: replay.updatedAt,
        replay
      });
    } catch {
      // Observation transport failures must not corrupt runner-local state.
    }
  }

  private async publishWikiRefObservation(
    artifactRef: ArtifactRef,
    observedAt: string,
    artifactPreview?: ArtifactContentPreview
  ): Promise<void> {
    try {
      await this.observationPublisher?.publishWikiRefObserved?.({
        artifactRef,
        ...(artifactPreview ? { artifactPreview } : {}),
        graphId: this.context.binding.graphId,
        nodeId: this.context.binding.node.nodeId,
        observedAt
      });
    } catch {
      // Observation transport failures must not corrupt runner-local state.
    }
  }

  private async writeRunnerPhase(
    statePaths: RunnerStatePaths,
    record: RunnerTurnRecord,
    phase: RunnerPhase
  ): Promise<RunnerTurnRecord> {
    const nextRecord = await writeRunnerPhase(statePaths, record, phase);
    await this.publishTurnObservation(nextRecord);
    return nextRecord;
  }

  private startCancellationPolling(): () => void {
    const timer = setInterval(() => {
      void this.applyExternalCancellationRequests();
    }, this.cancellationPollIntervalMs);
    timer.unref?.();

    return () => {
      clearInterval(timer);
    };
  }

  private async applyExternalCancellationRequests(): Promise<void> {
    const statePaths =
      this.statePaths ??
      (await ensureRunnerStatePaths(this.context.workspace.runtimeRoot));
    this.statePaths = statePaths;
    const requests = await listSessionCancellationRequestRecords(statePaths);

    for (const request of requests) {
      if (
        request.nodeId !== this.context.binding.node.nodeId ||
        request.status !== "requested"
      ) {
        continue;
      }

      const activeController = this.activeSessionAbortControllers.get(
        request.sessionId
      );

      if (activeController) {
        if (!activeController.signal.aborted) {
          activeController.abort(request);
        }
        continue;
      }

      const session = await readSessionRecord(statePaths, request.sessionId);

      if (!session) {
        continue;
      }

      if (isTerminalSessionStatus(session.status)) {
        await markSessionCancellationRequestObserved({
          record: request,
          statePaths
        });
        continue;
      }

      const cancelledSession = await cancelSessionForRequest({
        request,
        session,
        statePaths
      });
      await this.publishSessionObservation(cancelledSession);
    }
  }

  async requestSessionCancellation(
    request: SessionCancellationRequestRecord
  ): Promise<SessionCancellationRequestRecord> {
    const statePaths =
      this.statePaths ??
      (await ensureRunnerStatePaths(this.context.workspace.runtimeRoot));
    this.statePaths = statePaths;
    const parsed = sessionCancellationRequestRecordSchema.parse(request);
    await writeSessionCancellationRequestRecord(statePaths, parsed);
    await this.applyExternalCancellationRequests();
    return parsed;
  }

  private formatApprovalResource(resource: ApprovalRecord["resource"]): string {
    if (!resource) {
      return "unspecified";
    }

    return resource.label
      ? `${resource.kind}:${resource.id} (${resource.label})`
      : `${resource.kind}:${resource.id}`;
  }

  private async assertSourceHistoryReplayApproval(input: {
    approvalId?: string;
    history: SourceHistoryRecord;
    statePaths: RunnerStatePaths;
  }): Promise<void> {
    const required =
      this.context.policyContext.sourceMutation.applyRequiresApproval;

    if (!input.approvalId) {
      if (!required) {
        return;
      }

      throw new Error(
        `Runtime '${this.context.binding.node.nodeId}' requires an approved approvalId before source history replay.`
      );
    }

    const approval = await readApprovalRecord(input.statePaths, input.approvalId);
    const expectedResource = {
      id: input.history.sourceHistoryId,
      kind: "source_history" as const,
      label: input.history.sourceHistoryId
    };

    if (!approval) {
      throw new Error(
        `Approval '${input.approvalId}' was not found for runtime '${this.context.binding.node.nodeId}'.`
      );
    }

    if (approval.graphId !== this.context.binding.graphId) {
      throw new Error(
        `Approval '${input.approvalId}' belongs to graph '${approval.graphId}', not graph '${this.context.binding.graphId}'.`
      );
    }

    if (approval.requestedByNodeId !== this.context.binding.node.nodeId) {
      throw new Error(
        `Approval '${input.approvalId}' was requested by node '${approval.requestedByNodeId}', not runtime '${this.context.binding.node.nodeId}'.`
      );
    }

    if (input.history.sessionId && approval.sessionId !== input.history.sessionId) {
      throw new Error(
        `Approval '${input.approvalId}' belongs to session '${approval.sessionId}', not session '${input.history.sessionId}'.`
      );
    }

    if (approval.operation !== "source_application") {
      throw new Error(
        `Approval '${input.approvalId}' is scoped to operation '${approval.operation ?? "unspecified"}', but source history replay requires 'source_application'.`
      );
    }

    if (!policyResourcesMatch(approval.resource, expectedResource)) {
      throw new Error(
        `Approval '${input.approvalId}' is scoped to resource '${this.formatApprovalResource(approval.resource)}', but source history replay requires '${this.formatApprovalResource(expectedResource)}'.`
      );
    }

    if (approval.status !== "approved") {
      throw new Error(
        `Approval '${input.approvalId}' is '${approval.status}', but source history replay requires an approved approval.`
      );
    }
  }

  async requestSourceHistoryPublication(input: {
    approvalId?: string;
    reason?: string;
    requestedAt?: string;
    requestedBy?: string;
    retryFailedPublication?: boolean;
    sourceHistoryId: string;
    target?: SourceHistoryPublicationTarget;
  }): Promise<RunnerSourceHistoryPublicationCommandResult> {
    const statePaths =
      this.statePaths ??
      (await ensureRunnerStatePaths(this.context.workspace.runtimeRoot));
    this.statePaths = statePaths;
    const history = await readSourceHistoryRecord(
      statePaths,
      input.sourceHistoryId
    );

    if (!history) {
      throw new Error(
        `Source history '${input.sourceHistoryId}' was not found for runtime '${this.context.binding.node.nodeId}'.`
      );
    }

    if (history.nodeId !== this.context.binding.node.nodeId) {
      throw new Error(
        `Source history '${input.sourceHistoryId}' belongs to node '${history.nodeId}', not '${this.context.binding.node.nodeId}'.`
      );
    }

    const publication = await publishSourceHistoryToGitTarget({
      ...(input.approvalId ? { approvalId: input.approvalId } : {}),
      context: this.context,
      history,
      ...(input.reason ? { reason: input.reason } : {}),
      requestedAt: input.requestedAt ?? new Date().toISOString(),
      ...(input.requestedBy ? { requestedBy: input.requestedBy } : {}),
      retryFailedPublication: input.retryFailedPublication ?? false,
      statePaths,
      ...(input.target ? { target: input.target } : {})
    });

    if (!publication.published) {
      throw new Error(publication.reason);
    }

    await this.publishArtifactRefObservation(publication.artifact);
    await this.publishSourceHistoryRefObservation(publication.history);

    const publicationState = publication.history.publication?.publication.state;

    return {
      ...(publication.history.publication?.publication.lastError
        ? { message: publication.history.publication.publication.lastError }
        : {}),
      ...(publicationState ? { publicationState } : {}),
      sourceHistoryId: publication.history.sourceHistoryId
    };
  }

  async requestArtifactRestore(input: {
    artifactRef: ArtifactRef;
    reason?: string;
    requestedAt?: string;
    requestedBy?: string;
    restoreId?: string;
  }): Promise<RunnerArtifactRestoreCommandResult> {
    const statePaths =
      this.statePaths ??
      (await ensureRunnerStatePaths(this.context.workspace.runtimeRoot));
    this.statePaths = statePaths;

    try {
      const restored = await this.artifactBackend.retrieveInboundArtifacts({
        artifactRefs: [input.artifactRef],
        context: this.context
      });
      const [artifact] = restored.artifacts;

      if (!artifact) {
        throw new Error(
          `Artifact '${input.artifactRef.artifactId}' did not produce a restorable git artifact record.`
        );
      }

      await writeArtifactRecord(statePaths, artifact);
      await this.publishArtifactRefObservation(artifact);

      return {
        artifactId: artifact.ref.artifactId,
        retrievalState: artifact.retrieval?.state ?? "retrieved"
      };
    } catch (error) {
      if (error instanceof RunnerArtifactRetrievalError) {
        await Promise.all(
          error.artifactRecords.map((artifactRecord) =>
            writeArtifactRecord(statePaths, artifactRecord)
          )
        );
        await this.publishArtifactRefObservations(error.artifactRecords);
        const [failedArtifact] = error.artifactRecords;

        return {
          artifactId: input.artifactRef.artifactId,
          message: failedArtifact?.retrieval?.lastError ?? error.message,
          retrievalState: "failed"
        };
      }

      throw error;
    }
  }

  async requestArtifactSourceChangeProposal(input: {
    artifactRef: ArtifactRef;
    overwrite?: boolean;
    proposalId?: string;
    reason?: string;
    requestedAt?: string;
    requestedBy?: string;
    targetPath?: string;
  }): Promise<RunnerArtifactSourceChangeProposalCommandResult> {
    const sourceWorkspaceRoot = this.context.workspace.sourceWorkspaceRoot;

    if (!sourceWorkspaceRoot) {
      throw new Error(
        `Runtime '${this.context.binding.node.nodeId}' has no source workspace for artifact source-change proposals.`
      );
    }

    const statePaths =
      this.statePaths ??
      (await ensureRunnerStatePaths(this.context.workspace.runtimeRoot));
    this.statePaths = statePaths;

    const restored = await this.artifactBackend.retrieveInboundArtifacts({
      artifactRefs: [input.artifactRef],
      context: this.context
    });
    const [artifact] = restored.artifacts;
    const [artifactInput] = restored.artifactInputs;

    if (!artifact || !artifactInput?.localPath) {
      throw new Error(
        `Artifact '${input.artifactRef.artifactId}' did not produce source-change proposal input.`
      );
    }

    await writeArtifactRecord(statePaths, artifact);
    await this.publishArtifactRefObservation(artifact);

    const baseline = await prepareSourceChangeHarvest(this.context);
    const copyResult = await copyArtifactIntoSourceWorkspace({
      artifactRef: input.artifactRef,
      overwrite: input.overwrite ?? false,
      sourcePath: artifactInput.localPath,
      sourceWorkspaceRoot,
      ...(input.targetPath ? { targetPath: input.targetPath } : {})
    });
    const harvestResult = await harvestSourceChanges(this.context, baseline);

    if (harvestResult.summary.status !== "changed") {
      return {
        artifactId: input.artifactRef.artifactId,
        message:
          harvestResult.summary.failureReason ??
          `Artifact source-change proposal copied ${copyResult.copiedFiles} files to '${copyResult.targetPath}', but no source change was detected.`,
        sourceChangeStatus: harvestResult.summary.status
      };
    }

    const timestamp = nowIsoString();
    const candidateId = buildArtifactSourceProposalCandidateId({
      artifactId: input.artifactRef.artifactId,
      ...(input.proposalId ? { proposalId: input.proposalId } : {})
    });
    const turnRecord: RunnerTurnRecord = {
      consumedArtifactIds: [input.artifactRef.artifactId],
      emittedHandoffMessageIds: [],
      graphId: this.context.binding.graphId,
      nodeId: this.context.binding.node.nodeId,
      phase: "blocked",
      producedArtifactIds: [],
      requestedApprovalIds: [],
      sourceChangeCandidateIds: [candidateId],
      sourceChangeSummary: harvestResult.summary,
      startedAt: input.requestedAt ?? timestamp,
      triggerKind: "operator",
      turnId: candidateId,
      updatedAt: timestamp
    };
    const candidate = sourceChangeCandidateRecordSchema.parse({
      candidateId,
      ...(input.artifactRef.conversationId
        ? { conversationId: input.artifactRef.conversationId }
        : {}),
      createdAt: timestamp,
      graphId: this.context.binding.graphId,
      nodeId: this.context.binding.node.nodeId,
      ...(input.artifactRef.sessionId
        ? { sessionId: input.artifactRef.sessionId }
        : {}),
      ...(harvestResult.snapshot ? { snapshot: harvestResult.snapshot } : {}),
      sourceChangeSummary: harvestResult.summary,
      status: "pending_review",
      turnId: turnRecord.turnId,
      updatedAt: timestamp
    });

    await writeRunnerTurnRecord(statePaths, turnRecord);
    await writeSourceChangeCandidateRecord(statePaths, candidate);
    await this.publishSourceChangeRefObservation(candidate, [input.artifactRef]);

    return {
      artifactId: input.artifactRef.artifactId,
      candidateId,
      sourceChangeStatus: harvestResult.summary.status
    };
  }

  async requestWikiRepositoryPublication(input: {
    reason?: string;
    requestedAt?: string;
    requestedBy?: string;
    retryFailedPublication?: boolean;
    target?: GitRepositoryTargetSelector;
  }): Promise<RunnerWikiPublicationCommandResult> {
    const statePaths =
      this.statePaths ??
      (await ensureRunnerStatePaths(this.context.workspace.runtimeRoot));
    this.statePaths = statePaths;
    const publication = await publishWikiRepositoryToGitTarget({
      context: this.context,
      ...(input.reason ? { reason: input.reason } : {}),
      requestedAt: input.requestedAt ?? new Date().toISOString(),
      ...(input.requestedBy ? { requestedBy: input.requestedBy } : {}),
      retryFailedPublication: input.retryFailedPublication ?? false,
      statePaths,
      ...(input.target ? { target: input.target } : {})
    });

    if (!publication.published) {
      return {
        ...(publication.artifact?.ref.artifactId
          ? { artifactId: publication.artifact.ref.artifactId }
          : {}),
        message: publication.reason,
        publicationState: publication.artifact?.publication?.state ?? "failed"
      };
    }

    await this.publishArtifactRefObservation(publication.artifact);

    return {
      artifactId: publication.artifact.ref.artifactId,
      publicationState: publication.artifact.publication?.state ?? "published"
    };
  }

  async requestWikiPageUpsert(input: {
    commandId?: string;
    content: string;
    expectedCurrentSha256?: string;
    mode?: "append" | "patch" | "replace";
    path: string;
    reason?: string;
    requestedAt?: string;
    requestedBy?: string;
  }): Promise<RunnerWikiPageUpsertCommandResult> {
    const statePaths =
      this.statePaths ??
      (await ensureRunnerStatePaths(this.context.workspace.runtimeRoot));
    this.statePaths = statePaths;
    const relativePath = resolveWikiPageRelativePath(input.path);
    const absolutePath = resolveWikiPageAbsolutePath({
      context: this.context,
      relativePath
    });
    const wikiRoot = path.join(this.context.workspace.memoryRoot, "wiki");
    const indexPath = path.join(wikiRoot, "index.md");
    const mode = input.mode ?? "replace";
    const currentContent = await readTextFileOrDefault(absolutePath, "");
    const previousSha256 = hashWikiPageContent(currentContent);

    if (
      input.expectedCurrentSha256 &&
      input.expectedCurrentSha256 !== previousSha256
    ) {
      return {
        expectedCurrentSha256: input.expectedCurrentSha256,
        message:
          `Wiki page '${relativePath}' was not updated because its current ` +
          "SHA-256 does not match the requested base.",
        path: relativePath,
        previousSha256,
        syncStatus: "conflict"
      };
    }

    const nextContent =
      mode === "append"
        ? [currentContent.trimEnd(), input.content.trimEnd()]
            .filter((part) => part.length > 0)
            .join("\n\n") + "\n"
        : mode === "patch"
          ? applyWikiPageUnifiedPatch({
              currentContent,
              patchContent: input.content
            })
          : `${input.content.trimEnd()}\n`;
    const nextSha256 = hashWikiPageContent(nextContent);
    await writeTextFile(absolutePath, nextContent);

    const currentIndex = await readTextFileOrDefault(indexPath, "# Wiki Index\n");
    await writeTextFile(
      indexPath,
      appendSectionBullet(
        currentIndex,
        "Managed Pages",
        `- [${relativePath}](${relativePath})`
      )
    );

    const sync = await syncWikiRepository(this.context, {
      turnId: input.commandId ?? `wiki-page-${relativePath}`
    });

    if (sync.status === "committed" || sync.status === "unchanged") {
      const artifactRef: ArtifactRef = {
        artifactId: buildWikiPageArtifactId({
          ...(input.commandId ? { commandId: input.commandId } : {}),
          nodeId: this.context.binding.node.nodeId,
          relativePath
        }),
        artifactKind: "knowledge_summary",
        backend: "wiki",
        contentSummary:
          `Wiki page '${relativePath}' ${describeWikiPageMutationMode(mode)}.`,
        createdByNodeId: this.context.binding.node.nodeId,
        locator: {
          nodeId: this.context.binding.node.nodeId,
          path: `/${relativePath}`
        },
        preferred: false,
        status: "materialized"
      };
      await this.publishWikiRefObservation(
        artifactRef,
        sync.syncedAt,
        await readWikiPagePreview({ absolutePath })
      );
    }

    return {
      ...(input.expectedCurrentSha256
        ? { expectedCurrentSha256: input.expectedCurrentSha256 }
        : {}),
      ...(sync.status === "failed" || sync.status === "not_configured"
        ? { message: sync.reason }
        : {
            message:
              `Wiki page '${relativePath}' ${describeWikiPageMutationMode(mode)} and repository sync ${sync.status}.`
          }),
      nextSha256,
      path: relativePath,
      previousSha256,
      syncStatus: sync.status
    };
  }

  async requestWikiPatchSet(input: {
    commandId?: string;
    pages: RunnerWikiPatchSetPageInput[];
    reason?: string;
    requestedAt?: string;
    requestedBy?: string;
  }): Promise<RunnerWikiPatchSetCommandResult> {
    const statePaths =
      this.statePaths ??
      (await ensureRunnerStatePaths(this.context.workspace.runtimeRoot));
    this.statePaths = statePaths;
    const wikiRoot = path.join(this.context.workspace.memoryRoot, "wiki");
    const indexPath = path.join(wikiRoot, "index.md");
    const seenPaths = new Set<string>();
    const plannedPages: Array<{
      absolutePath: string;
      expectedCurrentSha256?: string;
      mode: "append" | "patch" | "replace";
      nextContent: string;
      nextSha256: string;
      previousSha256: string;
      relativePath: string;
    }> = [];

    for (const page of input.pages) {
      const relativePath = resolveWikiPageRelativePath(page.path);
      if (seenPaths.has(relativePath)) {
        throw new Error(
          `Wiki patch-set contains duplicate page path '${relativePath}'.`
        );
      }
      seenPaths.add(relativePath);

      const absolutePath = resolveWikiPageAbsolutePath({
        context: this.context,
        relativePath
      });
      const mode = page.mode ?? "replace";
      const currentContent = await readTextFileOrDefault(absolutePath, "");
      const previousSha256 = hashWikiPageContent(currentContent);
      const resultPage: RunnerWikiPatchSetPageResult = {
        ...(page.expectedCurrentSha256
          ? { expectedCurrentSha256: page.expectedCurrentSha256 }
          : {}),
        mode,
        path: relativePath,
        previousSha256
      };

      if (
        page.expectedCurrentSha256 &&
        page.expectedCurrentSha256 !== previousSha256
      ) {
        return {
          message:
            `Wiki patch-set was not applied because page '${relativePath}' ` +
            "does not match the requested base SHA-256.",
          pageCount: input.pages.length,
          pages: [...plannedPages.map((planned) => ({
            ...(planned.expectedCurrentSha256
              ? { expectedCurrentSha256: planned.expectedCurrentSha256 }
              : {}),
            mode: planned.mode,
            nextSha256: planned.nextSha256,
            path: planned.relativePath,
            previousSha256: planned.previousSha256
          })), resultPage],
          syncStatus: "conflict"
        };
      }

      const nextContent =
        mode === "append"
          ? [currentContent.trimEnd(), page.content.trimEnd()]
              .filter((part) => part.length > 0)
              .join("\n\n") + "\n"
          : mode === "patch"
            ? applyWikiPageUnifiedPatch({
                currentContent,
                patchContent: page.content
              })
            : `${page.content.trimEnd()}\n`;
      const nextSha256 = hashWikiPageContent(nextContent);

      plannedPages.push({
        absolutePath,
        ...(page.expectedCurrentSha256
          ? { expectedCurrentSha256: page.expectedCurrentSha256 }
          : {}),
        mode,
        nextContent,
        nextSha256,
        previousSha256,
        relativePath
      });
    }

    await Promise.all(
      plannedPages.map((page) => writeTextFile(page.absolutePath, page.nextContent))
    );

    const currentIndex = await readTextFileOrDefault(indexPath, "# Wiki Index\n");
    const nextIndex = plannedPages.reduce(
      (index, page) =>
        appendSectionBullet(
          index,
          "Managed Pages",
          `- [${page.relativePath}](${page.relativePath})`
        ),
      currentIndex
    );
    await writeTextFile(indexPath, nextIndex);

    const sync = await syncWikiRepository(this.context, {
      turnId: input.commandId ?? "wiki-patch-set"
    });

    if (sync.status === "committed" || sync.status === "unchanged") {
      await Promise.all(
        plannedPages.map(async (page) => {
          const artifactRef: ArtifactRef = {
            artifactId: buildWikiPageArtifactId({
              nodeId: this.context.binding.node.nodeId,
              relativePath: page.relativePath
            }),
            artifactKind: "knowledge_summary",
            backend: "wiki",
            contentSummary:
              `Wiki page '${page.relativePath}' updated by patch-set.`,
            createdByNodeId: this.context.binding.node.nodeId,
            locator: {
              nodeId: this.context.binding.node.nodeId,
              path: `/${page.relativePath}`
            },
            preferred: false,
            status: "materialized"
          };
          await this.publishWikiRefObservation(
            artifactRef,
            sync.syncedAt,
            await readWikiPagePreview({ absolutePath: page.absolutePath })
          );
        })
      );
    }

    return {
      ...(sync.status === "failed" || sync.status === "not_configured"
        ? { message: sync.reason }
        : {
            message:
              `Wiki patch-set updated ${plannedPages.length} pages and repository sync ${sync.status}.`
          }),
      pageCount: plannedPages.length,
      pages: plannedPages.map((page) => ({
        ...(page.expectedCurrentSha256
          ? { expectedCurrentSha256: page.expectedCurrentSha256 }
          : {}),
        mode: page.mode,
        nextSha256: page.nextSha256,
        path: page.relativePath,
        previousSha256: page.previousSha256
      })),
      syncStatus: sync.status
    };
  }

  async requestSourceHistoryReplay(input: {
    approvalId?: string;
    reason?: string;
    replayedAt?: string;
    replayedBy?: string;
    replayId?: string;
    sourceHistoryId: string;
  }): Promise<RunnerSourceHistoryReplayCommandResult> {
    const statePaths =
      this.statePaths ??
      (await ensureRunnerStatePaths(this.context.workspace.runtimeRoot));
    this.statePaths = statePaths;
    const history = await readSourceHistoryRecord(
      statePaths,
      input.sourceHistoryId
    );

    if (!history) {
      throw new Error(
        `Source history '${input.sourceHistoryId}' was not found for runtime '${this.context.binding.node.nodeId}'.`
      );
    }

    if (history.nodeId !== this.context.binding.node.nodeId) {
      throw new Error(
        `Source history '${input.sourceHistoryId}' belongs to node '${history.nodeId}', not '${this.context.binding.node.nodeId}'.`
      );
    }

    await this.assertSourceHistoryReplayApproval({
      ...(input.approvalId ? { approvalId: input.approvalId } : {}),
      history,
      statePaths
    });

    const replay = await replaySourceHistoryToWorkspace({
      ...(input.approvalId ? { approvalId: input.approvalId } : {}),
      context: this.context,
      history,
      ...(input.reason ? { reason: input.reason } : {}),
      replayedAt: input.replayedAt ?? new Date().toISOString(),
      ...(input.replayedBy ? { replayedBy: input.replayedBy } : {}),
      ...(input.replayId ? { replayId: input.replayId } : {}),
      statePaths
    });

    await this.publishSourceHistoryReplayObservation(replay.replay);

    return {
      ...(replay.replayed ? {} : { message: replay.reason }),
      replayId: replay.replay.replayId,
      replayStatus: replay.replay.status,
      sourceHistoryId: replay.replay.sourceHistoryId
    };
  }

  async requestSourceHistoryReconcile(input: {
    approvalId?: string;
    reason?: string;
    replayedAt?: string;
    replayedBy?: string;
    replayId?: string;
    sourceHistoryId: string;
  }): Promise<RunnerSourceHistoryReplayCommandResult> {
    const statePaths =
      this.statePaths ??
      (await ensureRunnerStatePaths(this.context.workspace.runtimeRoot));
    this.statePaths = statePaths;
    const history = await readSourceHistoryRecord(
      statePaths,
      input.sourceHistoryId
    );

    if (!history) {
      throw new Error(
        `Source history '${input.sourceHistoryId}' was not found for runtime '${this.context.binding.node.nodeId}'.`
      );
    }

    if (history.nodeId !== this.context.binding.node.nodeId) {
      throw new Error(
        `Source history '${input.sourceHistoryId}' belongs to node '${history.nodeId}', not '${this.context.binding.node.nodeId}'.`
      );
    }

    await this.assertSourceHistoryReplayApproval({
      ...(input.approvalId ? { approvalId: input.approvalId } : {}),
      history,
      statePaths
    });

    const replay = await reconcileSourceHistoryToWorkspace({
      ...(input.approvalId ? { approvalId: input.approvalId } : {}),
      context: this.context,
      history,
      ...(input.reason ? { reason: input.reason } : {}),
      replayedAt: input.replayedAt ?? new Date().toISOString(),
      ...(input.replayedBy ? { replayedBy: input.replayedBy } : {}),
      ...(input.replayId ? { replayId: input.replayId } : {}),
      statePaths
    });

    await this.publishSourceHistoryReplayObservation(replay.replay);

    return {
      ...(replay.replayed ? {} : { message: replay.reason }),
      replayId: replay.replay.replayId,
      replayStatus: replay.replay.status,
      sourceHistoryId: replay.replay.sourceHistoryId
    };
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
    const publishAndReturn = async (
      session: SessionRecord
    ): Promise<SessionRecord> => {
      await this.publishSessionObservation(session);
      return session;
    };
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
        return publishAndReturn(
          await completeSession(input.statePaths, activeSession, {
            lastMessageId: input.lastMessageId,
            lastMessageType: input.lastMessageType
          })
        );
      }

      return publishAndReturn(activeSession);
    }

    if (activeConversationIds.length > 0 || currentSession.status !== "active") {
      return publishAndReturn(
        await transitionSessionStatus(
          input.statePaths,
          currentSession,
          currentSession.status,
          {
            lastMessageId: input.lastMessageId,
            lastMessageType: input.lastMessageType
          }
        )
      );
    }

    if (currentSession.waitingApprovalIds.length > 0) {
      return publishAndReturn(
        await transitionSessionStatus(
          input.statePaths,
          currentSession,
          "waiting_approval",
          {
            lastMessageId: input.lastMessageId,
            lastMessageType: input.lastMessageType
          }
        )
      );
    }

    return publishAndReturn(
      await completeSession(input.statePaths, currentSession, {
        lastMessageId: input.lastMessageId,
        lastMessageType: input.lastMessageType
      })
    );
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
        initiator: "self",
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

      const nextConversation = {
        ...latestConversation,
        lastMessageType: latestConversation.lastInboundMessageId
          ? latestConversation.lastMessageType
          : message.messageType,
        lastOutboundMessageId: publishedEnvelope.eventId,
        updatedAt: latestConversation.lastInboundMessageId
          ? latestConversation.updatedAt
          : publishedEnvelope.receivedAt
      };
      await writeConversationRecord(input.statePaths, nextConversation);
      await this.publishConversationObservation(nextConversation);
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
    let nextApprovalRecord: ApprovalRecord | undefined;

    if (!existingApproval || existingApproval.status === "pending") {
      nextApprovalRecord = {
        approvalId: approval.approvalId,
        approverNodeIds: existingApproval
          ? mergeIdentifierLists(existingApproval.approverNodeIds, approverNodeIds)
          : approverNodeIds,
        conversationId: input.envelope.message.conversationId,
        graphId: input.envelope.message.graphId,
        ...(approval.operation ? { operation: approval.operation } : {}),
        reason: approval.reason ?? input.envelope.message.work.summary,
        requestEventId:
          existingApproval?.requestEventId ?? input.envelope.eventId,
        requestSignerPubkey:
          existingApproval?.requestSignerPubkey ??
          resolveEnvelopeSignerPubkey(input.envelope),
        requestedAt: existingApproval?.requestedAt ?? input.envelope.receivedAt,
        requestedByNodeId: input.envelope.message.fromNodeId,
        ...(approval.resource ? { resource: approval.resource } : {}),
        sessionId: input.envelope.message.sessionId,
        sourceMessageId:
          existingApproval?.sourceMessageId ??
          input.envelope.message.parentMessageId ??
          input.envelope.eventId,
        status: "pending",
        updatedAt: input.envelope.receivedAt
      };
      await writeApprovalRecord(input.statePaths, nextApprovalRecord);
      await this.publishApprovalObservation(nextApprovalRecord);
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
    await this.publishSessionObservation(nextSession);
    await this.publishConversationObservation(nextConversation);

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

    if (!approvalRecord.approverNodeIds.includes(input.envelope.message.fromNodeId)) {
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
        responseEventId: input.envelope.eventId,
        responseSignerPubkey: resolveEnvelopeSignerPubkey(input.envelope),
        updatedAt: input.envelope.receivedAt
      }
    );

    if (nextApprovalRecord.status !== nextApprovalStatus) {
      return {
        conversation: input.conversation,
        session: input.session
      };
    }

    await this.publishApprovalObservation(nextApprovalRecord);

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
      await this.publishConversationObservation(nextConversation);
      await this.publishSessionObservation(failedSession);

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
    await this.publishConversationObservation(nextConversation);

    return {
      conversation: nextConversation,
      session: nextSession
    };
  }

  private async handleSourceChangeReviewEnvelope(input: {
    conversation: ConversationRecord;
    envelope: RunnerInboundEnvelope;
    session: SessionRecord;
    statePaths: RunnerStatePaths;
  }): Promise<{
    conversation: ConversationRecord;
    session: SessionRecord;
  }> {
    const metadata = entangleA2ASourceChangeReviewMetadataSchema.safeParse(
      input.envelope.message.work.metadata
    );

    if (!metadata.success) {
      return {
        conversation: input.conversation,
        session: input.session
      };
    }

    const { sourceChangeReview } = metadata.data;
    const candidate = await readSourceChangeCandidateRecord(
      input.statePaths,
      sourceChangeReview.candidateId
    );

    if (!candidate || candidate.status !== "pending_review") {
      return {
        conversation: input.conversation,
        session: input.session
      };
    }

    const reviewedCandidate: SourceChangeCandidateRecord = {
      ...candidate,
      review: {
        decidedAt: input.envelope.receivedAt,
        decidedBy: input.envelope.message.fromNodeId,
        decision: sourceChangeReview.decision,
        ...(sourceChangeReview.reason
          ? { reason: sourceChangeReview.reason }
          : {})
      },
      status: sourceChangeReview.decision,
      updatedAt: input.envelope.receivedAt
    };

    let nextCandidate = reviewedCandidate;

    if (reviewedCandidate.status === "accepted") {
      const application = await applyAcceptedSourceChangeCandidate({
        appliedAt: input.envelope.receivedAt,
        appliedBy: input.envelope.message.fromNodeId,
        candidate: reviewedCandidate,
        context: this.context,
        reason: sourceChangeReview.reason,
        statePaths: input.statePaths
      });

      if (application.applied) {
        nextCandidate = application.candidate;
        let sourceHistory = application.history;
        const publication = await publishSourceHistoryToGitTarget({
          context: this.context,
          history: sourceHistory,
          requestedAt: input.envelope.receivedAt,
          statePaths: input.statePaths
        });

        if (publication.published) {
          sourceHistory = publication.history;
          await this.publishArtifactRefObservation(publication.artifact);
        }

        await this.publishSourceHistoryRefObservation(sourceHistory);
      } else {
        await writeSourceChangeCandidateRecord(
          input.statePaths,
          reviewedCandidate
        );
      }
    } else {
      await writeSourceChangeCandidateRecord(input.statePaths, reviewedCandidate);
    }

    await this.publishSourceChangeRefObservation(nextCandidate);

    return {
      conversation: input.conversation,
      session: input.session
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

    if (envelope.message.messageType === "source_change.review") {
      const metadata = entangleA2ASourceChangeReviewMetadataSchema.safeParse(
        envelope.message.work.metadata
      );
      const [candidateRecord, conversationRecord, sessionRecord] =
        await Promise.all([
          metadata.success
            ? readSourceChangeCandidateRecord(
                statePaths,
                metadata.data.sourceChangeReview.candidateId
              )
            : undefined,
          readConversationRecord(statePaths, envelope.message.conversationId),
          readSessionRecord(statePaths, envelope.message.sessionId)
        ]);

      if (!candidateRecord && !conversationRecord && !sessionRecord) {
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
    await this.publishSessionObservation(currentSession);

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
    await this.publishConversationObservation(currentConversation);

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
    } else if (envelope.message.messageType === "source_change.review") {
      await this.handleSourceChangeReviewEnvelope({
        conversation: currentConversation,
        envelope,
        session: currentSession,
        statePaths
      });
    } else if (envelope.message.messageType === "task.result") {
      let nextConversation: ConversationRecord;
      if (envelope.message.responsePolicy.closeOnResult) {
        nextConversation = await this.transitionConversationToClosed({
          conversation: currentConversation,
          lastInboundMessageId: envelope.eventId,
          lastMessageType: envelope.message.messageType,
          statePaths
        });
      } else {
        nextConversation = await this.transitionConversationToResolved({
          conversation: currentConversation,
          lastInboundMessageId: envelope.eventId,
          lastMessageType: envelope.message.messageType,
          statePaths
        });
      }
      await this.publishConversationObservation(nextConversation);

      await this.completeSessionIfNoOpenConversations({
        lastMessageId: envelope.eventId,
        lastMessageType: envelope.message.messageType,
        session: currentSession,
        statePaths
      });
    } else if (envelope.message.messageType === "conversation.close") {
      const nextConversation = await this.transitionConversationToClosed({
        conversation: currentConversation,
        lastInboundMessageId: envelope.eventId,
        lastMessageType: envelope.message.messageType,
        statePaths
      });
      await this.publishConversationObservation(nextConversation);
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
        turnRecord: input.turnRecord,
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

  private async syncWikiRepositoryForTurn(input: {
    statePaths: RunnerStatePaths;
    turnRecord: RunnerTurnRecord;
  }): Promise<RunnerTurnRecord> {
    const memoryRepositorySyncOutcome = await syncWikiRepository(this.context, {
      turnId: input.turnRecord.turnId
    });
    const nextTurnRecord: RunnerTurnRecord = {
      ...input.turnRecord,
      memoryRepositorySyncOutcome,
      updatedAt: nowIsoString()
    };

    await writeRunnerTurnRecord(input.statePaths, nextTurnRecord);
    await this.publishTurnObservation(nextTurnRecord);
    const wikiArtifactRef = buildWikiArtifactRefForTurn({
      context: this.context,
      turnRecord: nextTurnRecord
    });

    if (wikiArtifactRef) {
      const wikiPreview = await readWikiRepositoryPreview(this.context);
      await this.publishWikiRefObservation(
        wikiArtifactRef,
        memoryRepositorySyncOutcome.syncedAt,
        wikiPreview
      );
    }

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

    if (hasEnvelopeSignerMismatch(envelope)) {
      return {
        handled: false,
        reason: "signer_mismatch"
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
      requestedApprovalIds: [],
      sessionId: envelope.message.sessionId,
      sourceChangeCandidateIds: [],
      startedAt: envelope.receivedAt,
      triggerKind: "message",
      turnId: buildSyntheticTurnId("turn"),
      updatedAt: envelope.receivedAt
    };
    await writeRunnerTurnRecord(statePaths, turnRecord);
    await this.publishTurnObservation(turnRecord);
    const cancellationController = new AbortController();
    const stopTurnCancellationPolling = this.startCancellationPolling();
    this.activeSessionAbortControllers.set(
      envelope.message.sessionId,
      cancellationController
    );
    let currentSession: SessionRecord | undefined;
    let currentConversation: ConversationRecord | undefined;

    try {
      turnRecord = await this.writeRunnerPhase(
        statePaths,
        turnRecord,
        "validating"
      );

      const sessionRecord =
        (await readSessionRecord(statePaths, envelope.message.sessionId)) ??
        buildInitialSessionRecord(this.context, envelope);
      await writeSessionRecord(statePaths, sessionRecord);
      currentSession = sessionRecord;
      if (sessionRecord.status === "cancelled") {
        throw buildSessionCancellationExecutionError({
          context: this.context,
          sessionId: sessionRecord.sessionId
        });
      }

      currentSession = await advanceSessionToProcessing(statePaths, sessionRecord, {
        lastMessageId: envelope.eventId,
        lastMessageType: envelope.message.messageType
      });
      await this.publishSessionObservation(currentSession);
      await this.applyExternalCancellationRequests();
      const earlyCancellationRequest = resolveCancellationRequestFromAbortSignal(
        cancellationController.signal
      );
      if (cancellationController.signal.aborted) {
        throw buildSessionCancellationExecutionError({
          context: this.context,
          ...(earlyCancellationRequest
            ? { request: earlyCancellationRequest }
            : {}),
          sessionId: envelope.message.sessionId
        });
      }

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
      await this.publishConversationObservation(currentConversation);

      turnRecord = await this.writeRunnerPhase(
        statePaths,
        turnRecord,
        "contextualizing"
      );
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
          await this.publishArtifactRefObservations(error.artifactRecords);
        }

        throw error;
      }

      await Promise.all(
        retrievedArtifacts.artifacts.map((artifactRecord) =>
          writeArtifactRecord(statePaths, artifactRecord)
        )
      );
      await this.publishArtifactRefObservations(retrievedArtifacts.artifacts);
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
      const engineRequestSummaryGeneratedAt = nowIsoString();
      turnRecord = {
        ...turnRecord,
        engineRequestSummary: summarizeAgentEngineTurnRequest(turnRequest, {
          generatedAt: engineRequestSummaryGeneratedAt
        }),
        updatedAt: engineRequestSummaryGeneratedAt
      };
      await writeRunnerTurnRecord(statePaths, turnRecord);
      turnRecord = await this.writeRunnerPhase(statePaths, turnRecord, "reasoning");
      turnRecord = await this.writeRunnerPhase(statePaths, turnRecord, "acting");
      const sourceChangeBaseline = await prepareSourceChangeHarvest(this.context);
      let result: AgentEngineTurnResult | undefined;
      let handoffPlans: ResolvedHandoffPlan[] = [];
      let enginePermissionApprovalSequence = 0;

      try {
        result = parseEngineTurnResult(
          await this.engine.executeTurn(turnRequest, {
            abortSignal: cancellationController.signal,
            requestPermission: (permission) => {
              enginePermissionApprovalSequence += 1;
              return this.requestEnginePermissionApproval({
                abortSignal: cancellationController.signal,
                envelope,
                permission,
                sequence: enginePermissionApprovalSequence,
                statePaths,
                turnId: turnRecord.turnId
              });
            }
          })
        );
        handoffPlans = resolveHandoffPlans(this.context, result.handoffDirectives);
      } catch (error) {
        const sourceChangeHarvestResult = await harvestSourceChanges(
          this.context,
          sourceChangeBaseline
        );
        const sourceChangeCandidate = buildSourceChangeCandidateRecord({
          harvestResult: sourceChangeHarvestResult,
          turnRecord
        });
        if (sourceChangeCandidate) {
          await writeSourceChangeCandidateRecord(statePaths, sourceChangeCandidate);
          await this.publishSourceChangeRefObservation(sourceChangeCandidate);
        }
        turnRecord = {
          ...turnRecord,
          engineOutcome: buildFailedEngineTurnOutcome(
            this.context,
            error,
            result
          ),
          ...(sourceChangeCandidate
            ? { sourceChangeCandidateIds: [sourceChangeCandidate.candidateId] }
            : {}),
          sourceChangeSummary: sourceChangeHarvestResult.summary,
          updatedAt: nowIsoString()
        };
        await writeRunnerTurnRecord(statePaths, turnRecord);
        throw error;
      }

      if (!result) {
        throw new AgentEngineExecutionError(
          `Engine for node '${this.context.binding.node.nodeId}' did not return a turn result.`,
          {
            classification: "unknown_provider_error"
          }
        );
      }

      const sourceChangeHarvestResult = await harvestSourceChanges(
        this.context,
        sourceChangeBaseline
      );
      const sourceChangeCandidate = buildSourceChangeCandidateRecord({
        harvestResult: sourceChangeHarvestResult,
        turnRecord
      });
      if (sourceChangeCandidate) {
        await writeSourceChangeCandidateRecord(statePaths, sourceChangeCandidate);
        await this.publishSourceChangeRefObservation(sourceChangeCandidate);
      }
      turnRecord = {
        ...turnRecord,
        engineOutcome: buildEngineTurnOutcome(result, this.context),
        ...(sourceChangeCandidate
          ? { sourceChangeCandidateIds: [sourceChangeCandidate.candidateId] }
          : {}),
        sourceChangeSummary: sourceChangeHarvestResult.summary,
        updatedAt: nowIsoString()
      };
      await writeRunnerTurnRecord(statePaths, turnRecord);
      turnRecord = await this.writeRunnerPhase(statePaths, turnRecord, "persisting");
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
      await this.publishArtifactRefObservations(materializedArtifacts.artifacts);
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
      const materializedApprovalRequests =
        result.approvalRequestDirectives.length > 0
          ? await materializeEngineApprovalRequests({
              context: this.context,
              directives: result.approvalRequestDirectives,
              envelope,
              statePaths,
              turnId: turnRecord.turnId
            })
          : {
              approvalRecords: [],
              waitingApprovalIds: []
            };

      if (materializedApprovalRequests.approvalRecords.length > 0) {
        turnRecord = {
          ...turnRecord,
          requestedApprovalIds: materializedApprovalRequests.approvalRecords.map(
            (approvalRecord) => approvalRecord.approvalId
          ),
          updatedAt: nowIsoString()
        };
        await writeRunnerTurnRecord(statePaths, turnRecord);
        await this.publishApprovalObservations(
          materializedApprovalRequests.approvalRecords
        );
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

      if (materializedApprovalRequests.waitingApprovalIds.length > 0) {
        currentSession = {
          ...currentSession,
          waitingApprovalIds: mergeIdentifierLists(
            currentSession.waitingApprovalIds,
            materializedApprovalRequests.waitingApprovalIds
          )
        };
        await writeSessionRecord(statePaths, currentSession);
        currentSession = isAllowedSessionLifecycleTransition(
          currentSession.status,
          "waiting_approval"
        )
          ? await transitionSessionStatus(
              statePaths,
              currentSession,
              "waiting_approval",
              {
                lastMessageId: envelope.eventId,
                lastMessageType: envelope.message.messageType
              }
            )
          : currentSession;
        await this.publishSessionObservation(currentSession);
        currentConversation = await this.transitionConversationToAwaitingApproval({
          conversation: currentConversation,
          lastInboundMessageId: envelope.eventId,
          lastMessageType: envelope.message.messageType,
          statePaths
        });
        await this.publishConversationObservation(currentConversation);
        turnRecord = await this.writeRunnerPhase(statePaths, turnRecord, "blocked");
        turnRecord = await this.runOptionalMemorySynthesis({
          ...memorySynthesisInput,
          turnRecord
        });
        turnRecord = await this.syncWikiRepositoryForTurn({
          statePaths,
          turnRecord
        });

        return {
          handled: true,
          handoffs: [],
          response: undefined
        };
      }

      let publishedHandoffs: RunnerPublishedEnvelope[] = [];

      if (handoffPlans.length > 0) {
        turnRecord = await this.writeRunnerPhase(statePaths, turnRecord, "emitting");
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
        await this.publishSessionObservation(currentSession);
        turnRecord = {
          ...turnRecord,
          emittedHandoffMessageIds: publishedHandoffs.map(
            (publishedEnvelope) => publishedEnvelope.eventId
          ),
          updatedAt: nowIsoString()
        };
        await writeRunnerTurnRecord(statePaths, turnRecord);
      }

      currentConversation = await transitionConversationStatus(
        statePaths,
        currentConversation,
        "resolved",
        {
          lastInboundMessageId: envelope.eventId,
          lastMessageType: envelope.message.messageType
        }
      );
      await this.publishConversationObservation(currentConversation);
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
          await this.publishConversationObservation(currentConversation);
        }

        turnRecord = await this.runOptionalMemorySynthesis({
          ...memorySynthesisInput,
          turnRecord
        });
        turnRecord = await this.syncWikiRepositoryForTurn({
          statePaths,
          turnRecord
        });

        return {
          handled: true,
          handoffs: publishedHandoffs,
          response: undefined
        };
      }

      turnRecord = await this.writeRunnerPhase(statePaths, turnRecord, "emitting");
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
      await this.publishConversationObservation(currentConversation);
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
      turnRecord = await this.runOptionalMemorySynthesis({
        ...memorySynthesisInput,
        turnRecord
      });
      turnRecord = await this.syncWikiRepositoryForTurn({
        statePaths,
        turnRecord
      });

      return {
        handled: true,
        handoffs: publishedHandoffs,
        response: publishedEnvelope
      };
    } catch (error: unknown) {
      const cancellationRequest = resolveCancellationRequestFromAbortSignal(
        cancellationController.signal
      );
      const isCancellation =
        isSessionCancellationExecutionError(error) ||
        cancellationController.signal.aborted;

      if (isCancellation) {
        if (!turnRecord.engineOutcome) {
          turnRecord = {
            ...turnRecord,
            engineOutcome: buildFailedEngineTurnOutcome(
              this.context,
              isSessionCancellationExecutionError(error)
                ? error
                : buildSessionCancellationExecutionError({
                    context: this.context,
                    ...(cancellationRequest
                      ? { request: cancellationRequest }
                      : {}),
                    sessionId: envelope.message.sessionId
                  })
            ),
            updatedAt: nowIsoString()
          };
          await writeRunnerTurnRecord(statePaths, turnRecord);
        }

        turnRecord = await this.writeRunnerPhase(
          statePaths,
          turnRecord,
          "cancelled"
        );

        if (currentSession) {
          const cancelledSession = await cancelSessionForRequest({
            lastMessageId: envelope.eventId,
            lastMessageType: envelope.message.messageType,
            request:
              cancellationRequest ??
              sessionCancellationRequestRecordSchema.parse({
                cancellationId: buildSyntheticTurnId("session-cancel"),
                graphId: envelope.message.graphId,
                nodeId: this.context.binding.node.nodeId,
                requestedAt: nowIsoString(),
                sessionId: envelope.message.sessionId,
                status: "requested"
              }),
            session: currentSession,
            statePaths,
            turnId: turnRecord.turnId
          });
          await this.publishSessionObservation(cancelledSession);
        } else if (cancellationRequest) {
          await markSessionCancellationRequestObserved({
            record: cancellationRequest,
            statePaths,
            turnId: turnRecord.turnId
          });
        }

        return {
          handled: true,
          handoffs: [],
          response: undefined
        };
      }

      await this.writeRunnerPhase(statePaths, turnRecord, "errored");

      if (
        currentSession &&
        isAllowedSessionLifecycleTransition(currentSession.status, "failed")
      ) {
        const failedSession = await transitionSessionStatus(statePaths, currentSession, "failed", {
          lastMessageId: envelope.eventId,
          lastMessageType: envelope.message.messageType
        });
        await this.publishSessionObservation(failedSession);
      }

      throw error;
    } finally {
      stopTurnCancellationPolling();
      if (
        this.activeSessionAbortControllers.get(envelope.message.sessionId) ===
        cancellationController
      ) {
        this.activeSessionAbortControllers.delete(envelope.message.sessionId);
      }
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
    await this.applyExternalCancellationRequests();
    this.cancellationPollTimer = setInterval(() => {
      void this.applyExternalCancellationRequests();
    }, this.cancellationPollIntervalMs);
    this.cancellationPollTimer.unref?.();
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
    if (this.cancellationPollTimer) {
      clearInterval(this.cancellationPollTimer);
      this.cancellationPollTimer = undefined;
    }
    await this.subscription?.close();
    this.subscription = undefined;
    await this.transport.close();
  }
}
