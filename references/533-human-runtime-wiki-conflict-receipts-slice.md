# Human Runtime Wiki Conflict Receipts Slice

## Current Repo Truth

The React User Client and CLI summary output now make failed stale-edit wiki
page receipts explicit. The Human Interface Runtime fallback HTML page still
rendered only generic command receipt detail lines, even though it already
received the same participant-scoped receipt projection.

## Target Model

Every running User Node surface should expose the same stale-edit evidence.
The fallback HTML client should render a dedicated wiki conflict block for
failed `runtime.wiki.upsert_page` receipts whose expected hash differs from
the runner current hash.

## Impacted Modules And Files

- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add fallback-runtime conflict detection for wiki page command receipts.
- Render a compact HTML conflict block inside command receipt cards.
- Keep existing command receipt detail lines visible.
- Extend the Human Interface Runtime integration test with a failed stale-edit
  receipt and page assertions.

## Tests Required

- Runner targeted test for the Human Interface Runtime User Client path.
- Runner typecheck and lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

No protocol, Host API, or stored projection changes are required. The fallback
HTML renderer uses already-projected receipt fields.

## Risks And Mitigations

- Risk: fallback UI diverges from the React client. Mitigation: the same
  receipt condition is used: failed wiki upsert with different expected and
  previous hashes.
- Risk: command receipt cards become noisy. Mitigation: the block renders only
  for a stale-edit conflict and keeps details compact.

## Open Questions

The fallback client still has no merge/retry assistant for wiki conflicts.
That remains a future collaborative wiki workflow after conflict evidence is
visible across all participant surfaces.

## Verification

Planned for this slice:

- `pnpm --filter @entangle/runner test -- src/index.test.ts`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit over runner and updated docs
