# User Client Artifact Source Proposal Slice

## Current Repo Truth

Artifact source-change proposal control exists through Host API, host-client,
CLI, and Studio. The running User Client could inspect visible artifacts,
artifact preview/history/diff evidence, and source-change review surfaces, but
it could not ask for a visible artifact to become a runner-owned pending
source-change candidate.

## Target Model

A Human Interface Runtime should expose participant-safe artifact proposal
controls for the User Node it serves:

- the request must be scoped to an artifact visible in the selected User Node
  conversation;
- the local User Client JSON API and fallback HTML UI should both support it;
- the Human Interface Runtime should forward the request to the existing Host
  API rather than reading runner files or mutating source directly;
- Host still signs the control command and the assigned runner still creates
  only a `pending_review` source-change candidate;
- the request is tagged with `requestedBy` equal to the User Node id.

This is a gateway action, not source application. Review still flows through
source-change candidate review messages.

## Impacted Modules And Files

- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `apps/user-client/src/runtime-api.ts`
- `apps/user-client/src/runtime-api.test.ts`
- `apps/user-client/src/App.tsx`
- `apps/user-client/src/styles.css`
- `README.md`
- `references/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a runtime-local JSON route:
  `POST /api/artifacts/source-change-proposal`.
- Require `nodeId`, `artifactId`, and `conversationId`.
- Reuse the existing conversation visibility check before forwarding to Host.
- Forward to
  `POST /v1/runtimes/:nodeId/artifacts/:artifactId/source-change-proposal`
  with `requestedBy` set to the User Node id.
- Add fallback HTML form controls under visible artifact refs.
- Add dedicated User Client controls for target path, reason, overwrite, and
  proposal submission.
- Add user-client API helper coverage and Human Interface Runtime route
  coverage for both JSON and fallback HTML paths.

## Tests Required

Implemented and passed:

- `pnpm --filter @entangle/user-client test -- runtime-api.test.ts`
- `pnpm --filter @entangle/runner test -- index.test.ts`
- `pnpm --filter @entangle/user-client typecheck`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/user-client lint`
- `pnpm --filter @entangle/runner lint`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- `git diff -U0 | rg "^\\+.*(Entangle Local|entangle-local|runtimeProfile.*local|contextPath|runtimeRoot|shared volume|effective-runtime-context|Docker)"`

The added-line local-assumption audit produced no hits.

## Migration And Compatibility Notes

This is additive. Existing User Client artifact preview/history/diff,
source-change review, approval, and message publishing paths keep their
current behavior.

The route does not expose arbitrary Host artifact control. It requires
conversation-scoped artifact visibility before forwarding the request.

## Risks And Mitigations

- Risk: User Client artifact proposal becomes direct source mutation.
  Mitigation: the forwarded Host command only asks the assigned runner to
  create a `pending_review` candidate.
- Risk: users request proposals for artifacts outside their conversation.
  Mitigation: the route reuses the existing selected-conversation artifact
  visibility check and returns 400/403/502 errors before calling Host.
- Risk: the request loses user attribution.
  Mitigation: the gateway always sets `requestedBy` to the serving User Node
  id instead of trusting client-provided attribution.

## Open Questions

- Should the User Client also publish a signed User Node message that records
  the artifact proposal request in the conversation timeline?
- Should Host projection later correlate the request command id to the
  resulting source-change candidate id for immediate User Client feedback?
