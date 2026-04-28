# OpenCode Server Health Probe Slice

## Current Repo Truth

Entangle's default agent runtime uses the OpenCode adapter behind the generic
agent-engine boundary. The adapter isolates OpenCode state under the node
engine-state workspace, probes `opencode --version`, and runs
`opencode run --format=json` for a bounded one-shot turn.

The engine profile can also carry a `baseUrl`. Before this slice, Entangle
passed that URL to `opencode run --attach <baseUrl>` but did not check whether
the server was reachable, healthy, or compatible before launching the turn.

The checked-out OpenCode reference at
`/Users/vincenzo/Documents/GitHub/VincenzoImp/entangle/resources/opencode`
shows that the server exposes `GET /global/health` and reports a health flag
plus version. The same reference shows that OpenCode server auth is Basic auth
when `OPENCODE_SERVER_PASSWORD` is set, with
`OPENCODE_SERVER_USERNAME` defaulting to `opencode`.

## Target Model

When a node is configured to attach to an OpenCode server, Entangle should
verify the server before running the turn. A failed health probe should produce
a classified provider-unavailable error before `opencode run` starts.

This remains an adapter-level improvement, not a full OpenCode server
integration. Entangle still owns graph identity, policy, Nostr messaging,
assignments, memory/wiki, source-change review, artifact publication, and Host
projection. OpenCode remains a node-local coding engine.

## Impacted Modules And Files

- `services/runner/src/opencode-engine.ts`
- `services/runner/src/opencode-engine.test.ts`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/258-human-interface-runtime-realignment-plan.md`

## Concrete Changes

- Added an OpenCode server health probe for profiles with `baseUrl`.
- The probe calls `/global/health` with inherited OpenCode Basic auth
  credentials when `OPENCODE_SERVER_PASSWORD` is available.
- The adapter now records combined CLI/server version evidence when both are
  available, for example `0.10.0; server 1.14.20`.
- Unreachable, unhealthy, or non-2xx server responses now fail the turn before
  launching `opencode run`.
- The existing `--attach <baseUrl>` invocation remains the execution path.

## Tests Required

- Runner typecheck.
- OpenCode adapter test proving health probe URL, Basic auth header,
  `--attach` preservation, and combined version output.
- OpenCode adapter test proving unhealthy attached servers fail before
  launching the run process.
- Runner lint.
- `git diff --check`.

## Migration And Compatibility Notes

Profiles without `baseUrl` are unchanged. Profiles with `baseUrl` now require
the attached OpenCode server to expose a healthy `/global/health` response
before a turn starts.

Deployments using `OPENCODE_SERVER_PASSWORD` should expose the same environment
to the runner process so the adapter can authenticate to the attached server.
When no password is configured, the probe sends no authorization header.

## Risks And Mitigations

- Risk: an older or custom OpenCode server does not expose `/global/health`.
  Mitigation: the failure is classified as provider unavailable before any
  workspace mutation starts.
- Risk: the server probe is mistaken for complete server-mode parity.
  Mitigation: this slice documents that long-running sessions, streaming,
  permission bridging, and server-side event handling remain future adapter
  work.
- Risk: secrets leak in logs.
  Mitigation: the authorization header is constructed only for the request and
  is not persisted in turn output or docs.

## Open Questions

- Should future engine profiles carry explicit OpenCode server auth references
  instead of inheriting `OPENCODE_SERVER_*` from the runner environment?
- Should Entangle eventually own OpenCode server lifecycle per node, or only
  attach to an externally managed server?
- Which OpenCode server API path should become the canonical basis for
  long-running sessions, event streaming, and permission bridging?
