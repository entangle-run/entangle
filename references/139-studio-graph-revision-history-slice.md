# Studio Graph Revision History Slice

## Purpose

Expose persisted applied graph revisions in Studio through the existing
host-owned graph revision read model.

Before this slice, Studio showed the active revision id in host status but did
not let visual operators inspect the revision history already exposed by
`entangle-host`, the shared host client, and the CLI.

## Implemented behavior

- Added Studio helper functions for:
  - newest-first revision sorting;
  - revision list label formatting;
  - applied-at detail formatting;
  - selected revision topology summaries.
- Added graph revision loading through `client.listGraphRevisions()`.
- Added selected revision drilldown through `client.getGraphRevision(revisionId)`.
- Isolated revision-list and revision-detail failures from the broader host
  status panel.
- Added unit coverage for revision sorting and formatting behavior.

## Design notes

Studio remains a host client. It does not keep independent graph history and
does not reconstruct prior topologies from events.

The active graph visualization still renders the currently applied graph. The
revision panel is an audit surface for persisted graph revision records and
their topology snapshots.

## Verification

- `pnpm --filter @entangle/studio lint`
- `pnpm --filter @entangle/studio typecheck`
- `pnpm --filter @entangle/studio test`
