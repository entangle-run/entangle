# Package Tool Catalog Contract Slice

This document records the micro-slice that closes the package-level tool
contract gap before the internal tool loop is implemented.

## Why this slice was necessary

The repository had already reached the point where a real provider-backed
`agent-engine` existed, but the package/runtime contract for tools was still
under-specified:

- the filesystem spec mentioned `runtime/tools.json`;
- the manifest did not own a `toolsPath`;
- scaffolds did not create a tool catalog file;
- package validation did not require one;
- the runner therefore had no canonical package file from which future tool
  definitions should be loaded.

That was the wrong foundation for a real tool loop. Implementing tool
execution directly on top of ad hoc runner logic would have introduced drift
between package specification, validator behavior, and runtime execution.

## What this slice freezes

### 1. `runtime/tools.json` is now a real package contract

Packages now carry a dedicated structured tool catalog file.

The manifest runtime block now owns:

- `configPath`
- `capabilitiesPath`
- `toolsPath`

This makes the tool surface first-class package data instead of an implicit
future convention.

### 2. Package tool definitions are now machine-readable

The type layer now defines:

- a package tool catalog schema;
- package tool definitions;
- an execution-binding contract for package tools.

The current execution-binding profile is intentionally narrow:

- `builtin`

That is enough to let the next slice map package-declared tools onto an
Entangle-owned executor registry without committing prematurely to shell-based
or provider-shaped tool execution.

### 3. Empty tool catalogs are explicit, not inferred

Scaffolds and validator behavior now require an explicit `runtime/tools.json`,
even when the tool catalog is empty.

That matters because:

- the package contract stays stable across node packages;
- package validation can fail deterministically when the file is missing;
- future runtime loading can rely on an explicit on-disk source of truth.

## Intentional non-goals

This slice does **not** yet:

- load tool definitions into runner turn requests;
- execute tools inside the internal engine loop;
- define the full runtime tool result contract;
- widen execution bindings beyond the first builtin-oriented path.

Those belong to the next capability slice.

## Architectural conclusion

The correct next step is now clear:

1. load package tool catalogs into the runner turn request;
2. add an Entangle-owned builtin tool executor boundary;
3. deepen `packages/agent-engine` into a bounded multi-turn tool loop.

Without this contract slice, that next step would have been under-specified.
