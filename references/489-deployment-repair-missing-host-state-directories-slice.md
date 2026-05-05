# Deployment Repair Missing Host State Directories Slice

## Current Repo Truth

`entangle deployment repair` can initialize a missing `.entangle/host`
directory and stamp a missing state-layout marker. It can also block unsafe
repair for unreadable, unsupported future, or unsupported legacy state layout
records.

Before this slice, a non-disposable deployment with an existing
`.entangle/host` and valid `state-layout.json` but missing standard
subdirectories such as `observed`, `traces`, `imports`, `workspaces`, or
`cache` produced no repair action.

## Target Model

The deployment repair command should safely repair missing non-secret Host
state directory skeleton pieces without mutating authoritative state files,
runner state, git backends, relay data, Gitea internals, or secrets.

This keeps the local deployment profile an adapter while improving
non-disposable repair behavior for existing operator worktrees.

## Impacted Modules/Files

- `apps/cli/src/deployment-repair-command.ts`
- `apps/cli/src/deployment-repair-command.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Detect missing standard `.entangle/host` skeleton directories when the Host
  state directory already exists.
- Add a safe `create_missing_host_state_directories` repair action.
- Apply that action only for compatible/readable Host state layouts.
- Leave unsupported/unreadable state layouts blocked for manual operator
  inspection.
- Record applied repair actions in the existing deployment repair trace file.

## Tests Required

- CLI repair helper test for dry-run detection of missing host-state
  directories.
- CLI repair helper test for `--apply-safe` directory creation and repair
  record emission.
- CLI lint and typecheck.
- Product naming check and diff whitespace check.

Verification performed:

- `pnpm --filter @entangle/cli test -- src/deployment-repair-command.test.ts`
- `pnpm --filter @entangle/cli lint`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm ops:check-product-naming`
- `git diff --check`

## Migration/Compatibility Notes

This is additive and safe. It only creates missing directories that are already
part of the current `.entangle/host` state skeleton.

## Risks And Mitigations

- Risk: repair masks an incompatible layout.
  Mitigation: unreadable, unsupported future, and unsupported legacy layout
  records return blocked manual actions before safe directory repair is
  considered.
- Risk: repair touches service-owned data.
  Mitigation: the action only calls `mkdir -p` for known Host state skeleton
  directories.

## Open Questions

None for this slice.
