# Public Runtime API Path Boundary Slice

## Current Repo Truth

Before this slice, `runtimeInspectionResponseSchema` exposed `contextPath`.
That path is a Host-local debug/materialization detail pointing at an
`effective-runtime-context.json` file. It is useful inside the current Host
process while deep runtime APIs still read runner state, but it is not a
federated API contract.

Host state also used the same `RuntimeInspectionResponse` type internally, so
removing the field from the public schema directly would have broken remaining
filesystem-backed detail endpoints.

## Target Model

Public Host, host-client, Studio, and CLI runtime inspection contracts must not
expose materialized filesystem paths. Host may keep local adapter paths as
private process state until the remaining deep runtime readers are replaced by
projection-backed records.

## Impacted Modules/Files

- `packages/types/src/host-api/runtime.ts`
- `packages/types/src/index.test.ts`
- `packages/host-client/src/index.test.ts`
- `services/host/src/state.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/230-migration-from-local-assumptions-plan.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/252-federated-runtime-projection-surface-slice.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- removed `contextPath` from `runtimeInspectionResponseSchema`;
- introduced Host-only `RuntimeInspectionInternal` with optional
  `contextPath`;
- kept internal context loading on `RuntimeInspectionInternal`;
- normalized runtime recovery fingerprints through the public runtime schema so
  private internal fields cannot create duplicate recovery records;
- updated host-client and type fixtures so public API examples do not carry
  local path fields;
- added a schema assertion that legacy `contextPath` input is stripped from the
  public runtime response.

Deferred:

- removing `runtimeContextPath` from persisted observed runtime records;
- replacing `/v1/runtimes/:nodeId/context` with a projection/resource snapshot
  endpoint;
- migrating turns, approvals, artifact details, source history, memory pages,
  and wiki detail APIs away from Host reads of runner runtime state.

## Tests Required

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/types test -- index.test.ts`
- `pnpm --filter @entangle/host-client typecheck`
- `pnpm --filter @entangle/host-client test -- index.test.ts`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host test -- index.test.ts`
- `pnpm --filter @entangle/types lint`
- `pnpm --filter @entangle/host-client lint`
- `pnpm --filter @entangle/host lint`
- `pnpm typecheck`
- `pnpm lint`
- `git diff --check`
- local-assumption audit search.

Verification record:

- targeted typechecks for types, Host, and host-client passed;
- targeted tests for types, Host, and host-client passed after fixing the
  recovery fingerprint boundary;
- targeted lint for types, Host, and host-client passed;
- root typecheck passed;
- root lint passed;
- `git diff --check` passed;
- stale product marker search returned no matches for the old product marker
  set;
- local-assumption audit still finds expected runner state, Host internal
  context/debug, Docker adapter, and test-fixture usages.

## Migration/Compatibility Notes

Zod strips unknown object keys by default for this contract, so old clients or
fixtures that still send `contextPath` through mocked responses do not break the
parser. New public responses no longer advertise or preserve that field.

Internal Host code keeps `contextPath` as a private field until the remaining
deep runtime endpoints are moved to signed observations and projection records.

## Risks And Mitigations

- Risk: internal code accidentally fingerprints or persists private fields.
  Mitigation: runtime recovery comparison now normalizes through the public
  runtime schema before hashing.
- Risk: removing the field hides useful operator debugging too early.
  Mitigation: keep `/v1/runtimes/:nodeId/context` for now as an explicit
  privileged context inspection endpoint while public summary inspection stays
  path-free.
- Risk: filesystem-backed detail endpoints remain mistaken for canonical
  federation.
  Mitigation: the migration plan still tracks those endpoints as active
  projection-migration work.

## Open Questions

No product question blocks this slice. The next implementation decision is
whether to migrate artifact/source/wiki detail endpoints first or to replace the
runtime context inspection endpoint with Host-signed assignment/resource
snapshots.
