# Tool Execution Diagnostics Slice

## Purpose

Improve operator-facing runtime observability for tool use without widening the
provider boundary or leaking raw execution internals.

Before this slice, tool execution observations carried structured outcome and
error-code fields, but the human-readable reason was only embedded inside
provider continuation messages or generic tool-result payloads. That made host
events, Studio turn inspection, and runner memory less useful during audit and
debug workflows.

## Implemented behavior

- Added optional `message` to `EngineToolExecutionObservation`.
- The agent engine now attaches bounded diagnostic messages for:
  - undeclared tool calls;
  - invalid provider tool input;
  - tool executor failures;
  - explicit tool-result errors.
- Runner deterministic memory pages now include the diagnostic message when a
  tool execution carries one.
- The model-guided synthesis prompt now receives the same bounded diagnostic
  detail through the current-turn engine outcome section.
- Shared runtime-trace presentation now includes diagnostic messages in recent
  tool labels.
- Studio runner-turn detail now shows bounded per-tool error lines.

## Boundary decisions

The message is optional and remains part of the normalized engine outcome. It
does not expose raw provider request/response bodies, raw filesystem paths
beyond already-modeled tool context, or exception stacks.

The host remains a consumer of persisted runner state. It does not interpret
provider-specific tool payloads and does not become responsible for tool
execution semantics.

## Verification

- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/agent-engine test`
- `pnpm --filter @entangle/host-client test`
- `pnpm --filter @entangle/studio test`
- `pnpm --filter @entangle/runner test`
