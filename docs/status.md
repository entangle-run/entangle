# Entangle Status

Entangle is pre-release. The deterministic runtime proof surface is broad, but
production hardening and live-provider validation are not complete.

Current public release: [v0.1.0-alpha.1](../CHANGELOG.md#v010-alpha1---2026-05-10).

## Implemented Runtime Capabilities

- Host Authority state, status, export/import, and signing helpers.
- Graph, package, catalog, external principal, node, edge, and revision APIs.
- Runner registration, trust, revocation, heartbeat, stale/offline projection,
  and capability-aware assignment.
- Runtime assignment lifecycle with signed Host control events and runner
  receipts.
- Generic runner join flow and portable bootstrap bundles.
- Runner execution for agent runtimes and Human Interface Runtime/User Client.
- Stable User Node identities with signed tasks, replies, approvals, reviews,
  read receipts, and participant requests.
- Projection-backed Host, Studio, CLI, and User Client read models for sessions,
  turns, approvals, artifacts, source changes, wiki refs, command receipts, and
  runtime state.
- OpenCode server, external process, and external HTTP engine profile support.
- Git-backed source-history, artifact, wiki publication, restore, reconcile,
  diff, preview, and target visibility paths.
- Deterministic memory maintenance, memory briefs, ledgers, and focused runtime
  context for future turns.
- Development deployment profile with Host, relay, Gitea, Studio, and runner
  images.

## Deterministically Proven

- Same-process and live-relay federated control/observe behavior.
- Joined agent and User Node runners with separate state roots.
- User Client conversation, approval, source review, wiki, and artifact flows.
- Fake OpenCode attached-server permission bridge and session continuity.
- Fake OpenAI-compatible provider and scripted provider behavior.
- Fake external HTTP engine behavior.
- Distributed proof-kit generation, graph preflight, graph bootstrap, runner
  readiness waits, verifier profiles, and generated script fallbacks.
- Docker service-volume export/import roundtrips when Docker is available.

## Manual Validation Still Required

- Real OpenCode execution with real model-provider credentials.
- Real model-generated coding task that produces source changes, commit/artifact
  evidence, and human review.
- Physical or infrastructure-backed multi-machine proof with Host, runners,
  relay, git backend, and User Client surfaces on separate machines/networks.
- Long-running non-disposable deployment lifecycle: upgrades, backups, restores,
  repairs, and service-volume migration under realistic operator conditions.

## High-Value Remaining Work

- Production identity and authorization beyond bootstrap operator-token records.
- Policy-backed permission sources and durable operator principals.
- External audit retention and export beyond the current Host-verifiable chain
  and audit bundle.
- Richer collaborative wiki merge and conflict resolution workflows.
- Richer delegated-session semantics, reassignment workflows, and automated
  repair behavior.
- Broader artifact backend replication and repository lifecycle management.
- Website and public docs kept continuously aligned with real verified status.

## Product Claim Discipline

Public surfaces may say:

- Entangle is a federated runtime for observable coding-agent organizations.
- Entangle has a strong deterministic development proof surface.
- Same-machine deployment is a development adapter for the federated model.

Public surfaces must not claim:

- production readiness;
- completed live-provider validation;
- a local-only product identity;
- guaranteed multi-machine production operation without the remaining manual
  proof and hardening work.
