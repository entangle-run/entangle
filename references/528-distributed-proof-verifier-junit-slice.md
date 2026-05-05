# Distributed Proof Verifier JUnit Slice

## Current Repo Truth

The distributed proof verifier can print human-readable checks or JSON output.
The proof-tool smoke already exercises the verifier with generated-style
profiles, passing self-tests, and expected failure cases.

Before this slice, CI systems that prefer test-report artifacts had to parse
stdout or JSON themselves. The verifier did not emit a JUnit XML report.

## Target Model

The distributed proof verifier should keep the terminal and JSON surfaces while
also supporting an optional JUnit XML report file. This lets CI and future
infrastructure-backed proof runners retain a native check artifact for each
distributed proof attempt.

## Impacted Modules And Files

- `scripts/federated-distributed-proof-verify.mjs`
- `scripts/smoke-distributed-proof-tools.mjs`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `--junit <file>` to the distributed proof verifier.
- Write one JUnit testcase per verifier check.
- Represent failed checks as JUnit failures.
- Represent verifier exceptions as one JUnit error testcase when the runtime
  reaches the verifier execution path.
- Preserve existing human-readable and JSON output behavior.
- Extend the proof-tool smoke with a JUnit self-test that verifies the XML file
  is written.

## Tests Required

- Verifier syntax check.
- Proof-tool smoke.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

No generated proof profiles or Host APIs change. The new flag is additive.
Existing verifier invocations continue to print the same terminal or JSON
output unless `--junit <file>` is passed.

## Risks And Mitigations

- Risk: XML output could be malformed when check names contain special
  characters. Mitigation: the JUnit writer escapes check names, details, and
  error messages.
- Risk: operators confuse JUnit self-tests with a real distributed proof.
  Mitigation: docs keep the distinction between proof-tool smoke and
  infrastructure-backed proof execution.

## Open Questions

Future proof orchestration can decide where generated proof kits should place
JUnit files by default. This slice only adds the verifier primitive.

## Verification

Completed in this slice:

- `node --check scripts/federated-distributed-proof-verify.mjs`
- `node --check scripts/smoke-distributed-proof-tools.mjs`
- `node scripts/federated-distributed-proof-verify.mjs --self-test --junit /tmp/entangle-proof-junit.xml --json`
- `pnpm ops:smoke-distributed-proof-tools`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit over proof scripts and updated docs
