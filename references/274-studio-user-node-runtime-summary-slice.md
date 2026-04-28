# Studio User Node Runtime Summary Slice

## Current Repo Truth

Studio is the operator/admin surface. It already loads Host projection, User
Node identities, projected User Node conversations, and runtime projection
records. It also links to projected User Client URLs when shown in the runtime
projection list.

Before this slice, the User Node identity list did not combine identity,
runtime placement, client URL, conversation counts, unread counts, and pending
approval counts into a single operator summary.

## Target Model

Studio should give administrators enough User Node runtime visibility to
supervise placement and health without becoming the participant chat client:

- selected User Node identity;
- runtime observed state;
- assigned runner;
- User Client URL;
- conversation count;
- active conversation count;
- pending approval count;
- unread count.

## Impacted Modules/Files

- `apps/studio/src/federation-inspection.ts`
- `apps/studio/src/federation-inspection.test.ts`
- `apps/studio/src/App.tsx`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/258-human-interface-runtime-realignment-plan.md`
- `references/README.md`
- `README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- added a Studio helper that joins User Node identity records with runtime
  projection and User Node conversation projection;
- added operator-oriented User Node runtime summary formatting;
- updated the Studio overview User Node list to show runtime state, runner,
  client URL link, conversation counts, active counts, pending approval counts,
  unread counts, gateway count, and public-key prefix;
- covered helper behavior with Studio tests.

Deferred:

- a dedicated Human Interface Runtime detail panel;
- transport health and per-User-Client UI health observations;
- Studio controls for assigning/reassigning User Nodes.

## Tests Required

- `pnpm --filter @entangle/studio typecheck`
- `pnpm --filter @entangle/studio test -- federation-inspection.test.ts`
- `pnpm --filter @entangle/studio lint`
- `node --check scripts/smoke-federated-process-runner.mjs`
- `git diff --check`

Verification record:

- Studio typecheck passed;
- focused Studio tests passed;
- Studio lint passed;
- process smoke syntax check passed;
- `git diff --check` passed.

## Migration/Compatibility Notes

This is additive. Existing runtime projection and User Node identity data are
unchanged.

## Risks And Mitigations

- Risk: Studio drifts toward becoming the user chat surface.
  Mitigation: the summary remains read-only and links out to the User Client
  owned by the running Human Interface Runtime.
- Risk: counts lag behind live relay events.
  Mitigation: counts are explicitly projection-derived and inherit projection
  freshness semantics.

## Open Questions

Should Studio show a separate Human Interface Runtime panel under runtime
details, or should User Node runtime health remain in the federation overview
until dedicated `human_interface.status` observations exist?
