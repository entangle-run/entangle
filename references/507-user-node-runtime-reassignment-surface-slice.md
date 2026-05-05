# User Node Runtime Reassignment Surface Slice

## Current Repo Truth

Before this slice, Host could already assign any active graph node to a trusted
runner through the generic runtime assignment API, and Studio had a generic
assignment form. User Nodes appeared in that generic node picker because the
graph can contain `nodeKind: "user"`.

The operator workflow was still indirect:

- CLI users had to know that `entangle nodes assign <nodeId>` also applied to
  User Nodes.
- revoking an existing User Node assignment before offering a replacement
  required separate manual `assignments list` and `assignments revoke` calls.
- Studio showed User Node runtime summaries but did not let an operator start
  from that row and prepare the assignment form or inspect the current
  assignment timeline.

## Target Model

User Node runtime placement must stay Host-authority mediated. Studio and CLI
may make the workflow easier, but they must not bypass:

- Host assignment APIs;
- trusted runner compatibility checks;
- assignment lifecycle and revocation events;
- Host projection and assignment timeline read models.

The immediate target is an operator convenience layer, not a participant-owned
runner scheduler.

## Impacted Modules/Files

- `apps/cli/src/index.ts`
- `apps/cli/src/user-node-output.ts`
- `apps/cli/src/user-node-output.test.ts`
- `apps/studio/src/App.tsx`
- `apps/studio/src/federation-inspection.ts`
- `apps/studio/src/federation-inspection.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `entangle user-nodes assign <nodeId> --runner <runnerId>` as a
  User Node-focused wrapper over `client.offerAssignment`.
- Validate the selected User Node through Host's User Node identity list before
  offering the assignment.
- Add optional `--revoke-existing` behavior that revokes current
  offered/accepted/active assignments for that User Node before offering the
  replacement.
- Keep summary output aligned with existing assignment and User Node summary
  helpers.
- Include projected assignment id in Studio User Node runtime summaries.
- Add Studio row actions to prepare the Host assignment form for a User Node and
  open its assignment timeline when projected.

## Tests Required

- CLI helper test for selecting current User Node assignments that are safe to
  revoke during explicit reassignment.
- Studio federation helper test for User Node assignment id projection and
  formatting.
- CLI typecheck and lint.
- Studio typecheck and lint.
- product-naming guard and diff whitespace guard.

## Migration/Compatibility Notes

No data migration is required. The existing generic assignment commands remain
valid. The new User Node command is a convenience layer over the same Host API
and is compatible with existing runner assignment behavior.

## Risks And Mitigations

- Risk: operators accidentally revoke a running User Client.
  Mitigation: existing assignment revocation remains explicit; the convenience
  command only revokes when `--revoke-existing` is passed.
- Risk: Studio appears to let User Nodes schedule themselves.
  Mitigation: the row action only prepares the Host assignment form in Studio,
  which is the operator/admin console.
- Risk: CLI bypasses User Node existence checks.
  Mitigation: the command reads Host User Node identities before offering.

## Verification

Completed for this slice:

- `pnpm --filter @entangle/cli test -- user-node-output.test.ts`
- `pnpm --filter @entangle/studio test -- federation-inspection.test.ts`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli lint`
- `pnpm --filter @entangle/studio typecheck`
- `pnpm --filter @entangle/studio lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff audit for old local-only product/runtime markers

## Open Questions

Richer participant-aware reassignment can later add draining notices, scheduled
handoff windows, and User Client-visible placement change messages. This slice
does not require those decisions.
