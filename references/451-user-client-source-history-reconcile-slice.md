# User Client Source History Reconcile Slice

Date: 2026-04-29.

## Current Repo Truth

Entangle already had runner-owned source-history reconcile as a Host-signed
`runtime.source_history.reconcile` control command. Operators could request it
from CLI and Studio, and Host projected the runner-emitted replay outcome, but
the running User Client did not expose that participant workflow.

The Human Interface Runtime already routed selected-conversation artifact
restore, artifact-to-source proposal, wiki publication, wiki page upsert, and
source-history publication requests through Host while preserving the User Node
as the requester. Source-history reconcile was the remaining source-history
repair path that still lacked a User Node surface.

## Target Model

A running User Node can request source-history reconcile only when the selected
conversation contains a visible inbound `source_history` approval resource from
the target runtime node. Target-specific `source_history_publication` resources
remain valid for publication, but they do not authorize reconcile because
reconcile can mutate the runner-owned source workspace.

The User Client forwards reconcile through the Human Interface Runtime to Host:

- the Human Interface Runtime enforces selected-conversation visibility;
- the request carries `approvalId` when available;
- Host still signs the runtime command;
- the assigned runner still performs approval checks and source workspace
  reconciliation;
- Host observes the outcome through signed runner evidence and command
  receipts.

## Impacted Modules And Files

- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `apps/user-client/src/runtime-api.ts`
- `apps/user-client/src/runtime-api.test.ts`
- `apps/user-client/src/App.tsx`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`
- `references/README.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/450-source-history-reconcile-control-slice.md`

## Concrete Changes

- Added `POST /api/source-history/reconcile` to the Human Interface Runtime
  JSON API.
- Added fallback HTML form handling at `POST /source-history/reconcile`.
- Added `reconcileSourceHistory` to the dedicated User Client runtime API.
- Added a User Client button and reason field for visible `source_history`
  resources.
- Passed `approvalId` through the User Client and Human Interface Runtime when
  available.
- Split source-history visibility semantics so publication can use
  `source_history_publication`, while reconcile requires a plain
  `source_history` resource.
- Added runner integration tests for JSON and fallback HTML participant
  reconcile requests and Host forwarding metadata.

## Tests Required

- User Client API helper test for the JSON request body.
- Runner Human Interface Runtime test for:
  - visible `source_history` reconcile request;
  - `approvalId` forwarding;
  - `replayedBy` set to the User Node id;
  - fallback HTML form request;
  - missing conversation rejection.
- Typecheck for User Client and runner packages.
- Lint for User Client and runner packages.

## Verification

Targeted checks for this slice:

```bash
pnpm --filter @entangle/user-client typecheck
pnpm --filter @entangle/runner typecheck
pnpm --filter @entangle/user-client test -- --run src/runtime-api.test.ts
pnpm --filter @entangle/runner exec vitest run --config ../../vitest.config.ts --environment node --pool=forks --maxWorkers=1 --testTimeout=30000 src/index.test.ts
pnpm --filter @entangle/user-client lint
pnpm --filter @entangle/runner lint
git diff --check
pnpm ops:check-product-naming
```

Added-line local-assumption audit:

```bash
git diff -U0 | rg "^\+.*(Entangle Local|entangle-local|runtimeProfile.*local|contextPath|runtimeRoot|shared volume|effective-runtime-context|Docker)"
```

No added lines matched that local-only assumption scan.

## Migration And Compatibility Notes

This is an additive participant surface. Existing CLI, Studio, Host API, and
runner reconcile behavior remains unchanged.

The Human Interface Runtime error text for missing source-history conversation
scope now says "source-history operation" instead of "source-history
publication" because the same resolver backs publication and reconcile.

## Risks And Mitigations

- Risk: a publication approval could be treated as permission to mutate source
  workspaces.
  Mitigation: User Client reconcile requires a visible `source_history`
  resource, not `source_history_publication`.
- Risk: User Client could bypass runner approval checks.
  Mitigation: the request only forwards `approvalId`; the runner still owns the
  approval validation before source mutation.
- Risk: fallback HTML and React client drift.
  Mitigation: both paths are tested against the same Host forwarding boundary.

## Open Questions

- The process-runner smoke does not yet include the participant reconcile path
  because a realistic end-to-end reconcile requires an agent-emitted
  `source_history` approval record and then an approved User Node response
  before the command. The lower-level runner reconcile command and the Human
  Interface Runtime forwarding path are covered separately.
