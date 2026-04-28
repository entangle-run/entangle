# Current State Codebase Audit

## Current Repo Truth

Entangle already has a strong same-machine runtime implementation and the
first federated control-plane foundations.

The core product docs define a graph-native system where users and agents are
first-class nodes, edges constrain communication, Nostr signs coordination, and
artifacts carry work. Earlier same-machine delivery docs narrowed the active
profile to one workstation with Docker Compose, `strfry`, Gitea, Host-managed
runner containers, and shared state volumes. The active pivot now treats that
as only one deployment topology.

`packages/types` is the contract owner. It currently defines:

- `nodeKindSchema` with `"user"` plus agent/service kinds;
- `runtimeProfileSchema` as `"federated"`;
- `GraphSpec.defaults.runtimeProfile` defaulting to `"federated"`;
- `agentEngineProfiles` with default `opencode-default`;
- `EffectiveRuntimeContext` with concrete workspace paths including
  `runtimeRoot`, `engineStateRoot`, `sourceWorkspaceRoot`, and
  `wikiRepositoryRoot`;
- A2A protocol `entangle.a2a.v1`;
- Nostr constants for NIP-59 gift wrap and the A2A rumor kind;
- runtime state records with `runtimeContextPath`;
- Host status with product literal `"entangle"`;
- Host runtime APIs that expose `contextPath` and several filesystem-path
  inspection fields.

`packages/validator` validates graph/resource semantics, agent engine profile
resolution, relay realizability, git principal bindings, A2A approval metadata,
and artifact ref retrieval rules. It does not validate Host Authority,
runner registration, runtime assignments, control events, observation events,
or stable User Node identity.

`services/host` is the largest local-only boundary:

- it creates `.entangle/host` state and `.entangle-secrets`;
- it stamps `state-layout.json` with product `"entangle"`;
- it creates host-owned runtime identities under `runtime-identities`;
- it writes one `effective-runtime-context.json` per non-user node;
- it excludes `nodeKind === "user"` from runtime synchronization;
- it resolves non-user peer pubkeys but intentionally leaves user peer pubkeys
  absent;
- it starts/stops Docker runners through `RuntimeBackend`;
- it still observes several deep runtime details by reading
  `context.workspace.runtimeRoot`, but observed activity records now mark
  whether they came from signed observation events or local filesystem
  compatibility sync, local pruning preserves signed observation-event records,
  session list/detail can now fall back to projected observed sessions, and
  approval lifecycle changes now have signed `approval.updated` observation
  reducers;
- it records approval decisions by directly writing approval JSON under the
  target runtime root.

`services/host/src/session-launch.ts` now publishes launch `task.request`
events signed by stable User Node identity material. Host still owns the local
gateway API that triggers the send, so the remaining gap is full inbox/chat and
approval workflow migration onto User Node A2A surfaces.

`services/runner` is a real node-local service with a generic `join` startup
mode, but canonical execution still falls back to injected same-machine context:

- bootstrap can resolve `ENTANGLE_RUNNER_JOIN_CONFIG_PATH` and emit signed
  `runner.hello`/assignment receipts;
- the existing execution materializer still depends on
  `ENTANGLE_RUNTIME_CONTEXT_PATH` or an injected `effective-runtime-context.json`;
- identity secret delivery is currently env-var based;
- A2A transport over NIP-59 is implemented;
- control/observe event contracts and local transport helpers exist, but Host
  and runner are not yet wired end-to-end through relay subscriptions for all
  execution state;
- runner state is file-backed under `runtimeRoot`;
- cancellation is polled from Host-written local files;
- OpenCode is invoked by a safe one-shot process adapter.

`packages/host-client`, `apps/cli`, and `apps/studio` are Host clients. They
cover graph, package sources, external principals, runtimes, turns, artifacts,
memory, wiki publications, source changes, approvals, recovery, sessions, and
same-machine reliability commands. They now expose Host Authority status,
runner registry, assignments, stable User Node identities, projection-backed
inbox listing, and signed User Node reply/approval message publication. Studio
still needs full chat composition and replacement of older approval/session
controls.

`deploy/federated-dev` is intentionally a same-machine deployment adapter:

- Host owns Docker runner creation;
- Host mounts Docker socket;
- runner containers mount the same Host state and secret volumes;
- local relay and Gitea are Compose services;
- same-machine smokes prove the current adapter path. They do not yet prove
  Host/runner separation without shared filesystem access.

The local OpenCode reference confirms that OpenCode has a real coding-agent
core: built-in primary agents (`build`, `plan`), subagents (`general`,
`explore`), tool permissions, session state, server/SSE APIs, pending
permission routes, project/worktree support, CLI `run`, CLI `serve`, MCP,
plugin, and GitHub action surfaces. OpenCode security notes also state that its
permission system is UX/governance, not a sandbox. Entangle must therefore add
its own policy, identity, and sandbox/deployment boundaries around any
OpenCode engine use.

## Target Model

The current local runtime should become one adapter beneath a federated
runtime model:

- Host Authority owns signed control decisions;
- runners start generic and join;
- assignments, leases, control commands, observations, heartbeats, and
  receipts are signed Nostr protocol events;
- User Nodes receive stable identity records and become interactive actors;
- Host projection comes from signed observation events and artifact refs;
- local filesystem context remains only a runner-local implementation detail;
- Docker Compose remains the simplest deployment profile, not the canonical
  architecture.

## Impacted Modules/Files

- `packages/types/src/common/topology.ts`
- `packages/types/src/graph/graph-spec.ts`
- `packages/types/src/runtime/runtime-context.ts`
- `packages/types/src/runtime/runtime-identity.ts`
- `packages/types/src/runtime/runtime-state.ts`
- `packages/types/src/protocol/a2a.ts`
- `packages/types/src/protocol/nostr-transport.ts`
- `packages/types/src/host-api/*.ts`
- `packages/validator/src/index.ts`
- `services/host/src/state.ts`
- `services/host/src/index.ts`
- `services/host/src/session-launch.ts`
- `services/host/src/runtime-backend.ts`
- `services/runner/src/index.ts`
- `services/runner/src/service.ts`
- `services/runner/src/nostr-transport.ts`
- `services/runner/src/opencode-engine.ts`
- `packages/host-client/src/index.ts`
- `apps/cli/src/index.ts`
- `apps/studio/src/App.tsx`
- `deploy/federated-dev/**`
- `scripts/smoke-local-*.mjs`

## Concrete Changes Required

- Keep authority, runner registration, assignment, control event, observation
  event, projection, and user-node interaction contracts current with code.
- Split semantic node context from local filesystem workspace layout.
- Make `RuntimeBackend` a local launcher adapter.
- Finish Host Authority signing integration for runner control publishing.
- Wire runner join/trust/revoke/heartbeat flows through relay subscriptions.
- Wire assignment offer/accept/reject/revoke/lease flows through relay
  subscriptions and execution materialization.
- Expand observation ingestion and projection store to replace runtime-root
  file reads.
- Replace Host file reads of `runtimeRoot` with projection reads.
- Build the Human Interface Runtime/User Interaction Gateway beyond the current
  stable User Node identity and signed message publisher.
- Convert remaining approval/session controls to signed User Node A2A.
- Complete Studio and CLI chat, approvals, and transport-health surfaces.
- Keep public product framing as Entangle with same-machine deployment treated
  as one topology.

## Tests Required

- Schema tests for all new contracts.
- Validator tests for runner trust, assignments, edge/user-node identity, and
  same-machine adapter compatibility.
- Host Authority signing and import/export tests.
- Runner hello/trust/revoke/heartbeat tests.
- Assignment lifecycle tests.
- Control/observe Nostr transport tests.
- Projection ingestion and query tests.
- User Node stable identity, inbox/outbox, signed reply, and signed approval
  tests.
- Host-client, CLI, and Studio tests for new surfaces.
- Local adapter regression tests.
- Distributed smoke proving no shared Host/runner filesystem.

## Migration Notes

Existing local runtime state can be treated as pre-federation state. The first
migration writes Entangle-only layout metadata. Old local APIs can remain
temporarily as debug surfaces while canonical new APIs use authority,
assignment, projection, and user-node terms.

## Risks And Mitigations

- Risk: adding federation while keeping old Host file reads creates two truths.
  Mitigation: add projection store early and mark runtime-root reads as local
  compatibility until deleted.
- Risk: Host signs as users for convenience.
  Mitigation: user-node signing contract must reject Host Authority signatures
  for user messages.
- Risk: OpenCode permissions are mistaken for isolation.
  Mitigation: document and enforce Entangle policy separately from engine
  permissions.
- Risk: local tests keep passing while federation is broken.
  Mitigation: add no-shared-filesystem smoke and transport-level tests.

## Open Questions

- Which key storage backends should be first beyond local file/env secrets?
- Should browser Studio ever hold User Node private keys, or should it always
  call a local User Interaction Gateway?
- What remote runner installer format is preferred after the first join config?
