# Fake OpenAI Scripted Error Slice

## Current Repo Truth

`references/585-fake-openai-scripted-provider-slice.md` added ordered
non-streaming script support to the deterministic OpenAI-compatible development
provider. Scripted chat-completions entries could emit assistant text or one
function tool call, and scripted Responses API entries could emit assistant
text.

Before this slice, the provider still could not emit deterministic HTTP error
responses from a script. Operators could test happy-path and tool-call
plumbing without live credentials, but not provider outage or rate-limit paths
through the same executable fixture.

## Target Model

The fake provider should support scripted non-streaming error steps for both
chat-completions and Responses API routes:

- each error step declares an HTTP `status` from 400 through 599;
- each error step declares an error `message`;
- optional `type` is preserved in the OpenAI-style error body;
- happy-path text and tool-call script entries keep their existing behavior.

This remains deterministic provider-boundary coverage, not real model-behavior
validation.

## Impacted Modules And Files

- `scripts/fake-openai-compatible-provider.mjs`
- `scripts/smoke-fake-openai-compatible-provider.mjs`
- `README.md`
- `references/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/585-fake-openai-scripted-provider-slice.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Extend the script schema with `error` entries.
- Validate scripted error status and message before the provider starts.
- Return configured HTTP status and OpenAI-style `error` body for chat and
  Responses API non-streaming routes.
- Extend the fake-provider smoke to verify scripted 429 and 503 responses.
- Update docs to show that scripted fixtures can include error steps.

## Tests Required

- Red/green `node scripts/smoke-fake-openai-compatible-provider.mjs`.
- Fake provider help output check.
- Script syntax checks for the fake provider and smoke.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

This is additive. Existing script files without `error` entries keep working,
and the built-in deterministic content and single tool-call modes are
unchanged.

## Risks And Mitigations

- Risk: scripted errors are mistaken for full provider-failure coverage.
  Mitigation: docs frame them as deterministic no-credential boundary fixtures.
- Risk: invalid HTTP status values produce confusing behavior. Mitigation:
  script validation rejects non-4xx/5xx statuses before listening.

## Open Questions

Future work can add scripted streaming error frames if Entangle needs to
exercise provider failures after a stream has already started.

## Verification

Completed in this slice:

- `node scripts/smoke-fake-openai-compatible-provider.mjs`
- `node scripts/fake-openai-compatible-provider.mjs --help`

The final slice audit also runs syntax checks, product naming, whitespace,
changed-diff marker checks, and `git diff` review before commit.
