# Coordination Map Memory Slice

## Current Repo Truth

Model-guided runner memory already maintains focused wiki summaries for working
context, stable facts, decisions, open questions, next actions, resolutions,
recent work, and focused-register transition history. The working context page
contains owner-aware session metadata, inbound message provenance,
conversation routes, approval gates, source-change evidence, handoff evidence,
artifact insights, and execution signals.

That information was present, but it was not separated into a durable
coordination-oriented page that a future coding-agent turn could consult as
the node's graph-relation map.

## Target Model

Every coding-agent node should keep a bounded private memory page that answers:

- which graph and local node this runtime represents;
- who owns the current session locally;
- where the session originated and entered the graph;
- which peer conversation routes are active;
- which approval gates are relevant;
- which handoff obligations were emitted;
- which durable coordination insights the model selected for carry-forward.

The page is node memory, not orchestration state. Host, Studio, CLI, and other
nodes still rely on signed messages, assignments, and projected observations
for authority.

## Impacted Modules/Files

- `services/runner/src/memory-maintenance.ts`
- `services/runner/src/memory-synthesizer.ts`
- `services/runner/src/memory-synthesizer.test.ts`
- `services/runner/src/runtime-context.ts`
- `services/runner/src/service.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `summaries/coordination-map.md` as a canonical focused memory summary.
- Extend the memory-summary tool schema with bounded `coordinationInsights`.
- Render coordination insights into `working-context.md`.
- Write `coordination-map.md` after successful model-guided memory synthesis.
- Include node relation, inbound message, conversation routes, approval gates,
  handoff obligations, and durable coordination insights in the page.
- Add the page to wiki index maintenance, memory refs, and the bounded memory
  brief candidate list.

## Tests Required

- Runner memory-synthesizer test proving tool input, generated page content,
  wiki index entry, and future memory refs.
- Runner service test proving memory synthesis outcomes can record the new
  summary page path.
- Runner runtime-context coverage through the existing package test suite.

## Migration/Compatibility Notes

No migration is required. Existing nodes will create the coordination-map page
on their next successful model-guided memory synthesis pass. Existing
memory-synthesis outcome readers already accept additional updated summary
paths.

## Risks And Mitigations

- Risk: coordination memory is mistaken for routing authority. Mitigation:
  docs and page content frame it as private node memory; protocol authority
  remains signed messages, Host assignments, policy, and observations.
- Risk: the page duplicates working-context details. Mitigation: duplication is
  intentional but bounded; the page is organized around graph relation and
  peer-route continuity instead of general task memory.
- Risk: the model invents coordination claims. Mitigation: the deterministic
  sections are rendered from typed session, inbound, approval, conversation,
  and handoff records; model-selected `coordinationInsights` remains bounded.

## Open Questions

Deeper delegated-session repair and formal cross-runtime relation modeling can
build on this page, but they still need their own protocol and policy design.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/runner test -- src/memory-synthesizer.test.ts`
- `pnpm --filter @entangle/runner test -- src/runtime-context.test.ts src/index.test.ts src/service.test.ts`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner lint`
- `pnpm ops:check-product-naming`
