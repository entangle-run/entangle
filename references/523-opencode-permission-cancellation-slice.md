# OpenCode Permission Cancellation Slice

## Current Repo Truth

The attached OpenCode server adapter already supports health probing, session
creation, event-stream consumption, session continuity, permission request
bridging through Entangle approval callbacks, and permission replies back to
OpenCode.

Before this slice, a cancellation signal could stop the OpenCode process path
and OpenCode HTTP/event requests, but the adapter did not race a pending
Entangle permission approval callback against the same cancellation signal.
That left a possible stuck turn while the engine was waiting for a human or
policy approval response.

## Target Model

An Entangle node running OpenCode must be cancellable while it is waiting for
permission approval. Session cancellation should terminate the in-flight
engine turn rather than waiting indefinitely for a permission decision that may
no longer be relevant.

The adapter still keeps Entangle as the authority for policy, approval
routing, and signed User Node decisions. This slice only makes the adapter
abort-aware while awaiting that authority path.

## Impacted Modules And Files

- `services/runner/src/opencode-engine.ts`
- `services/runner/src/opencode-engine.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add an abort-aware permission-response wait helper for attached OpenCode
  permission requests.
- Throw a typed `AgentEngineExecutionError` with `classification:
  "cancelled"` when the turn aborts while waiting for an Entangle permission
  approval callback.
- Preserve existing successful approval/rejection behavior and reply only when
  a permission response is actually received.
- Add an adapter test where the permission callback never resolves, the turn
  is aborted, and no OpenCode permission reply is sent.

## Tests Required

- OpenCode adapter tests.
- Runner typecheck.
- Runner lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

No schema migration is required. This is an adapter behavior hardening change.
Existing successful permission approval and rejection flows are unchanged.

## Risks And Mitigations

- Risk: a late approval response could attempt to reply after cancellation.
  Mitigation: cancellation rejects the adapter wait path and the test asserts
  no OpenCode permission reply is sent after aborting the turn.
- Risk: cancellation classification could be hidden as provider failure.
  Mitigation: the helper throws the shared engine execution error with the
  `cancelled` classification, and the adapter test asserts that classification.

## Open Questions

Live OpenCode/provider validation remains manual/operator work because this
repository does not carry real model-provider credentials.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/runner test -- src/opencode-engine.test.ts`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit over runner and updated docs
