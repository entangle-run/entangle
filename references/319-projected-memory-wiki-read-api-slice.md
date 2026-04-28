# Projected Memory Wiki Read API Slice

## Current Repo Truth

Runtime memory list/page APIs still required a Host-readable runtime memory
root. Runner `wiki.ref` observations already fed Host projection and could
carry bounded wiki preview content, but Studio/CLI memory inspection could not
use those projected refs when the runner lived behind a separate filesystem
boundary.

## Target Model

The node memory/wiki read surface should have a projection-backed minimum: Host
can list and preview observed wiki refs for a node without reading the runner's
memory directory. Local memory files remain a higher-fidelity compatibility
path, but projected wiki refs keep remote nodes inspectable.

This does not make Nostr the canonical wiki repository. Full wiki state still
belongs in runner-owned git/object-backed repositories; projection only carries
bounded preview evidence.

## Impacted Modules/Files

- `packages/types/src/host-api/runtime.ts`
- `apps/cli/src/runtime-memory-command.ts`
- `services/host/src/index.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/222-current-state-codebase-audit.md`
- `references/228-distributed-state-projection-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Make runtime memory preview `sourcePath` optional for projection-backed
  previews.
- Remove Host route preconditions that memory list/page reads require
  `contextAvailable`.
- Map observed `wiki.ref` projection records to synthetic runtime memory page
  summaries.
- Prefer local memory pages when present, then fall back to projected wiki refs.
- Serve bounded projected wiki preview content from the memory page endpoint.
- Keep CLI summary compatible with previews that have no local source path.

## Tests Required

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host test -- src/index.test.ts`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli lint`

## Migration/Compatibility Notes

Local memory roots are unchanged. When only projected wiki refs exist, the
response uses a synthetic `projection://<nodeId>/wiki-refs` memory root and
omits preview `sourcePath`.

## Risks And Mitigations

- Risk: a projected wiki ref is mistaken for the complete wiki repository.
  Mitigation: docs call this a bounded read model; full wiki publication remains
  a future runner-owned git/object-backed concern.
- Risk: local pages and projected refs duplicate paths.
  Mitigation: local pages win for identical paths because they are higher
  fidelity in compatibility deployments.
- Risk: observed wiki refs with repository-root locators have no page path.
  Mitigation: Host maps them to `wiki/refs/<artifactId>.md` so the preview is
  still discoverable without fabricating a real repo path.

## Open Questions

- Should future wiki refs include the preview page path explicitly so projected
  memory pages can avoid synthetic `wiki/refs/*` paths?
