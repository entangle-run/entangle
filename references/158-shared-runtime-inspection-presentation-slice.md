# Shared Runtime Inspection Presentation Slice

## Purpose

Give headless operators compact runtime-state summaries for the primary
runtime inventory commands while keeping `entangle-host` as the owner of
runtime inspection truth.

Before this slice, deeper runtime subresources already had compact summaries:

- turns;
- artifacts;
- sessions;
- recovery.

The top-level `host runtimes list` and `host runtimes get` commands still
returned only raw runtime inspection JSON.

## Implemented changes

- Added shared runtime-inspection presentation helpers to `packages/host-client`
  for:
  - deterministic runtime sorting;
  - runtime labels;
  - desired/observed state and reconciliation status;
  - bounded detail lines for backend, context readiness, restart generation,
    package source, runtime handle, status/reason text, and primary git
    repository provisioning.
- Added CLI runtime-inspection summary projection helpers.
- Added compact `--summary` output to:
  - `host runtimes list`;
  - `host runtimes get <nodeId>`.

## Boundary decision

This is a read-model presentation slice only.

No runtime state, reconciliation state, lifecycle semantics, or host API
contracts changed. Summary mode projects the existing
`RuntimeInspectionResponse` into a smaller operator record for terminal use.

## Testing

Added focused coverage for:

- shared runtime-inspection sorting, labels, status, and detail lines;
- CLI runtime summary projection;
- full repository verification after targeted host-client and CLI checks.

## Follow-on work

The next operational CLI summary gap is host status itself: a compact status
view could summarize service health, runtime counts, reconciliation counts,
and top finding codes without requiring operators to parse the full response.
