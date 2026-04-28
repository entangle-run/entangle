# Signed Source Candidate Review Slice

## Current Repo Truth

Before this slice, User Client source-change accept/reject controls still called
the Host runtime source-candidate review mutation. That route requires a
Host-readable runtime context and updates runner-owned candidate files from the
control plane.

The repository already had signed User Node task/reply/approval messages,
runner-owned `source_change.ref` observations, and projected source-candidate
read APIs, but source-candidate review itself was not yet a node-to-node action.

## Target Model

Source-change review is a graph participant action. A User Node emits a signed
`source_change.review` A2A message to the agent node that owns the candidate.
The receiving runner updates its own source-change candidate record and emits a
fresh signed `source_change.ref` observation. Host only records/provides the
User Node message and projects the runner observation.

## Impacted Modules And Files

- `packages/types/src/protocol/a2a.ts`
- `packages/types/src/host-api/user-nodes.ts`
- `services/host/src/user-node-messaging.ts`
- `services/host/src/state.ts`
- `services/runner/src/service.ts`
- `services/runner/src/human-interface-runtime.ts`
- `apps/user-client/src/runtime-api.ts`
- `apps/user-client/src/App.tsx`
- `services/runner/src/index.test.ts`
- `services/runner/src/service.test.ts`
- `packages/types/src/index.test.ts`
- `apps/user-client/src/runtime-api.test.ts`

## Concrete Changes

- Added `source_change.review` to the Entangle A2A message type contract.
- Added source-change review metadata with `candidateId`, `decision`, and
  optional `reason`.
- Added User Node publish/record support for `sourceChangeReview` metadata.
- Changed runner-served and dedicated User Client source review actions to
  publish a signed User Node message instead of calling the Host candidate
  mutation endpoint.
- Added runner handling for inbound `source_change.review` messages. The runner
  updates pending source-change candidates, stamps the deciding User Node, and
  publishes a new `source_change.ref` observation.
- Preserved projection-backed source diff and file previews.

## Tests Required

- Type contract tests for `source_change.review`.
- Runner service test proving a signed source review updates runner-owned
  candidate state and emits source-change observation.
- Human Interface Runtime test proving JSON/form review paths publish User Node
  messages rather than Host runtime mutations.
- Dedicated User Client runtime API test proving the local JSON request carries
  conversation, parent message, session, and source review metadata.
- Existing Host User Node publish and message recording tests.
- Process-runner smoke proving the running User Client JSON API can publish a
  source review and the assigned agent runner projects the reviewed candidate.

## Migration And Compatibility Notes

The older Host runtime source-candidate review mutation still exists as a
non-canonical compatibility/internal path. The public CLI and Studio review
surfaces are quarantined in
[322-public-direct-mutation-surface-quarantine-slice.md](322-public-direct-mutation-surface-quarantine-slice.md),
so the canonical User Node, User Client, and CLI participant path is now signed
A2A review.

## Risks And Mitigations

- Risk: source review messages without parent/session context could create
  ambiguous participant actions. Mitigation: the publish schema and runtime
  endpoints require parent message and session context.
- Risk: orphan review messages could create phantom runner state. Mitigation:
  runner preflight absorbs orphan review messages without creating session,
  conversation, or candidate records.
- Risk: Host projection can lag after the review message is published.
  Mitigation: the receiving runner emits `source_change.ref` after updating the
  candidate, preserving the existing projection reducer path.

## Open Questions

- Source candidate apply/publish/replay, artifact restore/promote, and wiki
  publication still need equivalent runner-owned command paths.
