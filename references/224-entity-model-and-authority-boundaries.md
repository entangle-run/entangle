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

Important boundaries are missing or blurred:

- Host Authority is not modeled as a first-class signing authority.
- Operator identity is only a Host bearer-token/API concern.
- User Node identity is not materialized or used for signing.
- Runner identity and runner registration are not modeled.
- Runtime assignments and leases do not exist.
- Host is not yet portable by moving a Host Authority key plus projection/state.
- Approval records do not carry signer identity evidence.

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

- Add Host Authority record and key reference schemas.
- Add user-node identity records separate from runtime identities.
- Add runner registration and trust-state schemas.
- Add assignment and lease schemas.
- Add signed event envelope schemas that bind payload hash, signer pubkey,
  signature, graph id, node id, runner id, and monotonic timestamp/nonce where
  needed.
- Add validation rules preventing Host Authority from masquerading as User Node.
- Add Host APIs for authority status, export/import, runners, trust/revoke,
  assignments, and leases.
- Add CLI and Studio surfaces for identity and assignment inspection.

## Tests Required

- Schema parse/reject tests for every new entity.
- Signature verification tests.
- Host Authority import/export tests.
- User Node identity stability tests.
- Runner trust/revoke tests.
- Assignment signer/graph-revision validation tests.
- Negative tests for wrong signer roles.

## Migration/Compatibility Notes

Current host-owned runtime identities for non-user nodes can become node
runtime identities. User nodes need a new identity store.

Existing external principal records should remain compatible; they are not
Nostr identities and should not be overloaded as user or node identities.

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
