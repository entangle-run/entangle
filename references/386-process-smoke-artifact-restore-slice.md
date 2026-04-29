# Process Smoke Artifact Restore Slice

## Current Repo Truth

`384-runner-owned-artifact-restore-control-slice.md` added the Host-signed
`runtime.artifact.restore` command and runner-owned restore execution.
`385-artifact-restore-operator-surfaces-slice.md` exposed that request path in
CLI and Studio.

Before this slice, the process-runner smoke did not prove that a real joined
runner could receive the restore command, retrieve a projected artifact, and
publish retrieval evidence back through Host projection. The first smoke run
also exposed a validator mismatch: file-backed git services used by bounded
same-machine proof profiles were still rejected when no git transport
principal was bound, even though file remotes do not require SSH or HTTPS
credentials.

## Target Model

The fastest federated proof should cover artifact restore end to end:

- Host requests restore through the same public runtime artifact route used by
  CLI and Studio;
- Host publishes the signed control command to the accepted assignment;
- the joined runner retrieves the git artifact through runner-owned state;
- the runner emits an `artifact.ref` observation with retrieval state;
- Host projection reports the restored artifact without Host reading
  runner-local files;
- file-backed git profiles remain valid for deterministic local proof runs,
  while SSH/HTTPS git services still require deterministic transport
  principals.

## Impacted Modules And Files

- `packages/validator/src/index.ts`
- `packages/validator/src/index.test.ts`
- `services/host/scripts/federated-process-runner-smoke.ts`
- `README.md`
- `references/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Extend `ops:smoke-federated-process-runner` after the backend-resolved
  artifact history/diff proof to request artifact restore for the real
  runner-published source-history artifact.
- Wait for Host runtime artifact inspection to show runner-observed retrieval
  state and require `retrieved`.
- Keep failure diagnostics explicit by surfacing the observed retrieval error
  when the runner reports `failed`.
- Refine `validateRuntimeArtifactRefs` so file git repository targets do not
  require a git transport principal.
- Preserve existing principal requirements for non-file git targets.
- Add validator coverage for a file-backed git artifact ref without principal
  bindings.

## Tests Required

Implemented and passed:

- `pnpm --filter @entangle/validator test -- validateRuntimeArtifactRefs`
- `pnpm --filter @entangle/validator typecheck`
- `docker compose -f deploy/federated-dev/compose/docker-compose.federated-dev.yml up -d strfry && pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777`

Additional slice-close verification is recorded in the commit audit notes.

## Migration And Compatibility Notes

This is additive verification plus a validator correction for file-backed git
profiles. No Host artifact mutation route is reintroduced.

File git transport remains a local proof/dev backend. It is still accessed
through semantic git artifact context and runner-owned retrieval, not through a
shared Host/runner runtime filesystem.

SSH and HTTPS git repository targets still require a deterministic git
principal binding before runtime artifact handoff or restore is accepted.

## Risks And Mitigations

- Risk: allowing file targets without principals accidentally weakens remote
  git validation.
  Mitigation: the exception is tied to the resolved repository target's
  `transportKind: "file"`; the existing missing/ambiguous principal checks
  remain active for non-file targets.
- Risk: the process smoke only proves a local file git backend.
  Mitigation: this remains the fastest no-credential proof; remote
  SSH/HTTPS-backed distributed proof stays a separate acceptance gate.
- Risk: restore completion is mistaken for promotion.
  Mitigation: the smoke asserts retrieval state only. It does not apply or
  promote restored content into source workspaces.

## Open Questions

- Should the smoke later include an SSH or HTTPS git service with ephemeral
  credentials to exercise credentialed artifact restore in CI?
- Should restored artifact records projected through Host strip runner-local
  materialization paths and expose only logical retrieval state?
