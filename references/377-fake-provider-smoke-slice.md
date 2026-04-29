# Fake Provider Smoke Slice

## Current Repo Truth

Entangle now has a deterministic OpenAI-compatible development provider
started by `pnpm ops:fake-openai-provider`. It is useful for no-credential
manual provider-plumbing tests, but before this slice the server did not have a
dedicated automated smoke command.

## Target Model

The no-LLM provider harness should be continuously checkable. Operators and
future CI should be able to validate the fake provider's health, auth, models,
non-streaming chat-completions, streaming chat-completions, and streaming
Responses API routes with one command.

## Impacted Modules/Files

- `scripts/smoke-fake-openai-compatible-provider.mjs`
- `package.json`
- `README.md`
- `deploy/federated-dev/README.md`
- `references/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `pnpm ops:smoke-fake-openai-provider`.
- Start the deterministic provider on an ephemeral port.
- Verify `/health`, `/v1/models`, `/v1/chat/completions`,
  streaming `/v1/chat/completions`, and streaming `/v1/responses`.
- Stop the spawned provider process deterministically after the smoke.

## Tests Required

- `pnpm ops:smoke-fake-openai-provider`
- `pnpm lint`
- `pnpm typecheck`

## Migration/Compatibility Notes

No runtime contracts change. The smoke is an operator/developer verification
tool and does not replace live provider validation.

## Risks And Mitigations

- Risk: the provider process is left running after smoke failure.
  Mitigation: the smoke stops the child process in a `finally` block and uses
  `SIGKILL` if graceful termination does not complete.
- Risk: the smoke proves fake behavior only.
  Mitigation: docs keep live provider credentials as manual/operator
  validation.

## Open Questions

- Should this smoke become part of the default `pnpm verify` gate after the
  scripts directory has full lint/typecheck coverage?
