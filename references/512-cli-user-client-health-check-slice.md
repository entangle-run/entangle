# CLI User Client Health Check Slice

## Current Repo Truth

`entangle user-nodes clients` already joins active User Node identities with
Host projection to show assignment, runtime, conversation, approval,
command-receipt, and projected User Client URL summaries. Operators still had
to manually probe each User Client endpoint to confirm it was reachable from
the CLI machine.

## Target Model

CLI should keep Host projection as the source of topology truth, but it should
also support an explicit operator-side reachability probe for projected User
Client endpoints. The probe must be optional, bounded to `/health`, and must
not mutate Host, runner, or User Node state.

## Impacted Modules/Files

- `apps/cli/src/index.ts`
- `apps/cli/src/user-node-output.ts`
- `apps/cli/src/user-node-output.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `--check-health` to `entangle user-nodes clients`.
- Keep the existing summary shape by default.
- When the flag is present, enrich each client summary with `clientHealth`.
- Probe projected User Client `/health` URLs from the CLI machine.
- Report missing URLs, invalid URLs, HTTP failures, and connection failures as
  data instead of throwing.

## Tests Required

- CLI User Node output helper tests for successful health checks.
- CLI User Node output helper tests for missing endpoint and failed probe
  handling.
- CLI typecheck.
- CLI lint.
- Product naming check.
- Diff whitespace check.

## Migration/Compatibility Notes

No migration is required. Existing `entangle user-nodes clients` output remains
unchanged unless `--check-health` is explicitly supplied.

## Risks And Mitigations

- Risk: operators mistake the probe for authoritative runtime state.
  Mitigation: the flag is explicit and documented as an operator-side
  reachability check over Host-projected URLs.
- Risk: Basic Auth breaks the probe.
  Mitigation: the Human Interface Runtime keeps `/health` public by design, so
  the probe does not need participant credentials.
- Risk: a dead endpoint causes the CLI command to fail.
  Mitigation: health failures are serialized into `clientHealth` records.

## Verification

Completed for this slice:

- `pnpm exec vitest run --config ../../vitest.config.ts --environment node --pool=forks --maxWorkers=1 src/user-node-output.test.ts`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff audit for old local-only product/runtime markers: no hits.

## Open Questions

No product question blocks this CLI hardening. Deeper authenticated participant
session management remains part of the production identity and authorization
track, not this reachability probe.
