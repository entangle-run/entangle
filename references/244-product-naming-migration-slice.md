# Product Naming Migration Slice

## Current Repo Truth

The federated pivot changed product identity from "Entangle Local" to
"Entangle", with local as one deployment profile. Before this slice, current
public-facing docs and CLI help still used Entangle Local as product language,
and new Host/local repair state layout records still wrote the product marker
`"entangle-local"`.

Historical Local-era slice records still correctly use Entangle Local because
they describe the work as it was framed at that time. Compatibility fixtures
also still need old markers.

## Target Model

Current product-facing surfaces should say Entangle. Local should be described
as a deployment profile, adapter, or compatibility path, not as a separate
product identity.

New local state layout records should use product marker `"entangle"` while
existing `"entangle-local"` records remain readable during the pre-release
migration window.

## Impacted Modules/Files

- `packages/types/src/host-api/status.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `apps/cli/src/index.ts`
- `apps/cli/src/local-backup-command.ts`
- `apps/cli/src/local-doctor-command.ts`
- `apps/cli/src/local-repair-command.ts`
- `apps/cli/src/local-repair-command.test.ts`
- `README.md`
- `resources/README.md`
- `deploy/README.md`
- `deploy/local/README.md`
- `wiki/overview.md`
- `wiki/log.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/230-migration-from-local-assumptions-plan.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`

## Concrete Changes Required

Implemented in this slice:

- allow local state layout records to parse both `"entangle"` and legacy
  `"entangle-local"` product markers;
- write `"entangle"` for newly materialized Host local state layout records;
- write `"entangle"` for new local repair-created state layout records;
- keep backup manifest product `"entangle-local-backup"` as a compatibility
  bundle marker;
- update current CLI local command/help wording from Entangle Local product
  language to Entangle local profile language;
- update current README, deploy README, resources README, and wiki overview
  wording so local is a profile, not the product identity;
- leave historical docs, test fixtures, local Docker network names, local
  backup file names, and workspace layout versions in place where they are
  compatibility records or local adapter identifiers.

Deferred to later slices:

- remove or hide legacy runtimeRoot/contextPath Host APIs after projection
  parity exists;
- rename Docker network/volume identifiers only if a migration-safe adapter
  story is needed before public release;
- rewrite historical Local-era references only if they are promoted back into
  current docs.

## Tests Required

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/types lint`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host test`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli test`
- `pnpm --filter @entangle/cli lint`
- `pnpm typecheck`
- `git diff --check`

Verification record for the implemented slice:

- `pnpm --filter @entangle/types typecheck` passed;
- `pnpm --filter @entangle/types test` passed;
- `pnpm --filter @entangle/types lint` passed;
- `pnpm --filter @entangle/host typecheck` passed;
- `pnpm --filter @entangle/host test` passed;
- `pnpm --filter @entangle/host lint` passed;
- `pnpm --filter @entangle/cli typecheck` passed;
- `pnpm --filter @entangle/cli test` passed;
- `pnpm --filter @entangle/cli lint` passed;
- `pnpm typecheck` passed;
- `git diff --check` passed.

## End-Of-Slice Audit

The naming audit still finds `entangle-local` in valid local adapter and
compatibility places:

- local backup bundle marker and default file names;
- local Docker network names;
- runtime workspace layout version;
- historical Local-era docs;
- tests proving legacy state layout records and local Gitea remote names still
  parse.

Those hits should not be blindly deleted.

## Migration/Compatibility Notes

Pre-existing state layout records with product `"entangle-local"` remain
accepted. New Host materialization and local repair write `"entangle"`. This is
a controlled pre-release migration rather than a public upgrade contract.

## Risks And Mitigations

- Risk: old local state becomes unreadable.
  Mitigation: schema accepts both current and legacy product markers and tests
  cover both.
- Risk: docs erase useful history.
  Mitigation: current docs are reframed; historical implementation records are
  left accurate.
- Risk: renaming local Docker identifiers breaks developer state.
  Mitigation: local adapter identifiers remain compatibility names for now.

## Open Questions

No open question blocks this slice. Before first public release, decide whether
local Docker network and backup bundle identifiers should keep legacy names for
stability or receive an explicit migration.
