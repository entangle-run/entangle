# Host Smoke Script Lint Coverage Slice

## Current Repo Truth

The process-runner smoke is a core federated proof, but `@entangle/host` lint
previously covered only `src`. Running ESLint directly on the TypeScript smoke
script failed because `services/host/scripts/*.ts` was outside the typed ESLint
project-service default project. Once enabled, lint found real issues in the
smoke script: dynamic `import()` type annotations, an unsafe relay preflight
message parse, and unresolved git artifact locator access.

## Target Model

Host TypeScript smoke scripts should be part of the normal host lint gate. The
process proof should keep type-aware lint coverage because it exercises the
federated runtime contract more directly than many unit tests.

## Impacted Modules/Files

- `eslint.config.mjs`
- `services/host/package.json`
- `services/host/scripts/federated-process-runner-smoke.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `services/host/scripts/*.ts` to ESLint's typed default-project coverage.
- Extend `@entangle/host` lint to cover `scripts`.
- Replace dynamic import type annotations with static type imports.
- Make relay preflight frame type narrowing explicit.
- Add a structural git artifact identity reader before using projected wiki
  artifact commit values.

## Tests Required

- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/host typecheck`
- `node --check scripts/smoke-federated-process-runner.mjs`

## Migration/Compatibility Notes

This strengthens local verification only. Runtime behavior and public APIs are
unchanged.

## Risks And Mitigations

- Risk: adding scripts to lint exposes existing script debt.
  Mitigation: fix the process-runner smoke immediately and keep the lint scope
  focused on host TypeScript scripts.

## Open Questions

- Other packages can add script lint coverage when they gain TypeScript
  operational scripts.
