# Product Naming Migration Slice

## Current Repo Truth

The federated pivot establishes a single product identity: Entangle.

Before this correction, the migration plan still preserved old local-product
markers as readable compatibility state. That is no longer acceptable for the
pivot. The repository must not carry a separate local product identity. A
single-machine deployment may use local relay and git services, but graph,
runner, identity, assignment, projection, and protocol semantics must remain
the same as any other federated deployment.

## Target Model

Entangle is the product. Local is only a deployment topology for running Host,
runners, relay, git, and Studio on one workstation.

New and current state must use:

- product marker: `"entangle"`;
- runtime profile: `"federated"`;
- local git/relay endpoints as ordinary resource profiles;
- local Docker and process launchers as deployment adapters only.

There is no retained compatibility product marker and no special graph/runtime
profile for local execution.

## Impacted Modules/Files

- `packages/types/src/common/topology.ts`
- `packages/types/src/graph/graph-spec.ts`
- `packages/types/src/host-api/status.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `services/host/src/*test.ts`
- `services/runner/src/*test.ts`
- `apps/cli/src/*`
- `apps/studio/src/*`
- `packages/host-client/src/*`
- `packages/package-scaffold/src/index.ts`
- `packages/validator/src/index.test.ts`
- `deploy/federated-dev/**`
- `scripts/*.mjs`
- `examples/federated-preview/**`
- `releases/**`
- `references/**`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this correction:

- state layout records parse only product marker `"entangle"`;
- newly materialized Host state and local repair-created state write
  `"entangle"`;
- runtime profile schema accepts only `"federated"`;
- graph defaults and package scaffolds default to `"federated"`;
- tests, examples, smoke fixtures, local git remote names, local Docker network
  names, backup bundle names, diagnostics names, preview container names, and
  workspace layout names no longer use the former local-product marker;
- the graph example formerly named as a local preview is now the
  deployment-agnostic Federated Preview under `examples/federated-preview/`;
- current docs describe same-machine execution as one federated deployment
  topology, not as a separate product or runtime mode.

Deferred to later slices:

- replace remaining runtimeRoot/contextPath-backed inspection APIs with
  projection-backed APIs;
- make the single-machine smoke use the same Host/runner control and observe
  protocol path as remote-machine smokes.

## Tests Required

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/types lint`
- `pnpm --filter @entangle/validator test`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host test`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner test`
- `pnpm --filter @entangle/runner lint`
- `pnpm --filter @entangle/host-client typecheck`
- `pnpm --filter @entangle/host-client test`
- `pnpm --filter @entangle/host-client lint`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli test`
- `pnpm --filter @entangle/cli lint`
- `pnpm --filter @entangle/studio typecheck`
- `pnpm --filter @entangle/studio test`
- `pnpm --filter @entangle/studio lint`
- `node --check scripts/federated-preview-demo.mjs`
- `node --check scripts/smoke-federated-dev-runtime.mjs`
- `pnpm --filter @entangle/cli dev validate package examples/federated-preview/agent-package`
- `pnpm --filter @entangle/cli dev validate graph examples/federated-preview/graph.json`
- `pnpm exec tsx -e "...validateDeploymentResourceCatalogDocument(...examples/federated-preview/catalog.model-stub.json...)"`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `git diff --check`
- no-hit search for the old product marker, old preview id/name, and any
  graph/runtime profile value that would imply same-host execution.

Verification record for the correction:

- Passed targeted package typecheck/test/lint for types, validator, host,
  runner, host-client, CLI, and Studio.
- Passed Federated Preview package, graph, and catalog validation.
- Passed `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `git diff --check`.
- Passed no-hit search for old local product markers, old preview names/ids,
  and local runtime profile values.

## End-Of-Slice Audit

The audit gate for this correction is:

```sh
rg "former-local-product-marker|runtimeProfile.*single-machine|contextPath|runtimeRoot|shared volume|effective-runtime-context|Docker" .
```

The former local-product marker is spelled indirectly above to avoid
reintroducing it into the corpus.

Valid remaining hits after this correction should be:

- `contextPath`, `runtimeRoot`, and `effective-runtime-context` only where the
  current local launcher and old inspection APIs still need migration;
- `Docker` only for the local deployment adapter, tests, and docs;
- `runtimeProfile.*single-machine` should have no hits.

## Migration Notes

There is no compatibility migration for old local-product state in this
pre-release branch. Existing development state should be regenerated.

## Risks And Mitigations

- Risk: old developer state no longer parses.
  Mitigation: pre-release branch; regenerate state.
- Risk: single-machine deployment accidentally becomes privileged architecture.
  Mitigation: keep relay/git endpoints as resource profiles and runners as
  assigned actors, even when all processes run on one host.

## Open Questions

No open question blocks this correction.
