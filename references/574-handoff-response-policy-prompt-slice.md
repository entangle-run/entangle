# Handoff Response Policy Prompt Slice

## Current Repo Truth

Agent-engine turn requests already include an Entangle action contract prompt
part. The runtime schema already accepts handoff directives with
`responsePolicy`, and the runner validates emitted handoff directives against
graph routes, autonomy policy, allowed edge relations, and materialized peer
identity before publishing signed `task.handoff` messages.

Before this slice, the prompt's supported JSON shape showed only
`targetNodeId`, `summary`, and `includeArtifacts` for handoffs, so a coding
engine had no explicit prompt-level guidance for setting
`responseRequired`, `closeOnResult`, or `maxFollowups`.

## Target Model

Each coding node should understand the conversation lifecycle it can request
when delegating work. The model may propose a response policy, but Entangle
keeps authority: the runner still validates every directive and publishes only
policy-compliant signed messages.

## Impacted Modules And Files

- `services/runner/src/runtime-context.ts`
- `services/runner/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Extend the action-contract prompt's supported handoff shape with a compact
  `responsePolicy` example.
- Explain that omitting `responsePolicy` uses protocol defaults and including
  it is for delegated conversations that need a different lifecycle.
- Add a focused runner runtime-context test that fails when the response-policy
  shape is absent from the prompt.

## Tests Required

- Focused runner Vitest for runtime-context turn request construction.
- Runner typecheck.
- Focused runner ESLint for changed files.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

No schema or data migration is required. This is prompt-surface guidance for an
already supported directive field.

## Risks And Mitigations

- Risk: engines overuse custom response policies. Mitigation: the prompt tells
  engines to omit the field for defaults, and runner-side validation remains
  authoritative.
- Risk: prompt guidance is mistaken for direct side-effect authority.
  Mitigation: the surrounding action-contract text still says Entangle
  validates directives before performing side effects.

## Open Questions

Future delegated-session work can add richer prompt examples for multi-peer
handoffs and result/close coordination once those workflows have more complete
runtime semantics.

## Verification

Completed in this slice:

- Runner focused Vitest for `loads runtime context`.

The final slice audit also runs runner typecheck, focused ESLint, product
naming, whitespace, changed-diff marker checks, and `git diff` review before
commit.
