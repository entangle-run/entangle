# Artifact Proposal Correlation Slice

## Current Repo Truth

Artifact source-change proposal acknowledgements included `proposalId` only
when the caller supplied it. If CLI, Studio, or User Client omitted
`proposalId`, the runner could still create a random candidate id, but the
request acknowledgement had no stable candidate id for follow-up inspection.

## Target Model

Every artifact source-change proposal request should have a request-visible
proposal id:

- caller-supplied `proposalId` remains supported;
- Host generates a deterministic proposal id when the caller omits one;
- Host includes that proposal id in the signed control payload;
- Host includes the same proposal id in the response acknowledgement;
- the runner uses the payload proposal id as the source-change candidate id.

This keeps User Client and operator acknowledgements actionable without adding
Host-side source mutation.

## Impacted Modules And Files

- `services/host/src/index.ts`
- `services/host/src/index.test.ts`
- `README.md`
- `references/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/389-user-client-artifact-source-proposal-slice.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Change Host artifact source-change proposal publishing to return both
  `commandId` and `proposalId`.
- Generate a default proposal id from the command id when the request omits
  `proposalId`.
- Always send the effective proposal id in
  `runtime.artifact.propose_source_change`.
- Always include the effective proposal id in
  `RuntimeArtifactSourceChangeProposalResponse`.
- Add Host coverage for caller-supplied and Host-generated proposal ids.

## Tests Required

Implemented and passed:

- `pnpm --filter @entangle/host test -- index.test.ts`
- `pnpm --filter @entangle/runner test -- index.test.ts`
- `pnpm --filter @entangle/user-client test -- runtime-api.test.ts`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/user-client typecheck`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- `git diff -U0 | rg "^\\+.*(Entangle Local|entangle-local|runtimeProfile.*local|contextPath|runtimeRoot|shared volume|effective-runtime-context|Docker)"`

The added-line local-assumption audit produced no hits.

## Migration And Compatibility Notes

This is additive at the wire level. Existing clients that ignored `proposalId`
continue to work, and clients that already supplied it keep the same behavior.
New clients can now show the effective source-change candidate id immediately.

## Risks And Mitigations

- Risk: generated ids collide.
  Mitigation: the id is derived from the UUID-bearing command id.
- Risk: Host appears to create the candidate.
  Mitigation: Host only names the proposal; the assigned runner still creates
  the candidate and emits projection evidence.

## Follow-Up

The explicit command-to-candidate receipt record was implemented in
`391-runtime-command-receipt-projection-slice.md`. Artifact proposal
completion now projects `runtime.command.receipt` records correlated by
`commandId`, `proposalId`, and `candidateId`.
