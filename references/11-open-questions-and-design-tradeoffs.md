# Open Questions and Design Tradeoffs

This file exists to keep the architecture honest after the core specification
has already been frozen.

It should no longer function as a hidden backlog of foundational decisions that
block implementation. Instead, it should track the main non-blocking tradeoffs
and future-facing areas where Entangle may widen after the first serious build.

## 1. Package binding versus package purity

How much graph-local state should be injected into a package workspace versus kept fully external?

Current recommendation:

- keep package portable and mostly graph-agnostic;
- inject graph-local runtime projections;
- never make graph edges live only inside package-local declarations.

Status:

- non-blocking;
- bounded well enough for implementation by the package, binding, and
  runtime-context specs.

## 2. Artifact backend generality

How early should multiple artifact backends be implemented?

Current recommendation:

- model the abstraction now;
- implement git first.

Status:

- non-blocking;
- hackathon and first serious build stay on `git` + `wiki` + optional
  `local_file`.

## 3. Remote node trust model

How should remote node attachment decide whether a remote actor is acceptable?

Current recommendation:

- local policy first;
- no global web-of-trust requirement in the first serious version.

Status:

- future-facing;
- intentionally not required before local host-managed implementation.

## 4. Graph mutation authority

Should agents ever be able to mutate topology directly?

Current recommendation:

- not in the hackathon build;
- later only through strongly bounded governance policies defined by the control plane.

Status:

- future-facing;
- core mutation model for host-owned control-plane changes is already frozen.

## 5. Relay policy complexity

How much transport complexity should the first runner support?

Current recommendation:

- canonical edge-level transport policy type now;
- one restricted runtime profile in the hackathon implementation.

Status:

- non-blocking;
- full type model is fixed, runtime profile remains intentionally narrow.

## 6. Versioning and migration strictness

How strict should early Entangle be about rejecting objects that are structurally valid but semantically newer than the active runtime?

Current recommendation:

- be strict by default;
- accept clearly compatible additions;
- reject semantic uncertainty rather than silently reinterpret it.

Status:

- non-blocking;
- versioning and compatibility policy are already explicit enough to implement against.

## Resolved and moved out of the open-question set

The following items were previously treated as active open questions but are no
longer blockers:

- engine reuse boundary, resolved by [41-agent-engine-boundary-and-reuse-policy.md](41-agent-engine-boundary-and-reuse-policy.md);
- host-state layout, resolved by [42-host-state-layout-and-persistence-spec.md](42-host-state-layout-and-persistence-spec.md);
- hackathon CLI scope, resolved by [43-hackathon-cli-and-package-scaffold-profile.md](43-hackathon-cli-and-package-scaffold-profile.md);
- schema ownership and contract generation strategy, resolved by [44-schema-ownership-and-contract-generation-spec.md](44-schema-ownership-and-contract-generation-spec.md).
