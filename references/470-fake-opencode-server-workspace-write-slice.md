# Fake OpenCode Server Workspace Write Slice

## Current Repo Truth

The deterministic fake OpenCode server already covered attached-server health,
session creation, SSE permission delivery, permission replies, completion text,
and idle status. The process runner smoke still uses a separate fake
`opencode` executable for source workspace mutation because the fake attached
server did not yet simulate a tool writing files into the OpenCode workspace.

## Target Model

The fake OpenCode server should be strong enough to test attached-server
plumbing that affects runner-owned source state. It should optionally write a
deterministic file under the workspace provided through the same
`x-opencode-directory` header that the OpenCode adapter sends to attached
servers.

## Impacted Modules/Files

- `scripts/fake-opencode-server.mjs`
- `scripts/smoke-fake-opencode-server.mjs`
- `services/runner/src/opencode-engine.test.ts`
- active docs and wiki state

## Concrete Changes Required

- Add optional `--write-file` and `--write-content` flags to the fake server.
- Decode and retain the `x-opencode-directory` header from session or prompt
  requests.
- Write only relative paths that stay inside the declared workspace.
- Extend the no-credential fake server smoke to verify the workspace write.
- Extend the attached-server runner adapter test to verify permission bridging,
  Entangle action block parsing, and workspace mutation through the fake server
  process.

## Tests Required

- `node --check scripts/fake-opencode-server.mjs`
- `node --check scripts/smoke-fake-opencode-server.mjs`
- focused runner adapter test for deterministic fake HTTP server
- `pnpm ops:smoke-fake-opencode-server`
- full runner package test before commit

## Migration/Compatibility Notes

No production behavior changes. The workspace-write mode is opt-in and only
affects the deterministic fake OpenCode test server.

## Risks And Mitigations

- Risk: fake server writes outside the intended workspace.
  Mitigation: write paths must be relative and are resolved/checked under the
  decoded workspace root before writing.
- Risk: the fake server is mistaken for real OpenCode acceptance.
  Mitigation: docs continue to frame it as deterministic no-credential plumbing
  coverage, not live model or upstream OpenCode validation.

## Open Questions

The next process-smoke hardening step is to let the federated process runner
smoke run an optional attached fake OpenCode server profile end to end.
