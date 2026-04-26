# Observed Artifact Source Wiki Refs Slice

## Current Repo Truth

Host already had observation payload schemas for `artifact.ref`,
`source_change.ref`, and `wiki.ref`, but the projection snapshot did not expose
those refs and Host had no reducer functions that stored them as federated
projection records. Existing artifact, source-change, source-history, and wiki
Host APIs still read runner-local runtime roots.

## Target Model

Runner-local artifact/source/wiki state should become Host-visible through
signed observation events carrying bounded refs and hashes, not through Host
filesystem reads. The first useful projection shape should expose:

- artifact refs produced or retrieved by a runner;
- source-change candidate refs and associated artifact refs;
- wiki/memory refs;
- projection metadata showing observation-event origin.

Large payloads remain in git/object/wiki backends. Nostr observations carry
portable refs only.

## Impacted Modules/Files

- `packages/types/src/projection/projection.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/228-distributed-state-projection-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- add projection record schemas for observed artifact refs, source-change refs,
  and wiki refs;
- extend `HostProjectionSnapshot` with `artifactRefs`, `sourceChangeRefs`, and
  `wikiRefs`;
- add Host state roots for observed artifact/source/wiki refs;
- add Host reducers for `artifact.ref`, `source_change.ref`, and `wiki.ref`
  observation payloads;
- validate that observation refs come from a registered runner with matching
  runner pubkey and current Host Authority;
- include observed refs in `GET /v1/projection`;
- add contract and Host projection tests.

Deferred to later slices:

- runner emission of these observation payloads during normal service turns;
- Host Nostr subscription loop that dispatches all signed observation events
  into reducers;
- replacement of artifact/source/wiki legacy Host APIs that still read
  `runtimeRoot`;
- durable replay/idempotency from signed event envelopes and event ids.

## Tests Required

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/host test`
- `pnpm --filter @entangle/types lint`
- `pnpm --filter @entangle/host lint`
- `pnpm typecheck`
- `git diff --check`

Verification record for the implemented slice:

- `pnpm --filter @entangle/types typecheck` passed;
- `pnpm --filter @entangle/host typecheck` passed;
- `pnpm --filter @entangle/types test` passed;
- `pnpm --filter @entangle/host test` passed;
- `pnpm --filter @entangle/types lint` passed;
- `pnpm --filter @entangle/host lint` passed;
- `pnpm typecheck` passed.

## End-Of-Slice Audit

This slice adds no new runner filesystem reads. It introduces separate observed
projection roots for signed refs, so local compatibility import/sync logic does
not prune federated ref projection records.

The local-assumption audit should classify remaining `runtimeRoot` references
as existing legacy Host API and local compatibility paths, not new behavior
introduced here.

## Migration/Compatibility Notes

The projection fields are additive. Existing projection consumers continue to
work because new arrays default to empty. Local artifact/source/wiki APIs remain
available until runner observation emission and projection-backed endpoints are
complete.

## Risks And Mitigations

- Risk: refs are accepted from an untrusted source.
  Mitigation: reducers require current Host Authority and a registered runner
  with matching runner pubkey.
- Risk: observed projection refs diverge from local compatibility imports.
  Mitigation: federated refs live in separate roots from old trace/activity
  records and include observation projection metadata.
- Risk: projection exposes refs without enough detail for Studio.
  Mitigation: v1 exposes portable refs first; detailed preview/diff endpoints
  remain a later projection-backed API migration.

## Open Questions

No open question blocks this slice. The next implementation step should connect
runner service emission and Host observation dispatch so these reducers are fed
from signed Nostr events, not only direct state reducer calls in tests.
