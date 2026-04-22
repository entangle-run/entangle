# Pre-Implementation Audit

This document records the first full repository-wide audit performed after the
specification and architecture-decision batches.

Its purpose is to answer a practical question:

> Is the Entangle repository coherent enough to start implementation without
> carrying hidden architectural drift into the codebase?

## Audit scope

The audit covered:

- root project documents;
- the full `references/` corpus in reading order;
- the full `wiki/` corpus;
- targeted spot checks in `resources/` where upstream choices materially affect
  implementation decisions.

The audit checked for:

- stale architectural statements;
- drift between older conceptual documents and newer normative documents;
- hackathon shortcuts leaking back into canonical architecture;
- implementation-feasibility issues not yet reflected in the corpus;
- missing pre-implementation decisions that would force low-quality code
  scaffolding.

## High-confidence conclusions

The repository is now coherent on the major architectural questions.

The following statements are materially aligned across the corpus:

- Entangle is graph-native, not orchestrator-tree-native.
- The user is a node.
- `AgentPackage`, `NodeInstance`, `Edge`, `GraphSpec`, and runtime-derived
  context remain cleanly separated.
- `entangle-host` is the control-plane boundary.
- `entangle-studio` and `entangle-cli` are client surfaces over that boundary.
- `entangle-runner` is the per-node execution boundary.
- Nostr is the signed coordination layer.
- Artifacts carry work; messages coordinate work.
- `git` is the first serious artifact backend.
- relay, git, and model endpoints are deployment-scoped resources rather than
  hardcoded product assumptions.
- the hackathon profile is a restricted operating profile of the final product,
  not a different architecture.

## Drift corrected in this audit batch

### 1. Product definition was stale on hackathon topology

`references/02-product-definition.md` still described the hackathon product
boundary as:

- one supervisor/orchestrator node;
- two or three worker nodes.

This contradicted the later hackathon runtime profile and the explicit decision
to demo a visibly non-flat graph.

The document was corrected to align with:

- four to six non-user nodes;
- one or two entrypoint or supervisor nodes;
- at least one peer collaboration path;
- at least one delegation path deeper than one edge.

### 2. Product surfaces were described too narrowly

`references/02-product-definition.md` also described Studio and Runner as the
main user-facing surfaces, which no longer matched the host-first,
multi-surface architecture.

The document now reflects:

- Studio
- CLI
- Host
- Runner

as the meaningful product and runtime surfaces.

### 3. Runner lifecycle wording lagged behind effective-binding design

`references/13-runner-lifecycle-spec.md` still described the runner as starting
from raw package and projection language without reflecting the later
`EffectiveNodeBinding` and injected runtime context contracts.

The wording was corrected so the lifecycle matches the newer host/binding
specifications.

### 4. Host API wording was older than the actual host API specification

`references/31-host-control-plane-and-runtime-orchestration.md` still stated
that the host API shape could be decided later.

That was no longer true after
[36-host-api-and-reconciliation-spec.md](36-host-api-and-reconciliation-spec.md).

The document now points to the host API as a specified resource-oriented
surface whose route names may still evolve, but whose boundary is no longer
conceptually open.

### 5. Wiki overview was stale on current phase

`wiki/overview.md` still described the next step as moving into the
architecture-decision batch even though that batch had already been completed.

The overview now reflects the current phase accurately:

- pre-implementation audit and refinement;
- immediate move toward schemas, validator, host, runner, and deployment
  skeletons.

## Feasibility decisions frozen by this audit

The audit did not only find drift. It also closed several implementation gaps
that were important enough to freeze before code scaffolding begins.

### 1. Package admission must be host-owned

Canonical package-source admission is now:

- `local_path`
- `local_archive`

This matters because a browser-facing Studio cannot be the canonical owner of
filesystem truth. A browser directory picker may still exist as a convenience,
but the durable package-source identity must resolve into a host-owned source
record.

This avoids coupling the product architecture to browser-specific filesystem
capabilities.

### 2. The local Docker profile should give the host direct Docker-engine access

The local deployment model already required the host to create runner
containers dynamically. The audit made the hidden implication explicit:

- in the local Compose profile, `entangle-host` should have explicit access to
  the Docker Engine through an operator-owned control path such as the Docker
  socket.

This is acceptable because the host is explicitly modeled as a trusted
local-first operator boundary.

### 3. Trace persistence should live in host state first

The observability corpus already required durable structured trace storage, but
the first storage choice was not frozen strongly enough.

The recommended first storage shape is now:

- host-managed JSON or JSONL trace material under persistent host state;
- session and control-plane history stored locally without requiring a separate
  telemetry platform.

This is sufficient for the hackathon and early product without weakening the
trace model.

### 4. Hackathon git bootstrap should be per-node-principal, not shared-credential

The canonical git identity model was already clear, but the practical hackathon
bootstrap was not explicit enough.

The recommended first profile is now:

- one `Gitea` org or namespace for the active demo graph;
- pre-created per-node git principals and SSH keys are acceptable;
- one narrow host-side admin token may be used for repo bootstrap if worth the
  complexity;
- one shared git credential for every node remains explicitly rejected as a
  canonical design.

### 5. The monorepo toolchain should be frozen before scaffolding

The prior stack recommendation was still Bun-friendly and Node-compatible.
After reading the reference repos more closely, the better operational choice
for Entangle is now:

- TypeScript
- Node 22
- `pnpm` workspaces
- Turborepo

Reason:

- the upstream references split between Bun-first and pnpm-first ecosystems;
- Entangle should not inherit the toolchain assumptions of one reference
  project too early;
- Node 22 plus `pnpm` is the stronger conservative baseline for multi-service
  local deployment, containers, shared packages, and early team scaling.

This freezes the monorepo toolchain strongly enough to scaffold against.

## Remaining questions after the audit

The remaining questions are now narrower than before. They are no longer
fundamental architecture gaps.

### 1. Engine reuse depth

The corpus is clear that the runner owns the stable boundary and the engine
adapter isolates provider-specific execution.

What remains to decide during implementation is how much of the first agentic
engine should be:

- built directly in Entangle; versus
- adapted from an OpenCode-like code-editing loop.

This is an implementation-shaping choice, not a missing type-system boundary.

### 2. Exact on-disk layout for live graph state

The conceptual objects are clear, but the first code pass still needs to choose
the concrete source-of-truth files and directories for:

- desired graph state;
- host state;
- revision history;
- session trace storage.

The architecture no longer lacks the object model; it now needs disciplined
materialization.

### 3. Degree of hackathon CLI completeness

The architecture is clear that the CLI should exist and remain thin.

What remains is scoping:

- how many commands the hackathon includes; and
- whether `package init` ships in the first demo cut or immediately after.

This is a scope question, not an architecture blocker.

## Gate assessment against the quality framework

Using [30-quality-gates-and-acceptance-criteria.md](30-quality-gates-and-acceptance-criteria.md):

### Specification-complete gate

Pass.

The corpus now covers:

- core types;
- invariants;
- normalization and validation;
- state machines;
- package and binding rules;
- edge semantics;
- artifact backends;
- control plane;
- compatibility and migration;
- observability;
- Studio responsibilities;
- host API and reconciliation;
- effective runtime context;
- local deployment topology;
- hackathon runtime subset.

### Architecture-decision gate

Pass.

The remaining ambiguity is no longer about missing concepts. It is mostly about
implementation-shaping preference choices inside already-bounded contracts.

### Implementation-readiness gate

Near-pass, with one explicit interpretation:

- the architecture is ready enough to start code scaffolding now;
- implementation should still begin with machine-readable schemas and package
  boundaries, not with ad hoc service code.

In practical terms, the repository is ready to move into:

- `packages/types`
- `packages/validator`
- `services/host`
- `services/runner`
- `apps/studio`
- `apps/cli`
- `deploy/compose`

## Recommended next move

Do not write application logic first.

The highest-value next step is:

1. scaffold the monorepo layout;
2. encode the canonical contracts as machine-readable schemas;
3. build the validator surface;
4. build the host API DTO layer;
5. only then start host, runner, and Studio skeletons.

That is the cleanest path from specification to implementation without losing
the architectural discipline established so far.
