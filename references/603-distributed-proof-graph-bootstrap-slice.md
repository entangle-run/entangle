# Distributed Proof Graph Bootstrap Slice

## Current Repo Truth

Generated distributed proof kits now include `operator/preflight.mjs`, which
fails before Host mutations when the active graph does not match
`operator/proof-profile.json`. That improved diagnostics, but the kit still
left operators to create a compatible active graph manually.

The repo already has Host CLI surfaces for admitting package sources and
importing graph JSON files:

- `entangle host package-sources admit`
- `entangle host graph import`

The proof kit can use those existing Host APIs without adding new Host
contracts.

## Target Model

The distributed proof kit should remain conservative: it must not silently
replace a Host graph as part of the main operator command sequence. It should
instead generate an explicit bootstrap helper that an operator can run when
they want the minimal proof graph.

## Impacted Modules And Files

- `scripts/federated-distributed-proof-kit.mjs`
- `scripts/smoke-distributed-proof-tools.mjs`
- `README.md`
- `deploy/federated-dev/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Generate `operator/proof-graph.json` with:
  - one non-user agent node using the generated agent node id;
  - one primary User Node;
  - one reviewer User Node;
  - an enabled primary User Node -> agent edge for the scripted task;
  - an enabled agent -> reviewer edge for review-oriented topology;
  - the configured proof package source id.
- Generate `operator/bootstrap-graph.sh`.
- Make `bootstrap-graph.sh`:
  - source `operator.env`;
  - resolve the proof package path relative to `ENTANGLE_REPO_ROOT` unless it
    is absolute;
  - admit that package path through Host with the configured proof package
    source id;
  - import `operator/proof-graph.json` through Host;
  - rerun `operator/preflight.mjs`.
- Add generator options:
  - `--proof-package-source-id`;
  - `--proof-package-path`.
- Reject duplicate proof node ids at generation time because the generated
  proof topology requires distinct agent, primary User Node, and reviewer User
  Node roles.

## Tests Required

- Syntax checks for proof-kit and proof-tool smoke scripts.
- Deterministic proof-tool smoke covering:
  - dry-run graph-bootstrap signal;
  - duplicate proof node id rejection.
- Runtime proof against a real temporary Host:
  - generate kit;
  - run `operator/bootstrap-graph.sh`;
  - verify `operator/preflight.mjs` succeeds against the imported graph.
- Product naming check and broad verification before commit.

## Migration And Compatibility Notes

Existing generated kits do not gain `operator/proof-graph.json` or
`operator/bootstrap-graph.sh`; regenerate the kit.

The main `operator/commands.sh` still does not apply the graph automatically.
That preserves operator control over Host graph replacement. The bootstrap
script is an explicit mutation path for proofs that need a minimal graph.

The default package path points at the existing
`examples/federated-preview/agent-package` because it is already a canonical,
small, repo-owned AgentPackage suitable for deterministic proof setup.

## Risks And Mitigations

- Risk: the generated graph overwrites a useful active graph if run casually.
  Mitigation: graph import is kept in `bootstrap-graph.sh`, separate from
  `commands.sh`, and documentation calls it an explicit helper.
- Risk: a remote Host cannot read the local package path from the operator
  machine.
  Mitigation: this helper is intended for the Host/operator machine. Physical
  proofs can pass `--proof-package-path` to a Host-visible path or keep using
  a pre-existing graph and package source.
- Risk: the graph remains too small for richer demo scenarios.
  Mitigation: the proof graph is intentionally minimal; richer topology should
  be modeled as a separate graph template or scenario kit.

## Open Questions

- Should a future proof-kit mode generate a full scenario bundle including
  package archive upload/import semantics for Hosts that cannot read an
  operator-local path?
