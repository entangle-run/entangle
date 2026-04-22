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

Recommended graph size:

- one user node;
- one entrypoint or supervisor node;
- two or three worker/specialist nodes.

Recommended edge subset:

- `delegates_to`
- `reviews`
- `consults`
- `reports_to`

The graph should be static during the demo except for bounded operator-edited changes if mutation support exists.

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

## 7. Control-plane scope

The hackathon control plane should be intentionally narrow:

- static graph revision for the main flow;
- file-based or explicit operator-applied configuration changes;
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

It should not require:

- a separate full product shell per node;
- heterogeneous engines in the first demo.

## 11. Deployment scope

Recommended services:

- `entangle-studio`
- one or more `entangle-runner` instances or configs
- `strfry`
- `Gitea`

Recommended deployment mode:

- local Docker Compose for the demo environment.

## 12. Demo-critical behaviors

The hackathon runtime should reliably demonstrate:

- user task submission;
- entrypoint acceptance;
- delegation to a worker;
- at least one git-backed artifact creation or handoff;
- review or consultation by another node;
- final session outcome visible in Studio.

## 13. Explicit non-goals for the hackathon profile

Do not require:

- remote node attachment;
- multi-relay routing;
- payment settlement;
- open marketplace governance;
- global trust or reputation;
- production-grade secure sandboxes;
- fully featured control-plane editing UX.

These are product roadmap items, not blockers to proving the architecture.

## 14. Success condition

The hackathon runtime profile is successful if:

- the runtime uses the real core contracts;
- the supported subset is explicit;
- the demo shows real distributed coordination and real artifact flow;
- post-hackathon expansion can happen by widening support, not rewriting foundations.
