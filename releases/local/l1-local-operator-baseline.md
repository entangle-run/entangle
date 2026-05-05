# L1 Local Operator Baseline

Status: released.

Release date: 2026-04-25.

Tag: `v0.1-local-operator-baseline`.

Product line: Entangle.

Production claim: none.

## Release Summary

L1 closes the historical R1 Local Operator Baseline milestone.

This release proves that Entangle can run as a serious local graph-native
operator runtime on a technical workstation. It includes a local host control
plane, per-node runners, local Nostr relay transport, local Gitea/git-backed
artifact handoff, graph-bound runner handoff, approval lifecycle handling,
Studio and CLI inspection over host truth, and preflight/smoke checks for the
Federated dev profile.

This is not Entangle GA. It is the first released Local baseline.

## Supported Local Workflows

L1 supports these local operator workflows:

- install dependencies from the lockfile with `pnpm install --frozen-lockfile`;
- run repository quality gates with `pnpm verify`;
- run strict federated dev profile preflight with `pnpm ops:check-federated-dev:strict`;
- build the host, runner, CLI, shared packages, and Studio with `pnpm build`;
- build the local runner image through the Federated dev Compose profile;
- start the stable local services: Studio, host, `strfry`, and Gitea;
- inspect active local service readiness with `pnpm ops:smoke-federated-dev`;
- run disposable Federated dev profile validation with
  `pnpm ops:smoke-federated-dev:disposable`;
- run disposable runtime validation with
  `pnpm ops:smoke-federated-dev:disposable:runtime`;
- inspect host status, graph, package sources, principals, runtimes, sessions,
  artifacts, approvals, turns, recovery, and events through the CLI;
- inspect graph and runtime state through Studio over the host boundary;
- admit local package sources through host-mediated `local_path` and
  `local_archive` flows;
- scaffold a minimal AgentPackage with `entangle package init`;
- start, stop, restart, and inspect host-managed local runner runtimes;
- prove git-backed artifact publication and downstream retrieval through the
  disposable runtime smoke.

## Contract Baseline

The accepted L1 contract baseline is the repository state at tag
`v0.1-local-operator-baseline`.

Primary machine-readable contracts live in `packages/types`, including:

- package manifests and package sources;
- graph specs, node bindings, edge specs, and effective bindings;
- deployment resource catalogs and external principals;
- host API DTOs for status, graph, runtime, sessions, events, recovery,
  approvals, turns, and artifacts;
- Entangle A2A payloads and Nostr transport metadata;
- runtime context, runtime identity, runtime state, runner session state,
  artifacts, approvals, turns, activity observations, and builtin tools.

Semantic validation lives in `packages/validator`. Host, runner, CLI, and
Studio behavior must continue to consume these shared contracts instead of
shadowing incompatible local shapes.

## Verification Evidence

The final L1 release batch was verified on 2026-04-25 with Docker daemon
access.

Commands and results:

```bash
pnpm install --frozen-lockfile
git diff --check
pnpm verify
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm ops:check-federated-dev:strict
pnpm ops:smoke-federated-dev:disposable:runtime
pnpm ops:smoke-federated-dev:disposable --skip-build --keep-running
pnpm ops:smoke-federated-dev
docker compose -f deploy/federated-dev/compose/docker-compose.federated-dev.yml down --volumes
```

All commands passed.

The disposable runtime smoke proved:

- strict local preflight;
- runner image build;
- Federated dev Compose startup for Studio, host, `strfry`, and Gitea;
- active federated dev profile smoke;
- local Gitea bootstrap with a disposable user and HTTPS token;
- host catalog mutation for a disposable model endpoint and git service
  binding;
- temporary package-source admission;
- temporary graph application with two managed worker runtimes;
- host-managed Docker runner start for both runtimes;
- restart-generation recreation and durable restart host event evidence;
- real NIP-59 task publication through the local relay;
- provider-backed OpenAI-compatible execution against a credential-checking
  local model stub;
- persisted host session and runner-turn state;
- git-backed artifact publication;
- downstream retrieval of the upstream `ArtifactRef`;
- runtime stop for both managed runners;
- profile teardown with volumes.

## Local Prerequisites

The L1 federated dev profile expects:

- Node.js `>=22`;
- pnpm `>=10`;
- Docker with daemon access;
- Docker Compose;
- available local ports for the default profile unless overridden:
  - Studio: `3000`;
  - host API: `7071`;
  - Gitea HTTP: `3001`;
  - Gitea SSH: `2222`;
  - `strfry`: `7777`.

The default federated dev profile is tokenless for development ergonomics. A bootstrap
operator token can be enabled with `ENTANGLE_HOST_OPERATOR_TOKEN`, and the CLI
and Studio can propagate that token. This is local hardening, not production
identity or authorization.

## Install And Run

Recommended local bootstrap:

```bash
pnpm install --frozen-lockfile
pnpm verify
pnpm ops:check-federated-dev:strict
docker compose -f deploy/federated-dev/compose/docker-compose.federated-dev.yml --profile runner-build build runner-image
docker compose -f deploy/federated-dev/compose/docker-compose.federated-dev.yml up --build studio host strfry gitea
pnpm ops:smoke-federated-dev
```

For a full disposable proof path:

```bash
pnpm ops:smoke-federated-dev:disposable:runtime
```

Default local URLs:

- Studio: `http://localhost:3000`
- Host API: `http://localhost:7071`
- Gitea HTTP: `http://localhost:3001`
- Strfry relay: `ws://localhost:7777`

## Known Limitations

L1 intentionally does not include:

- polished first-run onboarding;
- canonical demo package and graph assets;
- one-command local demo;
- graph templates;
- Studio or CLI session launch as a product workflow;
- graph import/export and revision diff workflows;
- artifact preview/history workbench;
- memory workbench;
- local doctor, repair, backup, restore, or upgrade tooling;
- guaranteed migration support for older Entangle state volumes;
- production persistence;
- production authentication or authorization;
- production sandbox or scheduler;
- Cloud or Enterprise deployment material.

Delegated-session semantics are local-profile semantics in L1. The runner
performs runner-local active-conversation reconciliation and the current smoke
proves local two-node git-backed handoff. Cross-host, remote, global
owner-level delegated-session synthesis is future work.

Historical planning material before the federated pivot used an old runtime
profile value. This release packet does not preserve that value as a supported
operator contract; current runtime profile names are governed by the active
contracts in `packages/types`.

Studio currently builds as one production bundle that exceeds Vite's default
500 kB chunk-size warning. This is not an L1 correctness failure, but it should
be revisited before the Local workbench becomes the primary product surface.

## Upgrade Notes

L1 is the first tagged Local operator baseline. There is no supported
cross-release local-state migration contract before this release.

Entangle state for the Compose profile lives in Docker volumes:

- `entangle-host-state`;
- `entangle-secret-state`;
- `compose_gitea-data`;
- `compose_strfry-data`.

Keep those volumes when preserving local packages, runtime identities, Gitea
data, relay data, imported host state, and Entangle secrets. Remove them only when
intentionally resetting the Federated dev profile.

## Rollback And Reset

To stop the federated dev profile without deleting state:

```bash
docker compose -f deploy/federated-dev/compose/docker-compose.federated-dev.yml down
```

To reset the federated dev profile by deleting Entangle state volumes:

```bash
docker compose -f deploy/federated-dev/compose/docker-compose.federated-dev.yml down --volumes
```

Rollback to an earlier repository state should be paired with an explicit
choice about local volumes. Older code may not understand newer Entangle state
layout, and L1 does not provide automatic downgrade migrations.

## Non-Goals

L1 must not be described as providing:

- PostgreSQL-backed production persistence;
- multi-tenant workspace isolation;
- production-grade user authentication;
- production RBAC or ABAC;
- SSO, SAML, SCIM, or enterprise identity;
- object-storage artifact service;
- production scheduler or sandbox;
- billing, plan limits, or paid-customer onboarding;
- SOC 2, GDPR, HIPAA, or other compliance readiness;
- Kubernetes or self-host production install maturity.

## Next Release

The next release target is `L1.5 Local Operator Preview`.

That milestone should add canonical demo assets, a clearer documented happy
path, troubleshooting for common local failures, improved first-run operator
UX, and smoke-backed examples that a technical user can follow without reading
the source code.
