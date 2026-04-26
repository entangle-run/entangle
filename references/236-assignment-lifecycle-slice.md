# Assignment Lifecycle Slice

## Current Repo Truth

Runtime assignment contracts exist in `packages/types/src/federation/assignment.ts`.
Control/observe payloads can carry assignment offers, revokes, accepts, and
rejects. Host now has Authority state, a shared Nostr fabric, and a runner
registry with trust state. There is still no Host-owned assignment store
separate from local Docker/runtime intent state.

## Target Model

Host can create assignment offers for trusted runners and graph nodes, track
assignment status independently from local runtime state, and accept runner
observations for accepted/rejected assignments. Assignment records include Host
Authority pubkey, runner pubkey, graph revision, node id, runtime kind,
revision, lease data, and timestamps.

This slice creates the state and Host API/client boundary. It does not yet
publish assignment offers over Nostr automatically and does not start generic
runners.

## Impacted Modules/Files

- `packages/types/src/host-api/assignments.ts`
- `packages/types/src/index.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/src/index.ts`
- `services/host/src/index.test.ts`
- `packages/host-client/src/index.ts`
- `packages/host-client/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- add Host API schemas for assignment list/inspect/offer/revoke;
- persist assignment records under Host desired state;
- require trusted runner registration before offering an assignment;
- require an active graph revision and assignable non-user node;
- infer runtime kind from node kind for v1;
- create assignment leases on offer;
- update assignment state from accepted/rejected observation payloads;
- revoke assignment records without touching Docker runtime state;
- add Host routes and host-client methods;
- add focused contract, Host, and host-client tests.

## Tests Required

- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/host test`
- `pnpm --filter @entangle/host-client test`
- touched package lint
- `pnpm typecheck`
- `git diff --check`

Verification record for the implemented slice:

- `pnpm --filter @entangle/types typecheck` passed;
- `pnpm --filter @entangle/host typecheck` passed;
- `pnpm --filter @entangle/host-client typecheck` passed;
- `pnpm --filter @entangle/types test` passed;
- `pnpm --filter @entangle/host test` passed;
- `pnpm --filter @entangle/host-client test` passed;
- `pnpm --filter @entangle/types lint` passed;
- `pnpm --filter @entangle/host lint` passed;
- `pnpm --filter @entangle/host-client lint` passed;
- `pnpm typecheck` passed.
- `git diff --check` passed.

## End-Of-Slice Audit

The mandatory local-assumption search was run before commit:

```bash
git diff -U0 | rg "^\+.*(runtimeProfile.*single-machine|contextPath|runtimeRoot|shared volume|effective-runtime-context|Docker)"
```

No matching added lines were found. This slice stores assignment control-plane
records and does not mutate local runtime launcher state.

## Migration/Compatibility Notes

This slice is additive. Existing local runtime desired-state and Docker-backed
reconciliation remain untouched. Assignment records are the federated control
plane model that later slices will connect to Nostr publishing and generic
runner bootstrap.

## Risks And Mitigations

- Risk: assignment state duplicates runtime intent state.
  Mitigation: assignment records are runner/node leases and do not start or
  stop local runtimes in this slice.
- Risk: untrusted runners receive assignments.
  Mitigation: offer creation requires trusted runner registrations.
- Risk: user nodes are accidentally assigned as coding runtimes.
  Mitigation: v1 rejects `nodeKind: "user"` assignment offers.
- Risk: stale graph revisions are assigned.
  Mitigation: offers use the current active graph revision at creation time.

## Open Questions

No open question blocks this slice. Lease renewal and expiration sweeps can be
implemented after offer/accept/reject/revoke are durable.
