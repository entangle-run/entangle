# Distributed Proof Kit Relay Health Profile Slice

## Current Repo Truth

`pnpm ops:distributed-proof-verify` supports `--check-relay-health` and proof
profiles can carry `"checkRelayHealth": true`. The generated distributed proof
kit already accepts `--relay-url`, but before this slice it could not generate
an operator proof profile and verifier command that opted into relay health.
Operators had to remember to edit the generated command or pass the verifier
flag manually.

## Target Model

The proof kit should be self-contained for real multi-machine topology checks.
When an operator asks for relay health verification during kit generation, the
generated verifier command and `operator/proof-profile.json` should carry that
decision. The kit should reject relay-health generation when no explicit relay
URL is available for the verifier profile.

## Impacted Modules And Files

- `scripts/federated-distributed-proof-kit.mjs`
- `scripts/smoke-distributed-proof-tools.mjs`
- `README.md`
- `deploy/federated-dev/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/429-distributed-proof-relay-health-verifier-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes

- Added `--check-relay-health` to `pnpm ops:distributed-proof-kit`.
- Generated verifier commands now include `--check-relay-health` when that kit
  option is used.
- Generated proof profiles now include `"checkRelayHealth": true` when that
  kit option is used.
- The kit rejects `--check-relay-health` without at least one explicit
  `--relay-url`, because the generated proof profile must be portable to the
  operator machine without depending on implicit Host-local discovery.
- The distributed proof tool smoke now proves both the generated profile path
  and the missing-relay validation failure.

## Tests Required

Implemented and passed for this slice:

- `node --check scripts/federated-distributed-proof-kit.mjs`
- `node --check scripts/smoke-distributed-proof-tools.mjs`
- `pnpm ops:smoke-distributed-proof-tools`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit from the implementation checklist.

## Migration And Compatibility Notes

This is opt-in. Existing generated proof kits are unchanged unless operators
pass `--check-relay-health`. Requiring an explicit `--relay-url` for this flag
keeps generated profiles deterministic and prevents a verifier command copied
to another machine from depending on unstated relay discovery.

## Risks And Mitigations

- Risk: an operator expects Host status relay defaults to be enough.
  Mitigation: runner join config generation can still use Host defaults, but a
  portable proof profile needs explicit relay URLs when it asks the verifier to
  open relay sockets from the operator machine.
- Risk: relay health can fail behind restrictive networks even when Host state
  converges.
  Mitigation: relay health remains opt-in and is separate from the default
  topology/projection proof.

## Open Questions

- Should the kit eventually query Host status directly and materialize relay
  defaults into the proof profile when `--check-relay-health` is requested?
