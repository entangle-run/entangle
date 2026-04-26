# Host Runner Federation Spec

## Current Repo Truth

The current Host-runner relationship is local and Host-driven.

Host builds runtime context, writes it to disk, injects a node secret through
env vars, starts Docker containers through the Docker Engine API, and stores
observed runtime records with Docker handles and `runtimeContextPath`. The
runner starts only after it can read local `effective-runtime-context.json`.

Runner A2A messaging is real and Nostr-backed. Host-runner control and
observation are not.

## Target Model

Runners start generic:

1. Runner loads `runner.toml` or equivalent join config.
2. Runner owns a runner signing key or key reference.
3. Runner trusts a Host Authority pubkey.
4. Runner publishes signed `runner.hello`.
5. Host records the registration as untrusted or pending.
6. Operator trusts or rejects the runner.
7. Host sends signed `runtime.assignment.offer`.
8. Runner validates Host Authority signature and local capabilities.
9. Runner replies `runtime.assignment.accepted` or `rejected`.
10. Runner materializes workspace locally.
11. Runner executes the assigned node.
12. Runner emits signed observations and heartbeats.
13. Host updates ProjectionStore from observations.

Host must not need shared filesystem access to understand runner state.

## Impacted Modules/Files

- `packages/types/src/runtime/runtime-state.ts`
- new `packages/types/src/federation/runner.ts`
- new `packages/types/src/federation/assignment.ts`
- new `packages/types/src/protocol/control.ts`
- new `packages/types/src/protocol/observe.ts`
- `packages/validator/src/index.ts`
- `services/host/src/state.ts`
- `services/host/src/runtime-backend.ts`
- `services/host/src/index.ts`
- `services/runner/src/index.ts`
- `services/runner/src/service.ts`
- `services/runner/src/transport.ts`
- `services/runner/src/nostr-transport.ts`
- `deploy/federated-dev/**`
- `scripts/smoke-federated-dev-runtime.mjs`

## Concrete Changes Required

- Add runner registration records and Host APIs.
- Add runner trust/revoke state transitions.
- Add runner heartbeat and stale/offline classification.
- Add runtime assignment offers with graph revision, node id, runtime kind,
  resource refs, policy, and lease.
- Add runner acceptance/rejection receipts.
- Add assignment revoke and lease expiration handling.
- Add runner bootstrap path that does not require prewritten effective context.
- Add local materializer that turns assignment plus fetched package/resource
  state into local workspace context.
- Rebase Docker local launcher to start a generic runner with join config,
  not a pre-assigned runner with a shared context path.

## Tests Required

- Runner hello schema and signature tests.
- Host trust/revoke API tests.
- Heartbeat stale/offline tests.
- Assignment offer/accept/reject/revoke tests.
- Runner bootstrap tests without context path.
- Docker local adapter regression tests.
- Integration test using fake relay/control transport.
- Distributed smoke with separate Host and runner filesystem roots.

## Migration/Compatibility Notes

`RuntimeBackend` should be renamed or wrapped as `LocalLauncherAdapter` in the
target model. Memory and Docker backends remain useful for tests/federated dev profile,
but they should launch generic runners and let Host assignment protocol do the
semantic work.

Existing observed runtime records can migrate into projection records, with old
fields accepted for compatibility.

## Risks And Mitigations

- Risk: local adapter secretly continues to inject assignment by file path.
  Mitigation: add a no-shared-filesystem test and forbid `contextPath` in the
  federated assignment smoke.
- Risk: assignment events are replayed out of order.
  Mitigation: include assignment revision, lease id, issued-at, expires-at, and
  supersedes fields.
- Risk: untrusted runner receives secrets.
  Mitigation: runner must be trusted before assignment can include secret refs.

## Open Questions

- The first runner join config is JSON because it can be validated directly by
  the shared Zod schema and does not add a TOML dependency. A TOML-facing CLI
  wrapper remains a possible operator convenience layer.
