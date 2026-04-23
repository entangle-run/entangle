# Builtin Tool Executor and Bounded Anthropic Tool Loop Slice

This document records the slice that closes the first real internal tool-loop
path for Entangle.

## Why this slice was necessary

Before this slice, the repository had already reached a meaningful runtime
state:

- package-level tool catalogs were real package contracts;
- live runner entrypoints already used the real internal Anthropic-backed
  engine boundary;
- the runner could already assemble prompts, artifacts, and memory refs into a
  real turn request.

But there was still a structural gap:

- `runtime/tools.json` existed but was not loaded into live runner turn
  assembly;
- the runner had no Entangle-owned tool-executor boundary;
- the Anthropic adapter still treated any non-empty tool definition set as an
  unsupported configuration.

That was no longer acceptable. The repository had already moved past the point
where “tool support later” was an honest state description.

## What this slice freezes

### 1. Internal tool execution is now an explicit cross-package boundary

The repository now has a machine-readable and typed internal contract for tool
execution requests and results.

The important design decision is:

- the engine owns the provider-shaped loop;
- the runner owns tool catalog loading and runtime-local execution bindings;
- the two meet through an explicit Entangle internal tool-executor interface.

This preserves the original architectural intent:

- the runner does not become provider-shaped;
- the engine does not become package-layout-aware;
- package contracts remain the source of truth for declared tools.

### 2. Package tool catalogs now affect live runner execution

The runner now reads `runtime/tools.json` from the package snapshot and maps it
to provider-agnostic tool definitions during turn-request assembly.

This means the package tool catalog is no longer just a dormant contract. It is
part of the live runtime path.

### 3. Entangle now owns the first builtin tool executor

The runner now owns a builtin tool-executor registry.

The first builtin surface is intentionally narrow:

- `inspect_artifact_input`

This tool is not meant to be the final tool surface. It exists to validate the
boundary with a deterministic, runtime-local capability that is consistent with
Entangle's artifact-centered execution model.

### 4. The Anthropic adapter now supports bounded tool loops

The Anthropic-backed internal engine now:

- passes declared tools to the provider;
- recognizes `tool_use` responses;
- executes tool calls through the injected Entangle tool executor;
- returns `tool_result` blocks in subsequent user messages;
- continues the provider loop until a non-tool stop reason is reached;
- enforces the configured maximum tool-loop budget.

This is the first real multi-step model-execution path in the repository.

### 5. Failure semantics stay explicit

This slice keeps failure semantics strict:

- malformed or unsupported package tool definitions fail explicitly;
- unsupported or undeclared tool use is surfaced as explicit tool-result
  errors, not hidden fallbacks;
- exceeding the configured tool-loop budget fails deterministically;
- provider-specific tool-protocol logic still does not leak into the runner.

## Intentional non-goals

This slice does **not** yet:

- implement a broad builtin tool surface;
- define the full future tool-execution ecosystem for shell, MCP, or remote
  execution bindings;
- add the explicit post-turn memory/wiki update phase;
- add provider streaming support;
- add richer tool-execution observability into host and Studio.

Those belong to later runtime-deepening slices.

## Architectural conclusion

The first real tool-loop path is now in place without violating the project’s
core design rules:

- package contracts remain package-shaped;
- runner behavior remains runtime-shaped;
- provider protocol remains trapped inside the engine adapter;
- the system moved forward by completing the boundary, not by bypassing it.

This is the correct foundation for future widening of tools, memory updates,
and deeper operator visibility.
