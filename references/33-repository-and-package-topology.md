# Repository and Package Topology

This document defines how Entangle should be split into repositories, packages,
apps, services, and shared contracts.

The goal is to choose a topology that is:

- strong enough for long-term productization;
- efficient enough for a hackathon team;
- clean enough that contracts, validators, and runtime boundaries do not drift.

## Design rule

Entangle should start as a single monorepo with explicit internal package
boundaries.

Do not split the project into multiple repositories during the hackathon or
early product formation unless a component has already become independently
versioned, independently consumed, and operationally independent.

## 1. Why a monorepo is the right first choice

Entangle has unusually high coupling around:

- canonical schemas;
- validation rules;
- host API contracts;
- runner lifecycle contracts;
- Studio and CLI client bindings;
- Docker and deployment profiles.

Splitting these too early into multiple repositories would create:

- version drift;
- duplicated release coordination;
- slower iteration on breaking contract changes;
- worse hackathon velocity;
- more accidental architecture damage.

The project is currently in the phase where:

- the boundaries should be explicit;
- the release units should not yet be fragmented.

That means:

- one repository;
- multiple internal packages and apps;
- strong package boundaries inside the repo.

## 2. Recommended repository stance

Recommended first serious stance:

- one repository: `entangle`
- one workspace-based monorepo
- multiple apps and packages inside it

This should remain true through:

- hackathon build;
- first public alpha;
- first internal team scaling phase

unless a specific component clearly graduates into its own external product or
SDK.

## 3. What belongs in the monorepo

The monorepo should contain:

### Apps and services

- `entangle-host`
- `entangle-studio`
- `entangle-cli`
- `entangle-runner`

### Shared packages

- `entangle-types`
- `entangle-validator`
- `entangle-host-client`
- optional package scaffolding utilities

### Infrastructure

- Docker Compose files
- container definitions
- local dev scripts
- environment examples

### Product corpus

- specifications
- wiki
- decisions
- docs

This keeps architecture, implementation, and product memory close enough to
evolve together.

## 4. Recommended top-level monorepo shape

Recommended first shape:

```text
entangle/
  apps/
    studio/
    cli/
  services/
    host/
    runner/
  packages/
    types/
    validator/
    agent-engine/
    host-client/
    package-scaffold/
  deploy/
    compose/
    docker/
  references/
  wiki/
  resources/
```

This is not about aesthetics. It encodes responsibility.

### `apps/`

User-facing or operator-facing entry surfaces.

### `services/`

Long-running or execution-centric runtime components.

### `packages/`

Purely shared logic, contracts, clients, validators, utilities.

### `deploy/`

Operational topology and environment materialization.

## 5. Package responsibilities

### `apps/studio`

Owns:

- visual graph UI;
- trace UI;
- node and edge inspection;
- runtime admin actions through host APIs.

Must not own:

- validator truth;
- runtime orchestration;
- Docker lifecycle logic.

### `apps/cli`

Owns:

- human-friendly headless control surface;
- scripting entrypoints;
- offline and online subcommands.

Must not own:

- graph mutation logic duplicated from host;
- hidden privileged workflows unavailable to other clients.

### `services/host`

Owns:

- applied local graph state;
- package admission;
- graph revision apply;
- deployment resource catalog apply;
- runtime backend control;
- lifecycle reconciliation;
- host API.

### `services/runner`

Owns:

- node runtime loop;
- Nostr messaging;
- policy enforcement;
- engine adapter execution;
- artifact and wiki updates.

### `packages/types`

Owns:

- canonical TypeScript types;
- `zod` schemas;
- host API DTO schemas;
- JSON Schema export path later;
- protocol, graph, binding, and resource-catalog contract definitions.

Must remain the primary contract source rather than one consumer among many.

### `packages/validator`

Owns:

- package validation;
- graph validation;
- binding validation;
- transport feasibility validation.

### `packages/agent-engine`

Owns:

- normalized model turn execution;
- provider-adapter dispatch;
- tool loop orchestration;
- streaming normalization;
- provider-agnostic turn result shapes.

Must not own:

- Nostr transport;
- graph policy;
- approval logic;
- artifact publication policy.

### `packages/host-client`

Owns:

- client bindings for host APIs;
- transport and request wrappers shared by Studio, CLI, and tests.

Must consume canonical request and response DTO contracts from `packages/types`
rather than redefining them locally.

### `packages/package-scaffold`

Owns:

- package template generation;
- scaffolding rules for new agent folders;
- starter manifest and filesystem shape.

This may remain an internal library at first.

## 6. CLI and scaffolding stance

Yes, a CLI is worth building.

But it should be deliberately thin.

The CLI should not be a second product with its own business logic. It should
mostly compose:

- `packages/host-client`
- `packages/validator`
- `packages/package-scaffold`

This is exactly why it is reasonable to include it in the hackathon if scope is
disciplined.

### Recommended early CLI command groups

- `entangle validate ...`
- `entangle package init ...`
- `entangle graph inspect ...`
- `entangle node add ...`
- `entangle node start ...`
- `entangle node stop ...`
- `entangle edge add ...`
- `entangle session run ...`

Not all must be implemented for the hackathon, but the package should be shaped
for this future.

## 7. Is scaffolding worth including in the hackathon?

Yes, likely yes.

A package scaffolding command is one of the highest-leverage secondary features
because it:

- proves the package interface is real;
- reduces future builder friction;
- gives a strong demo moment;
- is architecturally aligned with the product.

Recommended minimum scope:

- `entangle package init <path>`

It should generate:

- `manifest.json`
- prompt files
- runtime files
- memory seed structure
- schema guidance file

It should not try to generate a full polished agent runtime automatically.

## 8. What must absolutely exist in the hackathon build

These are the pieces that should be treated as core, not optional:

- `Studio`
- `Host`
- `Runner`
- `Types`
- `Validator`
- relay integration
- git artifact flow
- package admission flow
- graph editing for at least bounded node/edge operations

These are highly desirable but may be scoped:

- `CLI`
- package scaffolding command

Given the current architecture, both are realistic if kept thin.

## 9. What should not become separate repositories yet

Do not split these out yet:

- `entangle-types`
- `entangle-validator`
- `entangle-host-client`
- `entangle-cli`
- `entangle-package-scaffold`

These are too tightly coupled to the evolving core contracts.

## 10. What could become separate repositories later

Only after stabilization, possible candidates could be:

### Public SDK or contract packages

If the host API or package format becomes externally consumed by third parties.

### Language-specific SDKs

If a non-TypeScript ecosystem becomes important enough to justify independent
versioning.

### Package templates or examples

If the ecosystem grows and templates become community-maintained artifacts.

But these are later ecosystem moves, not early architecture moves.

## 11. Recommended hackathon implementation order inside the monorepo

1. `packages/types`
2. `packages/validator`
3. `services/host`
4. `packages/agent-engine`
5. `services/runner`
6. `packages/host-client`
7. `apps/studio`
8. `apps/cli`
9. `packages/package-scaffold`

This order keeps contracts and control plane ahead of presentation.

## 12. Final recommendation

The best current choice is:

- one monorepo;
- explicit package boundaries;
- Studio included as a first-class hackathon deliverable;
- CLI included only if kept thin and built on shared host-client and validator layers;
- package scaffolding included if it can remain simple and contract-driven;
- no early split into multiple repositories.

This is the strongest combination of:

- hackathon speed;
- architectural cleanliness;
- future team scalability;
- product durability.
