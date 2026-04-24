# Runner Lifecycle Specification

## Purpose

The runner is the executable embodiment of a node. This document defines the lifecycle the runner should implement.

The machine-readable lifecycle-adjacent contracts now live in `packages/types`
for:

- Entangle A2A message payloads;
- session records;
- conversation records;
- approval records;
- runner phases and turn tracking.

## Inputs to the runner

The runner starts with:

- a runtime-bound workspace derived from an `AgentPackage`;
- a `NodeInstance`;
- an `EffectiveNodeBinding`;
- injected runtime context derived from `RuntimeProjection`, policy, and resource resolution;
- mounted secrets and keys;
- mounted artifact workspace;
- mounted wiki memory;
- runtime engine configuration.

## Long-running responsibilities

The runner continuously:

- maintains relay subscriptions;
- does not report itself as subscription-ready until the configured readable
  relay set has been connected successfully for the active transport mode;
- watches inbound messages;
- tracks session-local state;
- manages memory updates;
- maintains workspace integrity;
- enforces edge-local policy.

## Message handling lifecycle

### Phase 1: receive

- receive event from Nostr relay;
- verify signature and addressed recipient;
- parse Entangle envelope;
- reject if protocol version unsupported.

### Phase 2: authorize

- verify sender is permitted by current edge policy;
- verify relation type allows this message type;
- verify session and graph context are valid;
- verify reply depth and stop conditions.

### Phase 3: resolve context

Construct local execution context from:

- package prompt files;
- node-local overlays;
- runtime projection;
- local wiki pages;
- artifact references;
- current session state.

### Phase 4: agentic execution

Invoke the engine with access to:

- local filesystem;
- git workspace;
- wiki;
- allowed tools;
- prior context and task state.

### Phase 5: side effects

The engine may:

- update workspace;
- create or modify git branches;
- write report files;
- update wiki;
- produce artifact references;
- decide on escalation or approval requirements.

### Phase 6: memory consolidation

After work completes:

- append interaction log;
- update relevant knowledge pages;
- record decisions and new references;
- add unresolved next steps if needed.

### Phase 7: response control

The runner, not just the model, decides whether to emit messages based on:

- message type semantics;
- `response_required`;
- approval state;
- final/close semantics;
- max followup limits.

### Phase 8: emit

If emission is allowed:

- construct outbound protocol payload;
- sign with node key;
- publish to the correct relay path;
- store local execution record.

## Failure handling

The runner should distinguish:

- transport failure;
- policy failure;
- execution failure;
- artifact failure;
- approval timeout;
- protocol parse failure.

Each class should map to an explicit internal outcome instead of collapsing into "the model failed".

## Hackathon runner profile

The first implementation can be strict and narrow:

- one engine adapter;
- one shared git service profile;
- one shared relay profile;
- one shared model endpoint profile;
- one transport mode;
- no remote package fetch;
- bounded concurrency.

That narrow runtime profile should still consume the canonical machine-readable
contracts rather than inventing runner-local ad hoc state shapes.

## Current implemented local slice

The current implementation has now crossed from bootstrap-only runner behavior
into a first long-lived local intake loop.

That implemented slice currently includes:

- a deterministic transport abstraction used in local tests;
- a real Nostr transport adapter using NIP-59 gift wrapping plus an
  Entangle-specific wrapped rumor kind;
- a file-backed runner-local state store for session, conversation, and turn
  records;
- recipient-bound subscription at the runner-service boundary;
- machine-readable A2A payload validation before lifecycle mutation;
- lifecycle advancement from intake through completion for the current strict
  local path;
- git-backed turn artifact materialization into a runner-local artifact
  workspace;
- deterministic post-turn wiki maintenance that now writes task pages, keeps
  `memory/wiki/index.md` plus `memory/wiki/log.md` aligned with completed
  turns, rebuilds a derived recent-work summary page for future turn
  assembly, and now also supports a bounded model-guided
  focused summary-register synthesis pass for
  `memory/wiki/summaries/working-context.md`,
  `memory/wiki/summaries/decisions.md`,
  `memory/wiki/summaries/stable-facts.md`, and
  `memory/wiki/summaries/open-questions.md`, plus the focused pending-work
  register `memory/wiki/summaries/next-actions.md` and the focused closure
  register `memory/wiki/summaries/resolutions.md`, without giving the model
  arbitrary filesystem authority, now grounded in final post-turn lifecycle
  state rather than pre-completion session state;
- persisted `ArtifactRecord` state linked from session, conversation, and turn
  records;
- outbound `task.result` payloads that now include newly produced artifact
  references alongside inbound ones when a response is emitted;
- bounded `task.result` emission when the inbound response policy requires a
  follow-up;
- live relay smoke validation against a real local `strfry` instance.

The runner lifecycle is therefore no longer only conceptual prose plus a single
bootstrap turn. The next meaningful gaps are clearer upward surfacing of
runtime/session activity plus broader artifact and tool-execution depth beyond
the current first report-file, bounded builtin inspection paths, and bounded
working-context synthesis.
