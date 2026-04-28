# Process Smoke Assignment Timeline Slice

## Current Repo Truth

The process-runner smoke is the strongest fast product proof in the repository:
it starts Host, one agent runner process, two Human Interface Runtime runner
processes, a reachable relay, a file-backed git service, and the runner-served
User Client. It verifies signed assignments, runtime lifecycle control,
runner materialization under runner-owned state roots, User Node publishing,
OpenCode-adapter deterministic turn execution, projected source-change and
source-history reads, approval reads, session reads, and filesystem isolation.

The assignment timeline read model was covered by contract, Host API,
host-client, CLI helper, and Studio helper tests, but not yet by the
process-runner smoke.

## Target Model

The smoke should verify that the real joined runner emits assignment receipts
and that Host exposes those receipts through the per-assignment timeline read
model during an end-to-end federated process run.

## Impacted Modules/Files

- `services/host/scripts/federated-process-runner-smoke.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Import the assignment timeline response contract into the process-runner
  smoke.
- After lifecycle receipt verification, call
  `/v1/assignments/:assignmentId/timeline`.
- Assert the timeline includes assignment acceptance and a runner `started`
  receipt.
- Keep the check read-only and projection-backed.

## Tests Required

- Host script typecheck.
- Host lint.
- Federated process-runner smoke with a reachable local relay.

## Verification Run

- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host lint`
- `docker compose -f deploy/federated-dev/compose/docker-compose.federated-dev.yml up -d strfry`
- `pnpm ops:smoke-federated-process-runner -- --timeout-ms 60000`

## Migration/Compatibility Notes

This is an additive smoke assertion. It does not change runtime behavior and
does not require live model-provider credentials; the smoke keeps using the
deterministic temporary OpenCode executable.

## Risks And Mitigations

- Risk: smoke duration increases.
  Mitigation: the timeline check reuses already-projected lifecycle receipts
  and adds only one Host API request.
- Risk: assignment timeline checks become brittle.
  Mitigation: the assertion checks for semantic entries, not exact timeline
  length.

## Open Questions

- The remaining distributed proof should still run the same topology across
  separate machines or networks with an externally reachable relay and git
  backend.
