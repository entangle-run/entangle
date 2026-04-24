# Builtin Memory-Ref Inspection Slice

This document records the slice that widens the first bounded builtin tool
surface in the runner without widening the host, transport, or package
contracts.

## Why this slice was necessary

The repository already had:

- a real internal Anthropic-backed engine boundary;
- a bounded internal tool loop;
- deterministic post-turn memory maintenance; and
- live turn assembly that already passed `memoryRefs` into the engine request.

But the builtin tool surface still had a clear asymmetry:

- artifact inputs could be inspected through a runtime-local builtin tool;
- bounded memory refs could only be inlined into the prompt, not inspected
  through the same explicit tool boundary.

That left the engine with less structured access to the node's own durable
memory than to inbound artifacts, even though both were already part of the
same turn contract.

## What this slice freezes

### 1. The builtin tool surface now includes bounded memory-ref inspection

The runner now supports a second builtin tool:

- `inspect_memory_ref`

This tool is intentionally narrow. It does not grant arbitrary filesystem
access. It can only inspect memory references that are already present in the
current `EngineToolExecutionRequest`.

### 2. Memory-ref resolution is explicit and deterministic

`inspect_memory_ref` accepts exactly one of:

- `memoryRef`
- `basename`

Resolution rules are strict:

- exact `memoryRef` matches must already exist in `request.memoryRefs`;
- `basename` resolution succeeds only when it matches exactly one available
  memory ref;
- ambiguous basenames fail explicitly;
- missing or malformed input fails explicitly.

There are no hidden fallbacks such as “first basename wins”.

### 3. Tool results remain structured and bounded

Successful results now return:

- the resolved `memoryRef`;
- its `basename`;
- a bounded text preview.

Failure results remain structured and deterministic:

- `invalid_input`
- `memory_ref_not_found`
- `memory_ref_ambiguous`
- `memory_ref_not_readable`

This keeps tool-loop behavior machine-readable and auditable instead of mixing
prompt prose with implicit runtime heuristics.

## Intentional non-goals

This slice does **not** yet:

- let the model mutate wiki pages directly;
- widen the builtin tool surface into arbitrary shell or filesystem execution;
- add host or Studio surfaces for memory-ref inspection;
- replace the deterministic post-turn memory maintenance phase with
  model-authored synthesis.

Those remain later runtime-deepening steps.

## Architectural conclusion

The internal runtime execution path is now slightly deeper without breaking the
project's design rules:

- the engine still consumes provider-agnostic tool definitions;
- the runner still owns runtime-local builtin execution;
- memory access remains bounded by the already assembled turn context;
- future richer model-guided memory work can build on a clean explicit tool
  surface instead of on implicit prompt-only context.
