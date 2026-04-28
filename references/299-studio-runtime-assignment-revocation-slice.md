# Studio Runtime Assignment Revocation Slice

## Current Repo Truth

Studio can now offer a runtime assignment from the Federation panel through the
Host assignment API. Host and CLI already support assignment revocation, and
Host projection contains assignment records with lifecycle status.

Studio did not yet show a focused assignment row list with revoke actions.

## Target Model

Studio should be able to operate the basic runtime assignment lifecycle through
Host: offer first, revoke next. Reassignment can remain an explicit revoke plus
offer workflow in v1.

## Impacted Modules/Files

- `apps/studio/src/App.tsx`
- `apps/studio/src/runtime-assignment-control.ts`
- `apps/studio/src/runtime-assignment-control.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `wiki/log.md`

## Concrete Changes Required

- Add Studio assignment projection sort/format helpers.
- Add revocability checks for active, accepted, offered, and revoking
  assignment projection records.
- Render projected assignment rows in the Federation panel with Host-backed
  revoke actions.

## Tests Required

- Studio helper tests covering assignment sort, formatting, and revocability.
- Studio typecheck, lint, tests, and build.

## Migration/Compatibility Notes

This is additive. Existing Host and CLI assignment commands are unchanged.

## Risks And Mitigations

- Risk: users mistake projection rows for direct runner state.
  Mitigation: rows are built from Host projection and revoke actions call Host,
  not runner endpoints.

## Open Questions

No open product question blocks this slice. A richer reassignment action can
later compose revoke plus offer with stronger conflict handling.
