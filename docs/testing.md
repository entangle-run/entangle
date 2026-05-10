# Testing And Verification

Use the smallest verification that proves the change, then widen when shared
contracts, Host/runner behavior, deployment, or user surfaces changed.

## Standard Gates

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm verify
```

`pnpm verify` is the full default gate.

## Contract Changes

When touching `packages/types`:

```bash
pnpm --filter @entangle/types test
pnpm --filter @entangle/validator test
pnpm typecheck
```

When touching semantic validation:

```bash
pnpm --filter @entangle/validator test
```

## Host And Runner Changes

Host:

```bash
pnpm --filter @entangle/host test
pnpm --filter @entangle/host lint
```

Runner:

```bash
pnpm --filter @entangle/runner test
pnpm --filter @entangle/runner lint
```

Shared Host client:

```bash
pnpm --filter @entangle/host-client test
```

## Studio, User Client, And CLI

Studio:

```bash
pnpm --filter @entangle/studio test
pnpm --filter @entangle/studio typecheck
pnpm --filter @entangle/studio build
```

User Client:

```bash
pnpm --filter @entangle/user-client test
pnpm --filter @entangle/user-client typecheck
pnpm --filter @entangle/user-client build
```

CLI:

```bash
pnpm --filter @entangle/cli test
pnpm --filter @entangle/cli typecheck
```

## Smoke Tests

Product naming:

```bash
pnpm ops:check-product-naming
```

Development profile:

```bash
pnpm ops:check-federated-dev:strict
pnpm ops:smoke-federated-dev
pnpm ops:smoke-federated-dev:disposable:runtime
```

Process runner:

```bash
pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777
pnpm ops:smoke-federated-process-runner:fake-opencode
pnpm ops:smoke-federated-process-runner:fake-external-http
```

Distributed proof tooling:

```bash
pnpm ops:smoke-distributed-proof-tools
```

Deployment service volumes:

```bash
pnpm ops:smoke-deployment-service-volume-tools
pnpm ops:smoke-deployment-service-volume-roundtrip:required
```

## Manual Validation

The following are still operator/manual validation paths:

- real OpenCode connected to real model-provider credentials;
- real coding task producing a human-reviewed source change;
- physical or infrastructure-backed multi-machine proof;
- long-lived non-disposable upgrade, backup, restore, and repair exercises.

Record manual validation evidence in `wiki/log.md` or a dedicated reference
record when it changes the project baseline.
