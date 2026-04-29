# Process Smoke User Node Signer Audit Slice

## Current Repo Truth

User Node message records preserve `signerPubkey`, compact CLI summaries expose
signer audit state, and the dedicated User Client can render signer labels from
conversation message records. Before this slice, the process-runner smoke
verified message delivery and User Client conversation reads, but it did not
fail when the signer metadata disappeared from the runtime path.

## Target Model

The fast no-LLM process proof should verify that every normal human-participant
message path preserves the stable signing identity:

- User Client JSON `task.request` publish response;
- Host User Node outbox conversation record;
- User Client conversation API record;
- inbound builder-to-user synthetic messages;
- inbound builder approval requests;
- User Client JSON `source_change.review`;
- User Client JSON `approval.response`;
- second User Node publish and Host outbox record.

## Impacted Modules/Files

- `services/host/scripts/federated-process-runner-smoke.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a shared smoke assertion helper requiring `signerPubkey` to match
  `fromPubkey`.
- Assert that User Node publish responses are signed by the assigned User Node
  runtime identity.
- Assert that Host/User Client conversation records preserve the same signer
  pubkey.
- Assert that synthetic builder messages and approval requests preserve the
  builder signer.
- Assert that the reviewer User Node uses its own stable signer, distinct from
  the first User Node.

## Tests Required

- `pnpm --filter @entangle/host typecheck`
- `node --check scripts/smoke-federated-process-runner.mjs`
- `pnpm ops:smoke-federated-process-runner -- --timeout-ms 60000`

## Migration/Compatibility Notes

The smoke now requires signer metadata on paths that the current runtime
already treats as signed. Older runtime builds without `signerPubkey` on these
records will fail the smoke, which is intentional for the federated identity
baseline.

## Risks And Mitigations

- Risk: the smoke becomes more sensitive to fixture drift.
  Mitigation: the assertions compare signer metadata to the runtime identities
  already materialized by the same smoke, instead of hardcoding pubkeys.
- Risk: the checks are mistaken for live model-provider validation.
  Mitigation: this remains a no-LLM process proof; API-backed provider testing
  remains manual until credentials are available.

## Open Questions

- The eventual three-machine proof should keep these signer assertions and add
  relay/git network-boundary assertions around the same message paths.
