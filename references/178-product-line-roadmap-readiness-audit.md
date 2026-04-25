# Product-Line Roadmap Readiness Audit

Date: 2026-04-25.

## Purpose

This audit checks whether the repository is internally consistent enough to
start executing the final three-product roadmap without carrying known planning
or documentation drift into implementation.

## Scope

The audit covered:

- `README.md`;
- `resources/README.md`;
- `wiki/overview.md`;
- `wiki/index.md`;
- `wiki/log.md`;
- `references/174-definitive-production-delivery-roadmap.md`;
- `references/177-r1-local-operator-release-ledger.md`;
- root package scripts and workspace boundaries;
- code markers for skipped tests, TODO/FIXME debt, and not-implemented paths;
- current test-file coverage surface under `apps`, `packages`, and `services`.

## Findings And Fixes

### 1. Product naming drift

Severity: high.

The roadmap still used three planning labels that no longer match the accepted
product line:

- `Entangle Local Pro`;
- `Entangle Cloud / LatticeOps SaaS`;
- `Entangle Enterprise Self-Hosted`.

Fix: current release claims now use only:

- Entangle Local;
- Entangle Cloud;
- Entangle Enterprise.

The roadmap now also states that `LatticeOps` is the imported redesign corpus,
not a product name.

### 2. Release naming drift

Severity: medium.

The roadmap mixed the old R-series production roadmap, the newer Local L-series
release train, and the existing `R1` release ledger.

Fix: the roadmap now treats `L1 Local Operator Baseline` as the first Local
release and explicitly records that the historical `R1` ledger is the
release-control ledger for that L1 milestone.

### 3. Documentation alignment

Severity: medium.

README, wiki overview, wiki log, roadmap, and the R1 ledger did not all agree
on the final product sequence.

Fix: the canonical current-state docs now sequence:

1. finish Entangle Local through its incremental Local releases;
2. start Entangle Cloud only after Local GA;
3. start Entangle Enterprise only after the Cloud production core is stable
   enough to package for customer-operated environments.

### 4. Code readiness

Severity: low for starting the roadmap, medium before Local GA.

The codebase already has the package boundaries and local runtime surface
needed to start L1 release closure:

- shared contracts in `packages/types`;
- semantic validation in `packages/validator`;
- host client helpers in `packages/host-client`;
- provider execution boundary in `packages/agent-engine`;
- local package scaffold in `packages/package-scaffold`;
- host, runner, CLI, Studio, deployment, preflight, and smoke scripts.

The audit found no skipped tests, TODO/FIXME markers, or `not implemented`
markers under the active application, package, service, deployment, and script
trees. The repository currently has 53 source test files under `apps`,
`packages`, and `services`.

One code naming issue remains intentionally deferred: the current machine
contract still exposes `hackathon_local` as the only runtime profile. That is
not a current product-name claim, but it should be reconsidered before Local
Workbench or Local GA so the productized Local profile does not inherit
obsolete hackathon wording.

## Remaining L1 Release Blockers

The repository is ready to begin the L1 release-closure implementation loop,
but L1 is not ready to tag until:

- the R1/L1 release note exists;
- the release note records exact verification and smoke evidence;
- `pnpm verify` passes for the final release batch;
- `pnpm ops:check-local:strict` passes or records a concrete local blocker;
- the strongest feasible local smoke passes or is explicitly deferred with a
  release-note reason;
- `git status --short` is clean or only explicitly deferred user work remains.

## Audit-Time Verification

The audit reran the readiness gates that are useful before starting the plan:

- `git diff --check`: passed;
- `pnpm verify`: passed;
- `pnpm ops:check-local:strict`: passed with Docker socket access.

The initial sandboxed preflight attempt failed only because the sandbox could
not access `/Users/vincenzo/.docker/run/docker.sock`. The same preflight passed
after running with Docker access, so the failure is classified as an execution
environment constraint, not a repository defect.

## Readiness Decision

The plan is now coherent enough to start implementation of the roadmap.

The immediate next slice remains L1 release closure. The first implementation
work after this audit should create the R1/L1 release note, rerun verification
and local preflight, run the strongest feasible local smoke, update the ledger
with command evidence, and tag only if every L1 gate is met.
