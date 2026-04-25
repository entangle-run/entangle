# Shared Resource Inventory Presentation Slice

## Purpose

Keep package-source and external-principal inventory vocabulary consistent
between Studio and the headless CLI while preserving the host as the only owner
of admitted resources and active graph truth.

Before this slice, Studio owned local presentation helpers for package-source
rows, external-principal rows, and active graph reference summaries. The CLI
could list and inspect the same host-backed resources, but only as raw JSON.

## Implemented changes

- Added shared resource-inventory helpers to `packages/host-client` for:
  - package-source sorting, labels, details, active-reference collection, and
    reference summaries;
  - external-principal sorting, labels, details, effective active-reference
    collection, and reference summaries.
- Converted Studio package-source and external-principal helper modules into
  thin local boundaries over the shared host-client helpers while preserving
  Studio-only admission draft logic locally.
- Added CLI summary projections for package sources and external principals.
- Added compact `--summary` output to:
  - `host package-sources list`;
  - `host package-sources get <packageSourceId>`;
  - `host external-principals list`;
  - `host external-principals get <principalId>`.

## Boundary decision

This slice deliberately avoids host API changes.

The CLI fetches the active graph only when `--summary` is requested so it can
include the same active-reference and deletion-safety signals that Studio
already shows. Raw list/detail commands continue to return the host response
unchanged.

## Testing

Added focused coverage for:

- shared package-source and external-principal sorting, formatting, and
  active-reference helpers in `packages/host-client`;
- CLI resource-inventory summary projection;
- continued Studio helper behavior through the existing re-exported tests.

## Follow-on work

The remaining client-alignment opportunities are now less about inventory
presentation and more about deeper operational workflows: richer graph changes
from headless automation, production authorization policy, and delegated
session diagnostics.
