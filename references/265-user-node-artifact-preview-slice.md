# User Node Artifact Preview Slice

## Current Repo Truth

The Human Interface Runtime already serves a usable User Client for assigned
User Nodes. That client can load projected conversations, render recorded
inbound and outbound messages, publish signed User Node replies, answer
approval requests, and display bounded artifact refs attached to messages.

Before this slice, the artifact refs were visible but not actionable from the
User Client. Operators could inspect artifact previews through the Host runtime
surface, CLI, or Studio, but a human graph participant had to leave the User
Client to inspect a referenced handoff.

The Host artifact preview endpoint still reads the materialized runtime
artifact record and artifact file through the remaining deep runtime
inspection path. It is not yet a projection-only artifact preview service.

## Target Model

A running User Node should be able to inspect artifact handoffs from its own
User Client. The browser-facing surface should show bounded preview content or
a clear unavailable reason without rendering runtime-local filesystem paths.

Longer term, artifact preview should move behind artifact/source/wiki
projection records and artifact backend fetchers so Host does not need direct
runner-local runtime paths for this class of read.

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

- rendered a `Preview` action for every artifact ref shown in User Client
  message history;
- added a server-side User Client route at `/artifacts/preview`;
- fetched the Host artifact preview endpoint with the Human Interface
  Runtime's server-side Host credentials;
- rendered preview content, truncation status, content type, and unavailable
  reasons without exposing the Host response's `sourcePath` to the browser;
- added runner tests for preview link generation, preview rendering, bearer
  token forwarding, and runtime path suppression.

Deferred:

- projection-backed artifact preview that does not depend on Host deep runtime
  detail readers;
- source-change diff review controls in the User Client;
- wiki repository review controls in the User Client;
- artifact restore/promotion actions from the User Client.

## Tests Required

- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner test -- index.test.ts`
- `pnpm --filter @entangle/runner lint`
- `node --check scripts/smoke-federated-process-runner.mjs`

Verification record:

- runner typecheck passed;
- runner focused test command passed with all runner test files;
- runner lint passed;
- process smoke syntax check passed;
- `git diff --check` passed.

## Migration/Compatibility Notes

This is additive. Existing message records without artifact refs render
unchanged. Existing Host artifact preview APIs are reused, but the User Client
does not expose runtime-local preview source paths in its HTML output.

## Risks And Mitigations

- Risk: the User Client preview could be mistaken for the final artifact
  architecture.
  Mitigation: the slice explicitly records that Host still uses the old deep
  runtime artifact preview path and that projection-backed artifact preview is
  the next architecture cleanup.
- Risk: artifact ownership may be ambiguous for outbound messages carrying
  refs.
  Mitigation: inbound refs preview against the sender runtime, wiki refs use
  their locator node id, and outbound refs preview against the target runtime
  as the conservative current fallback.
- Risk: browser output leaks local file paths.
  Mitigation: the preview page intentionally omits `sourcePath` even when Host
  returns it.

## Open Questions

The main unresolved design point is the final artifact preview authority:
whether Host should fetch from git/object backends directly from artifact refs,
or whether runners should publish preview observations/artifact manifests that
Host projects without touching runtime-local files.
