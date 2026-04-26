# Local Launcher Join Adapter Slice

## Current Repo Truth

The local Docker runtime backend still launches one runner container per active
node by injecting `ENTANGLE_RUNTIME_CONTEXT_PATH` and mounting the Host state
volume. That path is still the working Local adapter and is required until the
federated materializer can fetch Host-signed graph/resource state and start the
node runtime from an assignment.

After Slice 6, the runner binary can also start in generic `join` mode from a
small `runner-join.json` document. Host did not yet write that document for
materialized local runtimes, and the Docker backend had no way to choose the
generic join bootstrap path.

## Target Model

Local deployment should become an adapter over the same runner bootstrap shape
used by remote machines:

- Host materializes local compatibility context for the current Federated dev profile;
- Host also writes a runner join config beside the local context;
- Docker can launch the runner in `local-context` mode or `join` mode;
- `local-context` remains the default until assignment materialization and Host
  control publish are complete;
- `join` mode is available as an explicit bridge for the next slices.

This keeps local working while reducing the amount of architecture that only
exists because Host and runner share a filesystem.

## Impacted Modules/Files

- `services/host/src/state.ts`
- `services/host/src/runtime-backend.ts`
- `services/host/src/runtime-backend.test.ts`
- `services/host/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- write `runner-join.json` beside `effective-runtime-context.json` for
  materialized local runtimes when relay URLs are available;
- derive join config from real runtime context, runner identity, relay profiles,
  engine kind, and Host Authority pubkey;
- remove stale join config when a node no longer has a realizable runtime
  context;
- pass the join config path into the runtime backend when it exists;
- add `ENTANGLE_DOCKER_RUNNER_BOOTSTRAP=join` support to Docker backend;
- in join bootstrap mode, set `ENTANGLE_RUNNER_JOIN_CONFIG_PATH` instead of
  `ENTANGLE_RUNTIME_CONTEXT_PATH`;
- label Docker containers with the active runner bootstrap mode and join config
  path;
- keep `local-context` as the default Docker mode;
- add Host and Docker backend tests for join config materialization and join
  bootstrap container creation.

Deferred to the next slices:

- automatic Host Nostr publishing of assignment offers to trusted runners;
- federated runner materializer that turns assignments into local runtime
  context without Host filesystem reads;
- switching the default local Docker path from `local-context` to `join`.

## Tests Required

- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host test`
- `pnpm --filter @entangle/host lint`
- `pnpm typecheck`
- `git diff --check`

Verification record for the implemented slice:

- `pnpm --filter @entangle/host typecheck` passed;
- `pnpm --filter @entangle/host test -- runtime-backend.test.ts` passed and
  exercised the host test suite in this package;
- `pnpm --filter @entangle/host test` passed;
- `pnpm --filter @entangle/host lint` passed;
- `pnpm typecheck` passed;
- `git diff --check` passed.

## End-Of-Slice Audit

The expected local-assumption hits in this slice are intentional adapter
boundaries:

- `ENTANGLE_RUNTIME_CONTEXT_PATH` remains valid for the default local Docker
  adapter;
- `effective-runtime-context.json` remains a compatibility artifact;
- Docker shared state volume references remain local deployment mechanics.

The new join path is explicitly gated behind
`ENTANGLE_DOCKER_RUNNER_BOOTSTRAP=join` and does not become the canonical
federated runtime model until control publish and assignment materialization are
implemented.

Added local-assumption hits were reviewed and classified as valid local adapter
or test-fixture usage. The slice intentionally touches Docker,
`contextPath`, and `effective-runtime-context.json` compatibility paths, but
does not make them canonical for the federated model.

## Migration/Compatibility Notes

No existing Local behavior changes by default. Operators can opt in to the
generic runner launch path for experiments:

```bash
ENTANGLE_DOCKER_RUNNER_BOOTSTRAP=join
```

The runner will start in join mode only when Host has written
`runner-join.json`. If no relay profile exists, Host keeps the Local context
path but does not create a join config.

## Risks And Mitigations

- Risk: join mode is mistaken for complete federated execution.
  Mitigation: the default remains `local-context`, and the slice record states
  that assignment materialization is still pending.
- Risk: join config trusts the wrong identity.
  Mitigation: Host writes the Host Authority pubkey separately from the runner
  identity pubkey.
- Risk: containers are not recreated when bootstrap mode changes.
  Mitigation: Docker labels and required env vars include bootstrap mode and
  join config path.
- Risk: graphs without relay URLs fail Local runtime materialization.
  Mitigation: join config generation is skipped when no relay URLs are present.

## Open Questions

No open question blocks this slice. The next slice should connect Host control
publishing to assignment offers and hello acknowledgements, or implement the
runner materializer first if execution is the critical path.
