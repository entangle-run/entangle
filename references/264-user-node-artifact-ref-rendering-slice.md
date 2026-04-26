# User Node Artifact Ref Rendering Slice

## Current Repo Truth

User Node message records already carry `artifactRefs`, and the inbound intake
path can preserve artifact references from signed A2A messages. The User Client
rendered message summaries and approval metadata, but did not expose the
artifact/source/wiki references attached to a message.

## Target Model

The User Client should make artifact handoff visible inside the human
participant conversation. For v1, the safe minimum is to render bounded artifact
reference metadata from the message record: id, backend, kind, summary, and
locator. Full artifact preview, source diff review, wiki review, and restore
actions remain separate Host-backed controls.

## Impacted Modules/Files

- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `services/host/scripts/federated-process-runner-smoke.ts`
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

- rendered message artifact refs in the runner-served User Client;
- supported git, wiki, and local-file artifact locators in the display helper;
- extended runner tests so a User Client conversation page exposes an attached
  git artifact id and path;
- extended the process runner smoke synthetic agent-to-user message with a git
  artifact ref and asserted that Host conversation detail preserved it.

Deferred:

- artifact preview/download from the User Client;
- source-change diff review and application controls;
- wiki page/repository review controls;
- permission-aware artifact actions.

## Tests Required

- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner test -- index.test.ts`
- `pnpm --filter @entangle/runner lint`
- `node --check scripts/smoke-federated-process-runner.mjs`
- process runner smoke against a live relay.

Verification record:

- Host and runner typechecks passed;
- runner focused tests and lint passed;
- `node --check scripts/smoke-federated-process-runner.mjs` passed;
- `pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777 --timeout-ms 60000`
  passed against the federated dev relay after adding the artifact ref to the
  synthetic agent-to-user message.

## Migration/Compatibility Notes

This is a display-only addition. Existing message records without artifact refs
render unchanged.

## Risks And Mitigations

- Risk: artifact refs are mistaken for full artifact review.
  Mitigation: this slice only renders bounded refs; review/preview/apply
  actions remain explicit follow-up work.
- Risk: locator detail leaks local paths.
  Mitigation: the User Client renders whatever bounded ref Host already
  exposes; local-file refs remain a deployment/debug adapter concern until
  remote artifact stores are fully wired.

## Open Questions

The next product decision is which User Client artifact action should come
first: preview report artifacts, inspect source diffs, or open wiki refs.
