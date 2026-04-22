# Hackathon Runtime Profile

This document defines the concrete runtime subset that the hackathon implementation should support while preserving the full canonical architecture.

It is intentionally narrower than the total model, but it must not distort the model.

## Design rule

The hackathon build should be a restricted operating profile of Entangle, not a separate architecture.

## 1. Scope objective

The hackathon runtime should prove, end to end, that:

- a user node can initiate a session;
- an entrypoint node can activate a runtime subgraph;
- multiple agent nodes can communicate over Nostr;
- real artifact handoff occurs through a durable backend;
- the session is observable in real time;
- the design clearly extends beyond the demo.

## 2. Graph scope

Recommended graph size and shape:

- one user node;
- four to six non-user nodes is a strong target;
- one or two entrypoint or supervisor nodes;
- at least one branch with peer-level collaborators;
- at least one branch with delegation depth greater than one edge.

Recommended edge subset:

- `delegates_to`
- `reviews`
- `consults`
- `reports_to`
- `peer_collaborates_with`

The graph should be static during the demo except for bounded operator-edited changes if mutation support exists.

The key design rule for the hackathon graph is:

> do not demo Entangle as a disguised orchestrator tree if the point is to show graph-native organizational structure.

## 3. Node scope

Supported node kinds for the hackathon should be narrow but real.

Recommended active kinds:

- `user`
- `supervisor`
- `worker`
- `reviewer`
- optionally `service` for a dedicated executor-like node

## 4. Package source scope

Supported package source kinds:

- `local_path`
- optionally `local_archive`

Unsupported source kinds should fail explicitly rather than being normalized into the local model.

## 5. Transport scope

Recommended transport profile:

- one relay service;
- one supported transport mode equivalent to shared bidirectional relay usage;
- private messaging patterns over the chosen Nostr stack;
- no multi-relay routing optimization.

This is the minimum deployment profile, not the canonical model. The full model
must still support per-node relay-profile differences.

## 6. Artifact backend scope

Required:

- `git`
- `wiki`

Optional:

- `local_file`

Not required:

- object stores;
- issue-tracker backends;
- remote registry-backed artifact surfaces.

The hackathon should use one shared git service profile for the active graph,
but the canonical model must still allow multiple named git services in the
deployment catalog.

## 7. Control-plane scope

The hackathon control plane should be intentionally narrow but real:

- one local host service should own applied graph truth and runtime lifecycle;
- bounded Studio flows for local node admission and edge editing are desirable;
- static graph revision for the core happy-path demo is still acceptable;
- no autonomous topology mutation by agents;
- no complex multi-user governance UI required.

## 8. Observability scope

Required:

- session trace;
- active runtime subgraph;
- artifact list;
- node/edge inspection;
- explicit session outcome.

Optional:

- approval views if approvals are exercised in the demo;
- coarse runner phase visibility.

## 9. Approval scope

Approvals are part of the architecture, but the hackathon runtime may support only a minimal subset.

Acceptable profiles:

- no approval paths exercised in the core happy-path demo; or
- one explicit approval gate visible in Studio.

What is not acceptable:

- hiding approval semantics entirely from the model and pretending they do not exist in architecture.

## 10. Engine scope

The hackathon runtime should use:

- one runner implementation;
- one engine adapter;
- per-node isolated state;
- real file/tool/git operations.

It should also use:

- one shared model endpoint profile for the demo deployment.

Recommended first adapter choice:

- `anthropic` when direct Claude access is available

It should not require:

- a separate full product shell per node;
- heterogeneous engines in the first demo.

This is a deployment restriction, not a canonical model restriction. The full
model must still allow different nodes to bind different model endpoint
profiles.

## 11. Deployment scope

Recommended services:

- `entangle-studio`
- `entangle-host`
- `strfry`
- `Gitea`
- one or more `entangle-runner` containers managed by the host

Recommended deployment mode:

- local Docker Compose for the demo environment.

Recommended deployment resources:

- one relay profile shared by all active nodes;
- one git service profile shared by all active nodes;
- one model endpoint profile shared by all active nodes.

## 12. Demo-critical behaviors

The hackathon runtime should reliably demonstrate:

- user task submission;
- entrypoint acceptance through a meaningful organizational surface;
- at least one delegation path through more than one level of the graph;
- at least one peer-level collaboration or consultation path;
- at least one git-backed artifact creation or handoff;
- review or consultation by another node;
- at least one host-mediated local control-plane action through Studio, such as node admission or edge mutation;
- final session outcome visible in Studio.

## 13. Recommended demo topologies

The hackathon should prefer a graph that looks like an organization rather than a flat agent tree.

Two especially good patterns are:

### Pattern A: two departmental leads

- user node at the top;
- two supervisory nodes such as `it-lead` and `marketing-lead`;
- the IT branch contains two peer contributors working at the same level;
- the marketing branch contains a deeper chain where one subordinate delegates further downward.

This demonstrates:

- multiple entrypoint-worthy nodes;
- parallel departments;
- peer collaboration;
- hierarchical depth.

### Pattern B: one visible coordinator with heterogeneous substructure

- one main coordinator or supervisor;
- one branch with two peer workers;
- one branch with a subordinate that itself delegates to another node.

This demonstrates:

- one obvious user-facing coordinator;
- peer collaboration and deeper delegation coexisting in the same graph.

## 14. Explicit non-goals for the hackathon profile

Do not require:

- remote node attachment;
- multi-relay routing;
- payment settlement;
- open marketplace governance;
- global trust or reputation;
- production-grade secure sandboxes;
- fully featured control-plane editing UX.

These are product roadmap items, not blockers to proving the architecture.

## 15. Success condition

The hackathon runtime profile is successful if:

- the runtime uses the real core contracts;
- the supported subset is explicit;
- the demo shows real distributed coordination, real artifact flow, and a visibly non-flat organizational graph;
- post-hackathon expansion can happen by widening support, not rewriting foundations.
