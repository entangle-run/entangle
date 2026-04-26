# Federated Contracts Slice

## Current Repo Truth

The pre-pivot runtime contracts were strong for the local adapter but did not
have first-class schemas for Host Authority records, runner registration,
runtime assignments, control events, observation events, stable User Node
identities, Human Interface Runtime gateways, or Host projections built from
signed observations.

Existing A2A contracts already model `entangle.a2a.v1` messages and approval
metadata, but `packages/types/src/protocol/nostr-transport.ts` only modeled the
current NIP-59 wrapping constants. `packages/validator` had semantic coverage
for graphs, resource catalogs, A2A approval metadata, lifecycle transitions,
and artifact handoff, but no dedicated federated protocol validators.

## Target Model

Slice 1 establishes machine-readable contracts for the federated runtime
without changing Host or runner behavior yet. It gives later slices a shared
language for:

- Host Authority identity and operator identity;
- generic runner registration and capabilities;
- runtime assignments and leases;
- signed `entangle.control.v1` events from Host Authority to runners;
- signed `entangle.observe.v1` events from runners to Host Authority;
- stable User Node identities and gateway records;
- projection records assembled from desired state and signed observations.

The contracts intentionally enforce signer boundaries at schema level where
possible: control envelopes must be signed by the Host Authority pubkey carried
in the payload, and observation envelopes must be signed by the runner pubkey
carried in the payload.

## Impacted Modules/Files

- `packages/types/src/common/crypto.ts`
- `packages/types/src/federation/authority.ts`
- `packages/types/src/federation/runner.ts`
- `packages/types/src/federation/assignment.ts`
- `packages/types/src/user-node/identity.ts`
- `packages/types/src/protocol/signed-envelope.ts`
- `packages/types/src/protocol/control.ts`
- `packages/types/src/protocol/observe.ts`
- `packages/types/src/projection/projection.ts`
- `packages/types/src/index.ts`
- `packages/types/src/index.test.ts`
- `packages/validator/src/index.ts`
- `packages/validator/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- added SHA-256 digest and Nostr signature primitives;
- added Host Authority and operator identity records;
- added runner capability, trust, registration, operational state, and
  `runner.hello` payload schemas;
- added runtime assignment status, lease, and assignment record schemas;
- added User Node identity and user interaction gateway schemas;
- added generic signed Entangle event envelope;
- added `entangle.control.v1` payload and event schemas for runner hello
  acknowledgements, assignment offers/revokes, lease renewals, stop, and
  restart commands;
- added `entangle.observe.v1` payload and event schemas for runner hello,
  heartbeat, assignment receipts, runtime status, conversation/session/turn/
  approval updates, artifact refs, source-change refs, wiki refs, and bounded
  log summaries;
- added Host projection snapshot schemas for runners, assignments, and user
  conversations;
- exported all new contracts from `@entangle/types`;
- added validator entry points for Host Authority, User Node identity, runner
  registration, runtime assignment, control event, and observation event
  documents.

Deferred intentionally:

- real signature verification;
- Host Authority key storage;
- Host-runner Nostr transport implementation;
- runner registry persistence;
- assignment reducers and leases in Host state;
- projection reducers from signed observations;
- Studio, CLI, and host-client surfaces.

## Tests Required

Targeted checks for this slice:

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/validator typecheck`
- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/validator test`

Broader shared-contract checks before commit:

- `pnpm typecheck`
- package lint for touched packages
- `git diff --check`

Verification record for the implemented slice:

- `pnpm --filter @entangle/types typecheck` passed;
- `pnpm --filter @entangle/validator typecheck` passed;
- `pnpm --filter @entangle/types test` passed;
- `pnpm --filter @entangle/validator test` passed;
- `pnpm --filter @entangle/types lint` passed;
- `pnpm --filter @entangle/validator lint` passed;
- `pnpm typecheck` passed;
- `CI=1 TURBO_DAEMON=false pnpm verify` completed successfully once before
  the final projection/gateway contract cleanup, and after that cleanup the
  root lint and typecheck phases completed again; the aggregate Turbo test
  phase had intermittent no-output hangs in Studio/CLI, so the affected package
  suites were rerun directly;
- direct post-cleanup package tests passed for `@entangle/types`,
  `@entangle/validator`, `@entangle/studio`, `@entangle/cli`, and
  `@entangle/runner`;
- `git diff --check` passed.

## End-Of-Slice Audit

The mandatory local-assumption search was run after implementation:

```bash
rg "runtimeProfile.*single-machine|contextPath|runtimeRoot|shared volume|effective-runtime-context|Docker" .
```

Classification:

- valid local adapter/debug usage: `deploy/local`, local smoke scripts,
  Docker runtime backend code, runner-local state paths, runner memory/artifact
  helpers, and current local profile operational checks;
- docs needing later migration: old single-machine planning files, historical
  slice records, and existing wiki log history;
- invalid local-only assumptions already captured for later slices:
  injected `effective-runtime-context.json`, Host
  `contextPath` exposure, Host reads from runner `runtimeRoot`, Docker shared
  volumes, and ephemeral user launch signing;
- test fixtures: package, Host, runner, CLI, and Studio tests that still encode
  local paths and same-machine endpoint names.

The added lines in this slice introduce no new local-only assumptions under the
same search pattern. Existing hits are intentionally preserved for the
dedicated migration slices.

## Migration/Compatibility Notes

This slice is additive. It does not change the local runtime profile, Docker
launcher, Host API, runner startup, Studio, CLI, or persisted Host state.
Existing Local-era contracts remain exported. Later slices will migrate runtime
behavior to these contracts while keeping the local Docker profile as an
adapter.

## Risks And Mitigations

- Risk: contracts become aspirational but not implemented.
  Mitigation: each following slice must consume these schemas in Host, runner,
  clients, tests, or projection reducers before adding more surface area.
- Risk: schema-level signer checks are mistaken for cryptographic
  verification.
  Mitigation: this slice only validates pubkey consistency. Signature
  verification belongs in the Host Authority and transport slices.
- Risk: projection schemas duplicate legacy Host runtime inspection surfaces.
  Mitigation: projection records are intentionally minimal and event-sourced;
  Host API parity is deferred to the ProjectionStore slice.
- Risk: OpenCode engine concerns leak into federation contracts.
  Mitigation: runner capabilities reference existing agent engine profile
  kinds, but control/observe protocols stay engine-agnostic.

## Open Questions

No open question blocks Slice 2. Later slices must still decide the exact
storage location and encryption model for Host Authority key material and User
Node key references.
