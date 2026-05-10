# Entangle

Entangle is a self-hosted federated runtime for observable coding-agent
organizations.

It models an AI organization as a live graph: human users, coding agents, and
service participants are nodes; edges define who may talk, delegate, review, and
approve; runners execute assigned nodes wherever they live; signed Nostr events
coordinate work; git-backed references carry durable artifacts; Studio and CLI
read the same Host projection.

Entangle is not a chatbot wrapper and not a local-only agent demo. A compact
same-machine deployment is available for development, but it uses the same
federated model as a multi-machine deployment.

## What Exists Today

The repository contains a real TypeScript monorepo with:

- `entangle-host`: Host Authority, graph state, runner trust, assignment,
  projection, audit, package, resource, runtime, session, artifact, memory, and
  User Node APIs.
- `entangle-runner`: generic runner join flow, signed observations,
  `agent_runner` and `human_interface` runtime paths, OpenCode and external
  engine adapters, git artifact handoff, source-change handling, and structured
  node memory.
- `entangle-studio`: browser operator console over Host state.
- `entangle user-client`: browser participant client served by running User
  Nodes.
- `entangle` CLI: headless operator and User Node workflows over the same Host
  boundary.
- deterministic smoke paths for federation, User Node messaging, fake OpenCode,
  fake OpenAI-compatible providers, external HTTP engines, deployment tooling,
  proof-kit generation, and service-volume recovery.

Live LLM-provider credentials and real OpenCode provider behavior are still
operator/manual validation. The deterministic fixtures prove the protocol,
state, permission, artifact, and UI plumbing without spending model API calls.

## Repository Layout

```text
apps/
  cli/              Headless operator and User Node surface.
  studio/           Graph-aware operator console.
  user-client/      Human participant client for running User Nodes.
services/
  host/             Authoritative Host control plane and projection store.
  runner/           Generic node runner and runtime implementations.
packages/
  types/            Shared contracts and schemas.
  validator/        Semantic validation.
  host-client/      Shared Host API client and presentation helpers.
  nostr-fabric/     Nostr signing and transport helpers.
  agent-engine/     Normalized agent-engine turn boundary.
  package-scaffold/ AgentPackage scaffolding helpers.
deploy/
  federated-dev/    Same-machine development deployment adapter.
examples/
  federated-preview/ Canonical example package and graph.
docs/
  Operator-facing project documentation.
references/
  Technical design archive and implementation ledgers.
wiki/
  Long-running project memory and decision log.
resources/
  Manifest for local external research clones.
```

## Prerequisites

- Node.js 22+
- pnpm 10+
- Docker and Docker Compose for deployment and runtime smokes
- Git

Global `pnpm` is convenient, but most repository smoke wrappers can fall back to
`npm exec --yes pnpm@10.18.3 --` when needed.

## Quick Start

Install dependencies:

```bash
pnpm install --frozen-lockfile
```

Run the standard quality gate:

```bash
pnpm verify
```

Start the fastest no-credential runtime demo:

```bash
docker compose -f deploy/federated-dev/compose/docker-compose.federated-dev.yml up -d strfry
pnpm ops:demo-user-node-runtime
```

The demo starts Host, joined agent runners, joined User Node runners, and
runner-served User Client endpoints. It prints the live Host URL, operator
token, User Client URLs, and a Studio launch command.

For an automated deterministic proof with fake OpenCode attached-server
behavior:

```bash
pnpm ops:smoke-federated-process-runner:fake-opencode
```

For generated distributed proof-kit material:

```bash
pnpm ops:distributed-proof-kit -- --output-dir /tmp/entangle-proof
```

See [docs/running-entangle.md](docs/running-entangle.md) for the full runbook.

## Core Model

- **Host** is the authoritative control plane. It owns desired graph state,
  Host Authority signing, runner trust, assignments, projection, audit, and
  public APIs.
- **Runners** start generic, register through signed events, receive signed
  assignments, execute one node runtime, and publish signed observations.
- **Agent nodes** run coding engines such as OpenCode behind adapters. Entangle
  owns identity, policy, routing, memory, artifacts, approvals, and projection
  around the engine.
- **User nodes** are graph participants with stable identities. They send tasks,
  replies, approvals, source reviews, and wiki/artifact requests through a
  Human Interface Runtime and User Client.
- **Edges** are authorization and routing. A runner may not invent a route that
  the graph does not allow.
- **Nostr messages coordinate. Git artifacts carry work.** Large payloads,
  repositories, model caches, and private keys do not belong in Nostr events.

See [docs/architecture.md](docs/architecture.md) for the operator-level
architecture overview.

## Current Status

Entangle is pre-release software with a strong deterministic runtime proof
surface. The most important implemented areas are:

- generic runner registration, trust, assignment, heartbeat, and observations;
- stable Host Authority and User Node identities;
- signed User Node messages and approvals;
- running User Client endpoints for human graph nodes;
- projection-backed Host/Studio/CLI read models;
- OpenCode, external process, and external HTTP agent-engine profiles;
- git-backed source-history, artifact, and wiki publication/review paths;
- deterministic fake provider and fake OpenCode integration tests;
- same-machine development deployment that preserves the federated boundaries;
- distributed proof-kit generation and verification helpers.

The highest-value remaining work is:

- manual live-provider validation with real OpenCode and real model APIs;
- infrastructure-backed multi-machine proof execution;
- production identity and authorization beyond bootstrap operator tokens;
- external audit retention and policy-backed permission sources;
- richer collaborative wiki merge and memory-maintenance workflows;
- broader non-disposable upgrade and repair behavior.

See [docs/status.md](docs/status.md) for a more detailed status map.

## Common Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm verify
pnpm ops:check-product-naming
pnpm ops:check-federated-dev:strict
pnpm ops:smoke-federated-process-runner:fake-opencode
pnpm ops:smoke-distributed-proof-tools
pnpm ops:smoke-deployment-service-volume-roundtrip:required
```

Use [docs/testing.md](docs/testing.md) to choose the right verification path
for the surface you changed.

## Documentation Map

- [docs/README.md](docs/README.md): documentation index.
- [docs/architecture.md](docs/architecture.md): Host, runners, User Nodes,
  messages, artifacts, and projection.
- [docs/running-entangle.md](docs/running-entangle.md): local and distributed
  runbooks.
- [docs/testing.md](docs/testing.md): quality gates and smoke tests.
- [docs/repository-guide.md](docs/repository-guide.md): contribution and repo
  hygiene guidance.
- [references/README.md](references/README.md): technical design archive.
- [wiki/overview.md](wiki/overview.md): project memory and current long-form
  state.

## Development Discipline

Keep product-facing docs short and current. Put deep implementation records in
`references/`. Update `wiki/log.md` when a durable project baseline changes.
Run targeted checks for the files you touched and the broader `pnpm verify`
gate for shared contracts or cross-package behavior.

## Related Repository

The public website lives in the sibling repository:

```text
/Users/vincenzo/Documents/GitHub/Entangle/entangle-website
```

Website claims must stay aligned with this repository. Public messaging should
describe Entangle as a federated runtime, not as a local product.
