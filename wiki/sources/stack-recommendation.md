# Stack Recommendation

The current recommended implementation stack for Entangle is:

- TypeScript for shared schemas, Studio, host, and runner logic
- Node 22 as the canonical runtime target
- `pnpm` workspaces plus Turborepo for monorepo package and task management
- `nostr-tools` for Nostr protocol interaction
- `strfry` as the first relay implementation
- `Gitea` as the first git server
- Docker Compose for local multi-service orchestration
- `entangle-host` as the local control-plane and runtime-lifecycle service
- a CLI or equivalent headless surface over the same host boundary
- one monorepo with explicit internal package boundaries
- `khatru` only as a secondary relay-framework reference, not as the first foundation
- separate per-node git credentials, preferably SSH-based, rather than reusing
  Nostr private keys
- deployment-scoped relay, git, and model endpoint profiles passed into the
  system rather than hardcoded in packages or runtimes
- an internal engine-adapter boundary with a first practical preference for a
  direct `anthropic` adapter and a later `openai_compatible` adapter

## Why this stack

- It aligns with the strongest open-source references already in the project.
- It keeps the first implementation coherent with the long-term architecture.
- It avoids building infrastructure that should remain external services.
- It keeps protocol identity and external-service credentials cleanly separated.

## Important nuance

This is a stack recommendation, not a product identity.

Entangle should remain:

- protocol-first;
- graph-native;
- host-and-runner-centered rather than UI-centered;
- not coupled to one UI or one relay implementation forever.
