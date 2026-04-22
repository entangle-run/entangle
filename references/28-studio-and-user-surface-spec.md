# Studio and User Surface Specification

This document defines the expected responsibilities of Entangle Studio, the primary user-facing and operator-facing surface of the system.

The goal is to prevent Studio from becoming either:

- a fake demo shell disconnected from runtime truth; or
- an overgrown monolith that owns system logic that belongs elsewhere.

## Design rule

Studio is a graph-aware client and control surface. It is not the authoritative source of runtime truth.

Runtime truth belongs to:

- graph definitions;
- host control-plane state;
- validators;
- runners;
- control-plane history;
- trace and artifact state.

Studio should present and manipulate that truth through bounded interfaces.

## 1. Studio roles

Studio has four primary roles.

### 1. User task surface

Where a user node initiates work through a chosen entrypoint.

### 2. Runtime observability surface

Where the session trace, conversations, approvals, artifacts, and runtime subgraph are visible.

### 3. Control-plane editing surface

Where bounded graph and policy changes can be inspected, proposed, and eventually applied.

### 4. Runtime administration surface

Where local nodes can be admitted, started, stopped, restarted, removed, and
inspected through the host control plane.

## 2. Non-goals

Studio should not:

- invent fake runtime state;
- bypass validator or control-plane rules;
- directly own graph truth in ad hoc client-only state;
- directly own container or process lifecycle logic;
- become the only way to edit a graph if file-based workflows still exist.

## 3. Primary Studio views

The first serious version should model at least these views.

### Graph view

Shows:

- nodes;
- edges;
- entrypoints;
- relation types;
- current graph revision.

### Session view

Shows:

- active session state;
- session trace;
- active runtime subgraph;
- artifacts;
- approvals and blocks.

### Node inspector

Shows:

- node identity;
- node kind;
- role;
- capabilities;
- package source;
- effective policy and backend profile summary.

### Edge inspector

Shows:

- relation type;
- initiator policy;
- transport policy summary;
- message policy summary;
- approval policy summary;
- enabled/throttled/disabled state.

### Control view

Shows or supports:

- bounded mutation proposals;
- revision comparison;
- validation findings;
- apply/reject workflows later.

### Runtime operations view

Shows or supports:

- local node admission from package sources;
- runner health and lifecycle state;
- start, stop, and restart controls;
- deployment errors and recovery actions.

## 4. User task initiation

Studio should let the user:

- choose the user node;
- choose the entrypoint node;
- submit the session intent;
- attach initial artifact refs or supporting context when supported;
- observe acceptance or rejection.

Studio should not require the user to understand every internal node just to launch work.

## 5. Runtime subgraph rendering

This is a product-defining feature.

Studio should render the runtime execution subgraph using actual trace data, not simulated animation.

The minimum serious rendering should show:

- which nodes were activated;
- which edges were traversed;
- conversation openings and closures;
- artifact publication points;
- approval pauses;
- terminal outcome.

## 6. Artifact surface

Studio should expose artifacts as first-class outputs.

Minimum requirements:

- list artifacts by backend and kind;
- show creator and session linkage;
- open or reference git/wiki/file outputs when reachable;
- distinguish current preferred artifacts from superseded ones.

## 7. Approval surface

If approvals are part of the runtime, Studio should make them visible.

Minimum requirements:

- show when a session is blocked on approval;
- show who can approve;
- show current approval state;
- allow approval action only to authorized operators or users.

## 8. Control-plane editing rules

Studio may eventually support graph editing, but editing must be bounded by the same validator and control-plane rules as any other interface.

Safe early editing scope:

- labels and descriptions;
- entrypoint selection;
- adding or removing local package-backed nodes through explicit validated flows;
- editing edge state or bounded policy settings;
- preparing, validating, and reviewing topology changes.

Unsafe early editing scope:

- free-form unvalidated graph mutation;
- hidden client-side policy widening;
- local-only changes with no revision trace.

## 9. Source of truth rules

Studio may cache data for responsiveness.

It must not become the primary source of truth for:

- graph topology;
- runtime trace;
- approval outcomes;
- artifact state.

It should always be able to refresh from authoritative sources.

### Host boundary rule

Studio should act as the operator surface over a host control-plane service.

That means:

- Studio sends mutation and lifecycle intents;
- the host validates, applies, and records the outcome;
- Studio renders authoritative host and runtime state back to the operator.

This is the preferred implementation boundary even when the entire system runs
on one local machine.

## 10. Studio interaction with files

The product should not force every configuration task into the UI.

Some edits are better left file-based, especially early:

- package prompt and identity files;
- package-local wiki schema files;
- detailed package docs;
- some graph config files.

Studio should focus on the interactions that benefit most from visual graph-aware interfaces.

### Package admission rule

Studio should treat package admission as a host-mediated source operation, not
as client-owned filesystem truth.

Recommended canonical admission surfaces:

- host-visible `local_path`
- imported `local_archive`

A browser directory picker or similar local convenience surface may be added
where supported, but it should remain a convenience that resolves into one of
the canonical host-owned package-source forms above.

### Headless rule

Entangle should remain usable without Studio.

Studio is the preferred visual surface, but it should not be the only serious
surface for:

- runtime administration;
- graph operations;
- task launch;
- inspection of applied system state.

Those capabilities should also exist through a CLI or equivalent host-facing
surface.

## 11. Multi-audience design

Studio serves different audiences:

- end user launching work;
- operator debugging runtime behavior;
- future graph maintainer editing topology or policy.

The UI should not assume all audiences need the same level of detail all the time.

## 12. Hackathon profile

The hackathon Studio should implement a strict subset:

- task launch from the user node;
- graph view for a small graph;
- live session trace / runtime subgraph view;
- node and edge inspection;
- artifact list and basic opening/reference behavior;
- bounded local node admission from package folders;
- bounded edge creation and configuration if they reflect real backend truth;
- basic start/stop controls through the host control plane.

That is enough to make the system understandable to judges without pretending the control plane is already fully built.
