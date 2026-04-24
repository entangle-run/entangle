# Studio Recovery Policy Mutation Slice

## Purpose

Let visual operators govern runtime recovery policy from Studio through the
same host-owned boundary already available to CLI and automation.

Before this slice, Studio could inspect selected-runtime recovery policy,
controller state, recovery history, and recovery events, but changing the
policy required leaving the visual surface. That created an operator gap for a
resource that was already modeled and implemented in `entangle-host`.

## Implemented behavior

- Added a typed Studio recovery-policy draft model.
- Added local draft validation aligned with the host schema:
  - `manual`
  - `restart_on_failure`
  - `maxAttempts` from 1 to 20
  - `cooldownSeconds` from 0 to 3600
- Added canonical request construction for
  `RuntimeRecoveryPolicyMutationRequest`.
- Added selected-runtime policy editing controls in Studio.
- Wired policy save to `client.setRuntimeRecoveryPolicy(nodeId, request)`.
- Preserved host ownership of the mutation and refreshes selected-runtime
  state after the host accepts the change.
- Added unit coverage for draft creation, validation, request construction,
  and change detection.

## Design notes

The UI intentionally edits only the policy resource. It does not mutate
controller state directly and does not infer recovery behavior locally.

The recovery controller remains host-owned observed state. Studio sends the
desired recovery policy and then reloads host state, preserving the existing
desired-versus-observed separation.

## Verification

- `pnpm --filter @entangle/studio lint`
- `pnpm --filter @entangle/studio typecheck`
- `pnpm --filter @entangle/studio test`
