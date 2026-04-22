# Identity and Transport

## Decision

Each runtime node is globally identified by a Nostr public key and communicates using signed Nostr events.

## Rationale

This gives:

- native global identity;
- verifiable provenance of messages;
- a protocol-level transport suited to local and remote node collaboration.

## Consequences

- secret management matters;
- package portability must stay separate from key material;
- the runner must own signing and publication behavior.
- external systems such as git must bind separate principals and credentials to
  the node rather than reusing the same raw Nostr private key;
- human-facing git attribution may be derived from node identity, but git
  transport authentication and commit signing remain separate credential
  surfaces.
