# Human Runtime Fallback Wiki Controls Slice

## Current Repo Truth

The dedicated React User Client can request runner-owned wiki page updates and
visible wiki patch-sets through the Human Interface Runtime JSON API. The
fallback HTML Human Interface Runtime already renders wiki refs, participant
command receipts, stale-edit conflict summaries, approval controls,
source-change review controls, and artifact/source-history actions.

Before this slice, the fallback HTML page did not expose form controls for
wiki page updates or patch-set requests, even though the JSON routes existed.

## Target Model

Every running User Node should remain useful when the React bundle is not
available. The fallback HTML client should expose the same participant-owned
wiki mutation capability through simple forms that still route through Host as
signed runner-executed control commands with `requestedBy` set to the stable
User Node id.

## Impacted Modules And Files

- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Render fallback HTML wiki page update forms for visible `wiki_page`
  approval resources.
- Render a fallback HTML single-page patch-set request form for the same
  visible page.
- Prefill the form textarea from the bounded projected wiki preview when it is
  available.
- Add HTML form POST routes for `/wiki/pages` and `/wiki/pages/patch-set`.
- Reuse the existing selected-conversation visibility gate and expected-base
  hash derivation before forwarding to Host.
- Preserve `requestedBy` attribution as the stable User Node id.

## Tests Required

- Human Interface Runtime fallback HTML page assertions for the new wiki
  controls.
- Human Interface Runtime form POST assertions for both wiki page update and
  patch-set request forwarding.
- Runner targeted test suite.
- Runner typecheck.
- Runner lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

This is an additive fallback-surface change. It does not alter Host APIs,
control payload schemas, React User Client behavior, or runner-owned wiki
mutation semantics.

## Risks And Mitigations

- Risk: fallback forms bypass participant visibility rules. Mitigation: both
  routes call the same `resolveUserClientVisibleWikiPage` gate as the JSON
  API.
- Risk: stale updates lose optimistic concurrency protection. Mitigation: the
  route derives `expectedCurrentSha256` from visible projected page previews
  when the form leaves it blank.
- Risk: the fallback patch-set form suggests full multi-page editing. Mitigation:
  the fallback form sends a one-page patch-set over the real patch-set command
  path; richer multi-page HTML editing remains future UI work.

## Open Questions

Richer collaborative wiki merge UI can still add multi-page draft management,
side-by-side diffs, and conflict recovery. This slice keeps the fallback
client functionally aligned with the currently implemented protocol.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/runner exec vitest run --config ../../vitest.config.ts --environment node src/index.test.ts --pool=forks --maxWorkers=1 --testTimeout=30000 -t "serves User Node inbox state" --reporter verbose`
- `pnpm --filter @entangle/runner test -- src/index.test.ts`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit over changed code and docs
