# Distributed Proof Kit Agent Engine Selection Slice

## Current Repo Truth

`pnpm ops:distributed-proof-verify` can now validate a non-default expected
agent engine kind with `--agent-engine-kind <kind>`, while defaulting to
`opencode_server`.

Before this slice, `pnpm ops:distributed-proof-kit` always generated the agent
runner join config with `--agent-engine-kind opencode_server`, and the generated
operator command script did not run the distributed proof verifier.

## Target Model

The proof kit and verifier should stay parameterized together. OpenCode remains
the default proof engine, but operators can generate a custom proof kit whose
agent runner advertises another engine kind, and the generated operator script
should validate that same expected engine kind.

## Impacted Modules And Files

- `scripts/federated-distributed-proof-kit.mjs`
- `scripts/smoke-distributed-proof-tools.mjs`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/407-distributed-proof-kit-slice.md`
- `references/411-distributed-proof-tool-ci-smoke-slice.md`
- `references/424-distributed-proof-agent-engine-selection-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes

- Added `--agent-engine-kind <kind>` to `pnpm ops:distributed-proof-kit`.
- Allowed repeated or comma-separated engine kind values for the generated
  agent runner join config.
- Kept `opencode_server` as the default when no engine kind is supplied.
- Added the distributed proof verifier command to generated
  `operator/commands.sh`, using the first configured agent engine kind as the
  expected verifier engine.
- Updated generated kit README topology rows to show agent engine kinds.
- Extended `pnpm ops:smoke-distributed-proof-tools` with a custom-engine
  proof-kit dry-run.

## Tests Required

Implemented and passed for this slice:

- `node --check scripts/federated-distributed-proof-kit.mjs`
- `node --check scripts/smoke-distributed-proof-tools.mjs`
- `pnpm ops:smoke-distributed-proof-tools`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit from the implementation checklist.

## Migration And Compatibility Notes

Existing proof-kit invocations continue to generate OpenCode-capable agent
runners because `opencode_server` remains the default. Custom proof profiles can
now pass:

```bash
pnpm ops:distributed-proof-kit --agent-engine-kind external_process
```

and the generated operator commands will run the verifier with the same expected
engine kind.

## Risks And Mitigations

- Risk: multiple agent engine kinds are generated, but the verifier checks one
  expected kind.
  Mitigation: the verifier command uses the first configured engine kind; the
  runner still advertises all supplied engine kinds.
- Risk: operators confuse engine capability with actual live model credentials.
  Mitigation: this slice validates runner capability projection only. Live model
  API behavior remains a separate manual/provider-backed test path.

## Open Questions

- Should a later proof kit support multiple agent runners with different
  engines in the same generated topology?
