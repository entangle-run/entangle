import {
  startTransition,
  useCallback,
  useEffect,
  useEffectEvent,
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
  HostSessionSummary,
  HostStatusResponse,
  RuntimeInspectionResponse,
  RuntimeRecoveryInspectionResponse
} from "@entangle/types";
import {
  collectRuntimeRecoveryEvents,
  deriveSelectedRuntimeId,
  describeRuntimeRecoveryController,
  describeRuntimeRecoveryPolicy,
  formatRuntimeRecoveryEventLabel
} from "./recovery-inspection.js";
import {
  collectRuntimeTraceEvents,
  formatRuntimeTraceEventLabel
} from "./runtime-trace-inspection.js";
import {
  formatRuntimeArtifactLabel,
  formatRuntimeArtifactLocator,
  formatRuntimeArtifactStatus,
  sortRuntimeArtifacts
} from "./runtime-artifact-inspection.js";
import {
  filterRuntimeSessions,
  formatRuntimeSessionDetail,
  formatRuntimeSessionLabel
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
  selectedRuntimeId: string | null
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
  const baseUrl =
    import.meta.env.VITE_ENTANGLE_HOST_URL ?? "http://localhost:7071";
  const client = useMemo(() => createHostClient({ baseUrl }), [baseUrl]);
  const [status, setStatus] = useState<HostStatusResponse | null>(null);
  const [graphInspection, setGraphInspection] =
    useState<GraphInspectionResponse | null>(null);
  const [runtimes, setRuntimes] = useState<RuntimeInspectionResponse[]>([]);
  const [selectedRuntimeId, setSelectedRuntimeId] = useState<string | null>(null);
  const [selectedRecovery, setSelectedRecovery] =
    useState<RuntimeRecoveryInspectionResponse | null>(null);
  const [selectedArtifacts, setSelectedArtifacts] = useState<ArtifactRecord[]>([]);
  const [artifactError, setArtifactError] = useState<string | null>(null);
  const [selectedSessions, setSelectedSessions] = useState<HostSessionSummary[]>([]);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [hostEvents, setHostEvents] = useState<HostEventRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [pendingRuntimeAction, setPendingRuntimeAction] =
    useState<RuntimeLifecycleAction | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [eventStreamState, setEventStreamState] =
    useState<EventStreamState>("connecting");
  const [eventStreamError, setEventStreamError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      const [nextStatus, nextGraphInspection, nextRuntimeList] = await Promise.all([
        client.getHostStatus(),
        client.getGraph(),
        client.listRuntimes()
      ]);

      startTransition(() => {
        setStatus(nextStatus);
        setGraphInspection(nextGraphInspection);
        setRuntimes(nextRuntimeList.runtimes);
        setError(null);
      });
    } catch (caught: unknown) {
      startTransition(() => {
        setError(
          normalizeError(caught, "Unknown error while loading host state.")
        );
      });
    }
  }, [client]);

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
        setSelectedArtifacts(sortRuntimeArtifacts(artifactResult.value.artifacts));
        setArtifactError(null);
      } else {
        setSelectedArtifacts([]);
        setArtifactError(
          normalizeError(
            artifactResult.reason,
            "Unknown error while loading runtime artifacts."
          )
        );
      }

      if (sessionResult.status === "fulfilled") {
        setSelectedSessions(filterRuntimeSessions(sessionResult.value.sessions, nodeId));
        setSessionError(null);
      } else {
        setSelectedSessions([]);
        setSessionError(
          normalizeError(
            sessionResult.reason,
            "Unknown error while loading runtime sessions."
          )
        );
      }
    });
  }, [client]);

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

  const handleHostEvent = useEffectEvent((event: HostEventRecord) => {
    startTransition(() => {
      setHostEvents((current) => [event, ...current].slice(0, 40));
    });

    if (
      selectedRuntimeId &&
      collectRuntimeRecoveryEvents([event], selectedRuntimeId, 1).length > 0
    ) {
      void refreshSelectedRuntimeDetails(selectedRuntimeId);
      return;
    }

    if (event.type === "artifact.trace.event" && event.nodeId === selectedRuntimeId) {
      void refreshSelectedRuntimeDetails(selectedRuntimeId);
      return;
    }

    if (event.type === "session.updated" && event.nodeId === selectedRuntimeId) {
      void refreshSelectedRuntimeDetails(selectedRuntimeId);
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
      setSessionError(null);
      setSelectedSessions([]);
      setSelectedRecovery(null);
      setMutationError(null);
      setRecoveryError(null);
      return;
    }

    setArtifactError(null);
    setSelectedArtifacts([]);
    setSessionError(null);
    setSelectedSessions([]);
    setMutationError(null);
    setSelectedRecovery(null);
    void refreshSelectedRuntimeDetails(selectedRuntimeId);
  }, [refreshSelectedRuntimeDetails, selectedRuntimeId]);

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
        setEventStreamState("live");
        setEventStreamError(null);
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
  const statusTone = useMemo(() => status?.status ?? "pending", [status]);
  const flowProjection = useMemo(
    () => projectGraphToFlow(graphInspection?.graph, selectedRuntimeId),
    [graphInspection, selectedRuntimeId]
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
                onNodeClick={(_event, node) => {
                  if (runtimes.some((runtime) => runtime.nodeId === node.id)) {
                    setSelectedRuntimeId(node.id);
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
                      setSelectedRuntimeId(runtime.nodeId);
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
                            <div className="timeline-row">
                              <strong>
                                {formatRuntimeSessionLabel(session, selectedRuntimeId)}
                              </strong>
                              <span>{session.updatedAt}</span>
                            </div>
                            <p>{formatRuntimeSessionDetail(session)}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="inline-empty-state">
                        <p>No persisted sessions currently reference this runtime.</p>
                      </div>
                    )}
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
                            <div className="timeline-row">
                              <strong>{formatRuntimeArtifactLabel(artifact)}</strong>
                              <span>{artifact.updatedAt}</span>
                            </div>
                            <p>{formatRuntimeArtifactStatus(artifact)}</p>
                            <p className="artifact-meta">
                              {formatRuntimeArtifactLocator(artifact)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="inline-empty-state">
                        <p>No persisted runtime artifacts are visible for this runtime yet.</p>
                      </div>
                    )}
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
                        {runtimeTraceEvents.map((event) => (
                          <li key={event.eventId} className="timeline-item">
                            <div className="timeline-row">
                              <strong>{formatRuntimeTraceEventLabel(event)}</strong>
                              <span>{event.timestamp}</span>
                            </div>
                            <p>{event.message}</p>
                          </li>
                        ))}
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
