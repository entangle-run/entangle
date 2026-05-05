# CLI User Client Health Timeout Slice

## Current Repo Truth

CLI can list Host-projected User Client endpoints and, with
`entangle user-nodes clients --check-health`, probe each projected `/health`
route from the operator machine. Before this slice, the probe used the default
fetch behavior without a CLI-owned timeout, so an unreachable endpoint could
hold the operator command open until the platform networking stack returned.

## Target Model

User Client reachability checks must remain operator-side evidence, not Host or
runner state. They also need a bounded wait so physical multi-machine proofs
can report dead or filtered participant endpoints quickly. The CLI should keep
serializing failures into `clientHealth` records and expose the timeout as an
operator option.

## Impacted Modules/Files

- `apps/cli/src/user-node-output.ts`
- `apps/cli/src/index.ts`
- `apps/cli/src/user-node-output.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a default bounded timeout around User Client health probes.
- Pass `AbortSignal` into the default fetch implementation.
- Add `--health-timeout-ms <ms>` to
  `entangle user-nodes clients --check-health`.
- Serialize timeout failures into `clientHealth.error` without throwing the
  whole command.
- Keep missing URL, invalid URL, HTTP error, and connection failure semantics
  unchanged.

## Tests Required

- Targeted CLI user-node output tests for successful health probes, failed
  probes, and timed-out probes.
- CLI typecheck and lint.
- Product naming check.
- Diff whitespace check.

## Migration/Compatibility Notes

No state migration is required. Existing commands keep working with the
default 3000ms per-endpoint timeout. Operators can tune the bound with
`--health-timeout-ms` when testing slower remote links.

## Risks And Mitigations

- Risk: slow but healthy remote User Clients are marked unhealthy.
  Mitigation: the timeout is configurable per command invocation.
- Risk: endpoint probes become confused with Host-owned runtime health.
  Mitigation: the field remains `clientHealth` on the CLI summary and is
  computed from Host projection by the operator machine.
- Risk: custom test fetch implementations ignore abort signals.
  Mitigation: the wrapper also races the probe against a timer so CLI control
  returns even if the underlying request does not abort cleanly.

## Verification

Completed for this slice:

- `pnpm exec vitest run --config ../../vitest.config.ts --environment node --pool=forks --maxWorkers=1 src/user-node-output.test.ts`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff audit for old local-only product/runtime markers: no hits.

## Open Questions

No product question blocks this operator-surface hardening.
