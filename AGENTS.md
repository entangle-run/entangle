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
- a host control-plane service;
- Studio as the graph-aware visual client;
- headless-capable operation through CLI and host-facing surfaces.

## Mandatory audit loop

Before substantial work:

1. read `README.md`, `resources/README.md`, `wiki/overview.md`, `wiki/index.md`, and `wiki/log.md`;
2. read any concept, decision, source, or reference files directly touched by the task;
3. check for stale state, contradictions, drift, and quality regressions in code or tooling;
4. correct durable inconsistencies before extending the repository.

After durable repository changes:

1. update the affected canonical files;
2. update `wiki/index.md` if new wiki pages were added;
3. append a meaningful entry to `wiki/log.md` when project state or design baseline changed;
4. run the relevant automated checks for the touched scope;
5. commit the coherent batch once the repository is internally consistent.

## Design rules

- Preserve the final conceptual architecture. Reduce only the active feature profile for the hackathon.
- Keep `AgentPackage`, `NodeInstance`, `Edge`, `GraphSpec`, transport policy, runner lifecycle, and protocol boundaries clean from the start.
- Treat messages as coordination and artifacts as the primary work substrate.
- Treat git as the first artifact backend, not the only conceptual backend.
- Do not collapse the architecture into a single orchestrator-centric shortcut if that would damage the future product model.

## Implementation direction

Current preferred stack:

- TypeScript
- Node 22
- `pnpm` workspaces
- Turborepo
- shared schema packages
- `nostr-tools`
- `strfry`
- `Gitea`
- Docker Compose
- one `entangle-host` control-plane service
- one `entangle-runner` per active node
- one `entangle-studio` visual control client
- one CLI-capable headless surface over the same host boundary
- one monorepo with explicit internal package boundaries

## Repository usage rules

- Write generated and edited project files in English.
- Prefer updating the existing canonical corpus over scattering new ad hoc notes.
- Keep `resources/` aligned with the documented reference policy.
- Do not reintroduce the public Claude Code leak mirror into the local corpus.
- Treat `qmd` as optional tooling and `khatru` as a secondary reference, not as the first foundation.

## Current implementation priorities

At this stage, prioritize:

1. root repository coherence;
2. expansion of machine-readable schemas from the initial scaffold;
3. deeper validator coverage for graph, transport, and deployment semantics;
4. deployment resource catalog and binding contracts;
5. host control-plane and host API implementation beyond the bootstrap status route;
6. effective runtime context for runners;
7. runner lifecycle and Nostr messaging path;
8. git artifact handoff;
9. engine-adapter and model-endpoint execution boundary;
10. Docker Compose topology;
11. Studio runtime visibility over real host state;
12. headless CLI surface over the same host boundary;
13. thin package scaffolding surface for `AgentPackage` creation.

## Working attitude

Do not treat this repository as static notes. Treat it as a controlled engineering baseline that should become more coherent and more implementation-ready after each substantial interaction.

Raise the bar actively. Audit for quality, cleanliness, and professional
engineering rigor with the same seriousness used for consistency.
