# User Client Wiki Page Patch Process Smoke Slice

## Current repo truth

[454-wiki-page-patch-mode-slice.md](454-wiki-page-patch-mode-slice.md)
added `mode: "patch"` for runner-owned wiki page upsert. Unit and API tests
covered the widened contracts, runner patch application, and UI request shape,
but the long process-runner proof still exercised only replace mode through the
running User Client.

## Target model

The federated process proof should verify the same participant path an operator
will use manually:

- a User Node receives a visible `wiki_page` approval resource;
- the running User Client submits a wiki page replacement through its local JSON
  API;
- the same User Client then submits a single-page unified diff patch for that
  page;
- the Human Interface Runtime forwards the request to Host with the User Node
  as requester;
- Host signs `runtime.wiki.upsert_page`;
- the assigned runner applies the patch in runner-owned wiki state;
- Host projection shows the completed command receipt and patched wiki preview.

## Impacted modules and files

- `services/host/scripts/federated-process-runner-smoke.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/454-wiki-page-patch-mode-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete changes

- Added SHA-256 calculation to the process-runner smoke so it can assert the
  expected, previous, and next wiki page hashes projected from runner command
  receipts.
- Extended the existing User Client wiki page mutation smoke section to submit
  a second `mode: "patch"` request with `expectedCurrentSha256`.
- Verified that Host projection contains a completed
  `runtime.wiki.upsert_page` receipt for the patch command and that the
  projected `wiki.ref` preview contains the patched content.

## Tests required

- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host lint`
- `pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777`

## Migration and compatibility

This is a smoke-test hardening slice only. It changes no public API contract and
does not change replace/append/patch runtime behavior.

## Risks and mitigations

- Risk: the process smoke may accidentally validate only request acknowledgement.
  Mitigation: the smoke now waits for runner-signed command receipt projection
  and projected patched wiki preview content.
- Risk: hash assertions could drift from runner normalization. Mitigation: the
  smoke computes hashes over the exact newline-normalized page contents that the
  runner writes.

## Audit notes

This slice adds no Host/runner shared filesystem dependency and keeps the proof
on the signed Host/User Client/runner control path.

## Open questions

- Multi-page wiki patch sets remain out of scope.
- A richer visual merge UI can build on this proven participant patch path.
