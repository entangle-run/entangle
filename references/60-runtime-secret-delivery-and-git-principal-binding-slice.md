# Runtime Secret Delivery and Git Principal Binding Slice

This document records the first runtime secret-delivery slice for Entangle's
git-facing principal model.

The goal of this batch was to close a real implementation gap without jumping
prematurely into full remote publication:

- external principals already existed;
- secret references already existed;
- runtime context did not yet carry resolved git-secret delivery metadata;
- the Docker runtime profile did not yet mount the secret volume into runners;
- git commits still used node fallback attribution instead of the bound git
  principal when available.

## What changed

This slice added:

- a canonical `secretRef` contract instead of treating secret references as
  arbitrary strings;
- a reusable runtime secret-delivery contract plus a resolved-secret-binding
  shape;
- resolved git principal bindings in runtime artifact context, including
  secret-availability status and mounted-file delivery metadata when present;
- host-side resolution of `secret://...` refs into the local secret store under
  `ENTANGLE_SECRETS_HOME/refs/...`;
- a read-only secret-volume mount in the Docker runner profile;
- git author attribution in the local artifact backend derived from the bound
  primary git principal when available.

## 1. Secret references are now a real contract

Entangle no longer treats `secretRef` as an unstructured non-empty string.

The current contract now requires:

- `secret://` scheme;
- no query, fragment, username, or password components;
- safe path segments only;
- explicit rejection of `.` and `..` path traversal segments.

This matters because the host now resolves secret references into concrete
filesystem-backed local delivery paths. That resolution surface must not be
permissive.

## 2. Runtime secret delivery is now a shared machine-readable shape

The repository now owns a reusable runtime secret-delivery contract that
supports:

- `env_var`
- `mounted_file`

It also owns a `resolved secret binding` shape that makes availability
explicit:

- `status: "available"` with delivery metadata; or
- `status: "missing"` with no delivery metadata.

This is better than forcing the runtime to guess whether a bound secret is
usable.

## 3. Artifact runtime context now carries git principal bindings, not only raw principals

`artifactContext` now includes `gitPrincipalBindings` rather than only a flat
list of principal records.

Each binding carries:

- the bound principal record;
- transport secret binding status and delivery metadata;
- optional signing secret binding status and delivery metadata.

This makes the runtime context materially more useful:

- the runner can see the bound git identity;
- the runner can see whether the transport secret is actually available;
- future remote publication code can fail explicitly when the delivery status
  is `missing`.

## 4. Secret resolution model for the current local profile

The current local profile resolves a secret reference by mapping:

- `secret://git/worker-it/ssh`

to a host-managed secret-store path under:

- `${ENTANGLE_SECRETS_HOME}/refs/git/worker-it/ssh`

This slice does **not** add a host API for secret creation or rotation.

That is intentional. Secret authoring remains operator-owned and out of band
for now. This batch only closes the runtime-resolution and delivery boundary.

## 5. Docker-backed runner delivery is now more correct

The Docker runtime backend now mounts the secret-state volume into the runner as
read-only using explicit runtime-backend mount metadata.

This is important because:

- runtime context can now safely reference mounted secret files;
- the runner no longer has to rely only on environment variables for all secret
  surfaces;
- git SSH credentials now have a clear operational path into the runtime.

The local Compose profile now makes that mount explicit through:

- `ENTANGLE_DOCKER_SECRET_STATE_VOLUME`
- `ENTANGLE_DOCKER_SECRET_STATE_TARGET`

## 6. The runner now prefers git-principal attribution when available

The first visible runner-side use of the new principal-binding data is commit
attribution in the local git-backed artifact backend.

When a deterministically resolved primary git principal exists and provides
attribution metadata, the runner now uses that principal's:

- `displayName`
- `email`

for git author configuration instead of always falling back to node display
name and synthetic email.

This is a small but important behavior correction. It keeps git-facing work
closer to the explicit external principal model already defined in the corpus.

## 7. Verification performed

This slice was verified with:

- `@entangle/types` tests for `secretRef` and resolved secret binding contracts;
- `@entangle/host` tests for runtime-context git principal binding resolution;
- `@entangle/host` runtime-backend tests for read-only secret mounts;
- `@entangle/runner` tests confirming git author attribution now follows the
  bound principal when present;
- repository typecheck and later full verification.

## 8. What remains after this slice

This slice deliberately does **not** complete remote git collaboration.

The next meaningful git-collaboration gaps are now:

- remote repository selection and provisioning policy;
- push semantics in the runner artifact backend;
- remote retrieval and handoff validation;
- optional use of delivered signing secrets for commit signing.

It also does not yet extend the same secret-resolution model to model-endpoint
execution, because the real provider-backed `agent-engine` slice is still
pending.
