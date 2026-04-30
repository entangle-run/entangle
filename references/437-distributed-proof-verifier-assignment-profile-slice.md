# Distributed Proof Verifier Assignment Profile Slice

## Current Repo Truth

Distributed proof profiles include an `assignments` manifest with assignment
ids, node ids, runner ids, and supported runtime kinds. The proof kit writes
that manifest and validates it before writing generated files.

Before this slice, `pnpm ops:distributed-proof-verify` parsed and validated
the profile manifest but still built its expected assignment ids from the
convention `assignment-${runnerId}`. That made generated/default proof kits
work, but it meant a valid proof profile with non-conventional assignment ids
could not be verified accurately and the verifier was not fully honoring the
manifest it accepted.

## Target Model

The verifier should use the proof profile as the source of truth when explicit
assignments are present. Default runner/node flags remain useful for simple
manual invocations, but profile-backed verification must preserve custom
assignment ids so live smoke/proof harnesses can use dynamic assignment naming
without weakening the proof.

## Impacted Modules And Files

- `scripts/federated-distributed-proof-verify.mjs`
- `scripts/smoke-distributed-proof-tools.mjs`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes

- Split the verifier's default expected profiles from the final expected
  profile list.
- When a normalized proof profile includes `assignments`, derive verifier
  expectations from those manifest entries, including the exact assignment id.
- Preserve the configured expected agent engine for manifest entries whose
  runtime kind includes `agent_runner`.
- Keep the existing convention-based defaults when no explicit assignments are
  present.
- Extend the distributed proof tool smoke with a custom-assignment profile
  self-test whose assignment ids do not follow `assignment-${runnerId}`.

## Tests Required

Implemented and passed for this slice:

- `node --check scripts/federated-distributed-proof-verify.mjs`
- `node --check scripts/smoke-distributed-proof-tools.mjs`
- `pnpm ops:smoke-distributed-proof-tools`
- `pnpm verify`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit from the implementation checklist.

## Migration And Compatibility Notes

This is backward-compatible for generated proof kits and manual verifier
commands. Profiles without `assignments` keep the previous derived assignment
id behavior. Profiles with `assignments` now get the stronger and more
expected behavior: the verifier checks the exact manifest assignment ids.

## Risks And Mitigations

- Risk: a profile with extra assignments could widen the verifier scope.
  Mitigation: the profile contract already requires explicit assignment ids,
  node ids, runner ids, and runtime kinds; the verifier still checks runner
  registration, trust, liveness, assignment, projection, runtime state, and
  User Client distinctness for every expected profile entry.
- Risk: an agent assignment that is not the canonical top-level agent node
  still receives the top-level expected agent engine.
  Mitigation: v1 proof profiles model one agent engine expectation for the
  proof; richer per-assignment engine expectations can be added if the proof
  format widens beyond the current three-runner shape.

## Open Questions

- Should proof profiles eventually support per-assignment expected agent engine
  kinds instead of one profile-level agent engine expectation?
