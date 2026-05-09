# Fake OpenAI Scripted Provider Slice

## Current Repo Truth

Entangle already has a deterministic OpenAI-compatible development provider in
`scripts/fake-openai-compatible-provider.mjs` and an executable smoke in
`scripts/smoke-fake-openai-compatible-provider.mjs`. Before this slice, the
provider could validate bearer auth, list models, return fixed chat and
Responses API text, stream deterministic frames, and optionally request one
chat-completions tool call before completing after a `tool` result message.

That covered the provider boundary without live model credentials, but it did
not let operators or tests rehearse ordered multi-step provider behavior beyond
the single built-in tool-call round.

## Target Model

The fake provider should be useful as a deterministic scenario fixture. A
caller can pass a local JSON script that defines ordered non-streaming
chat-completions and Responses API outputs. Each chat step can either emit
assistant text or one function tool call. After the script is exhausted, the
provider falls back to the existing deterministic default behavior.

This remains a no-credential plumbing harness. It does not validate real model
quality, provider scheduling, or live OpenAI behavior.

## Impacted Modules And Files

- `scripts/fake-openai-compatible-provider.mjs`
- `scripts/smoke-fake-openai-compatible-provider.mjs`
- `README.md`
- `references/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `--script <path>` to the fake provider.
- Load and validate script JSON before listening.
- Support `chatCompletions` entries with either `content` or `toolCall`.
- Support `responses` entries with `content`.
- Keep `--script` mutually exclusive with `--tool-call-on-first-request` so
  scenario order is not ambiguous.
- Extend the provider smoke to write a temporary script, start the provider
  with `--script`, and verify text, tool-call, final text, and Responses API
  scripted steps.
- Document the script format and no-credential limitation.

## Tests Required

- Red/green `node scripts/smoke-fake-openai-compatible-provider.mjs`.
- `node scripts/fake-openai-compatible-provider.mjs --help`.
- Script syntax checks for the fake provider and smoke.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

Existing fake-provider invocations are unchanged. The script feature is
opt-in. Existing `--tool-call-on-first-request` behavior remains available for
the built-in single tool-call scenario, but cannot be combined with `--script`.

## Risks And Mitigations

- Risk: scripted provider behavior is mistaken for live model coverage.
  Mitigation: docs continue to frame it as deterministic no-credential
  plumbing and scenario coverage.
- Risk: malformed scripts fail after startup.
  Mitigation: the provider validates script shape before listening and exits
  with a focused error.
- Risk: tool-call sequencing becomes ambiguous.
  Mitigation: scripted mode owns the ordered response sequence and rejects the
  older built-in tool-call flag when both are requested.

## Open Questions

`references/588-fake-openai-scripted-error-slice.md` adds deterministic
non-streaming scripted error responses. Future work can decide whether scripted
streaming frames or mid-stream error scenarios are needed.

## Verification

Completed in this slice:

- `node scripts/smoke-fake-openai-compatible-provider.mjs`
- `node scripts/fake-openai-compatible-provider.mjs --help`

The final slice audit also runs syntax checks, product naming, whitespace,
changed-diff marker checks, and `git diff` review before commit.
