# Host Agent Engine Profile Upsert API Slice

## Current Repo Truth

CLI and Studio could already create or update catalog agent engine profiles,
including attached OpenCode profiles, but both did it by loading the whole
catalog, mutating it client-side, and applying the full catalog back to Host.
That kept Host authoritative, but it made a high-traffic operator workflow more
race-prone than necessary.

## Target Model

Agent engine profile mutation should be a Host-owned catalog operation. Clients
should send a focused profile upsert request, while Host reads the current
catalog, merges the profile atomically at the Host boundary, validates the final
catalog, persists it, synchronizes runtime state, and emits the normal catalog
update event.

## Impacted Modules/Files

- `packages/types/src/host-api/control-plane.ts`
- `services/host/src/index.ts`
- `services/host/src/state.ts`
- `packages/host-client/src/index.ts`
- `apps/cli/src/catalog-agent-engine-command.ts`
- `apps/cli/src/index.ts`
- `apps/studio/src/agent-engine-profile-editor.ts`
- `apps/studio/src/App.tsx`
- tests in `packages/types`, `packages/host-client`, `services/host`,
  `apps/cli`, and `apps/studio`

## Concrete Changes Required

- Add a typed `agentEngineProfileUpsertRequestSchema`.
- Add `PUT /v1/catalog/agent-engine-profiles/:profileId`.
- Add `host-client.upsertAgentEngineProfile`.
- Move CLI `host catalog agent-engine upsert` to the focused Host route for
  real mutations while keeping dry-run as a request preview.
- Move Studio's profile editor save path to the focused Host route.

## Tests Required

- Contract parsing for valid and conflicting upsert requests.
- Host route test for successful upsert and invalid final catalog handling.
- host-client request-shape test.
- CLI helper test for request construction.
- Studio helper test for request construction.
- Targeted lint/typecheck/test for touched packages.

## Migration/Compatibility Notes

Existing `GET /v1/catalog`, `POST /v1/catalog/validate`, and `PUT /v1/catalog`
remain available for full-catalog operator workflows. The new route is the
preferred profile-level mutation path.

## Risks And Mitigations

- Risk: CLI and Studio profile semantics drift from Host merge semantics.
  Mitigation: clients now send the same typed request shape that Host parses.
- Risk: invalid patch requests produce partially persisted catalog state.
  Mitigation: Host validates the final catalog before writing.

## Open Questions

None for this slice.
