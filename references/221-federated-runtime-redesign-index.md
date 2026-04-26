# Federated Runtime Redesign Index

## Status

Plan status: ready for implementation after the documentation audit loop recorded
in this pack.

This pack supersedes the local-only delivery framing in
`180-local-ga-product-truth-audit.md` and
`189-entangle-local-completion-plan.md` for future architecture work. It does
not delete those files because they remain useful history for the implemented
local adapter.

The file numbers `221` and `222` are intentionally reused by this pivot pack
because the handoff required these exact filenames. The existing
`221-source-history-replay-slice.md` and
`222-wiki-repository-publication-slice.md` remain valid Local-era slice records.

## Pack

- [222-current-state-codebase-audit.md](222-current-state-codebase-audit.md)
- [223-federated-product-vision.md](223-federated-product-vision.md)
- [224-entity-model-and-authority-boundaries.md](224-entity-model-and-authority-boundaries.md)
- [225-host-runner-federation-spec.md](225-host-runner-federation-spec.md)
- [226-user-node-and-human-interface-runtime-spec.md](226-user-node-and-human-interface-runtime-spec.md)
- [227-nostr-event-fabric-spec.md](227-nostr-event-fabric-spec.md)
- [228-distributed-state-projection-spec.md](228-distributed-state-projection-spec.md)
- [229-studio-cli-operator-and-user-surfaces-spec.md](229-studio-cli-operator-and-user-surfaces-spec.md)
- [230-migration-from-local-assumptions-plan.md](230-migration-from-local-assumptions-plan.md)
- [231-implementation-slices-and-verification-plan.md](231-implementation-slices-and-verification-plan.md)

## Implementation Records

- [232-federated-contracts-slice.md](232-federated-contracts-slice.md)
- [233-host-authority-store-slice.md](233-host-authority-store-slice.md)
- [234-nostr-control-observe-transport-slice.md](234-nostr-control-observe-transport-slice.md)

## Audited Scope

Current audit read or searched:

- `README.md`, `resources/README.md`, `wiki/overview.md`,
  `wiki/index.md`, and `wiki/log.md`;
- canonical reference docs from `00` through `45`, with deeper passes over
  graph, protocol, runner, state-machine, Host, client, identity, runtime
  context, engine, deployment, quality, and agent-engine boundary specs;
- Local implementation slice docs from runtime materialization through wiki
  repository publication, especially `180`, `189`, `193`, `194`, `209`,
  `210`, `214`, `220`, `221`, and `222`;
- package contracts in `packages/types`, including graph, resources, runtime
  context, runtime identity, runtime state, A2A, Nostr transport, Host status,
  runtime, sessions, and host API contracts;
- semantic validation in `packages/validator`;
- Host state, API, session launch, runtime backend, Docker client, and tests in
  `services/host`;
- runner bootstrap, Nostr transport, OpenCode adapter, service loop, state
  store, artifact, source, memory, wiki, and tests in `services/runner`;
- shared Host client methods in `packages/host-client`;
- CLI command surface and tests in `apps/cli`;
- Studio app, session launch, approval, graph, event refresh, runtime
  inspection, and tests in `apps/studio`;
- local deployment material under `deploy/` and operational smokes under
  `scripts/`;
- local OpenCode reference code under
  `/Users/vincenzo/Documents/GitHub/VincenzoImp/entangle/resources/opencode`,
  including CLI `run`, `serve`, server routes, session, permissions, agent
  config, task subagent tool, and security notes.

## Known Repo Truth

The repository already has a serious graph-native base: `GraphSpec`,
`NodeInstance`-like bindings, edges, resource catalogs, Nostr A2A messages,
artifact references, git-backed handoff, local runner services, OpenCode-first
engine profiles, Host API, Studio, CLI, tests, and local Docker deployment.

The repository is not yet federated:

- `runtimeProfileSchema` is only `"local"`;
- Host state layout still declares product `"entangle-local"`;
- Host materializes local workspaces and writes
  `effective-runtime-context.json`;
- Docker runners mount shared Host and secret volumes;
- Host starts/stops runners by local Docker state, not signed assignment
  protocol;
- Host reconstructs sessions, approvals, artifacts, source history, and wiki
  publications by reading runner-local `runtimeRoot`;
- `publishHostSessionLaunch` generates an ephemeral Nostr key for the user
  launch;
- user nodes exist in the graph but are excluded from runtime synchronization;
- user approvals in Studio/CLI are Host mutations, not signed User Node A2A
  messages;
- runner Nostr transport implements `entangle.a2a.v1` only, with no
  `control` or `observe` protocol domains;
- `RuntimeBackend` is currently the main runtime abstraction, but it is really
  a local launcher adapter.

## Target Model

Entangle is the product. Local is one deployment profile.

Host is an authoritative control plane with a Host Authority key. Runners start
generic, register through signed Nostr events, receive assignments, execute
assigned nodes, and emit signed observations. User nodes have stable identities
and participate as graph actors through a Human Interface Runtime or User
Interaction Gateway. Studio and CLI are Host clients and user-node gateways,
not hidden runners.

Nostr carries signed messages, control events, observations, approvals,
heartbeats, receipts, and artifact references. It does not carry private keys,
large artifacts, workspaces, full logs, Host databases, or model caches.

OpenCode remains the default per-node coding engine behind an adapter. Entangle
must not become a fork of OpenCode; it should operate OpenCode or another
engine as a replaceable node-local execution brain while Entangle owns graph
identity, policy, assignment, artifact, memory, projection, and user surfaces.

## Planned Implementation Slices

1. Federated contracts and validators.
2. Host Authority key store, import/export, and status.
3. Nostr control and observation event fabric.
4. Runner registry with hello, trust, revoke, heartbeat, and stale status.
5. Runtime assignment lifecycle with leases and receipts.
6. Generic runner bootstrap without preloaded graph context.
7. Local launcher adapter rebased onto the same assignment path.
8. ProjectionStore built from signed observations instead of runtime filesystem
   reads.
9. User Node identity records and Human Interface Runtime.
10. Signed user-node task, reply, approval, and rejection messages.
11. Artifact/source/wiki reference publication through observation and git
    refs.
12. Studio operator and user-node surfaces.
13. CLI operator, user-node, and runner join surfaces.
14. Product naming and compatibility migration.
15. Distributed smoke test.

## Acceptance Criteria

- A runner can start without graph assignment.
- Host can trust a runner and assign a node through signed Nostr control.
- Host and runner do not share filesystem in the federated smoke.
- Multiple user nodes can exist in one graph.
- User-node replies and approvals are signed by stable user-node identity.
- Agent nodes and human nodes communicate through the same A2A model.
- Host observes runtime state through signed events, not runner-local files.
- Artifacts, source changes, and wiki memory are passed by refs/hashes.
- Docker/local remains an adapter, not the privileged architecture.
- Studio and CLI reflect the same Host projection.
- Public docs say Entangle as product identity.
- New contracts have schema and validator tests.
- Each implementation slice updates docs, tests, audit records, and an atomic
  commit.

## Remaining Uncertainty

No uncertainty blocks the first implementation slice. The plan assumes:

- v1 supports one active Host Authority instance to avoid split brain;
- breaking changes are acceptable because the project is pre-release;
- local state migration can preserve old markers for compatibility while new
  state says Entangle;
- Host may provision local dev key material initially, but Host must not be the
  conceptual signer for user-node messages;
- remote OpenCode server integration is preferred over only one-shot CLI for
  permission and long-running turn parity.

## Audit Loop Record

The plan was checked against the actual repo after writing:

- local-only assumptions are listed in
  [230-migration-from-local-assumptions-plan.md](230-migration-from-local-assumptions-plan.md);
- implementation slices reference the modules that currently own each behavior;
- duplicate `221` and `222` references are intentionally documented;
- no code implementation is included in this documentation slice.

Plan readiness: Slices 1 and 2 are implemented in this branch, and Slice 3 is
implemented in the current working tree pending end-of-slice audit and atomic
commit.
