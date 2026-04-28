# Host Source-History Publication Removal Slice

## Current Repo Truth

The owning runner now applies accepted signed source-candidate reviews and, when
policy allows it, publishes the resulting source-history commit artifact to the
node's primary git target. Before this slice, Host still exposed a direct
`POST /v1/runtimes/:nodeId/source-history/:sourceHistoryId/publish` mutation
that read runner-owned runtime files and pushed git artifacts from the control
plane.

## Target Model

Source-history publication is a node-owned runtime behavior. Host observes
`artifact.ref` and `source_history.ref` records from signed runner observations;
Studio, CLI, and host-client do not provide a direct Host publication path.

## Impacted Modules/Files

- `packages/types/src/host-api/runtime.ts`
- `packages/types/src/index.test.ts`
- `packages/host-client/src/index.ts`
- `packages/host-client/src/index.test.ts`
- `services/host/src/index.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `apps/cli/src/index.ts`
- `apps/studio/src/App.tsx`
- `references/202-source-history-publication-slice.md`
- `references/204-source-history-publication-controls-slice.md`
- `references/205-source-mutation-policy-gates-slice.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `README.md`
- `wiki/log.md`
- `wiki/overview.md`

## Concrete Changes Required

- Remove the Host source-history publication route.
- Remove the Host state mutation that published source history from
  Host-readable runner filesystem state.
- Remove the host-client method and Host API request/response schemas for direct
  source-history publication.
- Remove CLI `source-history-entry --publish` options and make that command
  read-only.
- Remove the Studio source-history publish/retry action; keep replay and
  read-only inspection.
- Mark old source-history publication docs as superseded by the runner-owned
  path.

## Tests Required

- Type/schema tests for removed Host API contracts.
- Host tests for source-history list/detail/replay without direct publication.
- host-client tests proving no publish request is emitted.
- CLI typecheck/lint for command surface changes.
- Studio typecheck/lint for removed action state.
- Federated process smoke to prove runner-owned publication remains the working
  path.

## Migration/Compatibility Notes

This is an intentional breaking change before public release. Existing callers
must stop posting to Host for source-history publication. The supported path is
to let the assigned runner publish after accepted source review when policy
permits it. Explicit retry/non-primary target publication needs a future
runner-owned command or signed User Node message path rather than a Host file
mutation.

## Risks And Mitigations

- Risk: operators lose a manual retry button. Mitigation: failed publication
  metadata remains visible through observed source-history/artifact records;
  retry should be reintroduced as a runner-owned command.
- Risk: tests lose coverage for git repository target provisioning through
  source-history publication. Mitigation: runner-owned publication is covered
  by runner tests plus the federated process smoke; the later wiki publication
  removal slice also removed the old shared Host git publication helpers.
- Risk: old docs imply the removed command exists. Mitigation: supersession
  notes were added to the historical slice docs.

## Open Questions

- Define the exact protocol for explicit runner-owned source-history publication
  retry.
- Decide whether non-primary source-history publication should be a signed User
  Node request, Host control command, or a runner-local operator action.
