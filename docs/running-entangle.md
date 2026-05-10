# Running Entangle

This guide focuses on repeatable development and proof paths.

## Install

```bash
pnpm install --frozen-lockfile
```

If global `pnpm` is unavailable, use:

```bash
npm exec --yes pnpm@10.18.3 -- install --frozen-lockfile
```

## Baseline Verification

```bash
pnpm verify
pnpm ops:check-product-naming
pnpm ops:check-federated-dev:strict
```

`pnpm verify` runs lint, typecheck, and tests. The product naming gate prevents
obsolete local-product naming from returning to active surfaces.

## Fast User Node Runtime Demo

Start the relay:

```bash
docker compose -f deploy/federated-dev/compose/docker-compose.federated-dev.yml up -d strfry
```

Run the keep-running demo:

```bash
pnpm ops:demo-user-node-runtime
```

The command starts:

- Host;
- one joined agent runner;
- two joined User Node runners;
- User Client endpoints for the human nodes;
- signed User Node messages through the relay;
- Host projection over runner-signed observations.

It prints the Host URL, operator token, User Client URLs, and a Studio command.

To launch Studio automatically:

```bash
pnpm ops:demo-user-node-runtime:studio
```

To exercise the attached fake OpenCode server path without model credentials:

```bash
pnpm ops:demo-user-node-runtime:fake-opencode
```

## Non-Interactive Process Runner Smokes

Fast signed process-runner proof:

```bash
pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777
```

Attached fake OpenCode proof:

```bash
pnpm ops:smoke-federated-process-runner:fake-opencode
```

External HTTP engine proof:

```bash
pnpm ops:smoke-federated-process-runner:fake-external-http
```

These smokes use deterministic fixtures. They are intended to prove Entangle's
protocol, state, projection, permission, artifact, and UI plumbing without real
model credentials.

## Deterministic Provider Fixtures

OpenAI-compatible fixture:

```bash
pnpm ops:fake-openai-provider
pnpm ops:smoke-fake-openai-provider
```

Fake attached OpenCode server:

```bash
pnpm ops:fake-opencode-server
pnpm ops:smoke-fake-opencode-server
```

Fake external HTTP engine:

```bash
pnpm ops:fake-agent-engine-http
pnpm ops:smoke-fake-agent-engine-http
```

## Distributed Proof Kit

Generate a proof kit:

```bash
pnpm ops:distributed-proof-kit -- --output-dir /tmp/entangle-proof
```

The generated kit contains operator scripts, runner configs, verifier scripts,
graph preflight, graph bootstrap, runner readiness waits, optional runner
Compose material, and profile metadata. It is designed so Host and runners do
not need a shared filesystem.

Physical or infrastructure-backed proof execution remains a high-value
hardening area. Use generated proof artifacts as the starting point for
multi-machine validation.

## Same-Machine Development Adapter

The development deployment profile lives at:

```text
deploy/federated-dev/
```

It can run Host, Studio, relay, Gitea, and runner images on one machine while
preserving federated boundaries. Treat it as a development adapter, not a local
product.

## Cleanup

Stop the development stack:

```bash
docker compose -f deploy/federated-dev/compose/docker-compose.federated-dev.yml down
```

Remove service volumes only when you intentionally want to delete runtime,
relay, Gitea, and artifact state:

```bash
docker compose -f deploy/federated-dev/compose/docker-compose.federated-dev.yml down --volumes
```
