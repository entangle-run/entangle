# Runner Lifecycle Observation Completeness Slice

## Current Repo Truth

Joined runners already published many signed observations: runtime status,
session/conversation intake, turn phases, approval updates, and artifact/source
/wiki refs. Some later lifecycle transitions were still local-file-only:

- outbound handoff conversation writes;
- coordination `task.result` and `conversation.close` final conversation state;
- approval request final `waiting_approval` session and
  `awaiting_approval` conversation state;
- approval response final conversation/session state;
- normal session completion after open conversations resolve;
- failed/cancelled session transitions.

Those gaps could make Host projection lag behind runner-local state in remote
deployments where Host cannot read `runtimeRoot`.

## Target Model

Runner-local lifecycle writes remain an implementation detail. Whenever the
runner changes externally meaningful session or conversation state, it should
publish a bounded signed observation so Host projection can converge without
filesystem access.

## Impacted Modules/Files

- `services/runner/src/service.ts`
- `services/runner/src/service.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/228-distributed-state-projection-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Publish session observations from `completeSessionIfNoOpenConversations`.
- Publish outbound handoff conversation observations after the published event id
  is recorded.
- Publish final conversation observations for coordination `task.result` and
  `conversation.close`.
- Publish approval-request-created observations plus the resulting session and
  conversation lifecycle observations.
- Publish approval-response conversation observations and failed/completed
  session observations.
- Publish session observations for runner cancellation and failure transitions.
- Extend runner service tests to assert blocked-turn lifecycle observation
  emission.

## Tests Required

- Runner typecheck.
- Runner service tests.
- Runner lint and build.
- Federated process-runner smoke.

## Migration/Compatibility Notes

The change only adds observation emissions after state writes that already
existed. Host reducers are idempotent by graph/node/session/conversation ids,
so repeated observations update projection rather than creating new semantic
records.

## Risks And Mitigations

- Risk: additional observations increase relay traffic.
  Mitigation: emitted payloads are bounded session/conversation records, not
  logs, workspaces, or large artifacts.
- Risk: old runners may still miss final lifecycle observations.
  Mitigation: compatibility filesystem imports continue to work in same-machine
  deployments while upgraded runners provide the federated path.

## Open Questions

- Should future projection records retain the last observation event id per
  lifecycle record for audit/explainability?
