# Runtime Artifact Detail Inspection Slice

## Summary

This slice adds a resource-specific host read boundary for one persisted
runtime artifact.

The repository already exposed runtime artifact lists through
`GET /v1/runtimes/{nodeId}/artifacts`. That was enough for panels and bulk
inspection, but artifact governance also needs a stable address for a single
artifact record. The new boundary keeps artifacts host-readable without giving
clients direct filesystem knowledge of runner-local artifact stores.

## Implemented Behavior

- `packages/types` now defines `RuntimeArtifactInspectionResponse`.
- `entangle-host` now exposes:
  - `GET /v1/runtimes/{nodeId}/artifacts/{artifactId}`
- The route returns `{ artifact }` using the canonical `ArtifactRecord`
  contract.
- Missing runtimes still return a structured `not_found` host error.
- Runtimes without realizable context still return a structured conflict.
- Missing artifact ids under an otherwise available runtime return a structured
  `not_found` host error.
- `packages/host-client` now exposes `getRuntimeArtifact(nodeId, artifactId)`.
- The CLI now exposes:
  - `entangle host runtimes artifact <nodeId> <artifactId>`

## Design Notes

This is intentionally read-only. The slice does not add artifact deletion,
retention policy, lifecycle mutation, promotion, or approval semantics.

The host remains the inspection boundary. CLI and future Studio detail views
should consume the shared host client rather than reading runner artifact files
directly.

## Validation

Focused validation run:

- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/host test`
- `pnpm --filter @entangle/host-client test`
- `pnpm --filter @entangle/cli typecheck`

Added coverage verifies:

- the single-artifact response parses through the canonical type layer;
- the host returns the expected artifact detail response;
- missing artifact ids produce structured `not_found` errors;
- the shared host client calls the expected detail URL and parses the response.

## Resulting State

Runtime artifacts now have both a collection read boundary and an item read
boundary. This gives later artifact governance work a stable resource shape for
retention, approval, promotion, and cross-runtime handoff inspection.
