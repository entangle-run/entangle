# Shared Host Status Presentation Slice

## Purpose

Give headless operators a compact health summary for the host control plane
without changing the host status API.

Before this slice, `host status` returned only the full
`HostStatusResponse`. That response is the right raw contract, but it is noisy
for quick terminal checks because operators usually need the service state,
runtime counts, reconciliation counts, finding codes, graph revision, backend,
and last reconciliation time first.

## Implemented changes

- Added shared host-status presentation helpers to `packages/host-client` for:
  - host status labels;
  - reconciliation summary strings;
  - bounded detail lines.
- Added CLI host-status summary projection helpers.
- Added compact `--summary` output to `host status`.

## Boundary decision

This is a presentation-only slice.

The raw `host status` command still returns the host-owned
`HostStatusResponse` unchanged. Summary mode only projects that response into a
smaller operator record for terminal inspection.

## Testing

Added focused coverage for:

- shared host-status labels, reconciliation summaries, and detail lines;
- CLI host-status summary projection;
- full repository verification after targeted host-client and CLI checks.

## Follow-on work

With runtime, recovery, session, artifact, graph, resource inventory, and host
status summaries in place, the next high-value work should shift away from
presentation parity and back toward deeper runtime semantics, production
authorization policy, and deployment upgrade/repair hardening.
