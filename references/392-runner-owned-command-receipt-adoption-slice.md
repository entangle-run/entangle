# Runner-Owned Command Receipt Adoption Slice

## Current Repo Truth

`391-runtime-command-receipt-projection-slice.md` introduced the generic
signed command receipt protocol and implemented it first for
`runtime.artifact.propose_source_change`. Other runner-owned command families
still returned completion only as domain evidence:

- artifact restore completion appeared through `artifact.ref` retrieval
  projection;
- source-history publication appeared through `source_history.ref` and
  `artifact.ref` publication projection;
- source-history replay appeared through `source_history.replayed`;
- wiki publication appeared through `artifact.ref` publication projection.

That evidence remains authoritative, but it did not explicitly close the Host
command id.

## Target Model

Runner-owned commands that already have concrete result references should emit
both:

- domain evidence proving what changed or was published;
- `runtime.command.receipt` evidence proving the signed command completed or
  failed.

The command receipt should remain lightweight. It carries correlation ids and
status, not large payloads or replacement source/artifact data.

## Impacted Modules And Files

- `services/runner/src/join-service.ts`
- `services/runner/src/index.test.ts`
- `services/host/scripts/federated-process-runner-smoke.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/391-runtime-command-receipt-projection-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Emit received/completed/failed `runtime.command.receipt` observations for
  `runtime.artifact.restore`.
- Emit received/completed/failed command receipts for
  `runtime.source_history.publish`.
- Emit received/completed/failed command receipts for
  `runtime.source_history.replay`.
- Emit received/completed/failed command receipts for `runtime.wiki.publish`.
- Keep existing domain observations unchanged.
- Extend the process-runner smoke to wait for completed restore,
  source-history publication, and wiki publication command receipts.
- Keep lifecycle start/stop/restart and session cancellation out of this slice;
  those commands need a separate lifecycle-command completion semantics pass.

## Tests Required

Implemented and passed:

- `pnpm --filter @entangle/runner test -- --runInBand`
- `pnpm typecheck`
- `pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777`
- `pnpm test`
- `pnpm lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- `git diff -U0 | rg "^\\+.*(Entangle Local|entangle-local|runtimeProfile.*local|contextPath|runtimeRoot|shared volume|effective-runtime-context|Docker)"`

The added-line local-assumption audit produced no hits.

## Migration And Compatibility Notes

This is additive. Existing consumers can continue to follow artifact,
source-history, replay, and wiki domain evidence. New consumers can close the
command loop through `runtimeCommandReceipts`.

The command receipt does not claim that artifact/source/wiki content is
present in Nostr. It only links the Host command id to the runner-owned result
ids already carried by domain evidence.

## Risks And Mitigations

- Risk: command receipt status and domain evidence diverge.
  Mitigation: receipts are emitted only after the existing runner-owned command
  handler returns or throws, and the process smoke waits for both domain
  evidence and completed command receipts.
- Risk: lifecycle commands become visually less complete than artifact/source
  commands.
  Mitigation: lifecycle commands already have assignment/runtime receipts; a
  later slice should decide whether they need command receipts or whether the
  assignment timeline remains the canonical lifecycle command model.

## Open Questions

- Should `runtime.session.cancel` emit a completed command receipt once the
  cancellation record is applied, or should cancellation completion remain a
  session lifecycle observation?
- Should lifecycle start/stop/restart command ids appear in the assignment
  timeline as command receipts, or should lifecycle receipts be extended with
  command correlation fields?
