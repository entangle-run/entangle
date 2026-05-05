# Entity Model And Authority Boundaries

## Current Repo Truth

Current contracts include graph nodes, edges, resource bindings, external
principals, runtime identities, package sources, artifacts, sessions, turns,
approvals, source history, and recovery records.

Important boundaries already exist:

- Nostr runtime identity is separate from git/external principals.
- External git principals are Host records resolved into runtime context.
- Agent engine profile selection is a graph/node binding.
- User nodes exist in graph contracts.
- Host Authority is modeled as a first-class signing authority with status,
  import/export, signed integrity-report, graph, assignment, and runner-control
  behavior.
- Operator identity is modeled through bootstrap operator-token records,
  hashed token storage, permission scopes, route-level enforcement, and request
  audit attribution.
- User Node identities are materialized from active graph state and used for
  signed task/reply/approval/source-review messages.
- Runner identity, runner hello, trust/revoke, heartbeats, liveness, runtime
  assignments, assignment leases, lifecycle receipts, and runtime command
  receipts are modeled and projected.
- Approval and User Node message records carry signer identity evidence where
  transport/Host intake can observe it.

Important boundaries still requiring deeper production hardening:

- Host Authority portability is implemented at the record/export/import layer,
  but production operational runbooks for cold standby and split-brain avoidance
  still need hardening.
- Operator identity remains bootstrap-token based, not full production RBAC,
  tenancy, SSO, hardware-backed signing, or external policy delegation.
- User Node key custody is Host-provisioned for development; external signer
  and device-owned custody are still future work.
- Runtime reassignment UX exists through Host assignment surfaces, but richer
  participant-aware reassignment workflows remain future work.

## Target Model

Host is not a graph node. Host is the authoritative control plane.

The target entities are:

- `HostAuthority`: key material or key reference, pubkey, active status,
  export/import metadata, and trust root for runners.
- `OperatorIdentity`: human or automation identity allowed to mutate Host
  desired state through Host API.
- `UserNodeIdentity`: graph-node identity used to sign A2A messages,
  approvals, replies, and task launches.
- `HumanInterfaceRuntime`: runtime/gateway that receives user-node messages and
  signs outbound user-node messages.
- `RunnerRegistration`: runner pubkey, advertised capabilities, version,
  transport endpoints, trust state, last heartbeat, and revocation reason.
- `RuntimeAssignment`: Host-signed binding from node id and graph revision to
  runner id, policy, resource refs, and lease.
- `AssignmentLease`: current validity window and renewal status.
- `ControlEvent`: Host Authority signed runner command.
- `ObservationEvent`: runner-signed status, receipt, lifecycle, artifact,
  source, wiki, approval, and bounded log summary.
- `ProjectionStore`: Host read model built from desired state plus signed
  observations.

Identity separation:

- Host Authority signs graph revisions, assignments, lifecycle commands, and
  trust decisions.
- Runner identity signs hello, receipts, heartbeats, and observations.
- User Node identity signs user task/reply/approval messages.
- Node runtime identity signs agent-to-agent A2A messages.
- Git principal signs or authenticates git operations only.
- Operator identity authorizes Host API mutations, but does not replace User
  Node identity.

## Impacted Modules/Files

- `packages/types/src/common/crypto.ts`
- `packages/types/src/common/topology.ts`
- `packages/types/src/graph/graph-spec.ts`
- `packages/types/src/runtime/runtime-identity.ts`
- `packages/types/src/runtime/runtime-state.ts`
- new `packages/types/src/federation/*.ts` or equivalent
- `packages/types/src/host-api/status.ts`
- `packages/types/src/host-api/control-plane.ts`
- `packages/validator/src/index.ts`
- `services/host/src/state.ts`
- `services/host/src/index.ts`
- `services/runner/src/index.ts`
- `apps/cli/src/index.ts`
- `apps/studio/src/App.tsx`

## Concrete Changes Required

- Keep Host Authority, User Node identity, runner identity, assignment, lease,
  control-event, observation-event, and projection schemas aligned as new
  protocol payloads are added.
- Add validation and tests whenever a route crosses authority boundaries:
  Host Authority commands, runner observations, User Node signed messages,
  operator API mutations, and git/external-principal bindings.
- Harden production operator identity beyond bootstrap tokens.
- Design User Node key custody migration from Host-provisioned development keys
  to device-owned or external signer-backed material.
- Keep Studio and CLI assignment/reassignment controls Host-authority mediated;
  User Clients may show runtime status but must not directly assign runners.

## Tests Required

- Schema parse/reject tests for every new authority-bearing entity.
- Signature verification tests for Host Authority, runner, and User Node
  signing roles.
- Host Authority import/export and signed-report tests.
- User Node identity stability and signed-message tests.
- Runner hello/trust/revoke/heartbeat/assignment tests.
- Assignment signer/graph-revision validation tests.
- Negative tests for wrong signer roles and authority-role confusion.

## Migration/Compatibility Notes

Current host-owned runtime identities for non-user nodes act as node runtime
identities. User nodes now have a separate identity store and bootstrap secret
delivery path for Human Interface Runtime assignments.

Existing external principal records remain compatible; they are not Nostr
identities and should not be overloaded as user, runner, Host Authority, or node
runtime identities.

## Risks And Mitigations

- Risk: key material leaks through runtime context.
  Mitigation: context carries pubkeys and key refs only; secrets are delivered
  by profile-specific secret providers.
- Risk: Host Authority split brain.
  Mitigation: v1 supports one active authority instance with explicit import
  and cold-standby workflows, not active-active consensus.
- Risk: operators and user nodes collapse into one identity.
  Mitigation: separate API auth, User Node signing, and Host Authority schemas.

## Open Questions

- Which non-file key backend should be prioritized after local dev keys:
  OS keychain, age-encrypted file, hardware wallet, or external signer?
