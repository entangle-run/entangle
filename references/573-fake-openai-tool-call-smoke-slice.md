# Fake OpenAI Tool Call Smoke Slice

## Current Repo Truth

Entangle already includes a deterministic OpenAI-compatible development
provider at `scripts/fake-openai-compatible-provider.mjs` and a smoke script at
`scripts/smoke-fake-openai-compatible-provider.mjs`. Before this slice the
provider could return deterministic chat-completion and Responses API text, but
the operator-started provider could not simulate a chat-completions `tool_calls`
round.

The package-level `@entangle/agent-engine` tests already prove OpenAI-compatible
tool loops with an in-process test fixture. The root fake provider smoke was
the missing no-credential executable path for manual and operator-facing
provider wiring checks.

## Target Model

The deterministic provider should cover the smallest useful external-provider
agentic behavior without live model credentials: a first chat-completions
response can request one tool call, and a second request containing a `tool`
message can complete with the deterministic assistant response. This keeps
manual provider plumbing closer to real OpenAI-compatible tool-loop behavior.

## Impacted Modules And Files

- `scripts/fake-openai-compatible-provider.mjs`
- `scripts/smoke-fake-openai-compatible-provider.mjs`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `--tool-call-on-first-request` to the fake provider.
- Add configurable `--tool-call-name`, `--tool-call-id`, and
  `--tool-call-arguments` options.
- When tool-call mode is enabled and the incoming chat-completions request
  declares tools without a prior `tool` result message, return one deterministic
  `tool_calls` response.
- Keep the second request with a `tool` result message on the normal
  deterministic assistant response path.
- Extend the smoke script to verify the first tool-call response and second
  tool-result completion response.

## Tests Required

- Red/green `node scripts/smoke-fake-openai-compatible-provider.mjs`.
- Fake provider help output check.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

The new provider behavior is opt-in. Existing fake-provider invocations keep
returning deterministic text responses unless `--tool-call-on-first-request` is
provided.

## Risks And Mitigations

- Risk: the fake provider is mistaken for full OpenAI behavior. Mitigation: the
  docs continue to call it deterministic no-credential plumbing coverage, not a
  real model-behavior validator.
- Risk: tool-call mode loops forever. Mitigation: the provider returns a tool
  call only when the request declares tools and has no existing `tool` result
  message.

## Open Questions

Future work can add scripted multi-step provider responses if Entangle needs
scenario fixtures that go beyond a single deterministic tool-call round.

## Verification

Completed in this slice:

- `node scripts/smoke-fake-openai-compatible-provider.mjs`
- `node scripts/fake-openai-compatible-provider.mjs --help`

The final slice audit also runs product naming, whitespace, changed-diff marker
checks, and `git diff` review before commit.
