# Conversation-Aware Working Context Memory Slice

## Current Repo Truth

Runner session snapshots already include bounded conversation records with peer
node ids, lifecycle status, initiator, response policy, follow-up counts, and
artifact counts. Model-guided memory synthesis already receives that snapshot
in its prompt, but the deterministic `working-context.md` page persisted only
session counts and approval-gate details.

Before this slice, a node could lose precise active-conversation route context
from durable working memory if the model summary did not restate it.

## Target Model

Every agent node should retain bounded, deterministic coordination context for
active and recently observed conversations. The node wiki should remember peer
routes and response expectations without copying peer message transcripts or
large logs.

## Impacted Modules/Files

- `services/runner/src/memory-synthesizer.ts`
- `services/runner/src/memory-synthesizer.test.ts`
- `README.md`
- `references/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a deterministic `Conversation Routes` section to `working-context.md`.
- Include active conversation ids and bounded per-conversation peer/status,
  initiator, response-policy, follow-up, artifact-count, and last-message-type
  metadata.
- Keep the section derived from typed runner session snapshots, not generated
  natural-language prose.
- Extend memory-synthesizer coverage for the new deterministic section.

## Tests Required

- `pnpm --filter @entangle/runner test`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner lint`
- broader root lint/typecheck before commit

## Migration/Compatibility Notes

No schema change is required. Existing session and conversation records already
carry the source fields. Existing working-context pages can be regenerated on a
future memory-synthesis pass.

## Risks And Mitigations

- Risk: conversation memory grows with large coordination sessions.
  Mitigation: rendering is bounded and stores metadata only, not transcripts.
- Risk: stale peer context becomes durable.
  Mitigation: the section is regenerated from the latest runner-owned session
  snapshot on each synthesis pass.

## Open Questions

- `494-owner-aware-session-memory-slice.md` adds an explicit active/inactive
  route flag plus owner/origin/entrypoint session topology to the bounded
  prompt and working-context page. A future slice may still add a higher-level
  relation enum once the product model decides how to label user-originated
  work versus peer delegation in operator and participant surfaces.
