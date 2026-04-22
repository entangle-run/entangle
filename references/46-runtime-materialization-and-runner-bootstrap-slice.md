# Runtime Materialization and Runner Bootstrap Slice

This document records the first implemented runtime-materialization slice after
the initial host control-plane baseline.

It is not a new architectural pivot. It captures what is now concretely
implemented in the repository and clarifies what remains deliberately deferred.

## What this slice achieved

The repository now has a real path from:

- admitted package source;
- applied graph revision;
- resolved deployment resource catalog;
- effective node binding;
- injected runtime context;
- runner bootstrap request.

That path is now test-backed and exercised through the same host boundary used
by CLI and future Studio flows.

## 1. Runtime-oriented contract layer

`packages/types` now includes a first serious runtime contract surface:

- runtime intent records;
- observed runtime records;
- effective node binding schema;
- effective runtime context schema;
- runtime inspection/list DTOs for the host API;
- shared resource-resolution helpers for graph defaults, node overrides, and
  deployment defaults.

The important design result is that validator and host no longer need to invent
 their own parallel resolution logic for relay, git, and model bindings.

## 2. Host state materialization

`entangle-host` now materializes runtime-facing state under `.entangle/host`
instead of stopping at graph persistence alone.

For each non-user node in the active graph, the current host slice now
maintains:

- a desired node-binding record;
- a desired runtime-intent record;
- an observed runtime record;
- a workspace root under `.entangle/host/workspaces/<nodeId>/`;
- an injected `effective-runtime-context.json` when the node has a realizable
  runtime context.

For `local_path` package sources, the host also establishes a workspace
`package/` link to the admitted package root and seeds node memory from the
package template.

## 3. Desired state semantics

The implemented desired-state rule is:

- if a non-user node has a realizable runtime context, it defaults to
  `running`;
- if it lacks a realizable runtime context, it resolves to `stopped` with an
  explanatory reason;
- if an operator explicitly stops a realizable runtime, that intent is
  preserved across later synchronization passes until an explicit start request
  changes it.

This is a useful first reconciliation rule because it separates:

- structural inability to run;
- normal desired running state;
- explicit operator stop.

## 4. Current host runtime API slice

The implemented runtime-related HTTP routes are now:

- `GET /v1/runtimes`
- `GET /v1/runtimes/{nodeId}`
- `GET /v1/runtimes/{nodeId}/context`
- `POST /v1/runtimes/{nodeId}/start`
- `POST /v1/runtimes/{nodeId}/stop`

Important semantics:

- `404` means the node is not a runtime-managed node in the active graph;
- `409` means the node exists, but the host cannot currently materialize a
  valid runtime context for it;
- successful runtime inspection returns both desired and observed state, plus
  whether injected runtime context is available.

## 5. CLI coverage

`entangle-cli` now exposes the first thin runtime-management slice over the
same host boundary:

- `entangle host runtimes list`
- `entangle host runtimes get <nodeId>`
- `entangle host runtimes context <nodeId>`
- `entangle host runtimes start <nodeId>`
- `entangle host runtimes stop <nodeId>`

This confirms the intended architecture:

- one host control plane;
- multiple client surfaces;
- no privileged frontend-only mutation path.

## 6. Runner bootstrap

`entangle-runner` is no longer just a hardcoded stub.

The current runner slice now:

- loads an injected runtime context from disk;
- reads package prompt files from the materialized package root;
- reads runtime tool-budget hints from package runtime config;
- collects memory references from the seeded workspace memory;
- builds a normalized provider-agnostic engine turn request;
- runs one stub-engine turn against that request;
- derives or generates a Nostr identity without storing the secret in injected
  JSON.

The current runner still does not implement:

- live Nostr subscriptions and message handling;
- git artifact operations;
- multi-turn execution loop beyond the stub-engine contract;
- secret-store backed provider execution.

Those remain the next implementation layers.

## 7. Quality status of this slice

This slice is covered by:

- lint;
- typecheck;
- workspace build;
- host API tests;
- host-client tests;
- runner bootstrap tests;
- full `pnpm verify`.

The tests specifically cover:

- structured host error semantics;
- runtime context availability and conflict behavior;
- runtime stop intent preservation;
- runner request construction from injected context and package files.

## 8. What is still missing

The most important remaining runtime work is now:

- host reconciliation against actual Docker-managed runner processes;
- observed runtime state derived from real runtime lifecycle instead of initial
  placeholder records;
- host-side runtime start/stop/restart actions that affect real processes;
- runner-side Nostr lifecycle and message handling;
- runner-side artifact work over git;
- session trace generation beyond control-plane events;
- Studio runtime visualization over the richer runtime API.

## 9. Why this slice matters

Before this batch, Entangle had:

- schemas;
- validation;
- graph apply;
- package admission;
- a host stub;
- a runner stub.

After this batch, Entangle now has a real runtime preparation path. That is
the first point where the project starts behaving like a control plane for
actual node runtimes rather than only a persistent graph editor with ambitions.
