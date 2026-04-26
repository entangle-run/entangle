# Portable Runtime Bootstrap Bundle Slice

## Current Repo Truth

Joined runners previously fetched `/v1/runtimes/:nodeId/context` and received a
full `EffectiveRuntimeContext` carrying Host-materialized workspace paths. The
runner then rewrote those paths into runner-owned paths and copied package and
memory directories directly from the Host path values. That worked for the
process smoke on one workstation, but it still treated Host-local filesystem
paths as a bootstrap substrate.

The public runtime inspection response no longer exposes `contextPath`, but
runner bootstrap still needed a portable package/context handoff.

## Target Model

A joined runner should receive an authenticated, portable bootstrap bundle:

- a runtime context whose workspace and package source paths are sanitized
  placeholders;
- bounded file snapshots for package and memory roots;
- hashes and sizes for snapshot files;
- no dependency on reading Host-local paths from the runner process.

The runner remains responsible for materializing the bundle into its own state
root before starting the assigned node runtime.

## Impacted Modules/Files

- `packages/types/src/host-api/runtime.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/index.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `services/runner/src/assignment-materializer.ts`
- `services/runner/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/230-migration-from-local-assumptions-plan.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/248-runner-default-assignment-materializer-slice.md`
- `references/254-process-runner-federated-smoke-slice.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- added runtime bootstrap bundle schemas with snapshot roots, relative file
  path validation, base64 file payloads, sha256 hashes, and byte sizes;
- added authenticated `GET /v1/runtimes/:nodeId/bootstrap-bundle`;
- made Host build portable runtime contexts with `/entangle/runtime/workspace`
  placeholder paths instead of Host workspace paths;
- made Host snapshot package and memory roots into verified file payloads;
- changed the default runner assignment materializer to fetch the bootstrap
  bundle instead of the raw runtime context endpoint;
- changed runner materialization to write package and memory snapshots into the
  runner-owned assignment workspace and verify sha256/size metadata;
- surfaced the portable bundle through `packages/host-client` and
  `entangle host runtimes bootstrap-bundle <nodeId>`;
- kept runtime identity secret bootstrap separate and opt-in through the
  existing authenticated identity-secret route.

Deferred:

- replacing base64 JSON snapshots with git/object-store artifact refs for large
  packages;
- signing bootstrap bundle payloads independently of authenticated Host API
  transport;
- encrypting node identity secret delivery inside assignment-specific bundles;
- removing the explicit runtime context debug endpoint after remaining Host
  detail APIs are projection-backed.

## Tests Required

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/types test -- index.test.ts`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host test -- index.test.ts`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner test -- index.test.ts`
- `pnpm --filter @entangle/types lint`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/runner lint`
- process runner smoke against the federated dev relay;
- root `pnpm typecheck`
- root `pnpm lint`
- `git diff --check`
- stale product marker and local-assumption audit search.

Verification record:

- targeted typechecks for types, Host, and runner passed;
- targeted tests for types, Host, and runner passed;
- targeted lint for types, Host, and runner passed;
- process runner smoke passed against the federated dev `strfry` relay on
  `ws://localhost:7777`;
- root `pnpm typecheck` passed;
- root `pnpm lint` passed;
- `git diff --check` passed;
- stale product marker search returned no matches.

## Migration/Compatibility Notes

The raw context endpoint remains for explicit debug/inspection and older Host
internals. The default joined runner no longer uses it for assignment
materialization. Runner join configs that declare a Host API endpoint now expect
the authenticated bootstrap bundle route.

The bundle format is additive at the type level and can later carry artifact
refs instead of inline file snapshots without changing the runner ownership
model.

## Risks And Mitigations

- Risk: inline base64 snapshots are inefficient for large packages.
  Mitigation: this is a bootstrap bridge; artifact refs remain the target for
  production package handoff.
- Risk: snapshot extraction could permit path traversal.
  Mitigation: contracts reject absolute, empty, `.`, and `..` path segments,
  and the runner also verifies resolved paths stay under the target root.
- Risk: Host API authentication is mistaken for payload signing.
  Mitigation: docs keep signed bundles/artifact refs as deferred production
  work; v1 improves portability without claiming final custody semantics.

## Open Questions

No product question blocks this slice. The next implementation choice is whether
to move package/memory bootstrap first to git/object refs, or to migrate the
remaining Host deep runtime detail APIs to observation-backed projections.
