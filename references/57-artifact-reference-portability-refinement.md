# Artifact Reference Portability Refinement

This refinement closes an important contract-quality gap in the first artifact
slice.

## Problem

The initial git artifact implementation stored `repoPath` directly inside the
git `ArtifactRef` locator.

That was convenient for the first local slice, but it was the wrong long-term
boundary because:

- `ArtifactRef` is emitted over the protocol and should remain portable;
- a runtime-local filesystem path is not a portable retrieval address;
- leaking local host paths into protocol-visible refs is unnecessary and
  conceptually wrong;
- remote publication and cross-node handoff would otherwise be forced to carry
  a locator field that is only meaningful on the producing host.

## Decision

Entangle now distinguishes more sharply between:

- `ArtifactRef`
  protocol-facing, backend-typed, portable enough for messaging and handoff;
- `ArtifactRecord`
  the persisted local record of that artifact, including runtime-local
  materialization details when useful.

For the current git slice:

- `ArtifactRef.locator` carries `branch`, `commit`, `gitServiceRef`,
  `namespace`, and `path`;
- runtime-local filesystem details move to
  `ArtifactRecord.materialization`, currently including `repoPath` and
  `localPath`.

## Why this is the better boundary

This keeps the artifact model clean in three ways:

1. protocol payloads no longer expose local filesystem internals;
2. host and Studio can still inspect the local materialization through the
   persisted record;
3. the future remote publication slice can extend portable git locator data
   without first undoing a local-path leak in the public contract.

## Implementation impact

The refinement now applies across:

- `packages/types`
  updated git locator and artifact record schemas;
- `services/runner`
  produced artifact refs are portable, while materialization metadata is stored
  only on the persisted record;
- `services/host`
  runtime artifact inspection returns the persisted records with local
  materialization metadata;
- `packages/host-client`
  runtime artifact inspection continues to parse the persisted record shape;
- tests
  now assert that `repoPath` is no longer present in the emitted git
  `ArtifactRef` locator.

## Result

The first artifact slice remains fully functional, but the contract is now
cleaner and safer:

- local artifact inspection still works;
- protocol-visible artifact refs are more portable;
- future remote git publication has a better foundation.
