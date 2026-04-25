# R1 Local Operator Release Ledger

## Purpose

This ledger is the release-truth companion to the definitive three-product
delivery roadmap.

It captures what must be true before Entangle can honestly be described as
`v0.1-local-operator-baseline`, and it separates that local baseline from the
later production releases.

The release packet is
[`../releases/local/l1-local-operator-baseline.md`](../releases/local/l1-local-operator-baseline.md).

## Release Position

Current release target:

- release: `R1`;
- name: `Local Operator Baseline`;
- tag: `v0.1-local-operator-baseline`;
- status: released;
- product claim: local graph-native operator runtime;
- production claim: none.

R1 is allowed to prove architecture locally. It is not allowed to imply
production tenancy, production authorization, production sandboxing, paid
customer readiness, or compliance readiness.

## Current Evidence

The current repository already has evidence for the core R1 promise:

- host control-plane service with persistent local state;
- per-node runner service;
- local Nostr transport through `strfry`;
- git-backed artifact publication and retrieval through the local profile;
- provider-backed model execution through the internal engine boundary;
- host read surfaces for runtime, session, turn, approval, artifact, recovery,
  graph, node, edge, package-source, principal, status, and events;
- Studio and CLI consuming the same host boundary;
- Docker-backed local runtime lifecycle and disposable runtime smoke;
- canonical TypeScript contracts and semantic validators;
- `pnpm verify` passing on the current workspace.

## R1 Required Checklist

### Contracts

- [x] Package manifest contract exists.
- [x] Graph spec contract exists.
- [x] Effective runtime context contract exists.
- [x] A2A message contract exists.
- [x] Runner session, conversation, approval, artifact, and turn records exist.
- [x] Approval metadata is semantically validated.
- [x] Approval response policies are semantically validated.
- [x] Release note points to the exact accepted contract baseline.

### Host

- [x] Host status surface exists.
- [x] Host event listing and WebSocket stream exist.
- [x] Graph revision inspection exists.
- [x] Node and edge resource mutation surfaces exist.
- [x] Package-source admission and deletion exist.
- [x] External-principal binding and deletion exist.
- [x] Runtime lifecycle mutation exists.
- [x] Runtime recovery policy and history exist.
- [x] Session inspection exists.
- [x] Runtime artifact, approval, and turn inspection exist.
- [x] Release note identifies local-file state as an R1-local profile, not a
  production persistence model.

### Runner

- [x] Runner starts from injected runtime context.
- [x] Runner validates inbound A2A payloads before lifecycle mutation.
- [x] Runner handles executable task requests and handoffs.
- [x] Runner handles approval request and response messages.
- [x] Runner guards malformed approval messages and orphan approval responses.
- [x] Runner materializes git-backed artifacts.
- [x] Runner retrieves published git-backed handoffs.
- [x] Runner maintains deterministic and model-guided memory summaries.
- [x] Release note identifies remaining delegated-session limitations.

### Studio

- [x] Studio renders host-backed graph topology.
- [x] Studio inspects selected runtime status, trace, artifacts, sessions,
  approvals, turns, recovery, and graph revisions.
- [x] Studio performs graph, node, edge, package-source, principal, lifecycle,
  and recovery-policy mutations through host APIs.
- [x] Release note describes Studio as an operator surface, not an end-user SaaS
  product.

### CLI

- [x] CLI inspects host status, events, graph, package sources, principals,
  runtimes, sessions, artifacts, approvals, and turns.
- [x] CLI supports summary output for key operator views.
- [x] CLI supports dry-run for key mutation commands.
- [x] CLI supports package scaffold initialization.
- [x] Release note includes the recommended headless smoke commands.

### Deployment

- [x] Local Compose profile exists.
- [x] Strict local preflight exists.
- [x] Active local smoke exists.
- [x] Disposable local smoke exists.
- [x] Disposable runtime smoke exists.
- [x] Final R1 closure reruns the strongest smoke that local Docker conditions
  allow.

## Required R1 Verification

Required before tagging:

```bash
pnpm verify
pnpm ops:check-local:strict
```

Required when Docker, relay, Gitea, runtime lifecycle, package admission, or
artifact handoff behavior changed since the last smoke:

```bash
pnpm ops:smoke-local:disposable
pnpm ops:smoke-local:disposable:runtime
```

The smoke commands may be skipped only with an explicit release-note statement
that records the local environmental blocker.

## Final Release-Time Verification

The R1/L1 release closure on 2026-04-25 reran the portable verification,
build, local preflight, active smoke, disposable smoke, and disposable runtime
smoke gates:

- `pnpm install --frozen-lockfile`: passed;
- `git diff --check`: passed;
- `pnpm verify`: passed;
- `pnpm lint`: passed;
- `pnpm typecheck`: passed;
- `pnpm test`: passed;
- `pnpm build`: passed after one manually stopped transient local
  Vite/Rolldown idle run and a successful immediate retry;
- `pnpm ops:check-local:strict`: passed with Docker daemon access;
- `pnpm ops:smoke-local:disposable:runtime`: passed;
- `pnpm ops:smoke-local:disposable --skip-build --keep-running`: passed;
- `pnpm ops:smoke-local`: passed against the kept-running local profile.

The disposable runtime smoke proved the active local profile smoke, two
host-managed runners, restart event evidence, NIP-59 task intake,
provider-backed OpenAI-compatible execution against a local model stub,
git-backed artifact publication, downstream artifact retrieval by
`ArtifactRef`, runtime stops, and teardown with volumes.

This evidence, combined with the final release packet in
`releases/local/l1-local-operator-baseline.md`, satisfies the R1/L1 release
closure gate.

## Known R1 Non-Goals

R1 must not claim:

- PostgreSQL-backed production persistence;
- multi-tenant workspace isolation;
- production-grade user authentication;
- production RBAC or ABAC;
- SSO, SAML, SCIM, or enterprise identity;
- object-storage artifact service;
- production scheduler or sandbox;
- billing, plan limits, or paid-customer onboarding;
- SOC 2, GDPR, HIPAA, or other compliance readiness;
- Kubernetes or self-host production install maturity.

## R1 Release Note Requirements

The R1 release note must include:

- exact release name and intended tag;
- supported local operator workflows;
- proof commands and their results;
- Docker and local-tooling prerequisites;
- clear non-goals;
- known limitations;
- upgrade notes for local state;
- rollback guidance for local operator state;
- next release target: `L1.5 Local Operator Preview`.

## R1 Exit Decision

R1 was accepted for tagging after these conditions were met:

- `git status --short` was clean or contained only release-closure edits before
  the final release commit;
- `pnpm verify` passed;
- local preflight passed;
- the strongest feasible local smoke passed;
- README, wiki overview, roadmap, release packet, and this ledger agree;
- the release note exists and does not overclaim production readiness.

## Reconsideration Notes

Current implementation evidence does not invalidate the redesigned product
direction. It does narrow the immediate milestone: Entangle should close as a
local operator baseline before production foundation work begins.

The next highest-value release after R1 is now `L1.5 Local Operator Preview`,
not production foundation. The project should finish Entangle Local as the
first final product before starting Cloud production foundation work.
