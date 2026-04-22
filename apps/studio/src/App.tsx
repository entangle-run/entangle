import { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node
} from "@xyflow/react";
import { createHostClient } from "@entangle/host-client";
import type { HostStatusResponse } from "@entangle/types";

const initialNodes: Node[] = [
  {
    id: "user",
    position: { x: 60, y: 140 },
    data: { label: "User" },
    type: "input"
  },
  {
    id: "it-lead",
    position: { x: 330, y: 60 },
    data: { label: "IT Lead" }
  },
  {
    id: "marketing-lead",
    position: { x: 330, y: 230 },
    data: { label: "Marketing Lead" }
  },
  {
    id: "dev-a",
    position: { x: 620, y: 20 },
    data: { label: "Developer A" }
  },
  {
    id: "dev-b",
    position: { x: 620, y: 120 },
    data: { label: "Developer B" }
  },
  {
    id: "analyst",
    position: { x: 620, y: 250 },
    data: { label: "Analyst" }
  },
  {
    id: "specialist",
    position: { x: 820, y: 250 },
    data: { label: "Specialist" }
  }
];

const initialEdges: Edge[] = [
  { id: "e-user-it", source: "user", target: "it-lead", label: "delegates" },
  { id: "e-user-mkt", source: "user", target: "marketing-lead", label: "delegates" },
  { id: "e-it-dev-a", source: "it-lead", target: "dev-a", label: "delegates" },
  { id: "e-it-dev-b", source: "it-lead", target: "dev-b", label: "delegates" },
  {
    id: "e-dev-peer",
    source: "dev-a",
    target: "dev-b",
    label: "peer collaborates",
    animated: true
  },
  {
    id: "e-mkt-analyst",
    source: "marketing-lead",
    target: "analyst",
    label: "delegates"
  },
  {
    id: "e-analyst-specialist",
    source: "analyst",
    target: "specialist",
    label: "delegates"
  }
];

export function App() {
  const [status, setStatus] = useState<HostStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const baseUrl =
      import.meta.env.VITE_ENTANGLE_HOST_URL ?? "http://localhost:7071";
    const client = createHostClient({ baseUrl });

    void client
      .getHostStatus()
      .then((nextStatus) => {
        setStatus(nextStatus);
        setError(null);
      })
      .catch((caught: unknown) => {
        setError(
          caught instanceof Error
            ? caught.message
            : "Unknown error while loading host status."
        );
      });
  }, []);

  const statusTone = useMemo(() => {
    if (!status) {
      return "pending";
    }

    return status.status;
  }, [status]);

  return (
    <main className="studio-shell">
      <section className="hero-card">
        <p className="eyebrow">Entangle Studio</p>
        <h1>Graph-native control surface for an AI organization</h1>
        <p className="lede">
          This scaffold keeps the real architecture visible: host-owned control
          plane, runner-per-node execution, signed coordination over Nostr, and
          artifact-backed collaboration.
        </p>
      </section>

      <section className="content-grid">
        <div className="panel graph-panel">
          <div className="panel-header">
            <h2>Demo Graph</h2>
            <span className="panel-caption">
              Non-flat topology for the hackathon runtime profile
            </span>
          </div>
          <div className="graph-canvas">
            <ReactFlow fitView nodes={initialNodes} edges={initialEdges}>
              <Background />
              <MiniMap />
              <Controls />
            </ReactFlow>
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
              <dd>{status?.graphRevisionId ?? "not reported yet"}</dd>
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

          <div className="checklist">
            <h3>Scaffold guarantees</h3>
            <ul>
              <li>One monorepo with explicit internal package boundaries</li>
              <li>Schema ownership frozen in <code>packages/types</code></li>
              <li>Host-first control plane, not frontend-owned orchestration</li>
              <li>Docker-backed local profile under <code>deploy/compose</code></li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
