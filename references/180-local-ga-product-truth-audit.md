# Entangle Local GA Product Truth Audit

Date: 2026-04-25.

## Purpose

This audit is the current product-truth baseline for carrying Entangle Local
from the active R1/L1 local operator release toward Local GA.

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
| R1.3 Local Reliability | L3 | Doctor, repair, backup, restore, upgrade, and diagnostics. |
| GA Entangle Local GA | L4 | Complete local/developer product. |

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
| R1 / L1 Local Operator Baseline | Functionally ready for release closure, not tagged. | Host, runner, Studio, CLI, local Compose, active/disposable/runtime smokes all pass in this audit. | Final release notes, exact release evidence in ledger/release packet, tag decision, clean committed state. |
| R1.1 / L1.5 Local Operator Preview | Partially planned, not productized. | Core runtime path is usable through smoke scripts and host clients. | Canonical demo assets, near-one-command demo, documented happy path, troubleshooting, clearer first-run operator UX. |
| R1.2 / L2 Local Workbench | Partially implemented below the final workbench bar. | Package scaffold/admission, graph/node/edge mutation, runtime/session/artifact/turn/approval inspection exist. | Session launch flow, graph templates, graph import/export/diff, artifact preview/history, memory workbench, CLI parity for launch/export workflows. |
| R1.3 / L3 Local Reliability | Early reliability foundation exists, but reliability product is incomplete. | Strict preflight, active smoke, disposable smoke, runtime smoke, reset through Compose volume teardown. | Doctor command, repair flow, backup/restore, local state versioning, upgrade checks, logs bundle, conservative drift repair. |
| L4 Entangle Local GA | Not ready and must not be claimed. | Core local runtime works, but workbench/reliability/onboarding/release-discipline gaps remain. | Complete Local docs, install/demo path, workbench workflows, repair/backup/upgrade, release notes, website claim audit, GA tag only after all gates pass. |

## Existing Capability Matrix

| Area | Exists | Partial | Unsupported / excluded |
| --- | --- | --- | --- |
| Contracts and schemas | Package, graph, runtime context, A2A, artifacts, sessions, approvals, turns, host DTOs. | Some deeper diagnostics and future API generation remain later work. | Production tenancy contracts. |
| Host control plane | Local persistent state, resource mutation, runtime lifecycle, events, recovery, session and runtime inspection. | `DELETE /v1/runtimes/{nodeId}` remains absent from the broader spec. | Production RBAC/ABAC and multi-tenant auth. |
| Runner | Long-lived service, Nostr intake, engine turns, approval handling, handoff, artifacts, memory. | Cross-host/global session semantics remain future work. | Remote federation and production scheduler. |
| Artifact flow | Git-backed local materialization, publication, retrieval, downstream handoff proof. | Rich artifact kinds, preview/history, and fallback replication are later work. | Object-storage artifact service before Cloud. |
| Studio | Host-backed graph, runtime, recovery, trace, session, turn, approval, artifact, package-source, principal, node, and edge views. | First-run demo UX, session launch, artifact preview, memory workbench. | SaaS/workspace admin UI before Local GA. |
| CLI | Offline validation, package init, host inspection, graph/resources/runtimes/sessions/artifacts/approvals/turns/events, mutation dry runs. | Higher-level local demo/session-launch/export ergonomics. | Production cloud automation auth before Local GA. |
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

- No final R1/L1 release notes exist yet.
- No release tag exists for `v0.1-local-operator-baseline`.
- The productized Local profile still carries the legacy machine value
  `hackathon_local`; this is not a public product claim, but should be retired
  before Local Workbench or GA.
- Studio's production bundle still exceeds Vite's default 500 kB chunk warning.
- Local has reset-by-volume-teardown but no productized doctor, repair,
  backup, restore, or upgrade command yet.
- Local has strong inspection surfaces but not the final Studio/CLI session
  launch and workbench flow.
- Website claims have not been audited in this pass.

## Execution Plan

1. Close R1/L1.
   - Write final release notes.
   - Update ledger evidence with final command output.
   - Confirm clean committed state.
   - Tag `v0.1-local-operator-baseline` only after the release packet is true.
2. Build R1.1/L1.5 Local Operator Preview.
   - Add demo package and graph.
   - Add near-one-command demo path.
   - Document happy path and troubleshooting.
   - Keep disposable runtime smoke as the proof path.
3. Build R1.2/L2 Local Workbench.
   - Add package validate/import/inspect depth.
   - Add graph templates/import/export/diff.
   - Add host-backed session launch from Studio and CLI.
   - Add artifact and memory workbench surfaces.
4. Build R1.3/L3 Local Reliability.
   - Add local doctor.
   - Add conservative repair.
   - Add backup/restore and state-version checks.
   - Add logs collection and repeated-use validation.
5. Cut L4 Local GA.
   - Run clean-state validation.
   - Align docs, README, release notes, roadmap, and website claims.
   - Make limitations explicit.
   - Tag GA only after all gates pass.
