# Implementation Slices And Verification Plan

## Current Repo Truth

The repo already follows a slice discipline: each implemented Local capability
has a reference record, tests, wiki log entry, and usually a coherent commit.
The root `pnpm verify` gate runs lint, typecheck, and tests. Local smokes cover
Compose, diagnostics, reliability, disposable runtime, and preview demo.

The pivot is larger than the remaining Local GA work. It must proceed in large
but controlled slices with audit loops after each slice.

## Target Model

Each slice must keep contracts, Host, runner, clients, tests, docs, and wiki in
sync. A slice is not done until:

- code and docs agree;
- targeted tests pass;
- broader tests run when shared contracts changed;
- local-only assumptions are searched and classified;
- `git diff` is reviewed;
- the coherent batch is committed.

## Impacted Modules/Files

All major packages are impacted across the full plan:

- `packages/types`
- `packages/validator`
- `services/host`
- `services/runner`
- `packages/host-client`
- `apps/cli`
- `apps/studio`
- `deploy`
- `scripts`
- `README.md`
- `references`
- `wiki`

## Concrete Changes Required

### Slice 1: Federated Contracts

Add Host Authority, User Node identity, runner registration, assignment,
lease, control event, observe event, projection, and gateway schemas. Export
them from `packages/types`. Add semantic validator coverage.

Implementation record:

- [232-federated-contracts-slice.md](232-federated-contracts-slice.md)

Verification:

- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/validator test`
- `pnpm typecheck`

### Slice 2: Host Authority Store

Add Host Authority state, key generation, status, export/import, and signature
helpers. Add Host API and client read surfaces.

Implementation record:

- [233-host-authority-store-slice.md](233-host-authority-store-slice.md)

Verification:

- Host unit tests;
- host-client tests;
- CLI status smoke for authority.

### Slice 3: Nostr Control/Observe Transport

Add publish/subscribe transport for `entangle.control.v1` and
`entangle.observe.v1`, including signing, verification, NIP-59 wrapping, and
dedupe.

Implementation record:

- [234-nostr-control-observe-transport-slice.md](234-nostr-control-observe-transport-slice.md)

Verification:

- Host and runner transport tests;
- relay-backed smoke where feasible.

### Slice 4: Runner Registry

Implement runner hello, pending registration, trust, revoke, heartbeat, and
stale/offline projection.

Implementation record:

- [235-runner-registry-slice.md](235-runner-registry-slice.md)

Verification:

- Host registry tests;
- CLI runner commands;
- Studio helper tests.

### Slice 5: Assignment Lifecycle

Implement assignment offer, accept, reject, revoke, and lease handling. Keep
assignment state separate from Docker runtime state.

Implementation record:

- [236-assignment-lifecycle-slice.md](236-assignment-lifecycle-slice.md)

Verification:

- assignment reducer tests;
- Host API tests;
- runner acceptance tests.

### Slice 6: Generic Runner Bootstrap

Allow runner to start from join config without graph context, receive
assignment offers, and emit signed receipts, acceptance, or rejection. This
slice introduces an explicit materializer boundary; the real federated
materializer that fetches Host-signed graph/resource snapshots and starts the
node service is the next runner-runtime slice.

Implementation record:

- [237-generic-runner-bootstrap-slice.md](237-generic-runner-bootstrap-slice.md)

Verification:

- runner bootstrap tests without `ENTANGLE_RUNTIME_CONTEXT_PATH`;
- negative tests for missing/invalid Host Authority.

### Slice 7: Local Adapter Rebase

Change Docker local profile to launch generic runners and assign them through
the same protocol. Shared volumes may remain only for local launcher state, not
canonical Host observation.

Implementation record:

- [238-local-launcher-join-adapter-slice.md](238-local-launcher-join-adapter-slice.md)

Verification:

- local runtime smoke;
- no-shared-observation assertions.

### Slice 8: ProjectionStore

Create projection reducers and Host APIs backed by signed observations.
Gradually move sessions, turns, approvals, artifacts, source, and wiki surfaces
off direct runtime file reads.

Implementation record:

- [239-host-projection-snapshot-slice.md](239-host-projection-snapshot-slice.md)

Verification:

- projection reducer tests;
- Host API parity tests;
- CLI/Studio regression tests.

### Slice 9: User Node Runtime

Add stable user-node identity records, gateway signing, inbox/outbox
projection, and multi-user support.

Implementation record:

- [240-user-node-identity-slice.md](240-user-node-identity-slice.md)

Verification:

- user-node identity tests;
- multiple user-node graph tests;
- inbox/outbox projection tests.

### Slice 10: Signed User Conversations And Approvals

Convert session launch, replies, approvals, and rejections to signed User Node
A2A messages. Retire direct approval mutation as canonical behavior.

Implementation record:

- [241-signed-user-node-messages-slice.md](241-signed-user-node-messages-slice.md)

Verification:

- signed task/reply/approval tests;
- Studio and CLI user action tests;
- negative Host-signed user-message tests.

### Slice 11: Artifact, Source, And Wiki Ref Projection

Add projection records and Host reducers for observed artifact refs,
source-change refs, and wiki refs.

Implementation record:

- [242-observed-artifact-source-wiki-refs-slice.md](242-observed-artifact-source-wiki-refs-slice.md)

Verification:

- projection contract tests;
- Host reducer/projection tests;
- no new runner filesystem read paths.

### Future Slice: Engine Adapter Upgrade

Keep OpenCode default. Move beyond only one-shot `opencode run` where needed
by attaching to OpenCode server APIs for sessions, permissions, events, abort,
and long-running state. Preserve Entangle policy and projection ownership.

Verification:

- OpenCode adapter tests using mocked server/SDK;
- permission bridge tests;
- cancellation tests;
- source/artifact/wiki observation tests.

### Slice 12: Studio And CLI Federation Surfaces

Add first-pass authority, runners, assignments, projection, User Node identity,
projection inbox, reply, approve, and reject surfaces. Full transport health
and Studio chat remain follow-up work.

Implementation record:

- [243-studio-cli-federation-surfaces-slice.md](243-studio-cli-federation-surfaces-slice.md)

Verification:

- CLI command tests;
- Studio helper/component tests;
- lint and typecheck.

This slice now includes first-pass CLI assignment/User Node/inbox/reply/
approve/reject commands and a Studio projection/User Node panel. Full Studio
chat, signed approval card migration, and durable inbox/outbox projection
remain follow-up work.

### Slice 13: Product Naming Migration

Update current product docs and user-facing copy to Entangle. Keep Local as a
profile.

Implementation record:

- [244-product-naming-migration-slice.md](244-product-naming-migration-slice.md)

Verification:

- naming audit search;
- docs review;
- CLI/Studio tests where wording is asserted.

### Slice 14: Distributed Smoke

Add smoke path that can run Host and runners with separate filesystem roots and
shared reachable relay/git backend.

Verification:

- distributed smoke;
- local Docker adapter smoke;
- full `pnpm verify`.

## Tests Required

Minimum full pivot gates:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm verify`
- contract/schema tests if `packages/types` changed;
- validator tests if semantics changed;
- Host tests for authority, registry, assignment, projection;
- runner tests for bootstrap, transport, assignment, observations;
- host-client tests;
- CLI tests;
- Studio tests;
- local profile smoke;
- distributed smoke.

## Migration/Compatibility Notes

Because the project has not released publicly, controlled breaking changes are
acceptable. Still, preserve local adapter operations long enough to compare old
and new behavior and to keep the current demo path useful.

## Risks And Mitigations

- Risk: pivot scope is too large for one batch.
  Mitigation: commit every slice atomically and keep docs current.
- Risk: federation introduces security regressions.
  Mitigation: role-specific signature validation and negative tests.
- Risk: OpenCode integration consumes the product.
  Mitigation: use OpenCode behind engine adapter; Entangle owns graph,
  identity, policy, projection, artifacts, and user-node surfaces.
- Risk: Studio/CLI drift.
  Mitigation: host-client contracts first, shared presentation helpers where
  practical, and matching tests.

## Open Questions

- Should the distributed smoke initially use multiple local processes with
  isolated temp roots, or require three physical/VM machines? Start with local
  isolated roots in CI and document the physical-machine proof demo.
