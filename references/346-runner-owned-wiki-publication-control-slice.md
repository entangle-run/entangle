# Runner-Owned Wiki Publication Control Slice

## Current Repo Truth

The previous federated cleanup intentionally removed direct Host wiki
repository publication because that path required Host-readable runner
filesystem state. The active wiki path before this slice was:

- runners synchronize `memory/wiki` into their runner-local
  `wiki-repository` workspace after completed turns;
- runners emit signed `wiki.ref` observations when a concrete wiki snapshot is
  available;
- Host projects those refs and serves bounded memory/wiki previews without
  reading runner-local files.

That left explicit operator-triggered wiki publication as an open gap. Source
history already had the correct pattern: Host publishes a signed control
command to the accepted assignment, and the owning runner performs the git
operation from runner-owned state.

## Target Model

Explicit wiki repository publication must be runner-owned runtime behavior.
Host may request it only by publishing a signed federated control command to
the accepted runner assignment.

The runner:

- receives `runtime.wiki.publish`;
- syncs its local wiki repository snapshot;
- publishes the snapshot to the node's primary git repository target when one
  is configured;
- records the publication artifact in runner-owned state;
- emits signed `artifact.ref` observation evidence for Host projection.

Host, CLI, and host-client request publication through the Host control-plane
boundary. They do not read, mutate, or push the runner wiki repository.

## Impacted Modules/Files

- `packages/types/src/protocol/control.ts`
- `packages/types/src/host-api/runtime.ts`
- `packages/types/src/index.test.ts`
- `packages/host-client/src/index.ts`
- `packages/host-client/src/index.test.ts`
- `services/host/src/federated-control-plane.ts`
- `services/host/src/federated-control-plane.test.ts`
- `services/host/src/index.ts`
- `services/host/src/index.test.ts`
- `services/runner/src/join-service.ts`
- `services/runner/src/service.ts`
- `services/runner/src/index.ts`
- `services/runner/src/index.test.ts`
- `services/runner/src/wiki-repository.ts`
- `services/runner/src/wiki-repository.test.ts`
- `apps/cli/src/index.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `runtime.wiki.publish` to `entangle.control.v1`.
- Add Host API request/response schemas for wiki publication command requests.
- Add a Host route:
  `POST /v1/runtimes/:nodeId/wiki-repository/publish`.
- Make that route require an accepted federated runner assignment and an active
  control plane.
- Add Host control-plane publication for the signed wiki command.
- Add host-client and CLI request surfaces for the command.
- Extend the joined runner control handler to accept `runtime.wiki.publish`.
- Add runner service behavior that syncs the wiki repository, publishes it to
  the primary git target, persists the resulting artifact record, and emits
  `artifact.ref` evidence.
- Keep publication state in runner-owned artifact records. Host projection
  receives only signed observation evidence.

## Tests Required

- Contract test parsing `runtime.wiki.publish`.
- Host control-plane test for the generated payload.
- Host route test proving publication requests become federated commands for
  accepted assignments.
- host-client test for the request URL, method, body, and response validation.
- runner join-service test proving accepted assignments dispatch the command to
  the active runtime handle.
- runner wiki repository test proving a snapshot can be pushed to a primary git
  target and persisted as a published artifact record.
- Typecheck and lint for `@entangle/types`, `@entangle/host-client`,
  `@entangle/host`, `@entangle/runner`, and `@entangle/cli`.

The added-line local-assumption audit finds only `runtimeRoot` references in
`services/runner/src/service.ts` and
`services/runner/src/wiki-repository.test.ts`. Both are valid runner-owned
state usages: the runner persists publication artifact metadata under its own
runtime state root, and the test fixture asserts that behavior without giving
Host filesystem authority.

## Migration/Compatibility Notes

This restores an operator-triggered wiki publication action without restoring
the invalid direct Host filesystem mutation. Pre-release callers should use
`entangle host runtimes wiki-publish <nodeId>` or the host-client method
`publishRuntimeWikiRepository`.

The route is intentionally command-oriented. It returns a request status and
command id, not a publication artifact. The artifact arrives later through
runner-signed `artifact.ref` projection.

The command publishes only to the runtime context's primary git repository
target. Non-primary wiki promotion and richer repo-per-node memory topology
remain future work.

## Risks And Mitigations

- Risk: operators expect synchronous publication results from the Host request.
  Mitigation: the response is explicitly `status: "requested"` and durable
  artifact evidence remains observation-driven.
- Risk: retry behavior could republish a previously failed artifact without
  operator intent.
  Mitigation: failed publication metadata requires
  `retryFailedPublication: true` before retry.
- Risk: Host route naming resembles the removed direct route.
  Mitigation: implementation and docs define it as a signed control command;
  Host does not read or push runner-local wiki state.
- Risk: only primary git target is supported.
  Mitigation: scope matches source-history control parity and keeps
  non-primary publication for a later bounded slice.

## Open Questions

- Should wiki publication also be requestable by signed User Node A2A messages
  when graph policy allows participant-triggered memory publication?
- Should each node wiki become a first-class long-lived remote repository, or
  remain a runner-local repository with published refs into the graph primary
  artifact backend?
- Should successful wiki publication emit a dedicated `wiki_repository.published`
  observation in addition to the generic `artifact.ref` evidence?
