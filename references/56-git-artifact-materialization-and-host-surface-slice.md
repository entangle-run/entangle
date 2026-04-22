# Git Artifact Materialization and Host Surface Slice

This slice extends Entangle from message and lifecycle persistence into the
first real durable work-product path.

The goal was not to implement the full future git collaboration model in one
jump. The goal was to introduce a first rigorous artifact slice that is:

- machine-readable;
- persisted;
- provenance-aware;
- exercised by tests;
- visible through the host boundary.

## What was implemented

The current implementation now includes:

- a structured `ArtifactRef` contract with backend-specific locator schemas for
  `git`, `wiki`, and `local_file`;
- a persisted `ArtifactRecord` model owned by `packages/types`;
- artifact-id linkage from runner-local session, conversation, and turn state;
- a first `RunnerArtifactBackend` abstraction with a git-backed implementation;
- runner-local artifact materialization into a node-local git repository under
  the runtime artifact workspace;
- committed report artifacts for completed turns;
- outbound `task.result` messages that include newly produced artifact refs;
- a host route for runtime artifact inspection:
  `GET /v1/runtimes/{nodeId}/artifacts`;
- host-client support and tests for that route.

## Design choices in this slice

### 1. First artifact kind: `report_file`

The first implemented git artifact kind is a turn report written as markdown.

This was chosen because it proves the artifact model with minimal ambiguity:

- a durable file is created;
- that file has a deterministic path;
- git provenance is captured through a real commit;
- the runner can attach the resulting artifact ref to protocol output.

This is a better first slice than jumping immediately to remote branch
publication without a stable local artifact contract.

### 2. Git-backed local materialization before remote publication

The runner currently materializes artifacts into a runtime-local git
repository. That repository is authoritative for the local produced artifact,
but not yet automatically published to a shared remote git service.

This is intentional.

It gives Entangle:

- durable local provenance;
- stable locator semantics;
- deterministic testability;
- a clean foundation for later publish workflows.

It does not yet give:

- shared remote retrieval across nodes;
- remote branch review flows;
- external supersession policies.

### 3. Host surface is read-only first

The host now exposes persisted runtime artifacts for inspection, but it does
not yet own remote publication or artifact mutation semantics.

This keeps the boundary clean:

- the runner produces artifacts;
- the host inspects and surfaces persisted runtime outputs;
- later slices can decide which artifact lifecycle transitions remain runner
  local and which become host-governed.

## Verification in this slice

This batch was verified through:

- machine-readable contract tests for structured git artifact records;
- runner tests that assert:
  - artifact creation;
  - artifact-id linkage into session, conversation, and turn records;
  - git repository initialization;
  - commit provenance;
  - response payload propagation of produced artifact refs;
- host API tests for runtime artifact listing;
- host-client tests for runtime artifact list parsing;
- full repository `pnpm verify`.

## What remains after this slice

This is deliberately not the final artifact system.

The next meaningful artifact-side gaps are:

- remote git publication and retrieval through named git services;
- richer artifact kinds such as `branch`, `commit`, and `patch`;
- artifact supersession and preferred-artifact transitions;
- Studio artifact inspection and navigation;
- artifact-aware handoff flows between nodes over real git remotes.
