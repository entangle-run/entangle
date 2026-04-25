# Entangle Local GA Product Truth Audit

Date: 2026-04-25.

## Purpose

This audit is the product-truth baseline for carrying Entangle Local from the
R1/L1 local operator release toward Local GA.

It maps the repository's actual implemented state against the requested Local
milestone sequence, the canonical L-series roadmap, and the active R1/L1
release ledger.

## Scope

The audit covered the main product repository only:

- `README.md`;
- `resources/README.md`;
- `wiki/overview.md`;
- `wiki/index.md`;
- `wiki/log.md`;
- `references/174-definitive-production-delivery-roadmap.md`;
- `references/177-r1-local-operator-release-ledger.md`;
- `references/178-product-line-roadmap-readiness-audit.md`;
- release packets under `releases/`;
- deployment docs and scripts under `deploy/` and `scripts/`;
- workspace package, service, CLI, and Studio surfaces under `packages/`,
  `services/`, and `apps/`;
- root package scripts, CI, Docker Compose, and local smoke commands.

The website repository was not changed. It should be audited only when public
claims need alignment with Local release claims.

## Product-Line Mapping

The requested milestone names map to the repository's canonical release train
as follows:

| Requested milestone | Canonical repository release | Meaning |
| --- | --- | --- |
| R1 Local Operator Baseline | L1 / historical R1 | Presentable local architecture proof. |
| R1.1 Local Operator Preview | L1.5 | Usable local demo and technical preview. |
| R1.2 Local Workbench | L2 | Productized package, graph, session, and artifact workflows. |
| R1.3 Agentic Node Runtime | L3 | Per-node coding-agent runtime selection, OpenCode integration path, policy bridge, git/wiki workspaces, and observability. |
| R1.4 Local Reliability | L4 | Doctor, repair, backup, restore, upgrade, and diagnostics. |
| GA Entangle Local GA | L5 | Complete local/developer product. |

Cloud and Enterprise remain future product lines and are not active
implementation tracks before Local GA.

## Current Implementation Truth

The repository is not an early scaffold. It already implements a substantial
local runtime baseline:

- TypeScript, Node 22+, pnpm workspaces, Turborepo, ESLint, Vitest, and CI;
- shared contracts in `packages/types`;
- semantic validation in `packages/validator`;
- shared host client and presentation helpers in `packages/host-client`;
- internal provider-backed engine boundary in `packages/agent-engine`;
- package scaffolding in `packages/package-scaffold`;
- `entangle-host` local control plane with durable local state;
- `entangle-runner` per-node runtime with long-lived intake;
- local Nostr transport over `strfry`;
- local Gitea/git-backed artifact publication and retrieval;
- host-managed Docker-backed runner lifecycle;
- graph, node, edge, package-source, principal, runtime, session, turn,
  approval, artifact, recovery, status, and event inspection surfaces;
- Studio and CLI as clients of the same host boundary;
- local preflight, active smoke, disposable smoke, and disposable runtime smoke.
- first per-node agent-runtime contracts in the catalog, graph spec,
  effective runtime context, validator, and host materialization path, with
  OpenCode as the required default node engine profile.

## Durable Fix From This Audit

The audit found that `packages/types/src/runtime/git-resolution.ts` imported
`node:path`. Because `@entangle/types` is exported as one shared package, that
Node-only import leaked into the Studio browser bundle and produced a Vite
browser-compatibility warning during production build.

The fix replaced that dependency with small portable path helpers inside the
shared contract package. The Studio production build no longer emits the
Node `path` externalization warning. The remaining Studio build warning is the
known Vite chunk-size warning for the current bundle.

## Milestone Truth Table

| Milestone | Current truth | Evidence | Primary blockers |
| --- | --- | --- | --- |
| R1 / L1 Local Operator Baseline | Released as `v0.1-local-operator-baseline`. | Host, runner, Studio, CLI, local Compose, active/disposable/runtime smokes all passed in this audit and the final release packet records the release boundary. | None for R1/L1; next work moves to L1.5. |
| R1.1 / L1.5 Local Operator Preview | Released as `v0.1.5-local-operator-preview`. | Canonical preview assets and a near-one-command demo path reuse the same host, runner, local relay, model-stub, and Gitea/git-backed artifact flow as the runtime smoke. | None for L1.5; next work moves to L2 Local Workbench. |
| R1.2 / L2 Local Workbench | Released as `v0.2-local-workbench`. | Package scaffold/admission, package inspect, package tool-catalog validation, graph/node/edge mutation, shared graph diff for CLI and Studio, Studio active-graph validation, host graph import/export through the CLI, CLI graph template export, host API plus CLI and Studio session launch over host-resolved runtime context, CLI launch wait polling through host session inspection, runtime/session/artifact/turn/approval inspection, artifact filtering and bounded preview, and runtime memory inspection with bounded page preview exist. | None for L2; graph bundles, artifact history/diff, and relay-publish retry remain later work. |
| R1.3 / L3 Agentic Node Runtime | Contract, host-context foundation, and first safe OpenCode process execution path exist, but the product milestone is not complete. | Catalog-level `agentEngineProfiles`, graph/node `agentRuntime`, effective runtime `agentRuntimeContext`, validator semantics, host default OpenCode profile, per-node engine/source/wiki workspace roots, and runner OpenCode CLI/process adapter exist. | Policy bridge, richer engine lifecycle, permission/approval mapping, artifact/diff harvesting, CLI/Studio runtime configuration, git/wiki repository behavior. |
| R1.4 / L4 Local Reliability | Early reliability foundation exists, but reliability product is incomplete and must follow L3. | Strict preflight, active smoke, disposable smoke, runtime smoke, reset through Compose volume teardown. | Doctor command, repair flow, backup/restore, local state versioning, upgrade checks, logs bundle, conservative drift repair. |
| L5 Entangle Local GA | Not ready and must not be claimed. | Core local runtime works, but agentic-node-runtime, reliability, onboarding, and release-discipline gaps remain. | Complete Local docs, install/demo path, OpenCode-backed node execution, repair/backup/upgrade, release notes, website claim audit, GA tag only after all gates pass. |

## Existing Capability Matrix

| Area | Exists | Partial | Unsupported / excluded |
| --- | --- | --- | --- |
| Contracts and schemas | Package, graph, runtime context, per-node agent runtime selection, A2A, artifacts, sessions, approvals, turns, host DTOs. | Some deeper diagnostics, OpenCode runtime DTOs, and future API generation remain later work. | Production tenancy contracts. |
| Host control plane | Local persistent state, resource mutation, runtime lifecycle, events, recovery, session and runtime inspection. | `DELETE /v1/runtimes/{nodeId}` remains absent from the broader spec. | Production RBAC/ABAC and multi-tenant auth. |
| Runner | Long-lived service, Nostr intake, approval handling, handoff, artifacts, and memory around an injected engine boundary. | OpenCode-backed coding-agent execution, engine lifecycle bridging, and cross-host/global session semantics remain future work. | Legacy one-turn model inference as a node runtime, remote federation, and production scheduler. |
| Artifact flow | Git-backed local materialization, publication, retrieval, downstream handoff proof, host-owned bounded text preview for local materialized report artifacts. | Rich artifact kinds, history/diff, and fallback replication are later work. | Object-storage artifact service before Cloud. |
| Studio | Host-backed graph, graph revision diff, active-graph validation, runtime, recovery, trace, session launch, session inspection, turn, approval, artifact preview, runtime memory preview, package-source, principal, node, and edge views. | First-run demo UX, imported-candidate graph validation, artifact history/diff, and graph bundle ergonomics. | SaaS/workspace admin UI before Local GA. |
| CLI | Offline validation, package init and inspect, graph diff, graph template export, host graph import/export, host inspection, graph/resources/runtimes/sessions/artifacts/approvals/turns/events/memory, local session launch with optional wait polling, artifact session filtering and preview, memory page preview, mutation dry runs, and root-relative path handling under `pnpm --filter @entangle/cli dev`. | Relay-publish retry, graph bundle export ergonomics, and package import/export depth. | Production cloud automation auth before Local GA. |
| Deployment | Local Compose profile with Studio, host, strfry, Gitea, dynamic runner image, preflight and smokes. | Non-disposable upgrade/repair handling. | Cloud or Enterprise deployment profiles. |
| QA | `pnpm verify`, lint/typecheck/test, build, CI, local preflight, active and disposable smokes. | Clean-clone/RC rehearsal still required before tags. | Hiding or bypassing failing tests. |

## Verification Evidence

Commands run during this audit:

```bash
pnpm install --frozen-lockfile
git diff --check
pnpm verify
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm ops:check-local:strict
pnpm ops:smoke-local:disposable:runtime
pnpm ops:smoke-local:disposable --skip-build --keep-running
pnpm ops:smoke-local
docker compose -f deploy/local/compose/docker-compose.local.yml down --volumes
```

Results:

- dependency install passed from the lockfile;
- whitespace check passed;
- `pnpm verify` passed;
- explicit lint, typecheck, and test commands passed;
- production build passed;
- strict local preflight passed with Docker daemon access;
- disposable runtime smoke passed, including active local profile smoke,
  two managed runners, restart proof, NIP-59 task publication, provider-backed
  OpenAI-compatible model-stub execution, git-backed artifact publication,
  downstream artifact retrieval by `ArtifactRef`, runtime stop, and teardown;
- standalone disposable local smoke passed with `--skip-build --keep-running`;
- standalone active local smoke passed against the running profile;
- the kept-running Compose profile was torn down with volumes.

One aggregate `pnpm build` attempt was manually stopped after Vite/Rolldown
became idle in the Studio build step. A direct Studio build immediately
completed, and a repeated aggregate `pnpm build` completed successfully. This
is recorded as a transient local build-run hang, not a reproducible repository
failure.

## Known Limitations

- The productized Local profile still carries the legacy machine value
  `hackathon_local`; this is not a public product claim, but should be retired
  before Local Workbench or GA.
- Studio's production bundle still exceeds Vite's default 500 kB chunk warning.
- Local has reset-by-volume-teardown but no productized doctor, repair,
  backup, restore, or upgrade command yet.
- Local has CLI and Studio session launch over the host boundary, CLI wait
  polling over host session inspection, bounded report-artifact preview, and
  runtime memory inspection. Relay-publish retry, graph bundles, artifact
  history/diff, and the full OpenCode-backed agentic-node runtime are not
  complete.
- Per-node agent runtime contracts now exist and default to OpenCode, and the
  runner has a first safe OpenCode CLI/process adapter. It still lacks the
  complete policy bridge, artifact harvesting, and UI/CLI configuration
  surface required for L3 acceptance.
- Website claims have not been audited in this pass.

## Execution Plan

The detailed task, constraint, and mandatory per-step audit-loop breakdown now
lives in
[189-entangle-local-completion-plan.md](189-entangle-local-completion-plan.md).

1. Build L3 Agentic Node Runtime.
   - Keep Entangle as graph, identity, policy, artifact, wiki, and
     communication runtime.
   - Integrate OpenCode as the first serious per-node coding-agent engine.
   - Keep the old model-endpoint adapter out of the public node-runtime
     catalog.
2. Build L4 Local Reliability.
   - Add local doctor.
   - Add conservative repair.
   - Add backup/restore and state-version checks.
   - Add logs collection and repeated-use validation.
3. Cut L5 Local GA.
   - Run clean-state validation.
   - Align docs, README, release notes, roadmap, and website claims.
   - Make limitations explicit.
   - Tag GA only after all gates pass.
