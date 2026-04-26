# Federated Product Vision

## Current Repo Truth

The root README calls the product Entangle, but major active docs and deploy
material still frame the release path as Entangle Local. That framing matches
the current implementation but undersells the durable architecture already
present in the canonical docs: graph-native topology, users as nodes,
Nostr-signed messages, artifact backends, node-local runtime state, and
separate Host/Runner/Studio/CLI roles.

Recent Local slices added real coding-agent behavior, OpenCode execution,
source changes, approvals, artifact promotion, wiki repository publication,
and local smokes. They prove an integrated single-workstation runtime, not a
federated runtime.

## Target Model

Entangle is a self-hosted federated runtime for observable coding-agent
organizations.

The product thesis:

> Entangle lets you run a distributed AI engineering organization as a graph:
> agents and human users can live anywhere, communicate through signed Nostr
> messages, and hand off code/artifacts through git-backed references.

The graph is the live operational model:

- nodes have identities;
- users are graph actors, not just operators;
- edges define allowed communication;
- runners execute assigned nodes;
- Host owns desired graph state and projection state;
- messages are signed;
- artifacts are referenced and auditable;
- Studio and CLI expose both operator and user-node surfaces.

Local deployment remains important, but it is the simplest deployment profile,
not the product identity.

## Impacted Modules/Files

- `README.md`
- `deploy/README.md`
- `deploy/local/README.md`
- `references/174-definitive-production-delivery-roadmap.md`
- `references/177-r1-local-operator-release-ledger.md`
- `references/178-product-line-roadmap-readiness-audit.md`
- `references/180-local-ga-product-truth-audit.md`
- `references/189-entangle-local-completion-plan.md`
- `references/39-local-deployment-topology-and-compose-spec.md`
- `wiki/overview.md`
- `wiki/decisions/architecture-baseline.md`
- release packets under `releases/`

## Concrete Changes Required

- Treat Entangle as the public product name.
- Reframe Local as a deployment profile in docs, CLI help, Studio text, and
  release language.
- Preserve local operational commands where they describe the local adapter.
- Replace product-line sequencing of Local/Cloud/Enterprise with deployment
  profile language unless a document is explicitly historical.
- Add a proof-demo target: Host on one machine, two runners on other machines,
  shared reachable relay and git backend, at least one User Node, signed
  messages, source-change/artifact handoff, and Host projection.

## Tests Required

- Documentation search/audit for product naming.
- CLI help tests where product wording is asserted.
- Studio copy snapshots or assertions where relevant.
- Distributed smoke once the transport path exists.

## Migration/Compatibility Notes

Existing `entangle local ...` commands can remain. They should mean “operate the
local deployment profile”, not “operate a separate product”.

Historical docs may keep Entangle Local language if marked historical or
superseded. Current public docs should prefer Entangle.

## Risks And Mitigations

- Risk: rename churn without architecture change.
  Mitigation: do naming migration after authority, runner, projection, and
  user-node foundations are underway.
- Risk: local users lose clear setup instructions.
  Mitigation: keep `deploy/local` and local commands explicit.
- Risk: messaging sounds like generic multi-agent workflow software.
  Mitigation: emphasize federation, identity, signed messages, git artifacts,
  and operator projection.

## Open Questions

- Should the old Local release packets remain under `releases/local`, or should
  future release packets be organized by deployment profile and milestone?
