# Federated Runtime Filesystem Read Quarantine Slice

## Current Repo Truth

Host still needs to build semantic runtime contexts for graph validation,
bootstrap bundles, local launcher adapters, and assignment materialization.
That is different from Host reading a running federated node's runtime
filesystem as the public source of truth.

Before this slice, several public runtime read models merged runner-observed
projection with records read from `context.workspace.runtimeRoot` whenever a
Host-side context existed. In the process-runner topology, Host and runner have
separate state roots, so projection usually won. The model was still too loose:
an assigned federated runtime could have Host-local stale runtime files that
shadowed runner-signed observations.

## Target Model

For accepted federated runtime assignments:

- Host may still keep semantic context for bootstrap and resource resolution;
- public runtime details must come from signed observations and projection;
- Host must not read `runtimeRoot` records as authoritative runtime state.

For non-federated/local adapter runtimes, the existing filesystem-backed read
path remains available until equivalent projection/backend services replace it.

## Impacted Modules/Files

- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a Host-internal `getRuntimeFilesystemContext` helper.
- Return no filesystem context when the runtime inspection is backed by an
  accepted federated assignment.
- Use that helper for public deep runtime read paths that previously read
  `runtimeRoot` records:
  - artifacts and artifact preview/history/diff;
  - runtime memory pages;
  - approvals;
  - source-change candidates, diff, and file preview;
  - source-history records;
  - turns.
- Stop Host filesystem activity synchronization and session inspection from
  reading runtime files for federated runtime projections.
- Add a regression test proving a stale Host-local artifact record cannot
  shadow a runner-projected artifact once the runtime is assigned to a
  federated runner.

## Tests Required

- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host test -- src/index.test.ts`
- `pnpm ops:smoke-federated-process-runner -- --timeout-ms 60000`
- `pnpm verify`

## Migration/Compatibility Notes

This is a behavior tightening for federated assignments only. Local adapter
runtime reads remain intact for unassigned/non-federated runtime backends.

The change does not remove Host semantic runtime context generation. Runners
still need bootstrap bundles, and Host still needs context to resolve graph,
resource, package, and identity metadata.

## Risks And Mitigations

- Risk: a federated runtime without observations returns sparse read models.
  Mitigation: that is correct; the runner must emit observations for Host to
  project runtime truth.
- Risk: local adapter reads are accidentally disabled.
  Mitigation: only inspections whose backend kind is `federated` are excluded
  from filesystem read context.
- Risk: direct session inspection misses federated runtime records that used to
  be imported from files.
  Mitigation: federated sessions are already projected through signed
  `session.updated`, turn, approval, artifact, and conversation observations.

## Open Questions

- Should the remaining local adapter filesystem read paths be moved behind an
  explicit adapter namespace before the three-machine proof?
- Should Host expose a diagnostic that reports when a federated runtime has no
  projected observations yet, instead of returning sparse lists?
