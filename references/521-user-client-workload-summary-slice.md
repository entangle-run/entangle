# User Client Workload Summary Slice

## Current Repo Truth

The dedicated User Client already consumes the Human Interface Runtime JSON
API and renders runtime status, conversation timelines, message actions,
visible artifact/source/wiki evidence, and participant-scoped runtime command
receipts for a running User Node.

Before this slice, the running User Client sidebar did not provide a compact
participant workload rollup. A human graph participant could inspect each
conversation and receipt list, but could not quickly see total conversations,
open work, unread messages, pending approvals, pending source reviews, command
receipt health, or visible knowledge/work references from one place.

## Target Model

Each running User Node should have a participant client that exposes the node's
own operational state clearly, without turning Studio into the participant
surface and without adding a new authority path. The workload panel is derived
from Host/Human Interface Runtime projection already scoped to the User Node.

The panel is read-only. It summarizes projected state; it does not sign
messages, approve work, command runners, or mutate Host state.

## Impacted Modules And Files

- `apps/user-client/src/runtime-api.ts`
- `apps/user-client/src/App.tsx`
- `apps/user-client/src/styles.css`
- `apps/user-client/src/runtime-api.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `summarizeUserClientWorkload` to derive participant workload counts from
  `UserClientState`.
- Count unique pending approval ids across projected conversations.
- Count open conversations, unread messages, pending source-change reviews,
  participant command receipt statuses, visible source-history refs, visible
  wiki refs, and reachable targets.
- Add `formatUserClientWorkloadLines` so React rendering and tests share the
  same compact presentation strings.
- Render a Workload sidebar card after runtime status in the dedicated User
  Client.
- Keep the panel projection-only and participant-scoped through the existing
  Human Interface Runtime state route.

## Tests Required

- User Client helper test for derived workload counts and formatted lines.
- User Client typecheck.
- User Client lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

No schema or API migration is required. The Human Interface Runtime state JSON
shape is unchanged; the new panel derives counts from fields the User Client
already receives.

Existing deployments and scripts that consume the state route are unaffected.

## Risks And Mitigations

- Risk: pending approvals can be attached to multiple projected conversations
  and be overcounted.
  Mitigation: the summary counts unique pending approval ids.
- Risk: the panel could imply stronger authority than it has.
  Mitigation: it is read-only and rendered from existing participant-scoped
  projection; all signed actions remain in the existing User Client action
  routes.
- Risk: receipt health could be mistaken for all runtime commands globally.
  Mitigation: the User Client state already uses the participant-scoped command
  receipt route, so the panel summarizes only this User Node's visible command
  receipts.

## Open Questions

None for this slice.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/user-client test -- runtime-api.test.ts`
- `pnpm --filter @entangle/user-client typecheck`
- `pnpm --filter @entangle/user-client lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit over User Client and updated docs
