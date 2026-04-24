# Engine Adapter and Model Execution Specification

This document defines how Entangle runners should invoke LLM-backed agentic
execution without coupling the core runtime to one provider SDK or one hosted
model vendor.

The goal is to keep the runner provider-agnostic while still making a concrete
first implementation choice.

The recommended package and ownership split for this boundary is specified more
explicitly in [41-agent-engine-boundary-and-reuse-policy.md](41-agent-engine-boundary-and-reuse-policy.md).

## Design rule

The runner should depend on an internal engine-adapter contract, not directly on
provider-specific request and response shapes.

That means:

- model endpoint profiles remain deployment data;
- provider SDKs remain implementation details behind adapters;
- runner lifecycle logic remains stable when providers change.

## 1. Layers in model execution

Entangle should distinguish between:

### Model endpoint profile

Deployment-scoped configuration:

- adapter kind;
- base URL;
- auth secret reference;
- default model id;
- provider hints.

### Engine adapter

Internal implementation that knows how to talk to one class of provider APIs.

Examples:

- `anthropic`
- `openai_compatible`
- later others if justified

### Runner turn contract

The runner-facing, provider-agnostic request and response model used during
node execution.

## 2. Why the boundary matters

Without an engine adapter boundary:

- provider payload shapes leak into runner logic;
- switching providers rewrites core execution code;
- testability suffers;
- hackathon shortcuts become product constraints.

The runner must own:

- policy enforcement;
- message semantics;
- artifact and wiki lifecycle;
- stop conditions;
- approval control.

The adapter should own only:

- model call wiring;
- provider-specific tool/message formatting;
- streaming translation;
- provider-specific error classification.

## 3. Recommended first implementation choice

Recommended first implementation stack for model-provider integration:

- TypeScript
- internal engine adapter interface owned by Entangle
- a first-party internal `agent-engine` package owned by Entangle
- official provider SDKs behind Entangle-owned adapters, with wrappers used
  only where they add concrete leverage without distorting the boundary

Why this is a strong first choice:

- it keeps the project provider-agnostic;
- it aligns with the TypeScript-first stack;
- it reduces direct provider lock-in;
- it matches the broader ecosystem used by strong references like OpenCode.

## 4. Recommended first adapter set

For the first serious build:

- primary adapter: `anthropic`
- second adapter: `openai_compatible`

Reasoning:

- the hackathon is expected to use Claude-backed inference;
- direct Anthropic support should therefore be first-class;
- many future systems expose OpenAI-compatible surfaces, so that is the best
  second adapter now that the boundary is stable.

The architecture does not require every deployment to configure both adapters,
but the implementation now supports both first-class adapter kinds.

## 5. Runner-facing contract

The runner should invoke the engine through a provider-agnostic turn contract.

Recommended conceptual request fields:

- `session_id`
- `node_id`
- `model_context`
- `system_prompt_parts`
- `interaction_prompt_parts`
- `policy_context`
- `conversation_messages`
- `tool_definitions`
- `artifact_refs`
- `memory_refs`
- `execution_limits`

Recommended conceptual response fields:

- `assistant_messages`
- `tool_requests`
- `usage`
- `stop_reason`
- `provider_metadata`
- `error_classification` when applicable

## 6. Tool-use stance

The runner should expose tools to the engine through a stable internal tool
surface.

The source of truth for package-declared tools should be a structured package
tool catalog, not prompt prose or provider-shaped tool payloads assembled ad
hoc inside the runner.

The adapter may translate tool definitions and tool-call payloads to provider
formats, but the runner should not become provider-shaped because of tool
calling.

Required properties:

- provider-independent internal tool ids;
- explicit tool input schema;
- explicit tool result shape;
- clear handling of tool-call loops and max turn limits.

## 7. Streaming stance

The first implementation should preserve the ability to stream partial model
output, but the runner should treat streaming as an execution detail rather than
the only representation of a turn.

The adapter should translate provider streaming events into a normalized
internal event stream that the runner can consume.

This allows:

- Studio live updates later;
- deterministic turn completion records;
- provider-independent observability.

## 8. Error classification

The adapter should normalize provider-specific failures into a smaller internal
error vocabulary.

Recommended classes:

- `auth_error`
- `quota_error`
- `rate_limit`
- `bad_request`
- `provider_unavailable`
- `tool_protocol_error`
- `context_limit_error`
- `unknown_provider_error`

The runner should not need to parse provider-native exception strings.

## 9. Context and token budgeting

The runner should own the budgeting policy.

The adapter may expose provider limits or hints, but the runner should decide:

- how much context to include;
- when to compact;
- how tool history is summarized;
- how memory pages are selected.

This keeps provider choice from taking over the node's behavioral policy.

## 10. Secrets and authentication

The adapter must receive secret material through the resolved model endpoint
binding, not from package files.

The runner should be able to start with:

- `model-context.json` for non-secret endpoint metadata;
- environment variables or secret mounts for actual credentials.

This keeps model access aligned with the same secret-binding discipline used for
Nostr and git.

## 11. Hackathon profile

The hackathon should use:

- one engine adapter implementation;
- one shared model endpoint profile;
- one shared credentials source;
- one runner turn contract;
- no provider-dependent branching in graph or package types.

Recommended first operational choice:

- Claude via the `anthropic` adapter

If the actual available endpoint turns out to be an OpenAI-compatible Claude
proxy instead of direct Anthropic access, the adapter boundary still holds and
only the deployment profile plus adapter choice should change.

## 12. Rejected anti-patterns

Entangle should reject:

- baking Anthropic-specific request shapes into runner logic;
- treating provider SDK types as canonical product types;
- hardcoding one hosted provider into package or graph contracts;
- letting token-budget policy live entirely inside provider adapters;
- treating hackathon provider choice as if it were product identity.
