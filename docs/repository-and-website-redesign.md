# Repository And Website Redesign Plan

## Goal

Make Entangle look and read like a professional pre-release systems project:
short public entry points, clear status, current architecture, clean repository
map, explicit testing gates, and website claims that match verified runtime
truth.

## Audit Summary

Runtime repository:

- Git state was clean and aligned with `origin/main`.
- The implementation is broad and real, but the root README had become a long
  status ledger instead of an entry point.
- `references/` contains valuable design history and implementation records,
  but its index exposed too much chronology and too little current navigation.
- `releases/local/` encoded an obsolete local product/release framing.
- Operator docs existed mostly as README sections, deployment docs, wiki, and
  implementation records rather than a focused `docs/` surface.

Website repository:

- Git state was clean and aligned with `origin/main`.
- Astro/Starlight build and typecheck passed before this cleanup.
- Public positioning was mostly aligned with the federated product thesis.
- Drift remained in the Open Graph image (`local-first`) and in some claims
  that read stronger than the current verified status.
- The site repeated the same architecture language across several pages.

## Classification

Keep:

- current monorepo structure;
- `references/` as technical archive and implementation ledger;
- `wiki/` as durable project memory;
- deterministic proof scripts and fake provider fixtures;
- `deploy/federated-dev/` as a development adapter;
- website Astro/Starlight stack.

Rewrite:

- root `README.md`;
- `references/README.md`;
- website home, run, runtime, architecture, security, capability/status docs;
- website Open Graph copy.

Archive:

- historical implementation records that mention old local or hackathon framing
  only as past design state;
- old release and roadmap claims if they still explain why the current model
  exists.

Delete:

- active local-product release packets that imply a still-current `local`
  product line.

## Implementation Slices

1. Runtime documentation reset:
   - rewrite root README;
   - add focused `docs/` files;
   - rewrite `references/README.md`;
   - remove obsolete local release packets;
   - update wiki log.

2. Website claim reset:
   - rewrite public pages around current verified status;
   - update docs pages and OG image text;
   - keep visual system but make claims more precise;
   - run Astro check/build.

3. Final verification:
   - runtime docs/product naming checks;
   - website check/build;
   - git status/diff review for both repos;
   - commit each repository separately.

## Acceptance Criteria

- A new contributor can understand Entangle from the root README in under five
  minutes.
- `docs/` contains current operational documentation and status.
- `references/` is clearly an archive/ledger, not the first onboarding path.
- No active public surface presents Entangle as a local-only product.
- Website claims distinguish implemented, deterministic, manual, and future
  capabilities.
- Both repositories pass their relevant documentation/build checks.
