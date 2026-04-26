# Non-Primary Publication Provisioning Slice

Date: 2026-04-26.

## Purpose

This slice closes the first host-owned provisioning path for explicit
non-primary source-history publication targets in Entangle.

Before this slice, runtime context reconciliation could provision only the
primary git repository target. A source-history publication to an explicit
non-primary `gitea_api` target attempted the git push directly and relied on
that push to fail if the repository did not already exist.

## Implemented Scope

- Reused the existing host-owned Gitea provisioning workflow for the resolved
  source-history publication target, not only for the primary runtime target.
- Persisted non-primary publication target provisioning records under the
  existing observed git-repository-target state.
- Kept source-history publication behavior conservative: provisioning failure
  records a failed artifact publication with a concrete error instead of
  throwing away the local materialized artifact.
- Preserved non-primary provisioning records across runtime reconciliation
  while an active node has source-history publication records that reference
  the target.
- Added host coverage proving that a non-primary `gitea_api` publication target
  is created through the Gitea API before the remote git push path runs.

## Boundaries

- This is target provisioning, not fallback replication.
- Preexisting and local `file` targets are still strict: Entangle records a
  failed publication when the target cannot be pushed, rather than inventing a
  hidden repository.
- The source-history publication still uses the same selected target. There is
  no automatic fallback from a failed non-primary target to the primary target.
- Studio still does not expose manual target selection for source-history
  publication.

## Remaining Work

- Explicit fallback or replication workflows across multiple repositories.
- Operator UI for target selection, provisioning state, and remote branch
  inspection.
- Policy-gated replay/promotion from restored artifacts into source or wiki
  repositories.
