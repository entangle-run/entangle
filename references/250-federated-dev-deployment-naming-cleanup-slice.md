# Federated Dev Deployment Naming Cleanup Slice

## Current Repo Truth

The product marker and runtime profile had already moved to Entangle and
`federated`, but active operator surfaces still carried same-machine-era names:

- root scripts exposed the old same-machine check and smoke script names;
- deployment material lived under the old same-machine deployment directory;
- CLI reliability commands were grouped under the previous same-machine CLI group;
- the default engine and catalog fixtures still used the old default OpenCode profile id and
  the old default catalog id;
- state-layout contracts were exported as `localStateLayout*`;
- the Docker runner image default was the old runner image tag.

Those names made the same-machine topology look like a separate product or
runtime model.

## Target Model

The active same-machine topology is a federated development deployment profile.
It may run Host, Studio, relay, git service, and Docker launcher on one
workstation, but the product model should still be Entangle and the runtime
profile should still be federated.

User-facing operator commands should describe deployment operations, not a
separate local product.

## Impacted Modules/Files

- `package.json`
- `deploy/federated-dev/**`
- `scripts/*federated-dev*.mjs`
- `apps/cli/src/deployment-*-command*.ts`
- `apps/cli/src/index.ts`
- `packages/types/src/host-api/status.ts`
- runtime/session/activity/host-event initiator contracts
- default catalog and engine profile fixtures across Host, runner, Studio,
  CLI, host-client, validator, and type tests
- `README.md`, `wiki/overview.md`, `wiki/log.md`, and affected reference docs
- `references/221-federated-runtime-redesign-index.md`
- `references/250-federated-dev-deployment-naming-cleanup-slice.md`

## Concrete Changes Required

Implemented in this slice:

- renamed the active deployment directory from the old same-machine deployment directory to
  `deploy/federated-dev`;
- renamed Compose and relay config files to federated dev names;
- renamed root operation scripts to `ops:check-federated-dev` and
  `ops:smoke-federated-dev:*`;
- renamed the CLI command group from the previous same-machine CLI group to
  `entangle deployment`;
- renamed CLI helper modules from `local-*` to `deployment-*`;
- renamed the state-layout contract exports from `localStateLayout*` to
  `stateLayout*`;
- renamed conversation initiator values from `local/remote` to `self/peer`;
- renamed the default engine profile from the old default OpenCode profile id to
  `opencode-default`;
- renamed the default catalog from the old default catalog id to `default-catalog`;
- renamed the default runner image from the old runner image tag to
  `entangle-runner:federated-dev`;
- updated active deployment docs, README/wiki references, tests, and smokes.

Deferred:

- historical reference filenames that still contain earlier same-machine-era
  names;
- the deeper runtime execution refactor that removes Host-owned Docker
  start/stop as the main runtime abstraction;
- the live relay/git distributed smoke.

## Tests Required

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/cli test`
- `pnpm --filter @entangle/host test`
- `pnpm --filter @entangle/runner test`
- `pnpm --filter @entangle/host-client test`
- `pnpm --filter @entangle/studio test`
- `pnpm --filter @entangle/validator test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm ops:check-federated-dev`
- `pnpm --filter @entangle/cli dev deployment doctor --skip-live --json`
- `git diff --check`
- stale active naming search.

Verification record:

- targeted typechecks passed for types, Host, runner, and CLI;
- targeted tests passed for types, CLI, Host, runner, host-client, Studio, and
  validator;
- `pnpm typecheck` passed;
- `pnpm lint` passed;
- `pnpm ops:check-federated-dev` passed;
- `entangle deployment doctor --skip-live --json` ran successfully with
  expected warnings for missing runner image/OpenCode/state;
- `git diff --check` passed;
- stale active naming search returned no hits for the previous product marker,
  same-machine CLI group, check/smoke script names, deployment directory,
  runner image tag, default OpenCode profile id, or default catalog id.

## Migration/Compatibility Notes

This is intentionally breaking for pre-release operator commands and profile
paths. The old command group and script names are not retained as aliases
because preserving them would keep the wrong product model alive.

Existing generated same-machine state can be regenerated. Backups still target
`.entangle/host`; only the operator command and profile names changed.

## Risks And Mitigations

- Risk: external notes or old scripts still call removed command names.
  Mitigation: canonical README, deploy docs, wiki, package scripts, and smoke
  scripts now point to the federated dev names.
- Risk: state-layout export renaming breaks internal imports.
  Mitigation: root typecheck and targeted package tests cover the changed
  contracts.
- Risk: same-machine wording is over-corrected and hides legitimate node-owned
  state concepts.
  Mitigation: this slice removes active product/profile naming only; node-owned
  workspace and materialization concepts remain valid where needed.

## Open Questions

No product question blocks this slice. The remaining naming decision is whether
historical reference filenames should be mechanically renamed or left as
chronological records.
