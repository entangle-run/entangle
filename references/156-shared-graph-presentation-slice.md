# Shared Graph Presentation Slice

## Purpose

Keep graph-topology inspection vocabulary consistent across Studio and the
headless CLI without widening the host API or moving graph truth into either
client.

Before this slice, Studio owned local presentation helpers for:

- graph revision ordering, labels, and detail summaries;
- managed-node ordering, labels, and detail summaries;
- graph-edge ordering, labels, and detail summaries.

The CLI could inspect the same host-owned graph, revision, node, and edge
resources, but its useful compact output was concentrated on runtime-centric
surfaces.

## Implemented changes

- Added shared graph presentation helpers to `packages/host-client` for graph
  revisions, managed graph nodes, node inspections, and graph edges.
- Converted Studio graph revision, managed-node, and edge helper modules into
  thin re-export boundaries over the shared host-client presentation helpers.
- Added CLI graph summary projection helpers.
- Added compact `--summary` output to:
  - `host graph get`;
  - `host graph revisions list`;
  - `host graph revisions get <revisionId>`;
  - `host nodes list`;
  - `host nodes get <nodeId>`;
  - `host edges list`.

## Boundary decision

This is a presentation and headless-consumption slice only.

The host remains the owner of:

- active graph truth;
- applied graph revision history;
- applied node inspection records;
- applied edge records;
- validation and mutation semantics.

The shared host client now owns reusable operator vocabulary for those records,
while Studio and the CLI only project host-owned responses for their local UI
or terminal needs.

## Testing

Added focused coverage for:

- shared graph presentation sorting and labels in `packages/host-client`;
- CLI graph, revision, node, and edge summary projections;
- continued Studio consumption through the existing re-exported helper tests.

## Follow-on work

The next similar client-alignment opportunity is package-source and
external-principal inventory presentation. Those surfaces already have useful
Studio deletion-safety helpers, and the CLI still mostly emits raw host
inspection JSON for operator inventory workflows.
