# User Client Wiki Patch-Set UI Slice

## Current Repo Truth

The running User Client had a participant JSON helper and Human Interface
Runtime endpoint for visible wiki patch-sets, and the process-runner smoke
proved that path end to end. The React User Client UI still exposed only the
single-page wiki update action, so an operator or human node user needed an
external JSON caller to exercise the patch-set request path.

## Target Model

The running User Client should expose the participant patch-set capability in
the same graph-scoped wiki resource panel that already handles page preview,
draft loading, single-page updates, and local draft diffs. A user should be
able to queue the current page draft as a patch-set page, see the queued pages,
remove queued entries, and request the patch-set through the node's Human
Interface Runtime.

## Impacted Modules And Files

- `apps/user-client/src/App.tsx`
- `apps/user-client/src/styles.css`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Import the `patchWikiPages` runtime API helper into the React app.
- Add a small in-memory patch-set queue to the wiki resource panel.
- Queue the current wiki page draft with path, mode, content, and optional base
  SHA-256.
- Allow queued pages to be removed before request.
- Submit queued pages through `/api/wiki/pages/patch-set` and refresh state
  after Host accepts the command request.
- Add CSS for the queued patch-set list without changing the runtime protocol.

## Tests Required

- User Client typecheck.
- User Client lint.
- User Client production build.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

This is an additive browser feature. Existing single-page updates, local draft
diff preview, wiki publication, and JSON API behavior remain unchanged.

## Risks And Mitigations

- Risk: the UI lets a user queue a path that is not visible in the selected
  conversation.
  Mitigation: the Human Interface Runtime still performs the authoritative
  per-page conversation visibility check before forwarding to Host.
- Risk: the first UI only queues drafts from the current page form rather than
  providing a full collaborative multi-page merge editor.
  Mitigation: this gives a working browser path over the protocol while leaving
  richer merge-product behavior as a focused future UI slice.

## Open Questions

Richer collaborative merge UI should derive multi-page drafts from several
visible pages, show per-page diffs side by side, and guide stale-base recovery.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/user-client typecheck`
- `pnpm --filter @entangle/user-client lint`
- `pnpm --filter @entangle/user-client build`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit; no new relevant hits
