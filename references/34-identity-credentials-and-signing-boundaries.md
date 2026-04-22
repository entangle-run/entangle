# Identity, Credentials, and Signing Boundaries

This document defines how Entangle should relate Nostr identity, external
service identities, and concrete credential material.

The specific trigger for this clarification is the temptation to reuse a
node's Nostr keypair directly as its git credential. That model should be
rejected.

## Design rule

Entangle must distinguish clearly between:

- protocol identity;
- external service principal identity;
- authentication credentials;
- commit attribution metadata;
- commit signing keys.

If these are collapsed into one undifferentiated credential, the system will
gain superficial elegance but lose security, portability, and interoperability.

## 1. Authoritative internal identity

Each runtime node has one authoritative internal identity:

- a Nostr public key;
- paired with a Nostr private key kept in the secret-binding layer;
- used for signing Entangle protocol events;
- used for provenance, traceability, and graph-level accountability.

This keypair is the node's canonical protocol identity.

It is not automatically the correct credential for external systems.

## 2. External principal model

Nodes frequently need identities in systems outside Entangle.

Examples:

- git server user or service account;
- storage identity;
- future issue-tracker or registry account.

Entangle should model these as bound external principals.

Recommended conceptual fields:

- `principal_id`
- `system_kind`
- `subject`
- `transport_auth_mode`
- `secret_ref`
- `attribution_profile`
- `signing_profile`

The important point is conceptual: a node may be globally identified by one
Nostr key while also being bound to one or more system-specific principals.

## 3. Why the same raw keypair should not be reused for git

The first reason is protocol and tooling mismatch.

Nostr uses secp256k1 keys. Standard OpenSSH key types exposed by the current
toolchain in this environment are:

- `ssh-ed25519`
- `ecdsa-sha2-nistp256`
- `ecdsa-sha2-nistp384`
- `ecdsa-sha2-nistp521`
- `ssh-rsa`

That does not include secp256k1 as a standard SSH key type. So the exact same
raw Nostr keypair is not a normal or portable SSH credential for git transport.

The second reason is security boundary collapse.

If one private key simultaneously controls:

- Entangle protocol identity;
- git transport authentication;
- potentially git commit signing;

then compromise, rotation, revocation, or migration of one surface forces all
the others to move with it.

The third reason is lifecycle mismatch.

Nostr identity rotation and git credential rotation are different operational
events. They should be allowed to evolve independently.

## 4. Git has multiple identity-related surfaces

Git collaboration is not one thing; it is at least four different surfaces.

### 4.1 Transport authentication

This is how the node can fetch, pull, and push.

Recommended first choice:

- SSH key per node principal on the git server.

Fallback:

- HTTPS token or access token when SSH is unavailable.

### 4.2 API authentication

If the host or a node must call the git service API, this is a separate
surface.

Examples:

- repository creation;
- account bootstrap;
- branch or repo metadata inspection.

This may use:

- API token;
- OAuth-style token;
- in some `Gitea` paths, SSH-key-backed HTTP signatures.

### 4.3 Commit attribution

This is the human-facing git identity in `user.name` and `user.email`.

It is not the same thing as transport authentication.

It is reasonable to derive these fields from:

- node alias;
- node role;
- Nostr pubkey fragment.

Examples:

- `IT Developer A`
- `it-dev-a+npub1abc123@entangle.local`

### 4.4 Commit signing

Commit signing is separate again.

It should not be assumed to use the same key as transport authentication, even
though SSH signing makes reuse possible within the SSH domain.

If enabled, commit signing should use:

- an SSH signing key managed as a separate signing surface; or
- another supported signing profile later.

## 5. Recommended Entangle model

The recommended model is:

- Nostr keypair remains the authoritative internal node identity;
- each active node is bound to one git principal for git collaboration;
- git transport authentication uses a separate secret;
- git commit attribution may be derived from the node identity;
- git commit signing, if enabled, uses a separate signing profile.

This gives coherence without credential reuse.

## 6. Recommended first implementation

For the first serious Entangle build:

- use `Gitea` as the git service;
- give each active node its own git principal where feasible;
- prefer SSH transport for fetch/push;
- use HTTPS tokens only as fallback or for narrowly scoped API automation;
- keep git credentials in the secret-binding layer, never in the package.

The host should own or coordinate:

- git principal provisioning or registration;
- secret injection for git transport;
- optional author/committer profile generation;
- optional signing-profile injection.

## 7. Hackathon profile

The hackathon should prefer per-node git principals for the active graph, since
the node count is small and the identity realism is valuable.

If that proves too operationally heavy for the first running slice, the host
may temporarily use simplified provisioning or pre-created accounts.

It should not adopt the long-term anti-pattern of one shared git credential for
all nodes as the core model.

## 8. Future-friendly directions

Later, Entangle may add tighter coupling between Nostr identity and external
systems without reusing the same raw private key.

Examples:

- host-issued git credentials bound to a node's Nostr identity;
- Nostr-signed attestations that a git signing key belongs to a given node;
- automatic provisioning of git accounts derived from node bindings;
- policy requiring proof that an external signing key is owned by the node's
  Nostr identity.

This is the correct direction: stronger linkage by attestation and provisioning,
not raw secret reuse.

## 9. Rejected anti-patterns

Entangle should reject these models:

- using the same raw Nostr private key as the git transport credential;
- treating git username/password as the main identity model;
- using one shared git secret for every node as the canonical design;
- assuming git author metadata is equivalent to authenticated identity;
- binding package portability to host-local credential material.

## 10. Current implemented slice

The current repository implementation now realizes the first machine-readable
and host-managed subset of this model:

- `packages/types` owns a concrete `ExternalPrincipalRecord` contract for git
  principals;
- graph bindings may now reference external principals by id;
- `entangle-host` persists external principal records under desired state and
  exposes them through host routes, host-client, and CLI surfaces;
- effective runtime context now carries resolved git principals plus a
  `primaryGitPrincipalRef` hint for the node when the primary principal is
  deterministically resolvable;
- the runner still does not publish to a remote git service yet, but the
  correct credential and attribution boundary now exists in the runtime model.
