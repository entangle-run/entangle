# OpenAI-Compatible Agent Engine Slice

Date: 2026-04-24

## Purpose

Close the provider-matrix gap where `openai_compatible` was already part of
the canonical model endpoint adapter enum and host defaults, but the internal
agent engine still rejected it as unimplemented.

## Implemented Behavior

- `createAgentEngineForModelContext` now routes `adapterKind:
  "openai_compatible"` to a first-party adapter behind the existing Entangle
  engine boundary.
- The adapter reads model credentials from `ModelRuntimeContext.auth` through
  the existing resolved-secret-binding contract.
- The adapter requires `authMode: "api_key_bearer"` because the current
  `modelEndpointProfile` contract does not carry provider-specific header
  names.
- The adapter sends chat-completions-style requests to
  `<baseUrl>/chat/completions`.
- System prompts, interaction prompts, artifact refs, artifact inputs, and
  memory refs are rendered through the same bounded prompt assembly helpers
  used by the Anthropic adapter.
- Tool definitions map to OpenAI-compatible function tools.
- `toolChoice: "auto"` and forced tool choice map to OpenAI-compatible
  `tool_choice` values.
- Tool calls continue through Entangle's provider-agnostic tool executor and
  are recorded as canonical `toolRequests` and `toolExecutions`.
- Provider usage, model id, finish reason, and assistant text are normalized
  into the existing `AgentEngineTurnResult` contract.

## Evidence

- `packages/agent-engine/src/index.ts` contains the new OpenAI-compatible
  adapter, client factory, request mapping, tool-call continuation, usage
  accumulation, and provider error classification.
- `packages/agent-engine/src/index.test.ts` covers basic request rendering,
  bearer-token credential flow, OpenAI-compatible tool loops, and rejection of
  unsupported auth mode.

## Design Notes

The runner remains provider-agnostic. This slice does not add OpenAI-specific
logic to runner services, runtime context loading, or memory synthesis.

The adapter uses a small first-party `fetch` client rather than introducing a
new SDK dependency because the target contract is intentionally
OpenAI-compatible rather than OpenAI-only. If a later provider requires richer
streaming or provider-specific metadata, that can be added behind this same
adapter boundary.

## Verification

- `pnpm --filter @entangle/agent-engine lint`
- `pnpm --filter @entangle/agent-engine typecheck`
- `pnpm --filter @entangle/agent-engine test`
- `pnpm verify`
- `git diff --check`
