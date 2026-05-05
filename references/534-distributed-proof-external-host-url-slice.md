# Distributed Proof External Host URL Slice

## Current Repo Truth

The distributed proof verifier can already reject loopback or wildcard User
Client URLs, proving that human-node clients are reachable beyond their own
machine. The proof still allowed `localhost` or other loopback Host URLs even
when the operator intended to validate a physical multi-machine topology.

## Target Model

Physical proof profiles should be able to require a Host API URL that is not
loopback or wildcard. The option must be available in generated proof kits,
persisted proof profiles, and direct verifier invocations.

## Impacted Modules And Files

- `scripts/distributed-proof-profile.mjs`
- `scripts/federated-distributed-proof-kit.mjs`
- `scripts/federated-distributed-proof-verify.mjs`
- `scripts/smoke-distributed-proof-tools.mjs`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `requireExternalHostUrl` to the proof profile normalizer.
- Add `--require-external-host-url` to the proof kit.
- Persist the requirement in generated proof profiles.
- Add the same flag to generated verifier commands.
- Add `--require-external-host-url` to the verifier and emit a `host external
  url` check.
- Extend proof-tool smoke coverage for generated commands, profiles, passing
  external-host self-test, and failing loopback-host self-test.

## Tests Required

- Node syntax checks for all touched proof scripts.
- `pnpm ops:smoke-distributed-proof-tools`.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

The new requirement is opt-in. Existing local/development proofs can continue
using loopback Host URLs unless they pass the new flag or profile field.

## Risks And Mitigations

- Risk: operators may confuse local development smoke with physical proof.
  Mitigation: the flag is explicitly named and documented as an external Host
  URL requirement.
- Risk: DNS names that resolve to loopback are not detected. Mitigation: v1
  rejects obvious loopback/wildcard URL hostnames and aligns with the existing
  User Client external URL check.

## Open Questions

Future infrastructure-backed proof orchestration should eventually validate
network reachability from each runner machine, not only the operator-visible
Host URL string.

## Verification

Completed in this slice:

- `node --check scripts/distributed-proof-profile.mjs`
- `node --check scripts/federated-distributed-proof-kit.mjs`
- `node --check scripts/federated-distributed-proof-verify.mjs`
- `node --check scripts/smoke-distributed-proof-tools.mjs`
- `pnpm ops:smoke-distributed-proof-tools`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit over scripts and updated docs
