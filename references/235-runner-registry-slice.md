# Runner Registry Slice

## Current Repo Truth

Runner contracts exist in `packages/types/src/federation/runner.ts`, and the
shared Nostr fabric from Slice 3 can carry signed `runner.hello` and
`runner.heartbeat` observation payloads. Host state does not yet persist a
first-class runner registry. Operators cannot list, trust, or revoke runners
through Host, host-client, or CLI surfaces.

Local runtime reconciliation still lists graph runtimes, not generic federated
runners. A runner still starts with local context until later bootstrap and
assignment slices.

## Target Model

Host maintains a runner registry:

- runner hello creates or refreshes a pending registration;
- trust/revoke are operator decisions stored under Host desired state;
- heartbeat is observed state and does not mutate trust policy except for
  last-seen metadata;
- Host projects liveness as `online`, `stale`, `offline`, or `unknown`;
- operator surfaces can list, inspect, trust, and revoke runners before
  assignments exist.

This slice does not yet subscribe to relay observations automatically. It
creates the state reducer and Host/CLI surfaces that the Nostr listener will
call in the next assignment/control slices.

## Impacted Modules/Files

- `packages/types/src/host-api/runners.ts`
- `packages/types/src/index.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/src/index.ts`
- `services/host/src/index.test.ts`
- `packages/host-client/src/index.ts`
- `packages/host-client/src/index.test.ts`
- `apps/cli/src/index.ts`
- `apps/cli/src/runner-output.ts`
- `apps/cli/src/runner-output.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- add Host API schemas for runner registry list/inspect/trust/revoke;
- persist runner registration records under Host desired state;
- persist runner heartbeat snapshots under Host observed state;
- add state reducers for runner hello and heartbeat observations;
- add operator mutations for trust and revoke;
- compute liveness from last heartbeat/last seen timestamps;
- add Host routes for list/get/trust/revoke;
- add host-client methods;
- add CLI `runners list/get/trust/revoke` commands;
- add focused tests for schemas, state/API, host-client, and CLI output.

## Tests Required

- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/host test`
- `pnpm --filter @entangle/host-client test`
- `pnpm --filter @entangle/cli test`
- touched package lint
- `pnpm typecheck`
- `git diff --check`

Verification record for the implemented slice:

- `pnpm --filter @entangle/types typecheck` passed;
- `pnpm --filter @entangle/host typecheck` passed;
- `pnpm --filter @entangle/host-client typecheck` passed;
- `pnpm --filter @entangle/cli typecheck` passed;
- `pnpm --filter @entangle/types test` passed;
- `pnpm --filter @entangle/host test` passed;
- `pnpm --filter @entangle/host-client test` passed;
- `pnpm --filter @entangle/cli test` passed;
- `pnpm --filter @entangle/types lint` passed;
- `pnpm --filter @entangle/host lint` passed;
- `pnpm --filter @entangle/host-client lint` passed;
- `pnpm --filter @entangle/cli lint` passed;
- `pnpm typecheck` passed.
- `git diff --check` passed.

## End-Of-Slice Audit

The mandatory local-assumption search was run before commit:

```bash
git diff -U0 | rg "^\+.*(Entangle Local|entangle-local|runtimeProfile.*local|contextPath|runtimeRoot|shared volume|effective-runtime-context|Docker)"
```

Classified hits:

- the command block itself is an audit record, not product behavior;
- "shared volume" appears only in this audit classification;
- "Docker" appears only in a risk mitigation saying registry keys must not be
  launcher handles.

No invalid local-only runtime assumptions were added by the implementation.

## Migration/Compatibility Notes

This slice is additive. It does not replace local runtime reconciliation and
does not require runner assignment. Existing local runtime APIs remain
available while the federated registry is introduced beside them.

## Risks And Mitigations

- Risk: heartbeat writes accidentally become desired state.
  Mitigation: registration/trust and heartbeat snapshots use separate Host
  roots and are joined only for API projection.
- Risk: unknown runners can be trusted without hello.
  Mitigation: trust/revoke require an existing registration.
- Risk: stale/offline classification becomes flaky in tests.
  Mitigation: tests seed heartbeats relative to the current clock and validate
  threshold behavior with wide margins.
- Risk: this becomes a local runner list.
  Mitigation: registry keys are runner identity/pubkey records and never Docker
  handles or local runtime paths.

## Open Questions

No open question blocks this slice. Stale/offline thresholds are local Host
defaults for now and can become configurable policy later.
