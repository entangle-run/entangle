# Distributed Proof Tool CI Smoke Slice

## Summary

This slice adds a deterministic CI-friendly smoke for the distributed proof
operator tools.

The real distributed proof still requires a reachable Host, relay, git backend,
and runners on separate machines or VM/container boundaries. That cannot be
fully proven by a no-infrastructure unit command. The missing automation gap
was that the proof kit and verifier tools themselves were not exercised
together by a single root script before an operator attempted the real
multi-machine proof.

`pnpm ops:smoke-distributed-proof-tools` now verifies:

- syntax of the proof kit and verifier scripts;
- proof kit help output;
- verifier help output;
- token-protected proof kit dry-run command generation;
- no-token proof kit dry-run command generation;
- verifier JSON self-test with required conversation and User Client health
  checks enabled;
- verifier JSON self-test failure when runtime observations are non-running by
  default;
- verifier JSON self-test pass for the same non-running fixture only when
  `--allow-non-running-runtimes` is explicit;
- verifier JSON self-test failure when multiple User Node runtime projections
  report the same User Client URL;
- verifier JSON self-test failure when a runner advertises the wrong runtime
  kind for the expected assignment;
- verifier JSON self-test failure when the proof agent runner advertises the
  wrong agent engine kind.

## Current Repo Truth

- `pnpm ops:distributed-proof-kit` generates copyable runner/operator proof
  materials for an already reachable Host.
- `pnpm ops:distributed-proof-verify` checks an already-running distributed
  proof through Host HTTP APIs and optional User Client health endpoints.
- The verifier already has an embedded self-test fixture.
- There was no single CI smoke tying the two tools together and catching
  regressions in help, dry-run, JSON output, or embedded verifier logic.

## Target Model

CI should be able to verify the distributed proof tooling without live model
credentials and without provisioning three machines. That smoke should not
pretend to replace the real distributed proof. It should prove that the
operator tools are syntactically valid, callable, and internally coherent so
manual or infrastructure-backed distributed validation starts from working
tools.

## Impacted Modules And Files

- `package.json`
- `scripts/smoke-distributed-proof-tools.mjs`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/407-distributed-proof-kit-slice.md`
- `references/408-distributed-proof-verifier-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes

- Added `ops:smoke-distributed-proof-tools`.
- Added `scripts/smoke-distributed-proof-tools.mjs`.
- The script runs both distributed proof scripts through `node --check`.
- The script validates help output for both commands.
- The script runs two proof-kit dry-run paths:
  - token-protected Host generation;
  - no-token Host generation.
- The script runs verifier self-test with JSON output, User Client health
  checks, and required conversation checks, then parses the JSON and fails if
  any embedded check fails.
- The script runs a stopped-runtime verifier self-test and requires failure.
- The script runs the same stopped-runtime self-test with the diagnostic
  override and requires success.
- The script runs a shared-User-Client verifier self-test and requires failure.
- The script runs a wrong-runtime-kind verifier self-test and requires failure.
- The script runs a wrong-agent-engine-kind verifier self-test and requires
  failure.

## Tests Required

Implemented and passed:

- `node --check scripts/smoke-distributed-proof-tools.mjs`
- `pnpm ops:smoke-distributed-proof-tools`

Follow-up slice verification should also run:

- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit from the implementation checklist
- targeted root/package checks when package scripts are touched

## Migration And Compatibility

This is additive operator tooling. It does not change Host, runner, CLI, Studio,
User Client, proof kit, or verifier protocol behavior.

The smoke only writes to stdout/stderr. Proof-kit invocations use `--dry-run`,
so no proof directories are written.

## Risks And Mitigations

- Risk: operators mistake this smoke for the true distributed proof.
  Mitigation: docs state that the real proof still requires separate
  machines/boundaries and live Host/relay/git infrastructure.
- Risk: the smoke leaks Host tokens.
  Mitigation: it uses a dummy token and only dry-runs the kit; the kit masks
  token env display.
- Risk: JSON verifier output drifts.
  Mitigation: the smoke parses self-test JSON and requires `ok: true` plus no
  failed checks.

## Open Questions

- What infrastructure should eventually run the real proof in CI: nested
  containers, remote VMs, or a provider-specific ephemeral environment?
- Should the distributed proof verifier emit JUnit or another CI-native report
  format once infrastructure-backed proof execution exists?
