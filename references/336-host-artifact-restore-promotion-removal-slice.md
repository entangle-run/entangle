# Host Artifact Restore And Promotion Removal Slice

## Current Repo Truth

Artifact refs, artifact preview, artifact history, and artifact diff inspection
remain useful Host read surfaces. They can use projected artifact refs and
bounded observed preview content when Host does not have a backend checkout.

Before this slice, Host also exposed direct artifact restore and promotion
surfaces:

- `POST /v1/runtimes/:nodeId/artifacts/:artifactId/restore`;
- `POST /v1/runtimes/:nodeId/artifacts/:artifactId/promote`;
- restore and promotion history list routes;
- matching host-client methods, CLI commands, and Studio controls.

Those routes wrote restore workspaces and source workspace files from Host by
reading runtime-local paths. That is not a valid boundary for runners on other
machines.

## Target Model

Artifact mutation is node-owned runtime behavior. Host should observe signed
artifact refs, source refs, approvals, and future runner-owned restore or
promotion observations. Public Host, CLI, and Studio surfaces should inspect
artifacts, not mutate runner workspaces.

## Impacted Modules/Files

- `packages/types/src/host-api/runtime.ts`
- `packages/types/src/index.test.ts`
- `packages/host-client/src/index.ts`
- `packages/host-client/src/index.test.ts`
- `packages/host-client/src/runtime-artifact.ts`
- `packages/host-client/src/runtime-artifact.test.ts`
- `services/host/src/index.ts`
- `services/host/src/state.ts`
- `apps/cli/src/index.ts`
- `apps/cli/src/runtime-artifact-command.ts`
- `apps/cli/src/runtime-artifact-command.test.ts`
- `apps/studio/src/App.tsx`
- `apps/studio/src/runtime-artifact-inspection.ts`
- `apps/studio/src/runtime-artifact-inspection.test.ts`
- `references/215-runtime-artifact-restore-slice.md`
- `references/216-studio-artifact-restore-slice.md`
- `references/217-runtime-artifact-restore-history-slice.md`
- `references/219-artifact-promotion-slice.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `README.md`
- `wiki/log.md`
- `wiki/overview.md`

## Concrete Changes Required

- Remove Host artifact restore and promotion routes. Done.
- Remove Host state helpers that write artifact restore and source promotion
  paths from Host.
- Remove restore/promotion Host API schemas and host-client methods. Done.
- Remove CLI `artifact-restore`, `artifact-restores`, `artifact-promote`, and
  `artifact-promotions` commands. Done.
- Remove Studio artifact restore/promotion panels. Done.
- Keep artifact list/detail/preview/history/diff inspection surfaces. Done.
- Mark old same-machine restore/promotion docs as superseded. Done.

## Tests Required

- Type/schema tests proving removed contracts no longer exist.
- host-client tests proving no restore/promotion requests are emitted.
- CLI and Studio typecheck/lint after command and UI removal.
- Host typecheck/lint after state-route removal.
- Federated process smoke proving artifact refs and projected runtime behavior
  still work.

## Verification Run

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/host-client typecheck`
- `pnpm --filter @entangle/host-client test`
- `pnpm --filter @entangle/host-client lint`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli test`
- `pnpm --filter @entangle/cli lint`
- `pnpm --filter @entangle/studio typecheck`
- `pnpm --filter @entangle/studio lint`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/host test -- src/index.test.ts src/federated-control-plane.test.ts`
- `pnpm ops:smoke-federated-process-runner -- --timeout-ms 60000`
- `git diff --check`

The added-line local-assumption audit found one new `Docker` documentation
mention in `223-federated-product-vision.md`. It is valid as a same-machine
smoke/deployment verification reference, not as a privileged architecture
boundary.

## Migration/Compatibility Notes

This is an intentional pre-release breaking change. Explicit artifact restore,
source promotion, replay, or rollback should return as runner-owned protocol
commands or signed User Node/Host control workflows, not as Host filesystem
mutations.

Historical restore/promotion records are no longer exposed through public Host
APIs. Existing artifact refs and git/object backend locators remain the durable
handoff surface.

## Risks And Mitigations

- Risk: operators lose manual restore/promote buttons.
  Mitigation: artifact preview/history/diff remain available; source changes
  should be made through signed source-candidate review and runner-owned
  source-history behavior.
- Risk: old docs still describe these routes as active.
  Mitigation: historical slice docs are marked superseded and the active
  federated index points here.
- Risk: a future restore workflow needs some removed code.
  Mitigation: the old implementation remains in git history; the replacement
  should be protocol-driven and runner-owned.

## Open Questions

- Define whether artifact restore should be a User Node request, Host control
  command, or both with different policy requirements.
- Decide whether source promotion from artifacts should be replaced by
  source-change proposals rather than direct filesystem promotion.
