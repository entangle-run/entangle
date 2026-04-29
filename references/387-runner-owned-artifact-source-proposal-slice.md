# Runner-Owned Artifact Source Proposal Slice

## Current Repo Truth

Runner-owned artifact restore now exists as a Host-signed
`runtime.artifact.restore` command. That restores a projected artifact into
runner-owned retrieval state and emits `artifact.ref` evidence, but it does
not create source-review work.

Earlier Host-side artifact promotion was removed because it copied restored
artifact files into source workspaces from the Host process. That boundary is
invalid for remote runners. The remaining product gap was a safe replacement:
operators need a way to ask the owning runner to turn a visible artifact into
a pending source-change candidate without bypassing User Node review.

## Target Model

Artifact-to-source work should be runner-owned proposal behavior:

- Host resolves a projected artifact ref and accepted assignment;
- Host publishes a signed `runtime.artifact.propose_source_change` control
  command;
- the assigned runner retrieves the artifact through its artifact backend;
- the runner copies bounded regular files into its source workspace under a
  safe relative target path;
- the runner harvests the resulting source diff and writes a
  `pending_review` source-change candidate;
- the runner emits signed `source_change.ref` evidence with the source artifact
  ref attached;
- User Node review and approval still happen through the existing source-change
  candidate flow.

This replaces direct promotion with a proposal. It deliberately does not apply
the proposal to source history or publish it.

## Impacted Modules And Files

- `packages/types/src/protocol/control.ts`
- `packages/types/src/host-api/runtime.ts`
- `packages/types/src/index.test.ts`
- `packages/host-client/src/index.ts`
- `packages/host-client/src/index.test.ts`
- `services/host/src/federated-control-plane.ts`
- `services/host/src/federated-control-plane.test.ts`
- `services/host/src/index.ts`
- `services/host/src/index.test.ts`
- `services/host/scripts/federated-process-runner-smoke.ts`
- `services/runner/src/index.ts`
- `services/runner/src/index.test.ts`
- `services/runner/src/join-service.ts`
- `services/runner/src/service.ts`
- `services/runner/src/service.test.ts`
- `README.md`
- `references/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `runtime.artifact.propose_source_change` to the control protocol.
- Add Host API request/response contracts for
  `POST /v1/runtimes/:nodeId/artifacts/:artifactId/source-change-proposal`.
- Add a Host control-plane publisher for artifact source-change proposal
  commands.
- Add the Host route that requires a projected artifact ref and accepted
  federated assignment before publishing the command.
- Add host-client support for requesting artifact source-change proposals.
- Add joined-runner command dispatch for the new control event.
- Add `RunnerService.requestArtifactSourceChangeProposal`.
- Copy only regular files/directories from retrieved artifacts, reject
  symlinks, reject unsafe target paths, skip `.git`, and enforce bounded file
  count/byte limits.
- Harvest a pending source-change candidate from the resulting workspace diff
  and emit signed `source_change.ref` projection evidence.
- Extend the process-runner smoke to request a proposal from the real
  runner-published report artifact and wait for projected candidate evidence.

## Tests Required

Implemented and passed:

- `pnpm --filter @entangle/types test -- "control events"`
- `pnpm --filter @entangle/host-client test -- index.test.ts`
- `pnpm --filter @entangle/host test -- federated-control-plane.test.ts index.test.ts`
- `pnpm --filter @entangle/runner test -- index.test.ts service.test.ts`
- `docker compose -f deploy/federated-dev/compose/docker-compose.federated-dev.yml up -d strfry && pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777`

The first smoke attempt timed out waiting for the initial runner heartbeat
before any new proposal path was exercised; the immediate rerun passed end to
end over the same relay.

## Migration And Compatibility Notes

This is additive. It does not restore the removed Host-side artifact promotion
API.

The source-change proposal path is a runner control command and still routes
review through existing source-change candidate/User Node behavior. Existing
artifact restore and source-history publication/replay flows are unchanged.

## Risks And Mitigations

- Risk: artifact proposal becomes a hidden direct source mutation.
  Mitigation: the runner creates only a `pending_review` candidate; application
  still requires the existing review flow.
- Risk: copied artifact content escapes the source workspace.
  Mitigation: target paths must be safe relative paths and are checked against
  the source workspace root after resolution.
- Risk: repository internals or unsafe entries are copied.
  Mitigation: `.git` entries are skipped, symlinks and non-regular files are
  rejected, and copy limits bound file count and bytes.
- Risk: remote runners need artifact credentials.
  Mitigation: retrieval reuses the same artifact backend validation and git
  principal rules as restore and inbound artifact handoff.

## Open Questions

- Should User Clients be allowed to request artifact source-change proposals
  for visible artifacts, or should this remain an operator-only Host command?
- Should proposal commands support path mapping rules for directory artifacts
  instead of a single target root?
- Should source-change candidate records gain explicit `sourceArtifactRefs`
  instead of carrying artifact lineage only through `source_change.ref`
  observation payloads?
