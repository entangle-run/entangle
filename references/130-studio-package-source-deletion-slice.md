# Studio Package-Source Deletion Slice

Date: 2026-04-24

## Purpose

Close the visual operator side of the host-owned package-source deletion
boundary. The host, shared client, and CLI already support deleting unused
package sources; Studio now exposes that capability without introducing a
separate browser-owned state model.

## Implemented Behavior

- Studio lists active graph references for each admitted package source.
- Studio disables deletion when the currently loaded graph already shows nodes
  referencing the source.
- Studio calls `client.deletePackageSource(packageSourceId)` for unreferenced
  sources and reloads the host overview after confirmation.
- Studio tracks package-source deletion pending state separately from package
  admission pending state.
- Studio surfaces deletion failures in the package-source panel.
- Studio clears package-admission and managed-node drafts that still reference
  the deleted package-source id after a confirmed deletion.

## Evidence

- `apps/studio/src/App.tsx` wires the package-source card action to the shared
  host client deletion method and keeps deletion pending/error state local to
  the graph editor.
- `apps/studio/src/package-source-admission.ts` now provides deterministic
  helpers for collecting package-source graph references and formatting the
  reference summary shown in Studio.
- `apps/studio/src/package-source-admission.test.ts` covers the new
  reference-collection and summary behavior.

## Design Notes

The host remains the final authority for deletion. Studio only disables
deletes that are already known to be invalid from the loaded graph state; any
race or stale-state conflict still returns through the host API and is shown as
a mutation error.

This keeps the graph-native model intact:

- package-source state remains host-owned;
- graph references remain the source of truth for deletion safety;
- Studio remains a client over the shared host boundary;
- the CLI and Studio use the same underlying deletion contract.

## Verification

- `pnpm --filter @entangle/studio lint`
- `pnpm --filter @entangle/studio typecheck`
- `pnpm --filter @entangle/studio test`
- `pnpm verify`
- `git diff --check`
