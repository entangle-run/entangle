# Human Interface Runtime Realignment Plan

## Current Repo Truth

The current implementation has the first federated execution path:

- Host Authority, runner registry, runtime assignments, control events, and
  observation events exist.
- A generic joined runner can start, register, be trusted, receive an
  assignment, fetch a portable bootstrap bundle, materialize runner-owned
  workspace state, start the assigned node runtime, and emit signed runtime,
  session, conversation, and turn observations.
- OpenCode is the default agent engine behind the node-local agent runtime
  adapter.
- User Nodes have stable Host-provisioned Nostr identity records.
- Host can publish signed User Node A2A messages through
  `POST /v1/user-nodes/:nodeId/messages`.
- CLI can list User Nodes, inspect projected inbox conversations, and publish
  signed reply/approval/rejection messages as a User Node.
- Studio shows User Node identity and conversation projection as operator
  visibility.
- Host now maps User Nodes to `runtimeKind: "human_interface"` for assignment,
  and tests cover both compatible `human_interface` runners and incompatible
  agent-only runners.
- Host can export portable User Node bootstrap bundles and identity secrets for
  assigned Human Interface Runtimes.
- Joined runners now start a minimal first-party Human Interface Runtime for
  `human_interface` assignments. The runtime serves a basic HTTP User Client,
  exposes `/health`, and forwards message publication through the Host User
  Node gateway. Runners can advertise a configured public URL when the bind
  address is not externally reachable.
- Runner `runtime.status` observations can include `clientUrl`; Host persists
  and projects it, Studio links to it, and CLI projection summaries include it.

The current implementation still does not have the final User Node client:

- The current User Client is a minimal runner-served shell, not a complete
  conversation/approval/artifact-review application.
- Studio is not, and should not become, the actual user-node client.
- The projected User Node conversation surface is summary-level; it is not a
  durable inbox/outbox message-history model.
- User Node approvals still coexist with older operator-side approval mutation
  surfaces.

## Correct Product Boundary

Studio is the graph administrator and operator control room.

Studio should configure, assign, supervise, inspect, and audit graph nodes. It
may display User Node identity, health, active conversations, pending approvals,
and a link to open a running user client. It should not be the primary runtime
UI for the human graph participant.

A User Node is a graph actor. When it is running, it should be backed by a
Human Interface Runtime that exposes a User Client.

The User Client is the human participant surface:

- select the current User Node identity;
- show inbox and conversation history;
- send tasks, questions, answers, and close messages;
- approve or reject agent requests;
- inspect artifact, source-change, and wiki references;
- sign outbound messages as the User Node according to Entangle policy.

CLI remains useful as an admin tool and a development gateway, but it should not
be the only serious human-node interface.

## Target Runtime Model

Node runtime kinds should map this way:

- `nodeKind: "agent"` -> `runtimeKind: "agent_runner"`
- `nodeKind: "service"` -> `runtimeKind: "service_runner"`
- `nodeKind: "user"` -> `runtimeKind: "human_interface"`
- future external nodes -> `runtimeKind: "external_gateway"`

A runner that advertises `human_interface` can receive a User Node assignment.
On assignment it starts a Human Interface Runtime, not an OpenCode agent
runtime.

This is also the placement model for human participants. Multiple User Nodes
can exist in the same graph and each User Node may run on a different runner,
machine, network, or physical location. The Human Interface Runtime resides
where that User Node is assigned, and Host/Studio only observe and control it
through federation protocol and projection state.

The Human Interface Runtime should:

- use the assigned User Node identity/key reference, never Host Authority;
- know its Host Authority trust anchor;
- connect to configured relay profiles;
- read/write through Host and Nostr protocol boundaries;
- expose a local or reachable web client URL;
- emit signed observations for availability, active user session, inbox sync,
  outbound publish attempts, approval decisions, and UI health;
- respect node and edge policy before allowing outbound actions.

## What Must Not Happen

- Do not merge the user participant UI into Studio as the main design.
- Do not make Host Authority sign user messages.
- Do not treat local same-machine URLs as product assumptions.
- Do not make User Node state depend on Host reading runner-local files.
- Do not bypass graph edges or policy just because the user is human.
- Do not let the OpenCode agent engine own Entangle graph coordination.

## Implementation Slices

### Slice A: Documentation And Product Boundary Reset

Update canonical docs so they state:

- Studio is admin/operator only;
- User Client belongs to a Human Interface Runtime;
- CLI is a development/headless gateway, not the final user runtime;
- User Nodes must become assignable to `human_interface` runners.

Tests:

- documentation audit only.

### Slice B: Assignable User Nodes

Change Host runtime-kind inference so `nodeKind: "user"` maps to
`human_interface` instead of throwing.

Status: implemented for the current Host assignment path.

Add assignment tests proving:

- a runner with `human_interface` can receive a User Node assignment;
- a runner without `human_interface` is rejected;
- two User Nodes can be assigned to two different `human_interface` runners;
- User Node assignment does not start an agent/OpenCode runtime;
- assignment records preserve the stable User Node identity boundary.

Impacted modules:

- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `packages/types/src/federation/runner.ts`
- `packages/validator/src/index.ts`

### Slice C: Human Interface Runtime Service

Teach the joined runner materializer/runtime starter to branch by
`assignment.runtimeKind`.

For `human_interface`, start a first-party Human Interface Runtime instead of
the agent service loop.

Status: implemented as a minimal runner-owned HTTP runtime. It starts for
`human_interface` assignments, exposes health, serves a basic User Client shell,
and delegates message publication to Host.

The first version can be simple:

- starts an HTTP server bound to a configurable host/port;
- serves a bundled User Client app or a minimal HTML shell;
- exposes runtime health;
- receives Host/API configuration through the portable bootstrap bundle;
- emits `runtime.status` observations with `clientUrl`. A richer
  `human_interface.status` domain remains a later refinement.

Impacted modules:

- `services/runner/src/join-service.ts`
- `services/runner/src/assignment-materializer.ts`
- new `services/runner/src/human-interface-runtime.ts`
- observation contracts in `packages/types`

### Slice D: User Client App

Add a dedicated user-facing app, likely under `apps/user-client` or
`apps/human-interface`.

Minimum useful UI:

- current User Node identity and connected Host/relay status;
- conversation list from Host projection;
- selected conversation detail;
- message composer for `task.request`, `question`, and `answer`;
- approval response controls for pending approval ids;
- publish result/error feedback;
- refresh and event-stream updates.

This app can initially talk to Host using the same host-client APIs. The
important architectural point is that it is launched as the User Node runtime
and signs through the User Node gateway boundary, not through Studio.

Impacted modules:

- new `apps/user-client`
- `packages/host-client`
- `packages/types/src/host-api/user-nodes.ts`
- `deploy/federated-dev`

### Slice E: User Client Projection In Studio

Studio should show operator visibility for user-node runtimes:

- assigned runner;
- runtime state;
- client endpoint URL;
- last heartbeat;
- active conversation count;
- pending approval count;
- link/button to open the User Client.

Studio still does not become the user chat app.

Status: partially implemented. Studio now renders an open action for projected
runtimes that expose `clientUrl`; richer Human Interface Runtime health and
conversation/approval counts remain open.

Impacted modules:

- `apps/studio/src/App.tsx`
- `apps/studio/src/federation-inspection.ts`
- `packages/types/src/projection/projection.ts`

### Slice F: Durable User Inbox/Outbox

Replace summary-only User Conversation projection with a real User Node read
model:

- inbox message records;
- outbox message records;
- conversation threads;
- parent/child message links;
- delivery status;
- pending approval references;
- artifact/source/wiki refs;
- unread/read state.

Host projection must be built from signed A2A and runner observations, not
runner-local filesystem reads.

Impacted modules:

- `packages/types/src/user-node/*`
- `services/host/src/state.ts`
- `services/host/src/index.ts`
- `packages/host-client`
- `apps/cli`
- `apps/user-client`

### Slice G: Approval And Artifact Review Migration

Make signed User Node messages the canonical path for:

- approval.response;
- rejection;
- artifact/source-change review responses;
- wiki publication approvals when policy requires them.

Older operator-side approval mutation routes may remain temporarily as admin
debug routes but must not be the product path.

### Slice H: Federated Local Demo

Create the first end-to-end runnable proof:

- one Host process;
- one relay;
- one local git backend;
- one runner assigned to an agent node;
- one runner assigned to a User Node;
- User Client opens in browser;
- user sends a task to the agent;
- agent runner receives it;
- Host projection shows the conversation and turn events.

Everything may run on one machine, but the topology must be unaware that it is
local: no shared Host/runner filesystem dependency is allowed in the
federated path.

Then extend the demo to two User Nodes:

- two `human_interface` runners;
- two User Client endpoints;
- both human nodes visible in Studio as separately assigned graph actors;
- each User Client signs as its own stable User Node identity.

### Slice I: Engine Adapter Upgrade

After the graph/user runtime path is usable, deepen the OpenCode integration:

- long-running sessions;
- permission bridge;
- event streaming;
- better cancellation;
- more structured tool/source-change/artifact extraction.

This should remain behind the agent-engine adapter. Entangle still owns graph,
identity, policy, projection, memory/wiki, git/artifact handoff, and
inter-node communication.

## Priority Order

The fastest path to a product the user can test is:

1. Make User Nodes assignable as `human_interface`.
2. Start a minimal Human Interface Runtime from the runner.
3. Add a minimal User Client that can send signed messages.
4. Show the User Client URL in Studio.
5. Add a smoke that runs one agent node and one user node.
6. Add a second-user-node smoke to prove distributed human placement.
7. Then expand inbox history, approvals, artifact review, and OpenCode parity.

This order avoids polishing admin surfaces before the product has the missing
human-node runtime.

## Acceptance Criteria

The realignment is complete when:

- Studio remains an admin/operator control room;
- a User Node can be assigned to a `human_interface` runner;
- multiple User Nodes can be assigned to distinct `human_interface` runners;
- the runner starts a User Client for the assigned User Node;
- outbound user messages are signed as the stable User Node identity;
- User Client can send a task/question/reply to a connected agent node;
- each User Client signs as its own stable User Node identity;
- Host projection shows user-node runtime state and conversations;
- Studio can open the User Client but does not own the chat state;
- the same path works with all processes on one machine without relying on
  local co-location semantics;
- tests cover assignment, runtime start, signed publish, and projection.

## Open Decisions

- Whether the first User Client app should be named `user-client` or
  `human-interface`.
- Whether the first Human Interface Runtime should serve the app from the
  runner process directly or launch a separate child process.
- Whether User Node key custody stays Host-provisioned for the first local demo
  or moves immediately to a runner/local-gateway secret store.

Recommended first choices:

- app name: `apps/user-client`;
- runtime implementation: runner-hosted HTTP server first, separate child
  process later if needed;
- key custody: keep current Host-provisioned dev key refs for the fast demo,
  but preserve the contract so custody can move out of Host.
