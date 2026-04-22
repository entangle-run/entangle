# Stack Recommendation

The current recommended implementation stack for Entangle is:

- TypeScript for shared schemas, Studio, and runner logic
- `nostr-tools` for Nostr protocol interaction
- `strfry` as the first relay implementation
- `Gitea` as the first git server
- Docker Compose for local multi-service orchestration
- `khatru` only as a secondary relay-framework reference, not as the first foundation

## Why this stack

- It aligns with the strongest open-source references already in the project.
- It keeps the first implementation coherent with the long-term architecture.
- It avoids building infrastructure that should remain external services.

## Important nuance

This is a stack recommendation, not a product identity.

Entangle should remain:

- protocol-first;
- graph-native;
- runner-centered;
- not coupled to one UI or one relay implementation forever.
