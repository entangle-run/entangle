# Host-Owned Gitea Primary-Target Provisioning Slice

This slice closes the first real repository-provisioning path for Entangle's
git collaboration model.

Before this batch, the repository already had:

- deterministic primary git repository-target resolution;
- remote publication to preexisting repositories;
- downstream retrieval from the receiving runtime's primary target;
- host-owned secret resolution for git transport principals.

What it still lacked was a concrete implementation of this policy:

> When a primary repository target declares `provisioningMode: "gitea_api"`,
> the host should ensure that repository exists before treating the runtime as
> fully realizable.

## What changed

This slice added:

- a machine-readable `GitRepositoryProvisioningRecord` contract;
- runtime inspection exposure of the primary-target provisioning record;
- a first-party host-side `GiteaApiClient`;
- host-owned provisioning for `gitea_api` primary targets during runtime
  reconciliation;
- persisted provisioning state under observed host state;
- tests for organization-backed creation, current-user creation, reuse of
  preexisting repositories, and missing-secret failure semantics.

## 1. Provisioning is now a host responsibility, not a runner responsibility

The selected design is now explicit:

- the host resolves the primary repository target;
- the host resolves the provisioning secret;
- the host performs repository existence checks and creation when the selected
  service policy allows it;
- the runner only consumes the already-resolved target and transport bindings.

This keeps service-level provisioning credentials out of the runner and
preserves the existing host-first control-plane boundary.

## 2. Provisioning state is now persisted as a first-class record

The repository now owns a canonical `GitRepositoryProvisioningRecord` with
these states:

- `not_requested`
- `ready`
- `failed`

The record also preserves:

- the target it refers to;
- the latest check time;
- whether the host actually created the repository;
- the latest failure message when provisioning fails.

This is better than encoding provisioning outcome only in free-form runtime
status text.

## 3. Runtime realizability now depends on provisioning outcome for `gitea_api` targets

For service-provisioned primary targets, the host now treats repository
provisioning as part of runtime realization.

That means:

- if the repository can be confirmed or created successfully, runtime context
  remains available;
- if the repository cannot be provisioned, runtime context is withheld and the
  runtime is kept stopped with an explicit reason.

This is intentionally stricter than letting the runner start and fail only
later on the first remote publication attempt.

## 4. The first Gitea provisioning flow is explicit and deterministic

The host now uses the following sequence for `gitea_api` targets:

1. `GET /repos/{owner}/{repo}` to check whether the target already exists.
2. If it does not exist, `GET /user` to identify the authenticated user.
3. If the target namespace matches the authenticated user, `POST /user/repos`.
4. Otherwise, `POST /orgs/{org}/repos`.
5. If creation reports a conflict, the host re-checks repository existence
   instead of treating conflict as success blindly.

This is the correct first slice because it:

- avoids hidden ownership heuristics;
- avoids admin-only user-provisioning endpoints in the common local profile;
- remains reconstructible from persisted runtime state and target metadata.

## 5. Provisioning semantics are idempotent at the control-plane level

Repeated host reconciliations now preserve stable provisioning truth:

- if the host created the repository once, later reconciliations keep
  `created: true` on the persisted record;
- if the repository already existed before host creation, later reconciliations
  keep `created: false`;
- creation is never inferred from a later GET-only success.

This matters because the host may reconcile the same runtime many times across
graph applies, status reads, and runtime inspections.

## 6. Verification performed

This slice was verified with:

- `@entangle/types` tests for the new provisioning contract;
- `@entangle/host` tests for:
  - organization-backed repository creation;
  - current-user repository creation;
  - preexisting repository reuse without create calls;
  - missing-secret failure semantics that keep runtime context unavailable;
- host typecheck and repository-wide verification after the slice.

## 7. What remains after this slice

This slice does not yet complete git collaboration.

The most important remaining git/runtime gaps are now:

- broader downstream handoff semantics beyond the current primary-target-only
  retrieval policy;
- richer artifact kinds beyond the first report-file slice;
- a real internal `agent-engine` instead of the current stub execution path.

The next delivery order should therefore move to broader handoff widening
before shifting the main implementation focus to the real model-backed engine.
