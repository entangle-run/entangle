# User Node Source Change Diff Preview Slice

## Current Repo Truth

User Node approval requests can carry policy resource metadata. Source
application approvals use the `source_change_candidate` resource kind when the
requested operation is tied to a concrete source-change candidate.

Before this slice, the User Client could approve or reject an inbound
`approval.request`, but it did not provide a participant-facing way to inspect
the associated source diff. Operators could inspect source-change candidates
through Host/CLI/Studio runtime surfaces.

The Host source-change diff endpoint still reads the remaining deep runtime
candidate records and shadow git state. It is useful for the current product
path, but it is not yet the final projection-backed source review service.

## Target Model

A human graph participant should be able to inspect the concrete source diff
before signing an approval response as their User Node. The diff action belongs
inside the User Client, not Studio, because this is participant workflow.

Longer term, source-change review should be backed by observed source-change
refs and artifact/source projection records rather than direct Host reads of
runner-local source-change candidate files.

## Impacted Modules/Files

- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/226-user-node-and-human-interface-runtime-spec.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/258-human-interface-runtime-realignment-plan.md`
- `references/README.md`
- `README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- rendered approval resource metadata in User Client message history;
- added a `Review diff` action when an inbound approval request references a
  `source_change_candidate`;
- added a server-side User Client route at `/source-change-candidates/diff`;
- fetched the Host source-change candidate diff endpoint with the Human
  Interface Runtime's server-side Host credentials;
- rendered source-change summary, file list, diff content, truncation status,
  or unavailable reason in the User Client;
- extended runner tests for link rendering, bearer-token forwarding, and diff
  page rendering.

Deferred:

- signed source-change review messages beyond approval responses;
- User Client controls for applying or publishing source history;
- projection-backed source-change diff/read services;
- file-level source preview from the User Client.

## Tests Required

- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner test -- index.test.ts`
- `pnpm --filter @entangle/runner lint`
- `node --check scripts/smoke-federated-process-runner.mjs`
- `git diff --check`

Verification record:

- runner typecheck passed;
- runner focused test command passed with all runner test files;
- runner lint passed;
- process smoke syntax check passed;
- `git diff --check` passed.

## Migration/Compatibility Notes

This is additive. Approval requests without a `source_change_candidate`
resource continue to render only approval metadata and approve/reject controls.

## Risks And Mitigations

- Risk: humans approve source changes without understanding the linked
  operation.
  Mitigation: approval request cards now show the resource and provide a diff
  link when the resource is a source-change candidate.
- Risk: the User Client source diff path is mistaken for the final distributed
  source review architecture.
  Mitigation: this slice explicitly records that the current route reuses the
  existing Host runtime diff endpoint and that projection-backed source review
  remains required.
- Risk: source diff rendering leaks more than intended.
  Mitigation: the route renders the bounded Host diff response and summary,
  which already enforce truncation.

## Open Questions

The main open design issue is whether final source-change review should be a
first-class signed User Node message type distinct from approval.response, or a
structured approval.response with richer resource-specific review metadata.
