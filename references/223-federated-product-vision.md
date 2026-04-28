# Federated Product Vision

## Current Repo Truth

The root README calls the product Entangle, and the implementation now uses a
single Entangle product/state marker plus the `"federated"` runtime profile.
Older release and deployment docs still contain many same-machine delivery
notes. Those are useful implementation history, but current product messaging
must not frame the runtime as a separate local product or a local graph mode.

Recent same-machine slices added real coding-agent behavior, OpenCode
execution, source changes, signed approvals/reviews, projected artifacts,
runner-owned source-history publication, wiki refs, and Docker smokes. They
prove an integrated workstation deployment, not yet a fully distributed
runtime. Later cleanup slices removed direct Host artifact promotion and wiki
publication because those actions must be runner-owned protocol behavior.

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

Same-machine deployment remains important, but it is only one deployment
topology. The graph, runtime profile, identity, assignment, and protocol model
must be identical when all services run on one host and when they run across
multiple networks.

## Impacted Modules/Files

- `README.md`
- `deploy/README.md`
- `deploy/federated-dev/README.md`
- `references/174-definitive-production-delivery-roadmap.md`
- `references/177-r1-local-operator-release-ledger.md`
- `references/178-product-line-roadmap-readiness-audit.md`
- `references/180-local-ga-product-truth-audit.md`
- `references/189-entangle-completion-plan.md`
- `references/39-local-deployment-topology-and-compose-spec.md`
- `wiki/overview.md`
- `wiki/decisions/architecture-baseline.md`
- release packets under `releases/`

## Concrete Changes Required

- Treat Entangle as the public product name.
- Reframe same-machine deployment as a deployment profile in docs, CLI help,
  Studio text, and release language.
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

Existing `entangle deployment ...` commands can remain where they operate the
same-machine deployment adapter. They must not imply a separate product, graph
mode, or runtime profile.

Historical docs may keep Entangle language if marked historical or
superseded. Current public docs should prefer Entangle.

## Risks And Mitigations

- Risk: rename churn without architecture change.
  Mitigation: do naming migration after authority, runner, projection, and
  user-node foundations are underway.
- Risk: local users lose clear setup instructions.
  Mitigation: keep `deploy/federated-dev` and local commands explicit.
- Risk: messaging sounds like generic multi-agent workflow software.
  Mitigation: emphasize federation, identity, signed messages, git artifacts,
  and operator projection.

## Open Questions

No open question blocks this slice. Future release packets should be organized
around Entangle deployment milestones, with same-machine deployment treated as
one topology.
