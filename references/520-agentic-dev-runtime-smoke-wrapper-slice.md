# Agentic Dev Runtime Smoke Wrapper Slice

## Current Repo Truth

The active `ops:smoke-federated-dev:runtime` command still executed the older
Docker-managed runtime smoke that used a credential-checking model fixture
behind the model endpoint catalog. That path was useful earlier, but it no
longer represented the current product boundary where every active agent node
executes through an agent engine profile and OpenCode is the default engine.

The current process-runner smoke already proves the target path: Host
Authority, joined runners, User Node Human Interface Runtimes, signed User Node
messages, OpenCode permission approval bridging, artifact/source/wiki
projection, and User Client JSON routes without live model-provider
credentials.

## Target Model

The public federated dev runtime smoke should exercise the current agentic node
runtime path by default. The command name may remain as an operator
compatibility entry point, but it must delegate to the process-runner smoke
with a deterministic fake OpenCode attached server unless the operator selects
another supported fake engine.

## Impacted Modules/Files

- `scripts/smoke-federated-dev-runtime.mjs`
- `scripts/federated-preview-demo.mjs`
- `README.md`
- `deploy/federated-dev/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Replace the old stateful runtime smoke body with a small wrapper around
  `services/host/scripts/federated-process-runner-smoke.ts`.
- Default the wrapper to `--use-fake-opencode-server`.
- Preserve operator-compatible flags such as `--relay-url`, `--timeout-ms`,
  `--keep-running`, `--keep-temp`, and the old preview caller flag.
- Remove preview-demo cleanup for the old model fixture container.
- Update active README/deployment/wiki wording so the runtime smoke is
  described as an agentic engine smoke, not a model endpoint smoke.

## Tests Required

- `node --check scripts/smoke-federated-dev-runtime.mjs`
- `node --check scripts/federated-preview-demo.mjs`
- `node scripts/smoke-federated-dev-runtime.mjs --help`
- `pnpm ops:check-product-naming`
- `git diff --check`

## Migration/Compatibility Notes

The command name remains available. Operators who used
`pnpm ops:smoke-federated-dev:runtime` now get the current fake-OpenCode
agentic runtime proof against the configured relay instead of the retired model
endpoint fixture path.

## Risks And Mitigations

- Risk: the command no longer exercises Docker-managed Host/runner containers.
  Mitigation: the disposable deployment profile smoke still starts the Compose
  profile; this command now validates the current agentic node runtime path
  through Host, joined runners, relay, User Client, and projection.
- Risk: old preview callers pass now-irrelevant flags.
  Mitigation: the wrapper accepts and ignores the old preview flag and old
  polling/host URL flags.

## Verification

Completed for this slice:

- `node --check scripts/smoke-federated-dev-runtime.mjs`
- `node --check scripts/federated-preview-demo.mjs`
- `node scripts/smoke-federated-dev-runtime.mjs --help`
- `pnpm ops:smoke-federated-dev:runtime -- --help`
- `pnpm ops:smoke-federated-dev:runtime -- --timeout-ms=60000`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff audit for old local-only product/runtime markers

## Open Questions

No product question blocks retiring the public model-endpoint smoke path.
