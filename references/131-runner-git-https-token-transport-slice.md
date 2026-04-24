# Runner Git HTTPS Token Transport Slice

Date: 2026-04-24

## Purpose

Close the runtime gap where Entangle's shared resource and principal contracts
already allowed `transportKind: "https"` git services and `https_token`
principals, while the runner artifact backend rejected every URL-based remote
that was not SSH.

## Implemented Behavior

- Runner git publication and retrieval still support direct local-path remotes
  without credentials for bounded local tests.
- SSH remotes continue to require an `ssh_key` principal with an available
  mounted-file secret and continue to use `GIT_SSH_COMMAND`.
- HTTPS remotes now require an `https_token` principal with available secret
  delivery.
- HTTPS token material may be delivered by mounted file or environment
  variable through the existing resolved-secret-binding contract.
- The runner writes a runtime-local `git-https-askpass.sh` helper that contains
  no token material.
- The git child process receives token and username values through environment
  variables plus `GIT_ASKPASS` and `GIT_TERMINAL_PROMPT=0`.
- Tokens are not embedded in remote URLs, command-line arguments, artifact
  records, or runtime context files.

## Evidence

- `services/runner/src/artifact-backend.ts` now builds remote git environments
  asynchronously so HTTPS token material can be read from resolved secret
  delivery before git push, clone, fetch, or remote setup.
- `services/runner/src/service.test.ts` covers mounted-file HTTPS token
  delivery, env-var HTTPS token delivery, and explicit failure for unavailable
  secret material.

## Design Notes

The implementation deliberately uses git's askpass boundary instead of
rewriting remote URLs. That keeps the portable artifact locator and persisted
publication/retrieval metadata free of live secrets while still allowing
standard HTTPS git services to prompt non-interactively.

The slice does not introduce a new secret backend. It consumes the existing
resolved-secret-binding contract and keeps host-owned secret resolution as the
source of truth.

## Verification

- `pnpm --filter @entangle/runner lint`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner test`
- `pnpm verify`
- `git diff --check`
