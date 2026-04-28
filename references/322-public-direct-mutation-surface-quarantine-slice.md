# Public Direct Mutation Surface Quarantine Slice

## Current Repo Truth

Studio and CLI still exposed public operator actions that could decide runtime
approvals or review source-change candidates by mutating Host runtime state
directly. Those paths predated stable User Node identities and were useful for
same-machine bootstrap, but they bypass the federated actor model.

The Host routes and shared host-client methods still exist for compatibility
and for remaining source-history workflows, but they are no longer the public
operator/user path for approval responses or source-candidate review.

## Target Model

Approval responses and source-candidate reviews are graph participant actions.
A User Node signs the response/review and sends it to the owning agent node
through the User Node message boundary. Studio remains the operator console for
inspection, assignment, topology, policy, and runtime observability. CLI keeps
read-only operator inspection under `entangle host runtimes ...` and exposes
participant actions through User Node signing commands.

## Impacted Modules And Files

- `apps/cli/src/index.ts`
- `apps/cli/src/user-node-message-command.ts`
- `apps/cli/src/user-node-output.test.ts`
- `apps/studio/src/App.tsx`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/321-signed-source-candidate-review-slice.md`

## Concrete Changes Required

- Remove the public CLI `entangle host runtimes approval-decision` command.
- Remove CLI `entangle host runtimes source-candidate --review` and its
  operator review options.
- Add a signed CLI `entangle review-source-candidate` command that can derive
  candidate, conversation, parent message, session, turn, and target node from
  an inbound User Node approval request message.
- Let generic `entangle user-nodes message` carry `source_change.review`
  metadata when explicitly requested.
- Remove Studio approve/reject controls from runtime approval detail.
- Remove Studio source-candidate accept/reject/supersede controls from runtime
  source candidate detail.
- Leave Studio read-only runtime approval and source-candidate inspection
  intact.

## Tests Required

- CLI typecheck.
- CLI helper tests proving signed source-candidate review requests can be built
  from recorded inbound User Node messages.
- Studio typecheck/build to verify the removed mutation callbacks do not leave
  stale state or imports.
- Host/client tests remain unchanged in this slice because the internal
  compatibility routes are intentionally not removed yet.

## Migration And Compatibility Notes

This slice quarantines direct public mutation surfaces; it does not delete the
underlying Host compatibility routes. Remaining non-canonical direct mutations
need dedicated follow-up slices once source apply/publish, artifact
restore/promote, and wiki publication have runner-owned command paths.

Operators should use Studio/CLI for inspection and assignment. Human graph
participants should use the User Client or CLI User Node signing commands for
approval responses and source-candidate reviews.

## Risks And Mitigations

- Risk: removing public operator commands can interrupt old local test habits.
  Mitigation: equivalent signed User Node CLI commands exist for approval
  response and source review.
- Risk: Studio users may expect approval buttons in the admin console.
  Mitigation: Studio now shows the pending state without pretending the Host is
  the approving actor.
- Risk: Host compatibility routes can be mistaken for canonical product
  behavior. Mitigation: docs and roadmap mark them as compatibility/internal
  debt pending runner-owned command replacements.

## Open Questions

- Should the Host compatibility routes be removed entirely before the next
  public release, or kept behind an explicit debug capability flag until all
  source/artifact/wiki mutations are runner-owned?
- Should source apply/publish become signed User Node messages, Host-signed
  runner control commands, or a two-step protocol where User Node approval and
  Host policy command are separate signed events?
