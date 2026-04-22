# Codex CLI Usage for Entangle

This page records which Codex CLI commands are actually useful for Entangle and how they should be used.

It is intentionally opinionated. The goal is not to list everything Codex can do, but to define a practical workflow for this project.

## Core stance

Entangle is a design-heavy, implementation-heavy repository with:

- a large canonical corpus;
- local upstream references under `resources/`;
- a growing need for repeatable implementation, review, and audit loops.

Because of that, the most useful Codex commands are the ones that support:

- long-running interactive work;
- resumable context;
- non-interactive batch execution;
- code review;
- MCP integration;
- structured automation.

## Important clarification

There are two different command surfaces:

- shell subcommands such as `codex exec`, `codex review`, and `codex mcp`;
- interactive slash commands inside a live Codex TUI session such as `/review`, `/compact`, `/fork`, and `/init`.

They overlap conceptually, but they are not the same interface.

The current Codex CLI available in this environment does not provide a `codex init` subcommand.

That means project bootstrap for Entangle should be treated as a repository and implementation concern, not as a Codex-specific initialization step.

In practice:

- initialize the repository structure directly;
- use normal git commits for milestones;
- use Codex for design, generation, review, and implementation work around that structure.

At the same time, the interactive TUI can expose `/init`, which is effectively a convenience command for creating a repository-level `AGENTS.md` file. For Entangle, that command does make sense conceptually once the repository baseline exists and the project needs explicit Codex instructions at the root.

## Interactive slash commands that matter for Entangle

If you are using the interactive Codex interface rather than shell subcommands, these are the slash commands that matter most here:

### `/init`

Useful when the repository does not yet have a root `AGENTS.md`.

For Entangle, this belongs very early in the project lifecycle because the repository has strong architectural rules and a mandatory audit loop.

### `/review`

Useful as the interactive analogue of `codex review`, especially before commits or after implementation bursts.

### `/compact`

Very useful in long Entangle sessions. The project is context-heavy, so keeping threads compact without losing the durable corpus matters.

### `/resume`

Useful when continuing a prior thread anchored to the same repository.

### `/fork`

Useful when exploring alternative architecture or implementation strategies without polluting the primary thread.

### `/status`

Useful to inspect the current model, approval mode, and session configuration.

### `/mcp`

Useful once the project begins to rely on MCP-backed tooling.

### `/diff`

Useful for quickly inspecting the repository delta during active work.

### `/plan`

Useful when a task needs a more explicit planning pass, but it should not replace direct execution when the path is already clear.

### `/model`

Crucial for high-rigor architecture and specification work.

For Entangle, use the strongest model and highest useful reasoning level when:

- defining core contracts;
- comparing architecture alternatives;
- making stack and boundary decisions;
- reviewing specification quality.

### `/fast`

Useful only for lightweight operational work.

For Entangle:

- use it for low-risk housekeeping;
- avoid it for specification, architecture, protocol, and infrastructure decisions.

### `/permissions`

Useful to ensure Codex can actually inspect and modify the repository effectively during design and implementation work.

### `/memories`

Use carefully.

For Entangle, the repository corpus and wiki should remain the primary durable source of truth. Session or product memory should support the work, not replace the project documentation.

## Most useful commands

### `codex`

Use the interactive CLI as the default mode for design, implementation, audit, and repository maintenance.

Best use in Entangle:

- architecture work;
- schema design;
- multi-file edits;
- repo audit loops;
- implementation sessions that need context continuity.

Typical pattern:

```bash
codex -C /path/to/entangle
```

Useful options:

- `--search` when current web verification is needed;
- `--model <MODEL>` if a specific model is needed;
- `--profile <PROFILE>` if dedicated Codex profiles are introduced later.

### `codex resume`

Use this to continue a prior interactive session and preserve context across long-running work.

Best use in Entangle:

- resuming architecture threads;
- continuing implementation across days;
- preserving reasoning context while staying anchored to the same repository.

Typical pattern:

```bash
codex resume --last -C /path/to/entangle
```

### `codex fork`

Use this to branch a previous session into an alternative line of investigation without contaminating the original thread.

Best use in Entangle:

- trying a different implementation strategy;
- exploring a risky architectural branch;
- running a what-if investigation while preserving the original session context.

Typical pattern:

```bash
codex fork --last -C /path/to/entangle
```

### `codex exec`

Use this for non-interactive one-shot tasks, scripted generation, CI-friendly workflows, and structured outputs.

Best use in Entangle:

- generating a specific schema or file set from a precise prompt;
- running repeatable design-to-file tasks;
- automation where JSON or file output is useful;
- batch operations that should not depend on an interactive TUI session.

Typical patterns:

```bash
codex exec -C /path/to/entangle "Write the first Zod schema for AgentPackage"
```

```bash
codex exec -C /path/to/entangle --json "Audit references and report stale status statements"
```

Especially useful options:

- `--json`
- `--output-last-message <FILE>`
- `--output-schema <FILE>`
- `--ephemeral` for throwaway runs

### `codex review`

Use this as a deliberate quality gate, especially once implementation starts.

Best use in Entangle:

- reviewing uncommitted local work;
- reviewing changes against a base branch;
- catching regressions after schema or runtime changes;
- reviewing generated infrastructure files such as Docker Compose, schemas, runner code, and protocol definitions.

Typical patterns:

```bash
codex review --uncommitted
```

```bash
codex review --base main
```

### `codex mcp`

Use this to manage MCP servers that Codex can leverage during project work.

Best use in Entangle:

- adding project-relevant MCP servers later for wiki search, git services, documentation access, or custom tooling;
- inspecting the current MCP environment before relying on a tool-driven workflow.

Typical patterns:

```bash
codex mcp list
codex mcp get <server>
codex mcp add ...
```

### `codex apply`

Useful only in workflows where Codex produced a diff externally and you want to apply it into the local working tree.

For Entangle, this is secondary, not primary.

Best use:

- remote/cloud patch application workflows;
- applying a previously generated task diff to the local repository.

## Secondary commands

### `codex plugin`

Potentially useful later if Entangle starts relying on project-local Codex plugins or marketplace configuration.

Today this is secondary.

### `codex app`, `codex app-server`, `codex cloud`, `codex exec-server`

These may matter later, but they are not part of the core working loop for Entangle right now.

### `codex sandbox`, `codex debug`, `codex completion`

Useful situationally, but not central to the project workflow.

## Recommended working loop for Entangle

### Default loop

1. `codex -C /path/to/entangle`
2. work interactively
3. update corpus and implementation
4. run `codex review --uncommitted` at meaningful checkpoints

### Continuation loop

1. `codex resume --last -C /path/to/entangle`
2. continue the thread with the repository audit loop

### Alternative exploration loop

1. `codex fork --last -C /path/to/entangle`
2. explore a competing design or implementation branch

### Automation loop

1. `codex exec -C /path/to/entangle ...`
2. optionally request JSON or a schema-shaped output
3. feed the result back into the repository if it becomes durable

## High-rigor workflow for deep specification and architecture work

When the goal is to maximize architectural quality rather than speed, use this profile:

1. `/model` to select the strongest model and high reasoning
2. keep `/fast` off
3. start the batch with `/plan`
4. use `/fork` or `/side` for competing alternatives
5. converge in the main thread only after comparison
6. run `/review` at the end of the batch
7. use `/compact` before the thread gets degraded by context pressure

Shell-side equivalent:

1. `codex exec` for structured one-shot analysis
2. `codex review --uncommitted` as an external review gate
3. `codex resume --last` for continuity across long-running work

## Commands that matter most in practice

If only a small set should become muscle memory for this project, use:

- `codex`
- `codex resume`
- `codex fork`
- `codex exec`
- `codex review`
- `codex mcp`

That set covers nearly all of Entangle's near-term design and implementation workflow.
