# User Client Wiki Publication Process Smoke Slice

## Summary

This slice extends the federated process-runner smoke so the new User Client
wiki publication path is proven through real running processes.

The smoke now creates a signed synthetic wiki approval request from the builder
agent to the assigned User Node, waits for that approval request to appear in
the User Node inbox, calls the running User Client's
`POST /api/wiki-repository/publish` route, and waits for the resulting
`runtime.wiki.publish` command receipt in Host projection.

## Current Repo Truth

- `references/412-user-client-wiki-publication-slice.md` added the Human
  Interface Runtime JSON route and dedicated User Client action.
- Unit tests covered the route and client helper.
- The process-runner smoke already proved operator-requested wiki publication
  through Host control, including primary and non-primary git targets.
- The process-runner smoke did not yet prove that a human graph participant can
  request wiki publication through the running User Client.

## Target Model

The strongest no-credential proof should exercise the human-node runtime
surface, not only admin/operator surfaces. The process smoke should prove:

- a builder-originated wiki approval request reaches the User Node inbox with
  signer metadata intact;
- the running User Client can request wiki publication for that visible wiki
  resource;
- the request is accepted as a Host-signed runner command;
- the assigned runner completes the command and emits a signed command receipt;
- Host projection can observe that receipt without reading runner-local files.

## Impacted Modules And Files

- `services/host/scripts/federated-process-runner-smoke.ts`
- `services/host/package.json`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/401-root-test-gate-reliability-slice.md`
- `references/412-user-client-wiki-publication-slice.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes

- Added a synthetic inbound `approval.request` for a builder
  `wiki_repository` resource in the process-runner smoke.
- The smoke now verifies the User Node inbox preserves that wiki approval
  request and builder signer.
- The smoke now calls the running User Client JSON route
  `/api/wiki-repository/publish`.
- The smoke asserts that the response is runtime-scoped, tagged as the User
  Node, and carries visible wiki refs.
- The smoke waits for a projected completed `runtime.wiki.publish` command
  receipt for the User Client-originated command.
- While verifying the slice, Host's direct package test command reproduced a
  no-output hang under the default Vitest pool. `services/host/package.json`
  now pins Host tests to `--pool=threads`, which passed immediately and keeps
  the targeted Host check usable outside the root runner.

## Tests Required

Implemented and passed:

- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/host typecheck`
- `CI=true pnpm --dir services/host test`
- `pnpm --filter @entangle/host test`
- `pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777 --timeout-ms 90000`

End-of-slice verification should also run:

- `pnpm test`
- `pnpm typecheck`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit from the implementation checklist

## Migration And Compatibility

The smoke change does not alter runtime contracts. It only exercises the
already-added User Client participant route through live Host, runner, relay,
git, and User Node process boundaries.

Host test pool pinning changes only local test execution. Runtime behavior,
package exports, and Host APIs are unchanged.

## Risks And Mitigations

- Risk: the smoke becomes too slow.
  Mitigation: it reuses the existing running Host, relay, builder runner, User
  Node runner, and projected wiki evidence already present in the smoke.
- Risk: synthetic approval metadata diverges from real agent approval messages.
  Mitigation: the smoke uses the same signed A2A publication helper and waits
  for Host/User Node inbox projection before calling the User Client route.
- Risk: Host test pool pinning hides a Vitest default-pool issue.
  Mitigation: the reliability slice records the observed failure mode and the
  verified threads-pool behavior.

## Open Questions

- Should the distributed proof verifier also require a User Client wiki
  publication receipt once the proof kit can generate that participant action?
