# Studio Wiki Publication Control Slice

## Current Repo Truth

Explicit wiki repository publication now exists as a federated Host Authority
control command:

- Host publishes `runtime.wiki.publish` to the accepted runner assignment;
- the assigned runner syncs and publishes its runner-owned wiki repository to
  the primary git target by default or to an explicit resolved git target
  selector;
- the runner persists the artifact record and emits signed `artifact.ref`
  projection evidence.

CLI and host-client can request that path. Studio still had the older removal
state: no operator action for wiki publication, because the previous Studio
button depended on direct Host publication of runner-local files.

## Target Model

Studio is the admin/operator surface. It may request wiki publication through
Host, but it must not publish a runner repository itself, infer local runner
paths, or treat request acceptance as publication completion.

The selected-runtime Runtime Memory panel should let an operator submit an
optional reason, requester id, failed-publication retry flag, and partial git
target selector. The response is shown as a requested command. Completion
evidence remains runner receipts, Host events, and projected `artifact.ref`
records.

## Impacted Modules/Files

- `apps/studio/src/App.tsx`
- `apps/studio/src/runtime-wiki-publication.ts`
- `apps/studio/src/runtime-wiki-publication.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/285-studio-wiki-publication-retry-slice.md`
- `references/346-runner-owned-wiki-publication-control-slice.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add Studio helper functions for wiki publication request drafts and
  requested-response summaries.
- Add selected-runtime Runtime Memory form fields for reason, requester id,
  failed-publication retry, and optional git target selector values.
- Call `host-client.publishRuntimeWikiRepository` from Studio.
- Keep command request feedback separate from actual publication evidence.

## Tests Required

- Studio helper test for request building and requested-summary formatting.
- Studio typecheck.
- Studio lint.

The added-line local-assumption audit found no new `contextPath`,
`runtimeRoot`, `effective-runtime-context`, shared-volume, Docker, or local
product-name assumptions. Studio only calls the Host API command surface.

## Verification Run

- `pnpm --filter @entangle/studio typecheck`
- `pnpm --filter @entangle/studio lint`
- `pnpm --filter @entangle/studio test -- src/runtime-wiki-publication.test.ts`

## Migration/Compatibility Notes

This restores an operator-visible Studio action without restoring the invalid
direct Host filesystem mutation. The action uses the same host-client and Host
API contract as CLI `host runtimes wiki-publish`.

Existing runtime memory inspection remains read-only unless the operator
explicitly submits the federated publication request.

## Risks And Mitigations

- Risk: operators confuse request acceptance with publication completion.
  Mitigation: Studio summary says the command was requested; completion remains
  separate observation evidence.
- Risk: Studio drifts from CLI semantics.
  Mitigation: both surfaces use the same host-client method and Host API
  schema.
- Risk: retry flag is treated as a generic publish override.
  Mitigation: runner-side publication logic only uses retry for existing failed
  publication metadata.

## Open Questions

- Add projected artifact-ref filtering that highlights wiki publication
  artifacts directly beside the request form.
- Decide whether Studio should surface resolved target previews or policy
  warnings before submitting non-primary wiki publication requests.
