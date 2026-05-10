# References

`references/` is Entangle's technical archive and implementation ledger.

Use it for detailed design records, historical context, slice-level
implementation notes, and audit trails. Do not use it as the first onboarding
path. Start with `README.md` and `docs/` instead.

## Current Canonical Pack

The active architecture baseline is the federated runtime pivot pack:

- [221-federated-runtime-redesign-index.md](221-federated-runtime-redesign-index.md)
- [222-current-state-codebase-audit.md](222-current-state-codebase-audit.md)
- [223-federated-product-vision.md](223-federated-product-vision.md)
- [224-entity-model-and-authority-boundaries.md](224-entity-model-and-authority-boundaries.md)
- [225-host-runner-federation-spec.md](225-host-runner-federation-spec.md)
- [226-user-node-and-human-interface-runtime-spec.md](226-user-node-and-human-interface-runtime-spec.md)
- [227-nostr-event-fabric-spec.md](227-nostr-event-fabric-spec.md)
- [228-distributed-state-projection-spec.md](228-distributed-state-projection-spec.md)
- [229-studio-cli-operator-and-user-surfaces-spec.md](229-studio-cli-operator-and-user-surfaces-spec.md)
- [230-migration-from-local-assumptions-plan.md](230-migration-from-local-assumptions-plan.md)
- [231-implementation-slices-and-verification-plan.md](231-implementation-slices-and-verification-plan.md)

These documents supersede earlier local-only product framing. Earlier files are
historical unless a current doc explicitly points to them as still normative.

## Core Architecture Records

The original conceptual corpus remains useful for background:

- [00-executive-summary.md](00-executive-summary.md)
- [01-vision-and-philosophy.md](01-vision-and-philosophy.md)
- [02-product-definition.md](02-product-definition.md)
- [03-system-architecture.md](03-system-architecture.md)
- [04-agent-model.md](04-agent-model.md)
- [05-graph-model.md](05-graph-model.md)
- [06-communication-and-protocol.md](06-communication-and-protocol.md)
- [07-storage-memory-and-artifacts.md](07-storage-memory-and-artifacts.md)
- [08-runner-and-execution-model.md](08-runner-and-execution-model.md)
- [12-canonical-type-system.md](12-canonical-type-system.md)
- [13-runner-lifecycle-spec.md](13-runner-lifecycle-spec.md)
- [14-entangle-a2a-v1.md](14-entangle-a2a-v1.md)
- [19-core-contract-invariants.md](19-core-contract-invariants.md)
- [23-edge-semantics-and-policy-matrix.md](23-edge-semantics-and-policy-matrix.md)
- [24-artifact-backend-specification.md](24-artifact-backend-specification.md)
- [31-host-control-plane-and-runtime-orchestration.md](31-host-control-plane-and-runtime-orchestration.md)
- [32-client-surfaces-and-headless-operation.md](32-client-surfaces-and-headless-operation.md)
- [33-repository-and-package-topology.md](33-repository-and-package-topology.md)
- [34-identity-credentials-and-signing-boundaries.md](34-identity-credentials-and-signing-boundaries.md)
- [35-external-resource-catalog-and-bindings.md](35-external-resource-catalog-and-bindings.md)
- [36-host-api-and-reconciliation-spec.md](36-host-api-and-reconciliation-spec.md)
- [37-effective-bindings-and-runtime-context-spec.md](37-effective-bindings-and-runtime-context-spec.md)
- [38-engine-adapter-and-model-execution-spec.md](38-engine-adapter-and-model-execution-spec.md)
- [41-agent-engine-boundary-and-reuse-policy.md](41-agent-engine-boundary-and-reuse-policy.md)
- [42-host-state-layout-and-persistence-spec.md](42-host-state-layout-and-persistence-spec.md)
- [44-schema-ownership-and-contract-generation-spec.md](44-schema-ownership-and-contract-generation-spec.md)
- [45-quality-engineering-and-ci-baseline.md](45-quality-engineering-and-ci-baseline.md)

Files with hackathon, local, or early release language are retained only as
historical records unless superseding documents say otherwise.

## Implementation Ledger

Files numbered `232` and later are slice records. They explain what changed,
why it changed, which modules were touched, which tests were run, and how the
change affected the federated runtime pivot.

Recent high-level implementation areas include:

- Host Authority, runner registry, control/observe transport, runtime
  assignments, and generic runner bootstrap;
- User Node identity, Human Interface Runtime, User Client, signed user
  messages, approvals, source reviews, and participant requests;
- projection-backed Host, Studio, CLI, and User Client read models;
- OpenCode, fake OpenCode, fake OpenAI-compatible provider, external process,
  and external HTTP engine paths;
- runner-owned git artifact, source-history, source-change, wiki publication,
  restore, reconcile, diff, and preview workflows;
- host-event integrity, audit bundles, bootstrap operator-token hardening, and
  deployment diagnostics;
- distributed proof-kit generation, profile validation, graph preflight,
  graph bootstrap, runner readiness waits, and generated script fallbacks.

Use `git log --oneline` and `wiki/log.md` for chronological navigation.

## Superseded Product Framing

Entangle is the product. Same-machine operation is a deployment adapter for the
federated architecture, not a separate product line.

When older records mention local-only delivery, hackathon scope, or local
release trains, read them as history. Do not copy that framing into active
README, `docs/`, website, CLI help, Studio labels, or current operator
guidance.

## Adding New Reference Records

Add a new reference record when a substantial implementation slice changes
contracts, runtime behavior, deployment behavior, security posture, or public
documentation baseline.

A good record includes:

- current repo truth;
- target model;
- impacted modules/files;
- concrete changes;
- verification commands;
- migration/compatibility notes;
- risks and mitigations.

Keep product-facing summaries in `docs/`; keep detailed evidence here.
