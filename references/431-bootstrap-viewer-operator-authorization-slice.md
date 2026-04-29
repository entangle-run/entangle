# Bootstrap Viewer Operator Authorization Slice

## Current Repo Truth

Host already supports an optional bootstrap operator bearer token through
`ENTANGLE_HOST_OPERATOR_TOKEN`. Host status reports the configured bootstrap
operator id and role, and protected mutation requests are recorded as
`host.operator_request.completed` audit events. Before this slice,
`ENTANGLE_HOST_OPERATOR_ROLE` was visible but not enforced.

## Target Model

This is not final production RBAC, but the bootstrap boundary should stop
advertising a role that has no behavioral effect. A `viewer` bootstrap operator
should be able to inspect Host state but should not be able to mutate Host
state. Existing `operator`, `admin`, and `owner` bootstrap deployments should
remain behaviorally compatible until a richer principal and policy model is
implemented.

## Impacted Modules And Files

- `packages/types/src/host-api/error.ts`
- `packages/types/src/host-api/events.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/index.ts`
- `services/host/src/index.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/410-bootstrap-operator-security-status-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes

- Added `forbidden` as a canonical Host error code.
- Added `operatorRole` to `host.operator_request.completed` audit events.
- Host now normalizes `ENTANGLE_HOST_OPERATOR_ROLE` inside the HTTP boundary,
  using the same `operatorRoleSchema` as Host status.
- Token-protected Hosts now reject non-read requests from `viewer` operators
  with a structured 403 response.
- `GET`, `HEAD`, and `OPTIONS` remain allowed for `viewer`.
- `operator`, `admin`, and `owner` continue to be allowed for all existing Host
  API requests.
- Host tests now prove:
  - missing/invalid tokens still fail with 401;
  - authorized viewer reads still succeed;
  - authorized viewer mutations fail with 403;
  - denied mutations are still recorded in the audit stream with
    `operatorRole: "viewer"`.

## Tests Required

Implemented and passed for this slice:

- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/host test`
- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/types lint`
- `pnpm --filter @entangle/host lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit from the implementation checklist.

## Migration And Compatibility Notes

This is a behavior change only for token-protected Hosts that explicitly set
`ENTANGLE_HOST_OPERATOR_ROLE=viewer`. Those operators become read-only. The
default normalized role remains `operator`, so existing token-protected
development and proof flows keep their current mutation behavior.

`host.operator_request.completed` now requires `operatorRole`; in-repo
producers and fixtures have been updated. Entangle has not shipped a stable
external Host event API, so this contract tightening is acceptable.

## Risks And Mitigations

- Risk: operators expect `viewer` to behave like the previous informal role.
  Mitigation: only explicit `viewer` deployments change, and the 403 response
  is structured and audited.
- Risk: this is mistaken for final authorization.
  Mitigation: docs keep this scoped to bootstrap authorization. Production
  identity still needs durable principals, sessions/tokens, policy-backed
  roles, and finer-grained permission checks.

## Open Questions

- Which Host mutations should be split first when moving beyond coarse viewer
  read-only enforcement: authority import/export, graph/catalog mutation,
  runner trust, assignment control, or runtime commands?
