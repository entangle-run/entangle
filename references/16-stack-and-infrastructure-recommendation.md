# Stack and Infrastructure Recommendation

This document turns the current architectural direction into a concrete implementation stance.

## Executive recommendation

Use a TypeScript-first stack for the application layer, a standard relay implementation rather than a custom relay for the hackathon, and containerize execution boundaries from the start.

That means:

- TypeScript for shared schemas, Studio, and runner logic;
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
- Bun-compatible project layout
- keep Node 22 compatibility where practical

Reasoning:

- Bun aligns well with `opencode`;
- TypeScript gives the best leverage for shared schema packages;
- staying Node-compatible reduces lock-in and keeps ecosystem reach high.

This should be read as:

> Bun-friendly, TypeScript-first, not Bun-dependent in the conceptual architecture.

## Package/schema layer

Recommended libraries:

- `zod` for runtime validation and schema discipline;
- TypeScript types generated or maintained alongside the canonical schemas;
- optional JSON Schema export later for cross-language validation.

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

## Containerization

Yes, containerization makes sense.

Not because Docker is fashionable, but because the product has natural runtime boundaries.

### Recommended containers

- `entangle-studio`
- one `entangle-runner` per active node
- `strfry`
- `gitea`

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
- multiple runner services

This is enough to demonstrate that the graph is not a UI fiction.

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
- `Bun`-friendly monorepo, staying close to Node 22 compatibility
- `@nostr/tools`
- `strfry`
- `Gitea`
- Docker Compose
- React-based Studio
- TypeScript-based runners

That is the cleanest first stack that matches the current Entangle design without overengineering the first implementation.
