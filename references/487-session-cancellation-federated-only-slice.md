# Session Cancellation Federated-Only Slice

## Current Repo Truth

Host session cancellation already had a signed federated
`runtime.session.cancel` command path for accepted assignments, and joined
runners already store the request in runner-owned state before applying it to
idle or active sessions.

Before this slice, Host still fell back to a runtime-bound cancellation helper
when no accepted assignment or active control relay was available. That
fallback wrote a
`session-cancellations/*.json` record directly into the target runtime root,
which only works when Host can read and write runner-local files.

## Target Model

Session cancellation is a Host Authority control-plane behavior. Host must send
a signed control command to the accepted runner assignment. If no accepted
assignment/control path exists, Host should reject the request instead of
mutating runner filesystem state.

Runner-local cancellation records remain valid implementation detail after the
runner receives the control command.

## Impacted Modules/Files

- `services/host/src/index.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `references/222-current-state-codebase-audit.md`
- `references/228-distributed-state-projection-spec.md`
- `references/230-migration-from-local-assumptions-plan.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Remove the Host runtime-root session cancellation fallback.
- Keep `recordFederatedSessionCancellationRequest` as Host audit/projection
  evidence after successful control-plane publication.
- Return `409 conflict` when the target runtime exists but has no accepted
  federated assignment.
- Return `409 conflict` when an assignment exists but Host has no active
  session-cancel control publisher/relay configuration.
- Keep runner-side `session-cancellations` state because it is node-local
  execution state written after control delivery.

## Tests Required

- Host API test proving unassigned session cancellation is rejected.
- Host API test proving no runtime-root cancellation file is written by Host.
- Host API test proving accepted assignments still reject cancellation when no
  control publisher/relay is active.
- Existing Host API test proving accepted assignments publish
  `runtime.session.cancel` still passes.
- Host typecheck and package tests.
- Product naming check and diff whitespace check.

## Migration/Compatibility Notes

This is intentionally breaking for direct runtime-context cancellation without
a federated assignment. The project is pre-release and the canonical runtime
model now requires the same control path for local and remote nodes.

## Risks And Mitigations

- Risk: direct runtime-context debug sessions lose operator cancellation.
  Mitigation: debug runners should be assigned through the federated control
  path; runner-local state remains able to apply cancellation once delivered.
- Risk: cancellation failure looks like "runtime missing".
  Mitigation: existing runtimes without accepted assignments now return a
  conflict with node/session details.
- Risk: Host accidentally reintroduces direct file mutation later.
  Mitigation: docs classify this fallback as fixed and tests assert no
  runtime-root cancellation file is written by Host.

## Open Questions

None for this slice.
