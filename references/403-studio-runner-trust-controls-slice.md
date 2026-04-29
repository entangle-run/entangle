# Studio Runner Trust Controls Slice

## Current Repo Truth

Host already exposes runner registry trust and revoke mutations through
`POST /v1/runners/{runnerId}/trust` and
`POST /v1/runners/{runnerId}/revoke`. The shared host client and CLI already
consume those surfaces. Studio's Federation panel showed projected runner
counts and used trusted runners as assignment targets, but it did not let an
operator trust a pending runner or revoke a runner from the visual control
room.

## Target Model

Studio should be a real graph-admin surface for runner admission. It must let
an operator inspect projected runner rows, trust pending or revoked runners,
and revoke pending or trusted runners through the same Host boundary used by
the CLI.

## Impacted Modules And Files

- `apps/studio/src/App.tsx`
- `apps/studio/src/federation-inspection.ts`
- `apps/studio/src/federation-inspection.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add Studio helper functions for sorting, formatting, and action eligibility
  over projected runner rows.
- Render a Runner Registry block in the Federation panel.
- Wire Trust/Revoke buttons through `client.trustRunner` and
  `client.revokeRunner`.
- Refresh Host projection after successful mutations and keep errors/status
  visible in Studio.

## Tests Required

Implemented and passed:

- `pnpm --filter @entangle/studio test`
- `pnpm --filter @entangle/studio typecheck`
- `pnpm --filter @entangle/studio lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit from the implementation checklist: no
  relevant hits

## Migration And Compatibility Notes

This is an additive Studio operator surface. It does not change Host runner
registry contracts, runner registration, assignment semantics, or CLI
behavior. CLI remains the headless path for the same trust/revoke mutations.

## Risks And Mitigations

- Risk: Studio could appear to own runner trust state.
  Mitigation: Studio only calls Host APIs and refreshes Host projection; it
  does not create a client-side runner registry.
- Risk: revoking an assigned runner can interrupt active work.
  Mitigation: the existing Host contract remains the authority for revoke
  semantics; Studio exposes the same operation without inventing separate
  behavior.

## Open Questions

- Closed by `404-studio-runner-registry-detail-slice.md`: Studio now joins
  projected runner rows with full Host runner registry detail for liveness,
  heartbeat, runtime kind, engine kind, and capacity summaries.
