# User Node Runtime Projection Retention Slice

## Current Repo Truth

The running Human Interface Runtime publishes signed `runtime.status`
observations with a `clientUrl` for assigned User Nodes, and Host projection can
surface that URL for Studio, CLI, and manual browser access.

During manual `--keep-running` verification, the User Client processes stayed
healthy, but a later Host runtime synchronization removed the observed runtime
records for `nodeKind: "user"` nodes. The cause was that Host synchronization
used the non-user runtime-node set as the retention set for
`observed/runtimes`, even though assigned User Nodes are also real federated
runtime owners.

## Target Model

Host runtime backend synchronization should still reconcile only non-user
agent/service nodes through the local adapter path. However, federated observed
runtime records must be retained for every active graph node, including User
Nodes assigned to `human_interface` runners.

This keeps Studio and CLI aligned with the live Host projection and prevents a
same-machine runtime inspection refresh from hiding valid User Client URLs.

## Impacted Modules/Files

- `services/host/src/state.ts`
- `services/host/src/federated-control-plane.test.ts`
- `services/host/scripts/federated-process-runner-smoke.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `deploy/federated-dev/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Split Host synchronization retention into:
  - non-user runtime node ids for local backend materialization, runtime
    intents, recovery controllers, and source publication target retention;
  - all graph node ids for observed federated runtime records.
- Add a regression test that records a User Node `runtime.status` observation
  with `clientUrl`, triggers Host runtime synchronization, and verifies that
  Host projection still reports the User Node runtime as running with the same
  User Client URL.
- Correct manual CLI command examples printed by the process-runner smoke and
  adjacent docs so `pnpm` does not pass a literal `--` argument into the CLI.

## Tests Required

- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/host exec vitest run --config ../../vitest.config.ts --environment node src/index.test.ts src/federated-control-plane.test.ts`
- `pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777 --keep-running`

## Migration/Compatibility Notes

No state migration is required. Existing Host states that lost User Node
observed runtime records will recover when the running Human Interface Runtime
publishes another `runtime.status` observation, or when the runtime is restarted
through assignment control.

## Risks And Mitigations

- Risk: retaining User Node observed runtime records could retain stale data for
  removed users.
  Mitigation: retention is bounded to active graph node ids, so deleted graph
  nodes are still pruned.
- Risk: User Nodes might accidentally enter local runtime backend
  reconciliation.
  Mitigation: local backend reconciliation still iterates only non-user runtime
  nodes.

## Open Questions

- None for this slice.
