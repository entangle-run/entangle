# Entangle Wiki Log

## [2026-04-24] implementation | Added Studio package-source deletion

Closed the visual operator side of the package-source deletion boundary.
Studio now shows active graph references for every admitted package source,
disables deletion when the current graph already proves the source is still in
use, calls the shared host client for unreferenced source deletion, surfaces
mutation failures in the graph editor, and clears local drafts that referenced
the deleted source after host confirmation.

## [2026-04-24] implementation | Added package-source deletion

Added a host-owned package-source deletion boundary through
`DELETE /v1/package-sources/{packageSourceId}`. The host now removes unused
package-source records, rejects deletion while active graph nodes still
reference the source, cleans up host-managed imported archive storage, emits
typed `package_source.deleted` events, and exposes the operation through the
shared host client plus CLI dry-run flow.

## [2026-04-24] implementation | Added local archive package-source admission

Closed the host-side `local_archive` package-source gap. Archive admission now
extracts tar/tar.gz packages inside `entangle-host`, rejects unsafe archive
entries, validates the extracted AgentPackage with the existing package
validator, imports valid packages under host-managed package storage, and
records immutable package-store materialization instead of returning the old
not-implemented validation error.

## [2026-04-24] implementation | Added Studio runtime artifact detail

Extended Studio's runtime artifact panel over the new host item boundary.
Visual operators can now select one runtime artifact, load its host-backed
detail record through `packages/host-client`, and keep artifact-detail failures
isolated from the broader selected-runtime panel.

## [2026-04-24] implementation | Added runtime artifact detail inspection

Added a read-only item boundary for persisted runtime artifacts through
`GET /v1/runtimes/{nodeId}/artifacts/{artifactId}`. The shared host client and
CLI can now inspect one artifact record by id, giving later artifact governance
work a stable resource shape without exposing runner-local artifact files as a
client contract.

## [2026-04-24] implementation | Added bootstrap operator request audit events

Deepened the new host operator-token boundary with a typed security event for
protected mutation requests. When `ENTANGLE_HOST_OPERATOR_TOKEN` is configured,
`entangle-host` now persists `host.operator_request.completed` events for
authorized and unauthorized mutation attempts, carrying non-secret request
metadata, response status, auth mode, and a bootstrap operator id.

## [2026-04-24] implementation | Added bootstrap host operator-token auth

Started the accepted production redesign program with a bounded control-plane
security slice. `entangle-host` can now enforce
`ENTANGLE_HOST_OPERATOR_TOKEN`, host errors include a canonical
`unauthorized` code, and `packages/host-client`, the CLI, and Studio can
propagate the token for local operator profiles that should not expose an open
host mutation surface.

## [2026-04-24] decision | Accepted production redesign program

Accepted `wiki/decisions/production-redesign-program.md` as the active
strategic program for the next major Entangle phase. The decision keeps
Entangle's graph-native, artifact-first control-plane identity while allowing
breaking changes when they improve production clarity, safety, scalability, or
maintainability.

## [2026-04-24] documentation | Imported LatticeOps redesign program

Imported the generated end-to-end repository analysis and unconstrained
redesign proposal into `wiki/redesign/latticeops/`. The imported corpus is
kept as a strategic redesign program separate from the current Entangle
implementation baseline, with `wiki/index.md` now linking the new entry point.

## [2026-04-24] implementation | Added explicit closure references for focused memory

Closed the next runner-memory quality slice by letting the bounded
memory-synthesis path retire active open questions and next actions through
runner-validated references to the current focused-register baseline. Closure
no longer depends only on wording overlap inside `resolutions.md`, while the
runner still owns validation, reconciliation, and all filesystem writes.

## [2026-04-24] implementation | Added focused-register aging signals

Closed the next runner-memory quality slice by adding a separate
runner-owned focused-register carry-state file for
`open-questions.md`, `next-actions.md`, and `resolutions.md`. The bounded
model-guided synthesis prompt now sees carry-forward and stale-review hints for
repeatedly carried active items, while the durable wiki pages remain clean and
human-readable instead of absorbing noisy lifecycle metadata.

## [2026-04-24] implementation | Added engine provider metadata and failure reporting

Closed the next engine-hardening slice by widening the canonical engine outcome
contracts with bounded provider identity and failure payloads, teaching the
Anthropic adapter to preserve provider metadata on successful turns, and making
the runner persist bounded engine failures and already-computed successful
engine outcomes before later artifact-materialization failures can erase that
truth. Studio and CLI now surface the richer detail through the existing shared
runtime-trace presentation path.

## [2026-04-24] implementation | Added shared runtime-trace summaries for Studio and CLI

Closed the next operator-consumption slice by moving runtime-trace presentation
into `packages/host-client` and teaching both Studio and the CLI to consume
that shared model. The selected-runtime trace panel now shows bounded
`engineOutcome` detail, and the CLI can filter to runtime-trace events and
print structured summaries without inventing a parallel event model.

## [2026-04-24] implementation | Added bounded model-guided working-context memory synthesis

Closed the next runner-memory slice by adding a separate bounded
`RunnerMemorySynthesizer` path on top of the deterministic task-page and
recent-work baseline. The runner now maintains
`memory/wiki/summaries/working-context.md` through a strict forced tool call,
but still owns the actual write path and treats synthesis failure as additive
instead of turn-fatal.

## [2026-04-24] implementation | Added deterministic recent-work memory summary

Closed the next bounded runner-memory slice by making post-turn memory
maintenance rebuild `memory/wiki/summaries/recent-work.md` from the freshest
canonical task pages. Future turn assembly now sees the schema rules, wiki
index, wiki log, recent-work summary, and recent task pages together instead
of only the low-level task-page baseline.

## [2026-04-24] implementation | Added bounded builtin memory-ref inspection

Closed the next runtime-deepening slice by widening the runner-owned builtin
tool executor with `inspect_memory_ref`. The internal tool surface can now
inspect only the current turn's resolved `memoryRefs`, with deterministic
exact-path or unique-basename matching, explicit ambiguity failures, and no
arbitrary filesystem widening.

## [2026-04-24] implementation | Added CLI mutation dry-run support

Closed the next bounded CLI completion slice by adding `--dry-run` across the
main host-facing mutation commands. The CLI can now print canonical mutation
payloads or intents for package-source admission, graph apply, node and edge
mutation, external-principal upsert, runtime recovery-policy mutation, and
runtime lifecycle operations without mutating the host.

## [2026-04-24] implementation | Added Studio session drilldown

Closed the next bounded Studio slice by adding selected-session drilldown on
top of the existing host session read surface. The selected runtime view now
keeps the existing runtime-scoped session summary list, but one summary can
also be selected and expanded into host-backed per-node session/runtime detail
through `getSession()`, with bounded stale-selection guards and no widening of
the host API.

## [2026-04-24] implementation | Added CLI runtime artifact inspection parity

Closed the next bounded CLI parity slice by exposing runtime artifact
inspection on top of the existing host artifact read surface. The CLI can now
inspect persisted runtime artifacts and apply deterministic local filters over
artifact backend, kind, lifecycle, publication state, and retrieval state
without widening the host API.

## [2026-04-24] implementation | Added CLI package-source parity

Closed the next bounded CLI parity slice by widening the package-source command
tree to match the existing host contract. The CLI can now inspect one admitted
package source and admit both canonical `local_path` and `local_archive`
sources with optional explicit package-source ids through the same thin
host-client boundary.

## [2026-04-24] implementation | Added Studio live refresh over host events

Closed the next Studio completion slice by using the existing host event
stream to coalesce live refresh of the overview and selected-runtime read
surfaces. Studio now reacts to host-owned topology, runtime, recovery,
session, and artifact events without polling and without reconnecting the
event subscription when the selected runtime changes.

## [2026-04-24] implementation | Added Studio package-source admission

Closed the next bounded Studio mutation slice by exposing host-owned package
admission through canonical `local_path` and `local_archive` requests.
Studio now shows the admitted package-source inventory, keeps package-source
read failures partial instead of collapsing the wider overview, and lets the
operator admit package sources without introducing browser-owned filesystem
semantics into the canonical UI model.

## [2026-04-24] implementation | Added Studio managed-node mutation

Closed the next bounded Studio mutation slice by exposing host-owned managed
node create/replace/delete flows. Studio now selects admitted package sources
for managed nodes, preserves hidden node bindings on replace, and keeps runtime
selection aligned with explicit managed-node selection.

## [2026-04-24] implementation | Added Studio graph edge mutation

Closed the first bounded graph-mutation slice in Studio by exposing host-owned
edge create/replace/delete flows on top of the already implemented edge
resource surface. Studio now supports live edge selection from topology or the
edge list and keeps graph refresh canonical after successful mutation.

## [2026-04-24] implementation | Added Studio runtime session inspection

Closed the next Studio read slice by exposing host-backed session summaries for
the selected runtime, including the selected node's session status, the wider
node-status summary, and trace ids. The selected-runtime refresh path now also
includes session summaries while preserving partial-failure behavior.

## [2026-04-24] implementation | Added Studio runtime artifact inspection

Closed the next Studio inspection slice by exposing persisted runtime artifact
records from the host read model directly in the selected-runtime panel.
Studio now shows deterministic artifact ordering plus lifecycle/publication/
retrieval summaries and locator metadata, and its selected-runtime refresh path
now degrades partially when one sub-read fails instead of collapsing the whole
panel.

## [2026-04-24] implementation | Added Studio runtime lifecycle mutation

Closed the first bounded Studio mutation slice by wiring `start`, `stop`, and
`restart` for the selected runtime strictly through the existing host lifecycle
surfaces. Studio now exposes explicit pending-action and mutation-error state,
but still refreshes real runtime truth from the host instead of inventing a
client-owned runtime state machine.

## [2026-04-24] implementation | Added Studio runtime trace inspection

Closed the next Studio slice by deepening selected-runtime inspection on top of
the now broader host-owned trace surface. Studio now shows reconciliation
state, finding codes, backend/context readiness, restart generation, and a
live runtime-trace panel built from host-derived session, conversation,
approval, artifact, and runner-turn events without widening the host API or
introducing client-owned trace logic.

## [2026-04-24] implementation | Added conversation, approval, and artifact host trace events

Closed the next host-owned trace-widening slice by deriving
`conversation.trace.event`, `approval.trace.event`, and
`artifact.trace.event` from persisted runner state under the same
deduplicated observed-state model already used for session and runner-turn
activity. The slice added observed conversation, approval, and artifact
activity records under observed host state, kept artifact trace events linked
to the best available graph/session/conversation context, and widened host
tests so successive host reads do not duplicate the new trace events.

## [2026-04-24] implementation | Added Studio and CLI runtime-recovery inspection

Closed the first serious client-consumption slice on top of the already
implemented host-owned runtime recovery model. Added reusable recovery-oriented
host-event filtering to `packages/host-client`, widened `entangle-cli` with
typed `host events list` and `host events watch` flows, and taught Studio to
consume the live host event stream for runtime recovery policy, controller,
history, and recovery-event inspection. The audit loop also tightened the
frontend behavior before closing the slice: Studio now keeps a stable host
event subscription instead of reconnecting when the selected runtime changes.

## [2026-04-24] implementation | Added host-owned runtime recovery-history inspection

Closed the next host control-plane diagnostics slice by adding
`GET /v1/runtimes/{nodeId}/recovery` through `entangle-host`,
`packages/host-client`, and the CLI, backed by persisted per-node recovery
records under observed host state. The slice only closed after the audit loop
found and corrected a real deduplication defect: recovery fingerprinting now
canonicalizes recursively sorted JSON instead of relying on raw object key
order, and host reconciliation reads are serialized through a single-flight
guard so rapid successive inspections do not create duplicate recovery
history entries.

## [2026-04-24] implementation | Added richer reconciliation and degraded-state semantics to entangle-host

Closed the next host control-plane slice by making reconciliation explicit and
machine-readable instead of inferring host health from raw runtime failure
counts alone. Runtime inspection now carries derived reconciliation state plus
finding codes, persisted reconciliation snapshots distinguish blocked,
transitioning, and degraded runtimes, `GET /v1/host/status` derives status
from those findings, and host reconciliation-completed events now persist the
same richer aggregate metadata. The slice also kept backward compatibility for
older persisted reconciliation snapshots while adding tests for degraded
runtime context, intentionally stopped runtimes, and contract-level fallback
parsing.

## [2026-04-24] implementation | Added graph-backed edge mutation surfaces through entangle-host

Completed the next host control-plane resource slice by adding `GET /v1/edges`,
`POST /v1/edges`, `PATCH /v1/edges/{edgeId}`, and
`DELETE /v1/edges/{edgeId}` through `entangle-host`, the shared host client,
and the CLI. The slice keeps the graph as the only source of truth, applies
every edge mutation through validated graph revisions, treats invalid edge
candidates as `400` validation results rather than implicit node creation, and
emits typed `edge.updated` control-plane events.

## [2026-04-24] implementation | Added managed-node mutation surfaces through entangle-host

Completed the first resource-oriented managed-node mutation slice on top of the existing applied-node inspection boundary. `entangle-host` now supports `POST /v1/nodes`, `PATCH /v1/nodes/{nodeId}`, and `DELETE /v1/nodes/{nodeId}` for non-user managed nodes, keeps the graph as the single source of truth by applying validated graph revisions for every mutation, rejects deletion while edges still reference the node, and emits typed `node.binding.updated` events. Closed the slice only after tightening host-client error semantics so only validation-backed `400` responses are parsed as node-mutation DTOs, while `404` and `409` continue to surface as structured host errors.

## [2026-04-23] implementation | Added the first deterministic post-turn memory update phase

Closed the first runner-owned memory-maintenance gap by making completed turns
write task pages into the node wiki, append structured entries to
`memory/wiki/log.md`, keep `memory/wiki/index.md` aligned, and feed recent task
memory back into future turn assembly. This is intentionally deterministic and
auditable, not model-authored wiki mutation.

## [2026-04-23] implementation | Added the first bounded internal tool loop

Closed the first real tool-loop gap by introducing explicit internal tool
execution contracts, loading package-declared tool catalogs into runner turn
assembly, wiring an Entangle-owned builtin tool executor boundary, and
teaching the Anthropic adapter to complete bounded `tool_use` / `tool_result`
loops without leaking provider protocol logic into the runner. The first
builtin surface is intentionally narrow and runtime-local: deterministic
artifact-input inspection. The next best runtime-deepening step is to widen
the builtin tool surface and add the explicit post-turn memory update phase.

## [2026-04-23] implementation | Added an explicit package tool-catalog contract

Closed a real package/runtime contract gap before the internal tool loop by
making `runtime/tools.json` a manifest-owned package file, adding typed package
tool-catalog schemas, updating scaffolds to generate explicit empty catalogs,
and tightening package validation so missing tool catalogs fail admission
deterministically. This keeps the next tool-loop slice grounded in a clean
package boundary instead of ad hoc runner logic.

## [2026-04-23] implementation | Added the first real provider-backed internal agent-engine slice

Closed the live stub-engine gap by extending the effective runtime context with
host-resolved model auth delivery, gating runtime realizability on actual model
credential availability, and implementing the first real Anthropic-backed
internal engine adapter behind the stable `agent-engine` boundary. Live runner
entrypoints now use the real engine path by default, while tests keep explicit
engine injection for determinism. Tightened the model-endpoint contract in the
same slice so auth mode is explicit and the host-owned Anthropic default uses
header-secret semantics instead of an unsafe bearer-token default. The next
best capability move is to deepen the engine into bounded multi-turn and
tool-loop execution rather than revisiting the provider boundary again.

## [2026-04-23] implementation | Widened git handoff retrieval to locator-specific repository targets

Extended the git-collaboration model beyond exact primary-repository retrieval.
The runtime can now resolve locator-specific repository targets from the
effective runtime context, select transport principals deterministically per
git service, retrieve sibling repositories on the primary service, and persist
repository-partitioned retrieval state instead of assuming one retrieval cache
per artifact id. Updated the shared type layer, validator semantics, runner
artifact backend, and integration tests, and re-baselined the implementation
audit so the next main capability target can move to the real internal engine.

## [2026-04-23] implementation | Added host-owned Gitea primary-target provisioning

Closed the first concrete `gitea_api` provisioning path for git collaboration.
The host now provisions primary repository targets itself, persists typed
provisioning-state records, and keeps runtimes unavailable when service-backed
repository provisioning fails.

## [2026-04-23] implementation | Added primary-target git retrieval and handoff validation

Extended the runner from remote publication into the first downstream
retrieval path. The runner now validates inbound published git artifact refs
against the receiving runtime context, retrieves primary-target artifacts into
an explicit retrieval cache, persists typed retrieval-state records, records
consumed artifact ids on the turn record, and passes local artifact inputs into
the engine turn request. Added shared contract coverage for retrieval metadata
and runner tests for both successful retrieval and explicit failure on invalid
handoff.

## [2026-04-23] implementation | Added first remote git publication for preexisting repositories

Extended the runner git artifact backend from local-only materialization into a
first real remote publication path. The runner now configures a deterministic
remote from the resolved git service target, pushes turn artifacts to
preexisting repositories, and persists explicit publication success or failure
metadata without corrupting local artifact truth. Added runner coverage for
both successful publication to a controlled bare repository and graceful
failure when the configured remote is unavailable, then reran `pnpm verify`.

## [2026-04-22] quality | Switched package-local tests to shared source-resolved Vitest config

Hardened the local developer workflow so package-level Vitest runs no longer
depend on whichever sibling `dist/` outputs happen to be on disk. Added a
shared root Vitest config with explicit workspace-source aliases and pointed
package-local test scripts at that config, so direct `pnpm --filter ... test`
runs exercise current contracts from source.

## [2026-04-22] implementation | Added host-managed external principal bindings and resolved git principals

Closed the gap between the identity model and the runtime model by introducing
machine-readable external principal records for git-facing identities, binding
them from graph nodes by reference, persisting them through `entangle-host`,
resolving them into effective runtime context, and exposing them through the
shared host/host-client/CLI surfaces. Added validator coverage for missing and
ambiguous principal resolution so future remote git publication can build on a
real credential-binding boundary instead of ad hoc host logic.

## [2026-04-22] refinement | Removed runtime-local filesystem paths from portable artifact refs

Refined the first git artifact slice so protocol-facing `ArtifactRef` locators
no longer embed runtime-local filesystem paths such as `repoPath`. Moved local
materialization details into `ArtifactRecord.materialization`, updated runner,
host, host-client, and contract tests, and documented the corrected boundary
as a dedicated artifact portability refinement.

## [2026-04-22] implementation | Added git-backed runner artifacts and host runtime artifact inspection

Extended the runner from pure lifecycle persistence into the first durable
artifact slice. Added structured artifact contracts and artifact records,
linked produced artifact ids into session, conversation, and turn state,
materialized markdown turn reports in a runner-local git repository with real
commits, propagated produced artifact refs into outbound `task.result`
messages, and exposed persisted runtime artifacts through a new host read
surface plus matching host-client coverage. Revalidated the batch with runner,
host, host-client, and contract tests plus a full `pnpm verify`.

## [2026-04-22] implementation | Hardened the local Docker image topology for host, runner, and Studio

Refined the local image profile so it no longer depends on implicit toolchain
acquisition or broad runtime payloads. Added an explicit `.dockerignore`,
moved host and runner build stages to pinned `pnpm` installation with an
explicit store path, switched Studio to a static Nginx runtime image, added
workspace package `files` allowlists, excluded compiled test files from
deployable runtime `dist/` outputs, kept typed lint coverage over tests with a
tightly scoped out-of-project configuration, and revalidated the batch with
`pnpm verify`, real `build -> deploy` payload checks, and rebuilt Docker
images for runner, host, and Studio.

## [2026-04-22] implementation | Added live Nostr runner transport and validated it against a real local relay

Extended `entangle-runner` from deterministic transport-only intake into a
real Nostr-backed transport slice. Added canonical NIP-59 / Entangle rumor
transport constants, implemented a real `NostrRunnerTransport`, tightened
runner startup so readable relay connections are established before the service
reports itself as started, and verified the batch with a live local relay smoke
that produced session, conversation, and turn records under the runtime root.

## [2026-04-22] fix | Corrected the local strfry Compose profile to mount a real relay config

Found that the local Compose relay service was not actually usable because it
started `strfry` without a config file. Added an explicit
`deploy/config/strfry.local.conf`, mounted it into the Compose service, and
revalidated local relay reachability through `nostr-tools` before rerunning the
end-to-end runner smoke.

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

## [2026-04-23] quality | Fixed typed lint workspace-source resolution for tests

Extended the quality baseline so package-local typed linting over test files no longer resolves sibling workspace packages through stale published-style `dist/` declarations. Added a root `tsconfig.eslint.json` with explicit workspace-source path mappings and pointed the ESLint project-service default project at that config, so strict linting now evaluates tests against current source contracts just like the shared Vitest path already did.

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

## [2026-04-23] audit | Reconciled the planning corpus with the implemented runtime slices

Ran a repository-wide implementation-state audit after the host, runner,
transport, artifact, and external-principal slices. Added
`references/59-implementation-state-and-delivery-audit.md` as the new current
implementation-truth document, marked
`references/40-pre-implementation-audit.md` as historical, rewrote
`references/15-implementation-strategy.md` around the current rolling delivery
order, and updated `README.md`, `references/README.md`, and `wiki/overview.md`
so the repository is no longer described as pre-implementation or
control-plane-only.

## [2026-04-23] implementation | Added runtime secret delivery and resolved git principal bindings

Introduced a real `secret://` contract, resolved secret-binding metadata in the
runtime type system, host-side resolution of git secret refs under
`ENTANGLE_SECRETS_HOME/refs/...`, and runtime artifact context that now carries
git principal bindings with explicit availability and mounted-file delivery
metadata. Extended the Docker runtime backend to mount the secret volume into
runner containers as read-only, and updated local git artifact commits so they
use bound git-principal attribution when a primary principal is available.

## [2026-04-23] implementation | Added deterministic git remote selection and provisioning policy contracts

Extended git service profiles with explicit transport-facing `remoteBase`
configuration and repository-provisioning mode, then taught the host to resolve
a deterministic `primaryGitRepositoryTarget` into effective runtime context
when service and namespace selection are unambiguous. Updated the local
deployment profile with `ENTANGLE_DEFAULT_GIT_REMOTE_BASE`, hardened the shared
type layer and host tests around the new contract, and locked the current
policy to a graph-shared repository target derived from `graphId`.

## [2026-04-23] implementation | Added explicit artifact publication-state metadata

Extended `ArtifactRecord` with a machine-readable `publication` object so the
repository can distinguish local materialization from remote publication
outcomes without overloading `ref.status`. The current local git-backed
artifact path now persists `publication.state: "not_requested"`, and the shared
type and runner tests lock the rules for `not_requested`, `published`, and
`failed` publication metadata.

## [2026-04-23] implementation | Added the first canonical host event surface

Promoted host-side control-plane tracing into a real typed event boundary.
Added canonical host-event contracts in `packages/types`, persisted and
normalized host event records in `services/host`, exposed `GET /v1/events` for
HTTP inspection plus WebSocket live streaming on the same route, and extended
`packages/host-client` with typed event listing and subscription helpers.
Closed the slice only after fixing the replay/live WebSocket race, tightening
strict TypeScript and ESLint compliance around the shared client surface, and
verifying the batch with targeted tests plus `pnpm verify`.

## [2026-04-23] implementation | Added typed graph-revision history inspection through the host boundary

Promoted persisted graph revisions from a host-internal file detail into a real
control-plane surface. Added canonical graph-revision DTOs in
`packages/types`, switched new revision persistence to typed revision records,
kept backward-compatible reads for older raw graph-snapshot revision files, and
exposed `GET /v1/graph/revisions` plus `GET /v1/graph/revisions/{revisionId}`
through `entangle-host`, `packages/host-client`, and the CLI. Closed the slice
only after tightening strict test parsing under ESLint, normalizing the last
stale active-revision read path in host state, and re-running `pnpm verify`.

## [2026-04-23] implementation | Added the first applied-node inspection surface

Promoted applied non-user node bindings from a host-internal reconciliation
detail into a real resource surface. Added canonical node-inspection DTOs in
`packages/types`, exposed `GET /v1/nodes` plus `GET /v1/nodes/{nodeId}` through
`entangle-host`, and wired the same boundary through `packages/host-client` and
the CLI. Closed the slice only after fixing strict fixture quality in the new
types test, tightening the host integration assertions for ESLint, and
re-running `pnpm verify`.

## [2026-04-24] implementation | Added deterministic runtime restart through the host boundary

Promoted runtime restart from a planned lifecycle action into a real
control-plane surface. Added monotonic `restartGeneration` to runtime intents
and runtime inspection, introduced the typed `runtime.restart.requested` host
event, implemented `POST /v1/runtimes/{nodeId}/restart` through
`entangle-host`, `packages/host-client`, and the CLI, and taught the Docker
runtime backend to recreate managed containers when the restart generation
changes even if the runtime context path is unchanged. Closed the slice only
after adding contract, host-client, host integration, and Docker backend tests
and re-running `pnpm verify`.

## [2026-04-24] implementation | Added host-owned session inspection surfaces

Promoted persisted runner session records from host-internal runtime files into
a real read-only control-plane surface. Added canonical session DTOs in
`packages/types`, exposed `GET /v1/sessions` plus
`GET /v1/sessions/{sessionId}` through `entangle-host`, wired the same
boundary through `packages/host-client` and the CLI, and hardened host-side
aggregation so inconsistent cross-node graph ids for the same session fail as
an invariant violation instead of being silently merged. Closed the slice only
after targeted `types`, `host-client`, and `host` tests, a full `pnpm verify`,
and `git diff --check`.

## [2026-04-24] implementation | Added host-derived session and runner activity events

Widened the host event surface beyond control-plane and runtime lifecycle
events by deriving `session.updated` and `runner.turn.updated` records from
persisted runner session and turn files. Added canonical observation records in
`packages/types`, taught `services/host` to persist observed activity
fingerprints under observed host state, emit events only on durable change, and
clean up stale activity records when runtimes or activity disappear. Closed the
slice only after targeted `types` and `host` tests, a full `pnpm verify`, and
`git diff --check`.

## [2026-04-24] implementation | Added explicit host-owned runtime recovery policy

Extended the runtime recovery surface from read-only history into a real
control-plane model. Added desired recovery-policy records, observed
recovery-controller state, `PUT /v1/runtimes/{nodeId}/recovery-policy`,
typed recovery-policy and recovery-attempt/exhaustion host events, and bounded
automatic `restart_on_failure` behavior with attempt accounting anchored in a
stable failure fingerprint instead of restart-generation churn. Closed the
slice only after widening shared contracts, adding deterministic host tests via
an injectable runtime backend, and re-running targeted package tests plus the
full `pnpm verify` gate.

## [2026-04-24] implementation | Added runtime recovery host events

Widened the typed host event surface so the already implemented runtime
recovery model is observable through durable events instead of only through
polling runtime recovery inspection. Added
`runtime.recovery.recorded` plus `runtime.recovery_controller.updated` to the
shared host-event contracts, emitted them from host-owned recovery history and
controller state transitions, and hardened controller-change detection so
trivial idle bootstrap state does not create event noise. Closed the slice
only after widening `types`, `host-client`, and `host` tests and re-running
`pnpm verify`.

## [2026-04-24] implementation | Added bounded engine-turn observability

Closed the gap where the internal Anthropic tool loop produced real execution
behavior but lost most of its diagnostic truth after the turn completed.
Widened the shared engine contracts with bounded tool-execution observations,
provider stop-reason metadata, and a reusable engine-outcome structure; taught
the internal engine path to accumulate tool requests plus bounded tool
execution outcomes across the whole tool loop; persisted normalized engine
outcome into runner turn records; and propagated the same canonical outcome
through observed runner activity plus durable `runner.turn.updated` host
events. Closed the slice only after targeted `types`, `agent-engine`,
`runner`, and `host` tests, plus a final full `pnpm verify`.

## [2026-04-24] implementation | Added bounded builtin session-state inspection

Closed a real asymmetry in the runner tool surface. Builtin tool ids are now a
frozen shared contract instead of arbitrary strings accepted by package tool
catalogs, and the runner now supports `inspect_session_state` for bounded
inspection of the current session's local session, conversation, turn, and
related artifact state. The tool is intentionally narrow: it cannot widen to
other sessions, it only accepts bounded numeric limits, and it reads
runner-owned persisted state through shared state-store helpers instead of ad
hoc filesystem traversal. Closed the slice only after widening `types` and
runner tests, re-running targeted lint/test loops, and then confirming the full
`pnpm verify` plus `git diff --check` gates.

## [2026-04-24] implementation | Added session-aware working-context synthesis

Deepened model-guided memory synthesis without widening the builtin tool
catalog. Extracted a shared bounded runner-local session snapshot builder,
rewired `inspect_session_state` to delegate to it, and then fed the same
bounded current-session snapshot into the `working-context.md` synthesis prompt.
This keeps session reasoning grounded in one canonical runner-local summary
instead of duplicating or omitting it across tool execution and memory
synthesis. Closed the slice only after widening runner tests, re-running
targeted runner lint/test loops, and then confirming the full `pnpm verify`
plus `git diff --check` gates.

## [2026-04-24] implementation | Added artifact-aware working-context synthesis

Deepened the same model-guided memory synthesis path again, this time by
passing explicit retrieved and produced artifact context into the
working-context synthesis request. Kept the boundary clean by avoiding any
filesystem rediscovery pass inside the synthesizer: the runner now hands over
canonical `artifactRefs` plus bounded `artifactInputs` it already owns from the
completed turn. Closed the slice only after adding direct runner-memory tests,
a service-level handoff test, re-running targeted runner gates, and then
confirming the full `pnpm verify` plus `git diff --check` gates.

## [2026-04-24] implementation | Added artifact-context carry-forward in working-context synthesis

Deepened the same bounded memory path once more by making the durable
`working-context.md` page preserve artifact context explicitly. The strict
`write_memory_summary` tool now requires bounded `artifactInsights`, while the
runner-owned page shape now carries deterministic consumed/produced artifact
lists plus those synthesized durable artifact observations.

Closed the slice only after widening runner-memory assertions over the final
page content, re-running targeted runner lint/test/typecheck gates, and then
confirming the full `pnpm verify` plus `git diff --check` gates.

## [2026-04-24] implementation | Added engine-outcome-aware working-context synthesis

Deepened the same bounded memory path again by making the synthesis prompt
carry a dedicated summary of the just-completed turn's normalized engine
outcome. The model-guided working-context pass can now see bounded tool
executions, provider stop reason, failure metadata, and token usage for the
current turn instead of relying on assistant text and coarse stop reason alone.

Closed the slice only after widening runner-memory prompt assertions,
re-running targeted runner lint/test/typecheck gates, and then confirming the
full `pnpm verify` plus `git diff --check` gates.

## [2026-04-24] implementation | Added execution-insight carry-forward in working-context synthesis

Deepened the same bounded memory path once more by making the durable
`working-context.md` page preserve execution signals explicitly. The strict
`write_memory_summary` contract now requires bounded `executionInsights`, and
the runner-owned page shape now gives those signals a first-class `Execution
Signals` section.

Closed the slice only after widening runner-memory assertions over the final
page content, re-running targeted runner lint/test/typecheck gates, and then
confirming the full `pnpm verify` plus `git diff --check` gates.

## [2026-04-24] implementation | Added execution-aware deterministic memory baseline

Strengthened the runner-owned deterministic memory layer by preserving richer
normalized execution detail in canonical task pages and in the derived
`recent-work.md` page rebuilt from those task pages. This keeps the source of
truth relationship clean while giving later model-guided memory passes a
stronger deterministic base.

Closed the slice only after widening runner-memory assertions over both task
pages and recent-work output, re-running targeted runner lint/test/typecheck
gates, and then confirming the full `pnpm verify` plus `git diff --check`
gates.

## [2026-04-24] implementation | Added final-state session-context memory synthesis

Corrected the model-guided working-context path so optional memory synthesis now
runs against the runner's final post-turn conversation/session state instead of
the earlier pre-completion snapshot. The durable `working-context.md` page now
also carries bounded session-context lines plus synthesized session insights.

Closed the slice only after widening runner-memory assertions over durable
session-context output, proving via service tests that synthesis now sees the
final `closed` / `completed` lifecycle state, and then re-running targeted
runner gates plus the full `pnpm verify` and `git diff --check` gates.

## [2026-04-24] implementation | Added memory-synthesis observability

Made optional memory synthesis observable through the canonical turn/trace path
by persisting a bounded synthesis outcome on `RunnerTurnRecord` and surfacing
that same outcome through host-owned runner activity plus CLI/Studio runtime
trace helpers. This removes the old blind spot where synthesis success or
failure only lived in wiki files and log entries.

Closed the slice only after widening contract, runner, host, host-client, and
Studio trace assertions, then re-running targeted package tests plus the full
`pnpm verify` and `git diff --check` gates.

## [2026-04-24] implementation | Added focused memory summary registers

Deepened the bounded model-guided memory layer so one synthesis pass now
updates `working-context.md`, `stable-facts.md`, and `open-questions.md`
instead of concentrating all durable synthesized state in one omnibus summary.
Future turns now consume those focused summary pages directly through canonical
`memoryRefs`, and successful memory-synthesis outcomes now preserve the full
updated-page set for runtime trace and operator inspection.

Closed the slice only after widening runner, host, host-client, Studio, and
shared-contract assertions, then re-running targeted package tests plus the
full `pnpm verify` and `git diff --check` gates.

## [2026-04-24] implementation | Added decision register to model-guided memory

Closed the remaining gap between the runner lifecycle spec and the bounded
memory layer by adding `memory/wiki/summaries/decisions.md` to the same
strict model-guided synthesis pass that already maintained working-context,
stable-facts, and open-questions summaries. The durable working-context page
now also carries bounded decision signals, and future turns now consume the
focused decision register directly through canonical `memoryRefs`.

Closed the slice only after widening runner, host, host-client, Studio, and
shared-contract assertions, then re-running targeted package tests plus the
full `pnpm verify` and `git diff --check` gates.

## [2026-04-24] implementation | Added next-actions register to model-guided memory

Closed the next structural gap in the bounded memory layer by adding
`memory/wiki/summaries/next-actions.md` to the same strict model-guided
synthesis pass that already maintained working-context, decisions,
stable-facts, and open-questions summaries. Open questions now remain focused
on unresolved uncertainty, while future turns can consume durable pending work
directly through the dedicated next-actions register in canonical `memoryRefs`.

Closed the slice only after widening runner, host, host-client, Studio, and
shared-contract assertions, then re-running targeted package tests plus the
full `pnpm verify` and `git diff --check` gates.

## [2026-04-24] implementation | Added resolutions register to model-guided memory

Closed the next lifecycle gap in the bounded memory layer by adding
`memory/wiki/summaries/resolutions.md` to the same strict model-guided
synthesis pass that already maintained working-context, decisions,
stable-facts, open-questions, and next-actions summaries. Recent closures no
longer disappear implicitly when open questions are rewritten or pending work
is completed; future turns can now consume durable resolved questions and
completed actions directly through the dedicated resolutions register in
canonical `memoryRefs`.

Closed the slice only after widening runner, host, host-client, Studio, and
shared-contract assertions, then re-running targeted package tests plus the
full `pnpm verify` and `git diff --check` gates.

## [2026-04-24] implementation | Added focused-register lifecycle discipline

Strengthened the bounded memory layer so model-guided synthesis now sees the
current open-questions, next-actions, and resolutions baseline explicitly
instead of relying only on implicit carry-forward through raw summary pages.
Also added runner-owned exact closure reconciliation: when the same normalized
item appears in `resolutions.md`, it is removed from active open-question and
next-action registers instead of surviving as silent duplication.

Closed the slice only after widening runner tests to prove prompt-time
register continuity and exact closure reconciliation, then re-running targeted
runner quality gates plus the full `pnpm verify` and `git diff --check`
gates.

## [2026-04-24] implementation | Added stale-item disappearance discipline

Strengthened long-horizon focused-memory quality by forbidding stale review
candidates from disappearing silently. Once an open question or next action is
already marked stale in the runner-owned baseline, the bounded synthesis pass
must now either keep that exact item active, retire it explicitly through
closure references, or carry the same exact text into `resolutions.md`.

Closed the slice only after widening runner tests to prove stale baseline
items are rejected when they disappear without explicit retention or
retirement, then re-running targeted runner quality gates plus the full
`pnpm verify` and `git diff --check` gates.

## [2026-04-24] implementation | Added explicit stale-item replacement

Closed the next lifecycle gap in the bounded memory layer by letting stale
review candidates retire through explicit replacement instead of only through
continued carry-forward or closure. The runner now validates exact `from -> to`
replacement mappings for stale open questions and next actions, so a stale
baseline item can be replaced by narrower active successors without being
dropped silently or mislabeled as resolved.

Closed the slice only after widening runner tests to prove valid replacement
flows succeed and invalid replacement refs fail deterministically, then
re-running targeted runner quality gates plus the full `pnpm verify` and
`git diff --check` gates.

## [2026-04-24] implementation | Added explicit stale-item consolidation

Closed the next long-horizon lifecycle gap in the bounded memory layer by
letting multiple overlapping stale review candidates collapse into one
narrower successor item. The runner now validates exact many-to-one
consolidation mappings for stale open questions and next actions, so stale
active overlap can be reduced deterministically without silent loss and
without pretending the overlap is already resolved.

Closed the slice only after widening runner tests to prove valid
consolidation flows succeed and invalid consolidation refs fail
deterministically, then re-running targeted runner quality gates plus the
full `pnpm verify` and `git diff --check` gates.

## [2026-04-24] implementation | Added focused-register transition history

Closed the next runner-memory quality slice by deriving bounded
focused-register transition-history entries from validated lifecycle changes.
The runner now preserves runtime-local audit records for closure, completion,
replacement, consolidation, and exact resolution-overlap retirement decisions
without adding lifecycle bookkeeping noise to the durable wiki pages.

## [2026-04-24] implementation | Hardened host verification without socket binds

Closed a verification portability gap in the host test suite by replacing
socket-bound harness mechanics with in-process request, fetch, and WebSocket
injection paths. Docker Engine client coverage now mocks `node:http.request`
while still asserting socket-path and API request shape, fake Gitea API
coverage now uses Fastify injection behind a typed fetch stub, and the host
event-stream test now avoids an in-process listener race by subscribing before
the event-producing mutation.

Closed the slice only after rerunning host lint, typecheck, and tests; the
focused-register targeted gates already in the worktree; full repository
`pnpm verify`; and `git diff --check`.
