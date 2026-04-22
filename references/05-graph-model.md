# Graph Model

## Three graph layers

Entangle should explicitly distinguish three graph views.

### 1. Topology graph

The static organization:

- which nodes exist;
- which edges exist;
- which nodes are entrypoints;
- what each relation means.

### 2. Runtime execution subgraph

The portion of the graph actually activated by one session:

- which nodes were touched;
- which edges were traversed;
- which node produced which artifact;
- where approvals or blocks occurred.

### 3. Control graph

The governance overlay:

- who can modify which nodes;
- who can mutate topology;
- who can approve transitions;
- who can escalate to whom.

## Entry points

The user does not "talk to the whole system." The user selects one or more entrypoint nodes.

An entrypoint may be:

- a supervisor;
- an orchestrator;
- a worker;
- a facade node;
- later, a group or template entrypoint.

## Edge semantics

Edges must be typed. "Connected" is not enough.

Recommended initial relation types:

- `supervises`
- `delegates_to`
- `reports_to`
- `peer_collaborates_with`
- `reviews`
- `consults`
- `routes_to`
- `escalates_to`

Each type carries different implications for:

- who may initiate;
- what message types are valid;
- whether work ownership changes;
- whether approval is required.

## Approval as relation property

Approval is not a "human-only" concept. It is a transition control concept.

Examples:

- user -> deploy node may require confirmation;
- manager -> worker may require acknowledgment;
- worker -> reviewer may not require approval but may require explicit result closure.

This should be represented as a policy feature of the edge or transition, not of the node type.

## Graph-local trust

Global web-of-trust style scoring is not needed for the first serious version.

What is useful now:

- local trust labels;
- local preferred nodes;
- critical-only nodes;
- human-approved-only transitions;
- simple reliability metrics.

That is enough to support governance without prematurely inventing a global reputation system.
