# User Client Command Receipt Detail Slice

## Current Repo Truth

The running User Client already receives runtime command receipts scoped to its
own User Node through `GET /v1/user-nodes/:nodeId/command-receipts`. The React
client and fallback HTML showed command id, command type, status, node, time,
and a few artifact/wiki/source ids.

Receipts now carry richer participant-relevant closure evidence:

- assignment id;
- artifact id;
- source-history id;
- source-change candidate id;
- proposal, restore, and replay ids;
- target path;
- wiki artifact id;
- wiki page path;
- wiki expected/previous/next SHA-256 values;
- session id.

## Target Model

Participant surfaces should expose bounded command closure evidence without
requiring a human User Node to switch to Studio or raw projection JSON for
basic status, hash-transition, and target-id inspection.

This remains a read-only participant view over Host projection. It does not
turn the User Client into an operator console.

## Impacted Modules/Files

- `apps/user-client/src/runtime-api.ts`
- `apps/user-client/src/runtime-api.test.ts`
- `apps/user-client/src/App.tsx`
- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/226-user-node-and-human-interface-runtime-spec.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a React User Client formatter for participant command receipt detail
  lines.
- Render those lines in the User Client command receipt cards.
- Mirror the same bounded detail in the Human Interface Runtime fallback HTML.
- Cover wiki hash transition formatting with a User Client helper test.
- Extend the runner User Client state/fallback fixture so command receipt hash
  details are exercised.

## Tests Required

- `pnpm --filter @entangle/user-client test`
- `pnpm --filter @entangle/user-client typecheck`
- `pnpm --filter @entangle/user-client lint`
- focused runner Human Interface Runtime test
- runner typecheck/lint when the fallback renderer changes
- product-naming guard and diff whitespace guard

## Migration/Compatibility Notes

No data migration is required. Existing command receipt projection records
without optional fields still render the previous bounded details.

## Risks And Mitigations

- Risk: User Client exposes too much operator detail.
  Mitigation: the formatter only renders bounded ids, paths, timestamps, and
  shortened hash values already present in the User Node-scoped receipt list.
- Risk: React and fallback HTML drift.
  Mitigation: both surfaces now use equivalent detail-line formatting and the
  runner fixture checks the fallback HTML hash detail.

## Verification

Completed for this slice:

- `pnpm --filter @entangle/user-client test`
- `pnpm --filter @entangle/user-client typecheck`
- `pnpm --filter @entangle/user-client lint`
- `pnpm --filter @entangle/runner test -- index.test.ts`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff audit for old local-only product/runtime markers

## Open Questions

No product question blocks this participant read-model improvement.
