# Entangle Wiki Log

## [2026-04-22] implementation | Add machine-readable A2A and runner state contracts

Added canonical `@entangle/types` ownership for Entangle A2A payloads and
runner-local session, conversation, approval, and turn-state contracts.
Added validator surfaces for A2A documents and lifecycle transition checks, and
aligned the protocol and runner references with the new machine-readable
ownership.

## [2026-04-22] implementation | Materialize stable host-owned runtime identities

Moved per-node Nostr identity ownership into the host, added non-secret
`identityContext` to the effective runtime context, introduced a separate local
secret storage profile, and made the runner reject identity drift instead of
silently generating ephemeral authorship.

## [2026-04-22] bootstrap | Initialized project wiki

Created the first project wiki structure, schema, index, and initial concept, decision, source, and session pages.

## [2026-04-22] ingest | Imported Entangle design corpus into references and wiki

Structured the current state of the project into a detailed references corpus and a wiki intended for long-term project memory and design management.

## [2026-04-22] ingest | Recorded reference repository manifest

Documented the primary upstream repositories that should be mirrored into `resources/` once GitHub becomes reachable from the execution environment.

## [2026-04-22] ingest | Materialized external reference repositories

Cloned the tracked reference repositories into `resources/` and recorded their exact commit SHAs in the resources manifest.

## [2026-04-22] decision | Removed Claude Code leak mirror from local resources

Removed the public Claude Code leak mirror from `resources/` and updated the project corpus to avoid carrying a toxic reference with low practical value relative to its risk.

## [2026-04-22] decision | Kept qmd as optional wiki and memory tooling

Retained `qmd` in `resources/`, but explicitly downgraded its role to optional tooling for search, wiki navigation, and future memory workflows rather than a core Entangle runtime dependency.

## [2026-04-22] ingest | Added Nostr and relay implementation references

Added `nostr-tools`, `strfry`, and `khatru` to `resources/` to cover the protocol library layer and the relay implementation / relay-framework design space.

## [2026-04-22] decision | Chose an initial implementation stack direction

Recorded a stack recommendation centered on TypeScript, `nostr-tools`, `strfry`, `Gitea`, Docker Compose, and a Studio-plus-runner split.

## [2026-04-22] decision | Established a mandatory repository audit loop

Corrected stale status statements after the reference corpus was materialized locally and formalized a standing rule: every substantial Entangle interaction should start with a repository audit pass and update the corpus when durable state changes.

## [2026-04-22] ingest | Recorded recommended Codex CLI workflow

Added a project-specific Codex CLI usage page describing which commands are worth using for Entangle, which ones are secondary, and the recommended interactive, review, continuation, and automation loops.

## [2026-04-22] decision | Dropped the idea of a Codex init step

Verified that the current Codex CLI in this environment has no `codex init` subcommand. Entangle bootstrap should therefore be handled as normal repository scaffolding plus Codex-assisted implementation, not as a Codex-specific initialization phase.

## [2026-04-22] decision | Distinguished shell commands from interactive slash commands

Recorded that Codex shell subcommands and interactive slash commands are different interfaces. Clarified that interactive `/init` can still make sense conceptually even though `codex init` is not a shell subcommand in this environment.

## [2026-04-22] decision | Added root AGENTS instructions for Entangle

Added a repository-level `AGENTS.md` file so future Codex sessions have immediate project-specific instructions at the root instead of relying only on the wiki schema under `wiki/AGENTS.md`.

## [2026-04-22] decision | Kept cloned resources out of root git history

Corrected the repository baseline so the cloned upstream repositories under `resources/` remain local research material rather than accidental embedded repositories in the main Entangle git history. Also fixed the refresh loop to iterate only over actual git directories.

## [2026-04-22] milestone | Prepared the first committed project baseline

Closed the initial bootstrap phase with a clean repository baseline ready for the first commit: canonical documents aligned, root `AGENTS.md` added, local resource policy corrected, and git staging behavior verified before publishing the initial history to GitHub.

## [2026-04-22] ingest | Added A2A and MCP as secondary protocol references

Cloned the Google-led A2A protocol repository and the official Model Context Protocol repository into `resources/` as secondary references. Recorded their role as comparison and boundary-layer references rather than as replacements for Entangle's internal Nostr-native protocol model.

## [2026-04-22] decision | Renamed local Nostr spec mirror from nips-official to nips

Simplified the local reference name from `nips-official` to `nips` and updated the corpus so the local path naming is shorter and cleaner while preserving the same upstream reference.

## [2026-04-22] decision | Added a high-rigor Codex workflow for deep specification work

Recorded a project-specific workflow for using Codex during deep specification, architecture decision-making, and implementation planning so the project can optimize for durable system quality rather than fast but weak early choices.

## [2026-04-22] specification | Added normative contract rules for Entangle core types

Extended the design corpus beyond descriptive architecture by adding a normative layer for core contract invariants, normalization and validation rules, and runtime state machines. This makes the corpus substantially more implementation-ready for a serious team build rather than only conceptually coherent.

## [2026-04-22] specification | Expanded the corpus into packaging, edge policy, artifact, control-plane, and compatibility specs

Added a deeper operational specification layer covering the on-disk AgentPackage standard and binding model, the semantic matrix for edge behavior, the artifact backend contract with git as the first serious backend, the control plane and graph mutation rules, and the versioning/migration policy needed for durable long-term evolution.

## [2026-04-22] specification | Added observability, Studio, hackathon-profile, and phase-gate specs

Extended the corpus again to cover trace and observability requirements, the responsibilities of Entangle Studio as a truthful graph-aware client, the exact hackathon runtime profile as a restricted subset of the full architecture, and the quality gates that define when the project is actually ready to move from specification into architecture and implementation decisions.

## [2026-04-22] specification | Clarified that the hackathon graph should be visibly non-flat

Adjusted the hackathon-facing documents so the demo is no longer framed as a simple entrypoint-plus-workers tree. The preferred hackathon graph should now show a more expressive organizational structure, such as multiple supervisory branches, peer collaborators, and at least one deeper delegation chain.

## [2026-04-22] decision | Split Studio from local runtime orchestration through a host control-plane service

Clarified that Studio should be the operator-facing graph and runtime administration surface, but should not directly own Docker or process lifecycle logic. Added a concrete `entangle-host` architectural role to own applied local graph state, package admission, runtime materialization, and local runner lifecycle while preserving Studio as the most convenient user-facing control surface.

## [2026-04-22] decision | Made headless operation a first-class architectural requirement

Clarified that Entangle should remain operable without the visual frontend. Studio is the preferred graph-aware surface, but CLI and automation should use the same host control-plane boundary rather than introducing separate privileged paths or making the frontend the only serious way to operate the system.

## [2026-04-22] decision | Chose a monorepo-first topology with thin CLI and package scaffolding

Clarified that Entangle should remain a single monorepo through the hackathon and early product phase, with explicit internal package boundaries rather than multiple repositories. Also recorded that Studio is a core hackathon deliverable, while CLI and package scaffolding are worthwhile if they remain thin surfaces over shared host, validator, and scaffold packages rather than turning into separate parallel products.

## [2026-04-22] decision | Separated Nostr identity from git credentials and signing surfaces

Clarified that a node's Nostr keypair is the authoritative Entangle protocol identity, but should not be reused directly as the git transport credential. Recorded a stronger identity model where external git principals, transport secrets, commit attribution, and optional commit-signing material are related but distinct surfaces.

## [2026-04-22] decision | Made relay, git service, and model endpoint resources deployment-scoped and bindable

Clarified that Entangle must not hardcode one relay, one git server, or one model endpoint as product truth. Recorded a stronger model where the host owns a deployment-scoped resource catalog, graphs may define defaults, nodes may bind different resource profiles, and the hackathon uses the restricted case of one shared relay profile, one shared git service profile, and one shared model profile.

## [2026-04-22] specification | Added host API, reconciliation, and effective runtime context contracts

Extended the corpus from architectural roles into explicit implementation-facing contracts for the host control plane and the runner boundary. Specified a first serious host API shape, desired-versus-observed state reconciliation, and the effective binding/runtime context model that resolves graph, resource, and secret inputs before a runner starts.

## [2026-04-22] specification | Added engine-adapter and local deployment topology contracts

Extended the corpus again to clarify the provider-facing side of the runner and the local deployment profile. Recorded an internal engine-adapter boundary for model execution, a recommended first operational `anthropic` adapter for the hackathon, and a Compose-based local topology where stable services are booted statically while runner containers are created dynamically by the host.

## [2026-04-22] decision | Made coherent commits part of the standard repository loop

Clarified that audit and documentation updates are not enough on their own. After each substantial interaction that leaves durable repository changes, the batch should be committed once the repository is internally consistent, so the working baseline is not left suspended in an uncommitted state.

## [2026-04-22] audit | Ran the first full pre-implementation repository audit

Performed a systematic read of the canonical corpus, wiki, root project documents, and selected upstream references. Corrected drift where earlier documents still described the hackathon as a flat orchestrator tree, where runner input language had not caught up with effective bindings, where the host API was still described as only loosely defined, and where the wiki overview still pointed to already-completed architecture work as the next step.

## [2026-04-22] decision | Froze local package admission, Docker-backed host access, and the canonical monorepo toolchain

Clarified that Studio-driven package admission must resolve into host-owned `local_path` or `local_archive` package sources instead of browser-local filesystem handles; clarified that the local Docker profile should give `entangle-host` explicit access to the Docker Engine for dynamic runner management; and tightened the stack recommendation from a Bun-friendly posture into a canonical TypeScript + Node 22 + pnpm + Turborepo toolchain.

## [2026-04-22] decision | Froze the internal agent-engine boundary, host-state layout, and hackathon CLI profile

Closed the last pre-implementation questions by deciding that Entangle should own a first-party internal `agent-engine` package rather than embed an upstream runtime wholesale, by freezing `.entangle/` as the default local host-state root with explicit desired/observed/trace/import/workspace partitions, and by fixing the hackathon CLI to a thin but real profile centered on offline validation, package scaffolding, and minimal online host operations.

## [2026-04-22] audit | Corrected final pre-scaffold drift in executive summary, ignore policy, and phase wording

Ran a follow-up coherence pass on the post-audit refinement batch. Corrected the remaining stale executive-summary description of the hackathon graph, aligned the ignore policy with the now-canonical `.entangle/` runtime root and upcoming pnpm/turbo tooling, and tightened the wiki overview so it reflects that implementation-readiness has passed while the repository remains under the standard audit loop.

## [2026-04-22] decision | Froze schema ownership and downgraded the remaining open questions to non-blocking tradeoffs

Clarified that `packages/types` must own the primary `zod` schemas and host API DTO contracts, with validators, host routes, CLI, and Studio consuming those contracts rather than redefining them. Also updated the open-questions document so it no longer presents already-resolved implementation decisions as active blockers, and instead tracks only residual future-facing tradeoffs.

## [2026-04-22] implementation | Scaffolded the first real monorepo baseline and verified the toolchain

Created the first implementation-grade monorepo layout under `apps/`, `services/`, `packages/`, and `deploy/`. Added the initial workspace/tooling files, the first machine-readable schemas in `packages/types`, a bootstrap validator layer, a host client, a package scaffold utility, a Fastify-based host bootstrap, a runner stub, a thin CLI, a first Studio scaffold, and the first Compose/Docker deployment profile. Verified that `pnpm install`, `pnpm typecheck`, and `pnpm build` pass on the scaffolded workspace after normalizing TypeScript workspace resolution and cleaning build artifacts.

## [2026-04-22] implementation | Turned the host scaffold into a real local control-plane baseline

Extended the implementation from a status-only bootstrap into a first serious local control-plane slice. Added shared host DTOs for catalog, package-source, and graph operations; strengthened validator semantics with package-source resolution, graph-default checks, and realizable edge transport checks; implemented persistent host state under `.entangle/host`; added catalog, package-source, and graph routes to `entangle-host`; taught the CLI to operate those routes; and removed the fake demo graph from Studio so it now renders live host state. Re-verified the workspace with `pnpm build`, and manually exercised the host-plus-CLI flow for catalog inspection, package admission, graph validation, graph apply, and graph retrieval.

## [2026-04-22] implementation | Added the first enforced quality baseline

Raised the repository quality bar from manual discipline alone to an explicit engineering baseline. Added real ESLint-based linting, first Vitest suites for validator, host-client, package-scaffold, and host API behavior, a GitHub Actions CI workflow, and a root `pnpm verify` aggregate gate. Hardened host error semantics so invalid client input and missing resources are returned as structured 4xx responses instead of generic 500s, and documented the stricter audit-plus-quality policy in the canonical corpus.

## [2026-04-22] implementation | Added runtime materialization and runtime host surfaces

Extended `entangle-host` from graph persistence into runtime preparation. The host now resolves effective bindings, writes runtime intents and observed runtime records, materializes per-node workspaces, injects `effective-runtime-context.json`, and exposes the first runtime inspection and lifecycle routes through the same host boundary used by CLI and tests.

## [2026-04-22] implementation | Replaced the runner bootstrap stub with injected-context bootstrap logic

Extended `entangle-runner` so it now loads injected runtime context from disk, reads package prompt files and runtime config, constructs a normalized agent-engine turn request, and executes a first stub-engine turn from real materialized node state rather than from a hardcoded inline request.

## [2026-04-22] implementation | Added runtime-backend abstraction and persisted reconciliation state

Extended `entangle-host` from runtime materialization into a first real runtime-backend and reconciliation slice. Added an explicit runtime-backend boundary, introduced a tested in-memory backend and a first Docker backend, switched package materialization from workspace symlink assumptions to runtime package snapshots, persisted reconciliation snapshots under observed host state, and exposed richer runtime/status fields through the host surface.

## [2026-04-22] quality | Tightened build-first contract checking for workspace type safety

Clarified and enforced that workspace-wide typechecking must not silently depend on stale generated contract outputs. The local quality baseline now treats fresh contract builds as part of the type-safety gate so downstream packages do not drift behind newly changed shared schemas.

## [2026-04-22] verification | Smoke-validated the Docker runtime backend against a real runner container

Built the local `entangle-runner:local` image, admitted a package, applied a graph under the Docker backend profile, and confirmed that `entangle-host` created and observed a real runner container as `running`. Cleaned up the temporary runtime afterward.

## [2026-04-22] implementation | Replaced Docker CLI shell-outs with a first-party Docker Engine API client

Refined the Docker runtime backend so `entangle-host` no longer shells out to the `docker` binary for image inspection and container lifecycle. Added a first-party Docker Engine API client with unix-socket coverage tests, injected that boundary into the runtime backend for better testability, and removed the host container's dependency on the Docker CLI package while keeping the Docker socket as the explicit local operator control path.

## [2026-04-22] implementation | Replaced the blunt build-first typecheck gate with an explicit TypeScript project graph

Refined the workspace toolchain so type safety is now driven by an explicit TypeScript project-reference graph instead of a generic `pnpm build` pre-step before workspace-wide typechecking. Added a root solution `tsconfig`, declared references across the composite packages and Node services, aligned composite package scripts around `tsc -b`, and kept Studio as a separate bundler-driven typecheck surface.

## [2026-04-22] implementation | Replaced per-node package copies with an immutable host-managed package store

Refined package materialization so admitted package contents are now hashed and materialized into an immutable host-managed package store under `.entangle/host/imports/packages/store/`. Package-source records now carry that materialization metadata, manifests and runtime package roots resolve from the store, and each node workspace exposes a host-managed package surface backed by the immutable store instead of a private copied snapshot.

## [2026-04-22] implementation | Added deterministic runner transport and the first long-lived local intake loop

Extended `entangle-runner` beyond bootstrap-only execution. Added a deterministic transport abstraction, a file-backed runner-local state store, and a long-lived `RunnerService` that subscribes by recipient pubkey, validates inbound A2A payloads, advances session and conversation state through the canonical lifecycle, builds engine turn requests from inbound context, and emits bounded `task.result` replies when required. Tightened the runner tests around wrong-recipient rejection, no-response flows, idempotent startup, and persisted turn/state records.
