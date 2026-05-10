# Entangle Architecture

Entangle is a federated runtime for observable coding-agent organizations.

The graph is the operating model. Nodes represent human users, agent runtimes,
and service participants. Edges define allowed communication and authority.
Runners execute assigned nodes. The Host maintains desired state and projection.
Nostr carries signed coordination events. Git-backed references carry durable
work products.

## Authority

The Host is not a graph node. It is the authoritative control plane:

- owns desired graph state and graph revisions;
- owns the Host Authority key;
- trusts, revokes, and observes runners;
- signs runtime assignments and lifecycle commands;
- maintains package, resource, external principal, and projection state;
- exposes APIs consumed by Studio and CLI.

Host authority comes from key material and state, not from being colocated with
runners.

## Runners

Runners start generic. They do not need preloaded graph context.

The normal runner path is:

1. Load runner join config.
2. Sign `runner.hello`.
3. Wait for Host trust and assignment.
4. Fetch a portable runtime bootstrap bundle.
5. Materialize local node state.
6. Start an `agent_runner`, `human_interface`, service, or gateway runtime.
7. Emit signed heartbeats, receipts, and observations.

The compatibility `runtime-context` startup mode remains a debug/local adapter
path. It is not the canonical distributed architecture.

## Node Kinds

An Entangle node is an actor in the graph. It is not always an autonomous
coding agent.

Current runtime kinds include:

- `agent_runner`: a coding or task agent backed by an engine adapter.
- `human_interface`: a User Node runtime exposing a User Client.
- service or external gateway shapes as future/runtime-specialized profiles.

Agent nodes may use OpenCode, external process, or external HTTP engine
profiles. The engine is replaceable; Entangle owns identity, policy, routing,
memory, artifacts, approvals, and projection around it.

User Nodes have stable identities and sign user intent: tasks, replies,
approvals, source reviews, read state, and participant requests.

## Communication

Entangle uses separate protocol domains:

- `entangle.control.v1`: Host-to-runner assignments and commands.
- `entangle.observe.v1`: runner-to-Host observations, heartbeats, and receipts.
- `entangle.a2a.v1`: node-to-node and user-to-agent coordination messages.

Nostr carries bounded signed intent and evidence. It does not carry private
keys, workspaces, repositories, large artifacts, full logs, Host databases, or
model caches.

## Artifacts And Memory

Messages coordinate work. Artifacts carry work.

The current first artifact backend is git. Runners publish source history,
reports, source-change evidence, wiki updates, and handoff artifacts as refs
with hashes and locator metadata. Host and clients inspect projected refs and
bounded previews rather than treating runner-local files as authoritative truth.

Each node owns structured memory. Current memory includes deterministic task
pages, summaries, ledgers, focused registers, wiki publication paths, and
bounded memory briefs passed into future engine turns.

## Operator Surfaces

Studio is the visual control room for the graph, runners, assignments, runtime
state, sessions, approvals, artifacts, memory, events, and transport health.

CLI is the scriptable operator and User Node surface. It talks to Host, not
directly to runners during normal operation.

User Client is the participant UI for a running User Node. It is served by the
Human Interface Runtime on the runner assigned to that user node.

## Deployment Shapes

The same runtime supports multiple shapes:

- development on one machine with separate Host, relay, git, runner, Studio,
  and User Client processes or containers;
- distributed proof with Host, runners, relay, git backend, and User Clients on
  different machines or networks;
- production self-hosted deployments with stronger identity, audit retention,
  and policy controls as those capabilities harden.

The first shape is a deployment adapter, not a separate product identity.
