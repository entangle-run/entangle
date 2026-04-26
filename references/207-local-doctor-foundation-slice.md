# Local Doctor Foundation Slice

Date: 2026-04-25.

## Purpose

This slice starts Entangle Local L4 reliability workstream C1 by adding a
read-only `entangle local doctor` CLI diagnostic.

The goal is not yet a full repair system. The goal is to give a local operator
one command that reports common Local readiness failures without mutating host
state, Docker state, git repositories, runtime workspaces, or wiki memory.

## Entry Audit

The audit read the mandatory repository state files:

- `README.md`;
- `resources/README.md`;
- `wiki/overview.md`;
- `wiki/index.md`;
- `wiki/log.md`;
- `references/180-local-ga-product-truth-audit.md`;
- `references/189-entangle-local-completion-plan.md`.

The implementation audit inspected:

- the existing `scripts/check-local-profile.mjs` preflight behavior;
- `scripts/local-profile-paths.mjs`;
- `deploy/local/README.md`;
- the CLI command topology in `apps/cli/src/index.ts`;
- existing CLI command/test patterns.

## Implemented Behavior

The CLI now exposes:

```bash
entangle local doctor
entangle local doctor --json
entangle local doctor --strict
entangle local doctor --skip-live
```

The doctor report includes severity-ranked checks for:

- required Local profile files;
- Node 22+;
- `pnpm`;
- Docker CLI, Docker Compose, Docker daemon, and Local Compose config;
- `entangle-runner:local` image presence;
- OpenCode executable availability;
- `.entangle/host` local state presence;
- live host status when a host client is available;
- live runtime workspace health from host runtime inspection;
- live runtime wiki repository initialization, clean working tree, branch, and
  HEAD commit checks when runtime context is available;
- host-managed git principal records;
- Studio, Gitea, and local relay reachability.

Default mode keeps optional local infrastructure failures as warnings so a
fresh checkout can still receive useful diagnostics. `--strict` escalates
optional infrastructure failures to failures for release and smoke preparation.
`--skip-live` keeps the command offline/read-only against local files and
local command availability.

## Boundary Decisions

The command is read-only. It does not start containers, build images, create
state, repair records, mutate graphs, or touch runtime workspaces.

The command complements the existing preflight script rather than replacing it.
The existing `pnpm ops:check-local:strict` command remains the deployment
preflight gate; `entangle local doctor` is the operator-facing diagnostic
surface that can also produce JSON.

## Remaining L4 Work

The remaining Local reliability implementation should add:

- conservative repair actions with dry-run previews;
- backup and restore bundles;
- local state layout migrations beyond the active version-1 compatibility
  marker and upgrade rehearsal checks;
- diagnostics/log bundle export with secret redaction;
- repeated-use, backup/restore, and repair smokes.

The doctor itself should also deepen over time with model-secret awareness,
OpenCode engine profile checks from host runtime context, wiki repository
repair/export guidance, and more explicit remediation for old local volumes.

## Verification

Focused verification performed during implementation:

```bash
pnpm --filter @entangle/cli typecheck
pnpm --filter @entangle/cli test -- --run src/local-doctor-command.test.ts
pnpm --filter @entangle/cli lint
pnpm --filter @entangle/cli dev local doctor --skip-live --json
git diff --check
pnpm --filter @entangle/cli build
pnpm build
CI=1 TURBO_DAEMON=false pnpm verify
```

The full build passed with only the existing Studio chunk-size warning.
