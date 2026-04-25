# L1 Local Operator Baseline

Status: active release closure, not tagged.

Intended tag: `v0.1-local-operator-baseline`.

## Release Control

The historical R1 ledger remains the authoritative checklist for this release:

- [`references/177-r1-local-operator-release-ledger.md`](../../references/177-r1-local-operator-release-ledger.md)

This packet exists to give the monorepo an explicit release area without
duplicating the canonical ledger.

## Current Scope

L1 proves that Entangle can be presented as a serious local graph-native
operator runtime:

- host control plane over local state;
- per-node runner;
- local Nostr relay transport;
- git-backed artifact publish and retrieve;
- graph-bound handoff;
- approval request and response handling;
- Studio and CLI inspection over host truth;
- local preflight and smoke commands.

## Tag Blockers

The release must not be tagged until:

- final release notes exist;
- `pnpm verify` passes for the final release batch;
- `pnpm ops:check-local:strict` passes or records a concrete local blocker;
- the strongest feasible local smoke passes or is explicitly deferred with a
  release-note reason;
- README, wiki overview, roadmap, release packet, and ledger agree;
- `git status --short` is clean or contains only explicitly deferred user work.
