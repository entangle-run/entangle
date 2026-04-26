# Evidence Map

## Evidence Method

This appendix lists repository evidence used for major analysis claims. It distinguishes local facts from interpretations.

## Canonical Documentation Reviewed

| File | Evidence Used |
| --- | --- |
| `README.md` | Project identity, stack, quickstart, host/runner/studio/CLI intent. |
| `resources/README.md` | Resource corpus policy and reference handling. |
| `wiki/overview.md` | Current architecture baseline and implementation direction. |
| `wiki/index.md` | Canonical documentation index and reference map. |
| `wiki/log.md` | Project evolution and durable state changes. |
| `references/README.md` | Reference corpus indexing and policy. |

## Source Evidence

| Path | Evidence Used |
| --- | --- |
| `packages/types/src` | Core schemas for graph, packages, runtime context, resources, A2A, artifacts, sessions, recovery, memory. |
| `packages/validator/src` | Semantic validation for graph/resource/package/runtime contracts. |
| `packages/host-client/src/index.ts` | Host API client methods and WebSocket event behavior. |
| `packages/agent-engine/src` | Engine abstraction, Anthropic adapter, stub engine, unsupported provider path. |
| `packages/package-scaffold/src/index.ts` | Agent package scaffold behavior. |
| `services/host/src` | Fastify host, state store, graph/catalog/package/runtime/session/recovery behavior, Docker and memory runtime backends. |
| `services/runner/src` | Runner runtime, Nostr transport, artifact backend, memory synthesis, session handling. |
| `apps/cli/src/index.ts` | Commander CLI coverage for validation, scaffolding, graph inspection, and host operations. |
| `apps/studio/src/App.tsx` | Studio feature surface, direct host API usage, React Flow graph, runtime/session views. |
| `apps/studio/src/App.css` | Studio styling approach. |
| `deploy/docker-compose.federated-dev.yml` | Local deployment topology with host, studio, strfry, Gitea, runner image. |
| `.github/workflows/ci.yml` | CI pipeline commands. |
| `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json` | Build, workspace, task, and TypeScript configuration. |

## Current Local Runtime State Evidence

Non-secret state under `.entangle` showed:

- Graph `team-alpha`.
- Nodes `user-main` and `worker-it`.
- Edge `user-to-worker` with delegation semantics.
- Local relay resource at `ws://strfry:7777`.
- Local Gitea resource.
- Anthropic model endpoint with secret reference.
- Worker runtime observed as stopped and degraded due missing model credential.

Interpretation: the repository is actively used as a local runtime baseline and not only as static notes.

## Build And Test Evidence

| Evidence | Finding |
| --- | --- |
| Root package scripts | `build`, `lint`, `typecheck`, `test`, and `verify` exist. |
| CI workflow | CI runs install, lint, typecheck, test, and build. |
| Test files | Tests exist across types, validator, host-client, agent-engine, host, runner, CLI, and scaffold. |
| TypeScript config | Strict settings are enabled. |

## Security Evidence

| Evidence | Finding |
| --- | --- |
| Host setup | No visible authentication or RBAC middleware in host API. |
| Docker Compose | Host mounts Docker socket for local runner lifecycle. |
| Git ignore patterns | `.entangle` and secret-like Entangle state are ignored. |
| Runner config | Secrets are supplied by environment or mounted files. |
| Transport references | Nostr signed coordination is a core runtime concept. |

## Key Interpretations

- Entangle is more coherent than a prototype chatbot wrapper because contracts, validators, host, runner, CLI, Studio, deployment, and references align around graph-native runtime semantics.
- It is not production-grade because identity, persistence, observability, tenant isolation, and hardened execution are missing or local-only.
- The best redesign should preserve conceptual boundaries and replace operational foundations.
