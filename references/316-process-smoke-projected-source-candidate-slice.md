# Process Smoke Projected Source Candidate Slice

## Current Repo Truth

The federated process-runner smoke already starts Host, one joined agent
runner, two joined User Node runners, live relay communication, User Client
JSON actions, deterministic OpenCode-adapter execution, projected turn,
approval, and session reads, and isolated Host/runner state roots.

Before this slice, the deterministic fake OpenCode executable did not mutate
the source workspace, so the smoke did not prove source-change candidate
harvesting, `source_change.ref` candidate projection, or projected
source-change candidate diff reads end-to-end.

## Target Model

The no-provider process smoke should exercise the same source-change projection
path a real OpenCode run uses, while still avoiding live model credentials.

## Impacted Modules/Files

- `services/host/scripts/federated-process-runner-smoke.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Make the temporary fake `opencode` executable write a deterministic source
  file under the source workspace.
- Wait for the projected builder turn to expose source-change candidate ids.
- Query Host runtime source-change candidate list/detail APIs.
- Query Host runtime source-change candidate diff API and require projected
  diff content for the generated file.
- Print a dedicated smoke pass line for projected source-change read APIs.

## Tests Required

- Host script typecheck through Host package typecheck.
- Host lint.
- Federated process-runner smoke.

## Migration/Compatibility Notes

The smoke remains provider-free. It only changes the deterministic fake
OpenCode executable used by the spawned agent runner process.

## Risks And Mitigations

- Risk: the fake engine diverges from real OpenCode behavior.
  Mitigation: it still uses the OpenCode CLI event stream shape and now adds a
  realistic source workspace mutation that the runner harvests through the real
  source-change harvester.

## Open Questions

- Should the smoke also verify projected artifact preview reads from a real
  runner-produced artifact rather than only Host unit tests?
