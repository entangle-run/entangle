# Distributed Proof External User Client URL Slice

## Current Repo Truth

The distributed proof verifier already reads Host status, runner registry,
assignments, projection, optional relay health, optional git backend health,
optional User Client `/health`, projected conversations, projected work
evidence, and published git refs through operator-reachable APIs. It also
checks that multiple Human Interface Runtimes do not project the same User
Client URL.

Before this slice, a physical multi-machine proof could still pass with User
Client URLs such as `http://127.0.0.1/...` as long as the verifier was not asked
to fetch them, or could pass in a colocated operator setup that did not prove
the User Client endpoint was externally reachable.

## Target Model

Same-machine deployment remains a valid topology, but the distributed proof
tooling should let operators explicitly require network-reachable User Client
URLs when they are proving that User Nodes run on separate machines.

The verifier should still read only Host APIs and projected User Client URLs.
It must not inspect Host or runner files to infer topology.

## Impacted Modules/Files

- `scripts/federated-distributed-proof-verify.mjs`
- `scripts/federated-distributed-proof-kit.mjs`
- `scripts/distributed-proof-profile.mjs`
- `scripts/smoke-distributed-proof-tools.mjs`
- `packages/types/src/ops/distributed-proof-profile.ts`
- `packages/types/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `requireExternalUserClientUrls` to the distributed proof profile
  contract.
- Add `--require-external-user-client-urls` to the verifier.
- Fail verifier checks for projected User Client URLs on `localhost`,
  `127.0.0.0/8`, `0.0.0.0`, `::`, or `::1` when the flag/profile option is
  enabled.
- Add the same flag to the proof kit generator so generated physical proof
  profiles and verifier commands can enforce externally reachable User Client
  endpoints.
- Extend proof-tool smoke coverage with a loopback User Client failure case and
  dry-run proof-kit profile generation for the new requirement.

## Tests Required

- `pnpm --filter @entangle/types test -- src/index.test.ts`
- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/types lint`
- `pnpm ops:smoke-distributed-proof-tools`
- `node --check` for the changed proof profile, proof kit, verifier, and
  proof-tool smoke scripts
- `pnpm ops:check-product-naming`
- `git diff --check`

## Migration/Compatibility Notes

The new proof profile field is optional. Existing same-machine and local
adapter proofs continue to pass unless an operator opts into the external URL
requirement.

## Risks And Mitigations

- Risk: local same-machine proofs are accidentally made impossible.
  Mitigation: the check is opt-in and only affects verifier runs or generated
  proof profiles that request it.
- Risk: the check is mistaken for a complete network proof.
  Mitigation: it only rejects obvious loopback/wildcard URLs. Operators should
  still combine it with User Client health, relay health, git backend health,
  runner assignment, runtime projection, conversation, artifact evidence, and
  published git ref checks for a serious distributed proof.
- Risk: private LAN addresses are rejected even though they are valid across a
  real lab network.
  Mitigation: RFC1918 and other non-loopback hostnames/IPs are accepted.

## Verification

Completed for this slice:

- `pnpm --filter @entangle/types test -- src/index.test.ts`
- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/types lint`
- `pnpm ops:smoke-distributed-proof-tools`
- `node --check` for the changed proof profile, proof kit, verifier, and
  proof-tool smoke scripts
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff audit for old local-only product/runtime markers; the only hit
  was an unchanged valid Docker launcher-adapter reference in surrounding
  README context

## Open Questions

No product question blocks this proof hardening. A later infrastructure proof
should still provision VM/container or physical-machine boundaries and use this
flag together with live User Client health checks.
