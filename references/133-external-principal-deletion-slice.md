# External Principal Deletion Slice

## Purpose

Close the lifecycle gap for host-managed external principals.

Before this slice, `entangle-host` could persist, list, inspect, and upsert
backend-facing principal bindings such as git principals, but there was no
safe way to remove stale principal records through the host boundary. Operators
would have had to edit host desired-state files directly, bypassing validation,
events, host-client behavior, and CLI dry-run safety.

## Implemented behavior

- Added `ExternalPrincipalDeletionResponse` to the shared control-plane
  contract.
- Added typed `external_principal.deleted` host events.
- Added `DELETE /v1/external-principals/{principalId}` to `entangle-host`.
- Deletion returns `404 not_found` when the principal record does not exist.
- Deletion returns `409 conflict` when any active graph node resolves the
  principal through node-local bindings or graph defaults.
- Successful deletion removes only the principal record from host desired
  state. It intentionally does not delete secret material referenced by the
  principal.
- Added `deleteExternalPrincipal(principalId)` to `@entangle/host-client`.
- Added `entangle host external-principals delete <principalId>` with
  `--dry-run` support to the CLI.
- Updated Studio host-event refresh classification so external-principal
  upsert/delete events refresh overview state.

## Design notes

External principals are coordination bindings, not secret stores. Removing a
principal record should detach the host-managed binding from graph/runtime
resolution, while secret lifecycle remains a separate operator-controlled
surface. This keeps the deletion operation narrow and avoids unexpected
credential destruction.

Reference checks use effective graph bindings rather than raw node fields only.
This prevents a principal inherited from graph defaults from being deleted
while the active topology still depends on it.

## Verification

- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/host-client test`
- `pnpm --filter @entangle/studio test`
- `pnpm --filter @entangle/host test`

