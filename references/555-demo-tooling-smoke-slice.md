# Demo Tooling Smoke Slice

## Current Repo Truth

The interactive User Node runtime demo is now the fastest way to see the
running graph participant path and, optionally, Studio. Its behavior is
implemented in `scripts/federated-user-node-runtime-demo.mjs`, but before this
slice there was no durable no-infrastructure smoke that checked the demo
wrapper's help and dry-run command assembly.

## Target Model

Demo launch tooling should be regression-checked without requiring Host,
runner, relay, Docker, Studio, or model credentials. The smoke should verify
that the operator-facing demo commands still expose the expected paths and
flags for base, Studio-enabled, fake OpenCode, and fake `external_http`
profiles.

## Impacted Modules And Files

- `scripts/smoke-demo-tools.mjs`
- `scripts/federated-user-node-runtime-demo.mjs`
- `package.json`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a root `ops:smoke-demo-tools` command.
- Add `scripts/smoke-demo-tools.mjs` with direct Node checks for syntax, help,
  default dry-run, Studio dry-run, fake OpenCode dry-run, and fake
  `external_http` dry-run.
- Keep the smoke no-infrastructure and no-credential by using dry-run paths
  only.

## Tests Required

- `node --check scripts/smoke-demo-tools.mjs`
- `node scripts/smoke-demo-tools.mjs`
- Focused script lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

This adds a new smoke command without changing runtime behavior. It can be run
through `pnpm ops:smoke-demo-tools` when `pnpm` is available, or directly with
`node scripts/smoke-demo-tools.mjs`.

## Risks And Mitigations

- Risk: the smoke gives false confidence about a full runtime demo.
  Mitigation: it is documented as a demo tooling smoke only; full runtime
  behavior remains covered by the process-runner smokes.
- Risk: command-output checks become brittle. Mitigation: checks target stable
  command fragments and flags, not full output snapshots.

## Open Questions

Future CI can include this smoke alongside distributed proof tooling checks.
It should not replace the real keep-running demo or process-runner runtime
smokes.

## Verification

Completed in this slice:

- `node --check scripts/smoke-demo-tools.mjs`
- `node scripts/smoke-demo-tools.mjs`
- `./node_modules/.bin/eslint scripts/smoke-demo-tools.mjs scripts/federated-user-node-runtime-demo.mjs --max-warnings 0`
- `node scripts/check-active-product-naming.mjs`
- `git diff --check`
- changed-diff local-assumption marker audit
