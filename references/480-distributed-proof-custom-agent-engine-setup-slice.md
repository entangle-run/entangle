# Distributed Proof Custom Agent Engine Setup Slice

## Current Repo Truth

The distributed proof kit could advertise alternate agent engine capabilities
with `--agent-engine-kind`, and it had a special attached fake OpenCode setup
path. It did not generate Host operator commands that upserted and bound the
new executable `external_process` and `external_http` engine profiles.

## Target Model

The proof kit should be able to prepare a runnable distributed proof for every
active agent engine kind. OpenCode remains the default. Fake OpenCode remains a
special no-credential attached-server path. Generic custom engines can now be
configured through:

- `--external-process-engine-executable <cmd>`
- `--external-http-engine-url <url>`

The generated operator script should upsert the corresponding profile through
Host, bind the agent node to it, then proceed with trust and assignment.

## Impacted Modules/Files

- `scripts/federated-distributed-proof-kit.mjs`
- `scripts/smoke-distributed-proof-tools.mjs`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add proof-kit options for `external_process` executable setup and
  `external_http` endpoint setup.
- Infer the agent runner engine kind from those options when
  `--agent-engine-kind` is omitted.
- Generate Host catalog profile upsert and node binding commands for the
  selected custom engine.
- Reject conflicting fake OpenCode/custom-engine setup and mismatched advertised
  runner engine kinds.
- Extend proof-tool smoke coverage for positive and negative dry-run paths.

## Tests Required

- `node --check scripts/federated-distributed-proof-kit.mjs`
- `node --check scripts/smoke-distributed-proof-tools.mjs`
- `pnpm ops:smoke-distributed-proof-tools`
- `pnpm ops:check-product-naming`
- `git diff --check`

## Migration/Compatibility Notes

Existing generated proof kits are unaffected. New custom-engine setup options
are additive.

## Risks And Mitigations

- Risk: generated kits imply that external engines are available on remote
  machines.
  Mitigation: README output states the custom process/HTTP endpoint must be
  reachable from the agent runner and must implement the shared turn contract.
- Risk: operators configure both fake OpenCode and a generic custom engine.
  Mitigation: the kit rejects that combination before writing files.

## Open Questions

None for this slice.
