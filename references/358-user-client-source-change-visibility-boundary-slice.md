# User Client Source Change Visibility Boundary Slice

## Current Repo Truth

The dedicated User Client and Human Interface Runtime already expose
runtime-local JSON routes for source-change diff preview and source-candidate
review. Before this slice, the diff route accepted only `nodeId` and
`candidateId`, and the review route trusted the submitted candidate context
once required fields were present.

## Target Model

Source-change review is a User Node action triggered by a visible approval
request, not a general runtime operator read. The Human Interface Runtime must
verify that the selected User Node conversation contains an inbound
`approval.request` for the requested source-change candidate before returning
diff evidence or publishing a `source_change.review` message.

## Impacted Modules/Files

- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `apps/user-client/src/runtime-api.ts`
- `apps/user-client/src/runtime-api.test.ts`
- `apps/user-client/src/App.tsx`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `references/295-user-client-review-json-actions-slice.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Require `conversationId` for User Client source-change diff requests.
- Verify the selected conversation contains an inbound approval request whose
  resource is the requested `source_change_candidate` from the requested peer
  node.
- Apply the same visibility check before publishing JSON or HTML
  source-candidate review messages.
- Keep Host/CLI/Studio operator inspection separate from the User Client
  participant surface.

## Tests Required

- `pnpm --filter @entangle/user-client test -- src/runtime-api.test.ts`
- `pnpm --filter @entangle/runner test -- src/index.test.ts`
- `pnpm --filter @entangle/user-client typecheck`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm verify`

## Migration/Compatibility Notes

This intentionally changes the runtime-local User Client source diff API shape:
`conversationId` is now required. The project is pre-release, and the stricter
participant boundary is more important than preserving unscoped local probing.

## Risks And Mitigations

- Risk: a valid source-change candidate is hidden when the approval request is
  missing from Host conversation projection.
  Mitigation: the User Client flow is approval-request-driven, and unavailable
  conversation state returns a clear error instead of falling through to a
  broad runtime read.
- Risk: extra Host conversation reads add latency.
  Mitigation: this only gates user-triggered review actions and keeps the
  authority boundary explicit.

## Open Questions

- Should Host issue a dedicated participant-scoped review token or capability
  in future protocol versions instead of checking conversation history at
  request time?
