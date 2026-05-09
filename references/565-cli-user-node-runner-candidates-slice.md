# CLI User Node Runner Candidates Slice

## Current Repo Truth

CLI already exposes `entangle user-nodes assignments <nodeId>` and
`entangle user-nodes assign <nodeId> --runner <runnerId>`. Operators can list
current User Node placement and can explicitly revoke existing assignments
before offering a replacement.

Before this slice, the focused User Node reassignment path did not expose a
health-aware candidate list. Operators had to inspect generic runner records
and infer trust, liveness, operational state, capacity, runtime-kind support,
and the effect of revoking the current User Node assignment themselves.

## Target Model

Headless operators should be able to inspect User Node runner candidates before
mutation. The CLI should keep Host as the source of truth, derive candidate
health from Host runner registry plus assignment state, and preserve Host
assignment APIs as the only mutation path.

## Impacted Modules And Files

- `apps/cli/src/index.ts`
- `apps/cli/src/user-node-output.ts`
- `apps/cli/src/user-node-output.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/506-canonical-user-node-surface-spec-repair.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `entangle user-nodes runner-candidates <nodeId>` to list runners that
  advertise `human_interface`.
- Include trust state, liveness, operational state, last-seen time, active
  assignment ids, current User Node assignment ids, capacity, capacity after
  explicit User Node revocation, and exclusion reasons.
- Sort recommended candidates first, with the current runner first when it
  would become available after explicit User Node reassignment.
- Add `--recommended-only` for focused candidate output.
- Add `--require-recommended-runner` to `entangle user-nodes assign` so an
  operator can fail before mutation if the selected runner is not currently
  recommended by the same health-aware candidate logic.

## Tests Required

- CLI helper coverage for candidate selection, capacity after User Node
  revocation, current-runner detection, incompatible runner exclusion, and
  recommended-only filtering.
- CLI typecheck.
- CLI focused lint.
- CLI help smoke for `user-nodes runner-candidates`.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

No data migration is required. Existing generic assignment commands and the
existing `user-nodes assign` path remain valid. The new
`--require-recommended-runner` flag is opt-in and does not change the default
assignment mutation behavior.

## Risks And Mitigations

- Risk: candidate summaries are mistaken for scheduler authority. Mitigation:
  the summaries are read-only CLI projections; Host assignment offer/revoke
  routes remain authoritative.
- Risk: a current runner looks unavailable because it is already full with the
  selected User Node assignment. Mitigation: the candidate summary reports
  capacity both before and after explicit User Node revocation.
- Risk: operators miss why a runner is not recommended. Mitigation: the CLI
  returns bounded exclusion reasons for trust, liveness, operational state, and
  capacity.

## Open Questions

Studio can later render the same candidate model inside the User Node roster or
assignment panel. More advanced reassignment workflows can add draining,
scheduled movement, and participant-visible placement notices.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/cli test -- user-node-output.test.ts`
- `tsc -b apps/cli/tsconfig.json --pretty false`
- `eslint apps/cli/src/index.ts apps/cli/src/user-node-output.ts apps/cli/src/user-node-output.test.ts --max-warnings 0`
- `pnpm --filter @entangle/cli dev user-nodes runner-candidates --help`
- `pnpm --filter @entangle/cli dev user-nodes assign --help`

The final slice audit also runs product naming, whitespace, changed-diff
marker checks, and `git diff` review before commit.
