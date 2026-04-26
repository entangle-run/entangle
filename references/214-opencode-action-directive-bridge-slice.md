# OpenCode Action Directive Bridge Slice

Date: 2026-04-26.

## Purpose

This slice advances B7 of the Entangle Local completion plan by adding the
first production-shaped bridge from OpenCode text outcomes back into Entangle
actions.

The goal is narrow and explicit: OpenCode may propose Entangle side effects,
but Entangle validates and performs those side effects through existing graph,
policy, transport, and artifact boundaries.

## Entry Audit

The implementation was based on direct source inspection, not assumptions:

- Entangle runner already resolves generic `handoffDirectives` through
  `resolveHandoffPlans(...)`, validating autonomy policy, effective edge
  routes, allowed relations, and materialized peer Nostr public keys before
  publishing `task.handoff`.
- Entangle's OpenCode adapter previously collected assistant text, tool
  observations, session ids, version evidence, errors, and permission
  auto-rejections, but it did not translate OpenCode output into generic
  handoff directives.
- OpenCode's `run --format=json` command emits raw JSON events for text,
  tool, step, and error events.
- OpenCode's one-shot CLI path auto-rejects permission requests unless
  `--dangerously-skip-permissions` is used, which Entangle deliberately does
  not use as the default.
- OpenCode's server route exposes a permission response endpoint, but the
  current Entangle adapter remains one-shot and therefore cannot yet pause and
  resume live OpenCode permission requests.

## Implemented Behavior

Executable Entangle turn assembly now includes an explicit action contract in
the prompt. The contract tells the node-local coding engine to propose
Entangle side effects only through a fenced `entangle-actions` JSON block and
states that Entangle validates every directive before performing it.

The OpenCode adapter now extracts bounded `entangle-actions` blocks from
assistant text, removes those machine-action blocks from the human assistant
message, validates `handoffDirectives` through the canonical engine handoff
schema, and returns validated directives on `AgentEngineTurnResult`.

Malformed or oversized action blocks produce a bounded `bad_request` engine
result with provider stop reason `entangle_action_directive_parse_error`.

The runner then uses the existing B7-adjacent handoff path: directives are
resolved against effective peer routes and policy after artifact
materialization, and only validated Entangle messages are published.

The hardening follow-up changed unauthorized or unroutable handoff directives
from generic `bad_request` failures to `policy_denied` failures. When this
happens after the engine already returned a syntactically valid result, the
runner preserves bounded engine session id, engine version, provider stop
reason, permission observations, tool observations, and usage evidence on the
failed turn outcome.

## Boundary Decisions

- OpenCode does not get direct authority to message peers or publish artifacts.
- The action block is adapter input, not a protocol contract.
- The public host, graph, and A2A contracts remain engine-agnostic.
- Entangle action blocks are not persisted as raw prompt/output evidence.
- The first supported action directive is handoff. Approval-request and
  publication directives remain future B7/B3 work.

## Focused Verification

The focused implementation checks covered:

- TypeScript typechecking for `@entangle/types`, `@entangle/runner`, and
  `@entangle/host-client`.
- OpenCode adapter tests for valid action extraction, action-block
  sanitization, malformed directive classification, and standard JSON-event
  parsing.
- Runner service tests for policy-denied handoff directives preserving bounded
  engine evidence on failed turn outcomes.

The full repository verification for this slice must still pass before the
batch is considered closed.
