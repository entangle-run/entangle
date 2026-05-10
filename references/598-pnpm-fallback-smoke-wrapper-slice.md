# Pnpm Fallback Smoke Wrapper Slice

## Current Repo Truth

The root `package.json` smoke commands are usually launched through pnpm, but
this workspace is also commonly driven through `npm exec --yes pnpm@10.18.3 --`
when pnpm is not installed globally. Several Node smoke/operator wrapper
scripts still spawned `pnpm` directly. In that environment the child process
failed with `spawnSync pnpm ENOENT` even though the parent command had already
resolved the pinned pnpm package.

## Target Model

Smoke and demo wrappers should not require a global pnpm binary. They should
reuse the current pnpm executable when running inside pnpm, and otherwise fall
back to the repository-pinned `npm exec --yes pnpm@10.18.3 --` invocation.

This is tooling portability only. It does not change runtime protocol,
federation boundaries, Host authority, runner assignment, or model-engine
behavior.

## Impacted Modules And Files

- `scripts/pnpm-runner.mjs`
- `scripts/check-federated-dev-profile.mjs`
- `scripts/smoke-deployment-service-volume-tools.mjs`
- `scripts/smoke-federated-control-plane.mjs`
- `scripts/smoke-federated-process-runner.mjs`
- `scripts/smoke-federated-live-relay.mjs`
- `scripts/smoke-federated-dev-runtime.mjs`
- `scripts/smoke-federated-dev-diagnostics.mjs`
- `scripts/smoke-federated-dev-reliability.mjs`
- `scripts/smoke-federated-dev-profile-disposable.mjs`
- `scripts/federated-preview-demo.mjs`
- `scripts/federated-user-node-runtime-demo.mjs`
- `scripts/federated-distributed-proof-kit.mjs`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a shared script helper that resolves the pnpm invocation.
- Use `process.env.npm_execpath` when the current process is already running
  under pnpm.
- Fall back to `npm exec --yes pnpm@10.18.3 --` otherwise.
- Replace direct `spawnSync("pnpm", ...)` smoke wrappers with the helper.
- Replace direct demo/proof-kit pnpm child launches with the helper.
- Update the federated-dev preflight so `pnpm:available` checks the same
  fallback path instead of requiring a global binary.

## Tests Required

- Reproduce the old failure by running a smoke wrapper in an environment with
  no global `pnpm` on PATH.
- Verify `scripts/smoke-deployment-service-volume-tools.mjs` passes.
- Verify the root package script `ops:smoke-deployment-service-volume-tools`
  passes through `npm exec --yes pnpm@10.18.3 --`.
- Verify `scripts/check-federated-dev-profile.mjs` reports `pnpm:available`
  through the fallback path.
- Syntax-check every modified `.mjs` wrapper with `node --check`.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

No migration is required. Environments with global pnpm keep using pnpm
directly through `npm_execpath` when applicable. Environments without global
pnpm can run the same root package scripts through npm's package executor.

## Risks And Mitigations

- Risk: npm is also unavailable.
  Mitigation: Node/npm are already part of the repository prerequisites; the
  fallback only removes the need for a globally installed pnpm binary.
- Risk: wrapper output becomes confusing because the printed command still says
  `pnpm`.
  Mitigation: user-facing commands remain documented as pnpm commands while the
  process helper handles portability internally.
- Risk: generated proof-kit scripts still expect pnpm on target machines.
  Mitigation: this was the remaining gap after this slice and is now closed by
  [600-distributed-proof-generated-pnpm-fallback-slice.md](600-distributed-proof-generated-pnpm-fallback-slice.md).

## Open Questions

No product question blocks this tooling hardening. Future cleanup can move all
script child-process helpers into a broader operations utility module if the
script surface grows further.

## Verification

Completed in this slice:

- RED: `node scripts/smoke-deployment-service-volume-tools.mjs` failed with
  `spawnSync pnpm ENOENT`.
- GREEN: `node scripts/smoke-deployment-service-volume-tools.mjs`
- `node scripts/check-federated-dev-profile.mjs`
- `node scripts/smoke-federated-dev-runtime.mjs --help`
- `pnpm ops:smoke-deployment-service-volume-tools` through
  `npm exec --yes pnpm@10.18.3 --`
- `pnpm ops:smoke-distributed-proof-tools` through
  `npm exec --yes pnpm@10.18.3 --`
- `node --check` for all modified `.mjs` scripts
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit over touched scripts and docs
