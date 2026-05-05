# Runtime Wiki Page Batch Request Slice

## Current Repo Truth

Runner-owned wiki page mutation already travels through the Host-signed
`runtime.wiki.upsert_page` control command. Host API, host-client, CLI, Studio,
and User Client surfaces can request a single page replacement, append, or
patch against an accepted federated assignment. The runner owns path
validation, page writes inside `memory/wiki`, wiki repository sync, `wiki.ref`
evidence, stale-hash checks, and command receipts.

Before this slice, operators who needed to update multiple memory/wiki pages
had to send one Host request per page. That was correct architecturally, but it
made headless wiki maintenance and multi-page memory repair awkward.

## Target Model

Host should expose a bounded multi-page request surface while keeping the
runner protocol simple. A batch request is a Host/API convenience that emits
one existing signed `runtime.wiki.upsert_page` command per page. It is not an
atomic wiki patch set and does not introduce a new runner-side transaction
semantic.

## Impacted Modules/Files

- `packages/types/src/host-api/runtime.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/index.ts`
- `services/host/src/index.test.ts`
- `packages/host-client/src/index.ts`
- `packages/host-client/src/index.test.ts`
- `apps/cli/src/index.ts`
- `apps/cli/src/runtime-wiki-command.ts`
- `apps/cli/src/runtime-wiki-command.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `runtimeWikiUpsertPageBatchRequestSchema` and
  `runtimeWikiUpsertPageBatchResponseSchema`.
- Bound batch size to 1-16 page mutations.
- Add Host route `POST /v1/runtimes/:nodeId/wiki/pages/batch`.
- Reuse assignment selection and the existing signed single-page control
  publisher for each page.
- Add `host-client.upsertRuntimeWikiPages`.
- Add CLI command `entangle host runtimes wiki-upsert-pages <nodeId>
  --manifest <path>`.
- Add a JSON manifest parser helper for the CLI.

## Tests Required

- Type contract test for batch request/response defaults and shape.
- Host API test proving one batch request publishes multiple existing
  `runtime.wiki.upsert_page` commands to the accepted assignment.
- Host-client test proving URL, method, body, and response parsing.
- CLI helper test proving manifest parsing, defaults, and malformed JSON
  rejection.

## Migration/Compatibility Notes

Existing single-page Host, host-client, CLI, Studio, User Client, and runner
behavior remains unchanged. Existing runners need no protocol change because
Host emits the same per-page command payloads they already understand.

The CLI manifest shape is:

```json
{
  "pages": [
    {
      "path": "operator/notes.md",
      "content": "# Notes\n",
      "mode": "replace",
      "reason": "Refresh operator notes.",
      "requestedBy": "operator-main"
    }
  ]
}
```

`mode` defaults to `replace`; `append`, `patch`, and
`expectedCurrentSha256` use the same semantics as the single-page command.

## Risks And Mitigations

- Risk: operators may assume the batch is atomic. Mitigation: docs and naming
  describe it as a batch request that emits multiple single-page commands.
- Risk: a transport failure after earlier commands were published can leave a
  partial batch. Mitigation: each page gets its own command id and command
  receipt, so operators can inspect and retry individual failed pages.
- Risk: large manifests could overload control flow. Mitigation: schema caps
  the request at 16 pages and keeps the existing 128 KiB per-page content
  bound.

## Open Questions

Collaborative wiki merge UI and true atomic multi-page patch-set semantics
remain future work. They should be designed explicitly rather than hidden
inside this convenience batch surface.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/host-client test -- src/index.test.ts`
- `pnpm --filter @entangle/cli test -- src/runtime-wiki-command.test.ts`
- `pnpm --filter @entangle/host test -- src/index.test.ts`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit
