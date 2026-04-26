# Host Authority Store Slice

## Current Repo Truth

The Host currently has bootstrap operator-token auth and runtime-owned Nostr
identities for non-user nodes, but it does not persist a first-class Host
Authority identity. `initializeHostState()` creates Entangle state directories,
default resource catalog data, graph state, runtime intents, runtime identity
secrets, and local layout markers. Host status reports Entangle state layout,
runtime reconciliation, runtime counts, and session diagnostics, but not Host
Authority status.

The federated contracts from Slice 1 define Host Authority records, signed
envelopes, and control/observe payload schemas. They are not yet consumed by
Host state or Host API routes.

## Target Model

Host owns a stable Host Authority keypair. The key is generated on first local
startup unless imported by an operator. The public record is persisted under
Host desired state, secret material is stored in the Host secret store, and API
surfaces let an authorized operator inspect, export, and import the authority
for portability.

This slice does not make Host-runner control federated yet. It creates the
authority primitive required by later runner registry and assignment slices.

## Impacted Modules/Files

- `packages/types/src/common/crypto.ts`
- `packages/types/src/host-api/authority.ts`
- `packages/types/src/host-api/status.ts`
- `packages/types/src/index.ts`
- `services/host/src/state.ts`
- `services/host/src/index.ts`
- `services/host/src/index.test.ts`
- `packages/host-client/src/index.ts`
- `packages/host-client/src/index.test.ts`
- `apps/cli/src/index.ts`
- `apps/cli/src/authority-output.ts`
- `apps/cli/src/authority-output.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- added a Nostr secret-key primitive;
- added Host Authority API request/response schemas;
- materialized a default Host Authority record and key on first Host state
  initialization;
- stored Host Authority public record under desired Host state and secret
  material under the existing secret-ref store;
- inspected whether the configured secret exists and matches the public key;
- exposed `GET /v1/authority`, `GET /v1/authority/export`, and
  `PUT /v1/authority/import`;
- added Host Authority summary to Host status;
- added internal Host Authority signing helpers for later control events;
- added host-client methods for authority inspect/export/import;
- added CLI operator commands for authority show/export/import;
- added focused tests for Host API, host-client, and CLI projection helpers.

## Tests Required

- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/host test`
- `pnpm --filter @entangle/host-client test`
- `pnpm --filter @entangle/cli test`
- `pnpm typecheck`
- package lint for touched packages
- `git diff --check`

Verification record for the implemented slice:

- `pnpm --filter @entangle/types typecheck` passed;
- `pnpm --filter @entangle/host typecheck` passed;
- `pnpm --filter @entangle/host-client typecheck` passed;
- `pnpm --filter @entangle/cli typecheck` passed;
- `pnpm --filter @entangle/types test` passed;
- `pnpm --filter @entangle/host test` passed;
- `pnpm --filter @entangle/host-client test` passed;
- `pnpm --filter @entangle/cli test` passed;
- `pnpm --filter @entangle/types lint` passed;
- `pnpm --filter @entangle/host lint` passed;
- `pnpm --filter @entangle/host-client lint` passed;
- `pnpm --filter @entangle/cli lint` passed;
- `pnpm typecheck` passed;
- `CI=1 TURBO_DAEMON=false pnpm verify` passed;
- `git diff --check` passed.

## End-Of-Slice Audit

The mandatory local-assumption search was run against the current diff:

```bash
git diff -U0 | rg "^\+.*(runtimeProfile.*single-machine|contextPath|runtimeRoot|shared volume|effective-runtime-context|Docker)"
```

No newly added local-only assumptions were found. The slice adds Host
Authority state under the current local Host storage implementation, but that
state is intentionally portable through export/import and is not tied to
Docker, shared volumes, `runtimeRoot`, or `effective-runtime-context.json`.

## Migration/Compatibility Notes

The slice is additive for existing Entangle state. Hosts with no authority record
receive a generated default authority. Imported authority records can replace
that local default because the product is still pre-release. Existing runtime
node identities are not migrated in this slice.

## Risks And Mitigations

- Risk: exporting the secret key is dangerous.
  Mitigation: export remains behind the existing Host operator auth boundary
  and is required for Host authority portability; CLI can write to a file.
- Risk: the Host status becomes misleading if the secret is missing.
  Mitigation: Host status includes authority secret availability and degrades
  when the persisted authority has no matching secret.
- Risk: signing helpers are confused with control transport.
  Mitigation: helpers only produce Host Authority signatures/envelopes; Nostr
  control publishing remains a later slice.

## Open Questions

No open question blocks this slice. Long-term key encryption and hardware/key
agent integration remain future hardening work.
