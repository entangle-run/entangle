# Runtime Restart Slice

## Summary

Completed the next host control-plane runtime slice by adding a first-class
runtime restart surface through `entangle-host`, the shared `host-client`, and
the CLI.

The implemented surface is:

- `POST /v1/runtimes/{nodeId}/restart`

This slice does **not** treat restart as an alias for `start`.

Instead it freezes a stronger rule:

- restart is a distinct operator intent;
- restart keeps the desired state at `running`;
- restart increments a persistent `restartGeneration`;
- runtime backends must treat a changed restart generation as a forced
  recreation signal.

## Semantics frozen by this slice

### Restart intent model

- every runtime intent now carries `restartGeneration`;
- runtime inspection now exposes `restartGeneration`;
- existing runtime-intent records remain readable through the default
  generation `0`;
- `start` and `stop` preserve the current restart generation;
- `restart` increments the generation monotonically and writes a new intent.

### Conflict semantics

- missing runtime in the active graph -> `404 not_found`
- runtime exists but context is not realizable -> `409 conflict`
- successful restart request -> `200` with updated runtime inspection

This keeps restart aligned with the already established runtime start semantics
instead of smuggling hidden backend behavior behind a no-op `running -> running`
mutation.

### Backend semantics

- runtime backends now receive `restartGeneration` as part of reconcile input;
- the Docker backend persists restart generation in container labels;
- a restart-generation mismatch now forces container recreation even when graph
  revision, runtime context path, and secret environment are unchanged;
- this makes restart deterministic and auditable instead of heuristic.

## Event surface

This slice adds a typed runtime event:

- `runtime.restart.requested`

with:

- `graphId`
- `graphRevisionId`
- `nodeId`
- `previousRestartGeneration`
- `restartGeneration`

This is intentionally separate from `runtime.desired_state.changed`, because a
restart can leave the desired state unchanged while still requiring a
meaningful runtime mutation.

## Testing and verification

This slice was closed only after:

- typed contract coverage for the new runtime event;
- host-client parsing coverage for restart responses;
- Docker runtime-backend tests proving restart-generation-triggered recreation;
- host integration tests for:
  - successful restart;
  - emitted restart event;
  - `409` restart rejection when context is unavailable;
- full workspace verification through `pnpm verify`;
- diff hygiene through `git diff --check`.

## Outcome

The host control plane now has:

- graph inspection and revision history;
- managed node inspection and mutation;
- edge inspection and mutation;
- runtime inspection, start, stop, and deterministic restart;
- shared event streaming.

The next best host-control-plane slices are now:

1. richer reconciliation and degraded-state semantics;
2. deeper host event widening into session and runner activity;
3. stronger runtime restart, failure, and recovery diagnostics.
