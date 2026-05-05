# Host Event Audit Bundle CLI Retention Slice

## Current Repo Truth

Host exposes `GET /v1/events/audit-bundle`, host-client validates the response,
and `entangle host events audit-bundle` can print the full bundle. Deployment
diagnostics can also embed the same bundle when live Host collection is
enabled.

Before this slice, the dedicated CLI command did not have an explicit
`--output` path or compact summary mode. Operators could redirect stdout, but
that made external retention workflows easier to mix with terminal output and
harder to automate consistently.

## Target Model

The Host event audit bundle should be easy to persist as an immutable support
or audit artifact from the CLI, while keeping terminal output bounded by
default when a file is written.

This is still not a full external retention service. It is the next operator
surface for exporting Host-verifiable evidence before a production audit sink
exists.

## Impacted Modules/Files

- `apps/cli/src/host-event-audit-output.ts`
- `apps/cli/src/host-event-audit-output.test.ts`
- `apps/cli/src/index.ts`
- `README.md`
- `references/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a compact Host event audit-bundle CLI summary projection.
- Add `--output <file>` to `entangle host events audit-bundle`.
- Add `--summary` to print the compact summary without event payloads.
- When `--output` is used, write the full JSON bundle to disk and print the
  compact summary.
- Keep the existing default behavior of printing the full JSON bundle when no
  summary or output option is supplied.

## Tests Required

Passed for this slice:

- `pnpm --filter @entangle/cli test -- src/host-event-audit-output.test.ts`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli lint`

The CLI test command currently runs the package's full CLI suite for this
invocation; that completed with 34 files and 102 tests passing.

## Migration/Compatibility Notes

The CLI change is additive. Existing `entangle host events audit-bundle`
invocations still print the full bundle. New retention flows can use
`--output audit-bundle.json` and archive the resulting file.

## Risks And Mitigations

- Risk: operators mistake file export for continuous retention.
  Mitigation: docs keep this framed as an explicit export, not a production
  audit sink.
- Risk: terminal output becomes too large.
  Mitigation: `--summary` and `--output` print compact hash/provenance fields
  instead of event payloads.
- Risk: support tooling loses provenance when it stores only the summary.
  Mitigation: `--output` writes the full signed bundle; the summary is only
  terminal feedback.

## Open Questions

- Should a future Host process stream audit bundles to an append-only external
  sink instead of relying on operator-triggered exports?

## Result

`entangle host events audit-bundle` now supports `--output <file>` and
`--summary`. Operators can persist the full Host event audit bundle as a JSON
artifact while seeing a compact hash/provenance summary in the terminal.
