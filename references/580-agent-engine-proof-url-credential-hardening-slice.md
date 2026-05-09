# Agent Engine Proof URL Credential Hardening Slice

## Current Repo Truth

The distributed proof kit can generate operator setup commands for an attached
fake OpenCode server and for custom `external_http` agent engine profiles.
Those commands previously accepted HTTP URLs with embedded username/password
credentials and printed them in dry-run output.

The distributed proof verifier already had URL credential redaction for
published git artifact refs, but the newly added agent-engine URL checks
reported Host catalog `baseUrl` values directly.

## Target Model

Distributed proof material must keep credentials out of URL coordinates. Fake
OpenCode proof authentication should use the explicit
`--fake-opencode-username` and `--fake-opencode-password` flags. Generic
`external_http` agent-engine authentication should be configured outside the
proof URL until a dedicated credential contract exists.

Verifier output should never expose URL credentials when reporting agent-engine
catalog checks.

## Impacted Modules And Files

- `scripts/federated-distributed-proof-kit.mjs`
- `scripts/federated-distributed-proof-verify.mjs`
- `scripts/smoke-distributed-proof-tools.mjs`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add proof-tool smoke coverage that expects
  `--fake-opencode-server-url http://user:pass@...` to fail generation.
- Add verifier self-test coverage for a credentialed agent-engine `baseUrl`
  and assert that JSON output contains only a redacted URL marker.
- Reject URL credentials in `--fake-opencode-server-url`, pointing operators
  to the dedicated fake OpenCode username/password flags.
- Reject URL credentials in `--external-http-engine-url`, keeping credentials
  out of generated operator commands and proof profiles.
- Redact agent-engine `baseUrl` details in verifier check output with the
  shared URL redaction helper.
- Redact any username/password pair to a single `***@` marker so the verifier
  does not reveal whether a password was present.

## Tests Required

- Red `node scripts/smoke-distributed-proof-tools.mjs` proving credentialed
  fake OpenCode URLs were still accepted and printed.
- Green `node scripts/smoke-distributed-proof-tools.mjs` after the kit rejects
  credentialed engine URLs and verifier output redacts credentialed
  agent-engine catalog URLs.
- Script syntax checks for changed proof tooling.
- Focused ESLint for changed proof tooling.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

This is a tightening change for proof tooling only. Existing local or
same-machine fake OpenCode runs that use separate username/password flags
continue to work.

Operators who previously embedded credentials in agent-engine URLs must move
fake OpenCode credentials to `--fake-opencode-username` and
`--fake-opencode-password`. Generic `external_http` proof profiles should use
engine-side authentication configuration outside the URL until Entangle adds a
typed credential binding for that adapter.

## Risks And Mitigations

- Risk: an operator depended on URL-embedded credentials in generated dry-run
  commands. Mitigation: the failure message points fake OpenCode users to the
  supported credential flags, and `external_http` remains explicit that
  authentication must live outside the URL.
- Risk: verifier redaction hides too much detail during diagnosis. Mitigation:
  host, protocol, port, and path remain visible; only credentials are removed.
- Risk: URL parsing normalizes formatting. Mitigation: proof checks already
  parse URLs for topology validation, and redaction is only for diagnostic
  output.

## Open Questions

Entangle still needs a typed credential binding for generic URL-backed
agent-engine profiles if `external_http` engines require authenticated access
in distributed proof environments.

## Verification

Completed in this slice:

- Red `node scripts/smoke-distributed-proof-tools.mjs` failed because the proof
  kit accepted and printed `http://engine-user:engine-secret@...` for the fake
  OpenCode server URL.
- Green `node scripts/smoke-distributed-proof-tools.mjs` passed after adding
  URL credential rejection and verifier redaction coverage.

The final slice audit also runs syntax checks, focused lint, product naming,
whitespace, changed-diff marker checks, and `git diff` review before commit.
