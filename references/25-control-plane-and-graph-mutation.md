# Control Plane and Graph Mutation

This document defines the control plane for Entangle: who is allowed to change graph structure, node bindings, policies, and deployment-relevant state, and how those changes should relate to the running data plane.

## Design rule

Entangle must distinguish between:

- the runtime data plane, where nodes exchange messages and artifacts;
- the control plane, where topology and governance are managed.

The data plane executes work.
The control plane governs what execution is allowed.

## 1. Why the control plane matters

Without an explicit control plane, the system becomes ambiguous about:

- who owns the graph;
- who can add or remove nodes;
- who can change policies;
- whether agents may mutate topology;
- when graph changes take effect for active sessions.

That ambiguity is unacceptable for a serious product.

## 2. Control-plane actors

The first serious version should recognize at least these authority roles conceptually.

### Graph owner

The primary authority over the graph.

Typical powers:

- create graph;
- approve major topology changes;
- assign control roles;
- set default policies.

### Graph administrator

A delegated operator for topology and policy maintenance.

Typical powers:

- add or remove node bindings;
- edit edge policies;
- enable or disable edges;
- manage entrypoints.

### Local host controller

The concrete local control-plane actor that applies graph revisions and manages
runtime lifecycle on one machine.

Typical powers:

- materialize validated node workspaces;
- start, stop, restart, and remove node runtimes;
- reconcile desired graph state with observed local runtime state;
- expose runtime and admission status back to Studio.

### Node operator

The actor responsible for a specific node instance or runtime deployment.

Typical powers:

- update local node bindings;
- rotate node keys or credentials through safe procedures;
- manage node-local runtime state;
- update package source used by that node.

### Approval authority

An actor allowed to approve controlled transitions.

This may overlap with:

- graph owner;
- graph admin;
- specific supervisory nodes;
- future external controller identities.

### Studio user

The human or client acting through Entangle Studio.

This role may overlap with a graph user node, but the control plane should not assume all Studio users are graph owners.

## 3. Controlled objects

The control plane governs at least these objects.

### Graph objects

- graph metadata;
- graph owner metadata;
- entrypoints;
- policy profiles.

### Node objects

- node membership;
- node binding metadata;
- package source descriptors;
- runtime profile assignment;
- trust or local labels.

### Edge objects

- relation type;
- initiator policy;
- transport policy;
- message policy;
- approval policy;
- enabled/throttled/disabled state.

### Deployment objects

- relay assignments;
- secret bindings by reference;
- artifact backend assignments;
- service topology bindings.
- local runtime instance records;
- host-managed node lifecycle state.

## 4. Mutation classes

Graph mutation should be categorized, because different mutations carry different risk.

### Class A: metadata mutation

Examples:

- edit graph description;
- rename display labels;
- update human-facing docs.

Usually low risk.

### Class B: policy mutation

Examples:

- adjust approval policy;
- change message policy;
- throttle or disable an edge;
- change transport policy.

Medium to high risk.

### Class C: topology mutation

Examples:

- add node;
- remove node;
- add edge;
- remove edge;
- change entrypoint membership.

High risk.

### Class D: identity or binding mutation

Examples:

- rotate node signing identity;
- change package source;
- change node kind;
- change artifact backend profile.

High risk and often deployment-sensitive.

## 5. Graph versioning model

Control-plane mutations should produce explicit graph versions or snapshots.

The system should not rely on invisible mutable in-place topology edits as the only truth.

Recommended model:

- every committed control-plane mutation produces a new graph revision id or version stamp;
- sessions bind to a graph snapshot or revision at start time;
- active sessions do not silently reinterpret themselves against a different topology.

The current implementation now persists typed graph revision records under the
host desired-state root and exposes revision-history inspection through the host
API, shared host client, and CLI.

## 6. Session interaction with graph mutations

Graph mutations and sessions must interact predictably.

### Rule 1

An active session should run against the graph snapshot it started with unless an explicit runtime migration mechanism is invoked.

### Rule 2

Disabling a node or edge during an active session should have an explicit effect:

- allow graceful completion;
- freeze affected conversations;
- cancel affected paths;
- or force a fail/stop outcome.

The control plane must choose, not the runtime by accident.

### Rule 3

New sessions should use the latest valid graph revision unless pinned otherwise.

## 7. Node admission model

Adding a node to a graph is not just copying files.

Node admission should include:

- package validation;
- binding validation;
- identity validation;
- policy compatibility checks;
- transport feasibility checks;
- artifact backend compatibility;
- explicit control-plane approval when required.

## 8. Remote node attachment

The architecture should support remote nodes conceptually, even if the hackathon build implements only local nodes.

### Remote node attachment should include

- remote identity verification;
- declared capability and policy metadata;
- trust decision by the local graph owner or admin;
- transport compatibility;
- artifact backend compatibility;
- explicit edge creation in the local graph.

Remote nodes should not become graph members by accidental discovery alone.

## 9. Who can mutate what

Recommended default authority model:

| Object / action | Owner | Graph admin | Node operator | Approval authority |
| --- | --- | --- | --- | --- |
| Edit graph metadata | yes | yes | no | no |
| Add/remove entrypoint | yes | yes | no | no |
| Add/remove node membership | yes | yes | limited/no | no |
| Edit node-local binding | yes | yes | yes for owned node | no |
| Rotate node deployment secret refs | yes | yes | yes for owned node | no |
| Add/remove edge | yes | yes | no | no |
| Tighten edge policy | yes | yes | no | maybe for approval-related parts |
| Widen edge policy | yes | usually yes with stronger governance | no | no |
| Approve transition | maybe | maybe | no unless delegated | yes |

The exact model may later become more expressive, but this baseline should be explicit now.

## 10. Data-plane self-mutation

Agents should not be assumed to have arbitrary power to mutate topology.

Recommended baseline:

- agents may propose topology or policy changes as artifacts or control requests;
- agents may not directly mutate graph truth in the first serious version unless an explicit control-plane policy authorizes a narrow mutation path.

This keeps the data plane from silently rewriting its own rules.

## 11. Mutation workflow

The first serious mutation workflow should look like this:

1. proposed change is authored through Studio, config files, or future control API;
2. validator checks structural, semantic, and environment impact;
3. authorized control actor approves or rejects when required;
4. graph revision is produced;
5. the host refreshes deployment or runtime bindings where necessary;
6. observability surfaces record the mutation outcome.

## 12. Policy widening versus policy narrowing

This distinction matters.

### Policy narrowing

Examples:

- disabling an edge;
- requiring more approval;
- reducing allowed message classes.

This is generally safer.

### Policy widening

Examples:

- allowing new message classes;
- changing initiator policy from `source_only` to `bidirectional`;
- lowering approval requirements.

This is riskier and should be treated as a stronger control-plane change.

## 13. Mutation observability

The system should preserve a clear history of:

- who proposed a mutation;
- who authorized it;
- which graph revision it produced;
- which sessions were affected.

This history should not depend on chat memory or operator recollection.

## 14. Studio responsibilities

Entangle Studio should eventually provide a control-plane surface for:

- graph visualization;
- node inspection;
- edge policy inspection;
- bounded graph editing;
- node admission and lifecycle controls;
- mutation review and apply flows.

It should not fake control-plane behavior that does not exist in the runtime and validator stack.

## 15. Hackathon profile

The hackathon build should keep the control plane intentionally narrow but real:

- graph changes applied through the same host-mediated path that the final system will use;
- bounded Studio flows for local node admission and edge editing are acceptable and desirable;
- no autonomous topology mutation by agents;
- no hidden client-side graph truth;
- sessions run against a static graph snapshot once started.

This is acceptable because it constrains the active feature surface without corrupting the final control-plane architecture.

## 16. Rejected anti-patterns

The control plane should reject:

- invisible in-place graph mutations with no revision trace;
- agent-driven topology changes with no explicit governance path;
- mixing runtime message traffic with control-plane truth without clear boundaries;
- silently reinterpreting active sessions against a new topology revision;
- letting node-local package files become the source of truth for graph structure.
