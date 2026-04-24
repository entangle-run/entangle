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
import { createHostClient } from "@entangle/host-client";
import type {
  ArtifactRecord,
  GraphInspectionResponse,
  GraphSpec,
  HostEventRecord,
  SessionInspectionResponse,
  HostSessionSummary,
  HostStatusResponse,
  PackageSourceInspectionResponse,
  RuntimeArtifactInspectionResponse,
  RuntimeInspectionResponse,
  RuntimeRecoveryInspectionResponse
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
import { summarizeValidationReport } from "./graph-mutation-feedback.js";
import {
  buildManagedNodeCreateRequest,
  buildManagedNodeEditorDraft,
  buildManagedNodeReplacementRequest,
  createDefaultManagedNodeEditorDraft,
  createEmptyManagedNodeEditorDraft,
  formatManagedNodeDetail,
  formatManagedNodeLabel,
  isManagedNodeEditorDraftUninitialized,
  managedNodeKindOptions,
  sortManagedGraphNodes,
  type ManagedNodeEditorDraft
} from "./graph-node-mutation.js";
import {
  buildPackageSourceAdmissionRequest,
  createEmptyPackageSourceAdmissionDraft,
  formatPackageSourceDetail,
  formatPackageSourceOptionLabel,
  sortPackageSourceInspections,
  type PackageSourceAdmissionDraft
} from "./package-source-admission.js";
import {
  shouldRefreshOverviewFromHostEvent,
  shouldRefreshSelectedRuntimeFromHostEvent
} from "./host-event-refresh.js";
import {
  collectRuntimeRecoveryEvents,
  deriveSelectedRuntimeId,
  describeRuntimeRecoveryController,
  describeRuntimeRecoveryPolicy,
  formatRuntimeRecoveryEventLabel
} from "./recovery-inspection.js";
import {
  collectRuntimeTraceEvents,
  formatRuntimeTraceEventDetailLines,
  formatRuntimeTraceEventLabel
} from "./runtime-trace-inspection.js";
import {
  formatRuntimeArtifactDetailLines,
  formatRuntimeArtifactLabel,
  formatRuntimeArtifactLocator,
  formatRuntimeArtifactStatus,
  sortRuntimeArtifacts
} from "./runtime-artifact-inspection.js";
import {
  collectSessionInspectionTraceIds,
  filterRuntimeSessions,
  formatSessionInspectionNodeDetail,
  formatSessionInspectionNodeLabel,
  formatRuntimeSessionDetail,
  formatRuntimeSessionLabel,
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
  const [graphInspection, setGraphInspection] =
    useState<GraphInspectionResponse | null>(null);
  const [packageSources, setPackageSources] = useState<
    PackageSourceInspectionResponse[]
  >([]);
  const [packageSourceError, setPackageSourceError] = useState<string | null>(null);
  const [packageAdmissionDraft, setPackageAdmissionDraft] =
    useState<PackageSourceAdmissionDraft>(createEmptyPackageSourceAdmissionDraft);
  const [packageAdmissionError, setPackageAdmissionError] = useState<string | null>(null);
  const [pendingPackageAdmission, setPendingPackageAdmission] = useState(false);
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
  const [selectedArtifacts, setSelectedArtifacts] = useState<ArtifactRecord[]>([]);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [selectedArtifactInspection, setSelectedArtifactInspection] =
    useState<RuntimeArtifactInspectionResponse | null>(null);
  const [artifactError, setArtifactError] = useState<string | null>(null);
  const [artifactDetailError, setArtifactDetailError] = useState<string | null>(null);
  const [selectedSessions, setSelectedSessions] = useState<HostSessionSummary[]>([]);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSessionInspection, setSelectedSessionInspection] =
    useState<SessionInspectionResponse | null>(null);
  const [sessionDetailError, setSessionDetailError] = useState<string | null>(null);
  const [hostEvents, setHostEvents] = useState<HostEventRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [pendingRuntimeAction, setPendingRuntimeAction] =
    useState<RuntimeLifecycleAction | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [eventStreamState, setEventStreamState] =
    useState<EventStreamState>("connecting");
  const [eventStreamError, setEventStreamError] = useState<string | null>(null);
  const selectedRuntimeIdRef = useRef<string | null>(null);
  const selectedArtifactIdRef = useRef<string | null>(null);
  const selectedSessionIdRef = useRef<string | null>(null);

  selectedRuntimeIdRef.current = selectedRuntimeId;
  selectedArtifactIdRef.current = selectedArtifactId;
  selectedSessionIdRef.current = selectedSessionId;

  const loadOverview = useCallback(async () => {
    const [statusResult, graphResult, runtimeListResult, packageSourceResult] =
      await Promise.allSettled([
        client.getHostStatus(),
        client.getGraph(),
        client.listRuntimes(),
        client.listPackageSources()
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
    });
  }, [client]);

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

  const loadSelectedArtifactInspection = useCallback(
    async (nodeId: string, artifactId: string) => {
      try {
        const inspection = await client.getRuntimeArtifact(nodeId, artifactId);

        if (
          selectedRuntimeIdRef.current !== nodeId ||
          selectedArtifactIdRef.current !== artifactId
        ) {
          return;
        }

        startTransition(() => {
          setSelectedArtifactInspection(inspection);
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
          setArtifactDetailError(
            normalizeError(caught, "Unknown error while loading artifact detail.")
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
      artifactResult,
      sessionResult
    ] =
      await Promise.allSettled([
        client.getHostStatus(),
        client.listRuntimes(),
        client.getRuntimeRecovery(nodeId, 20),
        client.listRuntimeArtifacts(nodeId),
        client.listSessions()
      ]);
    const nextSelectedSessions =
      sessionResult.status === "fulfilled"
        ? filterRuntimeSessions(sessionResult.value.sessions, nodeId)
        : [];
    const nextSelectedArtifacts =
      artifactResult.status === "fulfilled"
        ? sortRuntimeArtifacts(artifactResult.value.artifacts)
        : [];
    const currentSelectedArtifactId = selectedArtifactId;
    const shouldRefreshSelectedArtifact =
      currentSelectedArtifactId !== null &&
      nextSelectedArtifacts.some(
        (artifact) => artifact.ref.artifactId === currentSelectedArtifactId
      );
    const selectedArtifactResult = shouldRefreshSelectedArtifact
      ? (
          await Promise.allSettled([
            client.getRuntimeArtifact(nodeId, currentSelectedArtifactId)
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

      if (artifactResult.status === "fulfilled") {
        setSelectedArtifacts(nextSelectedArtifacts);
        setArtifactError(null);

        if (!selectedArtifactId) {
          setSelectedArtifactInspection(null);
          setArtifactDetailError(null);
        } else if (!shouldRefreshSelectedArtifact) {
          setSelectedArtifactId(null);
          setSelectedArtifactInspection(null);
          setArtifactDetailError(null);
        } else if (selectedArtifactResult?.status === "fulfilled") {
          setSelectedArtifactInspection(selectedArtifactResult.value);
          setArtifactDetailError(null);
        } else if (selectedArtifactResult?.status === "rejected") {
          setSelectedArtifactInspection(null);
          setArtifactDetailError(
            normalizeError(
              selectedArtifactResult.reason,
              "Unknown error while loading artifact detail."
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
        setArtifactDetailError(null);
      }

      if (sessionResult.status === "fulfilled") {
        setSelectedSessions(nextSelectedSessions);
        setSessionError(null);

        if (!selectedSessionId) {
          setSelectedSessionInspection(null);
          setSessionDetailError(null);
        } else if (!shouldRefreshSelectedSession) {
          setSelectedSessionId(null);
          setSelectedSessionInspection(null);
          setSessionDetailError(null);
        } else if (selectedSessionResult?.status === "fulfilled") {
          if (sessionInspectionReferencesRuntime(selectedSessionResult.value, nodeId)) {
            setSelectedSessionInspection(selectedSessionResult.value);
            setSessionDetailError(null);
          } else {
            setSelectedSessionId(null);
            setSelectedSessionInspection(null);
            setSessionDetailError(null);
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
      }
    });
  }, [client, selectedArtifactId, selectedSessionId]);

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

  const selectRuntimeSession = useCallback(
    async (sessionId: string) => {
      if (!selectedRuntimeId) {
        return;
      }

      setSelectedSessionId(sessionId);
      setSelectedSessionInspection(null);
      setSessionDetailError(null);
      await loadSelectedSessionInspection(selectedRuntimeId, sessionId);
    },
    [loadSelectedSessionInspection, selectedRuntimeId]
  );

  const selectRuntimeArtifact = useCallback(
    async (artifactId: string) => {
      if (!selectedRuntimeId) {
        return;
      }

      setSelectedArtifactId(artifactId);
      setSelectedArtifactInspection(null);
      setArtifactDetailError(null);
      await loadSelectedArtifactInspection(selectedRuntimeId, artifactId);
    },
    [loadSelectedArtifactInspection, selectedRuntimeId]
  );

  const graphNodeIds = useMemo(
    () => graphInspection?.graph?.nodes.map((node) => node.nodeId) ?? [],
    [graphInspection]
  );
  const managedGraphNodes = useMemo(
    () => sortManagedGraphNodes(graphInspection?.graph),
    [graphInspection]
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
    if (!selectedRuntimeId) {
      setArtifactError(null);
      setSelectedArtifacts([]);
      setSelectedArtifactId(null);
      setSelectedArtifactInspection(null);
      setArtifactDetailError(null);
      setSessionError(null);
      setSelectedSessions([]);
      setSelectedSessionId(null);
      setSelectedSessionInspection(null);
      setSessionDetailError(null);
      setSelectedRecovery(null);
      setMutationError(null);
      setRecoveryError(null);
      return;
    }

    setArtifactError(null);
    setSelectedArtifacts([]);
    setSelectedArtifactId(null);
    setSelectedArtifactInspection(null);
    setArtifactDetailError(null);
    setSessionError(null);
    setSelectedSessions([]);
    setSelectedSessionId(null);
    setSelectedSessionInspection(null);
    setSessionDetailError(null);
    setMutationError(null);
    setSelectedRecovery(null);
    void refreshSelectedRuntimeDetails(selectedRuntimeId);
  }, [refreshSelectedRuntimeDetails, selectedRuntimeId]);

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
  const statusTone = useMemo(() => status?.status ?? "pending", [status]);
  const flowProjection = useMemo(
    () => projectGraphToFlow(graphInspection?.graph, selectedRuntimeId, selectedEdgeId),
    [graphInspection, selectedEdgeId, selectedRuntimeId]
  );
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
          approval, artifact, and runner activity that the host is actually
          emitting.
        </p>
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

              {packageSources.length > 0 ? (
                <div className="package-source-list">
                  {packageSources.map((inspection) => (
                    <div
                      key={inspection.packageSource.packageSourceId}
                      className="package-source-card"
                    >
                      <strong>{formatPackageSourceOptionLabel(inspection)}</strong>
                      <span>{formatPackageSourceDetail(inspection)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="inline-empty-state">
                  <p>No package sources are admitted yet.</p>
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
                  </div>

                  <p className="editor-meta">
                    This bounded slice edits only the managed node identity,
                    role, display name, and package binding. Existing autonomy
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
          </dl>

          {error ? <p className="error-box">{error}</p> : null}

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
                    <dt>Restart generation</dt>
                    <dd>{selectedRuntime?.restartGeneration ?? "loading"}</dd>
                  </div>
                </dl>

                {recoveryError ? <p className="error-box">{recoveryError}</p> : null}
                {artifactError ? <p className="error-box">{artifactError}</p> : null}
                {sessionError ? <p className="error-box">{sessionError}</p> : null}
                {mutationError ? <p className="error-box">{mutationError}</p> : null}

                <div className="recovery-column">
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
                        </dl>

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
              <li>Selected-runtime trace comes from host-derived session, conversation, approval, artifact, and turn events</li>
              <li>CLI and Studio share the same host-client and typed event contracts</li>
              <li>Live recovery visibility does not bypass the host control-plane boundary</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
