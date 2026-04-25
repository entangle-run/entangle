# Working Context Approval Gate Carry-Forward Slice

## Purpose

Make approval blockers durable in runner-owned working memory after they become
visible in the bounded session snapshot.

The approval-aware session snapshot lets a turn inspect pending and terminal
approval records. Without deterministic carry-forward, however, the durable
`working-context.md` page could still lose exact approval ids or statuses if
the model-guided prose omitted them.

## Implemented Behavior

The model-guided memory synthesis path now writes an explicit `Approval Gates`
subsection inside `working-context.md`.

When a current session snapshot is available, the subsection records:

- waiting approval ids from the session record;
- how many approval records were included in the bounded snapshot out of the
  total recorded approval count;
- one compact line per bounded approval record, including approval id, status,
  requester, approver count, and conversation id when present.

When no session snapshot is available, the subsection records that approval
gate context was unavailable rather than silently omitting the section.

## Boundary Decisions

- The page remains deterministic runner-owned memory, not a host mutation
  surface.
- Approval reasons are intentionally omitted from the deterministic line to
  keep working context compact and bounded; the full approval record remains
  available through runtime approval inspection.
- Waiting approval ids and recorded approval records remain separate signals
  because disagreement between them is meaningful operational drift.
- Model-guided `sessionInsights` still exist, but they no longer carry sole
  responsibility for preserving exact approval-gate state.

## Tests

Runner memory-synthesis coverage now seeds a pending approval record and asserts
that:

- the synthesis prompt includes the approval summary from the bounded session
  snapshot;
- `working-context.md` records waiting approval count, recorded approval count,
  and status summary;
- `working-context.md` includes the deterministic `Approval Gates` subsection
  with the exact pending approval id and compact approval-record line.

## Result

Approval blockers now survive into durable runner memory as exact structured
context. Later turns can recover active approval-gate state from
`working-context.md` even when model-generated session prose is compressed,
rewritten, or focused on other coordination details.
