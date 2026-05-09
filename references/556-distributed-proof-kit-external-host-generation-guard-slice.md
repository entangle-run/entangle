# Distributed Proof Kit External Host Generation Guard Slice

## Current Repo Truth

Distributed proof profiles and verifier commands can require the Host API URL
to be non-loopback and non-wildcard through `--require-external-host-url`.
Before this slice, the verifier rejected a local Host URL, but the proof kit
generator could still produce an internally doomed physical-proof kit with
`--host-url http://127.0.0.1:... --require-external-host-url`.

## Target Model

When a physical proof asks for an external Host URL, the kit generator should
fail before writing or dry-running a misleading kit. The verifier remains the
authoritative topology check, but generation should catch obvious local-only
Host URLs early.

## Impacted Modules And Files

- `scripts/federated-distributed-proof-kit.mjs`
- `scripts/smoke-distributed-proof-tools.mjs`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add the same external HTTP URL classifier used by the verifier to the proof
  kit generator.
- Reject `--require-external-host-url` when `--host-url` is `localhost`,
  loopback, wildcard, non-HTTP(S), or malformed.
- Extend distributed proof tooling smoke coverage with a generator failure case
  for local Host URLs under the external-host requirement.

## Tests Required

- Proof kit syntax check.
- Distributed proof tooling smoke.
- Focused script lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

The guard is opt-in. Local and same-machine proof generation remains valid
without `--require-external-host-url`. Operators running a physical proof with
the flag must provide a Host URL that is reachable beyond the Host machine.

## Risks And Mitigations

- Risk: DNS names that resolve to loopback still pass the string-level guard.
  Mitigation: this guard only catches obvious generation-time mistakes; the
  verifier and real network checks still own runtime proof.
- Risk: local rehearsals using the flag now fail earlier. Mitigation: local
  rehearsals should omit `--require-external-host-url`; physical proof runs
  should keep it.

## Open Questions

Future infrastructure-backed orchestration should validate reachability from
each runner machine, not only operator-visible URL shape.

## Verification

Completed in this slice:

- `node --check scripts/federated-distributed-proof-kit.mjs`
- `node --check scripts/smoke-distributed-proof-tools.mjs`
- `node scripts/smoke-distributed-proof-tools.mjs`
- `npm exec --yes pnpm@10.18.3 -- ops:smoke-distributed-proof-tools`
- `./node_modules/.bin/eslint scripts/federated-distributed-proof-kit.mjs scripts/smoke-distributed-proof-tools.mjs --max-warnings 0`
- `node scripts/check-active-product-naming.mjs`
- `git diff --check`
- changed-diff local-assumption marker audit
