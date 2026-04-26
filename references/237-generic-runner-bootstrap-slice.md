# Generic Runner Bootstrap Slice

## Current Repo Truth

Before this slice, the executable runner path in `services/runner/src/index.ts`
always expected an injected local `effective-runtime-context.json`. That local
path remains valid for the Docker/local adapter, but it cannot represent a
generic federated runner because it already contains graph, node, workspace,
package, policy, identity, and filesystem decisions made by the Host.

The repository already had shared contracts for runner registration, control
events, observation events, and assignment lifecycle. It also had
`RunnerFederatedNostrTransport`, but no runner-owned join config and no runner
startup mode that could publish `runner.hello` before receiving a graph
assignment.

## Target Model

A runner can start generic from a small join config:

- runner id;
- runner signing key delivery reference;
- trusted Host Authority pubkey;
- relay URLs;
- advertised capabilities.

The generic runner subscribes to Host control events, publishes signed
`runner.hello`, receives assignment offers, and emits signed assignment
receipts, accepted observations, or rejected observations. Assignment
materialization is an explicit injected boundary. Until a real federated
materializer is wired, the runner rejects assignment offers instead of
pretending that it has started a node runtime.

The local context path remains as `local-context` compatibility mode.

## Impacted Modules/Files

- `packages/types/src/federation/runner-join.ts`
- `packages/types/src/index.ts`
- `packages/types/src/index.test.ts`
- `services/runner/src/join-config.ts`
- `services/runner/src/join-service.ts`
- `services/runner/src/index.ts`
- `services/runner/src/index.test.ts`
- `services/runner/src/test-fixtures.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- add `RunnerJoinConfig`, join identity, and join status schemas;
- support env-var and mounted-file delivery for the runner Nostr secret;
- derive and verify runner pubkey from join config identity;
- add `entangle-runner join --config <path>` mode through runner argv parsing;
- preserve the existing local `effective-runtime-context.json` path as
  `local-context` mode;
- add a `RunnerJoinService` that subscribes to control events and publishes
  `runner.hello`;
- handle `runtime.assignment.offer` with capability checks and an injected
  `RunnerAssignmentMaterializer`;
- publish `assignment.receipt`, `assignment.accepted`, and
  `assignment.rejected` observations from the runner;
- reject assignment offers when no materializer is configured;
- add tests for join-mode selection, no-context bootstrap, materializer-backed
  acceptance, and safe rejection.

Deferred to the next slices:

- Host-side automatic Nostr subscription/publish wiring for hello ack and
  assignment offer delivery;
- a real federated assignment materializer that fetches graph/package/resource
  state and builds node-local runtime context;
- local Docker adapter rebasing onto generic join config.

## Tests Required

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/runner test`
- `pnpm --filter @entangle/types lint`
- `pnpm --filter @entangle/runner lint`
- `pnpm typecheck`
- `git diff --check`

Verification record for the implemented slice:

- `pnpm --filter @entangle/types typecheck` passed;
- `pnpm --filter @entangle/runner typecheck` passed;
- `pnpm --filter @entangle/types test` passed;
- `pnpm --filter @entangle/runner test` passed;
- `pnpm --filter @entangle/types lint` passed;
- `pnpm --filter @entangle/runner lint` passed;
- `pnpm typecheck` passed;
- `git diff --check` passed.

## End-Of-Slice Audit

The local-assumption search is intentionally expected to find the compatibility
path in `services/runner/src/index.ts` and existing Local docs/tests. The new
federated path is `join` mode and does not require
`ENTANGLE_RUNTIME_CONTEXT_PATH`.

The new bootstrap tests prove that `runGenericRunnerUntilSignal` starts from
join config and publishes `runner.hello` without creating or reading
`effective-runtime-context.json`.

Added local-assumption hits were reviewed. The only new hit is this document's
explicit compatibility note for `effective-runtime-context.json`; that is valid
local-adapter documentation, not a federated runtime dependency.

## Migration/Compatibility Notes

This slice is additive. Existing local Docker runners still use the local
context path. Operators can now start the same runner binary in generic mode:

```bash
ENTANGLE_RUNNER_NOSTR_SECRET_KEY=<hex-secret> \
  entangle-runner join --config runner-join.json
```

The first join config format is JSON because the repository already validates
JSON with Zod and has no TOML dependency. A TOML wrapper can be added later
without changing the canonical schema.

## Risks And Mitigations

- Risk: Host believes a runner is executing an assignment when no workspace has
  been materialized.
  Mitigation: the default join service rejects offers without a materializer.
- Risk: the old local context path remains mistaken for the federated model.
  Mitigation: the executable now exposes explicit `join` and `local-context`
  modes, and this record documents local context as compatibility.
- Risk: key material leaks into config files.
  Mitigation: join config stores only secret delivery metadata; the secret is
  read from env var or mounted file at startup.
- Risk: assignment acceptance bypasses runner capability checks.
  Mitigation: the join service checks advertised runtime kinds before invoking
  the materializer.

## Open Questions

No open question blocks this slice. The next implementation decision is the
shape of the federated materializer: it should fetch Host-signed graph/resource
snapshots and materialize runtime context in runner-owned storage without Host
filesystem access.
