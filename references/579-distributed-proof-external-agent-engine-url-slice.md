# Distributed Proof External Agent Engine URL Slice

## Current Repo Truth

The distributed proof kit can configure attached OpenCode and generic
`external_http` agent engine profiles for no-credential or custom-engine proof
runs. Those profiles can use HTTP URLs, and generated operator commands can
make them the active default before assignment.

Before this slice, physical proof hardening could require external Host,
relay, User Client, and git service URLs, but it could still accept a loopback
URL-backed agent engine profile. That is fine for same-machine rehearsals, but
misleading for a proof where the agent runner is on another machine.

## Target Model

Physical distributed proofs should be able to require URL-backed agent engine
profiles to use non-loopback, non-wildcard HTTP(S) URLs. Executable-only agent
engine profiles remain valid because the engine runs inside the runner's own
boundary and does not need a network URL.

## Impacted Modules And Files

- `packages/types/src/ops/distributed-proof-profile.ts`
- `packages/types/src/index.test.ts`
- `scripts/distributed-proof-profile.mjs`
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

- Add `requireExternalAgentEngineUrls` to the TypeScript distributed proof
  profile contract.
- Preserve `requireExternalAgentEngineUrls` in the script proof profile
  normalizer.
- Add `--require-external-agent-engine-urls` to the proof kit and verifier.
- Propagate the flag into generated verifier commands and proof profiles.
- Make proof kit generation fail fast when a required external attached
  OpenCode or `external_http` URL is loopback, wildcard, malformed, or
  non-HTTP(S).
- Make the verifier inspect the selected default Host catalog agent engine
  profile and reject loopback or wildcard `baseUrl` values when the flag is
  enabled.

## Tests Required

- Red `node scripts/smoke-distributed-proof-tools.mjs` proving generated proof
  kit/verifier output did not yet include the new flag.
- Red focused `@entangle/types` test proving the package contract dropped the
  new field.
- Green `node scripts/smoke-distributed-proof-tools.mjs`.
- Green focused and full `@entangle/types` tests.
- Script syntax checks.
- Focused ESLint for changed scripts and TypeScript package files.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

The new check is opt-in. Same-machine demos and local fake-agent-engine runs
can keep loopback URLs by omitting `--require-external-agent-engine-urls`.

Executable-only engine profiles are accepted by the verifier because they do
not depend on a cross-machine HTTP endpoint. URL-backed profiles must use an
external HTTP(S) coordinate when the physical-proof guard is enabled.

## Risks And Mitigations

- Risk: operators confuse local no-credential fake OpenCode checks with
  physical multi-machine proof readiness. Mitigation: the new flag fails fast
  when the fake OpenCode URL is loopback.
- Risk: verifier checks an unrelated URL-backed profile. Mitigation: the
  verifier checks the catalog default agent engine profile, matching the proof
  kit's generated setup commands.
- Risk: URL-shape validation is mistaken for live reachability. Mitigation:
  docs describe this as topology-shape validation; live attached-engine
  behavior remains covered by runner/process smokes and manual operator tests.

## Open Questions

Future infrastructure-backed proof orchestration can add a live health probe
for URL-backed agent engine profiles from the runner network boundary.

## Verification

Completed in this slice:

- Red `node scripts/smoke-distributed-proof-tools.mjs` failed because generated
  proof kit/verifier output did not include
  `--require-external-agent-engine-urls`.
- Red focused `@entangle/types` test failed because
  `requireExternalAgentEngineUrls` parsed as `undefined`.
- Green focused `@entangle/types` test passed after adding the contract field.
- Green `node scripts/smoke-distributed-proof-tools.mjs` passed after adding
  proof-kit, verifier, profile, and smoke support.

The final slice audit also runs full types tests, typecheck, syntax checks,
focused lint, product naming, whitespace, changed-diff marker checks, and
`git diff` review before commit.
