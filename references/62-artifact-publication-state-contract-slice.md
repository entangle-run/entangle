# Artifact Publication State Contract Slice

This document records the slice that closes a missing contract between local
artifact materialization and future remote publication.

Before this batch, Entangle could already:

- materialize git-backed report artifacts locally;
- persist them as `ArtifactRecord`s;
- mark them as `status: "materialized"` in the portable artifact ref;
- expose those records through runner state and host read surfaces.

What was still missing was a clean way to represent the publication outcome
separately from the local materialization outcome.

That gap mattered because the next remote publication slice needs to
distinguish at least three cases:

- the artifact is local-only and no publication was attempted yet;
- the artifact has been published successfully;
- the artifact was materialized locally but publication failed.

Without a separate publication contract, the system would have been forced to
overload `ref.status` or leave publication failure invisible.

## What changed

This slice added:

- `artifactPublicationStateSchema`;
- `artifactPublicationSchema`;
- optional `ArtifactRecord.publication`;
- explicit `publication.state: "not_requested"` on the current local
  git-backed artifact materialization path;
- tests that lock the new publication metadata rules.

## 1. Publication is now a first-class record concern

`ArtifactRecord` can now carry an optional `publication` object that describes
the publication outcome independently of local materialization.

The first supported publication states are:

- `not_requested`
- `published`
- `failed`

This means the repository now has a machine-readable place to record:

- whether publication was even attempted;
- whether it succeeded;
- whether it failed and why.

## 2. The current local artifact path is now explicit about not being published yet

The existing local git-backed artifact backend now records:

- `ref.status: "materialized"`
- `publication.state: "not_requested"`

for the current report-file artifact slice.

That is materially better than omitting publication state entirely because it
makes the current system's behavior explicit:

- local git work has happened;
- remote publication has not yet happened.

## 3. Validation rules now protect the publication lifecycle

The new publication contract enforces:

- `published` requires:
  - `publishedAt`
  - `remoteName`
  - `remoteUrl`
- `failed` requires:
  - `lastAttemptAt`
  - `lastError`
- `publishedAt` is rejected outside the `published` state;
- `lastError` is rejected outside the `failed` state.

This is the minimum rigor needed so that future remote publication code can
persist diagnostics without inventing ad hoc error objects.

## 4. Why this slice came before real remote publication

This was the correct ordering.

If remote publication had landed first, the implementation would have had no
clean persistent surface for:

- "remote push succeeded";
- "remote push failed after local materialization";
- "no publication was requested yet".

By closing the record contract first, the next slice can focus on actual remote
push behavior instead of redesigning artifact state under pressure.

## 5. Verification performed

This slice was verified with:

- updated `@entangle/types` tests for artifact-record publication metadata;
- updated `@entangle/runner` tests confirming current materialized artifacts now
  persist `publication.state: "not_requested"`;
- repository verification after the code and documentation updates.

## 6. What remains after this slice

This slice does not perform remote publication yet.

The next git-collaboration slice should now:

- attempt remote publication from the runner artifact backend;
- persist `publication.state: "published"` with remote metadata on success;
- persist `publication.state: "failed"` with explicit diagnostics on failure;
- keep `ref.status` and publication metadata semantically aligned without
  collapsing them into a single overloaded field.
