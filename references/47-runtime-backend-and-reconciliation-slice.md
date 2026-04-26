# Runtime Backend and Reconciliation Slice

This document records the implementation batch that moved Entangle from
runtime-materialization only into the first real runtime-backend and
reconciliation slice.

It does not claim that the runtime layer is complete. It records what is now
implemented, what was corrected architecturally, and what still remains for the
next runtime phases.

## What this slice changed

The host no longer stops at writing desired-state and injected runtime context.
It now owns:

- an explicit runtime-backend abstraction;
- backend-aware observed runtime state;
- a reconciliation snapshot under observed host state;
- package materialization suitable for backend-managed runners;
- first-class host status exposure for reconciliation outcomes.

## 1. Runtime-backend abstraction

`services/host` now owns a narrow runtime-backend boundary instead of scattering
runtime-process logic across host state and API routes.

The implemented shape is:

- one internal `RuntimeBackend` interface;
- one `memory` backend used for tests and deterministic local control-plane
  validation;
- one `docker` backend used as the first serious runtime backend for the local
  product profile.

The important design result is that `state.ts` now asks the backend to
reconcile one runtime, rather than embedding container assumptions directly into
host state mutation logic.

## 2. Package materialization correction

The earlier runtime slice moved away from a direct symlink to the original
admitted package path, but still relied on copying a package snapshot into each
node workspace.

That was better than linking directly to an arbitrary external path, but it is
still not the right long-term basis for:

- deduplicated Entangle state;
- stable recovery;
- backend-managed sibling runtimes;
- clear separation between immutable package content and mutable node state.

The host now treats package contents as immutable store objects and exposes a
host-managed package surface inside each node workspace, rather than copying the
package tree per node.

This makes the runtime workspace more disciplined and better aligned with:

- backend-managed runners;
- shared-volume or bind-mount strategies with stable package objects;
- future replay and recovery requirements.

## 3. Observed runtime semantics

Observed runtime state is no longer just a preserved placeholder record.

The host now derives per-node observed runtime state from reconciliation
outcomes and persists:

- backend kind;
- observed runtime state;
- runtime handle when available;
- status message;
- last error when reconciliation fails.

This makes runtime inspection responses and host status materially more useful
for Studio, CLI, and debugging.

## 4. Reconciliation snapshot

The host now writes a structured reconciliation snapshot under observed host
state.

The current snapshot records:

- backend kind;
- graph and revision when available;
- last reconciliation timestamp;
- managed runtime count;
- running runtime count;
- stopped runtime count;
- failed runtime count;
- a per-node summary list.

This is the first serious persisted view of host-side runtime convergence
instead of inferring everything ad hoc from the current graph on every client
surface.

## 5. Host status surface

`GET /v1/host/status` now exposes reconciliation data instead of only aggregate
runtime counts.

That surface now includes:

- backend kind;
- last reconciled timestamp;
- managed/running/stopped/failed runtime counts.

This makes the host status endpoint closer to a real control-plane health
surface.

## 6. Docker-backed federated dev profile

The federated dev Compose profile is now aligned with the runtime backend model:

- the host receives explicit Docker runtime configuration;
- host state is mounted at a stable shared path;
- the host talks to the Docker Engine API through an explicit control path such
  as the Docker socket instead of shelling out through the `docker` CLI;
- a build-only runner image profile is declared for local operator workflows;
- the Compose network is made explicit and stable for host-managed runners.

This still does not mean the product is Docker-only. It means the first serious
federated dev profile is finally explicit enough to support a Docker-backed runtime
backend without hidden assumptions.

## 7. Quality corrections in this slice

This batch also corrected two quality issues that surfaced during the audit:

- the runtime backend now degrades one node into observed `failed` state when
  backend reconciliation throws, instead of letting the whole host surface
  collapse immediately;
- the repository no longer relies on an opaque build-first gate for
  workspace-wide typecheck, and now models the composite TypeScript build graph
  explicitly through project references and solution-build typechecking.

This slice was also manually smoke-validated against a real local Docker
runtime by building the runner image, admitting a package, applying a graph,
and confirming that the host observed a real runner container as `running`.

## 8. What remains next

This slice still does not complete runtime execution.

The next major runtime work remains:

- runner-side Nostr lifecycle and session handling;
- git artifact work and handoff semantics;
- richer session-level host event classes on top of the now-implemented host
  event surface;
- explicit restart semantics;
- stronger Docker smoke coverage in automation rather than only manual local
  validation;
- Studio visualization of reconciliation and runtime slices beyond the current
  graph/state baseline.

## 9. Why this slice matters

Before this batch, Entangle could prepare runtimes.

After this batch, Entangle starts behaving more like a real local control plane:

- it owns a runtime backend;
- it reconciles desired state into observed state;
- it persists runtime convergence information;
- it exposes more truthful runtime health through the host boundary;
- and it does so without collapsing the architecture back into frontend-owned
  orchestration.
