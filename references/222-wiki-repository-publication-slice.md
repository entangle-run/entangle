# Wiki Repository Publication Slice

Date: 2026-04-26.

## Purpose

This slice advances Entangle Local B4/B5 by giving each node's runner-owned
wiki repository a host-mediated publication path.

The runner still owns `memory/wiki` writes and the local `wiki-repository`
snapshot. The host now publishes a clean `wiki-repository` HEAD as a git-backed
runtime artifact so node memory can be shared, backed up, inspected, and moved
through the same artifact substrate as other runtime work.

## Entry Audit

The audit read the mandatory repository state files:

- `README.md`;
- `resources/README.md`;
- `wiki/overview.md`;
- `wiki/index.md`;
- `wiki/log.md`;
- `references/180-local-ga-product-truth-audit.md`;
- `references/189-entangle-local-completion-plan.md`;
- `references/210-wiki-repository-sync-slice.md`;
- `references/211-local-doctor-wiki-repository-health-slice.md`;
- `references/221-source-history-replay-slice.md`.

The implementation audit inspected:

- host runtime context, artifact, source-history publication, and event state
  helpers;
- host API runtime routes;
- shared host-client runtime/event/trace presentation;
- CLI runtime command layout;
- Studio selected-runtime refresh, memory, artifact, and trace panels;
- runner wiki repository sync behavior and local doctor wiki health checks.

## Implemented Behavior

The host now exposes a node-scoped wiki repository publication surface:

- `GET /v1/runtimes/:nodeId/wiki-repository/publications`;
- `POST /v1/runtimes/:nodeId/wiki-repository/publish`.

Publication requires a configured, initialized, clean wiki repository with a
valid HEAD commit under the node workspace. The host materializes that wiki
commit into the node artifact workspace as a git commit artifact on:

```text
<nodeId>/wiki-repository/entangle-wiki
```

The publication flow records:

- a durable `RuntimeWikiRepositoryPublicationRecord`;
- a normal `ArtifactRecord` with `artifactKind: "knowledge_summary"`;
- resolved git target metadata;
- publication state and remote metadata;
- a typed `wiki_repository.published` host event.

The shared host client now lists and publishes wiki repository snapshots. The
CLI exposes:

- `entangle host runtimes wiki-publications <nodeId>`;
- `entangle host runtimes wiki-publish <nodeId>`.

Studio now refreshes selected runtime state when `wiki_repository.published`
events arrive, shows recent wiki repository publication attempts in Runtime
Memory, and can publish the selected node's wiki repository through the same
host boundary.

## Boundary Decisions

Engines do not publish the wiki repository directly. They can affect memory
only through the existing runner-mediated memory and action paths.

The host rejects dirty wiki repositories instead of committing them. A runner
turn or a future repair/sync operation must produce the clean snapshot before
publication.

The publication artifact is a portable git-backed artifact. It does not turn
the wiki repository into the primary memory store and does not overwrite
`memory/wiki` or any source workspace.

The first implementation follows source-history publication semantics:
already-published wiki commits are not republished, failed attempts require an
explicit retry, and target selection is resolved through the runtime git target
contract.

## Remaining Work

This slice does not implement:

- restoring a published wiki repository artifact back into a node wiki;
- promoting a restored wiki artifact into active `memory/wiki`;
- merge/reconcile behavior between divergent wiki histories;
- multi-target replication or fallback publication policy;
- richer Studio wiki repository history/diff views.

Those remain Local completion work after the basic publication path is stable.

## Verification

Focused verification performed during implementation:

```bash
pnpm --filter @entangle/types typecheck
pnpm --filter @entangle/host-client typecheck
pnpm --filter @entangle/cli typecheck
pnpm --filter @entangle/host typecheck
pnpm --filter @entangle/studio typecheck
pnpm --filter @entangle/types test
pnpm --filter @entangle/host-client test
pnpm --filter @entangle/cli test
pnpm --filter @entangle/studio test
pnpm --filter @entangle/host test
```

Full repository verification is recorded in the implementation log entry for
this slice.
