# Runner Identity Conflict Hardening Slice

## Current Repo Truth

Host runner registration intentionally binds a `runnerId` to the first public
key observed for that runner id. A later `runner.hello`, heartbeat, or
runner-signed observation with the same `runnerId` and a different public key
was rejected by throwing from Host state helpers.

When those exceptions happened inside the Nostr observation subscription path,
the Host process could terminate. This was reproduced during a runner-Compose
proof rehearsal after regenerating a kit with the same runner ids but new
runner secrets.

## Target Model

A conflicting runner identity is an invalid observation, not a Host process
fatal error. Host must preserve the existing runner registration and ignore the
conflicting observation without publishing a new acknowledgement or mutating
projection state.

## Impacted Modules And Files

- `services/host/src/state.ts`
- `services/host/src/federated-control-plane.ts`
- `services/host/src/federated-control-plane.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a typed `RunnerIdentityConflictError`.
- Throw that typed error for runner hello, heartbeat, assignment
  accepted/rejected runner-key mismatches, and generic runner observation
  public-key mismatches.
- Catch that typed error at the Host federated control-plane ingestion
  boundary.
- Return an ignored observation result with `reason:
  "runner_identity_conflict"` while leaving the existing registration intact.
- Avoid publishing `runner.hello.ack` for conflicting hellos.

## Tests Required

- Red/green Host control-plane test proving a conflicting `runner.hello`
  previously threw and now returns an ignored result.
- Host control-plane test proving a conflicting heartbeat is ignored without
  replacing the registered public key.
- Host typecheck/lint plus broader verification before commit.

## Migration And Compatibility Notes

This does not enable automatic runner re-keying. Operators who intentionally
want to replace a runner identity still need an explicit trust/revocation or
future re-key workflow. The slice only prevents invalid observations from
bringing down Host.

Previously recorded runner registrations remain valid.

## Risks And Mitigations

- Risk: identity conflicts become silent.
  Mitigation: the control-plane result carries a structured
  `runner_identity_conflict` reason for tests and future diagnostics. A richer
  operator-facing conflict ledger can be added later without weakening the
  protection.
- Risk: assignment mismatch errors with a different runner id are accidentally
  hidden.
  Mitigation: only same-runner public-key mismatches are converted to
  `RunnerIdentityConflictError`; other assignment mismatches still throw.

## Open Questions

- Should Host expose a runner identity-conflict audit stream in the operator
  projection, separate from ordinary runtime observations?
