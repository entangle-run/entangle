# Federated Session Conversation Turn Observations Slice

## Current Repo Truth

The process runner smoke already proved that a real joined runner process could
start an assigned runtime and persist a signed User Node message in
runner-owned session and conversation records. Host projection still could not
see that intake unless a Host-side filesystem reader inspected runner state.

## Target Model

Runner-owned session, conversation, and turn activity must reach Host through
signed `entangle.observe.v1` observations. Host should reduce those
observations into projection and event state, and user-facing surfaces should
be able to inspect the same Host-owned view without reading runner-local files.

## Impacted Modules/Files

- `packages/types/src/protocol/observe.ts`
- `packages/types/src/index.test.ts`
- `services/runner/src/service.ts`
- `services/runner/src/index.ts`
- `services/host/src/federated-control-plane.ts`
- `services/host/src/state.ts`
- `services/host/scripts/federated-process-runner-smoke.ts`
- `apps/cli/src/projection-output.ts`
- `apps/cli/src/projection-output.test.ts`
- `README.md`
- `deploy/federated-dev/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/254-process-runner-federated-smoke-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- allowed `session.updated` observations to carry an embedded bounded
  `SessionRecord`;
- allowed `conversation.updated` observations to carry an embedded bounded
  `ConversationRecord`;
- allowed `turn.updated` observations to carry an embedded bounded
  `RunnerTurnRecord`;
- added a runner service observation publisher hook;
- wired joined runtimes to publish session, conversation, and turn observations
  through the runner join observation transport and runner identity;
- made Host control-plane handling record `session.updated` and
  `conversation.updated` observations;
- made Host control-plane handling record `turn.updated` observations as
  `runner.turn.updated` Host events;
- added Host projection reduction from observed conversation activity to
  `userConversations` when the active graph identifies either side as a User
  Node;
- extended the process runner smoke to assert Host projection contains the User
  Node conversation after signed relay intake;
- surfaced the projected User Node conversation count in compact CLI Host
  projection output and printed an inbox-inspection command from the manual
  `--keep-running` harness.

## Tests Required

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/types test -- index.test.ts`
- `pnpm --filter @entangle/types lint`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner test -- service.test.ts`
- `pnpm --filter @entangle/runner lint`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli test -- projection-output.test.ts`
- `pnpm --filter @entangle/cli lint`
- `pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777`

Verification record:

- typechecks passed for types, Host, and runner;
- types contract tests passed;
- runner tests passed, including turn-observation phase publication coverage;
- lint passed for types, Host, and runner;
- process runner smoke passed against `strfry` on `ws://localhost:7777`,
  including signed User Node publish, runner intake, and Host projection of the
  User Node conversation.

## Migration/Compatibility Notes

The observation payload additions are optional. Older minimal
`session.updated` and `conversation.updated` payloads still parse; Host only
creates rich activity projection when the embedded record is present.

## Risks And Mitigations

- Risk: observations grow too large if full runtime records accumulate too much
  detail. Mitigation: current session and conversation records are bounded
  coordination metadata, not workspace, log, or model payload carriers.
- Risk: observation publish failure interrupts runner work. Mitigation: runner
  service state writes remain authoritative locally, and observation publish
  failures are isolated from runner-local state mutation.

## Open Questions

Approval, artifact, source, and wiki detail projection still need the same
federation treatment. This slice intentionally handles the first user
conversation projection path plus turn phase events needed for manual product
testing.
