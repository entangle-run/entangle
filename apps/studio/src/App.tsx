import {
  startTransition,
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useMemo,
  useState
} from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node
} from "@xyflow/react";
import {
  createHostClient,
  formatHostArtifactBackendCacheSummary,
  formatHostStateLayoutSummary,
  formatHostStatusSessionDiagnosticsSummary,
  formatHostTransportControlObserveSummary,
  formatHostTransportRelayDetail,
  formatRuntimeWorkspaceHealthSummary,
  formatRuntimeMemoryPageDetail,
  formatRuntimeMemoryPageLabel,
  sortRuntimeMemoryPagesForPresentation
} from "@entangle/host-client";
import type {
  ApprovalRecord,
  ArtifactRecord,
  CatalogInspectionResponse,
  ExternalPrincipalInspectionResponse,
  GraphInspectionResponse,
  GraphMutationResponse,
  GraphRevisionInspectionResponse,
  GraphRevisionMetadata,
  GraphSpec,
  HostEventRecord,
  HostProjectionSnapshot,
  SessionInspectionResponse,
  HostSessionSummary,
  HostStatusResponse,
  PackageSourceInspectionResponse,
  RuntimeApprovalInspectionResponse,
  RuntimeArtifactDiffResponse,
  RuntimeArtifactHistoryResponse,
  RuntimeArtifactInspectionResponse,
  RuntimeArtifactPreviewResponse,
  RuntimeInspectionResponse,
  RuntimeMemoryInspectionResponse,
  RuntimeMemoryPageInspectionResponse,
  RuntimeRecoveryInspectionResponse,
  RuntimeSourceChangeCandidateDiffResponse,
  RuntimeSourceChangeCandidateFilePreviewResponse,
  RuntimeSourceChangeCandidateInspectionResponse,
  RuntimeSourceHistoryInspectionResponse,
  RuntimeTurnInspectionResponse,
  RunnerTurnRecord,
  SessionCancellationResponse,
  SessionLaunchResponse,
  SourceChangeCandidateRecord,
  SourceHistoryRecord,
  UserNodeIdentityRecord
} from "@entangle/types";
import {
  buildEdgeCreateRequest,
  buildEdgeEditorDraft,
  buildEdgeReplacementRequest,
  createDefaultEdgeEditorDraft,
  createEmptyEdgeEditorDraft,
  edgeRelationOptions,
  formatGraphEdgeDetail,
  formatGraphEdgeLabel,
  isEdgeEditorDraftUninitialized,
  sortGraphEdges,
  type EdgeEditorDraft
} from "./graph-edge-mutation.js";
import {
  countValidationFindings,
  formatValidationFindingLine,
  summarizeValidationReport
} from "./graph-mutation-feedback.js";
import {
  buildManagedNodeCreateRequest,
  buildManagedNodeEditorDraft,
  buildManagedNodeReplacementRequest,
  createDefaultManagedNodeEditorDraft,
  createEmptyManagedNodeEditorDraft,
  formatManagedNodeDetail,
  formatManagedNodeLabel,
  isManagedNodeEditorDraftUninitialized,
  managedNodeAgentRuntimeModeOptions,
  managedNodeKindOptions,
  sortManagedGraphNodes,
  type ManagedNodeEditorDraft
} from "./graph-node-mutation.js";
import {
  buildPackageSourceAdmissionRequest,
  collectPackageSourceReferenceNodeIds,
  createEmptyPackageSourceAdmissionDraft,
  formatPackageSourceDetail,
  formatPackageSourceOptionLabel,
  formatPackageSourceReferenceSummary,
  sortPackageSourceInspections,
  type PackageSourceAdmissionDraft
} from "./package-source-admission.js";
import {
  collectExternalPrincipalReferenceNodeIds,
  formatExternalPrincipalDetail,
  formatExternalPrincipalLabel,
  formatExternalPrincipalReferenceSummary,
  sortExternalPrincipalInspections
} from "./external-principal-inspection.js";
import {
  shouldRefreshOverviewFromHostEvent,
  shouldRefreshSelectedRuntimeFromHostEvent
} from "./host-event-refresh.js";
import {
  formatGraphRevisionDetail,
  formatGraphRevisionInspectionSummary,
  formatGraphRevisionLabel,
  sortGraphRevisions
} from "./graph-revision-inspection.js";
import {
  buildGraphDiff,
  formatChangedGraphEdgeDiffLine,
  formatChangedGraphNodeDiffLine,
  formatGraphDiffIdentitySummary,
  formatGraphDiffTotals,
  formatGraphEdgeDiffLine,
  formatGraphNodeDiffLine
} from "./graph-diff-inspection.js";
import {
  buildRuntimeRecoveryPolicyMutationRequest,
  collectRuntimeRecoveryEvents,
  createRuntimeRecoveryPolicyDraft,
  deriveSelectedRuntimeId,
  describeRuntimeRecoveryController,
  describeRuntimeRecoveryPolicy,
  formatRuntimeRecoveryEventLabel,
  hasRuntimeRecoveryPolicyDraftChanged,
  isRuntimeRecoveryPolicyDraftValid,
  type RuntimeRecoveryPolicyDraft
} from "./recovery-inspection.js";
import {
  collectRuntimeTraceEvents,
  formatRuntimeTraceEventDetailLines,
  formatRuntimeTraceEventLabel
} from "./runtime-trace-inspection.js";
import {
  formatRuntimeApprovalDetailLines,
  formatRuntimeApprovalLabel,
  formatRuntimeApprovalStatus,
  sortRuntimeApprovals
} from "./runtime-approval-inspection.js";
import {
  formatRuntimeArtifactDetailLines,
  formatRuntimeArtifactDiffStatus,
  formatRuntimeArtifactHistoryLines,
  formatRuntimeArtifactHistoryStatus,
  formatRuntimeArtifactLabel,
  formatRuntimeArtifactLocator,
  formatRuntimeArtifactStatus,
  sortRuntimeArtifacts
} from "./runtime-artifact-inspection.js";
import {
  formatSourceChangeSummary,
  formatRuntimeTurnArtifactSummary,
  formatRuntimeTurnDetailLines,
  formatRuntimeTurnLabel,
  formatRuntimeTurnStatus,
  sortRuntimeTurns
} from "./runtime-turn-inspection.js";
import {
  formatRuntimeSourceChangeCandidateDetailLines,
  formatRuntimeSourceChangeCandidateDiffStatus,
  formatRuntimeSourceChangeCandidateFilePreviewStatus,
  formatRuntimeSourceChangeCandidateLabel,
  formatRuntimeSourceChangeCandidateStatus,
  sortRuntimeSourceChangeCandidates
} from "./runtime-source-change-candidate-inspection.js";
import {
  buildRuntimeSourceHistoryPublicationRequest,
  buildRuntimeSourceHistoryReplayRequest,
  createEmptyRuntimeSourceHistoryPublicationDraft,
  createEmptyRuntimeSourceHistoryReplayDraft,
  formatRuntimeSourceHistoryPublicationRequestSummary,
  formatRuntimeSourceHistoryReplayRequestSummary,
  formatRuntimeSourceHistoryDetailLines,
  formatRuntimeSourceHistoryLabel,
  sortRuntimeSourceHistory,
  type RuntimeSourceHistoryPublicationDraft,
  type RuntimeSourceHistoryReplayDraft
} from "./runtime-source-history-inspection.js";
import {
  buildRuntimeWikiPublicationRequest,
  createEmptyRuntimeWikiPublicationDraft,
  formatRuntimeWikiPublicationRequestSummary,
  type RuntimeWikiPublicationDraft
} from "./runtime-wiki-publication.js";
import {
  buildSessionLaunchRequest,
  createDefaultSessionLaunchDraft,
  isSessionLaunchDraftReady,
  type SessionLaunchDraft
} from "./session-launch.js";
import {
  buildUserNodeRuntimeSummaries,
  formatAssignmentReceiptDetail,
  formatAssignmentReceiptLabel,
  formatRuntimeProjectionDetail,
  formatRuntimeProjectionLabel,
  summarizeAssignmentReceiptsForStudio,
  formatUserConversationDetail,
  formatUserConversationLabel,
  formatUserNodeRuntimeSummaryDetail,
  formatUserNodeRuntimeSummaryLabel,
  sortRuntimeProjectionsForStudio,
  sortAssignmentReceiptsForStudio,
  sortUserConversationsForStudio,
  sortUserNodeIdentitiesForStudio,
  summarizeFederationProjection
} from "./federation-inspection.js";
import {
  buildRuntimeAssignmentNodeOptions,
  buildRuntimeAssignmentOfferRequest,
  buildRuntimeAssignmentRunnerOptions,
  canRevokeAssignmentProjection,
  createEmptyRuntimeAssignmentControlDraft,
  formatAssignmentProjectionDetail,
  formatAssignmentProjectionLabel,
  normalizeRuntimeAssignmentControlDraft,
  sortAssignmentProjectionsForStudio,
  type RuntimeAssignmentControlDraft
} from "./runtime-assignment-control.js";
import {
  collectSessionInspectionTraceIds,
  filterRuntimeSessions,
  formatSessionCancellationTargetSummary,
  formatSessionInspectionNodeDetail,
  formatSessionInspectionNodeLabel,
  formatRuntimeSessionDetail,
  formatRuntimeSessionLabel,
  listCancellableSessionNodeIds,
  sessionInspectionReferencesRuntime,
  sortSessionInspectionNodes
} from "./runtime-session-inspection.js";
import {
  canRestartRuntime,
  canStartRuntime,
  canStopRuntime,
  formatRuntimeLifecycleActionLabel,
  type RuntimeLifecycleAction
} from "./runtime-lifecycle-actions.js";

type FlowProjection = {
  edges: Edge[];
  nodes: Node<{ label: string }>[];
};

type EventStreamState = "connecting" | "live" | "closed" | "error";
type EdgeMutationAction = "create" | "delete" | "replace";
type NodeMutationAction = "create" | "delete" | "replace";

function normalizeError(
  caught: unknown,
  fallback: string
): string {
  return caught instanceof Error ? caught.message : fallback;
}

function computeNodeDepths(graph: GraphSpec): Map<string, number> {
  const adjacency = new Map<string, string[]>();
  const indegree = new Map<string, number>();

  for (const node of graph.nodes) {
    adjacency.set(node.nodeId, []);
    indegree.set(node.nodeId, 0);
  }

  for (const edge of graph.edges) {
    adjacency.get(edge.fromNodeId)?.push(edge.toNodeId);
    indegree.set(edge.toNodeId, (indegree.get(edge.toNodeId) ?? 0) + 1);
  }

  const queue = graph.nodes
    .filter((node) => node.nodeKind === "user" || (indegree.get(node.nodeId) ?? 0) === 0)
    .map((node) => node.nodeId);
  const depths = new Map<string, number>();

  for (const nodeId of queue) {
    depths.set(nodeId, 0);
  }

  while (queue.length > 0) {
    const nodeId = queue.shift();

    if (!nodeId) {
      continue;
    }

    const depth = depths.get(nodeId) ?? 0;

    for (const nextNodeId of adjacency.get(nodeId) ?? []) {
      const nextDepth = depth + 1;

      if ((depths.get(nextNodeId) ?? -1) < nextDepth) {
        depths.set(nextNodeId, nextDepth);
        queue.push(nextNodeId);
      }
    }
  }

  let spillDepth = Math.max(...Array.from(depths.values()), -1) + 1;

  for (const node of graph.nodes) {
    if (!depths.has(node.nodeId)) {
      depths.set(node.nodeId, spillDepth);
      spillDepth += 1;
    }
  }

  return depths;
}

function projectGraphToFlow(
  graph: GraphSpec | undefined,
  selectedRuntimeId: string | null,
  selectedEdgeId: string | null
): FlowProjection {
  if (!graph) {
    return {
      edges: [],
      nodes: []
    };
  }

  const depths = computeNodeDepths(graph);
  const nodesByDepth = new Map<number, string[]>();

  for (const node of graph.nodes) {
    const depth = depths.get(node.nodeId) ?? 0;
    const bucket = nodesByDepth.get(depth) ?? [];
    bucket.push(node.nodeId);
    nodesByDepth.set(depth, bucket);
  }

  const flowNodes: Node<{ label: string }>[] = [];

  for (const node of graph.nodes) {
    const depth = depths.get(node.nodeId) ?? 0;
    const bucket = nodesByDepth.get(depth) ?? [];
    const verticalIndex = bucket.indexOf(node.nodeId);

    flowNodes.push({
      data: {
        label: `${node.displayName}\n${node.nodeKind}`
      },
      id: node.nodeId,
      position: {
        x: 90 + depth * 280,
        y: 80 + verticalIndex * 150
      },
      selected: node.nodeId === selectedRuntimeId,
      type: node.nodeKind === "user" ? "input" : undefined
    });
  }

  const flowEdges: Edge[] = graph.edges.map((edge) => ({
    animated: edge.relation === "peer_collaborates_with",
    id: edge.edgeId,
    label: edge.relation,
    selected: edge.edgeId === selectedEdgeId,
    source: edge.fromNodeId,
    target: edge.toNodeId
  }));

  return {
    edges: flowEdges,
    nodes: flowNodes
  };
}

function formatRuntimeStateTone(
  runtime: RuntimeInspectionResponse | undefined
): string {
  if (!runtime) {
    return "pending";
  }

  if (
    runtime.observedState === "failed" ||
    runtime.reconciliation.findingCodes.includes("runtime_failed")
  ) {
    return "error";
  }

  if (runtime.reconciliation.state === "degraded" || runtime.observedState === "starting") {
    return "degraded";
  }

  if (runtime.observedState === "running") {
    return "healthy";
  }

  return "pending";
}

function formatRuntimeIdList(ids: string[] | undefined): string {
  return ids && ids.length > 0 ? ids.join(", ") : "none";
}

function formatEventStreamStateTone(state: EventStreamState): string {
  switch (state) {
    case "live":
      return "healthy";
    case "connecting":
      return "pending";
    case "closed":
      return "degraded";
    case "error":
      return "error";
  }
}

export function App() {
  const overviewRefreshTimeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(
    null
  );
  const selectedRuntimeRefreshTimeoutRef = useRef<
    ReturnType<typeof globalThis.setTimeout> | null
  >(null);
  const baseUrl =
    import.meta.env.VITE_ENTANGLE_HOST_URL ?? "http://localhost:7071";
  const authToken = import.meta.env.VITE_ENTANGLE_HOST_TOKEN?.trim();
  const client = useMemo(
    () =>
      createHostClient(
        authToken === undefined || authToken.length === 0
          ? { baseUrl }
          : { authToken, baseUrl }
      ),
    [authToken, baseUrl]
  );
  const [status, setStatus] = useState<HostStatusResponse | null>(null);
  const [projectionSnapshot, setProjectionSnapshot] =
    useState<HostProjectionSnapshot | null>(null);
  const [projectionError, setProjectionError] = useState<string | null>(null);
  const [userNodes, setUserNodes] = useState<UserNodeIdentityRecord[]>([]);
  const [userNodeError, setUserNodeError] = useState<string | null>(null);
  const [assignmentDraft, setAssignmentDraft] =
    useState<RuntimeAssignmentControlDraft>(
      createEmptyRuntimeAssignmentControlDraft
    );
  const [assignmentMutationError, setAssignmentMutationError] =
    useState<string | null>(null);
  const [lastAssignmentOfferSummary, setLastAssignmentOfferSummary] =
    useState<string | null>(null);
  const [pendingAssignmentOffer, setPendingAssignmentOffer] = useState(false);
  const [pendingAssignmentRevokeId, setPendingAssignmentRevokeId] =
    useState<string | null>(null);
  const [graphInspection, setGraphInspection] =
    useState<GraphInspectionResponse | null>(null);
  const [graphRevisions, setGraphRevisions] = useState<GraphRevisionMetadata[]>([]);
  const [graphRevisionError, setGraphRevisionError] = useState<string | null>(null);
  const [selectedGraphRevisionId, setSelectedGraphRevisionId] =
    useState<string | null>(null);
  const [selectedGraphRevisionInspection, setSelectedGraphRevisionInspection] =
    useState<GraphRevisionInspectionResponse | null>(null);
  const [graphRevisionDetailError, setGraphRevisionDetailError] =
    useState<string | null>(null);
  const [graphValidationResult, setGraphValidationResult] =
    useState<GraphMutationResponse | null>(null);
  const [graphValidationError, setGraphValidationError] = useState<string | null>(
    null
  );
  const [pendingGraphValidation, setPendingGraphValidation] = useState(false);
  const [catalogInspection, setCatalogInspection] =
    useState<CatalogInspectionResponse | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [packageSources, setPackageSources] = useState<
    PackageSourceInspectionResponse[]
  >([]);
  const [packageSourceError, setPackageSourceError] = useState<string | null>(null);
  const [externalPrincipals, setExternalPrincipals] = useState<
    ExternalPrincipalInspectionResponse[]
  >([]);
  const [externalPrincipalError, setExternalPrincipalError] = useState<string | null>(
    null
  );
  const [externalPrincipalDeletionError, setExternalPrincipalDeletionError] =
    useState<string | null>(null);
  const [pendingExternalPrincipalDeletionId, setPendingExternalPrincipalDeletionId] =
    useState<string | null>(null);
  const [packageAdmissionDraft, setPackageAdmissionDraft] =
    useState<PackageSourceAdmissionDraft>(createEmptyPackageSourceAdmissionDraft);
  const [packageAdmissionError, setPackageAdmissionError] = useState<string | null>(null);
  const [pendingPackageAdmission, setPendingPackageAdmission] = useState(false);
  const [packageDeletionError, setPackageDeletionError] = useState<string | null>(null);
  const [pendingPackageSourceDeletionId, setPendingPackageSourceDeletionId] =
    useState<string | null>(null);
  const [runtimes, setRuntimes] = useState<RuntimeInspectionResponse[]>([]);
  const [selectedRuntimeId, setSelectedRuntimeId] = useState<string | null>(null);
  const [selectedManagedNodeId, setSelectedManagedNodeId] = useState<string | null>(null);
  const [nodeDraft, setNodeDraft] = useState<ManagedNodeEditorDraft>(
    createEmptyManagedNodeEditorDraft
  );
  const [nodeMutationError, setNodeMutationError] = useState<string | null>(null);
  const [pendingNodeMutation, setPendingNodeMutation] =
    useState<NodeMutationAction | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [edgeDraft, setEdgeDraft] = useState<EdgeEditorDraft>(
    createEmptyEdgeEditorDraft
  );
  const [edgeMutationError, setEdgeMutationError] = useState<string | null>(null);
  const [pendingEdgeMutation, setPendingEdgeMutation] =
    useState<EdgeMutationAction | null>(null);
  const [selectedRecovery, setSelectedRecovery] =
    useState<RuntimeRecoveryInspectionResponse | null>(null);
  const [recoveryPolicyDraft, setRecoveryPolicyDraft] =
    useState<RuntimeRecoveryPolicyDraft>(createRuntimeRecoveryPolicyDraft);
  const [recoveryPolicyError, setRecoveryPolicyError] = useState<string | null>(null);
  const [pendingRecoveryPolicyMutation, setPendingRecoveryPolicyMutation] =
    useState(false);
  const [selectedApprovals, setSelectedApprovals] = useState<ApprovalRecord[]>([]);
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null);
  const [selectedApprovalInspection, setSelectedApprovalInspection] =
    useState<RuntimeApprovalInspectionResponse | null>(null);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [approvalDetailError, setApprovalDetailError] = useState<string | null>(
    null
  );
  const [selectedArtifacts, setSelectedArtifacts] = useState<ArtifactRecord[]>([]);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [selectedArtifactInspection, setSelectedArtifactInspection] =
    useState<RuntimeArtifactInspectionResponse | null>(null);
  const [selectedArtifactPreview, setSelectedArtifactPreview] =
    useState<RuntimeArtifactPreviewResponse | null>(null);
  const [selectedArtifactHistory, setSelectedArtifactHistory] =
    useState<RuntimeArtifactHistoryResponse | null>(null);
  const [selectedArtifactDiff, setSelectedArtifactDiff] =
    useState<RuntimeArtifactDiffResponse | null>(null);
  const [artifactError, setArtifactError] = useState<string | null>(null);
  const [artifactDetailError, setArtifactDetailError] = useState<string | null>(null);
  const [selectedMemory, setSelectedMemory] =
    useState<RuntimeMemoryInspectionResponse | null>(null);
  const [selectedMemoryPagePath, setSelectedMemoryPagePath] =
    useState<string | null>(null);
  const [selectedMemoryPageInspection, setSelectedMemoryPageInspection] =
    useState<RuntimeMemoryPageInspectionResponse | null>(null);
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [memoryPageError, setMemoryPageError] = useState<string | null>(null);
  const [wikiPublicationDraft, setWikiPublicationDraft] =
    useState<RuntimeWikiPublicationDraft>(createEmptyRuntimeWikiPublicationDraft);
  const [wikiPublicationError, setWikiPublicationError] =
    useState<string | null>(null);
  const [lastWikiPublicationSummary, setLastWikiPublicationSummary] =
    useState<string | null>(null);
  const [pendingWikiPublication, setPendingWikiPublication] = useState(false);
  const [selectedTurns, setSelectedTurns] = useState<RunnerTurnRecord[]>([]);
  const [turnError, setTurnError] = useState<string | null>(null);
  const [selectedTurnId, setSelectedTurnId] = useState<string | null>(null);
  const [selectedTurnInspection, setSelectedTurnInspection] =
    useState<RuntimeTurnInspectionResponse | null>(null);
  const [turnDetailError, setTurnDetailError] = useState<string | null>(null);
  const [selectedSourceChangeCandidates, setSelectedSourceChangeCandidates] =
    useState<SourceChangeCandidateRecord[]>([]);
  const [sourceChangeCandidateError, setSourceChangeCandidateError] =
    useState<string | null>(null);
  const [selectedSourceChangeCandidateId, setSelectedSourceChangeCandidateId] =
    useState<string | null>(null);
  const [
    selectedSourceChangeCandidateInspection,
    setSelectedSourceChangeCandidateInspection
  ] = useState<RuntimeSourceChangeCandidateInspectionResponse | null>(null);
  const [selectedSourceChangeCandidateDiff, setSelectedSourceChangeCandidateDiff] =
    useState<RuntimeSourceChangeCandidateDiffResponse | null>(null);
  const [
    selectedSourceChangeCandidateFilePath,
    setSelectedSourceChangeCandidateFilePath
  ] = useState<string | null>(null);
  const [
    selectedSourceChangeCandidateFilePreview,
    setSelectedSourceChangeCandidateFilePreview
  ] = useState<RuntimeSourceChangeCandidateFilePreviewResponse | null>(null);
  const [sourceChangeCandidateDetailError, setSourceChangeCandidateDetailError] =
    useState<string | null>(null);
  const [selectedSourceHistory, setSelectedSourceHistory] = useState<
    SourceHistoryRecord[]
  >([]);
  const [sourceHistoryError, setSourceHistoryError] = useState<string | null>(null);
  const [selectedSourceHistoryId, setSelectedSourceHistoryId] =
    useState<string | null>(null);
  const [selectedSourceHistoryInspection, setSelectedSourceHistoryInspection] =
    useState<RuntimeSourceHistoryInspectionResponse | null>(null);
  const [sourceHistoryDetailError, setSourceHistoryDetailError] =
    useState<string | null>(null);
  const [sourceHistoryPublicationDraft, setSourceHistoryPublicationDraft] =
    useState<RuntimeSourceHistoryPublicationDraft>(
      createEmptyRuntimeSourceHistoryPublicationDraft
    );
  const [sourceHistoryPublicationError, setSourceHistoryPublicationError] =
    useState<string | null>(null);
  const [
    lastSourceHistoryPublicationSummary,
    setLastSourceHistoryPublicationSummary
  ] = useState<string | null>(null);
  const [pendingSourceHistoryPublication, setPendingSourceHistoryPublication] =
    useState(false);
  const [sourceHistoryReplayDraft, setSourceHistoryReplayDraft] =
    useState<RuntimeSourceHistoryReplayDraft>(
      createEmptyRuntimeSourceHistoryReplayDraft
    );
  const [sourceHistoryReplayError, setSourceHistoryReplayError] =
    useState<string | null>(null);
  const [lastSourceHistoryReplaySummary, setLastSourceHistoryReplaySummary] =
    useState<string | null>(null);
  const [pendingSourceHistoryReplay, setPendingSourceHistoryReplay] =
    useState(false);
  const [selectedSessions, setSelectedSessions] = useState<HostSessionSummary[]>([]);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSessionInspection, setSelectedSessionInspection] =
    useState<SessionInspectionResponse | null>(null);
  const [sessionDetailError, setSessionDetailError] = useState<string | null>(null);
  const [sessionLaunchDraft, setSessionLaunchDraft] =
    useState<SessionLaunchDraft>(() => createDefaultSessionLaunchDraft(null));
  const [sessionLaunchError, setSessionLaunchError] = useState<string | null>(null);
  const [lastSessionLaunch, setLastSessionLaunch] =
    useState<SessionLaunchResponse | null>(null);
  const [pendingSessionLaunch, setPendingSessionLaunch] = useState(false);
  const [sessionCancellationError, setSessionCancellationError] =
    useState<string | null>(null);
  const [lastSessionCancellation, setLastSessionCancellation] =
    useState<SessionCancellationResponse | null>(null);
  const [pendingSessionCancellation, setPendingSessionCancellation] =
    useState(false);
  const [hostEvents, setHostEvents] = useState<HostEventRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [pendingRuntimeAction, setPendingRuntimeAction] =
    useState<RuntimeLifecycleAction | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [eventStreamState, setEventStreamState] =
    useState<EventStreamState>("connecting");
  const [eventStreamError, setEventStreamError] = useState<string | null>(null);
  const selectedGraphRevisionIdRef = useRef<string | null>(null);
  const selectedRuntimeIdRef = useRef<string | null>(null);
  const selectedApprovalIdRef = useRef<string | null>(null);
  const selectedArtifactIdRef = useRef<string | null>(null);
  const selectedMemoryPagePathRef = useRef<string | null>(null);
  const selectedTurnIdRef = useRef<string | null>(null);
  const selectedSourceChangeCandidateIdRef = useRef<string | null>(null);
  const selectedSourceChangeCandidateFilePathRef = useRef<string | null>(null);
  const selectedSessionIdRef = useRef<string | null>(null);
  const recoveryPolicySeedRef = useRef<string | null>(null);
  const sessionLaunchDraftSeedRef = useRef<string | null>(null);

  selectedGraphRevisionIdRef.current = selectedGraphRevisionId;
  selectedRuntimeIdRef.current = selectedRuntimeId;
  selectedApprovalIdRef.current = selectedApprovalId;
  selectedArtifactIdRef.current = selectedArtifactId;
  selectedMemoryPagePathRef.current = selectedMemoryPagePath;
  selectedTurnIdRef.current = selectedTurnId;
  selectedSourceChangeCandidateIdRef.current = selectedSourceChangeCandidateId;
  selectedSourceChangeCandidateFilePathRef.current =
    selectedSourceChangeCandidateFilePath;
  selectedSessionIdRef.current = selectedSessionId;

  const loadOverview = useCallback(async () => {
    const [
      statusResult,
      graphResult,
      graphRevisionResult,
      runtimeListResult,
      catalogResult,
      packageSourceResult,
      externalPrincipalResult,
      projectionResult,
      userNodeResult
    ] =
      await Promise.allSettled([
        client.getHostStatus(),
        client.getGraph(),
        client.listGraphRevisions(),
        client.listRuntimes(),
        client.getCatalog(),
        client.listPackageSources(),
        client.listExternalPrincipals(),
        client.getProjection(),
        client.listUserNodes()
      ]);

    if (
      statusResult.status === "rejected" ||
      graphResult.status === "rejected" ||
      runtimeListResult.status === "rejected"
    ) {
      const overviewError: unknown =
        statusResult.status === "rejected"
          ? statusResult.reason
          : graphResult.status === "rejected"
            ? graphResult.reason
            : runtimeListResult.status === "rejected"
              ? runtimeListResult.reason
              : new Error("Host overview refresh failed unexpectedly.");

      startTransition(() => {
        setError(
          normalizeError(overviewError, "Unknown error while loading host state.")
        );
      });
      return;
    }

    startTransition(() => {
      setStatus(statusResult.value);
      setGraphInspection(graphResult.value);
      setRuntimes(runtimeListResult.value.runtimes);
      setError(null);

      if (catalogResult.status === "fulfilled") {
        setCatalogInspection(catalogResult.value);
        setCatalogError(null);
      } else {
        setCatalogInspection(null);
        setCatalogError(
          normalizeError(
            catalogResult.reason,
            "Unknown error while loading deployment catalog."
          )
        );
      }

      if (graphRevisionResult.status === "fulfilled") {
        const nextGraphRevisions = sortGraphRevisions(
          graphRevisionResult.value.revisions
        );
        setGraphRevisions(nextGraphRevisions);
        setGraphRevisionError(null);

        if (
          selectedGraphRevisionIdRef.current &&
          !nextGraphRevisions.some(
            (revision) =>
              revision.revisionId === selectedGraphRevisionIdRef.current
          )
        ) {
          setSelectedGraphRevisionId(null);
          setSelectedGraphRevisionInspection(null);
          setGraphRevisionDetailError(null);
        }
      } else {
        setGraphRevisions([]);
        setGraphRevisionError(
          normalizeError(
            graphRevisionResult.reason,
            "Unknown error while loading graph revision history."
          )
        );
        setSelectedGraphRevisionId(null);
        setSelectedGraphRevisionInspection(null);
        setGraphRevisionDetailError(null);
      }

      if (packageSourceResult.status === "fulfilled") {
        setPackageSources(
          sortPackageSourceInspections(packageSourceResult.value.packageSources)
        );
        setPackageSourceError(null);
      } else {
        setPackageSources([]);
        setPackageSourceError(
          normalizeError(
            packageSourceResult.reason,
            "Unknown error while loading admitted package sources."
          )
        );
      }

      if (externalPrincipalResult.status === "fulfilled") {
        setExternalPrincipals(
          sortExternalPrincipalInspections(externalPrincipalResult.value.principals)
        );
        setExternalPrincipalError(null);
      } else {
        setExternalPrincipals([]);
        setExternalPrincipalError(
          normalizeError(
            externalPrincipalResult.reason,
            "Unknown error while loading external principals."
          )
        );
      }

      if (projectionResult.status === "fulfilled") {
        setProjectionSnapshot(projectionResult.value);
        setProjectionError(null);
      } else {
        setProjectionSnapshot(null);
        setProjectionError(
          normalizeError(
            projectionResult.reason,
            "Unknown error while loading federated projection."
          )
        );
      }

      if (userNodeResult.status === "fulfilled") {
        setUserNodes(sortUserNodeIdentitiesForStudio(userNodeResult.value.userNodes));
        setUserNodeError(null);
      } else {
        setUserNodes([]);
        setUserNodeError(
          normalizeError(
            userNodeResult.reason,
            "Unknown error while loading User Nodes."
          )
        );
      }
    });
  }, [client]);

  const loadSelectedGraphRevisionInspection = useCallback(
    async (revisionId: string) => {
      try {
        const inspection = await client.getGraphRevision(revisionId);

        if (selectedGraphRevisionIdRef.current !== revisionId) {
          return;
        }

        startTransition(() => {
          setSelectedGraphRevisionInspection(inspection);
          setGraphRevisionDetailError(null);
        });
      } catch (caught: unknown) {
        if (selectedGraphRevisionIdRef.current !== revisionId) {
          return;
        }

        startTransition(() => {
          setSelectedGraphRevisionInspection(null);
          setGraphRevisionDetailError(
            normalizeError(
              caught,
              "Unknown error while loading graph revision detail."
            )
          );
        });
      }
    },
    [client]
  );

  const loadSelectedSessionInspection = useCallback(
    async (nodeId: string, sessionId: string) => {
      try {
        const inspection = await client.getSession(sessionId);

        if (
          selectedRuntimeIdRef.current !== nodeId ||
          selectedSessionIdRef.current !== sessionId
        ) {
          return;
        }

        startTransition(() => {
          if (!sessionInspectionReferencesRuntime(inspection, nodeId)) {
            setSelectedSessionId(null);
            setSelectedSessionInspection(null);
            setSessionDetailError(null);
            setSessionCancellationError(null);
            setLastSessionCancellation(null);
            return;
          }

          setSelectedSessionInspection(inspection);
          setSessionDetailError(null);
        });
      } catch (caught: unknown) {
        if (
          selectedRuntimeIdRef.current !== nodeId ||
          selectedSessionIdRef.current !== sessionId
        ) {
          return;
        }

        startTransition(() => {
          setSelectedSessionInspection(null);
          setSessionDetailError(
            normalizeError(caught, "Unknown error while loading session detail.")
          );
        });
      }
    },
    [client]
  );

  const validateActiveGraph = useCallback(async () => {
    if (!graphInspection?.graph) {
      return;
    }

    try {
      setPendingGraphValidation(true);
      const response = await client.validateGraph(graphInspection.graph);
      setGraphValidationResult(response);
      setGraphValidationError(summarizeValidationReport(response.validation));
    } catch (caught: unknown) {
      setGraphValidationResult(null);
      setGraphValidationError(
        normalizeError(caught, "Unknown error while validating the active graph.")
      );
    } finally {
      setPendingGraphValidation(false);
    }
  }, [client, graphInspection]);

  const loadSelectedApprovalInspection = useCallback(
    async (nodeId: string, approvalId: string) => {
      try {
        const inspection = await client.getRuntimeApproval(nodeId, approvalId);

        if (
          selectedRuntimeIdRef.current !== nodeId ||
          selectedApprovalIdRef.current !== approvalId
        ) {
          return;
        }

        startTransition(() => {
          setSelectedApprovalInspection(inspection);
          setApprovalDetailError(null);
        });
      } catch (caught: unknown) {
        if (
          selectedRuntimeIdRef.current !== nodeId ||
          selectedApprovalIdRef.current !== approvalId
        ) {
          return;
        }

        startTransition(() => {
          setSelectedApprovalInspection(null);
          setApprovalDetailError(
            normalizeError(caught, "Unknown error while loading approval detail.")
          );
        });
      }
    },
    [client]
  );

  const loadSelectedArtifactInspection = useCallback(
    async (nodeId: string, artifactId: string) => {
      try {
        const [inspection, preview, history, diff] = await Promise.all([
          client.getRuntimeArtifact(nodeId, artifactId),
          client.getRuntimeArtifactPreview(nodeId, artifactId),
          client.getRuntimeArtifactHistory(nodeId, artifactId, { limit: 8 }),
          client.getRuntimeArtifactDiff(nodeId, artifactId)
        ]);

        if (
          selectedRuntimeIdRef.current !== nodeId ||
          selectedArtifactIdRef.current !== artifactId
        ) {
          return;
        }

        startTransition(() => {
          setSelectedArtifactInspection(inspection);
          setSelectedArtifactPreview(preview);
          setSelectedArtifactHistory(history);
          setSelectedArtifactDiff(diff);
          setArtifactDetailError(null);
        });
      } catch (caught: unknown) {
        if (
          selectedRuntimeIdRef.current !== nodeId ||
          selectedArtifactIdRef.current !== artifactId
        ) {
          return;
        }

        startTransition(() => {
          setSelectedArtifactInspection(null);
          setSelectedArtifactPreview(null);
          setSelectedArtifactHistory(null);
          setSelectedArtifactDiff(null);
          setArtifactDetailError(
            normalizeError(caught, "Unknown error while loading artifact detail.")
          );
        });
      }
    },
    [client]
  );

  const loadSelectedMemoryPageInspection = useCallback(
    async (nodeId: string, pagePath: string) => {
      try {
        const inspection = await client.getRuntimeMemoryPage(nodeId, pagePath);

        if (
          selectedRuntimeIdRef.current !== nodeId ||
          selectedMemoryPagePathRef.current !== pagePath
        ) {
          return;
        }

        startTransition(() => {
          setSelectedMemoryPageInspection(inspection);
          setMemoryPageError(null);
        });
      } catch (caught: unknown) {
        if (
          selectedRuntimeIdRef.current !== nodeId ||
          selectedMemoryPagePathRef.current !== pagePath
        ) {
          return;
        }

        startTransition(() => {
          setSelectedMemoryPageInspection(null);
          setMemoryPageError(
            normalizeError(caught, "Unknown error while loading memory page.")
          );
        });
      }
    },
    [client]
  );

  const loadSelectedTurnInspection = useCallback(
    async (nodeId: string, turnId: string) => {
      try {
        const inspection = await client.getRuntimeTurn(nodeId, turnId);

        if (
          selectedRuntimeIdRef.current !== nodeId ||
          selectedTurnIdRef.current !== turnId
        ) {
          return;
        }

        startTransition(() => {
          setSelectedTurnInspection(inspection);
          setTurnDetailError(null);
        });
      } catch (caught: unknown) {
        if (
          selectedRuntimeIdRef.current !== nodeId ||
          selectedTurnIdRef.current !== turnId
        ) {
          return;
        }

        startTransition(() => {
          setSelectedTurnInspection(null);
          setTurnDetailError(
            normalizeError(caught, "Unknown error while loading turn detail.")
          );
        });
      }
    },
    [client]
  );

  const loadSelectedSourceChangeCandidateInspection = useCallback(
    async (nodeId: string, candidateId: string) => {
      try {
        const [inspection, diff] = await Promise.all([
          client.getRuntimeSourceChangeCandidate(nodeId, candidateId),
          client.getRuntimeSourceChangeCandidateDiff(nodeId, candidateId)
        ]);
        const firstFilePath =
          inspection.candidate.sourceChangeSummary.files[0]?.path ?? null;
        const filePreview = firstFilePath
          ? await client.getRuntimeSourceChangeCandidateFilePreview(
              nodeId,
              candidateId,
              firstFilePath
            )
          : null;

        if (
          selectedRuntimeIdRef.current !== nodeId ||
          selectedSourceChangeCandidateIdRef.current !== candidateId
        ) {
          return;
        }

        startTransition(() => {
          setSelectedSourceChangeCandidateInspection(inspection);
          setSelectedSourceChangeCandidateDiff(diff);
          setSelectedSourceChangeCandidateFilePath(firstFilePath);
          setSelectedSourceChangeCandidateFilePreview(filePreview);
          setSourceChangeCandidateDetailError(null);
        });
      } catch (caught: unknown) {
        if (
          selectedRuntimeIdRef.current !== nodeId ||
          selectedSourceChangeCandidateIdRef.current !== candidateId
        ) {
          return;
        }

        startTransition(() => {
          setSelectedSourceChangeCandidateInspection(null);
          setSelectedSourceChangeCandidateDiff(null);
          setSelectedSourceChangeCandidateFilePath(null);
          setSelectedSourceChangeCandidateFilePreview(null);
          setSourceChangeCandidateDetailError(
            normalizeError(
              caught,
              "Unknown error while loading source change candidate detail."
            )
          );
        });
      }
    },
    [client]
  );

  const loadSelectedSourceChangeCandidateFilePreview = useCallback(
    async (nodeId: string, candidateId: string, filePath: string) => {
      try {
        const filePreview =
          await client.getRuntimeSourceChangeCandidateFilePreview(
            nodeId,
            candidateId,
            filePath
          );

        if (
          selectedRuntimeIdRef.current !== nodeId ||
          selectedSourceChangeCandidateIdRef.current !== candidateId ||
          selectedSourceChangeCandidateFilePathRef.current !== filePath
        ) {
          return;
        }

        startTransition(() => {
          setSelectedSourceChangeCandidateFilePreview(filePreview);
          setSourceChangeCandidateDetailError(null);
        });
      } catch (caught: unknown) {
        if (
          selectedRuntimeIdRef.current !== nodeId ||
          selectedSourceChangeCandidateIdRef.current !== candidateId ||
          selectedSourceChangeCandidateFilePathRef.current !== filePath
        ) {
          return;
        }

        startTransition(() => {
          setSelectedSourceChangeCandidateFilePreview(null);
          setSourceChangeCandidateDetailError(
            normalizeError(
              caught,
              "Unknown error while loading source change candidate file preview."
            )
          );
        });
      }
    },
    [client]
  );

  const refreshSelectedRuntimeDetails = useCallback(async (nodeId: string) => {
    const [
      statusResult,
      runtimeListResult,
      recoveryResult,
      approvalResult,
      artifactResult,
      memoryResult,
      turnResult,
      sourceCandidateResult,
      sourceHistoryResult,
      sessionResult
    ] =
      await Promise.allSettled([
        client.getHostStatus(),
        client.listRuntimes(),
        client.getRuntimeRecovery(nodeId, 20),
        client.listRuntimeApprovals(nodeId),
        client.listRuntimeArtifacts(nodeId),
        client.getRuntimeMemory(nodeId),
        client.listRuntimeTurns(nodeId),
        client.listRuntimeSourceChangeCandidates(nodeId),
        client.listRuntimeSourceHistory(nodeId),
        client.listSessions()
      ]);
    const nextSelectedApprovals =
      approvalResult.status === "fulfilled"
        ? sortRuntimeApprovals(approvalResult.value.approvals)
        : [];
    const nextSelectedSessions =
      sessionResult.status === "fulfilled"
        ? filterRuntimeSessions(sessionResult.value.sessions, nodeId)
        : [];
    const currentSelectedApprovalId = selectedApprovalId;
    const shouldRefreshSelectedApproval =
      currentSelectedApprovalId !== null &&
      nextSelectedApprovals.some(
        (approval) => approval.approvalId === currentSelectedApprovalId
      );
    const selectedApprovalResult = shouldRefreshSelectedApproval
      ? (
          await Promise.allSettled([
            client.getRuntimeApproval(nodeId, currentSelectedApprovalId)
          ])
        )[0]
      : null;
    const nextSelectedArtifacts =
      artifactResult.status === "fulfilled"
        ? sortRuntimeArtifacts(artifactResult.value.artifacts)
        : [];
    const nextSelectedTurns =
      turnResult.status === "fulfilled"
        ? sortRuntimeTurns(turnResult.value.turns)
        : [];
    const nextSelectedSourceChangeCandidates =
      sourceCandidateResult.status === "fulfilled"
        ? sortRuntimeSourceChangeCandidates(sourceCandidateResult.value.candidates)
        : [];
    const nextSelectedSourceHistory =
      sourceHistoryResult.status === "fulfilled"
        ? sortRuntimeSourceHistory(sourceHistoryResult.value.history)
        : [];
    const nextSelectedMemoryPages =
      memoryResult.status === "fulfilled"
        ? sortRuntimeMemoryPagesForPresentation(memoryResult.value.pages)
        : [];
    const currentSelectedMemoryPagePath = selectedMemoryPagePath;
    const shouldRefreshSelectedMemoryPage =
      currentSelectedMemoryPagePath !== null &&
      nextSelectedMemoryPages.some(
        (page) => page.path === currentSelectedMemoryPagePath
      );
    const selectedMemoryPageResult = shouldRefreshSelectedMemoryPage
      ? (
          await Promise.allSettled([
            client.getRuntimeMemoryPage(nodeId, currentSelectedMemoryPagePath)
          ])
        )[0]
      : null;
    const currentSelectedArtifactId = selectedArtifactId;
    const shouldRefreshSelectedArtifact =
      currentSelectedArtifactId !== null &&
      nextSelectedArtifacts.some(
        (artifact) => artifact.ref.artifactId === currentSelectedArtifactId
      );
    const selectedArtifactResults = shouldRefreshSelectedArtifact
      ? (
          await Promise.allSettled([
            client.getRuntimeArtifact(nodeId, currentSelectedArtifactId),
            client.getRuntimeArtifactPreview(nodeId, currentSelectedArtifactId),
            client.getRuntimeArtifactHistory(nodeId, currentSelectedArtifactId, {
              limit: 8
            }),
            client.getRuntimeArtifactDiff(nodeId, currentSelectedArtifactId)
          ])
        )
      : null;
    const selectedArtifactResult = selectedArtifactResults?.[0] ?? null;
    const selectedArtifactPreviewResult = selectedArtifactResults?.[1] ?? null;
    const selectedArtifactHistoryResult = selectedArtifactResults?.[2] ?? null;
    const selectedArtifactDiffResult = selectedArtifactResults?.[3] ?? null;
    const currentSelectedTurnId = selectedTurnId;
    const shouldRefreshSelectedTurn =
      currentSelectedTurnId !== null &&
      nextSelectedTurns.some((turn) => turn.turnId === currentSelectedTurnId);
    const selectedTurnResult = shouldRefreshSelectedTurn
      ? (
          await Promise.allSettled([
            client.getRuntimeTurn(nodeId, currentSelectedTurnId)
          ])
        )[0]
      : null;
    const currentSelectedSourceChangeCandidateId =
      selectedSourceChangeCandidateId;
    const selectedSourceChangeCandidateRecord =
      currentSelectedSourceChangeCandidateId !== null
        ? nextSelectedSourceChangeCandidates.find(
            (candidate) =>
              candidate.candidateId === currentSelectedSourceChangeCandidateId
          )
        : undefined;
    const shouldRefreshSelectedSourceChangeCandidate =
      currentSelectedSourceChangeCandidateId !== null &&
      selectedSourceChangeCandidateRecord !== undefined;
    const currentSelectedSourceChangeCandidateFilePath =
      selectedSourceChangeCandidateFilePath;
    const nextSelectedSourceChangeCandidateFilePath =
      selectedSourceChangeCandidateRecord !== undefined
        ? selectedSourceChangeCandidateRecord.sourceChangeSummary.files.some(
            (file) => file.path === currentSelectedSourceChangeCandidateFilePath
          )
          ? currentSelectedSourceChangeCandidateFilePath
          : (selectedSourceChangeCandidateRecord.sourceChangeSummary.files[0]
              ?.path ?? null)
        : null;
    const selectedSourceChangeCandidateResults =
      shouldRefreshSelectedSourceChangeCandidate
        ? (
            await Promise.allSettled([
              client.getRuntimeSourceChangeCandidate(
                nodeId,
                currentSelectedSourceChangeCandidateId
              ),
              client.getRuntimeSourceChangeCandidateDiff(
                nodeId,
                currentSelectedSourceChangeCandidateId
              ),
              nextSelectedSourceChangeCandidateFilePath
                ? client.getRuntimeSourceChangeCandidateFilePreview(
                    nodeId,
                    currentSelectedSourceChangeCandidateId,
                    nextSelectedSourceChangeCandidateFilePath
                  )
                : Promise.resolve(null)
            ])
          )
        : null;
    const selectedSourceChangeCandidateResult =
      selectedSourceChangeCandidateResults?.[0] ?? null;
    const selectedSourceChangeCandidateDiffResult =
      selectedSourceChangeCandidateResults?.[1] ?? null;
    const selectedSourceChangeCandidateFilePreviewResult =
      selectedSourceChangeCandidateResults?.[2] ?? null;
    const currentSelectedSourceHistoryId = selectedSourceHistoryId;
    const shouldRefreshSelectedSourceHistory =
      currentSelectedSourceHistoryId !== null &&
      nextSelectedSourceHistory.some(
        (entry) => entry.sourceHistoryId === currentSelectedSourceHistoryId
      );
    const selectedSourceHistoryResult = shouldRefreshSelectedSourceHistory
      ? (
          await Promise.allSettled([
            client.getRuntimeSourceHistory(nodeId, currentSelectedSourceHistoryId)
          ])
        )[0]
      : null;
    const currentSelectedSessionId = selectedSessionId;
    const shouldRefreshSelectedSession =
      currentSelectedSessionId !== null &&
      nextSelectedSessions.some(
        (session) => session.sessionId === currentSelectedSessionId
      );
    const selectedSessionResult = shouldRefreshSelectedSession
      ? (
          await Promise.allSettled([
            client.getSession(currentSelectedSessionId)
          ])
        )[0]
      : null;

    if (statusResult.status === "rejected" || runtimeListResult.status === "rejected") {
      const runtimeStateError: unknown =
        statusResult.status === "rejected"
          ? statusResult.reason
          : runtimeListResult.status === "rejected"
            ? runtimeListResult.reason
            : new Error("Selected runtime state refresh failed unexpectedly.");

      startTransition(() => {
        setError(
          normalizeError(
            runtimeStateError,
            "Unknown error while loading selected runtime state."
          )
        );
      });
      return;
    }

    startTransition(() => {
      setStatus(statusResult.value);
      setRuntimes(runtimeListResult.value.runtimes);
      setError(null);

      if (recoveryResult.status === "fulfilled") {
        setSelectedRecovery(recoveryResult.value);
        setRecoveryError(null);
      } else {
        setSelectedRecovery(null);
        setRecoveryError(
          normalizeError(
            recoveryResult.reason,
            "Unknown error while loading runtime recovery."
          )
        );
      }

      if (approvalResult.status === "fulfilled") {
        setSelectedApprovals(nextSelectedApprovals);
        setApprovalError(null);

        if (!selectedApprovalId) {
          setSelectedApprovalInspection(null);
          setApprovalDetailError(null);
        } else if (!shouldRefreshSelectedApproval) {
          setSelectedApprovalId(null);
          setSelectedApprovalInspection(null);
          setApprovalDetailError(null);
        } else if (selectedApprovalResult?.status === "fulfilled") {
          setSelectedApprovalInspection(selectedApprovalResult.value);
          setApprovalDetailError(null);
        } else if (selectedApprovalResult?.status === "rejected") {
          setSelectedApprovalInspection(null);
          setApprovalDetailError(
            normalizeError(
              selectedApprovalResult.reason,
              "Unknown error while loading approval detail."
            )
          );
        }
      } else {
        setSelectedApprovals([]);
        setApprovalError(
          normalizeError(
            approvalResult.reason,
            "Unknown error while loading runtime approvals."
          )
        );
        setSelectedApprovalId(null);
        setSelectedApprovalInspection(null);
        setApprovalDetailError(null);
      }

      if (artifactResult.status === "fulfilled") {
        setSelectedArtifacts(nextSelectedArtifacts);
        setArtifactError(null);

        if (!selectedArtifactId) {
          setSelectedArtifactInspection(null);
          setSelectedArtifactPreview(null);
          setSelectedArtifactHistory(null);
          setSelectedArtifactDiff(null);
          setArtifactDetailError(null);
        } else if (!shouldRefreshSelectedArtifact) {
          setSelectedArtifactId(null);
          setSelectedArtifactInspection(null);
          setSelectedArtifactPreview(null);
          setSelectedArtifactHistory(null);
          setSelectedArtifactDiff(null);
          setArtifactDetailError(null);
        } else if (
          selectedArtifactResult?.status === "fulfilled" &&
          selectedArtifactPreviewResult?.status === "fulfilled" &&
          selectedArtifactHistoryResult?.status === "fulfilled" &&
          selectedArtifactDiffResult?.status === "fulfilled"
        ) {
          setSelectedArtifactInspection(selectedArtifactResult.value);
          setSelectedArtifactPreview(selectedArtifactPreviewResult.value);
          setSelectedArtifactHistory(selectedArtifactHistoryResult.value);
          setSelectedArtifactDiff(selectedArtifactDiffResult.value);
          setArtifactDetailError(null);
        } else if (selectedArtifactResult?.status === "rejected") {
          setSelectedArtifactInspection(null);
          setSelectedArtifactPreview(null);
          setSelectedArtifactHistory(null);
          setSelectedArtifactDiff(null);
          setArtifactDetailError(
            normalizeError(
              selectedArtifactResult.reason,
              "Unknown error while loading artifact detail."
            )
          );
        } else if (selectedArtifactPreviewResult?.status === "rejected") {
          setSelectedArtifactInspection(null);
          setSelectedArtifactPreview(null);
          setSelectedArtifactHistory(null);
          setSelectedArtifactDiff(null);
          setArtifactDetailError(
            normalizeError(
              selectedArtifactPreviewResult.reason,
              "Unknown error while loading artifact preview."
            )
          );
        } else if (selectedArtifactHistoryResult?.status === "rejected") {
          setSelectedArtifactInspection(null);
          setSelectedArtifactPreview(null);
          setSelectedArtifactHistory(null);
          setSelectedArtifactDiff(null);
          setArtifactDetailError(
            normalizeError(
              selectedArtifactHistoryResult.reason,
              "Unknown error while loading artifact history."
            )
          );
        } else if (selectedArtifactDiffResult?.status === "rejected") {
          setSelectedArtifactInspection(null);
          setSelectedArtifactPreview(null);
          setSelectedArtifactHistory(null);
          setSelectedArtifactDiff(null);
          setArtifactDetailError(
            normalizeError(
              selectedArtifactDiffResult.reason,
              "Unknown error while loading artifact diff."
            )
          );
        }
      } else {
        setSelectedArtifacts([]);
        setArtifactError(
          normalizeError(
            artifactResult.reason,
            "Unknown error while loading runtime artifacts."
          )
        );
        setSelectedArtifactId(null);
        setSelectedArtifactInspection(null);
        setSelectedArtifactPreview(null);
        setSelectedArtifactHistory(null);
        setSelectedArtifactDiff(null);
        setArtifactDetailError(null);
      }

      if (memoryResult.status === "fulfilled") {
        setSelectedMemory(memoryResult.value);
        setMemoryError(null);

        if (!selectedMemoryPagePath) {
          setSelectedMemoryPageInspection(null);
          setMemoryPageError(null);
        } else if (!shouldRefreshSelectedMemoryPage) {
          setSelectedMemoryPagePath(null);
          setSelectedMemoryPageInspection(null);
          setMemoryPageError(null);
        } else if (selectedMemoryPageResult?.status === "fulfilled") {
          setSelectedMemoryPageInspection(selectedMemoryPageResult.value);
          setMemoryPageError(null);
        } else if (selectedMemoryPageResult?.status === "rejected") {
          setSelectedMemoryPageInspection(null);
          setMemoryPageError(
            normalizeError(
              selectedMemoryPageResult.reason,
              "Unknown error while loading memory page."
            )
          );
        }
      } else {
        setSelectedMemory(null);
        setMemoryError(
          normalizeError(
            memoryResult.reason,
            "Unknown error while loading runtime memory."
          )
        );
        setSelectedMemoryPagePath(null);
        setSelectedMemoryPageInspection(null);
        setMemoryPageError(null);
      }

      if (turnResult.status === "fulfilled") {
        setSelectedTurns(nextSelectedTurns);
        setTurnError(null);

        if (!selectedTurnId) {
          setSelectedTurnInspection(null);
          setTurnDetailError(null);
        } else if (!shouldRefreshSelectedTurn) {
          setSelectedTurnId(null);
          setSelectedTurnInspection(null);
          setTurnDetailError(null);
        } else if (selectedTurnResult?.status === "fulfilled") {
          setSelectedTurnInspection(selectedTurnResult.value);
          setTurnDetailError(null);
        } else if (selectedTurnResult?.status === "rejected") {
          setSelectedTurnInspection(null);
          setTurnDetailError(
            normalizeError(
              selectedTurnResult.reason,
              "Unknown error while loading turn detail."
            )
          );
        }
      } else {
        setSelectedTurns([]);
        setTurnError(
          normalizeError(
            turnResult.reason,
            "Unknown error while loading runtime turns."
          )
        );
        setSelectedTurnId(null);
        setSelectedTurnInspection(null);
        setTurnDetailError(null);
      }

      if (sourceCandidateResult.status === "fulfilled") {
        setSelectedSourceChangeCandidates(nextSelectedSourceChangeCandidates);
        setSourceChangeCandidateError(null);

        if (!selectedSourceChangeCandidateId) {
          setSelectedSourceChangeCandidateInspection(null);
          setSelectedSourceChangeCandidateDiff(null);
          setSelectedSourceChangeCandidateFilePath(null);
          setSelectedSourceChangeCandidateFilePreview(null);
          setSourceChangeCandidateDetailError(null);
        } else if (!shouldRefreshSelectedSourceChangeCandidate) {
          setSelectedSourceChangeCandidateId(null);
          setSelectedSourceChangeCandidateInspection(null);
          setSelectedSourceChangeCandidateDiff(null);
          setSelectedSourceChangeCandidateFilePath(null);
          setSelectedSourceChangeCandidateFilePreview(null);
          setSourceChangeCandidateDetailError(null);
        } else if (
          selectedSourceChangeCandidateResult?.status === "fulfilled" &&
          selectedSourceChangeCandidateDiffResult?.status === "fulfilled" &&
          selectedSourceChangeCandidateFilePreviewResult?.status === "fulfilled"
        ) {
          setSelectedSourceChangeCandidateInspection(
            selectedSourceChangeCandidateResult.value
          );
          setSelectedSourceChangeCandidateDiff(
            selectedSourceChangeCandidateDiffResult.value
          );
          setSelectedSourceChangeCandidateFilePath(
            nextSelectedSourceChangeCandidateFilePath
          );
          setSelectedSourceChangeCandidateFilePreview(
            selectedSourceChangeCandidateFilePreviewResult.value
          );
          setSourceChangeCandidateDetailError(null);
        } else if (selectedSourceChangeCandidateResult?.status === "rejected") {
          setSelectedSourceChangeCandidateInspection(null);
          setSelectedSourceChangeCandidateDiff(null);
          setSelectedSourceChangeCandidateFilePath(null);
          setSelectedSourceChangeCandidateFilePreview(null);
          setSourceChangeCandidateDetailError(
            normalizeError(
              selectedSourceChangeCandidateResult.reason,
              "Unknown error while loading source change candidate detail."
            )
          );
        } else if (
          selectedSourceChangeCandidateDiffResult?.status === "rejected"
        ) {
          setSelectedSourceChangeCandidateInspection(null);
          setSelectedSourceChangeCandidateDiff(null);
          setSelectedSourceChangeCandidateFilePath(null);
          setSelectedSourceChangeCandidateFilePreview(null);
          setSourceChangeCandidateDetailError(
            normalizeError(
              selectedSourceChangeCandidateDiffResult.reason,
              "Unknown error while loading source change candidate diff."
            )
          );
        } else if (
          selectedSourceChangeCandidateFilePreviewResult?.status === "rejected"
        ) {
          setSelectedSourceChangeCandidateInspection(null);
          setSelectedSourceChangeCandidateDiff(null);
          setSelectedSourceChangeCandidateFilePath(null);
          setSelectedSourceChangeCandidateFilePreview(null);
          setSourceChangeCandidateDetailError(
            normalizeError(
              selectedSourceChangeCandidateFilePreviewResult.reason,
              "Unknown error while loading source change candidate file preview."
            )
          );
        }
      } else {
        setSelectedSourceChangeCandidates([]);
        setSourceChangeCandidateError(
          normalizeError(
            sourceCandidateResult.reason,
            "Unknown error while loading source change candidates."
          )
        );
        setSelectedSourceChangeCandidateId(null);
        setSelectedSourceChangeCandidateInspection(null);
        setSelectedSourceChangeCandidateDiff(null);
        setSelectedSourceChangeCandidateFilePath(null);
        setSelectedSourceChangeCandidateFilePreview(null);
        setSourceChangeCandidateDetailError(null);
      }

      if (sourceHistoryResult.status === "fulfilled") {
        setSelectedSourceHistory(nextSelectedSourceHistory);
        setSourceHistoryError(null);

        if (!selectedSourceHistoryId) {
          setSelectedSourceHistoryInspection(null);
          setSourceHistoryDetailError(null);
          setSourceHistoryPublicationError(null);
          setLastSourceHistoryPublicationSummary(null);
          setPendingSourceHistoryPublication(false);
          setSourceHistoryReplayError(null);
          setLastSourceHistoryReplaySummary(null);
          setPendingSourceHistoryReplay(false);
        } else if (!shouldRefreshSelectedSourceHistory) {
          setSelectedSourceHistoryId(null);
          setSelectedSourceHistoryInspection(null);
          setSourceHistoryDetailError(null);
          setSourceHistoryPublicationDraft(
            createEmptyRuntimeSourceHistoryPublicationDraft()
          );
          setSourceHistoryPublicationError(null);
          setLastSourceHistoryPublicationSummary(null);
          setPendingSourceHistoryPublication(false);
          setSourceHistoryReplayDraft(createEmptyRuntimeSourceHistoryReplayDraft());
          setSourceHistoryReplayError(null);
          setLastSourceHistoryReplaySummary(null);
          setPendingSourceHistoryReplay(false);
        } else if (selectedSourceHistoryResult?.status === "fulfilled") {
          setSelectedSourceHistoryInspection(selectedSourceHistoryResult.value);
          setSourceHistoryDetailError(null);
        } else if (selectedSourceHistoryResult?.status === "rejected") {
          setSelectedSourceHistoryInspection(null);
          setSourceHistoryDetailError(
            normalizeError(
              selectedSourceHistoryResult.reason,
              "Unknown error while loading source history detail."
            )
          );
          setSourceHistoryPublicationError(null);
          setLastSourceHistoryPublicationSummary(null);
          setPendingSourceHistoryPublication(false);
          setSourceHistoryReplayError(null);
          setLastSourceHistoryReplaySummary(null);
          setPendingSourceHistoryReplay(false);
        }
      } else {
        setSelectedSourceHistory([]);
        setSourceHistoryError(
          normalizeError(
            sourceHistoryResult.reason,
            "Unknown error while loading source history."
          )
        );
        setSelectedSourceHistoryId(null);
        setSelectedSourceHistoryInspection(null);
        setSourceHistoryDetailError(null);
        setSourceHistoryPublicationDraft(
          createEmptyRuntimeSourceHistoryPublicationDraft()
        );
        setSourceHistoryPublicationError(null);
        setLastSourceHistoryPublicationSummary(null);
        setPendingSourceHistoryPublication(false);
        setSourceHistoryReplayDraft(createEmptyRuntimeSourceHistoryReplayDraft());
        setSourceHistoryReplayError(null);
        setLastSourceHistoryReplaySummary(null);
        setPendingSourceHistoryReplay(false);
      }

      if (sessionResult.status === "fulfilled") {
        setSelectedSessions(nextSelectedSessions);
        setSessionError(null);

        if (!selectedSessionId) {
          setSelectedSessionInspection(null);
          setSessionDetailError(null);
          setSessionCancellationError(null);
          setLastSessionCancellation(null);
        } else if (!shouldRefreshSelectedSession) {
          setSelectedSessionId(null);
          setSelectedSessionInspection(null);
          setSessionDetailError(null);
          setSessionCancellationError(null);
          setLastSessionCancellation(null);
        } else if (selectedSessionResult?.status === "fulfilled") {
          if (sessionInspectionReferencesRuntime(selectedSessionResult.value, nodeId)) {
            setSelectedSessionInspection(selectedSessionResult.value);
            setSessionDetailError(null);
          } else {
            setSelectedSessionId(null);
            setSelectedSessionInspection(null);
            setSessionDetailError(null);
            setSessionCancellationError(null);
            setLastSessionCancellation(null);
          }
        } else if (selectedSessionResult?.status === "rejected") {
          setSelectedSessionInspection(null);
          setSessionDetailError(
            normalizeError(
              selectedSessionResult.reason,
              "Unknown error while loading session detail."
            )
          );
        }
      } else {
        setSelectedSessions([]);
        setSessionError(
          normalizeError(
            sessionResult.reason,
            "Unknown error while loading runtime sessions."
          )
        );
        setSelectedSessionInspection(null);
        setSessionDetailError(null);
        setSessionCancellationError(null);
        setLastSessionCancellation(null);
      }
    });
  }, [
    client,
    selectedApprovalId,
    selectedArtifactId,
    selectedMemoryPagePath,
    selectedSourceChangeCandidateId,
    selectedSourceChangeCandidateFilePath,
    selectedSourceHistoryId,
    selectedSessionId,
    selectedTurnId
  ]);

  const offerRuntimeAssignmentFromStudio = useCallback(async () => {
    try {
      setPendingAssignmentOffer(true);
      const request = buildRuntimeAssignmentOfferRequest(assignmentDraft);
      const response = await client.offerAssignment(request);

      await loadOverview();

      startTransition(() => {
        setAssignmentMutationError(null);
        setLastAssignmentOfferSummary(
          `${response.assignment.assignmentId} offered to ${response.assignment.runnerId}`
        );
      });
    } catch (caught: unknown) {
      startTransition(() => {
        setAssignmentMutationError(
          normalizeError(
            caught,
            "Unknown error while offering the runtime assignment."
          )
        );
        setLastAssignmentOfferSummary(null);
      });
    } finally {
      setPendingAssignmentOffer(false);
    }
  }, [assignmentDraft, client, loadOverview]);

  const revokeRuntimeAssignmentFromStudio = useCallback(
    async (assignmentId: string) => {
      try {
        setPendingAssignmentRevokeId(assignmentId);
        const response = await client.revokeAssignment(assignmentId, {
          revokedBy: "studio"
        });

        await loadOverview();

        startTransition(() => {
          setAssignmentMutationError(null);
          setLastAssignmentOfferSummary(
            `${response.assignment.assignmentId} revoked`
          );
        });
      } catch (caught: unknown) {
        startTransition(() => {
          setAssignmentMutationError(
            normalizeError(
              caught,
              "Unknown error while revoking the runtime assignment."
            )
          );
          setLastAssignmentOfferSummary(null);
        });
      } finally {
        setPendingAssignmentRevokeId(null);
      }
    },
    [client, loadOverview]
  );

  const mutateSelectedRuntime = useCallback(
    async (action: RuntimeLifecycleAction) => {
      if (!selectedRuntimeId) {
        return;
      }

      try {
        setPendingRuntimeAction(action);

        switch (action) {
          case "start":
            await client.startRuntime(selectedRuntimeId);
            break;
          case "stop":
            await client.stopRuntime(selectedRuntimeId);
            break;
          case "restart":
            await client.restartRuntime(selectedRuntimeId);
            break;
        }

        await refreshSelectedRuntimeDetails(selectedRuntimeId);

        startTransition(() => {
          setMutationError(null);
        });
      } catch (caught: unknown) {
        startTransition(() => {
          setMutationError(
            normalizeError(caught, `Unknown error while trying to ${action} the runtime.`)
          );
        });
      } finally {
        setPendingRuntimeAction(null);
      }
    },
    [client, refreshSelectedRuntimeDetails, selectedRuntimeId]
  );

  const saveSelectedRuntimeRecoveryPolicy = useCallback(async () => {
    if (!selectedRuntimeId) {
      return;
    }

    try {
      setPendingRecoveryPolicyMutation(true);
      const request =
        buildRuntimeRecoveryPolicyMutationRequest(recoveryPolicyDraft);
      const inspection = await client.setRuntimeRecoveryPolicy(
        selectedRuntimeId,
        request
      );

      startTransition(() => {
        setSelectedRecovery(inspection);
        setRecoveryPolicyDraft(createRuntimeRecoveryPolicyDraft(inspection.policy));
        setRecoveryPolicyError(null);
      });

      await refreshSelectedRuntimeDetails(selectedRuntimeId);
    } catch (caught: unknown) {
      startTransition(() => {
        setRecoveryPolicyError(
          normalizeError(
            caught,
            "Unknown error while updating runtime recovery policy."
          )
        );
      });
    } finally {
      setPendingRecoveryPolicyMutation(false);
    }
  }, [
    client,
    recoveryPolicyDraft,
    refreshSelectedRuntimeDetails,
    selectedRuntimeId
  ]);

  const selectRuntimeSession = useCallback(
    async (sessionId: string) => {
      if (!selectedRuntimeId) {
        return;
      }

      setSelectedSessionId(sessionId);
      setSelectedSessionInspection(null);
      setSessionDetailError(null);
      setSessionCancellationError(null);
      setLastSessionCancellation(null);
      await loadSelectedSessionInspection(selectedRuntimeId, sessionId);
    },
    [loadSelectedSessionInspection, selectedRuntimeId]
  );

  const cancelSelectedSession = useCallback(async () => {
    if (!selectedRuntimeId || !selectedSessionInspection) {
      return;
    }

    const targetRuntimeId = selectedRuntimeId;
    const targetSessionId = selectedSessionInspection.sessionId;
    const targetNodeIds = listCancellableSessionNodeIds(selectedSessionInspection);

    if (targetNodeIds.length === 0) {
      return;
    }

    try {
      setPendingSessionCancellation(true);
      setSessionCancellationError(null);
      setLastSessionCancellation(null);

      const cancellation = await client.cancelSession(targetSessionId, {
        nodeIds: targetNodeIds,
        reason: "Cancelled from Entangle Studio.",
        requestedBy: "studio-operator"
      });

      await refreshSelectedRuntimeDetails(targetRuntimeId);

      if (
        selectedRuntimeIdRef.current !== targetRuntimeId ||
        selectedSessionIdRef.current !== targetSessionId
      ) {
        return;
      }

      startTransition(() => {
        setLastSessionCancellation(cancellation);
        setSessionCancellationError(null);

        if (
          cancellation.inspection &&
          sessionInspectionReferencesRuntime(
            cancellation.inspection,
            targetRuntimeId
          )
        ) {
          setSelectedSessionInspection(cancellation.inspection);
        }
      });
    } catch (caught: unknown) {
      if (
        selectedRuntimeIdRef.current !== targetRuntimeId ||
        selectedSessionIdRef.current !== targetSessionId
      ) {
        return;
      }

      startTransition(() => {
        setSessionCancellationError(
          normalizeError(
            caught,
            "Unknown error while requesting session cancellation."
          )
        );
      });
    } finally {
      setPendingSessionCancellation(false);
    }
  }, [
    client,
    refreshSelectedRuntimeDetails,
    selectedRuntimeId,
    selectedSessionInspection
  ]);

  const selectRuntimeApproval = useCallback(
    async (approvalId: string) => {
      if (!selectedRuntimeId) {
        return;
      }

      setSelectedApprovalId(approvalId);
      setSelectedApprovalInspection(null);
      setApprovalDetailError(null);
      await loadSelectedApprovalInspection(selectedRuntimeId, approvalId);
    },
    [loadSelectedApprovalInspection, selectedRuntimeId]
  );

  const selectRuntimeArtifact = useCallback(
    async (artifactId: string) => {
      if (!selectedRuntimeId) {
        return;
      }

      setSelectedArtifactId(artifactId);
      setSelectedArtifactInspection(null);
      setSelectedArtifactPreview(null);
      setSelectedArtifactHistory(null);
      setSelectedArtifactDiff(null);
      setArtifactDetailError(null);
      await loadSelectedArtifactInspection(selectedRuntimeId, artifactId);
    },
    [loadSelectedArtifactInspection, selectedRuntimeId]
  );

  const selectRuntimeMemoryPage = useCallback(
    async (pagePath: string) => {
      if (!selectedRuntimeId) {
        return;
      }

      setSelectedMemoryPagePath(pagePath);
      setSelectedMemoryPageInspection(null);
      setMemoryPageError(null);
      await loadSelectedMemoryPageInspection(selectedRuntimeId, pagePath);
    },
    [loadSelectedMemoryPageInspection, selectedRuntimeId]
  );

  const selectRuntimeTurn = useCallback(
    async (turnId: string) => {
      if (!selectedRuntimeId) {
        return;
      }

      setSelectedTurnId(turnId);
      setSelectedTurnInspection(null);
      setTurnDetailError(null);
      await loadSelectedTurnInspection(selectedRuntimeId, turnId);
    },
    [loadSelectedTurnInspection, selectedRuntimeId]
  );

  const selectRuntimeSourceChangeCandidate = useCallback(
    async (candidateId: string) => {
      if (!selectedRuntimeId) {
        return;
      }

      setSelectedSourceChangeCandidateId(candidateId);
      setSelectedSourceChangeCandidateInspection(null);
      setSelectedSourceChangeCandidateDiff(null);
      setSelectedSourceChangeCandidateFilePath(null);
      setSelectedSourceChangeCandidateFilePreview(null);
      setSourceChangeCandidateDetailError(null);
      await loadSelectedSourceChangeCandidateInspection(
        selectedRuntimeId,
        candidateId
      );
    },
    [loadSelectedSourceChangeCandidateInspection, selectedRuntimeId]
  );

  const selectRuntimeSourceChangeCandidateFile = useCallback(
    async (filePath: string) => {
      if (!selectedRuntimeId || !selectedSourceChangeCandidateId) {
        return;
      }

      setSelectedSourceChangeCandidateFilePath(filePath);
      setSelectedSourceChangeCandidateFilePreview(null);
      setSourceChangeCandidateDetailError(null);
      await loadSelectedSourceChangeCandidateFilePreview(
        selectedRuntimeId,
        selectedSourceChangeCandidateId,
        filePath
      );
    },
    [
      loadSelectedSourceChangeCandidateFilePreview,
      selectedRuntimeId,
      selectedSourceChangeCandidateId
    ]
  );

  const selectRuntimeSourceHistory = useCallback(
    async (sourceHistoryId: string) => {
      if (!selectedRuntimeId) {
        return;
      }

      setSelectedSourceHistoryId(sourceHistoryId);
      setSelectedSourceHistoryInspection(null);
      setSourceHistoryDetailError(null);
      setSourceHistoryPublicationDraft(
        createEmptyRuntimeSourceHistoryPublicationDraft()
      );
      setSourceHistoryPublicationError(null);
      setLastSourceHistoryPublicationSummary(null);
      setPendingSourceHistoryPublication(false);
      setSourceHistoryReplayDraft(createEmptyRuntimeSourceHistoryReplayDraft());
      setSourceHistoryReplayError(null);
      setLastSourceHistoryReplaySummary(null);
      setPendingSourceHistoryReplay(false);

      try {
        const response = await client.getRuntimeSourceHistory(
          selectedRuntimeId,
          sourceHistoryId
        );

        startTransition(() => {
          setSelectedSourceHistoryInspection(response);
          setSourceHistoryDetailError(null);
        });
      } catch (caught: unknown) {
        startTransition(() => {
          setSelectedSourceHistoryInspection(null);
          setSourceHistoryDetailError(
            normalizeError(
              caught,
              "Unknown error while loading source history detail."
            )
          );
        });
      }
    },
    [client, selectedRuntimeId]
  );

  const requestRuntimeSourceHistoryReplay = useCallback(async () => {
    if (!selectedRuntimeId || !selectedSourceHistoryInspection) {
      return;
    }

    const sourceHistoryId =
      selectedSourceHistoryInspection.entry.sourceHistoryId;

    setPendingSourceHistoryReplay(true);
    setSourceHistoryReplayError(null);
    setLastSourceHistoryReplaySummary(null);

    try {
      const response = await client.replayRuntimeSourceHistory(
        selectedRuntimeId,
        sourceHistoryId,
        buildRuntimeSourceHistoryReplayRequest(sourceHistoryReplayDraft)
      );

      startTransition(() => {
        setLastSourceHistoryReplaySummary(
          formatRuntimeSourceHistoryReplayRequestSummary(response)
        );
        setSourceHistoryReplayDraft(createEmptyRuntimeSourceHistoryReplayDraft());
        setSourceHistoryReplayError(null);
      });

      await refreshSelectedRuntimeDetails(selectedRuntimeId);
    } catch (caught: unknown) {
      startTransition(() => {
        setSourceHistoryReplayError(
          normalizeError(
            caught,
            "Unknown error while requesting source history replay."
          )
        );
      });
    } finally {
      setPendingSourceHistoryReplay(false);
    }
  }, [
    client,
    refreshSelectedRuntimeDetails,
    selectedRuntimeId,
    selectedSourceHistoryInspection,
    sourceHistoryReplayDraft
  ]);

  const requestRuntimeSourceHistoryPublication = useCallback(async () => {
    if (!selectedRuntimeId || !selectedSourceHistoryInspection) {
      return;
    }

    const sourceHistoryId =
      selectedSourceHistoryInspection.entry.sourceHistoryId;

    setPendingSourceHistoryPublication(true);
    setSourceHistoryPublicationError(null);
    setLastSourceHistoryPublicationSummary(null);

    try {
      const response = await client.publishRuntimeSourceHistory(
        selectedRuntimeId,
        sourceHistoryId,
        buildRuntimeSourceHistoryPublicationRequest(
          sourceHistoryPublicationDraft
        )
      );

      startTransition(() => {
        setLastSourceHistoryPublicationSummary(
          formatRuntimeSourceHistoryPublicationRequestSummary(response)
        );
        setSourceHistoryPublicationDraft(
          createEmptyRuntimeSourceHistoryPublicationDraft()
        );
        setSourceHistoryPublicationError(null);
      });

      await refreshSelectedRuntimeDetails(selectedRuntimeId);
    } catch (caught: unknown) {
      startTransition(() => {
        setSourceHistoryPublicationError(
          normalizeError(
            caught,
            "Unknown error while requesting source history publication."
          )
        );
      });
    } finally {
      setPendingSourceHistoryPublication(false);
    }
  }, [
    client,
    refreshSelectedRuntimeDetails,
    selectedRuntimeId,
    selectedSourceHistoryInspection,
    sourceHistoryPublicationDraft
  ]);

  const requestRuntimeWikiPublication = useCallback(async () => {
    if (!selectedRuntimeId) {
      return;
    }

    setPendingWikiPublication(true);
    setWikiPublicationError(null);
    setLastWikiPublicationSummary(null);

    try {
      const response = await client.publishRuntimeWikiRepository(
        selectedRuntimeId,
        buildRuntimeWikiPublicationRequest(wikiPublicationDraft)
      );

      startTransition(() => {
        setLastWikiPublicationSummary(
          formatRuntimeWikiPublicationRequestSummary(response)
        );
        setWikiPublicationDraft(createEmptyRuntimeWikiPublicationDraft());
        setWikiPublicationError(null);
      });

      await refreshSelectedRuntimeDetails(selectedRuntimeId);
    } catch (caught: unknown) {
      startTransition(() => {
        setWikiPublicationError(
          normalizeError(
            caught,
            "Unknown error while requesting wiki publication."
          )
        );
      });
    } finally {
      setPendingWikiPublication(false);
    }
  }, [
    client,
    refreshSelectedRuntimeDetails,
    selectedRuntimeId,
    wikiPublicationDraft
  ]);

  const selectGraphRevision = useCallback(
    async (revisionId: string) => {
      setSelectedGraphRevisionId(revisionId);
      setSelectedGraphRevisionInspection(null);
      setGraphRevisionDetailError(null);
      await loadSelectedGraphRevisionInspection(revisionId);
    },
    [loadSelectedGraphRevisionInspection]
  );

  const graphNodeIds = useMemo(
    () => graphInspection?.graph?.nodes.map((node) => node.nodeId) ?? [],
    [graphInspection]
  );
  const managedGraphNodes = useMemo(
    () => sortManagedGraphNodes(graphInspection?.graph),
    [graphInspection]
  );
  const agentEngineProfiles = useMemo(
    () =>
      [...(catalogInspection?.catalog?.agentEngineProfiles ?? [])].sort((left, right) =>
        `${left.displayName} ${left.id}`.localeCompare(
          `${right.displayName} ${right.id}`
        )
      ),
    [catalogInspection]
  );
  const graphEdges = useMemo(
    () => sortGraphEdges(graphInspection?.graph?.edges ?? []),
    [graphInspection]
  );

  const resetManagedNodeDraft = useCallback(() => {
    setSelectedManagedNodeId(null);
    setNodeDraft(createDefaultManagedNodeEditorDraft(packageSources));
    setNodeMutationError(null);
  }, [packageSources]);

  const selectManagedNode = useCallback(
    (nodeId: string) => {
      const node = managedGraphNodes.find((candidate) => candidate.nodeId === nodeId);

      if (!node) {
        return;
      }

      setSelectedManagedNodeId(nodeId);
      setSelectedRuntimeId(nodeId);
      setNodeDraft(buildManagedNodeEditorDraft(node));
      setNodeMutationError(null);
    },
    [managedGraphNodes]
  );

  const mutateManagedNode = useCallback(
    async (action: NodeMutationAction) => {
      try {
        setPendingNodeMutation(action);

        if (action === "delete") {
          if (!selectedManagedNodeId) {
            return;
          }

          await client.deleteNode(selectedManagedNodeId);
          await loadOverview();

          if (selectedRuntimeId === selectedManagedNodeId) {
            setSelectedRuntimeId(null);
          }

          setSelectedManagedNodeId(null);
          setNodeDraft(createDefaultManagedNodeEditorDraft(packageSources));
          setNodeMutationError(null);
          return;
        }

        const response =
          action === "create"
            ? await client.createNode(buildManagedNodeCreateRequest(nodeDraft))
            : selectedManagedNodeId
              ? await client.replaceNode(
                  selectedManagedNodeId,
                  buildManagedNodeReplacementRequest(nodeDraft)
                )
              : null;

        if (!response) {
          return;
        }

        const validationMessage = summarizeValidationReport(response.validation);

        if (validationMessage) {
          setNodeMutationError(validationMessage);
          return;
        }

        await loadOverview();

        const nextNodeId = response.node?.binding.node.nodeId ?? nodeDraft.nodeId;
        setSelectedManagedNodeId(nextNodeId);
        setSelectedRuntimeId(nextNodeId);
        setNodeMutationError(null);
      } catch (caught: unknown) {
        setNodeMutationError(
          normalizeError(
            caught,
            `Unknown error while trying to ${action} the managed node.`
          )
        );
      } finally {
        setPendingNodeMutation(null);
      }
    },
    [
      client,
      loadOverview,
      nodeDraft,
      packageSources,
      selectedManagedNodeId,
      selectedRuntimeId
    ]
  );

  const admitPackageSource = useCallback(async () => {
    try {
      setPendingPackageAdmission(true);

      const response = await client.admitPackageSource(
        buildPackageSourceAdmissionRequest(packageAdmissionDraft)
      );
      const validationMessage = summarizeValidationReport(response.validation);

      if (validationMessage) {
        setPackageAdmissionError(validationMessage);
        return;
      }

      await loadOverview();
      setPackageAdmissionError(null);
      setPackageDeletionError(null);
      setPackageAdmissionDraft(createEmptyPackageSourceAdmissionDraft());
    } catch (caught: unknown) {
      setPackageAdmissionError(
        normalizeError(
          caught,
          "Unknown error while admitting the package source."
        )
      );
    } finally {
      setPendingPackageAdmission(false);
    }
  }, [client, loadOverview, packageAdmissionDraft]);

  const deletePackageSource = useCallback(
    async (packageSourceId: string) => {
      try {
        setPendingPackageSourceDeletionId(packageSourceId);
        setPackageDeletionError(null);

        await client.deletePackageSource(packageSourceId);
        await loadOverview();

        setPackageAdmissionError(null);
        setPackageAdmissionDraft((current) =>
          current.packageSourceId.trim() === packageSourceId
            ? {
                ...current,
                packageSourceId: ""
              }
            : current
        );
        setNodeDraft((current) =>
          current.packageSourceRef === packageSourceId
            ? {
                ...current,
                packageSourceRef: ""
              }
            : current
        );
      } catch (caught: unknown) {
        setPackageDeletionError(
          normalizeError(
            caught,
            "Unknown error while deleting the package source."
          )
        );
      } finally {
        setPendingPackageSourceDeletionId(null);
      }
    },
    [client, loadOverview]
  );

  const deleteExternalPrincipal = useCallback(
    async (principalId: string) => {
      try {
        setPendingExternalPrincipalDeletionId(principalId);
        setExternalPrincipalDeletionError(null);

        await client.deleteExternalPrincipal(principalId);
        await loadOverview();

        setNodeDraft((current) => ({
          ...current,
          resourceBindings: {
            ...current.resourceBindings,
            externalPrincipalRefs:
              current.resourceBindings.externalPrincipalRefs.filter(
                (externalPrincipalRef) => externalPrincipalRef !== principalId
              )
          }
        }));
      } catch (caught: unknown) {
        setExternalPrincipalDeletionError(
          normalizeError(
            caught,
            "Unknown error while deleting the external principal."
          )
        );
      } finally {
        setPendingExternalPrincipalDeletionId(null);
      }
    },
    [client, loadOverview]
  );

  const resetEdgeDraft = useCallback(() => {
    setSelectedEdgeId(null);
    setEdgeDraft(createDefaultEdgeEditorDraft(graphInspection?.graph));
    setEdgeMutationError(null);
  }, [graphInspection]);

  const selectEdge = useCallback(
    (edgeId: string) => {
      const edge = graphEdges.find((candidate) => candidate.edgeId === edgeId);

      if (!edge) {
        return;
      }

      setSelectedEdgeId(edgeId);
      setEdgeDraft(buildEdgeEditorDraft(edge));
      setEdgeMutationError(null);
    },
    [graphEdges]
  );

  const mutateSelectedEdge = useCallback(
    async (action: EdgeMutationAction) => {
      if (!graphInspection?.graph) {
        return;
      }

      try {
        setPendingEdgeMutation(action);

        if (action === "delete") {
          if (!selectedEdgeId) {
            return;
          }

          await client.deleteEdge(selectedEdgeId);
          await loadOverview();
          setSelectedEdgeId(null);
          setEdgeDraft(createEmptyEdgeEditorDraft());
          setEdgeMutationError(null);
          return;
        }

        const response =
          action === "create"
            ? await client.createEdge(buildEdgeCreateRequest(edgeDraft))
            : selectedEdgeId
              ? await client.replaceEdge(
                  selectedEdgeId,
                  buildEdgeReplacementRequest(edgeDraft)
                )
              : null;

        if (!response) {
          return;
        }

        const validationMessage = summarizeValidationReport(response.validation);

        if (validationMessage) {
          setEdgeMutationError(validationMessage);
          return;
        }

        await loadOverview();
        setSelectedEdgeId(response.edge?.edgeId ?? edgeDraft.edgeId);
        setEdgeMutationError(null);
      } catch (caught: unknown) {
        setEdgeMutationError(
          normalizeError(
            caught,
            `Unknown error while trying to ${action} the edge.`
          )
        );
      } finally {
        setPendingEdgeMutation(null);
      }
    },
    [client, edgeDraft, graphInspection, loadOverview, selectedEdgeId]
  );

  const scheduleOverviewRefresh = useEffectEvent(() => {
    if (overviewRefreshTimeoutRef.current !== null) {
      return;
    }

    overviewRefreshTimeoutRef.current = globalThis.setTimeout(() => {
      overviewRefreshTimeoutRef.current = null;
      void loadOverview();
    }, 150);
  });

  const scheduleSelectedRuntimeRefresh = useEffectEvent(() => {
    if (selectedRuntimeRefreshTimeoutRef.current !== null) {
      return;
    }

    selectedRuntimeRefreshTimeoutRef.current = globalThis.setTimeout(() => {
      selectedRuntimeRefreshTimeoutRef.current = null;

      if (!selectedRuntimeId) {
        return;
      }

      void refreshSelectedRuntimeDetails(selectedRuntimeId);
    }, 150);
  });

  const handleHostEvent = useEffectEvent((event: HostEventRecord) => {
    startTransition(() => {
      setHostEvents((current) => [event, ...current].slice(0, 40));
    });

    if (shouldRefreshOverviewFromHostEvent(event)) {
      scheduleOverviewRefresh();
    }

    if (shouldRefreshSelectedRuntimeFromHostEvent(event, selectedRuntimeId)) {
      scheduleSelectedRuntimeRefresh();
    }
  });

  const handleEventStreamOpen = useEffectEvent(() => {
    setEventStreamState("live");
    setEventStreamError(null);
    scheduleOverviewRefresh();

    if (selectedRuntimeId) {
      scheduleSelectedRuntimeRefresh();
    }
  });

  useEffect(() => {
    void loadOverview();
  }, [client, loadOverview]);

  useEffect(() => {
    setSelectedRuntimeId((current) => deriveSelectedRuntimeId(runtimes, current));
  }, [runtimes]);

  useEffect(() => {
    setGraphValidationResult(null);
    setGraphValidationError(null);
  }, [graphInspection?.activeRevisionId]);

  useEffect(() => {
    if (!selectedRuntimeId) {
      setApprovalError(null);
      setSelectedApprovals([]);
      setSelectedApprovalId(null);
      setSelectedApprovalInspection(null);
      setApprovalDetailError(null);
      setArtifactError(null);
      setSelectedArtifacts([]);
      setSelectedArtifactId(null);
      setSelectedArtifactInspection(null);
      setSelectedArtifactPreview(null);
      setSelectedArtifactHistory(null);
      setSelectedArtifactDiff(null);
      setArtifactDetailError(null);
      setSelectedMemory(null);
      setSelectedMemoryPagePath(null);
      setSelectedMemoryPageInspection(null);
      setMemoryError(null);
      setMemoryPageError(null);
      setWikiPublicationDraft(createEmptyRuntimeWikiPublicationDraft());
      setWikiPublicationError(null);
      setLastWikiPublicationSummary(null);
      setPendingWikiPublication(false);
      setTurnError(null);
      setSelectedTurns([]);
      setSelectedTurnId(null);
      setSelectedTurnInspection(null);
      setTurnDetailError(null);
      setSourceChangeCandidateError(null);
      setSelectedSourceChangeCandidates([]);
      setSelectedSourceChangeCandidateId(null);
      setSelectedSourceChangeCandidateInspection(null);
      setSelectedSourceChangeCandidateDiff(null);
      setSelectedSourceChangeCandidateFilePath(null);
      setSelectedSourceChangeCandidateFilePreview(null);
      setSourceChangeCandidateDetailError(null);
      setSelectedSourceHistory([]);
      setSourceHistoryError(null);
      setSelectedSourceHistoryId(null);
      setSelectedSourceHistoryInspection(null);
      setSourceHistoryDetailError(null);
      setSourceHistoryPublicationDraft(
        createEmptyRuntimeSourceHistoryPublicationDraft()
      );
      setSourceHistoryPublicationError(null);
      setLastSourceHistoryPublicationSummary(null);
      setPendingSourceHistoryPublication(false);
      setSourceHistoryReplayDraft(createEmptyRuntimeSourceHistoryReplayDraft());
      setSourceHistoryReplayError(null);
      setLastSourceHistoryReplaySummary(null);
      setPendingSourceHistoryReplay(false);
      setSessionError(null);
      setSelectedSessions([]);
      setSelectedSessionId(null);
      setSelectedSessionInspection(null);
      setSessionDetailError(null);
      setSessionLaunchDraft(createDefaultSessionLaunchDraft(null));
      setSessionLaunchError(null);
      setLastSessionLaunch(null);
      setSessionCancellationError(null);
      setLastSessionCancellation(null);
      setPendingSessionCancellation(false);
      setSelectedRecovery(null);
      setMutationError(null);
      setRecoveryError(null);
      setRecoveryPolicyDraft(createRuntimeRecoveryPolicyDraft());
      setRecoveryPolicyError(null);
      return;
    }

    setApprovalError(null);
    setSelectedApprovals([]);
    setSelectedApprovalId(null);
    setSelectedApprovalInspection(null);
    setApprovalDetailError(null);
    setArtifactError(null);
    setSelectedArtifacts([]);
    setSelectedArtifactId(null);
    setSelectedArtifactInspection(null);
    setSelectedArtifactPreview(null);
    setSelectedArtifactHistory(null);
    setSelectedArtifactDiff(null);
    setArtifactDetailError(null);
    setSelectedMemory(null);
    setSelectedMemoryPagePath(null);
    setSelectedMemoryPageInspection(null);
    setMemoryError(null);
    setMemoryPageError(null);
    setWikiPublicationDraft(createEmptyRuntimeWikiPublicationDraft());
    setWikiPublicationError(null);
    setLastWikiPublicationSummary(null);
    setPendingWikiPublication(false);
    setTurnError(null);
    setSelectedTurns([]);
    setSelectedTurnId(null);
    setSelectedTurnInspection(null);
    setTurnDetailError(null);
    setSourceChangeCandidateError(null);
    setSelectedSourceChangeCandidates([]);
    setSelectedSourceChangeCandidateId(null);
    setSelectedSourceChangeCandidateInspection(null);
    setSelectedSourceChangeCandidateDiff(null);
    setSelectedSourceChangeCandidateFilePath(null);
    setSelectedSourceChangeCandidateFilePreview(null);
    setSourceChangeCandidateDetailError(null);
    setSelectedSourceHistory([]);
    setSourceHistoryError(null);
    setSelectedSourceHistoryId(null);
    setSelectedSourceHistoryInspection(null);
    setSourceHistoryDetailError(null);
    setSourceHistoryPublicationDraft(
      createEmptyRuntimeSourceHistoryPublicationDraft()
    );
    setSourceHistoryPublicationError(null);
    setLastSourceHistoryPublicationSummary(null);
    setPendingSourceHistoryPublication(false);
    setSourceHistoryReplayDraft(createEmptyRuntimeSourceHistoryReplayDraft());
    setSourceHistoryReplayError(null);
    setLastSourceHistoryReplaySummary(null);
    setPendingSourceHistoryReplay(false);
    setSessionError(null);
    setSelectedSessions([]);
    setSelectedSessionId(null);
    setSelectedSessionInspection(null);
    setSessionDetailError(null);
    setSessionLaunchError(null);
    setLastSessionLaunch(null);
    setSessionCancellationError(null);
    setLastSessionCancellation(null);
    setPendingSessionCancellation(false);
    setMutationError(null);
    setSelectedRecovery(null);
    setRecoveryPolicyError(null);
    void refreshSelectedRuntimeDetails(selectedRuntimeId);
  }, [refreshSelectedRuntimeDetails, selectedRuntimeId]);

  useEffect(() => {
    const nextPolicySeed = selectedRecovery
      ? JSON.stringify(selectedRecovery.policy)
      : null;

    if (recoveryPolicySeedRef.current === nextPolicySeed) {
      return;
    }

    recoveryPolicySeedRef.current = nextPolicySeed;

    if (!selectedRecovery) {
      setRecoveryPolicyDraft(createRuntimeRecoveryPolicyDraft());
      return;
    }

    setRecoveryPolicyDraft(createRuntimeRecoveryPolicyDraft(selectedRecovery.policy));
    setRecoveryPolicyError(null);
  }, [selectedRecovery]);

  useEffect(() => {
    if (!graphInspection?.graph) {
      setSelectedManagedNodeId(null);
      setNodeDraft(createEmptyManagedNodeEditorDraft());
      setNodeMutationError(null);
      setSelectedEdgeId(null);
      setEdgeDraft(createEmptyEdgeEditorDraft());
      setEdgeMutationError(null);
      return;
    }

    if (selectedManagedNodeId) {
      const selectedNode = managedGraphNodes.find(
        (node) => node.nodeId === selectedManagedNodeId
      );

      if (selectedNode) {
        setNodeDraft(buildManagedNodeEditorDraft(selectedNode));
      } else {
        setSelectedManagedNodeId(null);
        setNodeDraft(createDefaultManagedNodeEditorDraft(packageSources));
      }
    } else {
      setNodeDraft((current) =>
        isManagedNodeEditorDraftUninitialized(current)
          ? createDefaultManagedNodeEditorDraft(packageSources)
          : current
      );
    }

    if (selectedEdgeId) {
      const selectedEdge = graphEdges.find((edge) => edge.edgeId === selectedEdgeId);

      if (selectedEdge) {
        setEdgeDraft(buildEdgeEditorDraft(selectedEdge));
        return;
      }

      setSelectedEdgeId(null);
      setEdgeDraft(createDefaultEdgeEditorDraft(graphInspection.graph));
      return;
    }

    setEdgeDraft((current) =>
      isEdgeEditorDraftUninitialized(current)
        ? createDefaultEdgeEditorDraft(graphInspection.graph)
        : current
    );
  }, [
    graphEdges,
    graphInspection,
    managedGraphNodes,
    packageSources,
    selectedEdgeId,
    selectedManagedNodeId
  ]);

  useEffect(() => {
    return () => {
      if (overviewRefreshTimeoutRef.current !== null) {
        globalThis.clearTimeout(overviewRefreshTimeoutRef.current);
        overviewRefreshTimeoutRef.current = null;
      }

      if (selectedRuntimeRefreshTimeoutRef.current !== null) {
        globalThis.clearTimeout(selectedRuntimeRefreshTimeoutRef.current);
        selectedRuntimeRefreshTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setEventStreamState("connecting");
    setEventStreamError(null);

    const subscription = client.subscribeToEvents({
      onClose: () => {
        setEventStreamState((current) => (current === "error" ? current : "closed"));
      },
      onError: (caught) => {
        setEventStreamState("error");
        setEventStreamError(caught.message);
      },
      onEvent: (event) => {
        handleHostEvent(event);
      },
      onOpen: () => {
        handleEventStreamOpen();
      },
      replay: 20
    });

    return () => {
      subscription.close(1000, "Studio unmounted.");
    };
  }, [client]);

  const selectedRuntime = useMemo(
    () =>
      runtimes.find((runtime) => runtime.nodeId === selectedRuntimeId) ??
      selectedRecovery?.currentRuntime,
    [runtimes, selectedRecovery, selectedRuntimeId]
  );
  const sessionLaunchDraftReady = useMemo(
    () => isSessionLaunchDraftReady(selectedRuntime, sessionLaunchDraft),
    [selectedRuntime, sessionLaunchDraft]
  );
  const launchSelectedRuntimeSession = useCallback(async () => {
    if (!selectedRuntime) {
      return;
    }

    try {
      setPendingSessionLaunch(true);
      setSessionLaunchError(null);

      const launch = await client.launchSession(
        buildSessionLaunchRequest(selectedRuntime, sessionLaunchDraft)
      );

      await refreshSelectedRuntimeDetails(selectedRuntime.nodeId);

      startTransition(() => {
        setLastSessionLaunch(launch);
        setSelectedSessionId(launch.sessionId);
        setSelectedSessionInspection(null);
        setSessionDetailError(null);
        setSessionCancellationError(null);
        setLastSessionCancellation(null);
      });
    } catch (caught: unknown) {
      startTransition(() => {
        setSessionLaunchError(
          normalizeError(
            caught,
            "Unknown error while launching the runtime session."
          )
        );
      });
    } finally {
      setPendingSessionLaunch(false);
    }
  }, [
    client,
    refreshSelectedRuntimeDetails,
    selectedRuntime,
    sessionLaunchDraft
  ]);
  const selectedSessionNodes = useMemo(
    () =>
      selectedRuntimeId && selectedSessionInspection
        ? sortSessionInspectionNodes(selectedSessionInspection, selectedRuntimeId)
        : [],
    [selectedRuntimeId, selectedSessionInspection]
  );
  const selectedSessionTraceIds = useMemo(
    () =>
      selectedSessionInspection
        ? collectSessionInspectionTraceIds(selectedSessionInspection)
        : [],
    [selectedSessionInspection]
  );
  const selectedSessionCancellableNodeIds = useMemo(
    () =>
      selectedSessionInspection
        ? listCancellableSessionNodeIds(selectedSessionInspection)
        : [],
    [selectedSessionInspection]
  );
  const selectedSessionCancellationTargetSummary = useMemo(
    () => formatSessionCancellationTargetSummary(selectedSessionCancellableNodeIds),
    [selectedSessionCancellableNodeIds]
  );
  const selectedMemoryFocusedRegisters = useMemo(
    () =>
      selectedMemory
        ? sortRuntimeMemoryPagesForPresentation(selectedMemory.focusedRegisters)
        : [],
    [selectedMemory]
  );
  const selectedMemoryTaskPages = useMemo(
    () =>
      selectedMemory
        ? sortRuntimeMemoryPagesForPresentation(selectedMemory.taskPages)
        : [],
    [selectedMemory]
  );
  const selectedMemorySupportingPages = useMemo(() => {
    if (!selectedMemory) {
      return [];
    }

    const highlightedPaths = new Set(
      [...selectedMemory.focusedRegisters, ...selectedMemory.taskPages].map(
        (page) => page.path
      )
    );

    return sortRuntimeMemoryPagesForPresentation(
      selectedMemory.pages.filter((page) => !highlightedPaths.has(page.path))
    );
  }, [selectedMemory]);
  const statusTone = useMemo(() => status?.status ?? "pending", [status]);
  const federationSummary = useMemo(
    () => summarizeFederationProjection(projectionSnapshot),
    [projectionSnapshot]
  );
  const projectedUserConversations = useMemo(
    () =>
      sortUserConversationsForStudio(
        projectionSnapshot?.userConversations ?? []
      ),
    [projectionSnapshot]
  );
  const projectedRuntimeStates = useMemo(
    () => sortRuntimeProjectionsForStudio(projectionSnapshot?.runtimes ?? []),
    [projectionSnapshot]
  );
  const userNodeRuntimeSummaries = useMemo(
    () => buildUserNodeRuntimeSummaries(userNodes, projectionSnapshot),
    [projectionSnapshot, userNodes]
  );
  const assignmentNodeOptions = useMemo(
    () => buildRuntimeAssignmentNodeOptions(graphInspection?.graph),
    [graphInspection]
  );
  const assignmentRunnerOptions = useMemo(
    () => buildRuntimeAssignmentRunnerOptions(projectionSnapshot),
    [projectionSnapshot]
  );
  const assignmentProjectionRows = useMemo(
    () =>
      sortAssignmentProjectionsForStudio(projectionSnapshot?.assignments ?? []),
    [projectionSnapshot]
  );
  const assignmentReceiptRows = useMemo(
    () =>
      sortAssignmentReceiptsForStudio(
        projectionSnapshot?.assignmentReceipts ?? []
      ),
    [projectionSnapshot]
  );
  const flowProjection = useMemo(
    () => projectGraphToFlow(graphInspection?.graph, selectedRuntimeId, selectedEdgeId),
    [graphInspection, selectedEdgeId, selectedRuntimeId]
  );
  const selectedGraphRevisionDiff = useMemo(
    () =>
      graphInspection?.graph && selectedGraphRevisionInspection
        ? buildGraphDiff(
            selectedGraphRevisionInspection.graph,
            graphInspection.graph
          )
        : null,
    [graphInspection, selectedGraphRevisionInspection]
  );
  const selectedGraphRevisionDiffSections = useMemo(() => {
    if (!selectedGraphRevisionDiff?.hasChanges) {
      return [];
    }

    return [
      {
        rows: selectedGraphRevisionDiff.nodes.added.map(formatGraphNodeDiffLine),
        title: "Added nodes"
      },
      {
        rows: selectedGraphRevisionDiff.nodes.changed.map(
          formatChangedGraphNodeDiffLine
        ),
        title: "Changed nodes"
      },
      {
        rows: selectedGraphRevisionDiff.nodes.removed.map(formatGraphNodeDiffLine),
        title: "Removed nodes"
      },
      {
        rows: selectedGraphRevisionDiff.edges.added.map(formatGraphEdgeDiffLine),
        title: "Added edges"
      },
      {
        rows: selectedGraphRevisionDiff.edges.changed.map(
          formatChangedGraphEdgeDiffLine
        ),
        title: "Changed edges"
      },
      {
        rows: selectedGraphRevisionDiff.edges.removed.map(formatGraphEdgeDiffLine),
        title: "Removed edges"
      }
    ].filter((section) => section.rows.length > 0);
  }, [selectedGraphRevisionDiff]);
  const recoveryEvents = useMemo(
    () =>
      selectedRuntimeId
        ? collectRuntimeRecoveryEvents(hostEvents, selectedRuntimeId, 10)
        : [],
    [hostEvents, selectedRuntimeId]
  );
  const runtimeTraceEvents = useMemo(
    () =>
      selectedRuntimeId
        ? collectRuntimeTraceEvents(hostEvents, selectedRuntimeId, 12)
        : [],
    [hostEvents, selectedRuntimeId]
  );
  const runtimeStateTone = useMemo(
    () => formatRuntimeStateTone(selectedRuntime),
    [selectedRuntime]
  );
  const recoveryPolicyDraftValid = useMemo(
    () => isRuntimeRecoveryPolicyDraftValid(recoveryPolicyDraft),
    [recoveryPolicyDraft]
  );
  const recoveryPolicyDraftChanged = useMemo(
    () =>
      hasRuntimeRecoveryPolicyDraftChanged(
        selectedRecovery?.policy ?? null,
        recoveryPolicyDraft
      ),
    [recoveryPolicyDraft, selectedRecovery]
  );

  useEffect(() => {
    const nextSeed = selectedRuntime?.nodeId ?? null;

    if (sessionLaunchDraftSeedRef.current === nextSeed) {
      return;
    }

    sessionLaunchDraftSeedRef.current = nextSeed;
    setSessionLaunchDraft(createDefaultSessionLaunchDraft(selectedRuntime));
    setSessionLaunchError(null);
    setLastSessionLaunch(null);
  }, [selectedRuntime]);

  useEffect(() => {
    setAssignmentDraft((current) =>
      normalizeRuntimeAssignmentControlDraft({
        draft: current,
        nodeOptions: assignmentNodeOptions,
        runnerOptions: assignmentRunnerOptions
      })
    );
  }, [assignmentNodeOptions, assignmentRunnerOptions]);

  return (
    <main className="studio-shell">
      <section className="hero-card">
        <p className="eyebrow">Entangle Studio</p>
        <h1>Graph-native control surface for an AI organization</h1>
        <p className="lede">
          Studio now inspects live runtime recovery, reconciliation, and trace
          state from the host instead of stopping at topology. Select a managed
          runtime to inspect policy, controller state, durable recovery history,
          reconciliation findings, and the broader session, conversation,
          approval, artifact, runner turn, and trace activity that the host is actually
          emitting.
        </p>
      </section>

      <section className="panel federation-panel">
        <div className="panel-header">
          <h2>Federation</h2>
          <span className="panel-caption">
            Projection {federationSummary.freshness}
          </span>
        </div>

        {projectionError ? <p className="error-box">{projectionError}</p> : null}
        {userNodeError ? <p className="error-box">{userNodeError}</p> : null}

        <div className="metric-grid">
          <div>
            <strong>{federationSummary.runnerCount}</strong>
            <span>Runners</span>
          </div>
          <div>
            <strong>{federationSummary.assignmentCount}</strong>
            <span>Assignments</span>
          </div>
          <div>
            <strong>{federationSummary.assignmentReceiptCount}</strong>
            <span>Receipts</span>
          </div>
          <div>
            <strong>{federationSummary.runtimeCount}</strong>
            <span>Runtimes</span>
          </div>
          <div>
            <strong>{federationSummary.runningRuntimeCount}</strong>
            <span>Running</span>
          </div>
          <div>
            <strong>{federationSummary.failedRuntimeCount}</strong>
            <span>Failed</span>
          </div>
          <div>
            <strong>{federationSummary.artifactRefCount}</strong>
            <span>Artifact refs</span>
          </div>
          <div>
            <strong>{federationSummary.sourceChangeRefCount}</strong>
            <span>Source refs</span>
          </div>
          <div>
            <strong>{federationSummary.sourceHistoryRefCount}</strong>
            <span>History refs</span>
          </div>
          <div>
            <strong>{federationSummary.sourceHistoryReplayCount}</strong>
            <span>History replays</span>
          </div>
          <div>
            <strong>{federationSummary.wikiRefCount}</strong>
            <span>Wiki refs</span>
          </div>
          <div>
            <strong>{userNodes.length}</strong>
            <span>User Nodes</span>
          </div>
          <div>
            <strong>{federationSummary.userConversationCount}</strong>
            <span>Conversations</span>
          </div>
        </div>

        <form
          className="artifact-detail-card"
          onSubmit={(event) => {
            event.preventDefault();
            void offerRuntimeAssignmentFromStudio();
          }}
        >
          <div className="section-header">
            <h3>Runtime Assignment</h3>
            <span className="panel-caption">
              {pendingAssignmentOffer ? "offering" : "control"}
            </span>
          </div>
          <div className="field-grid">
            <label className="field">
              <span>Node</span>
              <select
                disabled={assignmentNodeOptions.length === 0 || pendingAssignmentOffer}
                onChange={(event) => {
                  setAssignmentDraft((current) => ({
                    ...current,
                    nodeId: event.target.value
                  }));
                }}
                value={assignmentDraft.nodeId}
              >
                {assignmentNodeOptions.length === 0 ? (
                  <option value="">No graph nodes</option>
                ) : null}
                {assignmentNodeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Trusted Runner</span>
              <select
                disabled={assignmentRunnerOptions.length === 0 || pendingAssignmentOffer}
                onChange={(event) => {
                  setAssignmentDraft((current) => ({
                    ...current,
                    runnerId: event.target.value
                  }));
                }}
                value={assignmentDraft.runnerId}
              >
                {assignmentRunnerOptions.length === 0 ? (
                  <option value="">No trusted runners</option>
                ) : null}
                {assignmentRunnerOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Lease Seconds</span>
              <input
                disabled={pendingAssignmentOffer}
                min="1"
                onChange={(event) => {
                  setAssignmentDraft((current) => ({
                    ...current,
                    leaseDurationSeconds: event.target.value
                  }));
                }}
                type="number"
                value={assignmentDraft.leaseDurationSeconds}
              />
            </label>
          </div>
          <div className="action-row">
            <button
              className="action-button"
              disabled={
                pendingAssignmentOffer ||
                assignmentNodeOptions.length === 0 ||
                assignmentRunnerOptions.length === 0
              }
              type="submit"
            >
              {pendingAssignmentOffer ? "Offering..." : "Offer Assignment"}
            </button>
            {lastAssignmentOfferSummary ? (
              <span className="panel-caption">{lastAssignmentOfferSummary}</span>
            ) : null}
          </div>
          {assignmentMutationError ? (
            <p className="error-box">{assignmentMutationError}</p>
          ) : null}
        </form>

        {assignmentProjectionRows.length > 0 ? (
          <div className="compact-list">
            {assignmentProjectionRows.slice(0, 6).map((assignment) => (
              <div key={assignment.assignmentId} className="compact-list-item">
                <strong>{formatAssignmentProjectionLabel(assignment)}</strong>
                <span>{formatAssignmentProjectionDetail(assignment)}</span>
                <span>
                  {summarizeAssignmentReceiptsForStudio({
                    assignment,
                    receipts: assignmentReceiptRows
                  })}
                </span>
                <button
                  className="action-button"
                  disabled={
                    pendingAssignmentRevokeId !== null ||
                    !canRevokeAssignmentProjection(assignment)
                  }
                  onClick={() => {
                    void revokeRuntimeAssignmentFromStudio(
                      assignment.assignmentId
                    );
                  }}
                  type="button"
                >
                  {pendingAssignmentRevokeId === assignment.assignmentId
                    ? "Revoking..."
                    : "Revoke"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="inline-empty-state">
            <p>No runtime assignments are projected yet.</p>
          </div>
        )}

        {assignmentReceiptRows.length > 0 ? (
          <div className="compact-list">
            {assignmentReceiptRows.slice(0, 6).map((receipt) => (
              <div
                key={`${receipt.assignmentId}-${receipt.observedAt}-${receipt.receiptKind}`}
                className="compact-list-item"
              >
                <strong>{formatAssignmentReceiptLabel(receipt)}</strong>
                <span>{formatAssignmentReceiptDetail(receipt)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="inline-empty-state">
            <p>No assignment receipts are projected yet.</p>
          </div>
        )}

        {projectedRuntimeStates.length > 0 ? (
          <div className="compact-list">
            {projectedRuntimeStates.slice(0, 6).map((runtime) => (
              <div key={runtime.nodeId} className="compact-list-item">
                <strong>{formatRuntimeProjectionLabel(runtime)}</strong>
                <span>{formatRuntimeProjectionDetail(runtime)}</span>
                {runtime.clientUrl ? (
                  <a href={runtime.clientUrl} rel="noreferrer" target="_blank">
                    Open User Client
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="inline-empty-state">
            <p>No runtime projection is available yet.</p>
          </div>
        )}

        {userNodeRuntimeSummaries.length > 0 ? (
          <div className="compact-list">
            {userNodeRuntimeSummaries.slice(0, 4).map((summary) => (
              <div key={summary.nodeId} className="compact-list-item">
                <strong>{formatUserNodeRuntimeSummaryLabel(summary)}</strong>
                <span>{formatUserNodeRuntimeSummaryDetail(summary)}</span>
                {summary.clientUrl ? (
                  <a href={summary.clientUrl} rel="noreferrer" target="_blank">
                    Open User Client
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="inline-empty-state">
            <p>No User Node identity is projected yet.</p>
          </div>
        )}

        {projectedUserConversations.length > 0 ? (
          <div className="compact-list">
            {projectedUserConversations.slice(0, 4).map((conversation) => (
              <div
                key={`${conversation.userNodeId}:${conversation.conversationId}`}
                className="compact-list-item"
              >
                <strong>{formatUserConversationLabel(conversation)}</strong>
                <span>{formatUserConversationDetail(conversation)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="inline-empty-state">
            <p>No User Node conversation projection is available yet.</p>
          </div>
        )}
      </section>

      <section className="content-grid">
        <div className="panel graph-panel">
          <div className="panel-header">
            <h2>Live Graph</h2>
            <span className="panel-caption">
              Applied topology from entangle-host
            </span>
          </div>
          <div className="graph-canvas">
            {flowProjection.nodes.length > 0 ? (
              <ReactFlow
                edges={flowProjection.edges}
                fitView
                nodes={flowProjection.nodes}
                onEdgeClick={(_event, edge) => {
                  selectEdge(edge.id);
                }}
                onNodeClick={(_event, node) => {
                  if (runtimes.some((runtime) => runtime.nodeId === node.id)) {
                    selectManagedNode(node.id);
                  }
                }}
              >
                <Background />
                <MiniMap />
                <Controls />
              </ReactFlow>
            ) : (
              <div className="empty-state">
                <p>No graph revision has been applied yet.</p>
                <span>
                  Admit package sources and apply a graph through the host or
                  CLI, then Studio will render the real topology here.
                </span>
              </div>
            )}
          </div>

          <div className="graph-editor-grid">
            <div className="subpanel">
              <div className="section-header">
                <h3>Package Sources</h3>
                <span className="panel-caption">
                  {packageSources.length} admitted sources
                </span>
              </div>

              {packageSourceError ? <p className="error-box">{packageSourceError}</p> : null}
              {packageAdmissionError ? <p className="error-box">{packageAdmissionError}</p> : null}
              {packageDeletionError ? <p className="error-box">{packageDeletionError}</p> : null}

              {packageSources.length > 0 ? (
                <div className="package-source-list">
                  {packageSources.map((inspection) => {
                    const packageSourceId = inspection.packageSource.packageSourceId;
                    const referenceNodeIds = collectPackageSourceReferenceNodeIds(
                      graphInspection?.graph,
                      packageSourceId
                    );
                    const isDeleting =
                      pendingPackageSourceDeletionId === packageSourceId;

                    return (
                      <div key={packageSourceId} className="package-source-card">
                        <strong>{formatPackageSourceOptionLabel(inspection)}</strong>
                        <span>{formatPackageSourceDetail(inspection)}</span>
                        <span>
                          {formatPackageSourceReferenceSummary(referenceNodeIds)}
                        </span>
                        <div className="action-row">
                          <button
                            className="action-button"
                            disabled={
                              pendingPackageAdmission ||
                              pendingPackageSourceDeletionId !== null ||
                              referenceNodeIds.length > 0
                            }
                            onClick={() => {
                              void deletePackageSource(packageSourceId);
                            }}
                            title={
                              referenceNodeIds.length > 0
                                ? "Delete or rebind referencing nodes before deleting this package source."
                                : "Delete this package source admission from the host."
                            }
                            type="button"
                          >
                            {isDeleting ? "Deleting..." : "Delete Source"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="inline-empty-state">
                  <p>No package sources are admitted yet.</p>
                </div>
              )}
            </div>

            <div className="subpanel">
              <div className="section-header">
                <h3>External Principals</h3>
                <span className="panel-caption">
                  {externalPrincipals.length} bound principals
                </span>
              </div>

              {externalPrincipalError ? (
                <p className="error-box">{externalPrincipalError}</p>
              ) : null}
              {externalPrincipalDeletionError ? (
                <p className="error-box">{externalPrincipalDeletionError}</p>
              ) : null}

              {externalPrincipals.length > 0 ? (
                <div className="external-principal-list">
                  {externalPrincipals.map((inspection) => {
                    const principalId = inspection.principal.principalId;
                    const referenceNodeIds =
                      collectExternalPrincipalReferenceNodeIds(
                        graphInspection?.graph,
                        principalId
                      );
                    const isDeleting =
                      pendingExternalPrincipalDeletionId === principalId;

                    return (
                      <div key={principalId} className="external-principal-card">
                        <strong>{formatExternalPrincipalLabel(inspection)}</strong>
                        <span>{formatExternalPrincipalDetail(inspection)}</span>
                        <span>
                          {formatExternalPrincipalReferenceSummary(
                            referenceNodeIds
                          )}
                        </span>
                        <div className="action-row">
                          <button
                            className="action-button"
                            disabled={
                              pendingExternalPrincipalDeletionId !== null ||
                              referenceNodeIds.length > 0
                            }
                            onClick={() => {
                              void deleteExternalPrincipal(principalId);
                            }}
                            title={
                              referenceNodeIds.length > 0
                                ? "Delete or rebind referencing nodes before deleting this external principal."
                                : "Delete this external principal binding from the host."
                            }
                            type="button"
                          >
                            {isDeleting ? "Deleting..." : "Delete Principal"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="inline-empty-state">
                  <p>No external principals are bound yet.</p>
                </div>
              )}
            </div>

            <div className="subpanel">
              <div className="section-header">
                <h3>Package Admission</h3>
                <span className="panel-caption">
                  Host-owned local source admission
                </span>
              </div>

              <div className="field-grid">
                <label className="field">
                  <span>Source kind</span>
                  <select
                    disabled={pendingPackageAdmission}
                    onChange={(event) => {
                      const nextSourceKind =
                        event.target.value as PackageSourceAdmissionDraft["sourceKind"];

                      setPackageAdmissionDraft((current) => ({
                        ...current,
                        sourceKind: nextSourceKind
                      }));
                    }}
                    value={packageAdmissionDraft.sourceKind}
                  >
                    <option value="local_path">local_path</option>
                    <option value="local_archive">local_archive</option>
                  </select>
                </label>

                <label className="field">
                  <span>Package source id (optional)</span>
                  <input
                    disabled={pendingPackageAdmission}
                    onChange={(event) => {
                      setPackageAdmissionDraft((current) => ({
                        ...current,
                        packageSourceId: event.target.value
                      }));
                    }}
                    type="text"
                    value={packageAdmissionDraft.packageSourceId}
                  />
                </label>

                <label className="field">
                  <span>
                    {packageAdmissionDraft.sourceKind === "local_path"
                      ? "Absolute package path"
                      : "Archive path"}
                  </span>
                  <input
                    disabled={pendingPackageAdmission}
                    onChange={(event) => {
                      const nextValue = event.target.value;

                      setPackageAdmissionDraft((current) =>
                        current.sourceKind === "local_path"
                          ? {
                              ...current,
                              absolutePath: nextValue
                            }
                          : {
                              ...current,
                              archivePath: nextValue
                            }
                      );
                    }}
                    type="text"
                    value={
                      packageAdmissionDraft.sourceKind === "local_path"
                        ? packageAdmissionDraft.absolutePath
                        : packageAdmissionDraft.archivePath
                    }
                  />
                </label>
              </div>

              <p className="editor-meta">
                This slice intentionally keeps package admission explicit and
                host-visible. Studio sends a canonical `local_path` or
                `local_archive` request to the host instead of relying on
                browser-owned directory handles.
              </p>

              <div className="action-row">
                <button
                  className="action-button"
                  disabled={pendingPackageAdmission}
                  onClick={() => {
                    setPackageAdmissionDraft(createEmptyPackageSourceAdmissionDraft());
                    setPackageAdmissionError(null);
                  }}
                  type="button"
                >
                  Reset
                </button>
                <button
                  className="action-button"
                  disabled={
                    pendingPackageAdmission ||
                    (packageAdmissionDraft.sourceKind === "local_path"
                      ? packageAdmissionDraft.absolutePath.trim() === ""
                      : packageAdmissionDraft.archivePath.trim() === "")
                  }
                  onClick={() => {
                    void admitPackageSource();
                  }}
                  type="button"
                >
                  {pendingPackageAdmission ? "Admitting..." : "Admit Package Source"}
                </button>
              </div>
            </div>

            <div className="subpanel">
              <div className="section-header">
                <h3>Managed Nodes</h3>
                <span className="panel-caption">
                  {managedGraphNodes.length} managed nodes
                </span>
              </div>

              {managedGraphNodes.length > 0 ? (
                <div className="node-list">
                  {managedGraphNodes.map((node) => (
                    <button
                      key={node.nodeId}
                      className={`node-chip ${node.nodeId === selectedManagedNodeId ? "is-selected" : ""}`}
                      onClick={() => {
                        selectManagedNode(node.nodeId);
                      }}
                      type="button"
                    >
                      <strong>{formatManagedNodeLabel(node)}</strong>
                      <span>{formatManagedNodeDetail(node)}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="inline-empty-state">
                  <p>No managed nodes are currently defined in the applied graph.</p>
                </div>
              )}
            </div>

            <div className="subpanel">
              <div className="section-header">
                <h3>Managed Node Editor</h3>
                <span className="panel-caption">
                  {selectedManagedNodeId ? "Replace or delete" : "Create a new node"}
                </span>
              </div>

              {packageSourceError ? <p className="error-box">{packageSourceError}</p> : null}
              {catalogError ? <p className="error-box">{catalogError}</p> : null}
              {nodeMutationError ? <p className="error-box">{nodeMutationError}</p> : null}

              {graphInspection?.graph ? (
                <>
                  <div className="field-grid">
                    <label className="field">
                      <span>Node id</span>
                      <input
                        disabled={selectedManagedNodeId !== null || pendingNodeMutation !== null}
                        onChange={(event) => {
                          setNodeDraft((current) => ({
                            ...current,
                            nodeId: event.target.value
                          }));
                        }}
                        type="text"
                        value={nodeDraft.nodeId}
                      />
                    </label>

                    <label className="field">
                      <span>Display name</span>
                      <input
                        disabled={pendingNodeMutation !== null}
                        onChange={(event) => {
                          setNodeDraft((current) => ({
                            ...current,
                            displayName: event.target.value
                          }));
                        }}
                        type="text"
                        value={nodeDraft.displayName}
                      />
                    </label>

                    <label className="field">
                      <span>Node kind</span>
                      <select
                        disabled={pendingNodeMutation !== null}
                        onChange={(event) => {
                          setNodeDraft((current) => ({
                            ...current,
                            nodeKind: event.target.value as ManagedNodeEditorDraft["nodeKind"]
                          }));
                        }}
                        value={nodeDraft.nodeKind}
                      >
                        {managedNodeKindOptions.map((nodeKind) => (
                          <option key={nodeKind} value={nodeKind}>
                            {nodeKind}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span>Package source</span>
                      <select
                        disabled={pendingNodeMutation !== null || packageSources.length === 0}
                        onChange={(event) => {
                          setNodeDraft((current) => ({
                            ...current,
                            packageSourceRef: event.target.value
                          }));
                        }}
                        value={nodeDraft.packageSourceRef}
                      >
                        <option value="">Select one admitted package source</option>
                        {packageSources.map((inspection) => (
                          <option
                            key={inspection.packageSource.packageSourceId}
                            value={inspection.packageSource.packageSourceId}
                          >
                            {formatPackageSourceOptionLabel(inspection)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span>Agent runtime mode</span>
                      <select
                        disabled={pendingNodeMutation !== null}
                        onChange={(event) => {
                          const nextMode = event.target.value;
                          setNodeDraft((current) => {
                            const agentRuntime = { ...current.agentRuntime };

                            if (nextMode === "") {
                              delete agentRuntime.mode;
                            } else {
                              agentRuntime.mode =
                                nextMode as NonNullable<
                                  ManagedNodeEditorDraft["agentRuntime"]["mode"]
                                >;
                            }

                            return {
                              ...current,
                              agentRuntime
                            };
                          });
                        }}
                        value={nodeDraft.agentRuntime.mode ?? ""}
                      >
                        <option value="">Inherit graph default</option>
                        {managedNodeAgentRuntimeModeOptions.map((mode) => (
                          <option key={mode} value={mode}>
                            {mode}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span>Agent engine profile</span>
                      <select
                        disabled={pendingNodeMutation !== null}
                        onChange={(event) => {
                          const nextProfileRef = event.target.value;
                          setNodeDraft((current) => {
                            const agentRuntime = { ...current.agentRuntime };

                            if (nextProfileRef === "") {
                              delete agentRuntime.engineProfileRef;
                            } else {
                              agentRuntime.engineProfileRef = nextProfileRef;
                            }

                            return {
                              ...current,
                              agentRuntime
                            };
                          });
                        }}
                        value={nodeDraft.agentRuntime.engineProfileRef ?? ""}
                      >
                        <option value="">Inherit/default engine profile</option>
                        {nodeDraft.agentRuntime.engineProfileRef &&
                        !agentEngineProfiles.some(
                          (profile) =>
                            profile.id === nodeDraft.agentRuntime.engineProfileRef
                        ) ? (
                          <option value={nodeDraft.agentRuntime.engineProfileRef}>
                            Unknown profile ({nodeDraft.agentRuntime.engineProfileRef})
                          </option>
                        ) : null}
                        {agentEngineProfiles.map((profile) => (
                          <option key={profile.id} value={profile.id}>
                            {profile.displayName} ({profile.id})
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span>Default engine agent</span>
                      <input
                        disabled={pendingNodeMutation !== null}
                        onChange={(event) => {
                          const nextDefaultAgent = event.target.value.trim();
                          setNodeDraft((current) => {
                            const agentRuntime = { ...current.agentRuntime };

                            if (nextDefaultAgent === "") {
                              delete agentRuntime.defaultAgent;
                            } else {
                              agentRuntime.defaultAgent = nextDefaultAgent;
                            }

                            return {
                              ...current,
                              agentRuntime
                            };
                          });
                        }}
                        placeholder="Inherit engine default"
                        type="text"
                        value={nodeDraft.agentRuntime.defaultAgent ?? ""}
                      />
                    </label>
                  </div>

                  <p className="editor-meta">
                    This editor updates managed node identity, package binding,
                    and node-level agent-runtime overrides. Existing autonomy
                    and resource bindings are preserved on replace and use safe
                    defaults on create.
                  </p>

                  <div className="action-row">
                    <button
                      className="action-button"
                      disabled={pendingNodeMutation !== null}
                      onClick={resetManagedNodeDraft}
                      type="button"
                    >
                      New Node
                    </button>
                    <button
                      className="action-button"
                      disabled={
                        pendingNodeMutation !== null ||
                        nodeDraft.nodeId.trim() === "" ||
                        nodeDraft.displayName.trim() === "" ||
                        nodeDraft.packageSourceRef === ""
                      }
                      onClick={() => {
                        void mutateManagedNode(
                          selectedManagedNodeId ? "replace" : "create"
                        );
                      }}
                      type="button"
                    >
                      {pendingNodeMutation === "create" || pendingNodeMutation === "replace"
                        ? "Saving..."
                        : selectedManagedNodeId
                          ? "Save Node"
                          : "Create Node"}
                    </button>
                    <button
                      className="action-button"
                      disabled={pendingNodeMutation !== null || selectedManagedNodeId === null}
                      onClick={() => {
                        void mutateManagedNode("delete");
                      }}
                      type="button"
                    >
                      {pendingNodeMutation === "delete" ? "Deleting..." : "Delete Node"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="inline-empty-state">
                  <p>Apply a graph before editing managed nodes from Studio.</p>
                </div>
              )}
            </div>

            <div className="subpanel">
              <div className="section-header">
                <h3>Graph Edges</h3>
                <span className="panel-caption">{graphEdges.length} edges</span>
              </div>

              {graphEdges.length > 0 ? (
                <div className="edge-list">
                  {graphEdges.map((edge) => (
                    <button
                      key={edge.edgeId}
                      className={`edge-chip ${edge.edgeId === selectedEdgeId ? "is-selected" : ""}`}
                      onClick={() => {
                        selectEdge(edge.edgeId);
                      }}
                      type="button"
                    >
                      <strong>{formatGraphEdgeLabel(edge)}</strong>
                      <span>{formatGraphEdgeDetail(edge)}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="inline-empty-state">
                  <p>No edges are currently defined in the applied graph.</p>
                </div>
              )}
            </div>

            <div className="subpanel">
              <div className="section-header">
                <h3>Edge Editor</h3>
                <span className="panel-caption">
                  {selectedEdgeId ? "Replace or delete" : "Create a new edge"}
                </span>
              </div>

              {edgeMutationError ? <p className="error-box">{edgeMutationError}</p> : null}

              {graphInspection?.graph ? (
                <>
                  <div className="field-grid">
                    <label className="field">
                      <span>Edge id</span>
                      <input
                        disabled={selectedEdgeId !== null || pendingEdgeMutation !== null}
                        onChange={(event) => {
                          setEdgeDraft((current) => ({
                            ...current,
                            edgeId: event.target.value
                          }));
                        }}
                        type="text"
                        value={edgeDraft.edgeId}
                      />
                    </label>

                    <label className="field">
                      <span>Relation</span>
                      <select
                        disabled={pendingEdgeMutation !== null}
                        onChange={(event) => {
                          setEdgeDraft((current) => ({
                            ...current,
                            relation: event.target.value as EdgeEditorDraft["relation"]
                          }));
                        }}
                        value={edgeDraft.relation}
                      >
                        {edgeRelationOptions.map((relation) => (
                          <option key={relation} value={relation}>
                            {relation}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span>From node</span>
                      <select
                        disabled={pendingEdgeMutation !== null}
                        onChange={(event) => {
                          setEdgeDraft((current) => ({
                            ...current,
                            fromNodeId: event.target.value
                          }));
                        }}
                        value={edgeDraft.fromNodeId}
                      >
                        {graphInspection.graph.nodes.map((node) => (
                          <option key={node.nodeId} value={node.nodeId}>
                            {node.displayName} ({node.nodeId})
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span>To node</span>
                      <select
                        disabled={pendingEdgeMutation !== null}
                        onChange={(event) => {
                          setEdgeDraft((current) => ({
                            ...current,
                            toNodeId: event.target.value
                          }));
                        }}
                        value={edgeDraft.toNodeId}
                      >
                        {graphInspection.graph.nodes.map((node) => (
                          <option key={node.nodeId} value={node.nodeId}>
                            {node.displayName} ({node.nodeId})
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="toggle-field">
                    <input
                      checked={edgeDraft.enabled}
                      disabled={pendingEdgeMutation !== null}
                      onChange={(event) => {
                        setEdgeDraft((current) => ({
                          ...current,
                          enabled: event.target.checked
                        }));
                      }}
                      type="checkbox"
                    />
                    <span>Edge enabled</span>
                  </label>

                  <p className="editor-meta">
                    Transport policy remains host-owned in this bounded slice.
                    Channel <code>{edgeDraft.channel}</code> and{" "}
                    <code>{edgeDraft.relayProfileRefs.length}</code> relay profile refs
                    are preserved on replace and defaulted on create.
                  </p>

                  <div className="action-row">
                    <button
                      className="action-button"
                      disabled={pendingEdgeMutation !== null}
                      onClick={resetEdgeDraft}
                      type="button"
                    >
                      New Edge
                    </button>
                    <button
                      className="action-button"
                      disabled={
                        pendingEdgeMutation !== null ||
                        edgeDraft.fromNodeId === "" ||
                        edgeDraft.toNodeId === "" ||
                        (!selectedEdgeId && edgeDraft.edgeId.trim() === "") ||
                        graphNodeIds.length < 2
                      }
                      onClick={() => {
                        void mutateSelectedEdge(selectedEdgeId ? "replace" : "create");
                      }}
                      type="button"
                    >
                      {pendingEdgeMutation === "create" || pendingEdgeMutation === "replace"
                        ? "Saving..."
                        : selectedEdgeId
                          ? "Save Edge"
                          : "Create Edge"}
                    </button>
                    <button
                      className="action-button"
                      disabled={pendingEdgeMutation !== null || selectedEdgeId === null}
                      onClick={() => {
                        void mutateSelectedEdge("delete");
                      }}
                      type="button"
                    >
                      {pendingEdgeMutation === "delete" ? "Deleting..." : "Delete Edge"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="inline-empty-state">
                  <p>Apply a graph before editing edges from Studio.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="panel side-panel">
          <div className="panel-header">
            <h2>Host Status</h2>
            <span className={`status-pill status-${statusTone}`}>
              {status?.status ?? "unreachable"}
            </span>
          </div>

          <dl className="status-list">
            <div>
              <dt>Active revision</dt>
              <dd>{status?.graphRevisionId ?? "none applied"}</dd>
            </div>
            <div>
              <dt>Graph id</dt>
              <dd>{graphInspection?.graph?.graphId ?? "not loaded"}</dd>
            </div>
            <div>
              <dt>Nodes / edges</dt>
              <dd>
                {graphInspection?.graph
                  ? `${graphInspection.graph.nodes.length} / ${graphInspection.graph.edges.length}`
                  : "0 / 0"}
              </dd>
            </div>
            <div>
              <dt>Desired runtimes</dt>
              <dd>{status?.runtimeCounts.desired ?? 0}</dd>
            </div>
            <div>
              <dt>Observed runtimes</dt>
              <dd>{status?.runtimeCounts.observed ?? 0}</dd>
            </div>
            <div>
              <dt>Running runtimes</dt>
              <dd>{status?.runtimeCounts.running ?? 0}</dd>
            </div>
            <div>
              <dt>Session diagnostics</dt>
              <dd>
                {status
                  ? formatHostStatusSessionDiagnosticsSummary(status)
                  : "not loaded"}
              </dd>
            </div>
            <div>
              <dt>Transport</dt>
              <dd>
                {status
                  ? formatHostTransportControlObserveSummary(status)
                  : "not loaded"}
              </dd>
            </div>
            <div>
              <dt>Artifact cache</dt>
              <dd>
                {status
                  ? formatHostArtifactBackendCacheSummary(status)
                  : "not loaded"}
              </dd>
            </div>
            <div>
              <dt>Relays</dt>
              <dd>{status?.transport.controlObserve.relays.length ?? 0}</dd>
            </div>
            <div>
              <dt>State layout</dt>
              <dd>{status ? formatHostStateLayoutSummary(status) : "not loaded"}</dd>
            </div>
          </dl>

          {status?.transport.controlObserve.relays.length ? (
            <div className="compact-list">
              {status.transport.controlObserve.relays.map((relay) => (
                <div key={relay.relayUrl} className="compact-list-item">
                  <strong>{relay.status}</strong>
                  <span>{formatHostTransportRelayDetail(relay)}</span>
                </div>
              ))}
            </div>
          ) : null}

          {error ? <p className="error-box">{error}</p> : null}

          <section className="subpanel">
            <div className="section-header">
              <h3>Graph Validation</h3>
              <span
                className={`status-pill status-${
                  graphValidationResult
                    ? graphValidationResult.validation.ok
                      ? "healthy"
                      : "degraded"
                    : "pending"
                }`}
              >
                {graphValidationResult
                  ? graphValidationResult.validation.ok
                    ? "valid"
                    : "findings"
                  : "not run"}
              </span>
            </div>

            <div className="action-row">
              <button
                className="action-button"
                disabled={!graphInspection?.graph || pendingGraphValidation}
                onClick={() => {
                  void validateActiveGraph();
                }}
                type="button"
              >
                {pendingGraphValidation ? "Validating..." : "Validate Active Graph"}
              </button>
            </div>

            {graphValidationError ? (
              <p className="error-box">{graphValidationError}</p>
            ) : null}

            {graphValidationResult ? (
              <>
                <dl className="status-list compact-list">
                  <div>
                    <dt>Errors</dt>
                    <dd>
                      {countValidationFindings(
                        graphValidationResult.validation,
                        "error"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Warnings</dt>
                    <dd>
                      {countValidationFindings(
                        graphValidationResult.validation,
                        "warning"
                      )}
                    </dd>
                  </div>
                </dl>

                {graphValidationResult.validation.findings.length > 0 ? (
                  <ul className="detail-list">
                    {graphValidationResult.validation.findings.map((finding) => (
                      <li key={`${finding.code}-${finding.message}`}>
                        {formatValidationFindingLine(finding)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="inline-empty-state">
                    <p>Active graph validation passed.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="inline-empty-state">
                <p>Active graph validation has not run.</p>
              </div>
            )}
          </section>

          <section className="subpanel">
            <div className="section-header">
              <h3>Graph Revisions</h3>
              <span className="panel-caption">
                {graphRevisions.length} revisions
              </span>
            </div>

            {graphRevisionError ? (
              <p className="error-box">{graphRevisionError}</p>
            ) : null}

            {graphRevisions.length > 0 ? (
              <ul className="timeline-list">
                {graphRevisions.slice(0, 6).map((revision) => (
                  <li key={revision.revisionId} className="timeline-item">
                    <button
                      className={`timeline-button ${selectedGraphRevisionId === revision.revisionId ? "is-selected" : ""}`}
                      onClick={() => {
                        void selectGraphRevision(revision.revisionId);
                      }}
                      type="button"
                    >
                      <div className="timeline-row">
                        <strong>{formatGraphRevisionLabel(revision)}</strong>
                        <span>{revision.appliedAt}</span>
                      </div>
                      <p>{formatGraphRevisionDetail(revision)}</p>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="inline-empty-state">
                <p>No graph revisions are persisted yet.</p>
              </div>
            )}

            {graphRevisionDetailError ? (
              <p className="error-box">{graphRevisionDetailError}</p>
            ) : null}

            {selectedGraphRevisionInspection ? (
              <>
                <div className="artifact-detail-card">
                  <div className="section-header">
                    <h3>Selected Revision Detail</h3>
                    <span className="panel-caption">
                      {selectedGraphRevisionInspection.revision.isActive
                        ? "active"
                        : "inactive"}
                    </span>
                  </div>

                  <dl className="status-list compact-list">
                    <div>
                      <dt>Revision</dt>
                      <dd>
                        {selectedGraphRevisionInspection.revision.revisionId}
                      </dd>
                    </div>
                    <div>
                      <dt>Graph</dt>
                      <dd>{selectedGraphRevisionInspection.revision.graphId}</dd>
                    </div>
                    <div>
                      <dt>Applied</dt>
                      <dd>{selectedGraphRevisionInspection.revision.appliedAt}</dd>
                    </div>
                    <div>
                      <dt>Topology</dt>
                      <dd>
                        {formatGraphRevisionInspectionSummary(
                          selectedGraphRevisionInspection
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>

                {selectedGraphRevisionDiff ? (
                  <div className="graph-diff-card">
                    <div className="section-header">
                      <h3>Diff Against Active</h3>
                      <span
                        className={`status-pill status-${selectedGraphRevisionDiff.hasChanges ? "degraded" : "healthy"}`}
                      >
                        {selectedGraphRevisionDiff.hasChanges
                          ? "changes"
                          : "no changes"}
                      </span>
                    </div>

                    <dl className="status-list compact-list">
                      <div>
                        <dt>Comparison</dt>
                        <dd>
                          {selectedGraphRevisionDiff.from.name} -&gt;{" "}
                          {selectedGraphRevisionDiff.to.name}
                        </dd>
                      </div>
                      <div>
                        <dt>Totals</dt>
                        <dd>{formatGraphDiffTotals(selectedGraphRevisionDiff)}</dd>
                      </div>
                      <div>
                        <dt>Identity</dt>
                        <dd>
                          {formatGraphDiffIdentitySummary(
                            selectedGraphRevisionDiff
                          )}
                        </dd>
                      </div>
                    </dl>

                    {selectedGraphRevisionDiffSections.length > 0 ? (
                      <div className="graph-diff-section-grid">
                        {selectedGraphRevisionDiffSections.map((section) => (
                          <div key={section.title} className="graph-diff-section">
                            <h4>{section.title}</h4>
                            <ul className="detail-list">
                              {section.rows.map((row) => (
                                <li key={row}>{row}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="inline-empty-state">
                        <p>Selected revision matches the active graph.</p>
                      </div>
                    )}
                  </div>
                ) : null}
              </>
            ) : selectedGraphRevisionId ? (
              <div className="inline-empty-state">
                <p>Loading selected revision detail...</p>
              </div>
            ) : graphRevisions.length > 0 ? (
              <div className="inline-empty-state">
                <p>Select one graph revision to inspect persisted topology detail.</p>
              </div>
            ) : null}
          </section>

          <section className="runtime-section">
            <div className="section-header">
              <h3>Runtime Recovery Inspector</h3>
              <span className={`status-pill status-${runtimeStateTone}`}>
                {selectedRuntime?.observedState ?? "no selection"}
              </span>
            </div>

            <div className="runtime-chip-grid">
              {runtimes.length > 0 ? (
                runtimes.map((runtime) => (
                  <button
                    key={runtime.nodeId}
                    className={`runtime-chip ${runtime.nodeId === selectedRuntimeId ? "is-selected" : ""}`}
                    onClick={() => {
                      selectManagedNode(runtime.nodeId);
                    }}
                    type="button"
                  >
                    <strong>{runtime.nodeId}</strong>
                    <span>{runtime.observedState}</span>
                  </button>
                ))
              ) : (
                <div className="inline-empty-state">
                  <p>No managed runtimes are currently visible.</p>
                </div>
              )}
            </div>

            {selectedRuntimeId ? (
              <>
                <div className="section-header">
                  <h3>Selected Runtime</h3>
                  <div className="action-row">
                    <button
                      className="action-button"
                      disabled={pendingRuntimeAction !== null}
                      onClick={() => {
                        void refreshSelectedRuntimeDetails(selectedRuntimeId);
                      }}
                      type="button"
                    >
                      Refresh
                    </button>
                    <button
                      className="action-button"
                      disabled={!canStartRuntime(selectedRuntime) || pendingRuntimeAction !== null}
                      onClick={() => {
                        void mutateSelectedRuntime("start");
                      }}
                      type="button"
                    >
                      {formatRuntimeLifecycleActionLabel("start", pendingRuntimeAction)}
                    </button>
                    <button
                      className="action-button"
                      disabled={!canRestartRuntime(selectedRuntime) || pendingRuntimeAction !== null}
                      onClick={() => {
                        void mutateSelectedRuntime("restart");
                      }}
                      type="button"
                    >
                      {formatRuntimeLifecycleActionLabel("restart", pendingRuntimeAction)}
                    </button>
                    <button
                      className="action-button"
                      disabled={!canStopRuntime(selectedRuntime) || pendingRuntimeAction !== null}
                      onClick={() => {
                        void mutateSelectedRuntime("stop");
                      }}
                      type="button"
                    >
                      {formatRuntimeLifecycleActionLabel("stop", pendingRuntimeAction)}
                    </button>
                  </div>
                </div>

                <dl className="status-list compact-list">
                  <div>
                    <dt>Node</dt>
                    <dd>{selectedRuntimeId}</dd>
                  </div>
                  <div>
                    <dt>Desired / observed</dt>
                    <dd>
                      {selectedRuntime
                        ? `${selectedRuntime.desiredState} / ${selectedRuntime.observedState}`
                        : "loading"}
                    </dd>
                  </div>
                  <div>
                    <dt>Recovery policy</dt>
                    <dd>
                      {selectedRecovery
                        ? describeRuntimeRecoveryPolicy(selectedRecovery.policy)
                        : "loading"}
                    </dd>
                  </div>
                  <div>
                    <dt>Recovery controller</dt>
                    <dd>
                      {selectedRecovery
                        ? describeRuntimeRecoveryController(selectedRecovery.controller)
                        : "loading"}
                    </dd>
                  </div>
                  <div>
                    <dt>Reconciliation</dt>
                    <dd>{selectedRuntime?.reconciliation.state ?? "loading"}</dd>
                  </div>
                  <div>
                    <dt>Finding codes</dt>
                    <dd>
                      {selectedRuntime
                        ? selectedRuntime.reconciliation.findingCodes.length > 0
                          ? selectedRuntime.reconciliation.findingCodes.join(", ")
                          : "none"
                        : "loading"}
                    </dd>
                  </div>
                  <div>
                    <dt>Backend / context</dt>
                    <dd>
                      {selectedRuntime
                        ? `${selectedRuntime.backendKind} / ${selectedRuntime.contextAvailable ? "ready" : "missing"}`
                        : "loading"}
                    </dd>
                  </div>
                  <div>
                    <dt>Workspace health</dt>
                    <dd>
                      {selectedRuntime
                        ? formatRuntimeWorkspaceHealthSummary(selectedRuntime)
                        : "loading"}
                    </dd>
                  </div>
                  <div>
                    <dt>Agent runtime</dt>
                    <dd>
                      {selectedRuntime?.agentRuntime
                        ? [
                            selectedRuntime.agentRuntime.mode,
                            selectedRuntime.agentRuntime.engineKind,
                            selectedRuntime.agentRuntime.engineProfileRef
                          ]
                            .filter(Boolean)
                            .join(" / ")
                        : selectedRuntime
                          ? "not reported"
                          : "loading"}
                    </dd>
                  </div>
                  <div>
                    <dt>Engine session</dt>
                    <dd>
                      {selectedRuntime?.agentRuntime?.lastEngineSessionId ??
                        "none"}
                    </dd>
                  </div>
                  <div>
                    <dt>Pending approvals</dt>
                    <dd>
                      {selectedRuntime?.agentRuntime
                        ? formatRuntimeIdList(
                            selectedRuntime.agentRuntime.pendingApprovalIds
                          )
                        : selectedRuntime
                          ? "not reported"
                          : "loading"}
                    </dd>
                  </div>
                  <div>
                    <dt>Produced artifacts</dt>
                    <dd>
                      {selectedRuntime?.agentRuntime
                        ? formatRuntimeIdList(
                            selectedRuntime.agentRuntime.lastProducedArtifactIds
                          )
                        : selectedRuntime
                          ? "not reported"
                          : "loading"}
                    </dd>
                  </div>
                  <div>
                    <dt>Source candidate</dt>
                    <dd>
                      {selectedRuntime?.agentRuntime
                        ?.lastSourceChangeCandidateId ?? "none"}
                    </dd>
                  </div>
                  <div>
                    <dt>Source changes</dt>
                    <dd>
                      {selectedRuntime?.agentRuntime
                        ? formatSourceChangeSummary(
                            selectedRuntime.agentRuntime.lastSourceChangeSummary
                          )
                        : selectedRuntime
                          ? "not reported"
                          : "loading"}
                    </dd>
                  </div>
                  <div>
                    <dt>Restart generation</dt>
                    <dd>{selectedRuntime?.restartGeneration ?? "loading"}</dd>
                  </div>
                </dl>

                {recoveryError ? <p className="error-box">{recoveryError}</p> : null}
                {approvalError ? <p className="error-box">{approvalError}</p> : null}
                {artifactError ? <p className="error-box">{artifactError}</p> : null}
                {turnError ? <p className="error-box">{turnError}</p> : null}
                {sourceChangeCandidateError ? (
                  <p className="error-box">{sourceChangeCandidateError}</p>
                ) : null}
                {sessionError ? <p className="error-box">{sessionError}</p> : null}
                {mutationError ? <p className="error-box">{mutationError}</p> : null}

                <div className="recovery-column">
                  <div className="subpanel">
                    <div className="section-header">
                      <h3>Recovery Policy</h3>
                      <span className="panel-caption">
                        {selectedRecovery?.policy.updatedAt ?? "not loaded"}
                      </span>
                    </div>

                    {recoveryPolicyError ? (
                      <p className="error-box">{recoveryPolicyError}</p>
                    ) : null}

                    <div className="field-grid">
                      <label className="field">
                        <span>Policy mode</span>
                        <select
                          disabled={
                            !selectedRecovery || pendingRecoveryPolicyMutation
                          }
                          onChange={(event) => {
                            const mode =
                              event.target
                                .value as RuntimeRecoveryPolicyDraft["mode"];

                            setRecoveryPolicyDraft((current) => ({
                              ...current,
                              mode
                            }));
                          }}
                          value={recoveryPolicyDraft.mode}
                        >
                          <option value="manual">manual</option>
                          <option value="restart_on_failure">
                            restart_on_failure
                          </option>
                        </select>
                      </label>

                      {recoveryPolicyDraft.mode === "restart_on_failure" ? (
                        <>
                          <label className="field">
                            <span>Max attempts</span>
                            <input
                              disabled={
                                !selectedRecovery ||
                                pendingRecoveryPolicyMutation
                              }
                              max={20}
                              min={1}
                              onChange={(event) => {
                                setRecoveryPolicyDraft((current) => ({
                                  ...current,
                                  maxAttempts: event.target.value
                                }));
                              }}
                              type="number"
                              value={recoveryPolicyDraft.maxAttempts}
                            />
                          </label>

                          <label className="field">
                            <span>Cooldown seconds</span>
                            <input
                              disabled={
                                !selectedRecovery ||
                                pendingRecoveryPolicyMutation
                              }
                              max={3600}
                              min={0}
                              onChange={(event) => {
                                setRecoveryPolicyDraft((current) => ({
                                  ...current,
                                  cooldownSeconds: event.target.value
                                }));
                              }}
                              type="number"
                              value={recoveryPolicyDraft.cooldownSeconds}
                            />
                          </label>
                        </>
                      ) : null}
                    </div>

                    <div className="action-row">
                      <button
                        className="action-button"
                        disabled={!selectedRecovery || pendingRecoveryPolicyMutation}
                        onClick={() => {
                          setRecoveryPolicyDraft(
                            createRuntimeRecoveryPolicyDraft(
                              selectedRecovery?.policy
                            )
                          );
                          setRecoveryPolicyError(null);
                        }}
                        type="button"
                      >
                        Reset Policy
                      </button>
                      <button
                        className="action-button"
                        disabled={
                          !selectedRecovery ||
                          pendingRecoveryPolicyMutation ||
                          !recoveryPolicyDraftValid ||
                          !recoveryPolicyDraftChanged
                        }
                        onClick={() => {
                          void saveSelectedRuntimeRecoveryPolicy();
                        }}
                        type="button"
                      >
                        {pendingRecoveryPolicyMutation
                          ? "Saving..."
                          : "Save Policy"}
                      </button>
                    </div>
                  </div>

                  <div className="subpanel">
                    <div className="section-header">
                      <h3>Recovery History</h3>
                      <span className="panel-caption">
                        {selectedRecovery?.entries.length ?? 0} records
                      </span>
                    </div>

                    {selectedRecovery && selectedRecovery.entries.length > 0 ? (
                      <ul className="timeline-list">
                        {selectedRecovery.entries.slice(0, 6).map((entry) => (
                          <li key={entry.recoveryId} className="timeline-item">
                            <div className="timeline-row">
                              <strong>{entry.runtime.observedState}</strong>
                              <span>{entry.recordedAt}</span>
                            </div>
                            <p>{entry.lastError ?? entry.runtime.statusMessage ?? "No runtime error recorded."}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="inline-empty-state">
                        <p>No recovery snapshots recorded yet.</p>
                      </div>
                    )}
                  </div>

                  <div className="subpanel">
                    <div className="section-header">
                      <h3>Live Recovery Events</h3>
                      <span
                        className={`status-pill status-${formatEventStreamStateTone(
                          eventStreamState
                        )}`}
                      >
                        {eventStreamState}
                      </span>
                    </div>

                    {eventStreamError ? (
                      <p className="error-box">{eventStreamError}</p>
                    ) : null}

                    {recoveryEvents.length > 0 ? (
                      <ul className="timeline-list">
                        {recoveryEvents.map((event) => (
                          <li
                            key={event.eventId}
                            className="timeline-item"
                          >
                            <div className="timeline-row">
                              <strong>{formatRuntimeRecoveryEventLabel(event)}</strong>
                              <span>{event.timestamp}</span>
                            </div>
                            <p>{event.message}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="inline-empty-state">
                        <p>No live recovery events captured for this runtime yet.</p>
                      </div>
                    )}
                  </div>

                  <div className="subpanel">
                    <div className="section-header">
                      <h3>Runtime Sessions</h3>
                      <span className="panel-caption">
                        {selectedSessions.length} summaries
                      </span>
                    </div>

                    <div className="session-launch-card">
                      <div className="field-grid">
                        <label className="field">
                          <span>Summary</span>
                          <textarea
                            disabled={pendingSessionLaunch}
                            onChange={(event) => {
                              setSessionLaunchDraft((current) => ({
                                ...current,
                                summary: event.target.value
                              }));
                            }}
                            rows={3}
                            value={sessionLaunchDraft.summary}
                          />
                        </label>

                        <label className="field">
                          <span>Intent</span>
                          <input
                            disabled={pendingSessionLaunch}
                            onChange={(event) => {
                              setSessionLaunchDraft((current) => ({
                                ...current,
                                intent: event.target.value
                              }));
                            }}
                            type="text"
                            value={sessionLaunchDraft.intent}
                          />
                        </label>
                      </div>

                      {sessionLaunchError ? (
                        <p className="error-box">{sessionLaunchError}</p>
                      ) : null}

                      {lastSessionLaunch ? (
                        <dl className="status-list compact-list">
                          <div>
                            <dt>Launched session</dt>
                            <dd>{lastSessionLaunch.sessionId}</dd>
                          </div>
                          <div>
                            <dt>Relays</dt>
                            <dd>
                              {lastSessionLaunch.publishedRelays.length > 0
                                ? lastSessionLaunch.publishedRelays.join(", ")
                                : "none acknowledged"}
                            </dd>
                          </div>
                        </dl>
                      ) : null}

                      <div className="action-row">
                        <button
                          className="action-button"
                          disabled={pendingSessionLaunch}
                          onClick={() => {
                            setSessionLaunchDraft(
                              createDefaultSessionLaunchDraft(selectedRuntime)
                            );
                            setSessionLaunchError(null);
                          }}
                          type="button"
                        >
                          Reset Launch
                        </button>
                        <button
                          className="action-button"
                          disabled={
                            pendingSessionLaunch || !sessionLaunchDraftReady
                          }
                          onClick={() => {
                            void launchSelectedRuntimeSession();
                          }}
                          type="button"
                        >
                          {pendingSessionLaunch ? "Launching..." : "Launch Session"}
                        </button>
                      </div>
                    </div>

                    {selectedSessions.length > 0 ? (
                      <ul className="timeline-list">
                        {selectedSessions.slice(0, 8).map((session) => (
                          <li key={session.sessionId} className="timeline-item">
                            <button
                              className={`timeline-button ${selectedSessionId === session.sessionId ? "is-selected" : ""}`}
                              onClick={() => {
                                void selectRuntimeSession(session.sessionId);
                              }}
                              type="button"
                            >
                              <div className="timeline-row">
                                <strong>
                                  {formatRuntimeSessionLabel(session, selectedRuntimeId)}
                                </strong>
                                <span>{session.updatedAt}</span>
                              </div>
                              <p>{formatRuntimeSessionDetail(session)}</p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="inline-empty-state">
                        <p>No persisted sessions currently reference this runtime.</p>
                      </div>
                    )}

                    {sessionDetailError ? (
                      <p className="error-box">{sessionDetailError}</p>
                    ) : null}

                    {selectedSessionInspection ? (
                      <div className="session-detail-card">
                        <div className="section-header">
                          <h3>Selected Session Detail</h3>
                          <span className="panel-caption">
                            {selectedSessionInspection.sessionId}
                          </span>
                        </div>

                        <dl className="status-list compact-list">
                          <div>
                            <dt>Session</dt>
                            <dd>{selectedSessionInspection.sessionId}</dd>
                          </div>
                          <div>
                            <dt>Graph</dt>
                            <dd>{selectedSessionInspection.graphId}</dd>
                          </div>
                          <div>
                            <dt>Intent</dt>
                            <dd>
                              {selectedSessionNodes[0]?.session.intent ?? "not available"}
                            </dd>
                          </div>
                          <div>
                            <dt>Trace ids</dt>
                            <dd>
                              {selectedSessionTraceIds.length > 0
                                ? selectedSessionTraceIds.join(", ")
                                : "none"}
                            </dd>
                          </div>
                          <div>
                            <dt>Cancellable nodes</dt>
                            <dd>{selectedSessionCancellationTargetSummary}</dd>
                          </div>
                        </dl>

                        {sessionCancellationError ? (
                          <p className="error-box">{sessionCancellationError}</p>
                        ) : null}

                        {lastSessionCancellation ? (
                          <p className="notice-box">
                            Cancellation requested for{" "}
                            {lastSessionCancellation.cancellations.length} node
                            {lastSessionCancellation.cancellations.length === 1
                              ? ""
                              : "s"}
                            .
                          </p>
                        ) : null}

                        <div className="action-row">
                          <button
                            className="action-button"
                            disabled={
                              pendingSessionCancellation ||
                              selectedSessionCancellableNodeIds.length === 0
                            }
                            onClick={() => {
                              void cancelSelectedSession();
                            }}
                            type="button"
                          >
                            {pendingSessionCancellation
                              ? "Cancelling..."
                              : "Cancel Session"}
                          </button>
                        </div>

                        <ul className="timeline-list">
                          {selectedSessionNodes.map((entry) => (
                            <li key={entry.nodeId} className="timeline-item">
                              <div className="timeline-row">
                                <strong>
                                  {formatSessionInspectionNodeLabel(
                                    entry,
                                    selectedRuntimeId
                                  )}
                                </strong>
                                <span>{entry.session.updatedAt}</span>
                              </div>
                              <p>{formatSessionInspectionNodeDetail(entry)}</p>
                              <p className="artifact-meta">
                                Trace {entry.session.traceId}
                                {entry.session.lastMessageType
                                  ? ` · last message ${entry.session.lastMessageType}`
                                  : ""}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : selectedSessionId ? (
                      <div className="inline-empty-state">
                        <p>Loading selected session detail...</p>
                      </div>
                    ) : selectedSessions.length > 0 ? (
                      <div className="inline-empty-state">
                        <p>Select one session summary to inspect per-node detail.</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="subpanel">
                    <div className="section-header">
                      <h3>Runtime Approvals</h3>
                      <span className="panel-caption">
                        {selectedApprovals.length} records
                      </span>
                    </div>

                    {selectedApprovals.length > 0 ? (
                      <ul className="timeline-list">
                        {selectedApprovals.slice(0, 8).map((approval) => (
                          <li key={approval.approvalId} className="timeline-item">
                            <button
                              className={`timeline-button ${selectedApprovalId === approval.approvalId ? "is-selected" : ""}`}
                              onClick={() => {
                                void selectRuntimeApproval(approval.approvalId);
                              }}
                              type="button"
                            >
                              <div className="timeline-row">
                                <strong>
                                  {formatRuntimeApprovalLabel(approval)}
                                </strong>
                                <span>{approval.updatedAt}</span>
                              </div>
                              <p>{formatRuntimeApprovalStatus(approval)}</p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="inline-empty-state">
                        <p>No persisted runtime approvals are visible for this runtime yet.</p>
                      </div>
                    )}

                    {approvalDetailError ? (
                      <p className="error-box">{approvalDetailError}</p>
                    ) : null}

                    {selectedApprovalInspection ? (
                      <div className="approval-detail-card">
                        <div className="section-header">
                          <h3>Selected Approval Detail</h3>
                          <span className="panel-caption">
                            {selectedApprovalInspection.approval.approvalId}
                          </span>
                        </div>

                        <dl className="status-list compact-list">
                          <div>
                            <dt>Approval</dt>
                            <dd>{selectedApprovalInspection.approval.approvalId}</dd>
                          </div>
                          <div>
                            <dt>Status</dt>
                            <dd>{selectedApprovalInspection.approval.status}</dd>
                          </div>
                          <div>
                            <dt>Requested by</dt>
                            <dd>
                              {
                                selectedApprovalInspection.approval
                                  .requestedByNodeId
                              }
                            </dd>
                          </div>
                          <div>
                            <dt>Approvers</dt>
                            <dd>
                              {selectedApprovalInspection.approval.approverNodeIds
                                .length > 0
                                ? selectedApprovalInspection.approval.approverNodeIds.join(
                                    ", "
                                  )
                                : "none"}
                            </dd>
                          </div>
                        </dl>

                        <ul className="detail-list">
                          {formatRuntimeApprovalDetailLines(
                            selectedApprovalInspection.approval
                          ).map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>

                        {selectedApprovalInspection.approval.status ===
                        "pending" ? (
                          <p className="panel-caption">
                            Awaiting signed User Node response
                          </p>
                        ) : null}
                      </div>
                    ) : selectedApprovalId ? (
                      <div className="inline-empty-state">
                        <p>Loading selected approval detail...</p>
                      </div>
                    ) : selectedApprovals.length > 0 ? (
                      <div className="inline-empty-state">
                        <p>Select one approval to inspect its host-backed detail.</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="subpanel">
                    <div className="section-header">
                      <h3>Runtime Turns</h3>
                      <span className="panel-caption">
                        {selectedTurns.length} records
                      </span>
                    </div>

                    {selectedTurns.length > 0 ? (
                      <ul className="timeline-list">
                        {selectedTurns.slice(0, 8).map((turn) => (
                          <li key={turn.turnId} className="timeline-item">
                            <button
                              className={`timeline-button ${selectedTurnId === turn.turnId ? "is-selected" : ""}`}
                              onClick={() => {
                                void selectRuntimeTurn(turn.turnId);
                              }}
                              type="button"
                            >
                              <div className="timeline-row">
                                <strong>{formatRuntimeTurnLabel(turn)}</strong>
                                <span>{turn.updatedAt}</span>
                              </div>
                              <p>{formatRuntimeTurnStatus(turn)}</p>
                              <p className="artifact-meta">
                                {formatRuntimeTurnArtifactSummary(turn)}
                              </p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="inline-empty-state">
                        <p>No persisted runner turns are visible for this runtime yet.</p>
                      </div>
                    )}

                    {turnDetailError ? (
                      <p className="error-box">{turnDetailError}</p>
                    ) : null}

                    {selectedTurnInspection ? (
                      <div className="turn-detail-card">
                        <div className="section-header">
                          <h3>Selected Turn Detail</h3>
                          <span className="panel-caption">
                            {selectedTurnInspection.turn.turnId}
                          </span>
                        </div>

                        <dl className="status-list compact-list">
                          <div>
                            <dt>Turn</dt>
                            <dd>{selectedTurnInspection.turn.turnId}</dd>
                          </div>
                          <div>
                            <dt>Phase</dt>
                            <dd>{selectedTurnInspection.turn.phase}</dd>
                          </div>
                          <div>
                            <dt>Trigger</dt>
                            <dd>{selectedTurnInspection.turn.triggerKind}</dd>
                          </div>
                          <div>
                            <dt>Session</dt>
                            <dd>
                              {selectedTurnInspection.turn.sessionId ?? "none"}
                            </dd>
                          </div>
                          <div>
                            <dt>Engine</dt>
                            <dd>
                              {selectedTurnInspection.turn.engineOutcome?.stopReason ??
                                "pending"}
                            </dd>
                          </div>
                          <div>
                            <dt>Memory synthesis</dt>
                            <dd>
                              {selectedTurnInspection.turn.memorySynthesisOutcome
                                ?.status ?? "not_run"}
                            </dd>
                          </div>
                        </dl>

                        <ul className="detail-list">
                          {formatRuntimeTurnDetailLines(
                            selectedTurnInspection.turn
                          ).map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      </div>
                    ) : selectedTurnId ? (
                      <div className="inline-empty-state">
                        <p>Loading selected turn detail...</p>
                      </div>
                    ) : selectedTurns.length > 0 ? (
                      <div className="inline-empty-state">
                        <p>Select one turn to inspect its host-backed detail.</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="subpanel">
                    <div className="section-header">
                      <h3>Source Change Candidates</h3>
                      <span className="panel-caption">
                        {selectedSourceChangeCandidates.length} records
                      </span>
                    </div>

                    {selectedSourceChangeCandidates.length > 0 ? (
                      <ul className="timeline-list">
                        {selectedSourceChangeCandidates
                          .slice(0, 8)
                          .map((candidate) => (
                            <li
                              key={candidate.candidateId}
                              className="timeline-item"
                            >
                              <button
                                className={`timeline-button ${selectedSourceChangeCandidateId === candidate.candidateId ? "is-selected" : ""}`}
                                onClick={() => {
                                  void selectRuntimeSourceChangeCandidate(
                                    candidate.candidateId
                                  );
                                }}
                                type="button"
                              >
                                <div className="timeline-row">
                                  <strong>
                                    {formatRuntimeSourceChangeCandidateLabel(
                                      candidate
                                    )}
                                  </strong>
                                  <span>{candidate.updatedAt}</span>
                                </div>
                                <p>
                                  {formatRuntimeSourceChangeCandidateStatus(
                                    candidate
                                  )}
                                </p>
                              </button>
                            </li>
                          ))}
                      </ul>
                    ) : (
                      <div className="inline-empty-state">
                        <p>No source change candidates are visible for this runtime yet.</p>
                      </div>
                    )}

                    {sourceChangeCandidateDetailError ? (
                      <p className="error-box">{sourceChangeCandidateDetailError}</p>
                    ) : null}

                    {selectedSourceChangeCandidateInspection ? (
                      <div className="turn-detail-card">
                        <div className="section-header">
                          <h3>Selected Source Candidate Detail</h3>
                          <span className="panel-caption">
                            {
                              selectedSourceChangeCandidateInspection.candidate
                                .candidateId
                            }
                          </span>
                        </div>

                        <dl className="status-list compact-list">
                          <div>
                            <dt>Candidate</dt>
                            <dd>
                              {
                                selectedSourceChangeCandidateInspection.candidate
                                  .candidateId
                              }
                            </dd>
                          </div>
                          <div>
                            <dt>Status</dt>
                            <dd>
                              {
                                selectedSourceChangeCandidateInspection.candidate
                                  .status
                              }
                            </dd>
                          </div>
                          <div>
                            <dt>Turn</dt>
                            <dd>
                              {
                                selectedSourceChangeCandidateInspection.candidate
                                  .turnId
                              }
                            </dd>
                          </div>
                          <div>
                            <dt>Snapshot</dt>
                            <dd>
                              {selectedSourceChangeCandidateInspection.candidate
                                .snapshot
                                ? selectedSourceChangeCandidateInspection
                                    .candidate.snapshot.kind
                                : "none"}
                            </dd>
                          </div>
                        </dl>

                        <ul className="detail-list">
                          {formatRuntimeSourceChangeCandidateDetailLines(
                            selectedSourceChangeCandidateInspection.candidate
                          ).map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>

                        {selectedSourceChangeCandidateInspection.candidate.status ===
                        "pending_review" ? (
                          <p className="panel-caption">
                            Awaiting signed User Node source review
                          </p>
                        ) : null}

                        <div className="artifact-preview-panel">
                          <div className="section-header">
                            <h3>Source Diff</h3>
                            <span className="panel-caption">
                              {selectedSourceChangeCandidateDiff
                                ? formatRuntimeSourceChangeCandidateDiffStatus(
                                    selectedSourceChangeCandidateDiff
                                  )
                                : "loading"}
                            </span>
                          </div>

                          {selectedSourceChangeCandidateDiff ? (
                            selectedSourceChangeCandidateDiff.diff.available ? (
                              <pre className="artifact-preview-content">
                                {selectedSourceChangeCandidateDiff.diff.content}
                              </pre>
                            ) : (
                              <div className="inline-empty-state">
                                <p>
                                  {
                                    selectedSourceChangeCandidateDiff.diff
                                      .reason
                                  }
                                </p>
                              </div>
                            )
                          ) : (
                            <div className="inline-empty-state">
                              <p>Loading source diff...</p>
                            </div>
                          )}
                        </div>

                        {selectedSourceChangeCandidateInspection.candidate
                          .sourceChangeSummary.files.length > 0 ? (
                          <div className="artifact-preview-panel">
                            <div className="section-header">
                              <h3>Source File</h3>
                              <span className="panel-caption">
                                {selectedSourceChangeCandidateFilePreview
                                  ? formatRuntimeSourceChangeCandidateFilePreviewStatus(
                                      selectedSourceChangeCandidateFilePreview
                                    )
                                  : selectedSourceChangeCandidateFilePath
                                    ? "loading"
                                    : "none"}
                              </span>
                            </div>

                            <div className="source-file-selector">
                              {selectedSourceChangeCandidateInspection.candidate.sourceChangeSummary.files.map(
                                (file) => (
                                  <button
                                    className={`action-button ${selectedSourceChangeCandidateFilePath === file.path ? "is-selected" : ""}`}
                                    key={file.path}
                                    onClick={() => {
                                      void selectRuntimeSourceChangeCandidateFile(
                                        file.path
                                      );
                                    }}
                                    type="button"
                                  >
                                    {file.path}
                                  </button>
                                )
                              )}
                            </div>

                            {selectedSourceChangeCandidateFilePreview ? (
                              selectedSourceChangeCandidateFilePreview.preview
                                .available ? (
                                <pre className="artifact-preview-content">
                                  {
                                    selectedSourceChangeCandidateFilePreview
                                      .preview.content
                                  }
                                </pre>
                              ) : (
                                <div className="inline-empty-state">
                                  <p>
                                    {
                                      selectedSourceChangeCandidateFilePreview
                                        .preview.reason
                                    }
                                  </p>
                                </div>
                              )
                            ) : selectedSourceChangeCandidateFilePath ? (
                              <div className="inline-empty-state">
                                <p>Loading source file...</p>
                              </div>
                            ) : (
                              <div className="inline-empty-state">
                                <p>No changed source file is available for preview.</p>
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    ) : selectedSourceChangeCandidateId ? (
                      <div className="inline-empty-state">
                        <p>Loading selected source change candidate detail...</p>
                      </div>
                    ) : selectedSourceChangeCandidates.length > 0 ? (
                      <div className="inline-empty-state">
                        <p>Select one source change candidate to inspect its host-backed detail.</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="subpanel">
                    <div className="section-header">
                      <h3>Source History</h3>
                      <span className="panel-caption">
                        {selectedSourceHistory.length} records
                      </span>
                    </div>

                    {sourceHistoryError ? (
                      <p className="error-box">{sourceHistoryError}</p>
                    ) : null}

                    {selectedSourceHistory.length > 0 ? (
                      <ul className="timeline-list">
                        {selectedSourceHistory.slice(0, 8).map((entry) => (
                          <li
                            key={entry.sourceHistoryId}
                            className="timeline-item"
                          >
                            <button
                              className={`timeline-button ${selectedSourceHistoryId === entry.sourceHistoryId ? "is-selected" : ""}`}
                              onClick={() => {
                                void selectRuntimeSourceHistory(
                                  entry.sourceHistoryId
                                );
                              }}
                              type="button"
                            >
                              <div className="timeline-row">
                                <strong>
                                  {formatRuntimeSourceHistoryLabel(entry)}
                                </strong>
                                <span>{entry.appliedAt}</span>
                              </div>
                              <p>{`Candidate ${entry.candidateId} · commit ${entry.commit.slice(0, 12)}`}</p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="inline-empty-state">
                        <p>No source history entries are visible for this runtime yet.</p>
                      </div>
                    )}

                    {sourceHistoryDetailError ? (
                      <p className="error-box">{sourceHistoryDetailError}</p>
                    ) : null}

                    {selectedSourceHistoryInspection ? (
                      <div className="turn-detail-card">
                        <div className="section-header">
                          <h3>Selected Source History Detail</h3>
                          <span className="panel-caption">
                            {selectedSourceHistoryInspection.entry.sourceHistoryId}
                          </span>
                        </div>

                        <ul className="detail-list">
                          {formatRuntimeSourceHistoryDetailLines(
                            selectedSourceHistoryInspection.entry
                          ).map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>

                        <form
                          className="stacked-form"
                          onSubmit={(event) => {
                            event.preventDefault();
                            void requestRuntimeSourceHistoryPublication();
                          }}
                        >
                          <div className="field-grid">
                            <label className="field">
                              <span>Approval ID</span>
                              <input
                                disabled={pendingSourceHistoryPublication}
                                onChange={(event) => {
                                  setSourceHistoryPublicationDraft((current) => ({
                                    ...current,
                                    approvalId: event.target.value
                                  }));
                                }}
                                placeholder="optional approved source_publication id"
                                value={sourceHistoryPublicationDraft.approvalId}
                              />
                            </label>
                            <label className="field">
                              <span>Reason</span>
                              <input
                                disabled={pendingSourceHistoryPublication}
                                onChange={(event) => {
                                  setSourceHistoryPublicationDraft((current) => ({
                                    ...current,
                                    reason: event.target.value
                                  }));
                                }}
                                placeholder="operator publication reason"
                                value={sourceHistoryPublicationDraft.reason}
                              />
                            </label>
                            <label className="field">
                              <span>Requested By</span>
                              <input
                                disabled={pendingSourceHistoryPublication}
                                onChange={(event) => {
                                  setSourceHistoryPublicationDraft((current) => ({
                                    ...current,
                                    requestedBy: event.target.value
                                  }));
                                }}
                                placeholder="operator id"
                                value={sourceHistoryPublicationDraft.requestedBy}
                              />
                            </label>
                            <label className="field">
                              <span>Target Service</span>
                              <input
                                disabled={pendingSourceHistoryPublication}
                                onChange={(event) => {
                                  setSourceHistoryPublicationDraft((current) => ({
                                    ...current,
                                    targetGitServiceRef: event.target.value
                                  }));
                                }}
                                placeholder="default primary git service"
                                value={
                                  sourceHistoryPublicationDraft.targetGitServiceRef
                                }
                              />
                            </label>
                            <label className="field">
                              <span>Target Namespace</span>
                              <input
                                disabled={pendingSourceHistoryPublication}
                                onChange={(event) => {
                                  setSourceHistoryPublicationDraft((current) => ({
                                    ...current,
                                    targetNamespace: event.target.value
                                  }));
                                }}
                                placeholder="default namespace"
                                value={
                                  sourceHistoryPublicationDraft.targetNamespace
                                }
                              />
                            </label>
                            <label className="field">
                              <span>Target Repository</span>
                              <input
                                disabled={pendingSourceHistoryPublication}
                                onChange={(event) => {
                                  setSourceHistoryPublicationDraft((current) => ({
                                    ...current,
                                    targetRepositoryName: event.target.value
                                  }));
                                }}
                                placeholder="default primary repository"
                                value={
                                  sourceHistoryPublicationDraft.targetRepositoryName
                                }
                              />
                            </label>
                            <label className="field checkbox-field">
                              <input
                                checked={
                                  sourceHistoryPublicationDraft.retryFailedPublication
                                }
                                disabled={pendingSourceHistoryPublication}
                                onChange={(event) => {
                                  setSourceHistoryPublicationDraft((current) => ({
                                    ...current,
                                    retryFailedPublication: event.target.checked
                                  }));
                                }}
                                type="checkbox"
                              />
                              <span>Retry failed publication</span>
                            </label>
                          </div>
                          <div className="action-row">
                            <button
                              className="action-button"
                              disabled={pendingSourceHistoryPublication}
                              type="submit"
                            >
                              {pendingSourceHistoryPublication
                                ? "Requesting..."
                                : "Request Publication"}
                            </button>
                            {lastSourceHistoryPublicationSummary ? (
                              <span className="panel-caption">
                                {lastSourceHistoryPublicationSummary}
                              </span>
                            ) : null}
                          </div>
                          {sourceHistoryPublicationError ? (
                            <p className="error-box">
                              {sourceHistoryPublicationError}
                            </p>
                          ) : null}
                        </form>

                        <form
                          className="stacked-form"
                          onSubmit={(event) => {
                            event.preventDefault();
                            void requestRuntimeSourceHistoryReplay();
                          }}
                        >
                          <div className="field-grid">
                            <label className="field">
                              <span>Approval ID</span>
                              <input
                                disabled={pendingSourceHistoryReplay}
                                onChange={(event) => {
                                  setSourceHistoryReplayDraft((current) => ({
                                    ...current,
                                    approvalId: event.target.value
                                  }));
                                }}
                                placeholder="optional approved source_application id"
                                value={sourceHistoryReplayDraft.approvalId}
                              />
                            </label>
                            <label className="field">
                              <span>Reason</span>
                              <input
                                disabled={pendingSourceHistoryReplay}
                                onChange={(event) => {
                                  setSourceHistoryReplayDraft((current) => ({
                                    ...current,
                                    reason: event.target.value
                                  }));
                                }}
                                placeholder="operator replay reason"
                                value={sourceHistoryReplayDraft.reason}
                              />
                            </label>
                            <label className="field">
                              <span>Replay ID</span>
                              <input
                                disabled={pendingSourceHistoryReplay}
                                onChange={(event) => {
                                  setSourceHistoryReplayDraft((current) => ({
                                    ...current,
                                    replayId: event.target.value
                                  }));
                                }}
                                placeholder="optional stable replay id"
                                value={sourceHistoryReplayDraft.replayId}
                              />
                            </label>
                            <label className="field">
                              <span>Requested By</span>
                              <input
                                disabled={pendingSourceHistoryReplay}
                                onChange={(event) => {
                                  setSourceHistoryReplayDraft((current) => ({
                                    ...current,
                                    replayedBy: event.target.value
                                  }));
                                }}
                                placeholder="operator id"
                                value={sourceHistoryReplayDraft.replayedBy}
                              />
                            </label>
                          </div>
                          <div className="action-row">
                            <button
                              className="action-button"
                              disabled={pendingSourceHistoryReplay}
                              type="submit"
                            >
                              {pendingSourceHistoryReplay
                                ? "Requesting..."
                                : "Request Replay"}
                            </button>
                            {lastSourceHistoryReplaySummary ? (
                              <span className="panel-caption">
                                {lastSourceHistoryReplaySummary}
                              </span>
                            ) : null}
                          </div>
                          {sourceHistoryReplayError ? (
                            <p className="error-box">{sourceHistoryReplayError}</p>
                          ) : null}
                        </form>
                      </div>
                    ) : selectedSourceHistoryId ? (
                      <div className="inline-empty-state">
                        <p>Loading selected source history detail...</p>
                      </div>
                    ) : selectedSourceHistory.length > 0 ? (
                      <div className="inline-empty-state">
                        <p>Select one source history entry to inspect its host-backed detail.</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="subpanel">
                    <div className="section-header">
                      <h3>Runtime Memory</h3>
                      <span className="panel-caption">
                        {selectedMemory
                          ? `${selectedMemory.pages.length} pages`
                          : "loading"}
                      </span>
                    </div>

                    <form
                      className="stacked-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void requestRuntimeWikiPublication();
                      }}
                    >
                      <div className="field-grid">
                        <label className="field">
                          <span>Reason</span>
                          <input
                            disabled={pendingWikiPublication}
                            onChange={(event) => {
                              setWikiPublicationDraft((current) => ({
                                ...current,
                                reason: event.target.value
                              }));
                            }}
                            placeholder="operator publication reason"
                            value={wikiPublicationDraft.reason}
                          />
                        </label>
                        <label className="field">
                          <span>Requested By</span>
                          <input
                            disabled={pendingWikiPublication}
                            onChange={(event) => {
                              setWikiPublicationDraft((current) => ({
                                ...current,
                                requestedBy: event.target.value
                              }));
                            }}
                            placeholder="operator id"
                            value={wikiPublicationDraft.requestedBy}
                          />
                        </label>
                        <label className="field">
                          <span>Target Service</span>
                          <input
                            disabled={pendingWikiPublication}
                            onChange={(event) => {
                              setWikiPublicationDraft((current) => ({
                                ...current,
                                targetGitServiceRef: event.target.value
                              }));
                            }}
                            placeholder="default primary git service"
                            value={wikiPublicationDraft.targetGitServiceRef}
                          />
                        </label>
                        <label className="field">
                          <span>Target Namespace</span>
                          <input
                            disabled={pendingWikiPublication}
                            onChange={(event) => {
                              setWikiPublicationDraft((current) => ({
                                ...current,
                                targetNamespace: event.target.value
                              }));
                            }}
                            placeholder="default namespace"
                            value={wikiPublicationDraft.targetNamespace}
                          />
                        </label>
                        <label className="field">
                          <span>Target Repository</span>
                          <input
                            disabled={pendingWikiPublication}
                            onChange={(event) => {
                              setWikiPublicationDraft((current) => ({
                                ...current,
                                targetRepositoryName: event.target.value
                              }));
                            }}
                            placeholder="default primary repository"
                            value={wikiPublicationDraft.targetRepositoryName}
                          />
                        </label>
                        <label className="toggle-field">
                          <input
                            checked={wikiPublicationDraft.retryFailedPublication}
                            disabled={pendingWikiPublication}
                            onChange={(event) => {
                              setWikiPublicationDraft((current) => ({
                                ...current,
                                retryFailedPublication: event.target.checked
                              }));
                            }}
                            type="checkbox"
                          />
                          <span>Retry failed publication</span>
                        </label>
                      </div>
                      <div className="action-row">
                        <button
                          className="action-button"
                          disabled={!selectedRuntimeId || pendingWikiPublication}
                          type="submit"
                        >
                          {pendingWikiPublication
                            ? "Requesting..."
                            : "Publish Wiki"}
                        </button>
                        {lastWikiPublicationSummary ? (
                          <span className="panel-caption">
                            {lastWikiPublicationSummary}
                          </span>
                        ) : null}
                      </div>
                      {wikiPublicationError ? (
                        <p className="error-box">{wikiPublicationError}</p>
                      ) : null}
                    </form>

                    {memoryError ? (
                      <p className="error-box">{memoryError}</p>
                    ) : null}

                    {selectedMemory ? (
                      <>
                        <dl className="status-list compact-list">
                          <div>
                            <dt>Memory root</dt>
                            <dd>{selectedMemory.memoryRoot}</dd>
                          </div>
                          <div>
                            <dt>Focused registers</dt>
                            <dd>{selectedMemory.focusedRegisters.length}</dd>
                          </div>
                          <div>
                            <dt>Task pages</dt>
                            <dd>{selectedMemory.taskPages.length}</dd>
                          </div>
                        </dl>

                        <div className="memory-page-groups">
                          <div>
                            <h4>Focused Registers</h4>
                            {selectedMemoryFocusedRegisters.length > 0 ? (
                              <ul className="timeline-list">
                                {selectedMemoryFocusedRegisters.map((page) => (
                                  <li key={page.path} className="timeline-item">
                                    <button
                                      className={`timeline-button ${selectedMemoryPagePath === page.path ? "is-selected" : ""}`}
                                      onClick={() => {
                                        void selectRuntimeMemoryPage(page.path);
                                      }}
                                      type="button"
                                    >
                                      <div className="timeline-row">
                                        <strong>
                                          {formatRuntimeMemoryPageLabel(page)}
                                        </strong>
                                        <span>{page.updatedAt}</span>
                                      </div>
                                      <p>{formatRuntimeMemoryPageDetail(page)}</p>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="inline-empty-state">
                                <p>No focused memory registers are visible yet.</p>
                              </div>
                            )}
                          </div>

                          <div>
                            <h4>Task Pages</h4>
                            {selectedMemoryTaskPages.length > 0 ? (
                              <ul className="timeline-list">
                                {selectedMemoryTaskPages.slice(0, 8).map((page) => (
                                  <li key={page.path} className="timeline-item">
                                    <button
                                      className={`timeline-button ${selectedMemoryPagePath === page.path ? "is-selected" : ""}`}
                                      onClick={() => {
                                        void selectRuntimeMemoryPage(page.path);
                                      }}
                                      type="button"
                                    >
                                      <div className="timeline-row">
                                        <strong>
                                          {formatRuntimeMemoryPageLabel(page)}
                                        </strong>
                                        <span>{page.updatedAt}</span>
                                      </div>
                                      <p>{formatRuntimeMemoryPageDetail(page)}</p>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="inline-empty-state">
                                <p>No task memory pages are visible yet.</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {selectedMemorySupportingPages.length > 0 ? (
                          <details className="supporting-memory-pages">
                            <summary>Supporting memory pages</summary>
                            <ul className="detail-list">
                              {selectedMemorySupportingPages.slice(0, 8).map((page) => (
                                <li key={page.path}>
                                  <button
                                    className="inline-link-button"
                                    onClick={() => {
                                      void selectRuntimeMemoryPage(page.path);
                                    }}
                                    type="button"
                                  >
                                    {formatRuntimeMemoryPageLabel(page)}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </details>
                        ) : null}
                      </>
                    ) : selectedRuntime ? (
                      <div className="inline-empty-state">
                        <p>Loading runtime memory pages...</p>
                      </div>
                    ) : null}

                    {memoryPageError ? (
                      <p className="error-box">{memoryPageError}</p>
                    ) : null}

                    {selectedMemoryPageInspection ? (
                      <div className="memory-page-detail-card">
                        <div className="section-header">
                          <h3>Selected Memory Page</h3>
                          <span className="panel-caption">
                            {selectedMemoryPageInspection.page.kind}
                          </span>
                        </div>

                        <dl className="status-list compact-list">
                          <div>
                            <dt>Path</dt>
                            <dd>{selectedMemoryPageInspection.page.path}</dd>
                          </div>
                          <div>
                            <dt>Size</dt>
                            <dd>{selectedMemoryPageInspection.page.sizeBytes} bytes</dd>
                          </div>
                          <div>
                            <dt>Updated</dt>
                            <dd>{selectedMemoryPageInspection.page.updatedAt}</dd>
                          </div>
                        </dl>

                        <div className="memory-preview-panel">
                          <div className="section-header">
                            <h3>Memory Preview</h3>
                            <span className="panel-caption">
                              {selectedMemoryPageInspection.preview.available
                                ? selectedMemoryPageInspection.preview.contentType
                                : "unavailable"}
                            </span>
                          </div>

                          {selectedMemoryPageInspection.preview.available ? (
                            <pre className="memory-preview-content">
                              {selectedMemoryPageInspection.preview.content}
                            </pre>
                          ) : (
                            <div className="inline-empty-state">
                              <p>{selectedMemoryPageInspection.preview.reason}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : selectedMemoryPagePath ? (
                      <div className="inline-empty-state">
                        <p>Loading selected memory page...</p>
                      </div>
                    ) : selectedMemory?.pages.length ? (
                      <div className="inline-empty-state">
                        <p>Select one memory page to inspect its bounded preview.</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="subpanel">
                    <div className="section-header">
                      <h3>Runtime Artifacts</h3>
                      <span className="panel-caption">
                        {selectedArtifacts.length} records
                      </span>
                    </div>

                    {selectedArtifacts.length > 0 ? (
                      <ul className="timeline-list">
                        {selectedArtifacts.slice(0, 8).map((artifact) => (
                          <li key={artifact.ref.artifactId} className="timeline-item">
                            <button
                              className={`timeline-button ${selectedArtifactId === artifact.ref.artifactId ? "is-selected" : ""}`}
                              onClick={() => {
                                void selectRuntimeArtifact(artifact.ref.artifactId);
                              }}
                              type="button"
                            >
                              <div className="timeline-row">
                                <strong>{formatRuntimeArtifactLabel(artifact)}</strong>
                                <span>{artifact.updatedAt}</span>
                              </div>
                              <p>{formatRuntimeArtifactStatus(artifact)}</p>
                              <p className="artifact-meta">
                                {formatRuntimeArtifactLocator(artifact)}
                              </p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="inline-empty-state">
                        <p>No persisted runtime artifacts are visible for this runtime yet.</p>
                      </div>
                    )}

                    {artifactDetailError ? (
                      <p className="error-box">{artifactDetailError}</p>
                    ) : null}

                    {selectedArtifactInspection ? (
                      <div className="artifact-detail-card">
                        <div className="section-header">
                          <h3>Selected Artifact Detail</h3>
                          <span className="panel-caption">
                            {selectedArtifactInspection.artifact.ref.artifactId}
                          </span>
                        </div>

                        <dl className="status-list compact-list">
                          <div>
                            <dt>Artifact</dt>
                            <dd>{selectedArtifactInspection.artifact.ref.artifactId}</dd>
                          </div>
                          <div>
                            <dt>Backend</dt>
                            <dd>
                              {selectedArtifactInspection.artifact.ref.backend}
                            </dd>
                          </div>
                          <div>
                            <dt>Kind</dt>
                            <dd>
                              {selectedArtifactInspection.artifact.ref.artifactKind ??
                                "unspecified"}
                            </dd>
                          </div>
                          <div>
                            <dt>Locator</dt>
                            <dd>
                              {formatRuntimeArtifactLocator(
                                selectedArtifactInspection.artifact
                              )}
                            </dd>
                          </div>
                        </dl>

                        <ul className="detail-list">
                          {formatRuntimeArtifactDetailLines(
                            selectedArtifactInspection.artifact
                          ).map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>

                        <div className="artifact-preview-panel">
                          <div className="section-header">
                            <h3>Artifact Preview</h3>
                            <span className="panel-caption">
                              {selectedArtifactPreview?.preview.available
                                ? selectedArtifactPreview.preview.contentType
                                : "unavailable"}
                            </span>
                          </div>

                          {selectedArtifactPreview ? (
                            selectedArtifactPreview.preview.available ? (
                              <pre className="artifact-preview-content">
                                {selectedArtifactPreview.preview.content}
                              </pre>
                            ) : (
                              <div className="inline-empty-state">
                                <p>{selectedArtifactPreview.preview.reason}</p>
                              </div>
                            )
                          ) : (
                            <div className="inline-empty-state">
                              <p>Loading artifact preview...</p>
                            </div>
                          )}
                        </div>

                        <div className="artifact-preview-panel">
                          <div className="section-header">
                            <h3>Artifact History</h3>
                            <span className="panel-caption">
                              {selectedArtifactHistory
                                ? formatRuntimeArtifactHistoryStatus(
                                    selectedArtifactHistory.history
                                  )
                                : "loading"}
                            </span>
                          </div>

                          {selectedArtifactHistory ? (
                            selectedArtifactHistory.history.available ? (
                              <ul className="detail-list">
                                {formatRuntimeArtifactHistoryLines(
                                  selectedArtifactHistory.history
                                ).map((line) => (
                                  <li key={line}>{line}</li>
                                ))}
                              </ul>
                            ) : (
                              <div className="inline-empty-state">
                                <p>{selectedArtifactHistory.history.reason}</p>
                              </div>
                            )
                          ) : (
                            <div className="inline-empty-state">
                              <p>Loading artifact history...</p>
                            </div>
                          )}
                        </div>

                        <div className="artifact-preview-panel">
                          <div className="section-header">
                            <h3>Artifact Diff</h3>
                            <span className="panel-caption">
                              {selectedArtifactDiff
                                ? formatRuntimeArtifactDiffStatus(
                                    selectedArtifactDiff.diff
                                  )
                                : "loading"}
                            </span>
                          </div>

                          {selectedArtifactDiff ? (
                            selectedArtifactDiff.diff.available ? (
                              <pre className="artifact-preview-content">
                                {selectedArtifactDiff.diff.content}
                              </pre>
                            ) : (
                              <div className="inline-empty-state">
                                <p>{selectedArtifactDiff.diff.reason}</p>
                              </div>
                            )
                          ) : (
                            <div className="inline-empty-state">
                              <p>Loading artifact diff...</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : selectedArtifactId ? (
                      <div className="inline-empty-state">
                        <p>Loading selected artifact detail...</p>
                      </div>
                    ) : selectedArtifacts.length > 0 ? (
                      <div className="inline-empty-state">
                        <p>Select one artifact to inspect its host-backed detail.</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="subpanel">
                    <div className="section-header">
                      <h3>Live Runtime Trace</h3>
                      <span
                        className={`status-pill status-${formatEventStreamStateTone(
                          eventStreamState
                        )}`}
                      >
                        {eventStreamState}
                      </span>
                    </div>

                    {runtimeTraceEvents.length > 0 ? (
                      <ul className="timeline-list">
                        {runtimeTraceEvents.map((event) => {
                          const detailLines = formatRuntimeTraceEventDetailLines(event);

                          return (
                            <li key={event.eventId} className="timeline-item">
                              <div className="timeline-row">
                                <strong>{formatRuntimeTraceEventLabel(event)}</strong>
                                <span>{event.timestamp}</span>
                              </div>
                              {detailLines.length > 0 ? (
                                <ul className="detail-list">
                                  {detailLines.map((detailLine) => (
                                    <li key={`${event.eventId}-${detailLine}`}>{detailLine}</li>
                                  ))}
                                </ul>
                              ) : null}
                              <p>{event.message}</p>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="inline-empty-state">
                        <p>No live runtime trace captured for this runtime yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </section>

          <div className="checklist">
            <h3>Current guarantees</h3>
            <ul>
              <li>Studio consumes real host contracts instead of faking topology</li>
              <li>Runtime recovery policy, controller, history, and events all come from host-owned state</li>
              <li>Studio can launch a runtime session through the host API using host-resolved runtime context</li>
              <li>Selected-runtime trace comes from host-derived session, conversation, approval, artifact, and turn events</li>
              <li>Persisted runner turns can be listed and inspected through the same host-client boundary</li>
              <li>CLI and Studio share the same host-client and typed event contracts</li>
              <li>Live recovery visibility does not bypass the host control-plane boundary</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
