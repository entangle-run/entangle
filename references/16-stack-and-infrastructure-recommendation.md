# Stack and Infrastructure Recommendation

This document turns the current architectural direction into a concrete implementation stance.

## Executive recommendation

Use a TypeScript-first stack for the application layer, a standard relay implementation rather than a custom relay for the hackathon, and containerize execution boundaries from the start.

That means:

- TypeScript for shared schemas, Studio, host, and runner logic;
- a TypeScript host/control-plane service for local runtime management;
- `@nostr/tools` as the primary Nostr library;
- `strfry` as the first relay implementation;
- `Gitea` as the first git server;
- one runner container per active node;
- Docker Compose for local orchestration.

## Why TypeScript

TypeScript is the strongest practical choice because:

- `opencode` is already a strong open-source reference in that ecosystem;
- `nostr-tools` is the most established low-level TypeScript Nostr library;
- Entangle Studio will almost certainly be web-first and graph-heavy;
- shared types across Studio, runner, validator, and protocol layers are very valuable.

## Runtime recommendation

### Primary choice

- TypeScript end-to-end
- Node 22 as the canonical runtime target
- `pnpm` workspaces as the canonical package-management layer
- Turborepo for monorepo task orchestration

Reasoning:

- TypeScript gives the best leverage for shared schema packages;
- Node 22 is the least surprising runtime target for multi-service local
  deployment, containerized execution, and later team scaling;
- `pnpm` is the strongest practical workspace manager for a serious monorepo
  with shared packages, Dockerized services, and CI-friendly installs;
- the upstream references split between Bun-first and pnpm-first ecosystems, so
  Entangle should favor the more conservative and portable operational choice.

This should be read as:

> TypeScript-first, Node-first, pnpm-first, and not coupled to any one
> reference project's toolchain preferences.

## Package/schema layer

Recommended libraries:

- `zod` for runtime validation and schema discipline;
- TypeScript types inferred from the canonical schemas;
- optional JSON Schema export later for cross-language validation.

Canonical ownership rule:

- `packages/types` owns the primary schemas and host API DTO contracts;
- generated artifacts, including JSON Schema later, remain derivative.

## Model provider integration layer

Recommended first stance:

- keep an internal engine-adapter boundary owned by Entangle;
- use provider SDKs or wrappers underneath that boundary rather than exposing
  provider-native types to the runner;
- strongly consider Vercel AI SDK provider packages or equivalent wrappers where
  they reduce integration cost without becoming product-facing types.

Recommended first operational adapter:

- `anthropic`

Recommended second adapter once the boundary is stable:

- `openai_compatible`

## Studio stack

Recommended shape:

- React
- TypeScript
- graph visualization using a mature graph UI library such as React Flow / `@xyflow/react`
- local state management kept simple and explicit

Studio should be a control plane and graph viewer, not the place where the core runtime logic lives.

## Runner stack

Recommended shape:

- TypeScript runner executable
- one runtime instance per node
- filesystem-backed workspace
- local wiki memory
- git workspace operations
- Nostr subscriptions/publication through `nostr-tools`

The runner should be the universal execution boundary for a node.

## Host control stack

Recommended shape:

- TypeScript host service (`entangle-host`);
- local control-plane API consumed by Studio;
- desired-state reconciler for active node runtimes;
- runtime-backend abstraction with Docker as the first backend.

The host should be the place where:

- local package paths are admitted and validated;
- deployment resource profiles for relay, git, and model endpoints are resolved;
- node bindings are created;
- runtime projections are materialized;
- runner containers or processes are managed.

Studio should feel like the administrator of the graph, but the host should own
the actual orchestration logic.

## Nostr protocol stack

### Primary library

Use `@nostr/tools` (`nostr-tools`) as the default library.

Why:

- it is the most established TypeScript baseline in the ecosystem;
- it exposes the low-level control Entangle needs;
- it supports key generation, signing, verification, relay pools, and multiple relay interaction patterns;
- OpenClaw already uses it in its Nostr extension, which is a useful signal.

### Higher-level abstractions

Do not start with a heavy high-level Nostr SDK unless the project clearly benefits from it later. Entangle needs explicit protocol control more than convenience wrappers.

## Relay recommendation

### Hackathon relay

Use `strfry`.

Why:

- mature relay implementation;
- operationally simple;
- fast enough that the relay is unlikely to become the bottleneck;
- easy to run locally or in Docker;
- sufficient for a dedicated Entangle relay profile during the hackathon.

### Future programmable relay path

Keep `khatru` as a secondary reference.

Why:

- the upstream repository is in maintenance mode, which makes it a better reference than foundation;
- if Entangle later needs relay-side custom policies, programmable filtering, or custom AUTH behavior, a relay framework becomes relevant;
- that is not necessary for the first serious build.

### Recommendation summary

- use `strfry` now;
- study `khatru` for later custom relay behavior;
- do not build a custom relay for the hackathon.

## Git server recommendation

Use a standard git service as infrastructure, not as a greenfield subsystem.

### Recommended first choice

- `Gitea` container

Why:

- lightweight enough for local/demo usage;
- supports organizations, users, repos, branches, pull requests, and access control;
- much more realistic than trying to fake collaborative git handoff with local-only bare repos;
- easy to run in Docker Compose.

### Important scope rule

Entangle should integrate with a git server. It should not try to become one.

### Git identity recommendation

Treat git identity as a bound external principal, not as the same raw key
material as the node's Nostr identity.

Recommended first profile:

- one git principal per active node where feasible;
- SSH auth for normal fetch/pull/push;
- separate token-based auth only for host-side API automation where necessary;
- optional separate SSH signing key for commit signing;
- git author/committer metadata derived from node alias and Nostr identity only
  at the attribution layer, not by reusing the same private key.

## Containerization

Yes, containerization makes sense.

Not because Docker is fashionable, but because the product has natural runtime boundaries.

### Recommended containers

- `entangle-studio`
- `entangle-host`
- `strfry`
- `gitea`
- one `entangle-runner` container per active node, created and managed by the host

Optional later:

- helper services for indexing, metrics, or memory tooling

### Why containers help

- isolate per-node state;
- isolate secrets;
- mount package, wiki, and workspace volumes clearly;
- make the graph feel operationally real;
- make future local-vs-remote node transitions cleaner.

## Suggested docker-compose shape

For the hackathon:

- one compose file
- one relay service
- one git service
- one Studio service
- one host service
- dynamic runner containers created by the host

This is enough to demonstrate that the graph is not a UI fiction.

The compose stack should be treated as a reference deployment profile, not as
the only valid runtime environment Entangle can support.

## Package and workspace mounting stance

The first implementation should not mount a selected package folder as a fully
mutable node root.

Preferred local node materialization:

- package source mounted read-only into the runtime boundary;
- node-local memory and workspace mounted as writable volumes;
- injected binding and policy files generated into a dedicated writable runtime surface;
- secrets mounted or injected separately from package content.

This preserves the portability of `AgentPackage` and prevents the graph-specific
runtime from mutating the portable source package by accident.

## What not to overbuild yet

- no Kubernetes;
- no custom relay implementation;
- no custom git hosting;
- no distributed secret management platform;
- no generalized service mesh.

The architecture should be strong. The operational profile should still be disciplined.

## Final recommendation

If implementation started now, the most sensible stack would be:

- `TypeScript`
- `Node 22`
- `pnpm` workspaces plus Turborepo
- `@nostr/tools`
- `strfry`
- `Gitea`
- `entangle-host`
- Docker Compose
- React-based Studio
- TypeScript-based runners

That is the cleanest first stack that matches the current Entangle design without overengineering the first implementation.
