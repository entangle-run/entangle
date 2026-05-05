# Process Smoke User Client Source History Reconcile Slice

## Current Repo Truth

The Human Interface Runtime and dedicated User Client already exposed
participant-scoped source-history reconcile. The lower-level Host, control
event, runner, and User Client route tests covered the forwarding boundary, but
the federated process-runner smoke still stopped at participant source-history
publication.

## Target Model

The main no-credential federated smoke should prove that a running User Node can
request runner-owned source-history reconcile from its own User Client when a
plain `source_history` resource is visible in the selected conversation. The
request must flow through Human Interface Runtime, Host control plane, relay,
joined runner, and Host projection as a completed
`runtime.source_history.reconcile` command receipt.

## Impacted Modules/Files

- `services/host/scripts/federated-process-runner-smoke.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/451-user-client-source-history-reconcile-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Extend the process-runner smoke with a builder-originated
  `approval.request` whose resource is `kind: "source_history"`.
- Verify the User Node inbox sees that source-history reconcile resource.
- Call the running User Client JSON API at `/api/source-history/reconcile` for
  the visible source history.
- Verify the response preserves runtime source, User Node id, and visible
  source-history refs.
- Wait for a completed Host-projected `runtime.source_history.reconcile`
  command receipt with the requested replay id and source-history id.
- Keep publication-target resources rejected for reconcile; the smoke uses a
  plain `source_history` resource.

## Tests Required

- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/host typecheck`
- `pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777 --timeout-ms 60000`
- `pnpm ops:check-product-naming`

## Migration/Compatibility Notes

No migration is required. This is a smoke coverage expansion only. The smoke's
graph keeps `sourceMutation.applyRequiresApproval: false`, so the participant
reconcile command proves the User Client/Human Interface Runtime/Host/runner
control path without requiring a runner-local approved replay gate in this
scenario.

## Risks And Mitigations

- Risk: source-history publication targets are mistaken for reconcile
  authority.
  Mitigation: the User Client resolver is unchanged and the smoke uses a plain
  `source_history` resource, not a `source_history_publication` resource.
- Risk: command acknowledgement is mistaken for runner completion.
  Mitigation: the smoke waits for Host projection of a completed
  runner-signed command receipt.
- Risk: approved replay gates remain under-tested by this smoke.
  Mitigation: lower-level runner and Human Interface Runtime tests still cover
  forwarded `approvalId`; this smoke focuses on the policy-permissive
  participant path used by the current end-to-end graph.

## Open Questions

Approved source-history replay/reconcile in a graph with
`applyRequiresApproval: true` remains a future end-to-end scenario.
