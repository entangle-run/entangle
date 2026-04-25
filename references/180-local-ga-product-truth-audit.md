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
- generic host runtime inspection status for effective agent-runtime mode,
  engine profile, state scope, last engine version/session, last engine turn,
  and bounded engine failure evidence, consumed by shared host-client, CLI, and
  Studio presentation surfaces.
- OpenCode adapter version probing before node turns, generic engine-version
  outcome persistence, and bounded process timeout handling for the OpenCode
  probe and one-shot run process.
- generic engine permission observations and `policy_denied` outcome handling
  when OpenCode one-shot CLI auto-rejects a permission request, surfaced through
  host runtime inspection, shared host-client, CLI, and Studio details.
- generic runtime workspace-health inspection for the current Local node
  workspace layout, including source, artifact, engine-state, retrieval, and
  wiki-repository surfaces.
- runner-owned source workspace change harvesting for node turns, surfaced as
  bounded changed-file and diff summaries through runner turn records, host
  activity events, runtime inspection, shared host-client presentation, CLI,
  and Studio.
- durable pending source-change candidate records for changed node turns,
  exposed through read-only host, host-client, CLI, and Studio inspection
  surfaces, including bounded diff inspection when shadow-git tree snapshots
  are available, bounded preview for files listed on the candidate, and
  audited review lifecycle mutation for accepted/rejected/superseded
  decisions plus explicit runtime-local source-history application for
  accepted candidates.
- source-history publication for applied source-history records, producing
  git commit artifact records, persisting publication metadata and resolved
  git targets, requiring explicit retry after failed publication attempts,
  enforcing node source mutation approval policy for non-primary targets by
  default, emitting `source_history.published`, and exercising local
  `file://` git remotes through real git pushes in host coverage.
- approval request metadata, approval records, observed approval activity, and
  approval trace events now carry optional operation and resource scope; source
  application and source-history publication gates require exact operation and
  resource matches when approval ids are supplied.
- bounded runtime artifact history and diff inspection for supported
  materialized git artifacts, exposed through the host API, shared host
  client, CLI, and Studio.
- the active Local runtime profile now uses the stable machine value `local`
  instead of the legacy `hackathon_local` value.

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
| R1.2 / L2 Local Workbench | Released as `v0.2-local-workbench`. | Package scaffold/admission, package inspect, package tool-catalog validation, graph/node/edge mutation, shared graph diff for CLI and Studio, Studio active-graph validation, host graph import/export through the CLI, CLI graph template export, host API plus CLI and Studio session launch over host-resolved runtime context, CLI launch wait polling through host session inspection, runtime/session/artifact/turn/approval inspection, artifact filtering, bounded preview, bounded git history/diff inspection, and runtime memory inspection with bounded page preview exist. | None for L2; graph bundles, artifact restore/replay, and relay-publish retry remain later work. |
| R1.3 / L3 Agentic Node Runtime | Contract, host-context foundation, first safe OpenCode process execution path, first generic status surface, source-change harvesting, pending candidate read surface, bounded candidate diff inspection, bounded listed-file preview, candidate review mutation, local source-history application, target-aware retryable source-history publication with scoped approval gates, and bounded git artifact history/diff inspection exist, but the product milestone is not complete. | Catalog-level `agentEngineProfiles`, graph/node `agentRuntime`, effective runtime `agentRuntimeContext`, validator semantics, host default OpenCode profile, per-node source/artifact/engine-state/wiki workspace roots, runner OpenCode CLI/process adapter, node-scoped OpenCode DB/config/XDG runtime roots, pre-spawn workspace/state checks, OpenCode version probing, bounded process timeout handling, generic engine-session-id/version/permission turn observability, `policy_denied` classification for one-shot OpenCode permission auto-rejections, generic workspace-health runtime inspection, runner-owned source workspace change summaries, durable pending source-change candidates, bounded candidate diff inspection, bounded listed-file preview, audited accepted/rejected/superseded candidate review mutation, local source-history application records with optional approval linkage, source commit artifact publication records with explicit retry, target-selection controls, operation/resource-scoped approval linkage, bounded git artifact history/diff APIs, and generic host runtime `agentRuntime` inspection consumed by CLI and Studio exist. | Full policy bridge, richer engine lifecycle, live OpenCode permission/approval mapping, operator-facing scoped approval request creation, non-primary publication provisioning/fallback behavior, artifact restore/replay workflow, external cancellation bridge, full CLI/Studio runtime configuration, git/wiki repository behavior. |
| R1.4 / L4 Local Reliability | Early reliability foundation exists, but reliability product is incomplete and must follow L3. | Strict preflight, active smoke, disposable smoke, runtime smoke, reset through Compose volume teardown, and first read-only `entangle local doctor` diagnostics with JSON and strict/offline modes. | Repair flow, backup/restore, local state versioning, upgrade checks, logs bundle, conservative drift repair, and deeper doctor remediation. |
| L5 Entangle Local GA | Not ready and must not be claimed. | Core local runtime works, but agentic-node-runtime, reliability, onboarding, and release-discipline gaps remain. | Complete Local docs, install/demo path, OpenCode-backed node execution, repair/backup/upgrade, release notes, website claim audit, GA tag only after all gates pass. |

## Existing Capability Matrix

| Area | Exists | Partial | Unsupported / excluded |
| --- | --- | --- | --- |
| Contracts and schemas | Package, graph, node source mutation policy, runtime context, per-node agent runtime selection, A2A, artifacts, sessions, approvals with operation/resource scope, turns, generic engine-session-id/version outcomes, generic engine permission observations, source-change summaries, source-change candidate records, review/application metadata with approval linkage, source-history records with application/publication approval linkage, source-history publication DTOs, `source_history.published` events, generic agent-runtime inspection DTOs, workspace-health inspection DTOs, host DTOs. | Some deeper diagnostics, live OpenCode approval DTOs, and future API generation remain later work. | Production tenancy contracts. |
| Host control plane | Local persistent state, resource mutation, runtime lifecycle, events, recovery, session and runtime inspection, including effective agent-runtime status summaries, workspace-health summaries, latest source-change summaries, source-change candidate list/detail APIs, bounded candidate diff APIs, bounded candidate file-preview APIs, audited source-change candidate review mutation APIs, local source-history apply/list/detail APIs, and source-history publish APIs that create git commit artifact records with explicit retry, git target selection, and operation/resource-scoped node-policy approval gates. | `DELETE /v1/runtimes/{nodeId}` remains absent from the broader spec. Non-primary provisioning and fallback publication behavior remain absent. | Production RBAC/ABAC and multi-tenant auth. |
| Runner | Long-lived service, Nostr intake, scoped approval handling, handoff, artifacts, memory around an injected engine boundary, first OpenCode process lifecycle checks with version probing and bounded timeout handling, first generic permission-block observation for OpenCode one-shot auto-rejections, runner-owned source workspace change harvesting after engine turns, and pending source-change candidate creation. | OpenCode-backed coding-agent execution quality, engine lifecycle bridging, live policy/approval mapping, operator-facing approval request creation for source mutation scopes, and cross-host/global session semantics remain future work. | Legacy one-turn model inference as a node runtime, remote federation, and production scheduler. |
| Artifact flow | Git-backed local materialization, publication, retrieval, downstream handoff proof, host-owned bounded text preview for local materialized report artifacts, source-change evidence on turns, pending source-change candidate records, bounded candidate diff inspection, bounded listed-file preview, candidate review state, local source-history commits, source commit artifact records from published source-history entries, and bounded git artifact history/diff inspection. | Rich artifact kinds, artifact restore/replay workflow, and fallback replication are later work. | Object-storage artifact service before Cloud. |
| Studio | Host-backed graph, graph revision diff, active-graph validation, runtime, runtime agent profile/session/workspace-health/source-change status, source-change candidate inspection with bounded diff, listed-file preview, review actions, source-history apply/list/detail/publish with approval evidence, recovery, trace, session launch, session inspection, turn, approval, artifact preview, runtime memory preview, package-source, principal, node, and edge views. | First-run demo UX, imported-candidate graph validation, richer source publication history views, graph bundle ergonomics, and full agent-runtime configuration panels. | SaaS/workspace admin UI before Local GA. |
| CLI | Offline validation, package init and inspect, graph diff, graph template export, host graph import/export, host inspection, graph/resources/runtimes/sessions/artifacts/approvals/turns/source-candidates/source-history/events/memory, runtime agent profile/session/workspace-health/source-change status, source-candidate diff/listed-file inspection, review mutation, approval-linked source-history application and retryable target-aware publication, local session launch with optional wait polling, first `local doctor` diagnostics, artifact session filtering and preview, memory page preview, mutation dry runs, and root-relative path handling under `pnpm --filter @entangle/cli dev`. | Relay-publish retry, graph bundle export ergonomics, package import/export depth, richer policy configuration commands, explicit agent-runtime configuration commands, and repair/backup/restore commands. | Production cloud automation auth before Local GA. |
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

- Historical release packets still mention the former `hackathon_local` machine
  value as historical evidence. Active schemas, scaffolds, examples, tests, and
  smoke scripts now use the stable `local` runtime profile.
- Studio's production bundle still exceeds Vite's default 500 kB chunk warning.
- Local has reset-by-volume-teardown and a first read-only doctor diagnostic,
  but no productized repair, backup, restore, or upgrade command yet.
- Local has CLI and Studio session launch over the host boundary, CLI wait
  polling over host session inspection, bounded report-artifact preview,
  bounded git artifact history/diff inspection, and runtime memory inspection.
  Relay-publish retry, graph bundles, artifact restore/replay, and the full
  OpenCode-backed agentic-node runtime are not complete.
- Per-node agent runtime contracts now exist and default to OpenCode, and the
  runner has a first safe OpenCode CLI/process adapter plus generic host/CLI/
  Studio status for effective runtime profile, last engine version, and last
  engine session. The adapter now probes OpenCode version and applies bounded
  process timeouts, and it now reports one-shot OpenCode permission
  auto-rejections as generic `policy_denied` outcomes. Runtime inspection now
  also reports generic workspace health for the current source/artifact/
  engine-state/wiki layout, the latest runner-owned source-change summary, the
  latest pending source-change candidate id, bounded candidate diff inspection,
  bounded preview for files listed on a candidate, audited
  accepted/rejected/superseded candidate review mutation, local source history
  application with optional approval linkage, retryable target-aware source
  commit artifact publication with operation/resource-scoped node-policy
  approval gates, and bounded
  artifact history/diff inspection. Entangle Local still lacks the complete
  policy bridge, live OpenCode approval mapping, operator-facing scoped
  approval request creation, external cancellation, non-primary publication
  provisioning/fallback, artifact restore/replay workflow, doctor integration,
  and full UI/CLI configuration surface required for L3 acceptance.
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
