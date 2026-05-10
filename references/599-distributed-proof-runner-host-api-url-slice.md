# Distributed Proof Runner Host API URL Slice

## Current Repo Truth

`scripts/federated-distributed-proof-kit.mjs` generated runner join configs
with the same Host URL used by the operator and verifier. That is correct for
simple physical-machine proofs when every machine uses the same DNS name, but
it is wrong for same-machine container-boundary proofs where the operator can
reach Host at `http://localhost:7071` while runner containers must use a
network-scoped address such as `http://host:7071`.

## Target Model

The distributed proof kit must distinguish:

- operator/verifier Host URL: the URL used by CLI commands on the operator
  machine;
- runner Host API URL: the URL written into each `runner-join.json` and used
  by remote or containerized runners after startup.

The default remains backward compatible: runner Host API URL defaults to
`ENTANGLE_RUNNER_HOST_API_URL` when set, otherwise to `--host-url`.

## Impacted Modules And Files

- `scripts/federated-distributed-proof-kit.mjs`
- `scripts/smoke-distributed-proof-tools.mjs`
- `deploy/federated-dev/README.md`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `--runner-host-api-url <url>` to the proof-kit generator.
- Use that value for the CLI `runners join-config --host-api-url` argument.
- Keep `--host-url` as the operator/verifier URL.
- Document the split for runner Compose proofs and multi-DNS deployments.
- Extend the distributed proof tool smoke so runner Compose dry-run output must
  show the separate runner Host API URL.
- Apply `--require-external-host-url` validation to the runner Host API URL as
  well as the operator Host URL.

## Tests Required

- Red/green: `pnpm ops:smoke-distributed-proof-tools`
- Syntax check for `scripts/federated-distributed-proof-kit.mjs`
- Product naming check
- Relevant broader verification before commit

## Migration And Compatibility Notes

Existing proof-kit invocations continue to work because the new option defaults
to the existing operator Host URL. Operators only need the new option when
runner machines or containers resolve Host differently than the operator.

## Risks And Mitigations

- Risk: operators confuse relay URL split with Host URL split.
  Mitigation: documentation calls out that this slice only separates Host API
  URL; relay URLs still need to be chosen for the runner/verifier mode being
  checked.
- Risk: container-boundary proof still needs explicit User Client exposure.
  Mitigation: this slice fixes the Host reachability gap without claiming the
  generated runner Compose profile is a full post-work proof runner yet.

## Open Questions

- Should generated runner Compose also support first-class User Client port
  publishing/public URL overrides per human-interface runner?
