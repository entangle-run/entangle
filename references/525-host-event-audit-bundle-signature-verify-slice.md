# Host Event Audit Bundle Signature Verify Slice

## Current Repo Truth

The CLI can verify a saved Host event audit bundle offline by validating its
schema and recomputing event count, canonical event JSONL hash, signed report
hash, signed-content payload consistency, and outer bundle hash.

Before this slice, that offline verifier did not validate the Nostr signature
embedded in the signed integrity report. It could prove that the retained file
was internally consistent, but it could not independently prove that the report
event was signed by the recorded Host Authority public key.

## Target Model

Saved audit bundles should carry independently checkable Host Authority
provenance. The offline CLI verifier should reconstruct the signed Nostr event
from the stored signed report, recompute the event id, verify the signature,
and confirm the signer pubkey matches the report's Host Authority pubkey.

The command still remains an offline retained-bundle verifier. It does not
contact Host and does not inspect any events beyond the content embedded in the
saved bundle file.

## Impacted Modules And Files

- `apps/cli/package.json`
- `apps/cli/src/host-event-audit-output.ts`
- `apps/cli/src/host-event-audit-output.test.ts`
- `pnpm-lock.yaml`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/524-host-event-audit-bundle-offline-verify-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `nostr-tools` as an explicit CLI dependency.
- Reconstruct the signed report Nostr event from stored report content,
  timestamp, kind, tags, event id, signer pubkey, and signature.
- Recompute the event id and verify the event signature with `nostr-tools`.
- Confirm the event signer matches the report's Host Authority pubkey.
- Include `integrityReportSignature` in
  `entangle host events audit-bundle-verify <file>` output.
- Fail verification when signer, event id, or signature validation fails.
- Add tests with a real signed report event and a tampered signature.

## Tests Required

- CLI Host event audit-output tests.
- CLI typecheck.
- CLI lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

No persisted Host schema changes are required. The verifier consumes the same
audit bundle format already exported by Host.

Existing saved bundles with malformed or non-verifiable signed events now fail
offline verification. That is intentional because a retained evidence bundle
should not pass if the embedded Host Authority report cannot be verified.

## Risks And Mitigations

- Risk: CLI dependency growth increases the surface of the headless tool.
  Mitigation: reuse the same `nostr-tools` version already used by Entangle
  protocol packages and services.
- Risk: reconstructed-event fields could drift from Host signing semantics.
  Mitigation: the verifier reconstructs the event from the exact fields stored
  in the signed report, and tests use a real `finalizeEvent` signature.
- Risk: operators could confuse offline verification with a fresh Host state
  inspection. Mitigation: docs describe the command as saved-bundle
  verification only.

## Open Questions

Future hardening can move audit-bundle verification into a shared package so
Host, CLI, and future support tooling can reuse one implementation.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/cli test -- src/host-event-audit-output.test.ts`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit over CLI and updated docs
