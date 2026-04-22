# Entangle Wiki Log

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
