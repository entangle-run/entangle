# First Real Anthropic Agent-Engine Slice

This document records the slice that replaced the live stub-engine path with
the first real provider-backed internal engine implementation.

## Why this slice mattered

Before this slice, the repository had:

- a stable internal `agent-engine` boundary;
- normalized runner-facing turn contracts;
- a real host/runner/runtime context path;
- but only stub execution in the live runner entrypoints.

That was no longer the right bottleneck. The runner, transport, artifact, and
control-plane layers were already strong enough that continuing to defer real
model execution would have kept the repository artificially shallow.

The goal of this slice was therefore narrow and strict:

- keep the stable internal engine boundary;
- implement one real provider adapter behind it;
- wire live runner entrypoints to that adapter;
- avoid widening prematurely into tool loops or streaming complexity.

## Implemented

### 1. Model auth delivery is now part of effective runtime context

`modelContext` now carries:

- the selected model endpoint profile;
- the resolved auth binding for that endpoint.

That means:

- the runner no longer assumes model credentials exist ambiently in the
  process;
- host runtime realizability now depends on both endpoint selection and secret
  availability;
- the engine adapter can consume secret delivery metadata without leaking raw
  secret values into portable runtime JSON.
- model endpoint auth mode is now treated as explicit deployment data rather
  than an unsafe implicit default, and the host-owned local Anthropic default
  resolves to header-secret semantics instead of bearer-token semantics.

### 2. The first real provider adapter is now implemented

`packages/agent-engine` now contains:

- an Anthropic-backed adapter using the official TypeScript SDK;
- strict configuration checks for missing profile, missing auth binding, empty
  secret material, and unsupported adapter kinds;
- typed engine-specific configuration and execution errors;
- normalized usage and stop-reason mapping back into Entangle contracts.

Later implementation added the `openai_compatible` chat-completions adapter
behind the same boundary, so this slice should now be read as the first
provider-backed engine slice rather than the full provider matrix.

### 3. Prompt assembly is no longer purely synthetic

The Anthropic adapter now renders a real request from:

- system prompt parts;
- interaction prompt parts;
- artifact reference summaries;
- materialized artifact inputs;
- readable memory refs.

This is still intentionally a one-turn slice, but it means the first real
provider-backed execution path is materially more useful than a simple string
stub.

### 4. Live runner entrypoints now use the real engine path

The live paths in `services/runner/src/index.ts` now create a real engine from
the effective model runtime context unless a test explicitly injects an engine.

This preserves:

- a real product path;
- deterministic test injection;
- runner/provider separation.

## Intentional non-goals

This slice did **not** widen into:

- multi-turn reasoning loops;
- tool execution loops;
- provider streaming integration;
- broader provider matrix support beyond the first Anthropic adapter.

Those remain follow-on work, and keeping them out of this slice was necessary
to preserve auditability and boundary clarity.

## Quality and verification

This slice added or tightened:

- `@entangle/types` tests for the new `modelContext.auth` contract;
- host tests for missing model-secret runtime unavailability;
- agent-engine tests for:
  - real request assembly,
  - auth-mode mapping,
  - normalized provider error classification,
  - deterministic adapter selection;
- runner tests updated so product entrypoints use the real engine while unit
  tests remain deterministic via injection.

The slice was closed only after:

- targeted tests passed for `types`, `agent-engine`, `host`, and `runner`;
- targeted typecheck and lint issues were corrected;
- `pnpm verify` passed repository-wide;
- `git diff --check` was clean.

## Architectural conclusion

This slice confirms that the engine boundary was the right design choice.

Entangle now has:

- a real provider-backed engine path;
- a runner that remains provider-agnostic;
- host-resolved model credential delivery;
- a clean next step: deepen the engine into bounded multi-turn and tool-loop
  execution instead of rewriting boundaries again.

## Official sources consulted

To keep the implementation aligned with current provider behavior, this slice
was validated against official Anthropic sources:

- Anthropic TypeScript SDK docs:
  https://platform.claude.com/docs/en/api/sdks/typescript
- Anthropic Messages patterns:
  https://platform.claude.com/docs/en/build-with-claude/working-with-messages
- Official Anthropic TypeScript SDK repository:
  https://github.com/anthropics/anthropic-sdk-typescript
