# Locator-Specific Git Handoff Widening Slice

This slice widens Entangle's git handoff model beyond the original
primary-repository-only retrieval path.

Before this batch, the repository already had:

- deterministic primary git repository-target resolution;
- remote publication to deterministic preexisting repositories;
- host-owned provisioning for primary `gitea_api` targets;
- inbound retrieval from the receiving runtime's primary repository target.

What it still lacked was a clean answer to this question:

> When an inbound artifact points at a repository that is not the runtime's
> exact primary repository target, how should the runtime resolve transport,
> target repository, and principal selection without hidden heuristics?

## What changed

This slice added:

- a shared runtime helper for deterministic git-principal selection by git
  service;
- a shared runtime helper for locator-specific repository-target resolution;
- validator enforcement that every inbound git artifact resolves a transport
  principal for the target service;
- runner support for retrieving git artifacts from locator-specific repository
  targets rather than only the exact primary repository target;
- retrieval-cache partitioning by service, namespace, repository, and
  artifact id;
- integration coverage for sibling-repository retrieval on the primary
  service;
- machine-readable contract coverage for repository-target and principal
  resolution rules.

## 1. Retrieval is no longer hard-wired to one repository

The runner no longer assumes:

- one receiving runtime -> one retrievable git repository.

Instead, the retrieval path now resolves the target from the inbound artifact
locator and the effective runtime context.

The current supported policy is:

- the locator must name a bound git service;
- the locator must name a namespace;
- the locator must name a repository;
- the receiving runtime must resolve a deterministic transport principal for
  that git service.

If those conditions are not met, retrieval fails explicitly and the failure is
persisted on the artifact record.

## 2. Principal selection is now service-scoped and deterministic

The old retrieval path implicitly depended on the runtime's primary git
principal. That was too narrow and too opaque once handoffs moved beyond the
exact primary repository.

The new rule is:

- if the runtime's `primaryGitPrincipalRef` points at the target git service,
  use it;
- otherwise, if exactly one git principal binding exists for that service, use
  it;
- otherwise, fail as `missing` or `ambiguous`.

This keeps transport identity deterministic and prevents silent
first-candidate wins behavior.

## 3. Repository-target resolution now prefers explicit runtime truth

The new repository-target resolution logic is:

1. find the git service named by the artifact locator;
2. if the locator points at the primary service and primary namespace, prefer
   the primary target as the canonical reference;
3. if the locator points at a sibling repository on that same primary
   service/namespace path, derive a sibling target from the primary target's
   concrete remote URL;
4. otherwise, derive the target from the bound service's `remoteBase`.

This is important because it preserves host-resolved runtime truth where it
already exists while still allowing the system to widen beyond a single
repository target.

## 4. Retrieval caches are now partitioned by repository identity

The retrieval cache is no longer keyed only by artifact id.

It is now partitioned by:

- `gitServiceRef`
- `namespace`
- `repositoryName`
- `artifactId`

This prevents collisions between artifacts that share the same `artifactId`
but come from different repositories.

## 5. What is now supported

This slice now supports:

- retrieval from the exact primary repository target;
- retrieval from sibling repositories on the same primary service and
  namespace;
- contract-level resolution of locator-specific repository targets on other
  bound services when the runtime has the service and a deterministic
  transport principal.

The integration-tested path in this slice is the sibling-repository case on
the primary service, because that is the strongest no-shortcut widening that
fits the current local bounded test profile cleanly.

## 6. Verification performed

This slice was verified with:

- shared type-contract tests for:
  - sibling-repository target derivation from a primary target override;
  - bound non-primary service repository-target derivation;
  - deterministic and ambiguous git-principal selection;
- validator tests for:
  - acceptance of published git refs under the widened policy;
  - rejection when a target service lacks a transport principal;
- runner integration tests for:
  - primary-repository retrieval;
  - sibling-repository retrieval on the primary service;
  - persisted retrieval failure on invalid inbound git refs;
- full repository verification with `pnpm verify`.

## 7. What remains after this slice

The main git-collaboration model is now strong enough for the current local
profile.

Remaining git work is now widening rather than a core blocker:

- non-primary target provisioning flows;
- replicated or fallback retrieval paths across services;
- richer artifact kinds beyond the current report-file-first slice.

That means the next major implementation focus should shift to the first real
model-backed internal `agent-engine` unless a new repo-wide audit reveals a
stronger blocker.
