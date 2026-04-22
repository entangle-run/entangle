# Runner Transport and Long-Lived Intake Slice

This document records the first point where `entangle-runner` stopped being
only a bootstrap executable and became a long-lived local runtime service.

## Why this slice matters

Before this batch, the runner could:

- load injected runtime context;
- read package prompts and runtime config;
- construct a normalized engine request;
- execute a single stub-engine turn.

That was enough to validate the injected-context boundary, but not enough to
validate the real runtime shape of Entangle. The repository still lacked:

- a transport boundary the runner could listen on;
- a long-lived runner service;
- runner-local persistence for session, conversation, and turn records;
- deterministic tests for message intake and bounded response emission.

## New runtime surfaces

The current slice adds four concrete pieces:

### 1. `RunnerTransport`

The runner now depends on an explicit transport interface rather than reaching
directly into a relay implementation.

That interface currently defines:

- `subscribe(...)`
- `publish(...)`
- `close()`

The first implementation is an in-memory deterministic transport used for local
integration tests.

### 2. runner-local state store

The runner now owns a file-backed local state store rooted under the materialized
runtime root.

The current store persists:

- session records
- conversation records
- approval records
- turn records

Those files are validated against the canonical machine-readable contracts from
`packages/types`.

### 3. `RunnerService`

The runner now has a long-lived service boundary responsible for:

- subscribing for the local node pubkey;
- rejecting messages for the wrong node or wrong pubkey;
- validating inbound Entangle A2A payloads;
- building and persisting turn records;
- creating or loading session and conversation records;
- advancing lifecycle state through the strict current local path;
- invoking the internal engine adapter boundary;
- emitting a bounded `task.result` reply when `responseRequired` is true.

### 4. deterministic runtime tests

The runner package now has deterministic tests that cover:

- intake and response publication;
- no-response flows;
- wrong-node and wrong-pubkey rejection;
- invalid payload rejection before state mutation;
- idempotent service start behavior.

## Lifecycle correctness decisions in this slice

Two quality decisions matter here:

### session transitions must respect the canonical state machine

The runner does not jump from `active` directly to `completed`.

The implemented local path is now:

- `requested`
- `accepted`
- `planning`
- `active`
- `synthesizing`
- `completed`

That matches the canonical lifecycle contract instead of introducing
runner-local shortcuts.

### conversation closure follows inbound policy

The runner does not hardcode local closure behavior independently of the inbound
task policy.

The current local rule is:

- resolve work locally;
- emit `task.result` only when required;
- close the local conversation only when the inbound `closeOnResult` policy
  says to do so.

## Boundaries preserved

This slice intentionally does **not** collapse runtime concerns together.

It preserves the following boundaries:

- transport remains abstract;
- engine execution remains behind `@entangle/agent-engine`;
- machine-readable contracts remain owned by `packages/types`;
- semantic validation remains owned by `packages/validator`;
- runner-local persistence remains local to the runtime root, not the host
  desired-state store.

## Remaining gap after this slice

The highest-value remaining runner gap is no longer local lifecycle structure.

It is now:

- replacing the in-memory transport with a real Nostr transport adapter;
- adding git artifact workspace and handoff logic;
- exposing richer runtime trace state upward through host and Studio.
