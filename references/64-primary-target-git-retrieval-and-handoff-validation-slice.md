# Primary-Target Git Retrieval And Handoff Validation

This document records the slice that extends Entangle from remote git
publication into the first real downstream retrieval path.

The scope of this slice is deliberately narrow and explicit:

- it supports retrieval of published git artifacts from the receiving node's
  resolved primary repository target;
- it validates git handoff compatibility before retrieval;
- it persists retrieval success and failure as artifact-local state;
- it passes retrieved local artifact inputs into the engine turn request;
- it does not yet widen retrieval to non-primary repositories or service-side
  provisioning flows.

## 1. Why this slice landed now

The previous slices had already closed four prerequisite boundaries:

1. git principal and secret delivery resolution;
2. deterministic primary repository-target resolution;
3. publication-state persistence on artifact records;
4. remote publication to preexisting repositories.

That meant the next correct capability move was to let a downstream runner
consume a published git-backed artifact through a disciplined local retrieval
path instead of merely forwarding portable refs.

## 2. What changed in the contracts

Three shared contracts were extended:

1. git artifact locators now support `repositoryName`, which is required for
   meaningful downstream repository validation;
2. artifact records now support explicit `retrieval` metadata with `retrieved`
   and `failed` states;
3. engine turn requests now support `artifactInputs`, which are local,
   runtime-materialized artifact surfaces derived from inbound refs.

The workspace layout was also widened with an explicit `retrievalRoot` so the
runner no longer needs ad hoc retrieval-cache paths.

## 3. Runtime validation behavior

The validator now owns a runtime-facing handoff check for inbound artifact
refs.

For the current retrieval slice, a git handoff is valid only if:

- the artifact ref is already `published`;
- the locator includes `gitServiceRef`, `namespace`, and `repositoryName`;
- the receiving runtime is bound to that git service;
- the locator matches the runtime's resolved primary repository target.

This is intentionally strict. It avoids hidden fallback behavior and makes the
current implementation boundary explicit:

- primary graph-shared repository retrieval: supported;
- arbitrary repository retrieval across the same service: not yet supported;
- service-provisioned repository creation: not yet supported.

## 4. Runner behavior

Before building the engine turn request, the runner now:

1. validates inbound artifact refs against the receiving runtime context;
2. retrieves supported git artifacts into `workspace.retrievalRoot`;
3. persists retrieval-state artifact records;
4. records consumed artifact ids on the runner turn record;
5. injects local artifact inputs into the engine turn request.

Successful retrieval writes:

- `ArtifactRecord.retrieval.state = "retrieved"`
- `ArtifactRecord.materialization.localPath`
- `ArtifactRecord.materialization.repoPath`

Failed retrieval writes:

- `ArtifactRecord.retrieval.state = "failed"`
- `ArtifactRecord.retrieval.lastAttemptAt`
- `ArtifactRecord.retrieval.lastError`

Retrieval failure is blocking for the turn. The runner keeps that failure
explicit instead of silently degrading to a ref-only execution path.

## 5. Verification closed in this slice

This slice is covered by:

- shared type-contract tests for retrieval metadata;
- validator tests for runtime artifact handoff rules;
- runner tests for:
  - successful retrieval from a controlled primary bare repository;
  - engine request population with local artifact inputs;
  - persisted retrieval failure when an inbound git handoff is invalid.

The repository-wide `pnpm verify` gate was rerun successfully after the slice.

## 6. What remains after this slice

Git collaboration is materially stronger now, but still incomplete.

The highest-value remaining work in the git collaboration track is:

- repository provisioning for primary targets that declare `gitea_api`;
- widening retrieval beyond the current primary-target-only policy where the
  design calls for it;
- richer handoff flows across more than one repository target.

The next implementation order should therefore treat repository provisioning as
the next git-collaboration slice before moving on to broader runtime widening.
