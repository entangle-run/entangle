# Distributed Proof Profile Manifest Slice

## Current Repo Truth

`pnpm ops:distributed-proof-kit` can generate a self-consistent three-runner
proof profile, and the generated operator verifier command carries the selected
runner ids, graph node ids, and agent engine kind.

Before this slice, that profile still lived only as shell flags. The verifier
could not consume a generated profile manifest directly, and dry-run output had
no machine-readable proof profile for CI to inspect.

## Target Model

The proof kit should emit a machine-readable proof profile, and the verifier
should be able to use that profile as its default configuration. Generated
operator commands should point the verifier at the profile file while still
allowing explicit CLI flags to override profile values when needed.

## Impacted Modules And Files

- `scripts/federated-distributed-proof-kit.mjs`
- `scripts/federated-distributed-proof-verify.mjs`
- `scripts/smoke-distributed-proof-tools.mjs`
- `README.md`
- `deploy/federated-dev/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/407-distributed-proof-kit-slice.md`
- `references/408-distributed-proof-verifier-slice.md`
- `references/411-distributed-proof-tool-ci-smoke-slice.md`
- `references/426-distributed-proof-kit-verifier-profile-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes

- The proof kit now writes `operator/proof-profile.json` with:
  - Host URL and relay URLs;
  - agent runner id and engine kind;
  - User Node runner ids;
  - graph node ids;
  - assignment profile metadata.
- The proof kit generated verifier command now uses
  `--profile "$SCRIPT_DIR/proof-profile.json"` and keeps `--host-url
  "$ENTANGLE_HOST_URL"` as an operator-env override.
- The verifier now accepts `--profile <file>`.
- Explicit verifier CLI flags override profile values.
- Proof-kit dry-run output now prints the exact compact profile JSON.
- The distributed proof tool smoke now:
  - checks custom profile JSON in proof-kit dry-run output;
  - runs a verifier self-test through a temporary profile manifest.

## Tests Required

Implemented and passed for this slice:

- `node --check scripts/federated-distributed-proof-kit.mjs`
- `node --check scripts/federated-distributed-proof-verify.mjs`
- `node --check scripts/smoke-distributed-proof-tools.mjs`
- `pnpm ops:smoke-distributed-proof-tools`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit from the implementation checklist.

## Migration And Compatibility Notes

Existing verifier flags still work. Existing generated proof kits from previous
slices are still usable because `--profile` is optional and all old defaults
remain in place. New proof kits are less error-prone because the operator
script and verifier share the same generated profile file.

## Risks And Mitigations

- Risk: profile files become stale after manual edits to operator scripts.
  Mitigation: generated commands now reference the profile directly instead of
  duplicating the selected values as many flags.
- Risk: Host URL in the profile becomes stale after moving infrastructure.
  Mitigation: the generated command still passes `--host-url
  "$ENTANGLE_HOST_URL"`, so `operator.env` remains the operational override.

## Open Questions

- Should future distributed proof profiles include artifact backend and relay
  health expectations so the verifier can validate more than Host/User Client
  HTTP surfaces?
