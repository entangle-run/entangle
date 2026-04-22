# Agent Engine Boundary and Reuse Policy

This document freezes how Entangle should realize agentic execution without
collapsing the architecture into a fork of an upstream coding-agent product.

The trigger for this document is the remaining question left open in the
pre-implementation audit:

> How much of the first agentic execution core should be built directly inside
> Entangle versus adapted from OpenCode-like runtimes?

## Design rule

Entangle should own its agent-execution boundary as a first-party internal
package.

That boundary should be:

- reusable across node kinds;
- provider-agnostic;
- independent from Nostr and graph transport concerns;
- independent from Studio and host control-plane concerns;
- strict enough that upstream engine references can inform implementation
  without becoming the product runtime.

Recommended package name:

- `packages/agent-engine`

## 1. What the agent engine is

The agent engine is the package that turns a runner-owned turn request into an
agentic execution loop.

It should own:

- prompt-part assembly into a normalized model turn request;
- provider-agnostic tool-loop execution;
- internal tool-call iteration and max-turn enforcement;
- normalized streaming event translation;
- context compaction hooks and token-budget interfaces;
- provider-adapter dispatch through the engine-adapter boundary;
- normalized turn result objects returned to the runner.

It should not own:

- Nostr subscriptions or publication;
- edge authorization;
- session or conversation state transitions;
- graph mutation;
- artifact publication policy;
- approval-gate enforcement;
- deployment resource resolution;
- runtime workspace materialization.

Those stay with:

- `entangle-host`
- `entangle-runner`
- validators
- the control-plane model

## 2. Why Entangle should not embed OpenCode wholesale

Using OpenCode as a design and implementation reference remains useful.

Using it as the literal runtime core for every node would be the wrong
boundary because it would:

- drag UI- and product-level assumptions into the node runtime;
- make Entangle's runner behavior depend on an upstream product shell;
- complicate testability of message, approval, and artifact semantics;
- make it harder to define stable internal contracts for multiple node kinds;
- turn an implementation shortcut into long-term architecture debt.

The same logic applies to other large reference systems such as OpenClaw.

Entangle should learn from them, not disappear inside them.

## 3. Recommended reuse policy

The first serious Entangle implementation should follow this reuse policy.

### Strong yes

- reuse architectural ideas and workflow patterns from OpenCode-like systems;
- reuse provider wrappers or SDKs behind Entangle-owned adapter boundaries;
- reuse small isolated utilities where the dependency cost is low and the
  boundary remains clean;
- reuse protocol-agnostic helper code only if it does not drag product-level
  state models into Entangle.

### Strong no

- do not make OpenCode or another upstream runtime the canonical execution
  boundary for a node;
- do not make provider SDK types or upstream agent runtime types part of
  Entangle's product contracts;
- do not require one full standalone upstream product shell per node;
- do not let upstream session or workspace models displace Entangle's own
  session, artifact, or approval semantics.

## 4. Recommended first package split

The first serious internal split should be:

- `services/runner`
  - node runtime loop
  - Nostr and policy integration
  - artifact and memory lifecycle
- `packages/agent-engine`
  - model turn orchestration
  - tool loop
  - provider-agnostic normalized execution
- `packages/types`
  - canonical schemas and turn contracts

This is the cleanest way to keep the runner thin enough to reason about while
still giving the agentic execution core a reusable home.

## 5. Recommended first implementation

For the first implementation:

- create `packages/agent-engine` as an Entangle-owned internal package;
- define a normalized turn request/response contract there;
- implement the first provider path through the existing engine-adapter
  boundary;
- let `services/runner` compose that engine rather than reimplementing the tool
  loop inline.

This gives the project:

- a stable execution boundary;
- direct testability of tool-call and turn behavior;
- freedom to evolve the runner without rewriting model execution internals;
- freedom to evolve provider adapters without reshaping the graph model.

## 6. Hackathon stance

The hackathon should still use one engine package and one adapter.

Recommended profile:

- `packages/agent-engine`
- one `anthropic` adapter
- one shared model endpoint profile
- one normalized tool loop

This is a restriction of the active profile, not a restriction of the boundary
design.

## 7. Relationship to references

The current references support this policy rather than contradict it:

- OpenCode shows the value of a serious agent loop and a strong TypeScript
  ecosystem.
- OpenClaw shows the value of explicit runtime boundaries and plugin/tool
  layering.
- MCP reinforces schema-first interface discipline.

But none of them require Entangle to surrender its own runtime boundary.

## 8. Final recommendation

Freeze this as the implementation rule:

> Entangle should build a first-party internal `agent-engine` package and adapt
> external ideas through that boundary, rather than adopting an upstream
> end-user agent runtime wholesale as the node execution core.
