# Distributed Proof Kit Fake OpenCode Slice

## Current Repo Truth

The distributed proof kit already generates three runner directories, operator
trust/assignment scripts, proof profiles, and verifier scripts for a reachable
Host/relay/git topology. The agent runner defaults to `opencode_server`, but
operators still had to manually configure a deterministic attached fake
OpenCode profile on Host and remember runner Basic-auth environment variables
when they wanted a no-credential multi-machine proof path.

## Target Model

The generated proof kit should be able to prepare the no-credential attached
OpenCode path while preserving the normal Entangle federated topology:

- Host still owns catalog and node binding changes through CLI/Host APIs;
- the agent runner still joins generically and receives assignment through
  signed control;
- User Nodes and agent nodes still communicate over the relay;
- the fake OpenCode server is only a deterministic engine fixture reachable
  from the assigned agent runner.

## Impacted Modules/Files

- `scripts/federated-distributed-proof-kit.mjs`
- `scripts/smoke-distributed-proof-tools.mjs`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add proof-kit options for an attached fake OpenCode base URL, profile id,
  and optional Basic-auth credentials.
- Generate operator commands that upsert an `opencode_server` profile with
  `permissionMode: "entangle_approval"` and bind the agent node to it before
  assignments.
- Add optional fake OpenCode credentials to the generated agent-runner env file.
- Document how to start the fake server on a machine reachable from the agent
  runner.
- Add proof-tool smoke coverage for fake OpenCode dry-run generation and
  rejection when the agent runner is not advertising `opencode_server`.

## Tests Required

- `node --check scripts/federated-distributed-proof-kit.mjs`
- `node --check scripts/smoke-distributed-proof-tools.mjs`
- `pnpm ops:smoke-distributed-proof-tools`
- `pnpm ops:check-product-naming`
- `git diff --check`

## Migration/Compatibility Notes

The new flags are optional. Existing proof-kit generation remains unchanged.
The fake profile path does not validate real model-provider behavior; it only
validates distributed Entangle wiring and attached OpenCode permission-bridge
plumbing without live model credentials.

## Risks And Mitigations

- Risk: operators may treat the fake fixture as a production engine.
  Mitigation: generated README and root README explicitly frame it as a
  deterministic no-credential fixture.
- Risk: the fake profile is generated for a non-OpenCode runner.
  Mitigation: proof-kit generation rejects `--fake-opencode-server-url` unless
  the agent runner advertises `opencode_server`.

## Open Questions

None for this slice.
