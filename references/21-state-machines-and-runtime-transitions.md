# State Machines and Runtime Transitions

This document defines the main state machines that make Entangle executable rather than merely descriptive.

The canonical types define what objects exist. This document defines how those objects are allowed to move.

## Why this matters

If Entangle does not define state transitions explicitly, the system will be vulnerable to:

- unbounded conversation loops;
- inconsistent approvals;
- ambiguous session completion;
- incompatible runner implementations;
- weak observability.

## Design rule

Every important lifecycle should have:

- explicit states;
- allowed transitions;
- terminal states;
- timeout behavior;
- failure behavior.

## 1. Session lifecycle

Session is the top-level execution unit.

### Recommended canonical states

- `requested`
- `accepted`
- `planning`
- `active`
- `waiting_approval`
- `synthesizing`
- `completed`
- `failed`
- `cancelled`
- `timed_out`

### Meaning of each state

#### `requested`

The session exists and has been submitted, but no entrypoint node has accepted responsibility yet.

#### `accepted`

An entrypoint node has accepted responsibility for the session and will either begin planning or reject/fail later.

#### `planning`

The system is constructing the runtime execution subgraph and work decomposition.

#### `active`

At least one conversation or work path is active in the runtime subgraph.
In runner-Entangle state, `activeConversationIds` should be reconciled from
non-terminal conversation records rather than treated as append-only history.
Resolved, rejected, closed, or expired conversations must not keep a session
active by themselves.

#### `waiting_approval`

Execution is blocked on one or more explicit approval gates.

#### `synthesizing`

The system has enough work product to assemble the session-level response or outcome package.

#### `completed`

The session has reached a successful terminal state.

#### `failed`

The session reached an unrecoverable error terminal state.

#### `cancelled`

A user, controller, or policy cancelled the session before completion.

#### `timed_out`

The session exceeded time or inactivity limits and is now terminal.

### Allowed transitions

- `requested -> accepted`
- `accepted -> planning`
- `planning -> active`
- `active -> waiting_approval`
- `waiting_approval -> active`
- `active -> synthesizing`
- `synthesizing -> completed`
- `requested -> failed`
- `accepted -> failed`
- `planning -> failed`
- `active -> failed`
- `waiting_approval -> failed`
- `synthesizing -> failed`
- `requested -> cancelled`
- `accepted -> cancelled`
- `planning -> cancelled`
- `active -> cancelled`
- `waiting_approval -> cancelled`
- `requested -> timed_out`
- `accepted -> timed_out`
- `planning -> timed_out`
- `active -> timed_out`
- `waiting_approval -> timed_out`

### Forbidden transitions

Examples:

- `completed -> active`
- `failed -> active`
- `cancelled -> active`
- `timed_out -> active`
- `requested -> synthesizing`
- `planning -> completed` without any active or synthesized outcome path

### Hackathon subset

The hackathon build may implement only:

- `requested`
- `accepted`
- `active`
- `completed`
- `failed`

The full canonical state set should still remain documented and stable.

## 2. Conversation lifecycle

A conversation is the bounded dialogue between two nodes inside a session.

### Recommended canonical states

- `opened`
- `acknowledged`
- `working`
- `blocked`
- `awaiting_approval`
- `resolved`
- `rejected`
- `closed`
- `expired`

### Typical mapping to A2A messages

- `task.request` opens a conversation
- `task.accept` moves to `acknowledged` or `working`
- `task.update` keeps the conversation in `working`
- `approval.request` moves to `awaiting_approval`
- `approval.response` returns to `working` or moves toward `rejected`
- `task.result` moves to `resolved`
- `task.reject` moves to `rejected`
- `conversation.close` moves to `closed`

### Allowed transitions

- `opened -> acknowledged`
- `opened -> rejected`
- `acknowledged -> working`
- `working -> blocked`
- `blocked -> working`
- `working -> awaiting_approval`
- `awaiting_approval -> working`
- `working -> resolved`
- `awaiting_approval -> rejected`
- `resolved -> closed`
- `rejected -> closed`
- `any non-terminal state -> expired`

### Terminal states

- `closed`
- `expired`

### Design rule

Every runner should be able to determine whether a conversation still expects action.

That decision must not rely only on model free-text.

It should rely on:

- current conversation state;
- message type;
- response policy;
- approval state;
- follow-up limits.

## 3. Approval gate lifecycle

Approval is a first-class transition control mechanism.

### Canonical states

- `not_required`
- `pending`
- `approved`
- `rejected`
- `expired`
- `withdrawn`

### Allowed transitions

- `not_required` is terminal for the current decision point
- `pending -> approved`
- `pending -> rejected`
- `pending -> expired`
- `pending -> withdrawn`

### Rules

- approval gates are scoped to a concrete decision point, not to the whole session forever;
- a session or conversation may encounter multiple approval gates over time;
- every approval gate must identify who may approve;
- approval results must be attributable and signed.

## 4. Runner activity lifecycle

Each runner executes a bounded internal loop per incoming trigger.

### Recommended internal phases

- `idle`
- `receiving`
- `validating`
- `contextualizing`
- `reasoning`
- `acting`
- `persisting`
- `emitting`
- `blocked`
- `errored`

### Intent of the phases

#### `idle`

No active trigger is being processed.

#### `receiving`

The runner has received an event and is staging it for validation.

#### `validating`

The runner checks:

- signature;
- sender legitimacy;
- graph and session correlation;
- message validity;
- policy admissibility.

#### `contextualizing`

The runner builds the effective local context:

- runtime projection;
- relevant memory;
- relevant artifacts;
- relevant relay and approval context.

#### `reasoning`

The agent engine decides what to do.

#### `acting`

The runner or agent engine performs tool or artifact operations.

#### `persisting`

The runner updates wiki memory, logs, and other durable Entangle state.

#### `emitting`

The runner publishes messages or artifact references if policy allows.

#### `blocked`

The runner cannot continue without approval, a dependency, or environmental recovery.

#### `errored`

The current trigger failed irrecoverably.

### Important rule

The runner should own transition control. The model should propose actions, but the runner decides whether a message is:

- valid to send;
- required to send;
- forbidden to send;
- deferred pending approval;
- unnecessary because the conversation is already terminal.

## 5. Artifact lifecycle

Artifacts are durable work products, not just side effects.

### Canonical lifecycle

- `declared`
- `materialized`
- `published`
- `superseded`
- `rejected`
- `failed`

### Meaning

#### `declared`

The system has created an artifact intention or reference placeholder, but the durable work product is not yet confirmed.

#### `materialized`

The backend operation completed successfully enough to create a durable local or
backend-specific work product, such as:

- writing a wiki page;
- creating a branch;
- committing a report file;
- creating a file-backed output.

The artifact may still be local-only at this stage.

#### `published`

The artifact has been published or otherwise made retrievable according to the
relevant backend policy.

#### `superseded`

The artifact remains historically valid but is no longer the preferred live output.

#### `rejected`

The candidate artifact was explicitly rejected as a valid work product or
publication outcome.

#### `failed`

Materialization or publication failed and the artifact record remains useful
only for diagnostics or retry logic.

### Rule

Messages should prefer referencing `materialized` or `published` artifacts, not
speculative placeholders.

## 6. Response and stop conditions

This is the anti-loop control layer.

### A runner should not emit a follow-up response when:

- the conversation is terminal;
- `response_required = false`;
- `max_followups` has been reached;
- the current message type is informational and policy does not require acknowledgment;
- approval is required before response and has not been granted;
- the outgoing message would duplicate a previous terminal result with no new artifact or state change.

### A runner may emit a follow-up response when:

- the current state expects acknowledgment;
- the policy requires a result;
- a meaningful state transition occurred;
- a new artifact became available;
- approval was granted or denied and that outcome must be communicated.

## 7. Failure and timeout semantics

Time and failure should not be left implicit.

### Required failure concepts

- hard failure;
- transient failure;
- approval timeout;
- transport timeout;
- dependency timeout;
- cancelled by controller.

### Minimum behavior

The runtime should preserve enough structured state that observers can distinguish:

- "the agent refused";
- "the agent failed";
- "the agent is blocked";
- "the system timed out";
- "the controller cancelled the work".

## 8. Observability requirement

Every major transition should be traceable.

At minimum, the system should be able to reconstruct:

- session state history;
- conversation state history;
- approval outcomes;
- artifact production history;
- runner phase boundaries for significant actions.

## 9. Hackathon interpretation

The hackathon build may implement simplified runtime internals and only a subset of the states above.

It must still preserve these structural rules:

- terminal states are terminal;
- approvals are explicit when required;
- conversations do not ping-pong indefinitely;
- artifact publication and message emission remain distinguishable;
- session completion is explicit and observable.
