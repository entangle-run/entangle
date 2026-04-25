# Edge Semantics and Policy Matrix

This document defines what edges mean operationally, which message classes they should allow, how initiation and approval interact with relation semantics, and how runtime policy should interpret them.

The goal is to remove ambiguity from graph execution.

## Design rule

An edge is not merely a connection. It is a governed collaboration contract between two graph-local actors.

That contract defines:

- who may initiate;
- what kinds of work may flow;
- who owns the work;
- whether approval is needed;
- whether reverse communication is expected;
- whether escalation, review, routing, or delegation are allowed.

## 1. Relation types

The first serious version of Entangle should treat these as the canonical initial relation set.

### `supervises`

Meaning:

- source has supervisory authority over target;
- source may assign or constrain work;
- target may report progress or results upward.

Typical use:

- manager to worker;
- owner to operator;
- orchestrator to bounded specialist.

### `delegates_to`

Meaning:

- source may ask target to take on a bounded unit of work;
- target owns execution of the delegated unit until result, rejection, or handoff.

Typical use:

- orchestrator to worker;
- worker to specialist.

### `reports_to`

Meaning:

- source normally reports status or result upward to target;
- the relation is asymmetric and should not imply unrestricted reverse delegation.

Typical use:

- worker to manager;
- task specialist to supervisor.

### `peer_collaborates_with`

Meaning:

- both sides may coordinate as peers;
- neither side inherently outranks the other;
- collaboration may be iterative, but still bounded by stop conditions.

Typical use:

- reviewer and implementer;
- two specialists sharing a workstream.

### `reviews`

Meaning:

- source or target, depending on initiator policy, may submit work for evaluation;
- reviewer side should not silently take over ownership unless an explicit handoff occurs.

Typical use:

- implementer to reviewer;
- worker to QA node.

### `consults`

Meaning:

- one side asks for expertise, context, or recommendation;
- consultation does not imply ownership transfer by default.

Typical use:

- worker to domain expert;
- planner to legal or policy advisor.

### `routes_to`

Meaning:

- one side can act as a routing or forwarding hop to the other;
- routing authority does not automatically imply deep execution authority.

Typical use:

- facade node to internal specialist;
- ingress node to orchestrator.

### `escalates_to`

Meaning:

- one side may raise blocked, risky, or policy-sensitive work upward;
- escalation is not ordinary delegation.

Typical use:

- worker to manager;
- deploy node to owner or controller.

## 2. Message classes

For policy purposes, message types should be grouped into semantic classes.

Recommended classes:

- `request`
- `accept`
- `reject`
- `update`
- `handoff`
- `result`
- `artifact_ref`
- `approval_request`
- `approval_response`
- `close`
- `question`
- `answer`

These are not necessarily separate transport kinds. They are policy-level message classes used for validation and edge enforcement.

## 3. Initiator policy meanings

`initiator_policy` should be interpreted as follows.

### `source_only`

Only `source_node_id` may initiate a fresh conversation on this edge.

The target may still:

- acknowledge;
- reject;
- update;
- answer;
- return results;
- request approval if allowed.

### `target_only`

Only `target_node_id` may initiate a fresh conversation on this edge.

This is useful for relations such as:

- `reports_to`
- some `escalates_to` paths

### `bidirectional`

Either endpoint may initiate a fresh conversation, subject to relation semantics and message policy.

This should not mean "anything goes". The relation type still constrains meaning.

## 4. Ownership semantics

Work ownership should not be inferred loosely.

Recommended ownership model:

- `task.request` proposes work;
- `task.accept` confirms active participation;
- `task.handoff` transfers ownership or recommended next-step control explicitly;
- `task.result` closes the owned unit of work unless the response policy says otherwise.

The current runner implementation treats autonomous `task.handoff` as a
strictly route-bound action. A handoff directive may emit only through one
resolved effective edge route with a materialized peer pubkey, local autonomy
permission to initiate sessions, and one of these relations:
`delegates_to`, `peer_collaborates_with`, `reviews`, or `routes_to`.

By default:

- `delegates_to` implies target ownership after acceptance;
- `consults` does not imply ownership transfer;
- `reviews` implies reviewer ownership of the review itself, not of the original implementation work;
- `routes_to` implies forwarding behavior, not deep ownership of the routed work unless explicitly accepted later.

## 5. Recommended default policy matrix

This matrix defines recommended defaults, not immutable law. Specific edges may be stricter.

| Relation type | Typical initiator | Typical allowed start classes | Typical reverse classes | Ownership transfer default | Approval sensitivity |
| --- | --- | --- | --- | --- | --- |
| `supervises` | `source_only` | `request`, `question`, `approval_request` | `accept`, `update`, `result`, `answer` | Bounded delegation only | Often medium/high |
| `delegates_to` | `source_only` | `request`, `question` | `accept`, `reject`, `update`, `result`, `artifact_ref`, `approval_request` | Yes, after accept | Medium |
| `reports_to` | `source_only` or `target_only` depending direction chosen | `update`, `result`, `question` | `answer`, `approval_response`, limited `request` | Usually no new ownership | Medium |
| `peer_collaborates_with` | `bidirectional` | `request`, `question`, `update`, `artifact_ref` | same plus `result`, `close` | No automatic transfer | Low/medium |
| `reviews` | usually submitter starts | `request`, `artifact_ref`, `question` | `accept`, `update`, `result`, `question`, `answer` | Review ownership only | Medium |
| `consults` | `source_only` | `question`, `request` | `answer`, `result`, `artifact_ref` | No by default | Low |
| `routes_to` | usually `source_only` | `request`, `handoff` | `accept`, `reject`, `result`, `close` | Only after explicit accept downstream | Medium |
| `escalates_to` | `source_only` | `request`, `update`, `approval_request`, `artifact_ref` | `answer`, `approval_response`, `result`, `close` | No by default | High |

## 6. Relation-specific policy expectations

### `supervises`

Expected behavior:

- source can assign work;
- source can request status;
- target can return updates and results;
- target should not create unrelated fresh requests downward on the same edge unless a separate relation allows it.

### `delegates_to`

Expected behavior:

- source creates a bounded request;
- target either accepts, rejects, requests clarification, or returns a result;
- handoff should be explicit;
- reverse direction should exist at least for updates and results.

### `reports_to`

Expected behavior:

- source provides status or outcome to target;
- target may request clarification or acknowledge;
- this relation should not be treated as general peer collaboration.

### `peer_collaborates_with`

Expected behavior:

- both parties may start bounded work-related exchanges;
- the validator should still enforce follow-up limits and stop conditions;
- peer status should not imply supervisory authority.

### `reviews`

Expected behavior:

- submitter sends work or artifact refs;
- reviewer returns findings, verdicts, or requests clarification;
- reviewer does not silently mutate the original work ownership unless a new delegated path exists.

### `consults`

Expected behavior:

- ask for expertise, not for hidden execution takeover;
- consultation result may be advice, reference, or bounded output.

### `routes_to`

Expected behavior:

- forwarding, ingress, or redirection;
- not a hidden permission to do any work type;
- should often be paired with strong message-policy constraints.

### `escalates_to`

Expected behavior:

- used when normal path is blocked, risky, or policy-sensitive;
- often approval-heavy;
- not the same as routine delegation.

## 7. Approval defaults by relation type

Recommended defaults:

| Relation type | Approval expectation |
| --- | --- |
| `supervises` | Often requires confirmation before risky execution or before final outward publication |
| `delegates_to` | Usually no confirmation to begin routine work, but may require approval before outward publication or destructive actions |
| `reports_to` | Usually no approval to report; approval may be required for subsequent action |
| `peer_collaborates_with` | Usually low approval by default |
| `reviews` | Usually no approval to review; approval may gate acceptance of the review outcome |
| `consults` | Usually low approval |
| `routes_to` | May require approval if routing crosses trust or authority boundaries |
| `escalates_to` | Often explicitly approval-centric |

These defaults should be overrideable per edge.

## 8. Reverse path requirements

Some relations are structurally meaningless without a usable reverse path.

Examples:

- `delegates_to` must support `accept`, `reject`, `update`, or `result` in reverse;
- `reviews` must support review findings in reverse;
- `approval_request` on any edge requires a realizable approval response path.

The validator should reject edges whose transport policy makes required reverse communication impossible.

## 9. Edge state semantics

Edge state should affect routing and runtime behavior.

### `enabled`

The edge may be used normally, subject to policy.

### `disabled`

The edge must not be used for new conversations.

Existing active conversations should either:

- be cancelled;
- be allowed to close gracefully;
- or be frozen by policy.

### `throttled`

The edge remains usable, but with constrained behavior such as:

- limited concurrency;
- stricter approval requirements;
- reduced allowed message classes;
- rate limits.

## 10. Capability expectations

Relation semantics should be checked against endpoint capabilities where meaningful.

Examples:

- a `reviews` edge should involve at least one side able to evaluate or review;
- a `routes_to` edge should terminate in a node that can receive the routed work class;
- a `delegates_to` edge should not delegate to a node with no plausible relevant capability.

This should be a semantic validator, not merely a structural one.

## 11. Control-plane override rules

The control plane may impose stronger restrictions than the edge default.

Allowed override directions:

- narrower initiator policy;
- narrower message class allowance;
- stronger approval requirement;
- stronger throttling;
- temporary disablement.

Control-plane overrides should not silently widen structural permissions unless the graph version changes explicitly.

## 12. Conversation closure expectations

Every relation should support a meaningful terminal behavior.

Typical closure patterns:

- `delegates_to`: result or reject, then close;
- `reviews`: review result, then close;
- `consults`: answer or consultation result, then close;
- `peer_collaborates_with`: bounded work exchange, then close;
- `escalates_to`: decision or approval outcome, then close or redirect.

## 13. Rejected interpretations

The edge model should explicitly reject:

- treating all bidirectional edges as generic peer chat;
- inferring approval authority from titles or prose only;
- using relation type names without enforcing message semantics;
- treating `routes_to` as unrestricted delegation;
- treating `reviews` as silent ownership transfer.

## 14. Hackathon profile

The hackathon build may support only a subset of relation types.

Recommended implemented subset:

- `delegates_to`
- `reviews`
- `consults`
- `reports_to`

That is enough to demonstrate real graph semantics without flattening the model.

The full relation set should remain canonical in the specification even if some are unsupported at runtime.
