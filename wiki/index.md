# Entangle Wiki Index

## Core

- [overview.md](overview.md) — High-level orientation page for the Entangle project and current design status.

## Concepts

- [concepts/entangle-core.md](concepts/entangle-core.md) — Core definition of Entangle as a graph-native runtime for AI organizations.
- [concepts/agent-package-and-runner.md](concepts/agent-package-and-runner.md) — Distinction between portable package, node instance, and runtime process.
- [concepts/messages-artifacts-and-memory.md](concepts/messages-artifacts-and-memory.md) — Separation between coordination messages, artifact backends, and wiki memory.

## Decisions

- [decisions/architecture-baseline.md](decisions/architecture-baseline.md) — Baseline architecture and scope rule for the hackathon.
- [decisions/identity-and-transport.md](decisions/identity-and-transport.md) — Use Nostr keys for global identity and signed communication while keeping git credentials and signing surfaces separate.
- [decisions/git-as-first-artifact-backend.md](decisions/git-as-first-artifact-backend.md) — Git is the first implemented work substrate, not the only conceptual backend.
- [decisions/repository-audit-loop.md](decisions/repository-audit-loop.md) — Every substantial interaction starts with an audit pass and leaves the repo in a more coherent state.

## Sources

- [sources/reference-repositories.md](sources/reference-repositories.md) — Summaries of the major repositories tracked for Entangle.
- [sources/nostr-foundations.md](sources/nostr-foundations.md) — Project-specific interpretation of the Nostr specs relevant to Entangle.
- [sources/stack-recommendation.md](sources/stack-recommendation.md) — Practical implementation stack recommendation for Studio, runner, Nostr transport, relay, git server, and containerization.
- [sources/codex-cli-usage.md](sources/codex-cli-usage.md) — Recommended Codex CLI command set and working loops for this repository.

## Sessions

- [sessions/2026-04-22-bootstrap.md](sessions/2026-04-22-bootstrap.md) — Initial imported synthesis of the Entangle brainstorming corpus and project bootstrap.
