# Local Runtime Profile Rename Slice

Date: 2026-04-25.

## Scope

This slice completes Entangle completion workstream A1 and the current
documentation part of A2.

Implemented:

- renamed the active runtime profile machine value from the retired pre-federated profile literal to
  `local`;
- updated the runtime profile schema and graph defaults;
- updated package scaffolding so new packages emit `runtimeProfile: "federated"`;
- migrated active Federated Preview graph and package assets;
- migrated active smoke scripts and tests;
- updated current product documentation to use Entangle scope language;
- corrected the Local release index so L2 is listed as released and the next
  planned train is L3 Agentic Node Runtime, L4 Local Reliability, and L5
  Entangle GA.

Not changed:

- historical release packets that mention the retired pre-federated profile literal as the machine
  value used at the time of earlier releases;
- historical hackathon specification documents;
- Cloud or Enterprise scope.

## Decision

The canonical active machine value is `local`.

Rationale:

- it matches the active product line, Entangle;
- it does not imply GA status;
- it remains durable after Entangle GA, avoiding a second rename from
  `local_operator` to `local`;
- it removes obsolete hackathon wording from active contracts.

## Constraints Applied

- Historical records remain historical.
- Current product surfaces must not emit the retired pre-federated profile literal.
- The change stays inside the graph/runtime profile contract and does not
  widen Cloud, Enterprise, or agent-engine scope.
- Focused tests must cover the touched schema, validator, host-client, CLI,
  Studio, host, runner, package scaffold, and smoke fixture surfaces.

## Verification

Verification passed with:

```bash
git diff --check
pnpm --filter @entangle/types test
pnpm --filter @entangle/validator test
pnpm --filter @entangle/package-scaffold test
pnpm --filter @entangle/host-client test
pnpm --filter @entangle/cli test
pnpm --filter @entangle/studio test
pnpm --filter @entangle/host test
pnpm --filter @entangle/runner test
node --check scripts/smoke-federated-dev-runtime.mjs
pnpm --filter @entangle/types build
pnpm --filter @entangle/validator build
pnpm --filter @entangle/cli dev validate package examples/federated-preview/agent-package
pnpm --filter @entangle/cli dev validate graph examples/federated-preview/graph.json
pnpm verify
pnpm build
```

The first CLI validation attempts failed under the local sandbox because `tsx`
could not open its temporary IPC pipe. The graph and package validations passed
when rerun outside the sandbox. The first graph validation also exposed stale
ignored `dist/` output from workspace packages; rebuilding `@entangle/types`
and `@entangle/validator` resolved that local build artifact issue before the
final validation pass.
