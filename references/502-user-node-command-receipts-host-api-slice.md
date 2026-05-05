# User Node Command Receipts Host API Slice

## Current Repo Truth

Runtime command receipt projection records preserve optional `requestedBy`
attribution. The running User Client and `entangle user-nodes
command-receipts <nodeId>` both need the participant-scoped subset for one User
Node.

Before this slice, both surfaces had to consume the full Host projection and
filter locally. That worked functionally, but it made a participant surface
depend on an operator-sized read model when the Host can provide the scoped
read directly.

## Target Model

Host owns projection filtering for User Node participant views. User Client and
CLI can request only the command receipts requested by the selected User Node,
while operator surfaces keep the full projection and `entangle host
command-receipts` view.

## Impacted Modules And Files

- `packages/types/src/host-api/user-nodes.ts`
- `packages/host-client/src/index.ts`
- `services/host/src/index.ts`
- `services/host/src/state.ts`
- `services/runner/src/human-interface-runtime.ts`
- `apps/cli/src/index.ts`
- `apps/cli/src/user-node-output.ts`
- `apps/cli/src/user-node-output.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a typed `UserNodeCommandReceiptListResponse` contract.
- Add `GET /v1/user-nodes/:nodeId/command-receipts`.
- Return `404` when the User Node identity does not exist.
- Filter Host projection receipts to `requestedBy === nodeId` inside Host
  state and sort newest-first with deterministic command-id tie breaking.
- Add host-client support for the route.
- Move CLI User Node command receipt inspection to the scoped route.
- Move Human Interface Runtime User Client state assembly to the scoped route
  instead of filtering the full projection locally.

## Tests Required

- Type contract test for the new User Node command receipt response.
- Host route test for successful scoped retrieval and missing User Node `404`.
- host-client route parsing test.
- CLI participant receipt filtering test after the API input shift.
- Human Interface Runtime test proving it requests the scoped Host route.
- Targeted typecheck and lint for changed packages.

## Migration And Compatibility Notes

This is an additive Host API route and does not remove the full Host
projection. Existing operator surfaces remain compatible.

Older unattributed command receipts still remain visible through operator
projection surfaces. Participant-scoped routes intentionally return only
receipts with `requestedBy` matching the User Node id.

## Risks And Mitigations

- Risk: Host, CLI, and User Client filtering semantics drift.
  Mitigation: Host performs requester filtering once, and client helpers keep a
  defensive requester check before applying optional local presentation filters.
- Risk: the running User Client becomes noisy if the Host route is unavailable.
  Mitigation: Human Interface Runtime reports the scoped-route failure in User
  Client state rather than falling back silently to an unscoped projection.

## Open Questions

None for this slice.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/types test -- src/index.test.ts`
- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/types lint`
- `pnpm --filter @entangle/host test -- src/index.test.ts`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/host-client test -- src/index.test.ts`
- `pnpm --filter @entangle/host-client typecheck`
- `pnpm --filter @entangle/host-client lint`
- `pnpm --filter @entangle/cli test -- src/user-node-output.test.ts`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli lint`
- `pnpm --filter @entangle/runner test -- src/index.test.ts`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
