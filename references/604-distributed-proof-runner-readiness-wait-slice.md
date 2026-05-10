# Distributed Proof Runner Readiness Wait Slice

## Current Repo Truth

Generated distributed proof kits produce runner directories and an operator
command script. The operator script previously assumed that all generated
runners had already published `runner.hello` before it reached `runners trust`
and `assignments offer` commands.

That assumption is correct architecturally but brittle operationally: a runner
may still be starting when the operator launches `operator/commands.sh`.

## Target Model

The generated operator command sequence should remain Host-API based and avoid
runner filesystem reads, but it should wait briefly for the expected runner
registrations before mutating trust and assignment state.

## Impacted Modules And Files

- `scripts/federated-distributed-proof-kit.mjs`
- `scripts/smoke-distributed-proof-tools.mjs`
- `README.md`
- `deploy/federated-dev/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Generate `operator/wait-for-runners.mjs`.
- Make that script:
  - source behavior through `operator.env`/process env;
  - read `operator/proof-profile.json`;
  - poll Host `GET /v1/runners`;
  - wait for the generated agent, primary User Node, and reviewer User Node
    runner ids;
  - print a compact JSON success record with liveness/trust state;
  - fail with a clear missing-runner diagnostic after a bounded timeout.
- Run the wait script from `operator/commands.sh` after graph preflight and
  any generated agent-engine setup, but before runner trust and assignment
  commands.
- Allow operators to tune the generated wait through:
  - `ENTANGLE_PROOF_RUNNER_WAIT_TIMEOUT_MS`;
  - `ENTANGLE_PROOF_RUNNER_WAIT_INTERVAL_MS`.

## Tests Required

- Syntax checks for proof-kit and proof-tool smoke scripts.
- Deterministic proof-tool smoke covering the dry-run wait command signal.
- Runtime proof against a real temporary Host where the wait script times out
  clearly when no generated runners are registered.
- Product naming check and broad verification before commit.

## Migration And Compatibility Notes

Existing generated kits do not gain `operator/wait-for-runners.mjs`;
regenerate the kit.

The wait is read-only. It does not trust, revoke, assign, or start runners. It
only prevents the generated operator script from failing immediately because a
runner registration has not reached Host yet.

## Risks And Mitigations

- Risk: a physical proof waits longer than desired.
  Mitigation: operators can override the timeout and polling interval with
  environment variables.
- Risk: registered but stale/offline runners pass the wait.
  Mitigation: this wait checks registration readiness only; the existing
  verifier still checks liveness/runtime observations after assignment.

## Open Questions

- Should a future script wait for heartbeat/liveness before trust, or keep
  registration wait separate from post-assignment verifier liveness?
