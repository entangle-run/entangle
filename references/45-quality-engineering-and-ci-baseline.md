# Quality Engineering and CI Baseline

This document defines the minimum engineering-quality baseline that Entangle
should maintain from this point onward.

## Principle

Entangle should not rely on human memory, taste, or vigilance alone to remain
high quality.

The repository should encode quality expectations directly into:

- project rules;
- machine-enforced checks;
- test coverage of critical contracts;
- CI automation.

## Audit scope

A serious audit for Entangle must evaluate four dimensions together:

1. consistency;
2. code quality;
3. architectural cleanliness;
4. operational readiness.

An audit is incomplete if it only checks whether files agree with one another.
It must also check whether the code and tooling are professional enough for the
project phase.

## Required local gates

The local baseline now includes:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `git diff --check`

For coherent code or tooling batches, `pnpm verify` is the default aggregate
gate.

The root `pnpm test` gate intentionally runs Turbo test tasks with
`--concurrency=1`. The repository favors deterministic aggregate verification
over parallel speed because package-local Vitest runs can pass independently
while concurrent aggregate execution may leave a frontend test process open.

When workspace packages depend on one another through canonical contracts, the
repository must model that build graph explicitly instead of relying on an
opaque pre-build step.

The current baseline does that through:

- TypeScript project references for the composite packages and services;
- a root solution config used by `tsc -b` for workspace-wide type safety;
- a separate Studio typecheck path kept outside the composite solution because
  it remains a bundler-driven browser surface.

Package-local tests should also avoid silently relying on stale built `dist/`
artifacts from sibling workspace packages. The current baseline therefore uses
a shared root Vitest config with explicit workspace-source aliases, so package
tests exercise current contracts from source instead of whatever old build may
happen to be present on disk.

Package-local typed linting over tests must follow the same rule. The current
baseline therefore uses a dedicated root `tsconfig.eslint.json` with explicit
workspace-source path mappings, so test files lint against current sibling
sources rather than stale published-style `dist/` declarations.

## What lint must mean

`lint` must be a real static-quality pass, not a disguised typecheck.

The current baseline uses:

- ESLint 9 flat config;
- TypeScript-aware linting;
- React-specific linting for Studio.

Lint should catch quality regressions such as:

- unsafe typing patterns;
- needless assertions;
- broken async usage;
- dead imports or variables;
- React surface mistakes that TypeScript alone does not catch.

## What tests must cover first

The first serious tests should focus on contracts and control-plane behavior,
not on vanity coverage numbers.

The current initial test scope is:

- validator semantics that can silently admit invalid graph state;
- host-client behavior around error handling and response parsing;
- package scaffolding contract generation;
- host API behavior for invalid and missing inputs.

## CI baseline

The repository should have a default CI workflow that runs on pushes to `main`
and on pull requests.

The minimum CI job should run:

- dependency installation with the repository package manager;
- lint;
- typecheck;
- tests;
- build.

CI should be simple, strict, and boring. The goal is not an elaborate pipeline.
The goal is to ensure the repository cannot drift into an unverified state.

## CD stance

Continuous deployment is intentionally not part of the current baseline.

Entangle does not yet expose a stable deployable product surface, and premature
CD would create more ceremony than value. CI is required now. CD should be
introduced only once real runtime environments, secrets handling, and release
targets are stable enough to deserve it.

## Near-term expectations

From this point forward, code batches should normally do all of the following:

- preserve or improve repository coherence;
- add or update tests when behavior changes materially;
- keep lint and typecheck clean;
- keep the CI workflow green;
- leave behind fewer ambiguous boundaries than before.
