# Runner and Execution Model

## Why the runner is the center of gravity

Entangle only becomes real once a node is more than a folder. The `AgentRunner` is what turns:

- an agent package,
- a graph-local binding,
- local secrets,
- Nostr identity,
- memory,
- artifacts,
- and transport subscriptions

into a live actor.

## Responsibilities of the runner

The runner must:

- load the package;
- load graph-local runtime projection;
- mount secrets and key material;
- subscribe to the correct relay surfaces;
- validate sender and relation policy;
- construct the local prompt/context;
- invoke the agent engine;
- expose tools and work substrate;
- perform local git and filesystem operations;
- update the wiki;
- produce and sign outbound messages;
- enforce stop conditions and approval requirements.

## Engine model

The runner should be able to drive a genuinely agentic engine underneath it.

For the first build, the best practical stance is:

- reuse or adapt an OpenCode-like engine where useful;
- keep the runner as the stable system boundary;
- avoid baking one engine's assumptions into the core protocol.

This allows:

- real tool use;
- real file and git work;
- real memory maintenance;
- later engine substitution.

## Containerization

The recommended deployment profile is one runner per node in a container or isolated process environment.

Each runner should mount:

- package volume;
- memory/wiki volume;
- workspace volume;
- secret mount for Nostr key;
- runtime projection config.

This is both practical and future-proof.

## Runtime phases

Suggested lifecycle per incoming message:

1. receive;
2. authenticate and authorize;
3. resolve graph-local policy;
4. build operational context;
5. invoke the agentic engine;
6. update artifacts and memory;
7. compute response decision;
8. emit zero or more outbound messages.

## Hackathon runner profile

The hackathon should implement:

- one runner binary or service;
- multiple per-node configs;
- local package execution only;
- one git backend;
- one wiki backend;
- one simple transport policy profile.

This is already enough to prove the runtime architecture.
