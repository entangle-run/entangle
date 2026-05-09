# Memory Brief Resolutions Context Slice

## Current Repo Truth

Runner turn assembly already injects a bounded memory brief from the node wiki
when focused memory pages exist. The brief prioritizes next actions, source
change, approval, delegation, coordination, open questions, decisions, stable
facts, and working context. `summaries/resolutions.md` was already collected
as a full memory ref, but it was not part of the bounded prompt brief.

Before this slice, a coding engine could see active next actions in the brief
without seeing nearby closed work, increasing the chance that a future turn
would reopen already resolved questions or repeat completed actions unless it
explicitly inspected the full resolutions memory ref.

## Target Model

Each node should enter a turn with both active obligations and recent closures
visible in the bounded prompt. Resolutions remain durable node wiki memory, and
the brief should surface them early enough to guide the coding engine while
still keeping full memory pages available through memory refs.

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

- Add `summaries/resolutions.md` to the bounded memory brief candidate order.
- Keep `summaries/resolutions.md` in full memory refs for complete page access.
- Extend the focused runtime-context test so it fails when the brief omits
  recent resolutions.

## Tests Required

- Focused runner Vitest for bounded focused memory brief construction.
- Runner typecheck.
- Focused runner ESLint for changed files.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

No schema or data migration is required. This only changes prompt assembly when
the node wiki already contains `summaries/resolutions.md`.

## Risks And Mitigations

- Risk: resolutions displace lower-priority brief sections when the brief
  budget is tight. Mitigation: resolutions are intentionally adjacent to next
  actions because closed work is part of the active-work baseline; full memory
  refs remain available for omitted sections.
- Risk: stale or low-quality resolutions bias future turns. Mitigation:
  model-guided synthesis and deterministic focused-register reconciliation
  already own the quality of the resolutions page.

## Open Questions

Future memory work can make the brief budget adaptive per node role and active
task type rather than using a fixed candidate order.

## Verification

Completed in this slice:

- Red focused runner Vitest for `includes a bounded focused memory brief`
  failed because the prompt brief omitted the resolutions page.
- Green focused runner Vitest for the same behavior passed after adding
  resolutions to the brief candidate order.

The final slice audit also runs runner typecheck, focused ESLint, product
naming, whitespace, changed-diff marker checks, and `git diff` review before
commit.
