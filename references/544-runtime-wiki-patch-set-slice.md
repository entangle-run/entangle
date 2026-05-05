# Runtime Wiki Patch-Set Slice

## Current Repo Truth

Entangle already had single-page runner-owned wiki mutation through
`runtime.wiki.upsert_page` and an operator batch endpoint that emits multiple
independent upsert commands. That batch surface is useful for headless
maintenance, but it is intentionally not atomic: one page can be accepted or
fail independently from another.

## Target Model

Related wiki/memory edits should also have a single federated command that the
assigned runner validates as one patch-set. If any page has a stale base hash,
duplicate path, invalid path, or invalid patch, the runner must reject the set
before writing pages. Successful patch-sets should update all pages, update the
wiki index, sync the wiki repository once, emit wiki ref observations, and
publish one runtime command receipt with the page count.

## Impacted Modules And Files

- `packages/types/src/protocol/control.ts`
- `packages/types/src/protocol/observe.ts`
- `packages/types/src/host-api/runtime.ts`
- `packages/types/src/host-api/events.ts`
- `packages/types/src/projection/projection.ts`
- `services/host/src/federated-control-plane.ts`
- `services/host/src/index.ts`
- `services/host/src/state.ts`
- `services/runner/src/join-service.ts`
- `services/runner/src/service.ts`
- `services/runner/src/index.ts`
- `packages/host-client/src/index.ts`
- `apps/cli/src/index.ts`
- `apps/cli/src/runtime-wiki-command.ts`
- `apps/user-client/src/runtime-api.ts`
- `apps/studio/src/federation-inspection.ts`
- `services/runner/src/human-interface-runtime.ts`
- tests for each touched contract/surface

## Concrete Changes Required

- Add `runtime.wiki.patch_set` to control/runtime-command event schemas.
- Add Host API request/response schemas for
  `POST /v1/runtimes/:nodeId/wiki/pages/patch-set`.
- Add Host control-plane publication for one signed patch-set command.
- Add runner join handling with received/completed/failed command receipts.
- Add runner service patch-set application with all-page validation before
  writes, duplicate-path rejection, index updates, one repository sync, and
  per-page wiki ref observations.
- Add host-client and CLI surfaces:
  `entangle host runtimes wiki-patch-set <nodeId> --manifest <path>`.
- Add `wikiPageCount` to command receipt observation, Host event, projection,
  CLI/User Client/Studio detail presentation.
- Extend wiki conflict summaries to include patch-set stale-base failures.

## Tests Required

- Type schema tests for the new control payload and receipt field.
- Host control-plane tests for signed patch-set payload publication.
- Host API tests for the new route and assignment/relay forwarding.
- Runner service tests for all-page validation, write behavior, and conflict
  no-write behavior.
- Runner join tests for command handling and receipt projection fields.
- Host-client tests for request serialization.
- CLI manifest parser tests.
- User Client and Studio focused presentation tests.
- Typecheck for touched workspaces.
- Lint for touched workspaces.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit over touched code and docs.

## Migration And Compatibility Notes

The existing single-page and batch upsert routes remain unchanged. Operators
can keep using the non-atomic batch route where independent page commands are
acceptable, and use the patch-set route when the pages must be validated and
applied as one logical mutation.

## Risks And Mitigations

- Risk: file-write errors after validation could still leave partial files.
  Mitigation: this slice guarantees all stale-base/path/patch validation before
  writes and a single sync; service-level rollback/export tooling remains a
  future durability hardening path.
- Risk: patch-set receipts lose per-page detail.
  Mitigation: the receipt includes `wikiPageCount`, conflict receipts include
  the conflicting page path and hashes, and successful page-level evidence is
  emitted through wiki ref observations.
- Risk: the old batch route is mistaken for atomic behavior.
  Mitigation: docs now distinguish independent batch upserts from patch-set
  semantics.

## Open Questions

Future collaborative merge UI can build on this command by producing patch-set
manifests from reviewed diffs. Durable rollback for mid-write I/O failures
should be handled with repository-level safety tooling, not Host-side file
mutation.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/runner test -- src/service.test.ts src/index.test.ts`
- `pnpm --filter @entangle/host-client test -- src/index.test.ts`
- `pnpm --filter @entangle/cli test -- src/runtime-wiki-command.test.ts`
- `pnpm --filter @entangle/host test -- src/index.test.ts src/federated-control-plane.test.ts`
- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/host-client typecheck`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/user-client test -- src/runtime-api.test.ts`
- `pnpm --filter @entangle/user-client typecheck`
- `pnpm --filter @entangle/studio test -- src/federation-inspection.test.ts`
- `pnpm --filter @entangle/studio typecheck`
- `pnpm --filter @entangle/types lint`
- `pnpm --filter @entangle/runner lint`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/host-client lint`
- `pnpm --filter @entangle/cli lint`
- `pnpm --filter @entangle/user-client lint`
- `pnpm --filter @entangle/studio lint`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test` (root runner retried the types suite after a timeout-only
  startup stall; the retry passed)
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit; the new hits are valid
  runner-local runtime/test storage references, not Host-runner shared
  filesystem assumptions
