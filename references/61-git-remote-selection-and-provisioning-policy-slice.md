# Git Remote Selection and Provisioning Policy Slice

This document records the contract-level slice that closes Entangle's first
remote git publication ambiguity without yet implementing `git push` or remote
artifact retrieval.

Before this batch, the repository already had:

- local git-backed artifact materialization;
- git principal binding and secret-delivery metadata in runtime context;
- named git service profiles in the deployment resource catalog.

What it still lacked was a deterministic answer to this question:

> Given a node's resolved git service, where exactly should remote publication
> go?

That ambiguity mattered because remote publication cannot be implemented
cleanly if the runner must invent:

- which transport endpoint to use;
- which namespace to target;
- which repository name to derive;
- whether the selected service expects preexisting repositories or supports
  provisioning.

## What changed

This slice added:

- `gitServiceProfile.remoteBase` as an explicit transport-facing remote root;
- `gitServiceProfile.provisioning` as an explicit repository-provisioning mode;
- a shared `GitRepositoryTarget` contract;
- deterministic resolution of `artifactContext.primaryGitRepositoryTarget` in
  the host-generated effective runtime context;
- a local deployment default for `ENTANGLE_DEFAULT_GIT_REMOTE_BASE`;
- tests that lock the new contract and runtime resolution behavior.

## 1. Git service profiles now distinguish API/web base from remote transport base

`gitServiceProfile` now carries two distinct surfaces:

- `baseUrl`
  The HTTP-facing service base used for API or web interactions.
- `remoteBase`
  The transport-facing remote root used to construct clone, fetch, and push
  URLs.

This distinction is necessary because git service deployments frequently expose
different HTTP and SSH surfaces. Treating `baseUrl` as the canonical remote
transport root would have made the remote publication layer incorrect by
construction.

The current contract enforces:

- `ssh://...` remote bases for `transportKind: "ssh"`;
- `http://...` or `https://...` remote bases for `transportKind: "https"`;
- no query or fragment components on `remoteBase`.

## 2. Repository provisioning is now an explicit service policy

`gitServiceProfile.provisioning` is now part of the shared contract.

The first supported modes are:

- `preexisting`
  The remote repository must already exist before publication.
- `gitea_api`
  The service declares that repository provisioning may happen through the
  Gitea API, with an explicit `apiBaseUrl` and `secretRef`.

This slice does not yet resolve or deliver the provisioning secret into runtime
code. It only closes the configuration boundary so that remote publication does
not need to invent provisioning policy later.

## 3. Entangle now resolves a primary remote repository target deterministically

The host now resolves a shared `primaryGitRepositoryTarget` when, and only
when, the following are unambiguous:

- a primary git service is known;
- the effective namespace is known;
- the selected git service is present in the resolved runtime context.

The current deterministic naming policy is:

- repository scope: graph-shared;
- repository name: `graphId`;
- namespace: resolved effective default namespace;
- remote URL: `${remoteBase}/${namespace}/${graphId}.git`.

Example:

- graph id: `team-alpha`
- service ref: `gitea`
- namespace: `team-alpha`
- remote base: `ssh://git@gitea:22`

resolves to:

- `ssh://git@gitea:22/team-alpha/team-alpha.git`

This is intentionally strict. The host does not invent a repository target when
service or namespace resolution remains ambiguous.

## 4. Current policy stance

The current slice freezes the following policy:

- the first serious remote git publication path is graph-shared, not one repo
  per node;
- repository-name selection is deterministic and reconstructible from runtime
  state;
- runtime code should consume `primaryGitRepositoryTarget`, not recompute the
  target from ad hoc heuristics.

This gives the next slice a clean base for publication while still leaving room
for future widening such as:

- explicit repo-name overrides;
- multiple repository targets per graph;
- host-managed repository bootstrap;
- service-specific provisioning workflows.

## 5. Local deployment implications

The local Compose profile now sets:

- `ENTANGLE_DEFAULT_GIT_REMOTE_BASE`

for the host service.

In the default local Docker network profile, this is:

- `ssh://git@gitea:22`

which matches runner-to-service connectivity inside the Compose network rather
than the operator-facing SSH port exposed on the host machine.

## 6. Verification performed

This slice was verified with:

- new machine-readable contract tests for:
  - valid git service profiles;
  - invalid transport/base mismatches;
  - deterministic primary repository target resolution;
- host tests for:
  - resolved primary git repository targets when service and namespace are
    unambiguous;
  - explicit absence of a repository target when git bindings remain ambiguous;
- full repository verification through `pnpm verify`.

## 7. What remains after this slice

This slice does not yet implement remote publication itself.

The next remote-git gaps are now narrower and cleaner:

- remote repository publication from the runner artifact backend;
- service-aware repository bootstrap or preflight validation;
- remote retrieval and downstream handoff validation;
- eventual delivery of provisioning secrets when the selected provisioning mode
  requires them.
