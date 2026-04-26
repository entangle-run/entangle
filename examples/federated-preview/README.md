# Federated Preview Example

This directory contains the canonical Entangle Preview assets.

The runnable preview command is:

```bash
pnpm ops:demo-federated-preview
```

It starts the Local Compose profile, verifies the running local services, runs
the local runtime path through the host, publishes a NIP-59 task through the
local relay, writes a git-backed artifact to local Gitea, and runs a downstream
artifact handoff. The command leaves the Local profile running so Studio and
the CLI can inspect the completed session.

Reset the preview state with:

```bash
pnpm ops:demo-federated-preview:reset
```

## Assets

- `agent-package/` is the package admitted by the preview demo.
- `graph.json` is the canonical Federated Preview graph shape.
- `catalog.model-stub.json` is the model-stub catalog shape used by the demo
  flow after the Local profile is running.

The preview graph includes a user node, planner node, builder node, direct
delegation edges for the runnable task path, a planner-to-builder handoff edge,
and a builder-to-planner review edge. The runtime demo records an explicit
approval-bypass state for the task rather than claiming a polished approval
workflow.
