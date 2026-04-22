# Machine-Readable A2A and Runner State Contracts

This document records the point where Entangle's application protocol and
runner-local state stopped being only descriptive reference material and became
owned by `packages/types` and `packages/validator`.

## Why this batch matters

Before this refinement, the repository had:

- a good semantic protocol specification in prose;
- a good runner lifecycle specification in prose;
- state-machine rules in prose.

But it still lacked:

- a machine-readable Entangle A2A payload contract;
- machine-readable session, conversation, and approval state records;
- transition helpers that make invalid lifecycle moves explicit in code;
- validator surfaces that let other packages reject bad protocol/state
  documents consistently.

That gap would have made the next runner slice much riskier, because transport
and lifecycle code would have had to invent their own implicit shapes.

## Contracts now owned by `packages/types`

The following contracts are now exported from `@entangle/types`:

- `entangleA2AMessageSchema`
- `entangleA2AMessageTypeSchema`
- `entangleA2AResponsePolicySchema`
- `entangleA2AConstraintsSchema`
- `sessionRecordSchema`
- `conversationRecordSchema`
- `approvalRecordSchema`
- `runnerTurnRecordSchema`
- `sessionLifecycleStateSchema`
- `conversationLifecycleStateSchema`
- `approvalLifecycleStateSchema`
- `runnerPhaseSchema`

The transition rules in
[21-state-machines-and-runtime-transitions.md](21-state-machines-and-runtime-transitions.md)
are now backed by:

- `isAllowedSessionLifecycleTransition(...)`
- `isAllowedConversationLifecycleTransition(...)`
- `isAllowedApprovalLifecycleTransition(...)`

## Protocol shape decisions

The first machine-readable A2A contract uses camelCase keys, not snake_case.

That is a deliberate repository-wide consistency decision:

- host API payloads already use camelCase;
- runtime context payloads already use camelCase;
- graph and catalog documents already use camelCase.

The canonical field names are now:

- `messageType`
- `graphId`
- `sessionId`
- `conversationId`
- `turnId`
- `parentMessageId`
- `fromNodeId`
- `fromPubkey`
- `toNodeId`
- `toPubkey`

Including both node ids and pubkeys is intentional.

Entangle needs:

- graph-local node references for policy and topology resolution;
- authoritative protocol identities for signed transport authorship.

Using only one of those would have made the contract weaker and more ambiguous.

## Semantic guardrails now enforced by schema

The protocol schema now rejects several invalid shapes before any runner logic
starts:

- self-addressed messages by node id;
- self-addressed messages by pubkey;
- follow-up message types that omit `parentMessageId`;
- `conversation.close` payloads that still request a follow-up response;
- response-required messages that allow zero follow-ups.

These are not the full semantic model of Entangle, but they are a meaningful
floor under the protocol.

## Runner-local state coverage

The runner now has canonical record shapes for:

- session-local state;
- conversation-local state;
- approval gates;
- bounded runner turn tracking.

The local runner perspective also forced one important realism correction:

- `entrypointNodeId` is optional on session records;
- `originatingNodeId` is optional on session records.

A materialized local runner can always know its local owner node and the
current peer message, but it cannot always authoritatively reconstruct the
original global entrypoint or originating user node for every session shape.

This is the minimum shape discipline needed before implementing:

- long-lived Nostr intake;
- per-message lifecycle control;
- stop/reply enforcement;
- artifact handoff logic.

## Validator surfaces

`packages/validator` now exposes validation entrypoints for:

- `validateA2AMessageDocument(...)`
- `validateSessionRecordDocument(...)`
- `validateConversationRecordDocument(...)`
- `validateApprovalRecordDocument(...)`
- `validateRunnerTurnRecordDocument(...)`
- lifecycle transition validation for session, conversation, and approval states

This keeps semantic rejection logic out of ad hoc caller code.

## Remaining gap after this slice

The biggest unresolved runtime gap after this batch is identity materialization.

The codebase now models protocol authorship more explicitly, but the host still
needs to become the owner of:

- stable per-node Nostr identities;
- non-secret identity context injection;
- secret delivery to the runner without collapsing boundaries.

That should be the next runner-adjacent refinement before live Nostr transport
is considered complete.
