# External Principal Bindings Slice

This slice closes the gap between the identity model specified for Entangle and
the runtime/control-plane contracts that had been implemented so far.

Before this slice, Entangle already modeled:

- Nostr runtime identity;
- deployment resource catalog entries for relays, git services, and model
  endpoints;
- resolved git service hints in artifact runtime context.

It still did not model the backend-facing principal that a node should use when
interacting with a git service.

## What this slice adds

The repository now includes:

- a machine-readable `ExternalPrincipalRecord` contract owned by
  `packages/types`;
- graph-local `externalPrincipalRefs` in node resource bindings;
- effective resolution of external principals into `EffectiveNodeBinding`;
- resolved git principals and deterministic-only `primaryGitPrincipalRef` in
  runtime `artifactContext`;
- host-managed persistence for external principals under desired state;
- host routes, host-client methods, and CLI commands for listing, fetching, and
  upserting external principal bindings;
- validator checks for:
  - missing external principal refs;
  - git principals that fall outside the node's effective git service set;
  - missing primary git principals for non-user nodes;
  - ambiguous primary git-principal resolution;
  - ambiguous multi-principal resolution when no primary git service exists.

## Why this slice matters

Remote git publication is not only a transport problem. It is an identity and
credential-binding problem.

Without this slice, a future remote push flow would have to choose between two
bad options:

- hide git identity in ad hoc host-local logic; or
- leak credential assumptions into package/runtime code.

This slice creates the correct boundary first:

- the host owns principal records;
- graphs bind nodes to those principals by reference;
- runtime context receives resolved, non-secret identity metadata;
- secret refs stay references, not inline secrets.

## What remains after this slice

This is still not remote git publication yet.

The next meaningful git-collaboration gaps are:

- secret materialization for git transport credentials in runtime workspaces;
- remote repository selection or provisioning policy;
- push/fetch publication semantics in the runner artifact backend;
- host or runner support for remote retrieval and handoff validation.
