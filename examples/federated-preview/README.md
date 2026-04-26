# Federated Preview Example

This directory contains the canonical Entangle Preview assets.

The runnable preview command is:

```bash
pnpm ops:demo-federated-preview
```

It starts the Federated dev Compose profile, verifies the running deployment services, runs
the federated dev runtime path through the host, publishes a NIP-59 task through the
development relay, writes a git-backed artifact to development Gitea, and runs a downstream
artifact handoff. The command leaves the Federated dev profile running so Studio and
the CLI can inspect the completed session.

Reset the preview state with:

```bash
pnpm ops:demo-federated-preview:reset
```

## Assets

- `agent-package/` is the package admitted by the preview demo.
- `graph.json` is the canonical Federated Preview graph shape.
- `catalog.model-stub.json` is the model-stub catalog shape used by the demo
  flow after the Federated dev profile is running.

The preview graph includes a user node, planner node, builder node, direct
delegation edges for the runnable task path, a planner-to-builder handoff edge,
and a builder-to-planner review edge. The runtime demo records an explicit
approval-bypass state for the task rather than claiming a polished approval
workflow.
