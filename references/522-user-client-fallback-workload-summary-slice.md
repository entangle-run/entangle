# User Client Fallback Workload Summary Slice

## Current Repo Truth

The dedicated React User Client now renders a compact participant Workload
summary from the Human Interface Runtime JSON state. The Human Interface
Runtime also serves a built-in fallback HTML User Client when no static bundle
is configured or available.

Before this slice, the fallback HTML path showed runtime status, conversations,
messages, visible work references, and command receipts, but it did not show
the same workload rollup as the React client.

## Target Model

The running User Node client should remain useful even in minimal deployments
that rely on the runtime-served fallback page. The React and fallback clients
should expose the same participant workload categories from the same
projection-only state: conversations, open work, unread messages, pending
approvals, pending source reviews, participant command receipts,
source-history refs, wiki refs, and reachable targets.

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

- Add fallback-side workload summary helpers in the Human Interface Runtime.
- Render a Workload section in the fallback HTML page.
- Count unique pending approval ids across projected conversations.
- Count open conversations, unread messages, pending source-change reviews,
  command receipt statuses, visible source-history refs, wiki refs, and
  reachable targets.
- Keep the fallback summary read-only and derived only from the existing User
  Client state model.

## Tests Required

- Runner User Client fallback HTML test asserting workload lines.
- Runner typecheck.
- Runner lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

No API or schema migration is required. The fallback page derives the summary
from the same state object already used to render runtime, conversation, wiki,
source, and receipt sections.

## Risks And Mitigations

- Risk: fallback and React summaries drift.
  Mitigation: both summaries use the same field-level rules and the runner
  fallback HTML test asserts the visible workload lines.
- Risk: the fallback page could imply operator authority.
  Mitigation: the Workload section is read-only; signed actions continue to use
  existing User Client message/review/publish routes.

## Open Questions

None for this slice.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/runner test -- src/index.test.ts`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit over runner and updated docs
