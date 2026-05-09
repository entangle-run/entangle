# Distributed Proof External Relay URL Slice

## Current Repo Truth

Distributed proof profiles already carry `relayUrls`, and generated verifier
commands can opt into `--check-relay-health` to open those relay WebSocket
URLs from the operator machine. The verifier also already supports external
Host API and User Client URL requirements, but relay URLs did not have a
matching physical-proof guard. A proof kit could therefore be generated with a
loopback relay URL while still presenting itself as a multi-machine proof.

## Target Model

Physical distributed proofs should be able to require relay URLs that are not
loopback or wildcard addresses. The guard is intentionally separate from relay
health: `--require-external-relay-urls` checks URL shape, while
`--check-relay-health` checks live WebSocket reachability. A physical proof can
use both flags.

## Impacted Modules And Files

- `packages/types/src/ops/distributed-proof-profile.ts`
- `packages/types/src/index.test.ts`
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

- Add optional `requireExternalRelayUrls` to the TypeScript distributed proof
  profile contract and the script-side profile normalizer, and repair the
  package contract drift for the already-supported `requireExternalHostUrl`
  field.
- Add `--require-external-relay-urls` to the proof kit generator and verifier.
- Persist the requirement into generated `proof-profile.json` and
  `proof-profile-post-work.json`.
- Make generated verifier scripts carry the same requirement.
- Fail kit generation when the requirement is requested without an explicit
  relay URL or when any relay URL is malformed, non-WebSocket, loopback, or
  wildcard.
- Add verifier checks named `relay external url <url>` so JSON/JUnit output can
  show which relay URL failed.
- Extend deterministic proof-tool smoke coverage for generated profile output,
  generator rejection, verifier rejection, and verifier success.

## Tests Required

- Distributed proof profile contract tests.
- Distributed proof tooling smoke.
- Proof kit, verifier, and profile syntax checks.
- Focused script lint.
- Package typecheck for `packages/types`.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

The guard is opt-in. Local relay rehearsals and same-machine proofs remain
valid when `--require-external-relay-urls` is omitted. Physical multi-machine
proof runs should pass both `--relay-url` and `--require-external-relay-urls`;
they can also add `--check-relay-health` when the operator machine should open
the relay WebSocket before accepting the topology proof.

## Risks And Mitigations

- Risk: DNS names that resolve to loopback still pass the string-level guard.
  Mitigation: this guard catches obvious URL mistakes; relay health and real
  runner communication remain the authoritative network proof.
- Risk: a private LAN relay URL may be rejected if the guard becomes too strict.
  Mitigation: the current guard rejects only loopback and wildcard addresses,
  not RFC1918 LAN addresses, because LAN topologies are valid physical proofs.
- Risk: operators may expect the external URL guard to imply relay health.
  Mitigation: docs and CLI help keep shape and health checks separate.

## Open Questions

Future infrastructure-backed proof orchestration should verify relay
reachability from each runner machine, not only from the operator machine.

## Verification

Completed in this slice:

- `node --check scripts/distributed-proof-profile.mjs`
- `node --check scripts/federated-distributed-proof-kit.mjs`
- `node --check scripts/federated-distributed-proof-verify.mjs`
- `node --check scripts/smoke-distributed-proof-tools.mjs`
- `node scripts/smoke-distributed-proof-tools.mjs`
- `npm exec --yes pnpm@10.18.3 -- ops:smoke-distributed-proof-tools`
- `./node_modules/.bin/tsc -b packages/types/tsconfig.json --pretty false`
- `npm exec --yes pnpm@10.18.3 -- --filter @entangle/types test`
- `./node_modules/.bin/eslint scripts/distributed-proof-profile.mjs scripts/federated-distributed-proof-kit.mjs scripts/federated-distributed-proof-verify.mjs scripts/smoke-distributed-proof-tools.mjs --max-warnings 0`
- `./node_modules/.bin/eslint packages/types/src/ops/distributed-proof-profile.ts packages/types/src/index.test.ts --max-warnings 0`
- `node scripts/check-active-product-naming.mjs`
- `git diff --check`
- changed-file local-assumption marker audit; relevant hits were existing
  Docker/local adapter documentation and tests, not invalid new local-only
  assumptions from this slice
