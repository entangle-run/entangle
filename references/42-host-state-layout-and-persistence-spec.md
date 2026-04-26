# Host State Layout and Persistence Specification

This document freezes the first serious on-disk layout for live local Entangle
state.

The goal is to prevent implementation from scattering desired state, observed
state, revision history, traces, imports, and node workspaces across ad hoc
directories that later become hard to migrate.

## Design rule

Tracked repository source and mutable local host state must remain separate.

That means:

- source code and canonical documents stay in the repository tree;
- live runtime state stays in a host-managed Entangle state root;
- package sources admitted into the live system are represented as package
  source records, not as implicit filesystem assumptions;
- traces and reconciliation state are durable enough for debugging and restart,
  but not treated as hand-authored project truth.

## 1. Default host state root

Recommended default local host state root:

- `.entangle/`

Recommended first serious environment override:

- `ENTANGLE_HOME`

This gives:

- a conventional local runtime root for repository-backed development;
- a clean override when the operator wants state outside the repo checkout.

`.entangle/` should be git-ignored by default.

## 2. Logical state partitions

The host state root should distinguish at least these partitions:

- desired state
- observed state
- trace state
- imported package storage
- node workspaces
- host-owned secret storage
- caches and ephemeral runtime data

These are not interchangeable.

## 3. Recommended host state layout

Recommended first serious layout:

```text
.entangle/
  host/
    state-layout.json
    desired/
      catalog.json
      graph/
        current.json
        revisions/
          <graph_revision_id>.json
      package-sources/
        <package_source_id>.json
      node-bindings/
        <node_id>.json
      runtime-intents/
        <node_id>.json
    observed/
      runtimes/
        <node_id>.json
      reconciliation/
        latest.json
        history/
          <timestamp>-<event>.json
      health/
        host.json
        dependencies.json
    traces/
      control-plane/
        <date>.jsonl
      sessions/
        <session_id>.jsonl
    imports/
      packages/
        <package_source_id>/
          package/
    workspaces/
      <node_id>/
        package/
        injected/
        memory/
        workspace/
        runtime/
    cache/
      validator/
      projections/
      temp/
.entangle-secrets/
  runtime-identities/
    <graph_id>-<node_id>.json
    <graph_id>-<node_id>.nostr-secret
```

This is the first serious recommendation, not a forever promise about exact
folder names. The logical separation is the important part.

The separate secret root is important: host-owned Nostr identity material
should not share the same default storage partition as injected runtime context
and mutable runner workspaces.

## 4. Desired state semantics

`desired/` is the authoritative local control-plane state.

It should contain:

- the active deployment resource catalog;
- the currently selected graph and revision metadata;
- admitted package-source records;
- normalized node-binding records;
- runtime intent records indicating which nodes should be running.

`desired/` is not:

- a trace log;
- a cache;
- a browser-owned representation;
- a best-effort reconstruction from running containers.

## 5. Observed state semantics

`observed/` captures what the host currently sees in the running environment.

It should include:

- runtime presence and status per node;
- health snapshots;
- effective mounted revision or binding metadata when known;
- reconciliation outcomes and drift information.

`observed/` may be partially reconstructable, but persisting it is valuable for:

- restart diagnosis;
- degraded-state visibility;
- demo reliability;
- test inspection.

## 6. Trace persistence semantics

Trace storage should be durable and append-oriented from the first serious
implementation.

Recommended first profile:

- JSONL files under `.entangle/host/traces/`

At minimum:

- one append-oriented session trace file per session;
- one rolling or date-partitioned control-plane trace log.

This avoids needing a telemetry platform while preserving:

- inspectability;
- replayability;
- Studio-readable history;
- restart resilience.

## 7. Imported package storage

If a package is admitted via `local_archive`, the host should materialize it
under:

- `.entangle/host/imports/packages/<package_source_id>/package/`

If a package is admitted via `local_path`, the package-source record may point
at the external path, but the host should still materialize the admitted
contents into an immutable host-managed package store.

The host should not confuse:

- imported package storage;
- immutable package-store objects;
- runtime workspaces;
- tracked package templates inside the repo.

## 8. Workspace semantics

Each running node workspace should remain under:

- `.entangle/host/workspaces/<node_id>/`

The workspace should preserve the logical structure already established in the
binding and runtime-context specs:

- `package/`
- `injected/`
- `memory/`
- `workspace/`
- `runtime/`
- `retrieval/`
- `source/`
- `engine-state/`
- `wiki-repository/`

The host may choose bind mounts or named volumes underneath this abstraction,
but the logical structure should remain consistent.

The package surface inside `workspaces/<node_id>/package/` should be treated as
host-managed runtime materialization backed by the immutable package store, not
as a mutable per-node copy and not as an implicit symlink to the original
admitted source path outside host state.

For the L3 agentic node runtime, `source/` is the coding-engine worktree,
`engine-state/` is the node-scoped engine database/config/cache surface,
`retrieval/` is the runner-owned inbound artifact cache, and
`wiki-repository/` is reserved for future memory-as-repository semantics. The
active memory source of truth remains `memory/wiki` until migration and
rollback semantics are implemented.

The runner may keep internal source-change harvesting state under
`runtime/source-snapshot.git`. That shadow git directory is runner-owned
runtime state, not a protocol artifact, not an artifact backend repository, and
not a `.git` directory inside the node `source/` workspace. It exists only to
compare the source workspace before and after engine turns until commit
candidate, publication, and policy workflows are implemented.

## 9. What should be tracked in git versus ignored

Tracked:

- code
- specs
- deployment definitions
- example packages
- example graph and catalog seed files

Ignored:

- `.entangle/`
- imported package copies
- live node workspaces
- runtime traces
- observed-state snapshots
- caches
- Entangle secrets

This is the right split between product source and operator state.

## 10. Recovery semantics

On host startup, the first serious implementation should:

1. verify or materialize `host/state-layout.json`;
2. refuse unsupported future or legacy state layouts instead of silently
   mutating them;
3. load `desired/`;
4. load any useful `observed/` snapshots;
5. inspect actual runtime state;
6. reconcile toward `desired/`;
7. continue appending traces instead of discarding prior state silently.

This is the minimum disciplined recovery model for a real local control plane.

The active Local implementation writes `state-layout.json` with product
`entangle`, schema version `1`, and layout version `1`. `GET
/v1/host/status`, shared host-client formatters, Studio, and `entangle deployment
doctor` expose the same machine-readable layout status so upgrade checks are
visible before repair, backup, or restore operations become available.

## 11. Relationship to Compose and Docker

This layout does not require every file to live inside one container volume.

It defines the logical host-owned state model.

The Compose and Docker profile may map that model using:

- bind mounts for inspectability;
- named volumes for stable services;
- host-managed workspace directories for node runtimes.

The state model should outlive any one Docker convenience choice.

## 12. Hackathon profile

For the hackathon:

- `.entangle/` as the default Entangle state root is sufficient;
- JSONL trace persistence is sufficient;
- one live graph in `desired/graph/current.json` plus revision history is
  sufficient;
- one workspace per active node is sufficient.

This is simple without being architecturally weak.

## 13. Rejected anti-patterns

Reject these directions:

- storing applied graph truth only in browser memory;
- scattering host state across undocumented temp directories;
- mixing desired state, observed state, and trace data into one generic JSON
  file;
- writing mutable live state back into tracked package templates by default;
- treating running containers as the only source of truth for Entangle state.

## 14. Final recommendation

Freeze this as the first implementation rule:

> Entangle should use a host-owned local runtime root, defaulting to
> `.entangle/`, with explicit partitions for desired state, observed state,
> traces, imported packages, and per-node workspaces.
