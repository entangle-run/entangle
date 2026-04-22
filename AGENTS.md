# Entangle Codex Instructions

This file defines the working rules for Codex inside the Entangle repository.

## Project identity

Entangle is a graph-native runtime for AI organizations.

It is not a chatbot wrapper and not a shallow multi-agent demo. The repository should be treated as the baseline for a serious system with:

- graph-native topology;
- user as a first-class node;
- Nostr-signed messaging for coordination;
- artifact backends for work handoff;
- a runner per node;
- Studio as the graph-aware user client.

## Mandatory audit loop

Before substantial work:

1. read `README.md`, `resources/README.md`, `wiki/overview.md`, `wiki/index.md`, and `wiki/log.md`;
2. read any concept, decision, source, or reference files directly touched by the task;
3. check for stale state, contradictions, and drift;
4. correct durable inconsistencies before extending the repository.

After durable repository changes:

1. update the affected canonical files;
2. update `wiki/index.md` if new wiki pages were added;
3. append a meaningful entry to `wiki/log.md` when project state or design baseline changed.

## Design rules

- Preserve the final conceptual architecture. Reduce only the active feature profile for the hackathon.
- Keep `AgentPackage`, `NodeInstance`, `Edge`, `GraphSpec`, transport policy, runner lifecycle, and protocol boundaries clean from the start.
- Treat messages as coordination and artifacts as the primary work substrate.
- Treat git as the first artifact backend, not the only conceptual backend.
- Do not collapse the architecture into a single orchestrator-centric shortcut if that would damage the future product model.

## Implementation direction

Current preferred stack:

- TypeScript
- shared schema packages
- `nostr-tools`
- `strfry`
- `Gitea`
- Docker Compose
- one `entangle-runner` per active node
- one `entangle-studio` control-plane client

## Repository usage rules

- Write generated and edited project files in English.
- Prefer updating the existing canonical corpus over scattering new ad hoc notes.
- Keep `resources/` aligned with the documented reference policy.
- Do not reintroduce the public Claude Code leak mirror into the local corpus.
- Treat `qmd` as optional tooling and `khatru` as a secondary reference, not as the first foundation.

## Current implementation priorities

At this stage, prioritize:

1. root repository coherence;
2. machine-readable schemas;
3. validator scaffolding;
4. runner skeleton;
5. Nostr messaging path;
6. git artifact handoff;
7. Docker Compose topology;
8. Studio runtime visibility.

## Working attitude

Do not treat this repository as static notes. Treat it as a controlled engineering baseline that should become more coherent and more implementation-ready after each substantial interaction.
