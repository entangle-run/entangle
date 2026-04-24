# Studio External Principal Lifecycle Slice

## Purpose

Expose the host-managed external-principal lifecycle in Studio without making
the browser the owner of principal or secret state.

The preceding host slice added safe deletion for unused external principal
records through `entangle-host`, the shared host client, and the CLI. Studio
still lacked an operator-visible inventory, which meant visual operators could
not inspect bound principal records or discover why deletion would be blocked.

## Implemented behavior

- Studio overview loading now fetches `client.listExternalPrincipals()`
  alongside host status, graph, runtimes, and admitted package sources.
- The graph editor now includes an `External Principals` panel.
- Principal rows are sorted deterministically by `principalId`.
- Each row shows display name, principal id, system kind, git service,
  transport auth mode, and subject.
- Studio computes effective active-graph references with
  `resolveEffectiveExternalPrincipalRefs`, matching the host deletion guard.
- The delete action is disabled when the current graph already proves that a
  principal is referenced.
- Unreferenced principal bindings are deleted through
  `client.deleteExternalPrincipal(principalId)`.
- After deletion, Studio refreshes the host overview and clears stale
  principal refs from the local managed-node draft.

## Deliberate scope

This slice does not add visual creation or editing of external principals.
Principal records contain secret references and transport/auth semantics that
should remain file/CLI-driven until Studio has a dedicated secret-safe form and
validation flow. The visual surface added here is therefore inventory,
reference visibility, and safe deletion only.

## Verification

- `pnpm --filter @entangle/studio lint`
- `pnpm --filter @entangle/studio typecheck`
- `pnpm --filter @entangle/studio test`

