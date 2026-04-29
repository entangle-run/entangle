# User Client Artifact Visibility Boundary Slice

## Current Repo Truth

The Human Interface Runtime can proxy User Client artifact preview,
history, and diff requests through Host artifact read APIs. Before this slice,
those runtime-local JSON routes accepted `nodeId` and `artifactId` without
requiring the selected User Node conversation that made the artifact visible to
the human participant.

## Target Model

The running User Client is a human-node surface, not an operator surface. It
may inspect artifact evidence that is visible through that User Node's
conversation history, while Host and Studio remain the global operator
inspection surfaces.

## Impacted Modules/Files

- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `apps/user-client/src/runtime-api.ts`
- `apps/user-client/src/runtime-api.test.ts`
- `apps/user-client/src/App.tsx`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Require `conversationId` on runtime-local artifact preview/history/diff
  requests from the dedicated User Client.
- Verify the artifact ref appears in the selected User Node conversation before
  proxying to Host artifact read APIs.
- Keep the HTML fallback preview page on the same visibility boundary.
- Preserve read-only artifact inspection behavior after the visibility check.

## Tests Required

- `pnpm --filter @entangle/user-client test -- src/runtime-api.test.ts`
- `pnpm --filter @entangle/runner test -- src/index.test.ts`
- `pnpm --filter @entangle/user-client typecheck`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm verify`

## Migration/Compatibility Notes

This intentionally changes the runtime-local User Client artifact API shape:
artifact preview/history/diff now require `conversationId`. The repository is
pre-release, and the stricter boundary is preferable to preserving an
over-broad browser-facing read route.

## Risks And Mitigations

- Risk: a valid artifact is not inspectable when the conversation id is absent.
  Mitigation: all first-party User Client artifact actions originate from a
  concrete message and now send that message's conversation id.
- Risk: artifact read failures become less convenient for manual probing.
  Mitigation: global artifact inspection remains available through Host, CLI,
  and Studio operator surfaces.
- Risk: the visibility check depends on Host conversation availability.
  Mitigation: unavailable conversation state returns an explicit error instead
  of falling through to a global runtime artifact read.

## Open Questions

- Should source-change diff preview receive the same explicit conversation
  visibility gate, or is the existing review-message requirement sufficient for
  the current User Client workflow?
