# Remote Git Publication To Preexisting Repositories

This document records the slice that extends the runner artifact backend from
local git materialization into the first real remote publication path.

The scope of this slice is intentionally precise:

- it supports publication to a deterministic remote repository target already
  resolved by the host into effective runtime context;
- it supports the `preexisting` repository mode first;
- it preserves local artifact truth even when remote publication fails;
- it does not yet implement remote retrieval or service-side repository
  provisioning.

## 1. Why this slice landed now

Three prerequisite slices were already complete:

1. git principal bindings and secret-delivery metadata were resolved into the
   runtime context;
2. primary remote repository targets were resolved deterministically from git
   service profiles and graph identity;
3. artifact records had an explicit publication-state contract.

That meant remote publication could now be implemented without hidden fallback
behavior or lifecycle ambiguity.

## 2. What is implemented

The runner git artifact backend now performs remote publication after local
artifact materialization when a primary git repository target is present in the
effective runtime context.

The flow is:

1. materialize the report artifact in the local git workspace;
2. commit it locally with the resolved git principal attribution;
3. resolve the deterministic remote name from the selected git service;
4. ensure the remote exists locally with the expected URL;
5. push `HEAD` to the branch already encoded in the portable git artifact
   locator;
6. persist the publication result into the artifact record.

The current implementation deliberately supports the already-specified
`preexisting` repository mode first. In that mode, the remote repository must
already exist and be reachable.

## 3. Publication outcome semantics

On successful publication:

- `ArtifactRecord.ref.status` transitions from `materialized` to `published`;
- `ArtifactRecord.publication.state` becomes `published`;
- publication metadata records:
  - `publishedAt`
  - `remoteName`
  - `remoteUrl`

On publication failure:

- the local artifact remains valid and materialized;
- `ArtifactRecord.ref.status` remains `materialized`;
- `ArtifactRecord.publication.state` becomes `failed`;
- failure metadata records:
  - `lastAttemptAt`
  - `lastError`
  - `remoteName`
  - `remoteUrl`

This is the correct boundary. Remote publication is an extension of local
artifact durability, not a condition for local artifact truth.

## 4. Transport and credential behavior

For URL-based remotes, the runner now builds publication-time git environment
from the resolved primary git principal binding.

The current first-class authenticated path is:

- git transport kind: `ssh`
- principal transport auth mode: `ssh_key`
- secret delivery: mounted file resolved by the host

This keeps the auth boundary explicit and consistent with the earlier
principal-binding slice.

For bounded local/test profiles, direct local-path remotes remain supported
without transport credentials. That is used only to prove deterministic remote
publication semantics against a controlled bare repository in tests.

## 5. Verification closed in this slice

The slice is covered by runner tests for:

- successful publication to a preexisting remote bare repository;
- failure semantics when the configured remote repository is unavailable;
- preservation of the existing local artifact behavior for non-remote flows.

The repository-wide gate was also rerun successfully through `pnpm verify`.

## 6. What remains after this slice

This slice does not yet complete remote git collaboration.

The most important remaining git-collaboration work is:

- remote retrieval by downstream nodes;
- cross-node handoff validation against named git services;
- repository provisioning for service profiles that declare `gitea_api` rather
  than `preexisting`.

That is the next correct capability slice for the artifact collaboration
subsystem.
