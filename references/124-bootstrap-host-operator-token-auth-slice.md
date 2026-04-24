# Bootstrap Host Operator Token Auth Slice

## Summary

This slice is the first production-redesign hardening step after accepting the
LatticeOps redesign program.

The host API was previously a trusted local boundary with no authentication.
That was acceptable for early localhost development, but it was no longer a
professional baseline for a control plane that can mutate catalog, package,
graph, runtime, session, and recovery state.

The repository now supports an optional bootstrap operator-token boundary:

- `ENTANGLE_HOST_OPERATOR_TOKEN` enables host-side enforcement;
- HTTP clients authenticate with `Authorization: Bearer <token>`;
- the host-client package can attach the token to every request;
- CLI clients can pass `--host-token` or use `ENTANGLE_HOST_TOKEN`;
- Studio can use `VITE_ENTANGLE_HOST_TOKEN`;
- host event WebSocket URLs can carry an `access_token` query parameter for
  browser clients that cannot set custom WebSocket headers.

When no host operator token is configured, the local development profile
continues to behave as before.

## What changed

### 1. Shared host error contract

`packages/types` now includes `unauthorized` as a canonical host error code.
This keeps host, host-client, CLI, Studio, and tests aligned on the same error
surface instead of treating authentication failures as generic bad requests.

### 2. Host enforcement

`services/host` now installs an auth pre-handler when
`ENTANGLE_HOST_OPERATOR_TOKEN` is set.

Authenticated requests must carry:

```text
Authorization: Bearer <token>
```

Unauthenticated or invalid requests receive:

- HTTP `401`;
- `WWW-Authenticate: Bearer realm="entangle-host"`;
- a structured host error payload with `code: "unauthorized"`.

The event WebSocket handler also validates the configured token before
starting the event stream.

### 3. Host client propagation

`packages/host-client` now accepts `authToken`.

The client:

- adds `Authorization: Bearer <token>` to all HTTP requests;
- preserves existing JSON headers on mutating requests;
- appends an `access_token` query parameter to the event stream URL when a
  token is configured.

### 4. CLI and Studio configuration

The CLI host command now supports:

```bash
entangle host --host-token <token> ...
```

It also reads `ENTANGLE_HOST_TOKEN`, with `ENTANGLE_HOST_OPERATOR_TOKEN` as a
local convenience fallback.

Studio now reads:

```text
VITE_ENTANGLE_HOST_TOKEN
```

and passes it through the shared host client.

## Security posture

This is a bootstrap operator-token boundary, not final enterprise identity.

It improves the current local control-plane baseline by preventing accidental
unauthenticated mutation when the host is reachable beyond the immediate local
operator context. It does not replace the longer-term production requirements:

- user accounts;
- workspace or tenant identity;
- RBAC and ABAC;
- short-lived service tokens;
- secret manager backed token delivery;
- audit attribution by user and service identity;
- CSRF, CORS, and browser session hardening;
- rate limiting and abuse controls.

The `access_token` WebSocket query parameter is a pragmatic browser-compatible
bootstrap path. It should be replaced by stronger session or short-lived
upgrade-token semantics before any internet-facing deployment.

## Explicit non-goals

This slice does **not**:

- add multi-user authentication;
- add role-based authorization;
- change graph, package, runner, or artifact semantics;
- require auth for the default local development profile;
- make `entangle-host` a public internet-facing service;
- introduce a database-backed identity model.

## Validation and quality gates

This slice was closed after:

- adding contract tests for the `unauthorized` host error code;
- adding host tests for missing, invalid, and valid operator tokens;
- adding host-client tests for HTTP authorization headers and event-stream URL
  token propagation;
- re-running targeted tests for `@entangle/types`, `@entangle/host-client`,
  and `@entangle/host`;
- re-running full repository verification before commit.

## Resulting state

Entangle now has a first explicit host authentication boundary. The next
production hardening slices can build on this by adding durable audit
attribution, stronger browser/session semantics, and eventually workspace-aware
authorization without leaving the current host API completely open.
