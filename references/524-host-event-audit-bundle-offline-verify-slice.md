# Host Event Audit Bundle Offline Verify Slice

## Current Repo Truth

Host, host-client, and CLI can export a typed Host event audit bundle. The
bundle includes the typed events, the canonical event JSONL hash, a Host
Authority-signed integrity report, and a bundle hash. The CLI can also write
that full bundle to a file for retention or support handoff.

Before this slice, the repository did not provide an offline CLI verifier for a
saved bundle file. Operators could export the bundle, but checking whether a
stored file still matched its embedded count, hash, signed-content payload, and
bundle hash required manual inspection or contacting a live Host again.

## Target Model

The CLI should be able to verify a saved Host event audit bundle without
contacting Host. This gives operators and support reviewers a deterministic
first check over retained audit evidence before handoff, archiving, or deeper
investigation.

The verifier validates the persisted envelope and hash consistency. It does
not replace live Host event integrity inspection and does not yet perform full
Nostr signature validation inside the CLI package.

## Impacted Modules And Files

- `apps/cli/src/host-event-audit-output.ts`
- `apps/cli/src/host-event-audit-output.test.ts`
- `apps/cli/src/index.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a CLI-side saved-bundle verification helper that parses the bundle with
  the shared response schema.
- Recompute the typed event count from the stored event list.
- Recompute the canonical event JSONL SHA-256 hash from the stored typed
  events.
- Recompute the signed integrity report hash from the stored signed content.
- Confirm the signed-content payload matches the stored signed integrity report
  fields.
- Recompute the outer bundle hash from the bundle payload excluding the stored
  `bundleHash` field.
- Add `entangle host events audit-bundle-verify <file>` and return non-zero
  status when verification fails.
- Cover the verifier with valid bundle, tampered bundle, and invalid-schema
  tests.

## Tests Required

- CLI Host event audit-output tests.
- CLI typecheck.
- CLI lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

No schema migration is required. Existing audit bundle export files remain the
input format for the verifier.

Older malformed or hand-edited bundle files fail schema validation instead of
being partially accepted. That is intentional because the verifier is an
evidence-retention check, not a repair command.

## Risks And Mitigations

- Risk: operators could treat hash-envelope verification as proof of full
  cryptographic validity. Mitigation: docs explicitly state that this command
  verifies saved envelope consistency and does not replace signature-aware Host
  integrity inspection.
- Risk: canonical serialization drift could make valid saved files fail in the
  future. Mitigation: the verifier uses the same sorted-key canonical JSON
  shape already used by the export bundle hash logic and the tests compute the
  expected hashes independently.
- Risk: tampered events could keep the stored report fields but alter event
  content. Mitigation: the verifier recomputes event count, event JSONL hash,
  and outer bundle hash, so event mutations fail multiple checks.

## Open Questions

Future work can move full signature verification into a shared verifier package
or add the required dependency to the CLI. This slice keeps the change bounded
to saved bundle schema and hash-envelope verification.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/cli test -- src/host-event-audit-output.test.ts`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit over CLI and updated docs
