# Host Source Application And Replay Removal Slice

## Current Repo Truth

Signed User Node source-candidate review messages already drive the active
runner-owned source application path. The owning runner records accepted
source-history entries, emits `source_change.ref` and `source_history.ref`
observations, and can publish accepted source-history records to its primary git
target.

Before this slice, Host still exposed direct mutation routes that wrote
runner-owned source state:

- `POST /v1/runtimes/:nodeId/source-change-candidates/:candidateId/apply`;
- `POST /v1/runtimes/:nodeId/source-history/:sourceHistoryId/replay`;
- source-history replay history list routes.

Those routes required Host-readable runner filesystem access and were not valid
for a runner on another machine.

## Target Model

Source application is node-owned runtime behavior. Host observes signed runner
records and exposes read surfaces for source candidates and source history.
Studio and CLI inspect source changes and source history, but they do not ask
Host to mutate a runner source workspace.

## Impacted Modules/Files

- `packages/types/src/host-api/runtime.ts`
- `packages/types/src/index.test.ts`
- `packages/host-client/src/index.ts`
- `packages/host-client/src/index.test.ts`
- `packages/host-client/src/runtime-source-history.ts`
- `services/host/src/index.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `apps/cli/src/index.ts`
- `apps/cli/src/runtime-source-history-output.ts`
- `apps/studio/src/App.tsx`
- `apps/studio/src/runtime-source-history-inspection.ts`
- `references/221-source-history-replay-slice.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `README.md`
- `wiki/log.md`
- `wiki/overview.md`

## Concrete Changes Required

- Remove Host source-candidate apply and source-history replay routes.
- Remove host-client apply/replay/list-replay methods.
- Remove Host API request/response schemas for those direct mutations.
- Remove CLI `source-candidate --apply`, `source-history-replay`, and
  `source-history-replays`.
- Remove Studio source-candidate apply and source-history replay controls.
- Keep read-only source-candidate and source-history projection-backed
  inspection.
- Mark the historical source-history replay slice as superseded.

## Tests Required

- Type/schema tests proving removed contracts no longer exist.
- Host tests for source candidate/source history read paths without direct Host
  mutation.
- host-client tests proving no apply/replay requests are emitted.
- CLI and Studio typecheck/lint after command and UI removal.
- Federated process smoke proving signed User Node review still causes
  runner-owned source-history application and publication.

The added-line local-assumption audit only finds `runtimeRoot` inside a Host
test fixture that seeds source-history read data. That is a valid test fixture,
not a new production dependency.

## Migration/Compatibility Notes

This is an intentional pre-release breaking change. Explicit source replay or
manual retry should return later as runner-owned protocol behavior, not as a
Host filesystem mutation.

## Risks And Mitigations

- Risk: operators lose a manual source replay button. Mitigation: the main
  accepted-review path is already runner-owned and covered by smoke; replay can
  be reintroduced through a signed runner command.
- Risk: older docs still describe Host replay. Mitigation: the historical slice
  is marked superseded and this file records the current product boundary.

## Open Questions

- Define the runner-owned command/message shape for explicit source replay.
- Decide whether source replay should be requested by a User Node message,
  Host control command, or both with different policy requirements.
