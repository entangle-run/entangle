# Studio Assignment Related Navigation Slice

## Current Repo Truth

Studio already opens Host-backed assignment timeline drilldowns and joins Host
projection plus runner registry evidence into compact operational detail lines.
The related runtime inspector, runner registry, source-history, and runtime
command receipt surfaces were still visually separate, so an operator had to
manually find the matching node, runner, and receipt panels after inspecting an
assignment.

## Target Model

An assignment drilldown should act as a compact operator hub without becoming a
new source of truth. Studio should derive related navigation from the same Host
projection and runner registry read models:

- runtime node id and observed runtime availability;
- runner id and registry/projection availability;
- source-history count for the assigned node/runner;
- command-receipt count for the selected assignment.

Navigation remains a Studio-only presentation affordance. It selects or scrolls
to existing Host-backed panels and never commands runners directly.

## Impacted Modules And Files

- `apps/studio/src/App.tsx`
- `apps/studio/src/federation-inspection.ts`
- `apps/studio/src/federation-inspection.test.ts`
- `apps/studio/src/styles.css`
- `references/221-federated-runtime-redesign-index.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a Studio helper that derives assignment-related navigation labels and
  availability from Host projection plus optional runner registry detail.
- Add assignment drilldown buttons for runtime, runner, source-history, and
  command receipts.
- Select the related runtime before jumping to runtime or source-history
  panels.
- Add stable section anchors for the runner registry, runtime inspector,
  source-history panel, and command receipt list.
- Keep the navigation disabled when the related Host-projected evidence is not
  available.

## Tests Required

Implemented and passed:

- `pnpm --filter @entangle/studio test`
- `pnpm --filter @entangle/studio typecheck`
- `pnpm --filter @entangle/studio lint`

Broader checks for the slice:

- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit

## Migration And Compatibility Notes

This is an additive Studio presentation change. It does not alter Host APIs,
projection contracts, runner protocols, CLI behavior, persisted state, or
runtime assignment semantics.

## Risks And Mitigations

- Risk: navigation could imply Studio owns assignment or runner state.
  Mitigation: the helper only reads Host projection/registry data and the UI
  only selects or scrolls existing Host-backed panels.
- Risk: jumping to source history before runtime details finish refreshing
  could show a temporary empty state.
  Mitigation: source-history navigation first selects the runtime, and the
  existing selected-runtime refresh path remains the source of data.

## Open Questions

- A future UI pass could add stronger row highlighting in the destination
  panels for the selected assignment, runner, or command receipt.
